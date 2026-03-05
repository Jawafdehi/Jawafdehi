"""
Tests for the NES Queue System Queue Processor.

Covers:
- process_approved_items with ADD_NAME (success)
- process_approved_items with ADD_NAME is_misspelling=true
- Processor generates correct author_id format "jawafdehi:{username}"
- Processor augments change_description correctly
- Processor skips PENDING, REJECTED, COMPLETED, and FAILED items
- Processor handles entity not found error
- Processor handles NES validation error
- Processor stores result on success
- Processor sets processed_at timestamp
- Processor maintains chronological order (FIFO)
- Processor continues after individual failure
- _augment_change_description helper

See .kiro/specs/nes-queue-system/tasks.md §10.5 for requirements.
"""

from datetime import timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from asgiref.sync import sync_to_async

from django.utils import timezone

from nesq.models import NESQueueItem, QueueAction, QueueStatus
from nesq.processor import (
    EntityNotFoundError,
    ProcessingResult,
    QueueProcessor,
    _augment_change_description,
)
from tests.conftest import create_user_with_role


# ---------------------------------------------------------------------------
# Helpers — sync helpers wrapped via sync_to_async for use in async tests
# ---------------------------------------------------------------------------

VALID_ADD_NAME_PAYLOAD = {
    "entity_id": "entity:person/sher-bahadur-deuba",
    "name": {
        "kind": "ALIAS",
        "en": {"full": "S.B. Deuba"},
    },
    "is_misspelling": False,
}

VALID_MISSPELLING_PAYLOAD = {
    "entity_id": "entity:person/sher-bahadur-deuba",
    "name": {
        "kind": "ALIAS",
        "ne": {"full": "शेर बहादुर देउबा"},
    },
    "is_misspelling": True,
}


def _create_user_sync(username, email, role):
    """Create a user with role (sync)."""
    return create_user_with_role(username, email, role)


_create_user = sync_to_async(_create_user_sync)


def _make_approved_item_sync(user, payload=None, **overrides):
    """Create an APPROVED NESQueueItem with sensible defaults (sync)."""
    defaults = {
        "action": QueueAction.ADD_NAME,
        "payload": payload or VALID_ADD_NAME_PAYLOAD,
        "status": QueueStatus.APPROVED,
        "submitted_by": user,
        "change_description": "Adding alias for Sher Bahadur Deuba",
    }
    defaults.update(overrides)
    return NESQueueItem.objects.create(**defaults)


_make_approved_item = sync_to_async(_make_approved_item_sync)


def _make_mock_entity(entity_id="entity:person/sher-bahadur-deuba"):
    """Create a mock Entity with names and misspelled_names lists."""
    entity = MagicMock()
    entity.id = entity_id
    entity.names = []
    entity.misspelled_names = None
    return entity


def _make_processor():
    """Create a QueueProcessor with mocked NES dependencies."""
    with patch("nesq.processor.FileDatabase"), \
         patch("nesq.processor.PublicationService"):
        processor = QueueProcessor(nes_db_path="/tmp/fake-nes-db")
        processor.publication_service = AsyncMock()
    return processor


def _setup_mock_entity_on_processor(processor, mock_entity=None):
    """Configure the processor's mock publication service with a mock entity."""
    if mock_entity is None:
        mock_entity = _make_mock_entity()
    processor.publication_service.get_entity.return_value = mock_entity

    updated_entity = MagicMock()
    updated_entity.id = mock_entity.id
    processor.publication_service.update_entity.return_value = updated_entity
    return mock_entity


# ============================================================================
# ProcessingResult dataclass
# ============================================================================


class TestProcessingResult:
    """Test the ProcessingResult dataclass."""

    def test_default_values(self):
        """ProcessingResult should initialise with all zeros and empty errors."""
        result = ProcessingResult()
        assert result.processed == 0
        assert result.completed == 0
        assert result.failed == 0
        assert result.errors == []

    def test_custom_values(self):
        """ProcessingResult should accept custom values."""
        result = ProcessingResult(
            processed=5, completed=3, failed=2,
            errors=[{"item_id": 1, "error": "oops"}],
        )
        assert result.processed == 5
        assert result.completed == 3
        assert result.failed == 2
        assert len(result.errors) == 1


# ============================================================================
# _augment_change_description  (sync tests — no async ORM needed)
# ============================================================================


@pytest.mark.django_db
class TestAugmentChangeDescription:
    """Test the _augment_change_description helper."""

    def test_basic_augmentation(self):
        """Should append ' (submitted by {username})' to the description."""
        user = _create_user_sync("sita_aug", "sita_aug@example.com", "Contributor")
        item = _make_approved_item_sync(user)
        result = _augment_change_description(item)
        assert result == "Adding alias for Sher Bahadur Deuba (submitted by sita_aug)"

    def test_preserves_original_description(self):
        """Should not mutate the original item.change_description."""
        user = _create_user_sync("gita_aug", "gita_aug@example.com", "Contributor")
        item = _make_approved_item_sync(user)
        original = item.change_description
        _augment_change_description(item)
        assert item.change_description == original


# ============================================================================
# QueueProcessor.process_item — ADD_NAME success
#
# transaction=True is required because sync_to_async dispatches ORM calls
# to a separate thread, which cannot see the in-memory savepoint that
# pytest-django uses by default.  Real transactions are visible across
# threads.
# ============================================================================


@pytest.mark.django_db(transaction=True)
class TestProcessItemAddNameSuccess:
    """Test successful ADD_NAME processing."""

    async def test_add_name_success(self):
        """Process an ADD_NAME item and verify COMPLETED status."""
        user = await _create_user("sita_s1", "sita_s1@example.com", "Contributor")
        item = await _make_approved_item(user)

        processor = _make_processor()
        _setup_mock_entity_on_processor(processor)

        success = await processor.process_item(item)

        assert success is True
        await item.arefresh_from_db()
        assert item.status == QueueStatus.COMPLETED

    async def test_add_name_appends_to_names_list(self):
        """ADD_NAME with is_misspelling=False should append to entity.names."""
        user = await _create_user("sita_s2", "sita_s2@example.com", "Contributor")
        item = await _make_approved_item(user, payload=VALID_ADD_NAME_PAYLOAD)

        processor = _make_processor()
        mock_entity = _make_mock_entity()
        mock_entity.names = []
        _setup_mock_entity_on_processor(processor, mock_entity)

        await processor.process_item(item)

        # Name should have been appended
        assert len(mock_entity.names) == 1
        assert mock_entity.names[0].kind.value == "ALIAS"

    async def test_add_misspelling_appends_to_misspelled_names(self):
        """ADD_NAME with is_misspelling=True should append to entity.misspelled_names."""
        user = await _create_user("sita_s3", "sita_s3@example.com", "Contributor")
        item = await _make_approved_item(user, payload=VALID_MISSPELLING_PAYLOAD)

        processor = _make_processor()
        mock_entity = _make_mock_entity()
        mock_entity.misspelled_names = None
        _setup_mock_entity_on_processor(processor, mock_entity)

        await processor.process_item(item)

        assert mock_entity.misspelled_names is not None
        assert len(mock_entity.misspelled_names) == 1

    async def test_add_misspelling_appends_to_existing_list(self):
        """When misspelled_names already has entries, should append without overwriting."""
        user = await _create_user("sita_s4", "sita_s4@example.com", "Contributor")
        item = await _make_approved_item(user, payload=VALID_MISSPELLING_PAYLOAD)

        existing_name = MagicMock()
        processor = _make_processor()
        mock_entity = _make_mock_entity()
        mock_entity.misspelled_names = [existing_name]
        _setup_mock_entity_on_processor(processor, mock_entity)

        await processor.process_item(item)

        assert len(mock_entity.misspelled_names) == 2
        assert mock_entity.misspelled_names[0] is existing_name


# ============================================================================
# Author ID and change description
# ============================================================================


@pytest.mark.django_db(transaction=True)
class TestAuthorIdAndDescription:
    """Test that the processor generates correct author_id and augmented description."""

    async def test_author_id_format(self):
        """author_id should be 'jawafdehi:{sanitized-username}'."""
        user = await _create_user("sita_a1", "sita_a1@example.com", "Contributor")
        item = await _make_approved_item(user)

        processor = _make_processor()
        _setup_mock_entity_on_processor(processor)

        await processor.process_item(item)

        call_kwargs = processor.publication_service.update_entity.call_args
        # Underscores in username are replaced with hyphens for NES Author slug
        assert call_kwargs.kwargs["author_id"] == "jawafdehi:sita-a1"

    async def test_augmented_description_passed_to_publication_service(self):
        """change_description passed to update_entity should include submitter username."""
        user = await _create_user("sita_a2", "sita_a2@example.com", "Contributor")
        item = await _make_approved_item(user)

        processor = _make_processor()
        _setup_mock_entity_on_processor(processor)

        await processor.process_item(item)

        call_kwargs = processor.publication_service.update_entity.call_args
        desc = call_kwargs.kwargs["change_description"]
        assert "(submitted by sita_a2)" in desc


# ============================================================================
# Result and timestamp storage
# ============================================================================


@pytest.mark.django_db(transaction=True)
class TestResultAndTimestamp:
    """Test that the processor stores result and timestamps correctly."""

    async def test_stores_result_on_success(self):
        """On success, item.result should contain the entity_id."""
        user = await _create_user("sita_r1", "sita_r1@example.com", "Contributor")
        item = await _make_approved_item(user)

        processor = _make_processor()
        _setup_mock_entity_on_processor(processor)

        await processor.process_item(item)

        await item.arefresh_from_db()
        assert item.result == {"entity_id": "entity:person/sher-bahadur-deuba"}

    async def test_sets_processed_at_on_success(self):
        """On success, item.processed_at should be set."""
        before = timezone.now()
        user = await _create_user("sita_r2", "sita_r2@example.com", "Contributor")
        item = await _make_approved_item(user)

        processor = _make_processor()
        _setup_mock_entity_on_processor(processor)

        await processor.process_item(item)

        await item.arefresh_from_db()
        assert item.processed_at is not None
        assert item.processed_at >= before

    async def test_sets_processed_at_on_failure(self):
        """On failure, item.processed_at should still be set."""
        before = timezone.now()
        user = await _create_user("sita_r3", "sita_r3@example.com", "Contributor")
        item = await _make_approved_item(user)

        processor = _make_processor()
        processor.publication_service.get_entity.return_value = None

        await processor.process_item(item)

        await item.arefresh_from_db()
        assert item.processed_at is not None
        assert item.processed_at >= before


# ============================================================================
# Error handling
# ============================================================================


@pytest.mark.django_db(transaction=True)
class TestProcessItemErrors:
    """Test error handling in process_item."""

    async def test_entity_not_found_marks_failed(self):
        """When entity is not found, item should be marked FAILED."""
        user = await _create_user("sita_e1", "sita_e1@example.com", "Contributor")
        item = await _make_approved_item(user)

        processor = _make_processor()
        processor.publication_service.get_entity.return_value = None

        success = await processor.process_item(item)

        assert success is False
        await item.arefresh_from_db()
        assert item.status == QueueStatus.FAILED
        assert "not found" in item.error_message.lower()

    async def test_nes_validation_error_marks_failed(self):
        """When NES raises a ValueError, item should be marked FAILED."""
        user = await _create_user("sita_e2", "sita_e2@example.com", "Contributor")
        item = await _make_approved_item(user)

        processor = _make_processor()
        mock_entity = _make_mock_entity()
        processor.publication_service.get_entity.return_value = mock_entity
        processor.publication_service.update_entity.side_effect = ValueError(
            "Entity update invalid"
        )

        success = await processor.process_item(item)

        assert success is False
        await item.arefresh_from_db()
        assert item.status == QueueStatus.FAILED
        assert "Entity update invalid" in item.error_message

    async def test_generic_exception_marks_failed(self):
        """Any unexpected exception should be caught and item marked FAILED."""
        user = await _create_user("sita_e3", "sita_e3@example.com", "Contributor")
        item = await _make_approved_item(user)

        processor = _make_processor()
        mock_entity = _make_mock_entity()
        processor.publication_service.get_entity.return_value = mock_entity
        processor.publication_service.update_entity.side_effect = RuntimeError(
            "Disk full"
        )

        success = await processor.process_item(item)

        assert success is False
        await item.arefresh_from_db()
        assert item.status == QueueStatus.FAILED
        assert "Disk full" in item.error_message


# ============================================================================
# process_approved_items — batch processing
# ============================================================================


@pytest.mark.django_db(transaction=True)
class TestProcessApprovedItems:
    """Test the batch process_approved_items method."""

    async def test_processes_only_approved_items(self):
        """Should process APPROVED items and skip PENDING/REJECTED/COMPLETED/FAILED."""
        user = await _create_user("sita_b1", "sita_b1@example.com", "Contributor")
        await _make_approved_item(user, status=QueueStatus.APPROVED)
        await _make_approved_item(user, status=QueueStatus.PENDING)
        await _make_approved_item(user, status=QueueStatus.REJECTED)
        await _make_approved_item(user, status=QueueStatus.COMPLETED)
        await _make_approved_item(user, status=QueueStatus.FAILED)

        processor = _make_processor()
        _setup_mock_entity_on_processor(processor)

        result = await processor.process_approved_items()

        assert result.processed == 1
        assert result.completed == 1
        assert result.failed == 0

    async def test_fifo_order(self):
        """Items should be processed in created_at order (FIFO)."""
        user = await _create_user("sita_b2", "sita_b2@example.com", "Contributor")
        now = timezone.now()

        item2 = await _make_approved_item(
            user, change_description="Second item",
        )
        item1 = await _make_approved_item(
            user, change_description="First item",
        )
        # Force item1 to be older
        await sync_to_async(
            NESQueueItem.objects.filter(pk=item1.pk).update
        )(created_at=now - timedelta(hours=1))

        processed_descriptions = []

        processor = _make_processor()
        _setup_mock_entity_on_processor(processor)

        original_process_item = processor.process_item

        async def track_order(item):
            processed_descriptions.append(item.change_description)
            return await original_process_item(item)

        processor.process_item = track_order

        await processor.process_approved_items()

        assert processed_descriptions[0] == "First item"
        assert processed_descriptions[1] == "Second item"

    async def test_continues_after_failure(self):
        """If one item fails, processing should continue to the next."""
        user = await _create_user("sita_b3", "sita_b3@example.com", "Contributor")

        bad_payload = {
            "entity_id": "entity:person/non-existent",
            "name": {"kind": "ALIAS", "en": {"full": "Test"}},
            "is_misspelling": False,
        }
        item1 = await _make_approved_item(
            user, payload=bad_payload,
            change_description="Will fail",
        )
        item2 = await _make_approved_item(
            user, payload=VALID_ADD_NAME_PAYLOAD,
            change_description="Will succeed",
        )

        mock_entity = _make_mock_entity()
        processor = _make_processor()

        # First call returns None (not found), second returns entity
        processor.publication_service.get_entity.side_effect = [None, mock_entity]
        updated_entity = MagicMock()
        updated_entity.id = "entity:person/sher-bahadur-deuba"
        processor.publication_service.update_entity.return_value = updated_entity

        result = await processor.process_approved_items()

        assert result.processed == 2
        assert result.completed == 1
        assert result.failed == 1
        assert len(result.errors) == 1

        await item1.arefresh_from_db()
        await item2.arefresh_from_db()
        assert item1.status == QueueStatus.FAILED
        assert item2.status == QueueStatus.COMPLETED

    async def test_empty_queue_returns_zero_counts(self):
        """When no approved items exist, should return all zeros."""
        processor = _make_processor()
        result = await processor.process_approved_items()

        assert result.processed == 0
        assert result.completed == 0
        assert result.failed == 0
        assert result.errors == []

    async def test_errors_list_contains_item_ids(self):
        """Errors list should contain item_id and error message for each failure."""
        user = await _create_user("sita_b4", "sita_b4@example.com", "Contributor")
        item = await _make_approved_item(user)

        processor = _make_processor()
        processor.publication_service.get_entity.return_value = None

        result = await processor.process_approved_items()

        assert len(result.errors) == 1
        assert result.errors[0]["item_id"] == item.id
        assert "not found" in result.errors[0]["error"].lower()
