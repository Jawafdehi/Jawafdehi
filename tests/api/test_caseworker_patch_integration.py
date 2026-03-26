"""
Integration tests for the caseworker PATCH API.

These tests validate end-to-end behavior with realistic case state,
multiple patch operations, permissions, and persistence guarantees.
"""

import pytest

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

URL = "/api/cases/{}/"


def _make_case(**kwargs):
    defaults = {
        "title": "Nagarik Land Irregularity",
        "case_type": CaseType.CORRUPTION,
        "state": CaseState.DRAFT,
        "short_description": "Initial short description",
        "description": "Initial long description",
        "tags": ["land", "procurement"],
        "key_allegations": ["Initial allegation"],
        "timeline": [
            {"date": "2024-01-01", "title": "Complaint lodged"},
            {"date": "2024-02-10", "title": "Inquiry opened"},
        ],
        "evidence": [{"source_id": "src-old", "description": "Old file"}],
    }
    defaults.update(kwargs)
    return Case.objects.create(**defaults)


def _authed_client(user):
    token, _ = Token.objects.get_or_create(user=user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


@pytest.mark.django_db
def test_patch_multi_operation_end_to_end_persists_all_changes():
    user = create_user_with_role("sarita", "sarita@example.com", "Contributor")
    case = _make_case()
    case.contributors.add(user)

    alleged_1 = JawafEntity.objects.create(display_name="Sushil Adhikari")
    alleged_2 = JawafEntity.objects.create(display_name="Maya Gurung")
    related = JawafEntity.objects.create(display_name="Kathmandu Metropolitan City")
    location = JawafEntity.objects.create(nes_id="entity:location/district/kathmandu")

    patch_ops = [
        {"op": "replace", "path": "/title", "value": "Updated accountability case"},
        {"op": "replace", "path": "/tags", "value": ["public-fund", "audit"]},
        {
            "op": "replace",
            "path": "/evidence",
            "value": [{"source_id": "src-2026", "description": "Audit report"}],
        },
        {
            "op": "add",
            "path": "/timeline/-",
            "value": {"date": "2024-03-15", "title": "Hearing scheduled"},
        },
        {
            "op": "replace",
            "path": "/alleged_entity_ids",
            "value": [alleged_1.id, alleged_2.id],
        },
        {
            "op": "replace",
            "path": "/related_entity_ids",
            "value": [related.id, location.id],
        },
    ]

    response = _authed_client(user).patch(
        URL.format(case.id), data=patch_ops, format="json"
    )

    assert response.status_code == 200
    assert response.data["title"] == "Updated accountability case"
    assert response.data["tags"] == ["public-fund", "audit"]
    assert response.data["timeline"][-1]["title"] == "Hearing scheduled"
    assert response.data["evidence"] == [
        {"source_id": "src-2026", "description": "Audit report"}
    ]

    case.refresh_from_db()
    assert case.title == "Updated accountability case"
    assert case.tags == ["public-fund", "audit"]
    assert case.timeline[-1]["title"] == "Hearing scheduled"
    assert set(
        CaseEntityRelationship.objects.filter(
            case=case,
            relationship_type=RelationshipType.ALLEGED,
        ).values_list("entity_id", flat=True)
    ) == {
        alleged_1.id,
        alleged_2.id,
    }
    assert set(
        CaseEntityRelationship.objects.filter(
            case=case,
            relationship_type=RelationshipType.RELATED,
        ).values_list("entity_id", flat=True)
    ) == {related.id, location.id}


@pytest.mark.django_db
def test_patch_rejects_blocked_path_in_multi_op_without_partial_write():
    user = create_user_with_role("dipesh", "dipesh@example.com", "Contributor")
    case = _make_case(title="Original title")
    case.contributors.add(user)

    patch_ops = [
        {"op": "replace", "path": "/title", "value": "Should not persist"},
        {"op": "replace", "path": "/state", "value": "PUBLISHED"},
    ]

    response = _authed_client(user).patch(
        URL.format(case.id), data=patch_ops, format="json"
    )

    assert response.status_code == 422
    case.refresh_from_db()
    assert case.title == "Original title"
    assert case.state == CaseState.DRAFT


@pytest.mark.django_db
def test_admin_can_patch_without_assignment():
    admin = create_user_with_role("rekha", "rekha@example.com", "Admin")
    case = _make_case(title="Case before admin edit")

    patch_ops = [{"op": "replace", "path": "/title", "value": "Edited by admin"}]
    response = _authed_client(admin).patch(
        URL.format(case.id), data=patch_ops, format="json"
    )

    assert response.status_code == 200
    case.refresh_from_db()
    assert case.title == "Edited by admin"


@pytest.mark.django_db
def test_invalid_post_patch_payload_produces_422_and_no_persistence():
    user = create_user_with_role("anup", "anup@example.com", "Contributor")
    case = _make_case(title="Stable title")
    case.contributors.add(user)

    patch_ops = [
        {"op": "replace", "path": "/title", "value": "Transient title"},
        {"op": "replace", "path": "/timeline/0/date", "value": "not-a-date"},
    ]

    response = _authed_client(user).patch(
        URL.format(case.id), data=patch_ops, format="json"
    )

    assert response.status_code == 422
    case.refresh_from_db()
    assert case.title == "Stable title"
    assert case.timeline[0]["date"] == "2024-01-01"
