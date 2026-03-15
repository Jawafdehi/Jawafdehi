"""
Unit tests for NESQ data models.

Feature: nes-queue-system
Task 10.1: Test Models

Tests cover:
    - NESQueueItem creation with defaults
    - NESQueueItem creation with all fields
    - QueueStatus choices are valid
    - QueueAction choices are valid
    - Ordering by created_at (FIFO)
    - submitted_by foreign key constraint (PROTECT)
    - reviewed_by nullable foreign key (SET_NULL)
    - payload JSONField accepts valid JSON
    - __str__ representation

See .kiro/specs/nes-queue-system/tasks.md §10.1 for requirements.
"""

import time

import pytest

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils import timezone

from nesq.models import NESQueueItem, QueueAction, QueueStatus
from tests.conftest import create_user_with_role

User = get_user_model()

VALID_PAYLOAD = {
    "entity_id": "entity:person/sher-bahadur-deuba",
    "name": {"kind": "ALIAS", "en": {"full": "S.B. Deuba"}},
}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def contributor(db):
    """Create a Contributor user for submissions."""
    return create_user_with_role("sita_contrib", "sita@example.com", "Contributor")


@pytest.fixture
def admin_user(db):
    """Create an Admin user for reviews."""
    return create_user_with_role("ram_admin", "ram@example.com", "Admin")


# ============================================================================
# QueueStatus enum
# ============================================================================


class TestQueueStatus:
    """Tests for the QueueStatus TextChoices enum."""

    def test_all_status_values(self):
        """QueueStatus should have exactly five statuses."""
        expected = {"PENDING", "APPROVED", "REJECTED", "COMPLETED", "FAILED"}
        actual = {choice[0] for choice in QueueStatus.choices}
        assert actual == expected

    def test_pending_label(self):
        """PENDING label should be 'Pending Review'."""
        assert QueueStatus.PENDING.label == "Pending Review"

    def test_approved_label(self):
        """APPROVED label should be 'Approved'."""
        assert QueueStatus.APPROVED.label == "Approved"

    def test_rejected_label(self):
        """REJECTED label should be 'Rejected'."""
        assert QueueStatus.REJECTED.label == "Rejected"

    def test_completed_label(self):
        """COMPLETED label should be 'Completed'."""
        assert QueueStatus.COMPLETED.label == "Completed"

    def test_failed_label(self):
        """FAILED label should be 'Failed'."""
        assert QueueStatus.FAILED.label == "Failed"


# ============================================================================
# NESQueueItem creation — defaults
# ============================================================================


@pytest.mark.django_db
class TestNESQueueItemDefaults:
    """Tests for NESQueueItem creation with default values."""

    def test_status_defaults_to_pending(self, contributor):
        """New items should default to PENDING status."""
        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            submitted_by=contributor,
            change_description="Adding alias for Sher Bahadur Deuba",
        )
        assert item.status == QueueStatus.PENDING

    def test_reviewed_by_defaults_to_none(self, contributor):
        """reviewed_by should be None by default."""
        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            submitted_by=contributor,
            change_description="Adding alias",
        )
        assert item.reviewed_by is None

    def test_reviewed_at_defaults_to_none(self, contributor):
        """reviewed_at should be None by default."""
        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            submitted_by=contributor,
            change_description="Adding alias",
        )
        assert item.reviewed_at is None

    def test_processed_at_defaults_to_none(self, contributor):
        """processed_at should be None by default."""
        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            submitted_by=contributor,
            change_description="Adding alias",
        )
        assert item.processed_at is None

    def test_error_message_defaults_to_empty(self, contributor):
        """error_message should default to empty string."""
        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            submitted_by=contributor,
            change_description="Adding alias",
        )
        assert item.error_message == ""

    def test_result_defaults_to_none(self, contributor):
        """result should be None by default."""
        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            submitted_by=contributor,
            change_description="Adding alias",
        )
        assert item.result is None

    def test_created_at_auto_populated(self, contributor):
        """created_at should be automatically set on creation."""
        before = timezone.now()
        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            submitted_by=contributor,
            change_description="Adding alias",
        )
        assert item.created_at is not None
        assert item.created_at >= before

    def test_updated_at_auto_populated(self, contributor):
        """updated_at should be automatically set on creation."""
        before = timezone.now()
        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            submitted_by=contributor,
            change_description="Adding alias",
        )
        assert item.updated_at is not None
        assert item.updated_at >= before

    def test_auto_assigned_id(self, contributor):
        """Primary key should be auto-assigned as a positive integer."""
        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            submitted_by=contributor,
            change_description="Adding alias",
        )
        assert item.pk is not None
        assert isinstance(item.pk, int)
        assert item.pk > 0


# ============================================================================
# NESQueueItem creation — all fields
# ============================================================================


@pytest.mark.django_db
class TestNESQueueItemAllFields:
    """Tests for NESQueueItem creation with all fields explicitly set."""

    def test_create_with_all_fields(self, contributor, admin_user):
        """Item created with all fields should persist correctly."""
        now = timezone.now()
        result_data = {
            "entity_id": "entity:person/sher-bahadur-deuba",
            "names_count": 3,
        }

        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            status=QueueStatus.COMPLETED,
            submitted_by=contributor,
            reviewed_by=admin_user,
            reviewed_at=now,
            processed_at=now,
            change_description="Adding alias for Sher Bahadur Deuba",
            error_message="",
            result=result_data,
        )

        item.refresh_from_db()
        assert item.action == QueueAction.ADD_NAME
        assert item.payload == VALID_PAYLOAD
        assert item.status == QueueStatus.COMPLETED
        assert item.submitted_by == contributor
        assert item.reviewed_by == admin_user
        assert item.reviewed_at == now
        assert item.processed_at == now
        assert item.change_description == "Adding alias for Sher Bahadur Deuba"
        assert item.error_message == ""
        assert item.result == result_data


# ============================================================================
# Payload JSONField
# ============================================================================


@pytest.mark.django_db
class TestPayloadJSONField:
    """Tests for the payload JSONField storing valid JSON structures."""

    def test_accepts_nested_dict(self, contributor):
        """JSONField should accept deeply nested dicts."""
        payload = {
            "entity_id": "entity:person/kp-sharma-oli",
            "name": {
                "kind": "ALIAS",
                "en": {"full": "K.P. Oli", "first": "KP", "last": "Oli"},
                "ne": {"full": "केपी ओली"},
            },
            "is_misspelling": False,
        }
        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=payload,
            submitted_by=contributor,
            change_description="Adding alias",
        )
        item.refresh_from_db()
        assert item.payload == payload
        assert item.payload["name"]["en"]["first"] == "KP"

    def test_accepts_list_payload(self, contributor):
        """JSONField should accept a list as payload (generic JSON)."""
        payload = [{"key": "value"}, {"key2": "value2"}]
        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=payload,
            submitted_by=contributor,
            change_description="Adding alias",
        )
        item.refresh_from_db()
        assert item.payload == payload

    def test_accepts_unicode_payload(self, contributor):
        """JSONField should correctly store and retrieve Nepali Unicode text."""
        payload = {
            "entity_id": "entity:person/pushpa-kamal-dahal",
            "name": {
                "kind": "PRIMARY",
                "ne": {"full": "पुष्पकमल दाहाल"},
            },
        }
        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=payload,
            submitted_by=contributor,
            change_description="Adding Nepali primary name",
        )
        item.refresh_from_db()
        assert item.payload["name"]["ne"]["full"] == "पुष्पकमल दाहाल"

    def test_result_jsonfield_accepts_dict(self, contributor):
        """Result JSONField should accept dict data."""
        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            submitted_by=contributor,
            change_description="Adding alias",
            result={"entity_id": "entity:person/test", "status": "updated"},
        )
        item.refresh_from_db()
        assert item.result["status"] == "updated"


# ============================================================================
# Foreign key constraints
# ============================================================================


@pytest.mark.django_db
class TestForeignKeyConstraints:
    """Tests for submitted_by and reviewed_by foreign key behaviour."""

    def test_submitted_by_is_required(self):
        """Creating an item without submitted_by should raise IntegrityError."""
        with pytest.raises(IntegrityError):
            NESQueueItem.objects.create(
                action=QueueAction.ADD_NAME,
                payload=VALID_PAYLOAD,
                change_description="Adding alias",
                # submitted_by intentionally omitted
            )

    def test_reviewed_by_is_nullable(self, contributor):
        """reviewed_by should accept None (no reviewer yet)."""
        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            submitted_by=contributor,
            change_description="Adding alias",
            reviewed_by=None,
        )
        assert item.reviewed_by is None

    def test_reviewed_by_accepts_user(self, contributor, admin_user):
        """reviewed_by should accept a User instance."""
        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            submitted_by=contributor,
            reviewed_by=admin_user,
            change_description="Adding alias",
        )
        item.refresh_from_db()
        assert item.reviewed_by == admin_user

    def test_submitted_by_protect_on_delete(self, contributor):
        """Deleting a user with submissions should raise ProtectedError."""
        NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            submitted_by=contributor,
            change_description="Adding alias",
        )
        with pytest.raises(Exception) as exc_info:
            contributor.delete()
        # Django raises ProtectedError (a subclass of IntegrityError)
        assert "ProtectedError" in type(exc_info.value).__name__

    def test_reviewed_by_set_null_on_delete(self, contributor, admin_user):
        """Deleting the reviewer should set reviewed_by to NULL."""
        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            submitted_by=contributor,
            reviewed_by=admin_user,
            change_description="Adding alias",
        )
        admin_user.delete()
        item.refresh_from_db()
        assert item.reviewed_by is None

    def test_reverse_relation_nesq_submissions(self, contributor):
        """User.nesq_submissions should return items submitted by the user."""
        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            submitted_by=contributor,
            change_description="Adding alias",
        )
        assert item in contributor.nesq_submissions.all()

    def test_reverse_relation_nesq_reviews(self, contributor, admin_user):
        """User.nesq_reviews should return items reviewed by the user."""
        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            submitted_by=contributor,
            reviewed_by=admin_user,
            change_description="Adding alias",
        )
        assert item in admin_user.nesq_reviews.all()


# ============================================================================
# Ordering
# ============================================================================


@pytest.mark.django_db
class TestOrdering:
    """Tests for default ordering by created_at (FIFO)."""

    def test_ordering_by_created_at_ascending(self, contributor):
        """Default ordering should return items oldest-first (FIFO)."""
        item1 = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            submitted_by=contributor,
            change_description="First item",
        )
        # Small delay to ensure distinct created_at timestamps
        time.sleep(0.01)
        item2 = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            submitted_by=contributor,
            change_description="Second item",
        )
        time.sleep(0.01)
        item3 = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            submitted_by=contributor,
            change_description="Third item",
        )

        items = list(NESQueueItem.objects.all())
        assert items == [item1, item2, item3]

    def test_meta_ordering_field(self):
        """Model Meta.ordering should be ['created_at']."""
        assert NESQueueItem._meta.ordering == ["created_at"]


# ============================================================================
# Indexes
# ============================================================================


class TestIndexes:
    """Tests for database indexes defined in Meta."""

    def test_status_index_exists(self):
        """There should be an index on the status field."""
        index_names = [idx.name for idx in NESQueueItem._meta.indexes]
        assert "nesq_status_idx" in index_names

    def test_status_index_fields(self):
        """The status index should cover exactly the status field."""
        idx = next(
            idx for idx in NESQueueItem._meta.indexes if idx.name == "nesq_status_idx"
        )
        assert idx.fields == ["status"]


# ============================================================================
# Meta class
# ============================================================================


class TestMeta:
    """Tests for Model Meta configuration."""

    def test_verbose_name(self):
        """verbose_name should be 'NES Queue Item'."""
        assert NESQueueItem._meta.verbose_name == "NES Queue Item"

    def test_verbose_name_plural(self):
        """verbose_name_plural should be 'NES Queue Items'."""
        assert NESQueueItem._meta.verbose_name_plural == "NES Queue Items"


# ============================================================================
# __str__ representation
# ============================================================================


@pytest.mark.django_db
class TestStringRepresentation:
    """Tests for NESQueueItem.__str__ method."""

    def test_str_format(self, contributor):
        """__str__ should return 'NESQ-{pk} [{action}] {status}'."""
        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            submitted_by=contributor,
            change_description="Adding alias",
        )
        expected = f"NESQ-{item.pk} [ADD_NAME] PENDING"
        assert str(item) == expected

    def test_str_with_completed_status(self, contributor):
        """__str__ should reflect current status."""
        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            submitted_by=contributor,
            status=QueueStatus.COMPLETED,
            change_description="Adding alias",
        )
        assert "[ADD_NAME] COMPLETED" in str(item)


# ============================================================================
# Updated_at behaviour
# ============================================================================


@pytest.mark.django_db
class TestUpdatedAt:
    """Tests for auto_now behaviour on updated_at."""

    def test_updated_at_changes_on_save(self, contributor):
        """updated_at should advance when the item is modified and saved."""
        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            submitted_by=contributor,
            change_description="Adding alias",
        )
        original_updated_at = item.updated_at

        time.sleep(0.01)
        item.status = QueueStatus.APPROVED
        item.save()
        item.refresh_from_db()

        assert item.updated_at > original_updated_at
