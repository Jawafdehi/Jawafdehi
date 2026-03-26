"""
Tests for PATCH /api/cases/{id}/ (RFC 6902 JSON Patch endpoint).
"""

import pytest

from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from cases.models import (
    Case,
    CaseEntityRelationship,
    CaseState,
    CaseType,
    JawafEntity,
    RelationshipType,
)
from tests.conftest import create_user_with_role

User = get_user_model()

URL = "/api/cases/{}/"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_case(**kwargs) -> Case:
    defaults = dict(
        title="Test case",
        case_type=CaseType.CORRUPTION,
        state=CaseState.DRAFT,
        description="Some description",
        short_description="Short",
        timeline=[{"date": "2024-01-01", "title": "Event one"}],
        evidence=[],
    )
    defaults.update(kwargs)
    return Case.objects.create(**defaults)


def _authed_client(user) -> APIClient:
    token, _ = Token.objects.get_or_create(user=user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


def _contributor(name="rishi") -> User:
    return create_user_with_role(name, f"{name}@example.com", "Contributor")


# ---------------------------------------------------------------------------
# Auth / permission tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_patch_requires_authentication():
    case = _make_case()
    client = APIClient()
    response = client.patch(
        URL.format(case.pk),
        data=[{"op": "replace", "path": "/title", "value": "New"}],
        format="json",
    )
    assert response.status_code == 401


@pytest.mark.django_db
def test_patch_returns_403_for_unassigned_contributor():
    case = _make_case()
    user = _contributor("sunita")
    client = _authed_client(user)
    response = client.patch(
        URL.format(case.pk),
        data=[{"op": "replace", "path": "/title", "value": "Hacked"}],
        format="json",
    )
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# Successful patch operations
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_patch_replace_scalar_field():
    user = _contributor("hari")
    case = _make_case()
    case.contributors.add(user)

    client = _authed_client(user)
    response = client.patch(
        URL.format(case.pk),
        data=[{"op": "replace", "path": "/title", "value": "Updated title"}],
        format="json",
    )
    assert response.status_code == 200
    assert response.data["title"] == "Updated title"
    case.refresh_from_db()
    assert case.title == "Updated title"


@pytest.mark.django_db
def test_patch_replace_timeline_item_title():
    user = _contributor("sita")
    case = _make_case(
        timeline=[
            {"date": "2024-01-01", "title": "First event"},
            {"date": "2024-02-01", "title": "Second event"},
        ]
    )
    case.contributors.add(user)

    client = _authed_client(user)
    response = client.patch(
        URL.format(case.pk),
        data=[{"op": "replace", "path": "/timeline/0/title", "value": "Renamed"}],
        format="json",
    )
    assert response.status_code == 200
    timeline = response.data["timeline"]
    assert timeline[0]["title"] == "Renamed"
    assert timeline[1]["title"] == "Second event"


@pytest.mark.django_db
def test_patch_add_appends_timeline_item():
    user = _contributor("ram")
    case = _make_case(timeline=[{"date": "2024-01-01", "title": "First"}])
    case.contributors.add(user)

    new_item = {"date": "2025-03-15", "title": "New event", "description": "Details"}
    client = _authed_client(user)
    response = client.patch(
        URL.format(case.pk),
        data=[{"op": "add", "path": "/timeline/-", "value": new_item}],
        format="json",
    )
    assert response.status_code == 200
    assert len(response.data["timeline"]) == 2
    assert response.data["timeline"][-1]["title"] == "New event"


@pytest.mark.django_db
def test_patch_remove_timeline_item():
    user = _contributor("gita")
    case = _make_case(
        timeline=[
            {"date": "2024-01-01", "title": "Keep"},
            {"date": "2024-02-01", "title": "Remove me"},
        ]
    )
    case.contributors.add(user)

    client = _authed_client(user)
    response = client.patch(
        URL.format(case.pk),
        data=[{"op": "remove", "path": "/timeline/1"}],
        format="json",
    )
    assert response.status_code == 200
    timeline = response.data["timeline"]
    assert len(timeline) == 1
    assert timeline[0]["title"] == "Keep"


@pytest.mark.django_db
def test_patch_replace_alleged_entity_ids():
    user = _contributor("kiran")
    case = _make_case()
    case.contributors.add(user)
    entity = JawafEntity.objects.create(display_name="Prachanda")

    client = _authed_client(user)
    response = client.patch(
        URL.format(case.pk),
        data=[{"op": "replace", "path": "/alleged_entity_ids", "value": [entity.pk]}],
        format="json",
    )
    assert response.status_code == 200
    alleged_ids = [
        e["id"]
        for e in response.data["entities"]
        if e["type"] == RelationshipType.ALLEGED
    ]
    assert entity.pk in alleged_ids
    case.refresh_from_db()
    assert CaseEntityRelationship.objects.filter(
        case=case, entity=entity, relationship_type=RelationshipType.ALLEGED
    ).exists()


@pytest.mark.django_db
def test_patch_replace_evidence_list():
    user = _contributor("bikash")
    case = _make_case()
    case.contributors.add(user)
    new_evidence = [{"source_id": "src-001", "description": "Key document"}]

    client = _authed_client(user)
    response = client.patch(
        URL.format(case.pk),
        data=[{"op": "replace", "path": "/evidence", "value": new_evidence}],
        format="json",
    )
    assert response.status_code == 200
    assert response.data["evidence"] == new_evidence
    case.refresh_from_db()
    assert case.evidence == new_evidence


# ---------------------------------------------------------------------------
# Error cases
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_patch_400_for_malformed_patch_body():
    user = _contributor("sabita")
    case = _make_case()
    case.contributors.add(user)

    client = _authed_client(user)
    # Send a dict instead of a list — invalid RFC 6902
    response = client.patch(
        URL.format(case.pk),
        data={"op": "replace", "path": "/title", "value": "x"},
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_patch_400_for_invalid_json_patch_operation():
    user = _contributor("manish")
    case = _make_case()
    case.contributors.add(user)

    client = _authed_client(user)
    # Reference a path index that doesn't exist
    response = client.patch(
        URL.format(case.pk),
        data=[{"op": "remove", "path": "/timeline/99"}],
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_patch_422_for_blocked_path_state():
    user = _contributor("deepak")
    case = _make_case()
    case.contributors.add(user)

    client = _authed_client(user)
    response = client.patch(
        URL.format(case.pk),
        data=[{"op": "replace", "path": "/state", "value": "PUBLISHED"}],
        format="json",
    )
    assert response.status_code == 422


@pytest.mark.django_db
def test_patch_422_for_blocked_path_case_id():
    user = _contributor("priya")
    case = _make_case()
    case.contributors.add(user)

    client = _authed_client(user)
    response = client.patch(
        URL.format(case.pk),
        data=[{"op": "replace", "path": "/case_id", "value": "case-tampered"}],
        format="json",
    )
    assert response.status_code == 422


@pytest.mark.django_db
def test_patch_422_for_blocked_path_case_type():
    user = _contributor("nisha")
    case = _make_case(case_type=CaseType.CORRUPTION)
    case.contributors.add(user)

    client = _authed_client(user)
    response = client.patch(
        URL.format(case.pk),
        data=[{"op": "replace", "path": "/case_type", "value": "PROMISES"}],
        format="json",
    )
    assert response.status_code == 422
    case.refresh_from_db()
    assert case.case_type == CaseType.CORRUPTION


@pytest.mark.django_db
def test_patch_422_for_nonexistent_entity_id():
    user = _contributor("anjali")
    case = _make_case()
    case.contributors.add(user)

    client = _authed_client(user)
    response = client.patch(
        URL.format(case.pk),
        data=[{"op": "replace", "path": "/alleged_entity_ids", "value": [999999]}],
        format="json",
    )
    assert response.status_code == 422
