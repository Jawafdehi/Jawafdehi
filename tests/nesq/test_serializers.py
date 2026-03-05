"""Unit tests for NESQ DRF serializers.

Feature: nes-queue-system
Task 10.3: Test Serializers

Tests cover:
    - NESQueueSubmitSerializer with valid data
    - NESQueueSubmitSerializer rejection of missing/invalid fields
    - NESQueueItemSerializer serialization with username extraction
    - auto_approve defaults and explicit values
    - change_description whitespace stripping and non-empty validation
"""

import pytest
from django.utils import timezone

from nesq.models import NESQueueItem, QueueAction, QueueStatus
from nesq.serializers import NESQueueItemSerializer, NESQueueSubmitSerializer
from tests.conftest import create_user_with_role


# ============================================================================
# Shared fixtures
# ============================================================================

VALID_PAYLOAD = {
    "entity_id": "entity:person/sher-bahadur-deuba",
    "name": {"kind": "ALIAS", "en": {"full": "S.B. Deuba"}},
}


@pytest.fixture
def contributor(db):
    """Create a contributor user for testing."""
    return create_user_with_role("ram_kumar", "ram@example.np", "Contributor")


@pytest.fixture
def admin_user(db):
    """Create an admin user for testing."""
    return create_user_with_role("sita_admin", "sita@example.np", "Admin")


# ============================================================================
# NESQueueSubmitSerializer — Valid data
# ============================================================================


class TestSubmitSerializerValid:
    """Tests for NESQueueSubmitSerializer with valid inputs."""

    def test_valid_data_all_fields(self):
        """Serializer accepts valid data with all fields provided."""
        data = {
            "action": "ADD_NAME",
            "payload": VALID_PAYLOAD,
            "change_description": "Adding alias for Sher Bahadur Deuba",
            "auto_approve": False,
        }
        serializer = NESQueueSubmitSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["action"] == "ADD_NAME"
        assert serializer.validated_data["payload"] == VALID_PAYLOAD
        assert serializer.validated_data["auto_approve"] is False

    def test_valid_data_without_auto_approve(self):
        """Serializer accepts data without auto_approve (defaults to False)."""
        data = {
            "action": "ADD_NAME",
            "payload": VALID_PAYLOAD,
            "change_description": "Adding alias for Sher Bahadur Deuba",
        }
        serializer = NESQueueSubmitSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["auto_approve"] is False

    def test_auto_approve_true(self):
        """Serializer accepts auto_approve=True (authorization is checked in view)."""
        data = {
            "action": "ADD_NAME",
            "payload": VALID_PAYLOAD,
            "change_description": "Admin adding name",
            "auto_approve": True,
        }
        serializer = NESQueueSubmitSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["auto_approve"] is True

    def test_change_description_strips_whitespace(self):
        """Serializer strips leading/trailing whitespace from change_description."""
        data = {
            "action": "ADD_NAME",
            "payload": VALID_PAYLOAD,
            "change_description": "  some description  ",
        }
        serializer = NESQueueSubmitSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["change_description"] == "some description"

    def test_payload_accepts_nested_dict(self):
        """Serializer accepts a deeply nested dict as payload."""
        nested_payload = {
            "entity_id": "entity:person/sher-bahadur-deuba",
            "name": {
                "kind": "PRIMARY",
                "en": {"full": "Sher Bahadur Deuba", "given": "Sher Bahadur"},
                "ne": {"full": "शेर बहादुर देउवा"},
            },
            "is_misspelling": True,
        }
        data = {
            "action": "ADD_NAME",
            "payload": nested_payload,
            "change_description": "Adding full name",
        }
        serializer = NESQueueSubmitSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["payload"]["is_misspelling"] is True


# ============================================================================
# NESQueueSubmitSerializer — Invalid data
# ============================================================================


class TestSubmitSerializerInvalid:
    """Tests for NESQueueSubmitSerializer with invalid inputs."""

    def test_missing_action(self):
        """Serializer rejects data without action field."""
        data = {
            "payload": VALID_PAYLOAD,
            "change_description": "some description",
        }
        serializer = NESQueueSubmitSerializer(data=data)
        assert not serializer.is_valid()
        assert "action" in serializer.errors

    def test_invalid_action(self):
        """Serializer rejects an invalid action value."""
        data = {
            "action": "DELETE_ENTITY",
            "payload": VALID_PAYLOAD,
            "change_description": "some description",
        }
        serializer = NESQueueSubmitSerializer(data=data)
        assert not serializer.is_valid()
        assert "action" in serializer.errors

    def test_missing_payload(self):
        """Serializer rejects data without payload field."""
        data = {
            "action": "ADD_NAME",
            "change_description": "some description",
        }
        serializer = NESQueueSubmitSerializer(data=data)
        assert not serializer.is_valid()
        assert "payload" in serializer.errors

    def test_payload_must_be_dict(self):
        """Serializer rejects non-dict payload (e.g., a list)."""
        data = {
            "action": "ADD_NAME",
            "payload": ["not", "a", "dict"],
            "change_description": "some description",
        }
        serializer = NESQueueSubmitSerializer(data=data)
        assert not serializer.is_valid()
        assert "payload" in serializer.errors

    def test_payload_string_rejected(self):
        """Serializer rejects a plain string as payload."""
        data = {
            "action": "ADD_NAME",
            "payload": "not a dict",
            "change_description": "some description",
        }
        serializer = NESQueueSubmitSerializer(data=data)
        assert not serializer.is_valid()
        assert "payload" in serializer.errors

    def test_missing_change_description(self):
        """Serializer rejects data without change_description field."""
        data = {
            "action": "ADD_NAME",
            "payload": VALID_PAYLOAD,
        }
        serializer = NESQueueSubmitSerializer(data=data)
        assert not serializer.is_valid()
        assert "change_description" in serializer.errors

    def test_empty_change_description(self):
        """Serializer rejects empty string change_description."""
        data = {
            "action": "ADD_NAME",
            "payload": VALID_PAYLOAD,
            "change_description": "",
        }
        serializer = NESQueueSubmitSerializer(data=data)
        assert not serializer.is_valid()
        assert "change_description" in serializer.errors

    def test_whitespace_only_change_description(self):
        """Serializer rejects whitespace-only change_description."""
        data = {
            "action": "ADD_NAME",
            "payload": VALID_PAYLOAD,
            "change_description": "   \t\n  ",
        }
        serializer = NESQueueSubmitSerializer(data=data)
        assert not serializer.is_valid()
        assert "change_description" in serializer.errors

    def test_completely_empty_data(self):
        """Serializer rejects empty request body."""
        serializer = NESQueueSubmitSerializer(data={})
        assert not serializer.is_valid()
        assert "action" in serializer.errors
        assert "payload" in serializer.errors
        assert "change_description" in serializer.errors


# ============================================================================
# NESQueueItemSerializer — Response serialization
# ============================================================================


@pytest.mark.django_db
class TestItemSerializer:
    """Tests for NESQueueItemSerializer (response formatting)."""

    def test_serializes_pending_item(self, contributor):
        """Serializer correctly formats a PENDING queue item."""
        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            status=QueueStatus.PENDING,
            submitted_by=contributor,
            change_description="Adding alias",
        )
        serializer = NESQueueItemSerializer(item)
        data = serializer.data

        assert data["id"] == item.pk
        assert data["action"] == "ADD_NAME"
        assert data["status"] == "PENDING"
        assert data["submitted_by"] == "ram_kumar"
        assert data["reviewed_by"] is None
        assert data["reviewed_at"] is None
        assert data["processed_at"] is None
        assert data["created_at"] is not None

    def test_serializes_approved_item_with_reviewer(self, contributor, admin_user):
        """Serializer resolves reviewed_by to the reviewer's username."""
        now = timezone.now()
        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            status=QueueStatus.APPROVED,
            submitted_by=contributor,
            reviewed_by=admin_user,
            reviewed_at=now,
            change_description="Adding alias",
        )
        serializer = NESQueueItemSerializer(item)
        data = serializer.data

        assert data["status"] == "APPROVED"
        assert data["submitted_by"] == "ram_kumar"
        assert data["reviewed_by"] == "sita_admin"
        assert data["reviewed_at"] is not None

    def test_serializes_completed_item(self, contributor, admin_user):
        """Serializer correctly formats a COMPLETED queue item with processed_at."""
        now = timezone.now()
        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            status=QueueStatus.COMPLETED,
            submitted_by=contributor,
            reviewed_by=admin_user,
            reviewed_at=now,
            processed_at=now,
            change_description="Adding alias",
            result={"entity_id": "entity:person/sher-bahadur-deuba"},
        )
        serializer = NESQueueItemSerializer(item)
        data = serializer.data

        assert data["status"] == "COMPLETED"
        assert data["processed_at"] is not None
        # result is not in the response fields (not part of the API contract)
        assert "result" not in data

    def test_excludes_internal_fields(self, contributor):
        """Serializer does not expose internal fields (payload, error_message, result)."""
        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            status=QueueStatus.PENDING,
            submitted_by=contributor,
            change_description="Adding alias",
        )
        serializer = NESQueueItemSerializer(item)
        data = serializer.data

        assert "payload" not in data
        assert "error_message" not in data
        assert "result" not in data
        assert "change_description" not in data
        assert "updated_at" not in data

    def test_expected_field_list(self, contributor):
        """Serializer returns exactly the expected set of fields."""
        item = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_PAYLOAD,
            status=QueueStatus.PENDING,
            submitted_by=contributor,
            change_description="Adding alias",
        )
        serializer = NESQueueItemSerializer(item)
        expected_fields = {
            "id",
            "action",
            "status",
            "submitted_by",
            "reviewed_by",
            "reviewed_at",
            "processed_at",
            "created_at",
        }
        assert set(serializer.data.keys()) == expected_fields
