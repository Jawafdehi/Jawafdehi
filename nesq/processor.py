"""Queue processor for the NES Queue System (NESQ).

Processes approved queue items by calling the NES PublicationService to apply
entity changes (e.g., adding names) to the nes-db file database.

The processor:
- Queries all APPROVED items in FIFO order (by created_at)
- Augments change descriptions with the submitter's username
- Generates author_id in the format "jawafdehi:{username}"
- Calls NES PublicationService.update_entity() for each item
- Marks items as COMPLETED or FAILED with appropriate metadata

Note: Git operations (add, commit, push) are NOT part of this module.
They are handled by GitHub Actions workflow shell steps after the
processor completes. See Task 9 / .github/workflows/process-nes-queue.yml.

See .kiro/specs/nes-queue-system/ for full specification.
"""

import logging
import re
from dataclasses import dataclass, field
from typing import Dict, List

from asgiref.sync import sync_to_async

from nes.core.models.base import Name
from nes.database.file_database import FileDatabase
from nes.services.publication import PublicationService
from nes.core.identifiers import build_entity_id_from_prefix

from django.utils import timezone

from .models import NESQueueItem, QueueAction, QueueStatus

logger = logging.getLogger(__name__)


@dataclass
class ProcessingResult:
    """Result summary from processing approved queue items.

    Attributes:
        processed: Total number of items attempted.
        completed: Number of items that succeeded.
        failed: Number of items that failed.
        errors: List of error dicts with item_id and error message.
    """

    processed: int = 0
    completed: int = 0
    failed: int = 0
    errors: List[Dict] = field(default_factory=list)


class EntityNotFoundError(Exception):
    """Raised when the target entity does not exist in the NES database."""


class QueueProcessor:
    """Processes approved NES Queue items via the NES PublicationService.

    The processor reads from the Jawafdehi PostgreSQL database to find
    APPROVED queue items, then applies each change to the NES file database
    through the PublicationService.

    Args:
        nes_db_path: Filesystem path to the cloned nes-db repository
                     (e.g., "/path/to/nes-db/v2").
    """

    def __init__(self, nes_db_path: str) -> None:
        self.nes_db_path = nes_db_path
        self.database = FileDatabase(base_path=nes_db_path)
        self.publication_service = PublicationService(database=self.database)

    async def process_approved_items(self) -> ProcessingResult:
        """Process all approved queue items in chronological (FIFO) order.

        Queries NESQueueItem records with status=APPROVED, ordered by
        created_at, and processes each one individually.  Processing
        continues even if individual items fail — failures are recorded
        and returned in the result.

        Returns:
            ProcessingResult with counts and error details.
        """
        approved_items = await sync_to_async(list)(
            NESQueueItem.objects.filter(status=QueueStatus.APPROVED)
            .select_related("submitted_by")
            .order_by("created_at")
        )

        result = ProcessingResult()

        for item in approved_items:
            success = await self.process_item(item)
            result.processed += 1
            if success:
                result.completed += 1
            else:
                result.failed += 1
                result.errors.append({"item_id": item.id, "error": item.error_message})

        logger.info(
            "Queue processing complete: %d processed, %d completed, %d failed",
            result.processed,
            result.completed,
            result.failed,
        )
        return result

    async def process_item(self, item: NESQueueItem) -> bool:
        """Process a single approved queue item.

        For ADD_NAME actions:
        1. Fetches the target entity from the NES database.
        2. Appends the name to ``entity.names`` or ``entity.misspelled_names``
           depending on the ``is_misspelling`` flag.
        3. Calls ``publication_service.update_entity()`` to persist the change.
        4. Updates the queue item status to COMPLETED or FAILED.

        For CREATE_ENTITY actions:
        1. Reconstructs an Entity object from the payload's entity_data.
        2. Calls ``publication_service.create_entity()`` to create the entity.
        3. Updates the queue item status to COMPLETED or FAILED.

        Args:
            item: An NESQueueItem with status=APPROVED.

        Returns:
            True if processing succeeded, False otherwise.
        """
        try:
            if item.action == QueueAction.ADD_NAME:
                return await self._process_add_name(item)
            elif item.action == QueueAction.CREATE_ENTITY:
                return await self._process_create_entity(item)
            else:
                raise ValueError(
                    f"Unsupported action '{item.action}'. "
                    "Only ADD_NAME and CREATE_ENTITY are supported in this version."
                )

        except Exception as e:
            # Mark as FAILED
            item.status = QueueStatus.FAILED
            item.error_message = str(e)
            item.processed_at = timezone.now()
            await sync_to_async(item.save)()

            logger.error(
                "FAILED NESQ-%s: %s — %s",
                item.pk,
                item.action,
                str(e),
            )
            return False

    async def _process_add_name(self, item: NESQueueItem) -> bool:
        """Process an ADD_NAME action.

        Args:
            item: An NESQueueItem with action=ADD_NAME and status=APPROVED.

        Returns:
            True if processing succeeded, False otherwise.
        """
        augmented_description = _augment_change_description(item)
        author_id = _derive_author_id(item)

        # Fetch existing entity
        entity = await self.publication_service.get_entity(item.payload["entity_id"])
        if entity is None:
            raise EntityNotFoundError(
                f"Entity '{item.payload['entity_id']}' not found in NES database."
            )

        # Build Name object from payload
        name = Name(**item.payload["name"])

        # Append to the appropriate list
        is_misspelling = item.payload.get("is_misspelling", False)
        if is_misspelling:
            if entity.misspelled_names is None:
                entity.misspelled_names = []
            entity.misspelled_names.append(name)
        else:
            entity.names.append(name)

        # Persist via PublicationService
        updated_entity = await self.publication_service.update_entity(
            entity=entity,
            author_id=author_id,
            change_description=augmented_description,
        )

        # Mark as COMPLETED
        item.status = QueueStatus.COMPLETED
        item.result = {"entity_id": updated_entity.id}
        item.processed_at = timezone.now()
        await sync_to_async(item.save)()

        logger.info(
            "COMPLETED NESQ-%s: %s for %s",
            item.pk,
            item.action,
            item.payload["entity_id"],
        )
        return True

    async def _process_create_entity(self, item: NESQueueItem) -> bool:
        """Process a CREATE_ENTITY action.

        Args:
            item: An NESQueueItem with action=CREATE_ENTITY and status=APPROVED.

        Returns:
            True if processing succeeded, False otherwise.
        """
        augmented_description = _augment_change_description(item)
        author_id = _derive_author_id(item)

        # Extract payload fields and enrich with missing metadata
        entity_data = item.payload["entity_data"].copy()

        # Get entity_prefix and slug to construct entity ID
        entity_prefix = entity_data.get("entity_prefix")
        entity_slug = entity_data["slug"]

        # Build entity ID using the entity_prefix system
        if not entity_prefix:
            raise ValueError(
                "entity_data must include 'entity_prefix' field. "
                "The old type/sub_type system is deprecated."
            )

        entity_id = build_entity_id_from_prefix(entity_prefix, entity_slug)

        # Add version_summary if missing
        if "version_summary" not in entity_data:
            entity_data["version_summary"] = {
                "entity_or_relationship_id": entity_id,
                "type": "ENTITY",
                "version_number": 1,
                "author": {"slug": author_id.split(":")[-1]},
                "change_description": augmented_description,
                "created_at": timezone.now().isoformat(),
            }

        # Add created_at if missing
        if "created_at" not in entity_data:
            entity_data["created_at"] = timezone.now().isoformat()

        # Call PublicationService.create_entity()
        # Extract entity_prefix for the new API
        new_entity = await self.publication_service.create_entity(
            entity_prefix=entity_prefix,
            entity_data=entity_data,
            author_id=author_id,
            change_description=augmented_description,
        )

        # Mark as COMPLETED
        item.status = QueueStatus.COMPLETED
        item.result = {"entity_id": new_entity.id}
        item.processed_at = timezone.now()
        await sync_to_async(item.save)()

        logger.info(
            "COMPLETED NESQ-%s: %s — created entity %s",
            item.pk,
            item.action,
            new_entity.id,
        )
        return True


def _derive_author_id(item: NESQueueItem) -> str:
    """Derive NES author_id from the queue item's submitter.

    NES Author.slug must match ^[a-z0-9]+(?:-[a-z0-9]+)*$
    This function sanitizes the username to comply with that format.

    Args:
        item: NESQueueItem with a submitted_by user.

    Returns:
        Author ID in the format "jawafdehi:{sanitized-username}"
    """
    # Sanitize: lowercase → replace non-alnum with hyphen → collapse → strip
    slug = item.submitted_by.username.lower()
    slug = re.sub(r"[^a-z0-9]", "-", slug)
    slug = re.sub(r"-{2,}", "-", slug)
    slug = slug.strip("-")

    # If sanitization results in empty slug, use user ID as fallback
    if not slug:
        slug = f"user-{item.submitted_by.id}"

    return f"jawafdehi:{slug}"


def _augment_change_description(item: NESQueueItem) -> str:
    """Augment a queue item's change description with the submitter's username.

    Args:
        item: NESQueueItem with a submitted_by user.

    Returns:
        String in the format: "{original_description} (submitted by {username})"
    """
    return f"{item.change_description} (submitted by {item.submitted_by.username})"
