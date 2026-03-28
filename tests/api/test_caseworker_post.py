"""Tests for POST /api/cases/ draft creation endpoint."""

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

URL = "/api/cases/"


def _authed_client(user):
    token, _ = Token.objects.get_or_create(user=user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


@pytest.mark.django_db
def test_post_requires_authentication():
    response = APIClient().post(
        URL,
        data={"title": "Unauthorized case", "case_type": CaseType.CORRUPTION},
        format="json",
    )

    assert response.status_code == 401


@pytest.mark.django_db
def test_post_creates_draft_and_assigns_creator():
    user = create_user_with_role("ashok", "ashok@example.com", "Contributor")

    response = _authed_client(user).post(
        URL,
        data={
            "title": "Procurement irregularity",
            "case_type": CaseType.CORRUPTION,
            "short_description": "Initial draft",
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["title"] == "Procurement irregularity"
    assert response.data["state"] == CaseState.DRAFT
    assert response.data["case_type"] == CaseType.CORRUPTION
    assert response.data["case_id"].startswith("case-")

    case = Case.objects.get(pk=response.data["id"])
    assert case.state == CaseState.DRAFT
    assert case.contributors.filter(pk=user.pk).exists()


@pytest.mark.django_db
def test_post_creates_case_with_entity_relationships():
    user = create_user_with_role("bina", "bina@example.com", "Contributor")
    alleged = JawafEntity.objects.create(display_name="Prachanda")
    related = JawafEntity.objects.create(display_name="Kathmandu Metropolitan City")
    location = JawafEntity.objects.create(nes_id="entity:location/district/kathmandu")

    response = _authed_client(user).post(
        URL,
        data={
            "title": "Land use concern",
            "case_type": CaseType.CORRUPTION,
            "alleged_entities": [alleged.pk],
            "related_entities": [related.pk, location.pk],
        },
        format="json",
    )

    assert response.status_code == 201
    alleged_ids = [e["id"] for e in response.data["entities"] if e["type"] == "accused"]
    related_ids = [e["id"] for e in response.data["entities"] if e["type"] == "related"]
    assert alleged_ids == [alleged.pk]
    assert set(related_ids) == {related.pk, location.pk}
    assert CaseEntityRelationship.objects.filter(
        case_id=response.data["id"],
        entity=alleged,
        relationship_type=RelationshipType.ACCUSED,
    ).exists()


@pytest.mark.django_db
def test_post_rejects_non_draft_state():
    user = create_user_with_role("chandra", "chandra@example.com", "Contributor")

    response = _authed_client(user).post(
        URL,
        data={
            "title": "Should fail",
            "case_type": CaseType.CORRUPTION,
            "state": CaseState.PUBLISHED,
            "description": "Complete description",
            "key_allegations": ["An allegation"],
        },
        format="json",
    )

    assert response.status_code == 422
    assert "state" in response.data
    assert Case.objects.count() == 0


@pytest.mark.django_db
def test_post_rejects_client_supplied_contributors_field():
    user = create_user_with_role("dipa", "dipa@example.com", "Contributor")

    response = _authed_client(user).post(
        URL,
        data={
            "title": "Should not accept contributors",
            "case_type": CaseType.CORRUPTION,
            "contributors": [999],
        },
        format="json",
    )

    assert response.status_code == 422
    assert Case.objects.count() == 0


@pytest.mark.django_db
def test_post_rejects_array_payload():
    """Test that POST with array payload returns 422 with clear error message."""
    user = create_user_with_role("eshwar", "eshwar@example.com", "Contributor")

    response = _authed_client(user).post(
        URL,
        data=[
            {"title": "First case", "case_type": CaseType.CORRUPTION},
            {"title": "Second case", "case_type": CaseType.CORRUPTION},
        ],
        format="json",
    )

    assert response.status_code == 422
    assert "detail" in response.data
    assert response.data["detail"] == "Request body must be a JSON object."
    assert Case.objects.count() == 0
