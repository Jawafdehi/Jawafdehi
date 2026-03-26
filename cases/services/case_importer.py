"""
Service for importing scraped case data into Django models.

Handles entity deduplication, source deduplication, and data transformation
from scraped JSON format to Django Case model.
"""

import json
from datetime import datetime

from django.db import transaction

from cases.models import (
    Case,
    CaseEntityRelationship,
    CaseState,
    CaseType,
    DocumentSource,
    JawafEntity,
    RelationshipType,
)


class CaseImporter:
    """Service for importing scraped case data into Django models."""

    def __init__(self, logger=None):
        """
        Initialize the case importer.

        Args:
            logger: Optional logger for output (e.g., command stderr)
        """
        self.logger = logger
        self.entity_cache = {}
        self.stats = {
            "entities_created": 0,
            "entities_reused": 0,
            "sources_created": 0,
            "sources_reused": 0,
        }

    def log(self, message):
        """Log a message if logger is available."""
        if self.logger:
            if hasattr(self.logger, "write"):
                self.logger.write(message)
            else:
                self.logger(message)

    def get_or_create_entity(self, name):
        """
        Get or create JawafEntity with deduplication.

        Args:
            name: Entity display name

        Returns:
            JawafEntity instance or None if name is empty
        """
        if not name or not name.strip():
            return None

        name = name.strip()

        # Check cache first
        if name in self.entity_cache:
            return self.entity_cache[name]

        # Try to find existing entity by display_name
        entity = JawafEntity.objects.filter(display_name=name).first()

        if entity:
            self.stats["entities_reused"] += 1
            self.log(f"  Reusing entity: {name}")
        else:
            entity = JawafEntity.objects.create(display_name=name)
            self.stats["entities_created"] += 1
            self.log(f"  Created entity: {name}")

        self.entity_cache[name] = entity
        return entity

    def get_or_create_source(self, source_data):
        """
        Get or create DocumentSource with deduplication by URL.

        Uses PostgreSQL JSON containment query for efficient URL lookup when available.
        Falls back to Python-based filtering for SQLite.

        Args:
            source_data: Dict with 'title', 'url', 'description' keys

        Returns:
            DocumentSource instance or None if title is empty
        """
        # Guard against None values and handle both string and list URLs
        url_raw = source_data.get("url", "")

        # Handle URL as string or list
        if isinstance(url_raw, list):
            # Filter and normalize list entries
            url_list = []
            for item in url_raw:
                if isinstance(item, str):
                    stripped = item.strip()
                    if stripped:
                        url_list.append(stripped)
        elif isinstance(url_raw, str):
            stripped = url_raw.strip()
            url_list = [stripped] if stripped else []
        else:
            url_list = []

        title_raw = source_data.get("title", "")
        title = title_raw.strip() if isinstance(title_raw, str) else ""

        description_raw = source_data.get("description", "")
        description = (
            description_raw.strip() if isinstance(description_raw, str) else ""
        )

        if not title:
            return None

        # Try to find existing source by URL
        # TODO: Consider adding GIN index on url field for better performance:
        #   CREATE INDEX idx_documentsource_url_gin ON cases_documentsource USING gin (url);
        if url_list:
            # Check if any URL in our list matches existing sources
            from django.db import connection

            # Use PostgreSQL JSON containment if available, otherwise fall back to Python filtering
            if connection.vendor == "postgresql":
                for url in url_list:
                    source = (
                        DocumentSource.objects.filter(
                            is_deleted=False,
                            url__contains=[url],  # PostgreSQL JSON containment operator
                        )
                        .only("source_id", "title")
                        .first()
                    )

                    if source:
                        self.stats["sources_reused"] += 1
                        self.log(f"  Reusing source: {title}")
                        return source
            else:
                # SQLite fallback: fetch all non-deleted sources and check URLs in Python
                for url in url_list:
                    for source in DocumentSource.objects.filter(is_deleted=False).only(
                        "source_id", "title", "url"
                    ):
                        if isinstance(source.url, list) and url in source.url:
                            self.stats["sources_reused"] += 1
                            self.log(f"  Reusing source: {title}")
                            return source

        # Try to find by title (excluding soft-deleted sources)
        source = DocumentSource.objects.filter(title=title, is_deleted=False).first()
        if source:
            self.stats["sources_reused"] += 1
            self.log(f"  Reusing source: {title}")
            return source

        # Create new source with URL as list
        source = DocumentSource.objects.create(
            title=title, description=description, url=url_list
        )

        self.stats["sources_created"] += 1
        self.log(f"  Created source: {title}")
        return source

    def parse_date(self, date_str):
        """
        Parse date string to date object.

        Args:
            date_str: Date string in YYYY-MM-DD format

        Returns:
            date object or None if parsing fails
        """
        if not date_str:
            return None
        try:
            return datetime.strptime(date_str, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            return None

    def import_from_json(self, json_file, case_type="CORRUPTION", case_state="DRAFT"):
        """
        Import a case from JSON file.

        Args:
            json_file: Path to case-result.json file
            case_type: Case type (CORRUPTION or PROMISES)
            case_state: Initial case state (DRAFT, IN_REVIEW, or PUBLISHED)

        Returns:
            Created Case instance

        Raises:
            ValueError: If JSON is invalid or required fields are missing
            ValidationError: If case data fails validation
        """
        # Read and parse JSON
        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        title = data.get("title", "").strip()
        if not title:
            raise ValueError("Case title is required")

        # Check if case already exists by title
        existing_case = Case.objects.filter(title=title).first()
        if existing_case:
            raise ValueError(
                f"Case with title '{title}' already exists (ID: {existing_case.case_id})"
            )

        self.log(f"Importing case: {title}")

        # Create case with transaction
        with transaction.atomic():
            # Create case
            case = Case(
                case_type=getattr(CaseType, case_type),
                state=getattr(CaseState, case_state),
                title=title,
                description=data.get("description", ""),
                case_start_date=self.parse_date(data.get("case_start_date")),
                case_end_date=self.parse_date(data.get("case_end_date")),
                tags=data.get("tags", []),
                key_allegations=data.get("key_allegations", []),
                timeline=data.get("timeline", []),
            )
            case.save()

            self.log(f"Created case: {case.case_id}")

            # Add alleged entities
            self.log("Processing alleged entities...")
            for entity_name in data.get("alleged_entities", []):
                entity = self.get_or_create_entity(entity_name)
                if entity:
                    CaseEntityRelationship.objects.get_or_create(
                        case=case,
                        entity=entity,
                        relationship_type=RelationshipType.ALLEGED,
                        defaults={"notes": ""},
                    )

            # Add related entities
            self.log("Processing related entities...")
            for entity_name in data.get("related_entities", []):
                entity = self.get_or_create_entity(entity_name)
                if entity:
                    CaseEntityRelationship.objects.get_or_create(
                        case=case,
                        entity=entity,
                        relationship_type=RelationshipType.RELATED,
                        defaults={"notes": ""},
                    )

            # Add locations (handle both string and dict formats)
            self.log("Processing locations...")
            for location in data.get("locations", []):
                if isinstance(location, str):
                    entity = self.get_or_create_entity(location)
                elif isinstance(location, dict):
                    # Extract location name from dict
                    location_name = (
                        location.get("other")
                        or location.get("district")
                        or location.get("municipality")
                    )
                    entity = self.get_or_create_entity(location_name)
                else:
                    continue

                if entity:
                    CaseEntityRelationship.objects.get_or_create(
                        case=case,
                        entity=entity,
                        relationship_type=RelationshipType.RELATED,
                        defaults={"notes": ""},
                    )

            # Build evidence list from sources
            self.log("Processing sources...")
            evidence = []
            for source_data in data.get("sources", []):
                source = self.get_or_create_source(source_data)
                if source:
                    evidence.append(
                        {
                            "source_id": source.source_id,
                            "description": source_data.get("description", ""),
                        }
                    )

            case.evidence = evidence
            case.save()

            self.log("\nImport statistics:")
            self.log(f"  Entities created: {self.stats['entities_created']}")
            self.log(f"  Entities reused: {self.stats['entities_reused']}")
            self.log(f"  Sources created: {self.stats['sources_created']}")
            self.log(f"  Sources reused: {self.stats['sources_reused']}")

            return case
