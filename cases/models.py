"""
Models for the Jawafdehi accountability platform.

See: .kiro/specs/accountability-platform-core/design.md
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from django.utils import timezone
import uuid

from .fields import (
    TextListField,
    TimelineListField,
    EvidenceListField,
)

User = get_user_model()


def validate_url_list(value):
    """
    Validate that the url field contains a list of valid URLs.

    Args:
        value: The value to validate (should be a list of URL strings)

    Raises:
        ValidationError: If value is not a list or contains invalid URLs
    """
    if value in (None, []):
        return

    if not isinstance(value, list):
        raise ValidationError("url must be a list of URLs.")

    validator = URLValidator()
    for item in value:
        if not isinstance(item, str):
            raise ValidationError("Each URL must be a string.")

        # Strip whitespace and validate
        stripped = item.strip()
        if not stripped:
            raise ValidationError("URLs cannot be blank or whitespace-only.")

        validator(stripped)


class JawafEntity(models.Model):
    """
    Represents an entity (person, organization, location, etc.) in the system.

    Entities can either:
    - Reference an entity in the Nepal Entity Service (NES) via nes_id
    - Be custom entities with a display_name (when NES record doesn't exist)
    - Have both nes_id and display_name (display_name is optional)

    nes_id must be unique across all entities (excluding nulls).
    """

    nes_id = models.CharField(
        max_length=300,
        null=True,
        blank=True,
        unique=True,
        db_index=True,
        help_text="Entity ID from Nepal Entity Service (NES) database (unique)",
    )

    display_name = models.CharField(
        max_length=300,
        null=True,
        blank=True,
        help_text="Display name for the entity (optional if nes_id is present, required otherwise)",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Jawaf Entity"
        verbose_name_plural = "Jawaf Entities"
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(nes_id__isnull=True, display_name__isnull=True),
                name="jawafentity_must_have_nes_id_or_display_name",
            )
        ]

    def __str__(self):
        if self.nes_id:
            return f"{self.nes_id}" + (
                f" ({self.display_name})" if self.display_name else ""
            )
        return f"{self.display_name}"

    def clean(self):
        """
        Validate entity data.

        Rules:
        - Must have either nes_id OR display_name (or both)
        - If nes_id is provided, validate it using NES validator
        """
        errors = {}

        # Check that at least one of nes_id or display_name is provided
        has_nes_id = self.nes_id and self.nes_id.strip()
        has_display_name = self.display_name and self.display_name.strip()

        if not has_nes_id and not has_display_name:
            errors["__all__"] = "Entity must have either nes_id or display_name"

        # Validate nes_id format if provided
        if has_nes_id:
            from nes.core.identifiers.validators import validate_entity_id

            try:
                validate_entity_id(self.nes_id)
            except ValueError as e:
                errors["nes_id"] = str(e)

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        """Override save to validate before saving."""
        self.clean()
        super().save(*args, **kwargs)

    def delete(self, using=None, keep_parents=False):
        """
        Override delete to prevent deletion if entity is in use.

        Checks if entity is referenced by:
        - Cases (as alleged_entities, related_entities, or locations)
        - DocumentSources (as related_entities, excluding soft-deleted sources)

        Raises ValidationError if entity is in use.
        """
        usage = []

        # Check if used in cases
        alleged_count = self.cases_as_alleged.count()
        if alleged_count > 0:
            usage.append(f"alleged entity in {alleged_count} case(s)")

        related_count = self.cases_as_related.count()
        if related_count > 0:
            usage.append(f"related entity in {related_count} case(s)")

        location_count = self.cases_as_location.count()
        if location_count > 0:
            usage.append(f"location in {location_count} case(s)")

        # Check if used in active document sources (exclude soft-deleted)
        source_count = self.document_sources.filter(is_deleted=False).count()
        if source_count > 0:
            usage.append(f"related entity in {source_count} document source(s)")

        if usage:
            raise ValidationError(
                f"Cannot delete entity '{self}' because it is currently used as: {', '.join(usage)}. "
                f"Remove the entity from all cases and sources before deleting."
            )

        return super().delete(using=using, keep_parents=keep_parents)


class CaseType(models.TextChoices):
    """Enum for case types."""

    CORRUPTION = "CORRUPTION", "Corruption"
    PROMISES = "PROMISES", "Broken Promises"


class CaseState(models.TextChoices):
    """Enum for case states."""

    DRAFT = "DRAFT", "Draft"
    IN_REVIEW = "IN_REVIEW", "In Review"
    PUBLISHED = "PUBLISHED", "Published"
    CLOSED = "CLOSED", "Closed"


class SourceType(models.TextChoices):
    """Enum for document source types."""

    # Legal Documents (Court & Procedural)
    LEGAL_COURT_ORDER = "LEGAL_COURT_ORDER", "Legal: Court Order/Verdict"
    LEGAL_PROCEDURAL = "LEGAL_PROCEDURAL", "Legal: Procedural/Law Enforcement"

    # Official Government
    OFFICIAL_GOVERNMENT = "OFFICIAL_GOVERNMENT", "Official (Government)"

    # Financial & Corporate
    FINANCIAL_FORENSIC = "FINANCIAL_FORENSIC", "Financial/Forensic Record"
    INTERNAL_CORPORATE = "INTERNAL_CORPORATE", "Internal Corporate Doc"

    # Media & Investigations
    MEDIA_NEWS = "MEDIA_NEWS", "Media/News"
    INVESTIGATIVE_REPORT = "INVESTIGATIVE_REPORT", "Investigative Report"

    # Public Input
    PUBLIC_COMPLAINT = "PUBLIC_COMPLAINT", "Public Complaint/Whistleblower"

    # Legislative
    LEGISLATIVE_DOC = "LEGISLATIVE_DOC", "Legislative/Policy Doc"

    # Social Media
    SOCIAL_MEDIA = "SOCIAL_MEDIA", "Social Media"

    # Other
    OTHER_VISUAL = "OTHER_VISUAL", "Other / Visual Assets"


class Case(models.Model):
    """
    Core model representing a case of alleged misconduct.

    Each case has a single row identified by case_id. Edits are made in-place.
    State transitions (submit/publish) are recorded in the versionInfo JSON field.
    """

    # Stable public identifier
    case_id = models.CharField(
        max_length=100,
        db_index=True,
        unique=True,
        help_text="Stable unique identifier for this case",
    )

    # Core fields
    case_type = models.CharField(
        max_length=20,
        choices=CaseType.choices,
        help_text="Type of case (corruption, broken promises, etc.)",
    )
    state = models.CharField(
        max_length=20,
        choices=CaseState.choices,
        default=CaseState.DRAFT,
        db_index=True,
        help_text="Current state in the workflow",
    )
    title = models.CharField(max_length=200, help_text="Case title")
    short_description = models.TextField(
        blank=True, help_text="Short description/summary of the case"
    )
    thumbnail_url = models.URLField(
        blank=True,
        max_length=500,
        help_text="URL to a small thumbnail picture for the case",
    )
    banner_url = models.URLField(
        blank=True, max_length=500, help_text="URL to a large banner image for the case"
    )
    # Date fields
    case_start_date = models.DateField(
        null=True, blank=True, help_text="When the alleged incident began"
    )
    case_end_date = models.DateField(
        null=True, blank=True, help_text="When the alleged incident ended"
    )

    # Entity relationships (many-to-many)
    alleged_entities = models.ManyToManyField(
        JawafEntity,
        blank=True,
        related_name="cases_as_alleged",
        help_text="Entities being accused",
    )
    related_entities = models.ManyToManyField(
        JawafEntity,
        blank=True,
        related_name="cases_as_related",
        help_text="Related entities",
    )
    locations = models.ManyToManyField(
        JawafEntity,
        blank=True,
        related_name="cases_as_location",
        help_text="Location entities",
    )

    # Content fields
    tags = TextListField(blank=True, help_text="List of tags for categorization")
    description = models.TextField(
        blank=True, help_text="Rich text description of the case"
    )
    key_allegations = TextListField(
        blank=True, help_text="List of key allegation statements"
    )

    # Structured data fields
    timeline = TimelineListField(help_text="List of timeline entries")
    evidence = EvidenceListField(
        help_text="List of evidence entries with source references"
    )

    # Relationships
    contributors = models.ManyToManyField(
        User,
        blank=True,
        related_name="assigned_cases",
        help_text="Contributors assigned to this case",
    )

    # Metadata
    versionInfo = models.JSONField(
        default=dict, blank=True, help_text="Version metadata tracking changes"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Notes field (markdown supported, internal use)
    notes = models.TextField(
        blank=True,
        default="",
        help_text="Internal notes about the case (markdown supported)",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.case_id} - {self.title} ({self.state})"

    def save(self, *args, **kwargs):
        """Override save to generate case_id for new cases."""
        if not self.case_id:
            # Generate unique case_id for new cases
            self.case_id = f"case-{uuid.uuid4().hex[:12]}"

        # Validate title is not empty
        if not self.title or not self.title.strip():
            raise ValidationError("Title cannot be empty")

        super().save(*args, **kwargs)

    def validate(self):
        """
        Validate case data based on current state.

        - DRAFT: Lenient validation (only title required)
        - IN_REVIEW/PUBLISHED: Strict validation (all required fields must be complete)
        """
        errors = {}

        # Always require title
        if not self.title or not self.title.strip():
            errors["title"] = "Title is required"

        # Strict validation for IN_REVIEW and PUBLISHED states
        if self.state in [CaseState.IN_REVIEW, CaseState.PUBLISHED]:
            # Require at least one alleged entity for published cases
            if self.alleged_entities.count() == 0:
                errors["alleged_entities"] = (
                    "At least one alleged entity is required for IN_REVIEW or PUBLISHED state"
                )

            if not self.key_allegations or len(self.key_allegations) == 0:
                errors["key_allegations"] = (
                    "At least one key allegation is required for IN_REVIEW or PUBLISHED state"
                )

            if not self.description or not self.description.strip():
                errors["description"] = (
                    "Description is required for IN_REVIEW or PUBLISHED state"
                )

        if errors:
            raise ValidationError(errors)

    def submit(self):
        """
        Submit a draft case for review.

        Transitions state from DRAFT to IN_REVIEW after validation.
        """
        if self.state != CaseState.DRAFT:
            raise ValidationError(
                f"Can only submit cases in DRAFT state, current state is {self.state}"
            )

        # Validate before submission
        self.state = CaseState.IN_REVIEW
        self.validate()

        # Update versionInfo
        self.versionInfo = {
            "action": "submitted",
            "datetime": timezone.now().isoformat(),
        }

        self.save()

    def publish(self):
        """
        Publish this case.

        Sets state to PUBLISHED and updates versionInfo.
        """
        if self.state not in [CaseState.IN_REVIEW, CaseState.DRAFT]:
            raise ValidationError(
                f"Can only publish cases in IN_REVIEW or DRAFT state, current state is {self.state}"
            )

        # Validate before publishing
        self.state = CaseState.PUBLISHED
        self.validate()

        # Update versionInfo
        self.versionInfo = {
            "action": "published",
            "datetime": timezone.now().isoformat(),
        }

        self.save()

    def delete(self, using=None, keep_parents=False):
        """
        Soft delete the case by setting state to CLOSED.

        The case record is never hard-deleted; state is set to CLOSED so it
        remains in the database but is no longer publicly visible.
        """
        self.state = CaseState.CLOSED

        # Update versionInfo to track the deletion
        self.versionInfo = {
            "action": "deleted",
            "datetime": timezone.now().isoformat(),
        }

        self.save()

        # Return a tuple (num_deleted, dict) to match Django's delete() signature
        # Since we're soft deleting, we report 0 actual deletions
        return (0, {self._meta.label: 0})


class DocumentSource(models.Model):
    """
    Represents evidence sources that can be referenced by cases.

    Sources are soft-deleted via is_deleted flag to preserve audit history.
    A source is publicly accessible if referenced in evidence of any published case.
    """

    # Unique identifier
    source_id = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Unique identifier for the source",
    )

    # Core fields
    title = models.CharField(max_length=300, help_text="Source title")
    description = models.TextField(blank=True, help_text="Source description")
    source_type = models.CharField(
        max_length=50,
        choices=SourceType.choices,
        null=True,
        blank=True,
        help_text="Type of source",
        # TODO: Consider making this non-nullable in a future migration:
        # 1. Create data migration to backfill NULL values to SourceType.OTHER_VISUAL
        # 2. Create schema migration to set null=False, blank=False
    )
    url = models.JSONField(
        default=list,
        blank=True,
        validators=[validate_url_list],
        help_text="List of URLs for this source",
    )

    # Entity relationships
    related_entities = models.ManyToManyField(
        JawafEntity,
        blank=True,
        related_name="document_sources",
        help_text="Entities related to this source",
    )

    # Contributors (for access control)
    contributors = models.ManyToManyField(
        User,
        blank=True,
        related_name="assigned_sources",
        help_text="Contributors assigned to manage this source",
    )

    # Soft deletion
    is_deleted = models.BooleanField(
        default=False, db_index=True, help_text="Soft deletion flag"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.source_id} - {self.title}"

    def clean(self):
        """
        Normalize and validate DocumentSource data.

        - Strips whitespace from title
        - Ensures title is not empty after stripping
        - Normalizes URL list entries (strips whitespace)
        """
        # Normalize title
        self.title = (self.title or "").strip()
        if not self.title:
            raise ValidationError({"title": "Title is required and cannot be empty"})

        # Normalize URL list entries (strip whitespace from each URL)
        if isinstance(self.url, list):
            self.url = [
                url.strip() if isinstance(url, str) else url for url in self.url
            ]

    def save(self, *args, **kwargs):
        """Override save to generate source_id and validate all fields."""
        if not self.source_id:
            # Generate unique source_id for new sources
            from datetime import datetime

            timestamp = datetime.now().strftime("%Y%m%d")
            self.source_id = f"source:{timestamp}:{uuid.uuid4().hex[:8]}"

        # Normalize url to a list before validation for backward compatibility
        # Older call sites may still pass a single string or None
        if isinstance(self.url, str):
            url_str = self.url.strip()
            self.url = [url_str] if url_str else []
        elif self.url is None:
            self.url = []

        # Run full model and field validation (includes validate_url_list)
        # This calls clean() which normalizes data, then validates
        self.full_clean()

        super().save(*args, **kwargs)


class FeedbackType(models.TextChoices):
    """Enum for feedback types."""

    BUG = "bug", "Bug Report"
    FEATURE = "feature", "Feature Request"
    USABILITY = "usability", "Usability Issue"
    CONTENT = "content", "Content Feedback"
    GENERAL = "general", "General Feedback"


class FeedbackStatus(models.TextChoices):
    """Enum for feedback status."""

    SUBMITTED = "submitted", "Submitted"
    IN_REVIEW = "in_review", "In Review"
    RESOLVED = "resolved", "Resolved"
    CLOSED = "closed", "Closed"


class Feedback(models.Model):
    """
    Platform feedback submissions from users.

    Stores feedback, bug reports, feature requests, and general comments
    about the Jawafdehi platform.
    """

    # Core fields
    feedback_type = models.CharField(
        max_length=20, choices=FeedbackType.choices, help_text="Type of feedback"
    )
    subject = models.CharField(max_length=200, help_text="Brief summary of feedback")
    description = models.TextField(
        max_length=5000, help_text="Detailed feedback description"
    )
    related_page = models.CharField(
        max_length=300, blank=True, help_text="Page or feature related to feedback"
    )

    # Contact information (stored as JSON for flexibility)
    contact_info = models.JSONField(
        default=dict, blank=True, help_text="Optional contact information"
    )

    # Status tracking
    status = models.CharField(
        max_length=20,
        choices=FeedbackStatus.choices,
        default=FeedbackStatus.SUBMITTED,
        db_index=True,
        help_text="Current status of feedback",
    )

    # Metadata
    ip_address = models.GenericIPAddressField(
        null=True, blank=True, help_text="IP address of submitter (for rate limiting)"
    )
    user_agent = models.TextField(blank=True, help_text="User agent string")

    # Admin notes
    admin_notes = models.TextField(
        blank=True, help_text="Internal notes for administrators"
    )

    # Timestamps
    submitted_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-submitted_at"]
        indexes = [
            models.Index(fields=["feedback_type", "status"]),
            models.Index(fields=["status", "submitted_at"]),
        ]

    def __str__(self):
        return f"{self.feedback_type.upper()}: {self.subject}"
