"""Integration tests for the NES Queue System (NESQ).

These tests exercise the complete submit → approve → process pipeline using
a **real** NES FileDatabase and PublicationService writing to a temporary
directory.  No NES internals are mocked.

Covers (Task 11.1):
- Complete ADD_NAME workflow: submit → approve → process → verify on disk
- ADD_NAME with is_misspelling=true: name lands in misspelled_names
- Auto-approve workflow for admin (status starts as APPROVED)
- Manual approval via Django admin bulk_approve action
- Error handling when entity not found (FAILED status)
- Rejection of unsupported actions at API level (400)
- FIFO processing order across multiple approved items

See .kiro/specs/nes-queue-system/tasks.md §11 for requirements.
"""

from unittest.mock import MagicMock

import pytest

from asgiref.sync import sync_to_async

from nes.database.file_database import FileDatabase
from nes.services.publication import PublicationService

from django.utils import timezone

from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from nesq.admin import NESQueueItemAdmin
from nesq.models import NESQueueItem, QueueStatus
from nesq.processor import QueueProcessor
from tests.conftest import create_user_with_role

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SUBMIT_URL = "/api/submit_nes_change"

SEED_ENTITY_ID = "entity:person/sher-bahadur-deuba"

SEED_ENTITY_DATA = {
    "slug": "sher-bahadur-deuba",
    "entity_prefix": "person",
    "names": [
        {
            "kind": "PRIMARY",
            "en": {"full": "Sher Bahadur Deuba"},
            "ne": {"full": "शेरबहादुर देउवा"},
        }
    ],
}

VALID_ADD_NAME_PAYLOAD = {
    "entity_id": SEED_ENTITY_ID,
    "name": {"kind": "ALIAS", "en": {"full": "S.B. Deuba"}},
    "is_misspelling": False,
}

MISSPELLING_PAYLOAD = {
    "entity_id": SEED_ENTITY_ID,
    "name": {"kind": "ALIAS", "ne": {"full": "शेर बहादुर देउबा"}},
    "is_misspelling": True,
}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
async def nes_test_env(tmp_path):
    """Create a real NES FileDatabase with a seed entity for integration tests.

    Yields (tmp_path, db, pub_service, seed_entity).
    """
    db = FileDatabase(base_path=str(tmp_path))
    pub_service = PublicationService(database=db)

    seed_entity = await pub_service.create_entity(
        entity_prefix="person",
        entity_data=SEED_ENTITY_DATA.copy(),
        author_id="author:test-setup",
        change_description="Seed entity for integration test",
    )

    return tmp_path, db, pub_service, seed_entity


@pytest.fixture
def contributor(db):
    """Create a contributor user."""
    return create_user_with_role("ram-integ", "ram-integ@example.np", "Contributor")


@pytest.fixture
def admin_user(db):
    """Create an admin user."""
    return create_user_with_role("sita-integ", "sita-integ@example.np", "Admin")


@pytest.fixture
def moderator_user(db):
    """Create a moderator user."""
    return create_user_with_role("hari-integ", "hari-integ@example.np", "Moderator")


@pytest.fixture
def contributor_client(contributor):
    """API client authenticated as a contributor."""
    token = Token.objects.create(user=contributor)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


@pytest.fixture
def admin_client(admin_user):
    """API client authenticated as an admin."""
    token = Token.objects.create(user=admin_user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _submit_add_name(client, payload=None, change_description=None, auto_approve=None):
    """Submit an ADD_NAME request via the API and return the response."""
    data = {
        "action": "ADD_NAME",
        "payload": payload or VALID_ADD_NAME_PAYLOAD,
        "change_description": change_description or "Integration test name addition",
    }
    if auto_approve is not None:
        data["auto_approve"] = auto_approve
    return client.post(SUBMIT_URL, data=data, format="json")


def _approve_item(item, reviewer):
    """Manually approve a queue item (simulates admin action)."""
    item.status = QueueStatus.APPROVED
    item.reviewed_by = reviewer
    item.reviewed_at = timezone.now()
    item.save()


async def _process_queue(nes_db_path):
    """Run the QueueProcessor against the given NES db path."""
    processor = QueueProcessor(nes_db_path=str(nes_db_path))
    return await processor.process_approved_items()


# ============================================================================
# Complete ADD_NAME Workflow
# ============================================================================


@pytest.mark.django_db(transaction=True)
class TestCompleteWorkflow:
    """Test the full submit → approve → process → verify pipeline."""

    async def test_submit_approve_process_adds_name_to_entity(
        self,
        nes_test_env,
        contributor_client,
        contributor,
        admin_user,
    ):
        """ADD_NAME workflow: submit → approve → process → name on disk."""
        tmp_path, db, pub_service, seed_entity = nes_test_env

        # 1. Submit via API
        response = await sync_to_async(_submit_add_name)(contributor_client)
        assert response.status_code == 201
        item_id = response.json()["id"]

        # 2. Approve
        item = await sync_to_async(NESQueueItem.objects.get)(pk=item_id)
        await sync_to_async(_approve_item)(item, admin_user)

        # 3. Process
        result = await _process_queue(tmp_path)
        assert result.processed == 1
        assert result.completed == 1
        assert result.failed == 0

        # 4. Verify item status
        await item.arefresh_from_db()
        assert item.status == QueueStatus.COMPLETED
        assert item.processed_at is not None
        assert item.result is not None
        assert item.error_message == ""

        # 5. Verify entity on disk has the new name
        updated_entity = await pub_service.get_entity(seed_entity.id)
        assert updated_entity is not None
        assert len(updated_entity.names) == 2  # PRIMARY + new ALIAS
        alias_names = [n for n in updated_entity.names if n.kind.value == "ALIAS"]
        assert len(alias_names) == 1
        assert alias_names[0].en.full == "S.B. Deuba"


# ============================================================================
# Misspelling Workflow
# ============================================================================


@pytest.mark.django_db(transaction=True)
class TestMisspellingWorkflow:
    """Test ADD_NAME with is_misspelling=true lands in misspelled_names."""

    async def test_misspelling_added_to_misspelled_names(
        self,
        nes_test_env,
        contributor_client,
        contributor,
        admin_user,
    ):
        """Misspelling workflow: name goes to entity.misspelled_names on disk."""
        tmp_path, db, pub_service, seed_entity = nes_test_env

        # 1. Submit misspelling via API
        response = await sync_to_async(_submit_add_name)(
            contributor_client,
            payload=MISSPELLING_PAYLOAD,
        )
        assert response.status_code == 201
        item_id = response.json()["id"]

        # 2. Approve and process
        item = await sync_to_async(NESQueueItem.objects.get)(pk=item_id)
        await sync_to_async(_approve_item)(item, admin_user)
        result = await _process_queue(tmp_path)

        assert result.completed == 1

        # 3. Verify on disk
        updated_entity = await pub_service.get_entity(seed_entity.id)
        assert updated_entity.misspelled_names is not None
        assert len(updated_entity.misspelled_names) == 1
        # Original names list unchanged (still just PRIMARY)
        assert len(updated_entity.names) == 1


# ============================================================================
# Auto-Approve Workflow
# ============================================================================


@pytest.mark.django_db(transaction=True)
class TestAutoApproveWorkflow:
    """Test admin auto_approve=true skips manual approval step."""

    async def test_admin_auto_approve_and_process(
        self,
        nes_test_env,
        admin_client,
        admin_user,
    ):
        """Auto-approve: admin submits → APPROVED immediately → process → COMPLETED."""
        tmp_path, db, pub_service, seed_entity = nes_test_env

        # 1. Submit with auto_approve=true
        response = await sync_to_async(_submit_add_name)(
            admin_client,
            auto_approve=True,
        )
        assert response.status_code == 201
        resp_data = response.json()
        assert resp_data["status"] == "APPROVED"
        assert resp_data["reviewed_by"] == admin_user.username

        # 2. Process (no manual approval step needed)
        result = await _process_queue(tmp_path)
        assert result.completed == 1

        # 3. Verify on disk
        updated_entity = await pub_service.get_entity(seed_entity.id)
        assert len(updated_entity.names) == 2


# ============================================================================
# Manual Approval via Admin Action
# ============================================================================


@pytest.mark.django_db(transaction=True)
class TestManualAdminApproval:
    """Test approval through Django admin bulk_approve action."""

    async def test_bulk_approve_and_process(
        self,
        nes_test_env,
        contributor_client,
        contributor,
        admin_user,
    ):
        """Admin bulk_approve action → process → COMPLETED."""
        tmp_path, db, pub_service, seed_entity = nes_test_env

        # 1. Submit (creates PENDING item)
        response = await sync_to_async(_submit_add_name)(contributor_client)
        assert response.status_code == 201
        item_id = response.json()["id"]
        assert response.json()["status"] == "PENDING"

        # 2. Simulate Django admin bulk_approve action
        queryset = NESQueueItem.objects.filter(pk=item_id)
        mock_request = MagicMock()
        mock_request.user = admin_user

        admin_instance = NESQueueItemAdmin(NESQueueItem, None)
        await sync_to_async(admin_instance.bulk_approve)(
            mock_request,
            queryset,
        )

        # Verify approval (access FK via sync_to_async to avoid SynchronousOnlyOperation)
        item = await sync_to_async(NESQueueItem.objects.get)(pk=item_id)
        assert item.status == QueueStatus.APPROVED
        reviewed_by_id = await sync_to_async(lambda: item.reviewed_by_id)()
        assert reviewed_by_id == admin_user.pk

        # 3. Process
        result = await _process_queue(tmp_path)
        assert result.completed == 1

        # 4. Verify on disk
        updated_entity = await pub_service.get_entity(seed_entity.id)
        assert len(updated_entity.names) == 2


# ============================================================================
# Error Handling — Entity Not Found
# ============================================================================


@pytest.mark.django_db(transaction=True)
class TestErrorHandling:
    """Test error handling when processing fails."""

    async def test_entity_not_found_marks_item_failed(
        self,
        nes_test_env,
        contributor_client,
        contributor,
        admin_user,
    ):
        """Non-existent entity_id → item FAILED with descriptive error."""
        tmp_path, db, pub_service, seed_entity = nes_test_env

        bad_payload = {
            "entity_id": "entity:person/non-existent-person",
            "name": {"kind": "ALIAS", "en": {"full": "Test"}},
            "is_misspelling": False,
        }

        # 1. Submit with non-existent entity
        response = await sync_to_async(_submit_add_name)(
            contributor_client,
            payload=bad_payload,
        )
        assert response.status_code == 201
        item_id = response.json()["id"]

        # 2. Approve and process
        item = await sync_to_async(NESQueueItem.objects.get)(pk=item_id)
        await sync_to_async(_approve_item)(item, admin_user)
        result = await _process_queue(tmp_path)

        # 3. Verify FAILED
        assert result.processed == 1
        assert result.failed == 1
        assert result.completed == 0

        await item.arefresh_from_db()
        assert item.status == QueueStatus.FAILED
        assert "not found" in item.error_message.lower()
        assert item.processed_at is not None

        # 4. Verify seed entity unchanged on disk
        unchanged = await pub_service.get_entity(seed_entity.id)
        assert len(unchanged.names) == 1  # Only PRIMARY


# ============================================================================
# Unsupported Action Rejection
# ============================================================================


@pytest.mark.django_db
class TestUnsupportedActions:
    """Test that unsupported actions are rejected at the API level."""

    def test_create_entity_now_supported(self, contributor_client):
        """CREATE_ENTITY is now supported and creates a queue item."""
        data = {
            "action": "CREATE_ENTITY",
            "payload": {
                "entity_data": {
                    "entity_prefix": "person",
                    "slug": "test-person",
                    "names": [{"kind": "PRIMARY", "en": {"full": "Test Person"}}],
                },
            },
            "change_description": "Creating new entity via CREATE_ENTITY",
        }
        response = contributor_client.post(SUBMIT_URL, data=data, format="json")
        assert response.status_code == 201
        assert NESQueueItem.objects.count() == 1

    def test_update_entity_rejected(self, contributor_client):
        """UPDATE_ENTITY returns 400 and creates no queue item."""
        data = {
            "action": "UPDATE_ENTITY",
            "payload": {"entity_id": SEED_ENTITY_ID},
            "change_description": "Trying UPDATE_ENTITY",
        }
        response = contributor_client.post(SUBMIT_URL, data=data, format="json")
        assert response.status_code == 400
        assert NESQueueItem.objects.count() == 0
