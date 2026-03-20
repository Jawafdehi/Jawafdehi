"""Unit tests for NESQ API views.

Feature: nes-queue-system
Task 10.4: Test API Views

Tests cover:
    - Authentication requirements (401 without token, 401 with invalid token)
    - Successful ADD_NAME submission (201)
    - Rejection of unsupported actions (400)
    - Pydantic payload validation errors (400)
    - auto_approve as Admin/Moderator (status=APPROVED)
    - auto_approve as Contributor (403)
    - Default submission creates PENDING item
    - No author_id required in payload
    - ListMySubmissionsView pagination and user filtering
"""

import pytest
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from nesq.models import NESQueueItem, QueueAction, QueueStatus
from tests.conftest import create_user_with_role

# ============================================================================
# Shared fixtures
# ============================================================================

VALID_ADD_NAME_PAYLOAD = {
    "entity_id": "entity:person/sher-bahadur-deuba",
    "name": {"kind": "ALIAS", "en": {"full": "S.B. Deuba"}},
}

VALID_UPDATE_ENTITY_PAYLOAD = {
    "entity_id": "entity:person/sher-bahadur-deuba",
    "patch_ops": [
        {
            "op": "replace",
            "path": "/short_description/en/value",
            "value": "Updated from API test",
        }
    ],
}

VALID_SUBMIT_DATA = {
    "action": "ADD_NAME",
    "payload": VALID_ADD_NAME_PAYLOAD,
    "change_description": "Adding common alias for Sher Bahadur Deuba",
}

SUBMIT_URL = "/api/submit_nes_change"
MY_SUBMISSIONS_URL = "/api/my_nes_submissions"


@pytest.fixture
def contributor(db):
    """Create a contributor user with a token."""
    return create_user_with_role("ram_kumar", "ram@example.np", "Contributor")


@pytest.fixture
def admin_user(db):
    """Create an admin user with a token."""
    return create_user_with_role("sita_admin", "sita@example.np", "Admin")


@pytest.fixture
def moderator_user(db):
    """Create a moderator user with a token."""
    return create_user_with_role("hari_mod", "hari@example.np", "Moderator")


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


@pytest.fixture
def moderator_client(moderator_user):
    """API client authenticated as a moderator."""
    token = Token.objects.create(user=moderator_user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


@pytest.fixture
def unauthenticated_client():
    """API client with no credentials."""
    return APIClient()


# ============================================================================
# Authentication Tests
# ============================================================================


@pytest.mark.django_db
class TestSubmitAuthentication:
    """Tests for authentication requirements on the submit endpoint."""

    def test_unauthenticated_returns_401(self, unauthenticated_client):
        """Submit endpoint rejects unauthenticated requests with 401."""
        response = unauthenticated_client.post(
            SUBMIT_URL, data=VALID_SUBMIT_DATA, format="json"
        )
        assert response.status_code == 401

    def test_invalid_token_returns_401(self):
        """Submit endpoint rejects requests with an invalid token."""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION="Token invalidtoken12345")
        response = client.post(SUBMIT_URL, data=VALID_SUBMIT_DATA, format="json")
        assert response.status_code == 401


# ============================================================================
# Successful Submission Tests
# ============================================================================


@pytest.mark.django_db
class TestSubmitSuccess:
    """Tests for successful submissions via the submit endpoint."""

    def test_valid_add_name_returns_201(self, contributor_client):
        """Valid ADD_NAME submission returns 201 Created."""
        response = contributor_client.post(
            SUBMIT_URL, data=VALID_SUBMIT_DATA, format="json"
        )
        assert response.status_code == 201

    def test_valid_add_name_creates_pending_item(self, contributor_client, contributor):
        """Contributor submission creates a PENDING queue item."""
        response = contributor_client.post(
            SUBMIT_URL, data=VALID_SUBMIT_DATA, format="json"
        )
        assert response.status_code == 201

        data = response.json()
        assert data["status"] == "PENDING"
        assert data["submitted_by"] == "ram_kumar"
        assert data["reviewed_by"] is None
        assert data["reviewed_at"] is None

        # Verify database record
        item = NESQueueItem.objects.get(pk=data["id"])
        assert item.action == QueueAction.ADD_NAME
        assert item.status == QueueStatus.PENDING
        assert item.submitted_by == contributor
        assert item.reviewed_by is None
        assert item.payload == {
            **VALID_ADD_NAME_PAYLOAD,
            "is_misspelling": False,
        }

    def test_response_fields(self, contributor_client):
        """Response contains exactly the expected set of fields."""
        response = contributor_client.post(
            SUBMIT_URL, data=VALID_SUBMIT_DATA, format="json"
        )
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
        assert set(response.json().keys()) == expected_fields

    def test_auto_approve_false_creates_pending(self, contributor_client):
        """Explicit auto_approve=False creates a PENDING item."""
        data = {**VALID_SUBMIT_DATA, "auto_approve": False}
        response = contributor_client.post(SUBMIT_URL, data=data, format="json")
        assert response.status_code == 201
        assert response.json()["status"] == "PENDING"

    def test_misspelling_payload(self, contributor_client):
        """ADD_NAME with is_misspelling=True is accepted."""
        payload = {
            "entity_id": "entity:person/sher-bahadur-deuba",
            "name": {"kind": "ALIAS", "ne": {"full": "शेर बहादुर देउबा"}},
            "is_misspelling": True,
        }
        data = {
            "action": "ADD_NAME",
            "payload": payload,
            "change_description": "Adding common misspelling",
        }
        response = contributor_client.post(SUBMIT_URL, data=data, format="json")
        assert response.status_code == 201

    def test_no_author_id_required_in_payload(self, contributor_client):
        """Payload does not require an author_id field — it's derived from the user."""
        # The VALID_ADD_NAME_PAYLOAD has no author_id and should succeed
        response = contributor_client.post(
            SUBMIT_URL, data=VALID_SUBMIT_DATA, format="json"
        )
        assert response.status_code == 201


# ============================================================================
# Auto-Approve Tests
# ============================================================================


@pytest.mark.django_db
class TestAutoApprove:
    """Tests for the auto_approve flag behaviour."""

    def test_admin_auto_approve_creates_approved_item(self, admin_client, admin_user):
        """Admin with auto_approve=True creates an APPROVED item."""
        data = {**VALID_SUBMIT_DATA, "auto_approve": True}
        response = admin_client.post(SUBMIT_URL, data=data, format="json")
        assert response.status_code == 201

        resp_data = response.json()
        assert resp_data["status"] == "APPROVED"
        assert resp_data["reviewed_by"] == "sita_admin"
        assert resp_data["reviewed_at"] is not None

        # Verify database
        item = NESQueueItem.objects.get(pk=resp_data["id"])
        assert item.status == QueueStatus.APPROVED
        assert item.reviewed_by == admin_user
        assert item.reviewed_at is not None

    def test_moderator_auto_approve_creates_approved_item(
        self, moderator_client, moderator_user
    ):
        """Moderator with auto_approve=True creates an APPROVED item."""
        data = {**VALID_SUBMIT_DATA, "auto_approve": True}
        response = moderator_client.post(SUBMIT_URL, data=data, format="json")
        assert response.status_code == 201

        resp_data = response.json()
        assert resp_data["status"] == "APPROVED"
        assert resp_data["reviewed_by"] == "hari_mod"
        assert resp_data["reviewed_at"] is not None

    def test_contributor_auto_approve_returns_403(self, contributor_client):
        """Contributor with auto_approve=True receives 403 Forbidden."""
        data = {**VALID_SUBMIT_DATA, "auto_approve": True}
        response = contributor_client.post(SUBMIT_URL, data=data, format="json")
        assert response.status_code == 403
        assert "auto_approve" in response.json()

        # Verify no queue item was created
        assert NESQueueItem.objects.count() == 0


# ============================================================================
# Unsupported Action Tests
# ============================================================================


@pytest.mark.django_db
class TestUnsupportedActions:
    """Tests for rejection of unsupported actions."""

    def test_create_entity_now_supported(self, contributor_client):
        """CREATE_ENTITY action is now supported and should validate payload."""
        data = {
            "action": "CREATE_ENTITY",
            "payload": {
                "entity_data": {
                    "entity_prefix": "person",
                    "slug": "test-person",
                    "names": [{"kind": "PRIMARY", "en": {"full": "Test Person"}}],
                },
            },
            "change_description": "Creating new entity",
        }
        response = contributor_client.post(SUBMIT_URL, data=data, format="json")
        # Should succeed with 201 (CREATE_ENTITY is now supported)
        assert response.status_code == 201

        # Verify the response contains expected fields
        resp_data = response.json()
        assert "id" in resp_data
        assert resp_data["action"] == "CREATE_ENTITY"
        assert resp_data["status"] == "PENDING"

        # Verify the stored queue item
        item = NESQueueItem.objects.get(pk=resp_data["id"])
        assert item.action == "CREATE_ENTITY"
        assert item.status == QueueStatus.PENDING
        assert item.payload["entity_data"]["entity_prefix"] == "person"

    def test_update_entity_now_supported(self, contributor_client):
        """UPDATE_ENTITY action is supported and creates a queue item."""
        data = {
            "action": "UPDATE_ENTITY",
            "payload": VALID_UPDATE_ENTITY_PAYLOAD,
            "change_description": "Updating entity",
        }
        response = contributor_client.post(SUBMIT_URL, data=data, format="json")
        assert response.status_code == 201

        resp_data = response.json()
        assert resp_data["action"] == "UPDATE_ENTITY"
        assert resp_data["status"] == "PENDING"

        item = NESQueueItem.objects.get(pk=resp_data["id"])
        assert item.action == QueueAction.UPDATE_ENTITY
        assert item.payload == VALID_UPDATE_ENTITY_PAYLOAD

    def test_update_entity_payload_is_canonicalized(self, contributor_client):
        """UPDATE_ENTITY payload is stored in canonical form after validation."""
        data = {
            "action": "UPDATE_ENTITY",
            "payload": {
                "entity_id": "entity:person/sher-bahadur-deuba",
                "patch_ops": [
                    {
                        "op": "ADD",
                        "path": "/tags/-",
                        "value": "tested-via-api",
                    }
                ],
            },
            "change_description": "Updating entity with uppercase patch op",
        }
        response = contributor_client.post(SUBMIT_URL, data=data, format="json")
        assert response.status_code == 201

        item = NESQueueItem.objects.get(pk=response.json()["id"])
        assert item.payload["patch_ops"][0]["op"] == "add"


# ============================================================================
# Payload Validation Tests
# ============================================================================


@pytest.mark.django_db
class TestPayloadValidation:
    """Tests for Pydantic payload validation errors in the view."""

    def test_invalid_entity_id_returns_400(self, contributor_client):
        """Payload with invalid entity_id format returns 400."""
        data = {
            "action": "ADD_NAME",
            "payload": {
                "entity_id": "invalid-id",
                "name": {"kind": "ALIAS", "en": {"full": "Test"}},
            },
            "change_description": "Testing invalid entity ID",
        }
        response = contributor_client.post(SUBMIT_URL, data=data, format="json")
        assert response.status_code == 400
        assert "payload" in response.json()

    def test_missing_name_returns_400(self, contributor_client):
        """Payload missing the name field returns 400."""
        data = {
            "action": "ADD_NAME",
            "payload": {
                "entity_id": "entity:person/sher-bahadur-deuba",
            },
            "change_description": "Testing missing name",
        }
        response = contributor_client.post(SUBMIT_URL, data=data, format="json")
        assert response.status_code == 400
        assert "payload" in response.json()

    def test_missing_entity_id_returns_400(self, contributor_client):
        """Payload missing entity_id returns 400."""
        data = {
            "action": "ADD_NAME",
            "payload": {
                "name": {"kind": "ALIAS", "en": {"full": "Test"}},
            },
            "change_description": "Testing missing entity_id",
        }
        response = contributor_client.post(SUBMIT_URL, data=data, format="json")
        assert response.status_code == 400
        assert "payload" in response.json()

    def test_invalid_name_kind_returns_400(self, contributor_client):
        """Payload with invalid name.kind returns 400."""
        data = {
            "action": "ADD_NAME",
            "payload": {
                "entity_id": "entity:person/sher-bahadur-deuba",
                "name": {"kind": "NICKNAME", "en": {"full": "Test"}},
            },
            "change_description": "Testing invalid name kind",
        }
        response = contributor_client.post(SUBMIT_URL, data=data, format="json")
        assert response.status_code == 400
        assert "payload" in response.json()

    def test_update_entity_blocked_path_returns_400(self, contributor_client):
        """UPDATE_ENTITY rejects immutable path patch requests."""
        data = {
            "action": "UPDATE_ENTITY",
            "payload": {
                "entity_id": "entity:person/sher-bahadur-deuba",
                "patch_ops": [
                    {
                        "op": "replace",
                        "path": "/slug",
                        "value": "new-slug",
                    }
                ],
            },
            "change_description": "Attempting immutable update",
        }
        response = contributor_client.post(SUBMIT_URL, data=data, format="json")
        assert response.status_code == 400
        assert "payload" in response.json()

    def test_name_missing_both_languages_returns_400(self, contributor_client):
        """Payload with name missing both en and ne returns 400."""
        data = {
            "action": "ADD_NAME",
            "payload": {
                "entity_id": "entity:person/sher-bahadur-deuba",
                "name": {"kind": "ALIAS"},
            },
            "change_description": "Testing name without languages",
        }
        response = contributor_client.post(SUBMIT_URL, data=data, format="json")
        assert response.status_code == 400
        assert "payload" in response.json()

    def test_empty_payload_returns_400(self, contributor_client):
        """Empty payload dict returns 400."""
        data = {
            "action": "ADD_NAME",
            "payload": {},
            "change_description": "Testing empty payload",
        }
        response = contributor_client.post(SUBMIT_URL, data=data, format="json")
        assert response.status_code == 400
        assert "payload" in response.json()


# ============================================================================
# DRF Validation Tests (request structure)
# ============================================================================


@pytest.mark.django_db
class TestRequestValidation:
    """Tests for DRF serializer validation errors in the view."""

    def test_missing_action_returns_400(self, contributor_client):
        """Request without action field returns 400."""
        data = {
            "payload": VALID_ADD_NAME_PAYLOAD,
            "change_description": "Missing action",
        }
        response = contributor_client.post(SUBMIT_URL, data=data, format="json")
        assert response.status_code == 400
        assert "action" in response.json()

    def test_missing_payload_returns_400(self, contributor_client):
        """Request without payload field returns 400."""
        data = {
            "action": "ADD_NAME",
            "change_description": "Missing payload",
        }
        response = contributor_client.post(SUBMIT_URL, data=data, format="json")
        assert response.status_code == 400
        assert "payload" in response.json()

    def test_missing_change_description_returns_400(self, contributor_client):
        """Request without change_description field returns 400."""
        data = {
            "action": "ADD_NAME",
            "payload": VALID_ADD_NAME_PAYLOAD,
        }
        response = contributor_client.post(SUBMIT_URL, data=data, format="json")
        assert response.status_code == 400
        assert "change_description" in response.json()

    def test_empty_change_description_returns_400(self, contributor_client):
        """Request with empty change_description returns 400."""
        data = {
            "action": "ADD_NAME",
            "payload": VALID_ADD_NAME_PAYLOAD,
            "change_description": "   ",
        }
        response = contributor_client.post(SUBMIT_URL, data=data, format="json")
        assert response.status_code == 400
        assert "change_description" in response.json()

    def test_empty_body_returns_400(self, contributor_client):
        """Empty request body returns 400 with multiple field errors."""
        response = contributor_client.post(SUBMIT_URL, data={}, format="json")
        assert response.status_code == 400
        errors = response.json()
        assert "action" in errors
        assert "payload" in errors
        assert "change_description" in errors


# ============================================================================
# List My Submissions Tests
# ============================================================================


@pytest.mark.django_db
class TestListMySubmissions:
    """Tests for the GET /api/my_nes_submissions endpoint."""

    def test_unauthenticated_returns_401(self, unauthenticated_client):
        """List endpoint rejects unauthenticated requests."""
        response = unauthenticated_client.get(MY_SUBMISSIONS_URL)
        assert response.status_code == 401

    def test_empty_list(self, contributor_client):
        """Returns empty results when user has no submissions."""
        response = contributor_client.get(MY_SUBMISSIONS_URL)
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 0
        assert data["results"] == []

    def test_returns_own_submissions_only(
        self, contributor_client, admin_client, contributor, admin_user
    ):
        """Each user only sees their own submissions."""
        # Create items for both users
        NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_ADD_NAME_PAYLOAD,
            status=QueueStatus.PENDING,
            submitted_by=contributor,
            change_description="Contributor's item",
        )
        NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_ADD_NAME_PAYLOAD,
            status=QueueStatus.APPROVED,
            submitted_by=admin_user,
            change_description="Admin's item",
        )

        # Contributor sees only their item
        response = contributor_client.get(MY_SUBMISSIONS_URL)
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 1
        assert data["results"][0]["submitted_by"] == "ram_kumar"

        # Admin sees only their item
        response = admin_client.get(MY_SUBMISSIONS_URL)
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 1
        assert data["results"][0]["submitted_by"] == "sita_admin"

    def test_ordered_newest_first(self, contributor_client, contributor):
        """Results are ordered newest-first (descending created_at)."""
        item_1 = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_ADD_NAME_PAYLOAD,
            status=QueueStatus.PENDING,
            submitted_by=contributor,
            change_description="First item",
        )
        item_2 = NESQueueItem.objects.create(
            action=QueueAction.ADD_NAME,
            payload=VALID_ADD_NAME_PAYLOAD,
            status=QueueStatus.PENDING,
            submitted_by=contributor,
            change_description="Second item",
        )

        response = contributor_client.get(MY_SUBMISSIONS_URL)
        assert response.status_code == 200
        results = response.json()["results"]
        assert len(results) == 2
        # Newest first
        assert results[0]["id"] == item_2.pk
        assert results[1]["id"] == item_1.pk

    def test_pagination(self, contributor_client, contributor):
        """Results are paginated when exceeding page_size."""
        # Create 25 items (more than default page_size of 20)
        for i in range(25):
            NESQueueItem.objects.create(
                action=QueueAction.ADD_NAME,
                payload=VALID_ADD_NAME_PAYLOAD,
                status=QueueStatus.PENDING,
                submitted_by=contributor,
                change_description=f"Item {i}",
            )

        # First page
        response = contributor_client.get(MY_SUBMISSIONS_URL)
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 25
        assert len(data["results"]) == 20
        assert data["next"] is not None

        # Second page
        response = contributor_client.get(f"{MY_SUBMISSIONS_URL}?page=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 5
        assert data["previous"] is not None

    def test_custom_page_size(self, contributor_client, contributor):
        """Custom page_size query parameter controls items per page."""
        for i in range(5):
            NESQueueItem.objects.create(
                action=QueueAction.ADD_NAME,
                payload=VALID_ADD_NAME_PAYLOAD,
                status=QueueStatus.PENDING,
                submitted_by=contributor,
                change_description=f"Item {i}",
            )

        response = contributor_client.get(f"{MY_SUBMISSIONS_URL}?page_size=2")
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 5
        assert len(data["results"]) == 2
