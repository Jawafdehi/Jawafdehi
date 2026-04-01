"""
TDD tests for unified entity-case relationship payload in Entity API.

Feature: Entity related cases metadata
Tests that entity endpoints return a single related_cases list with relation_type and notes.
"""

import pytest
from rest_framework.test import APIClient

from cases.models import (
    Case,
    CaseEntityRelationship,
    CaseState,
    JawafEntity,
    RelationshipType,
)


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear cache before each test."""
    from django.core.cache import cache

    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
def test_entity_detail_includes_related_cases_field():
    """Entity detail should include unified related_cases list."""
    entity = JawafEntity.objects.create(nes_id="entity:person/test-person")

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert "related_cases" in response.data
    assert response.data["related_cases"] == []


@pytest.mark.django_db
def test_entity_detail_related_cases_returns_relation_type_and_notes():
    """Each related_cases entry should expose case id, relation type, and notes."""
    entity = JawafEntity.objects.create(nes_id="entity:person/test-person")
    case = Case.objects.create(
        case_id="case-001",
        state=CaseState.PUBLISHED,
        title="Test Case",
        description="Test description",
    )

    CaseEntityRelationship.objects.create(
        case=case,
        entity=entity,
        relationship_type=RelationshipType.ACCUSED,
        notes="Named in CIAA filing",
    )

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert response.data["related_cases"] == [
        {
            "case_id": case.id,
            "relation_type": RelationshipType.ACCUSED,
            "notes": "Named in CIAA filing",
        }
    ]


@pytest.mark.django_db
def test_entity_detail_includes_multiple_relationship_types_for_same_case():
    """A case can appear multiple times when relation types differ."""
    entity = JawafEntity.objects.create(nes_id="entity:person/test-person")
    case = Case.objects.create(
        case_id="case-001",
        state=CaseState.PUBLISHED,
        title="Test Case",
        description="Test description",
    )

    CaseEntityRelationship.objects.create(
        case=case,
        entity=entity,
        relationship_type=RelationshipType.ACCUSED,
        notes="Primary accused",
    )
    CaseEntityRelationship.objects.create(
        case=case,
        entity=entity,
        relationship_type=RelationshipType.RELATED,
        notes="Also linked via procurement committee",
    )

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert len(response.data["related_cases"]) == 2
    assert {
        "case_id": case.id,
        "relation_type": RelationshipType.ACCUSED,
        "notes": "Primary accused",
    } in response.data["related_cases"]
    assert {
        "case_id": case.id,
        "relation_type": RelationshipType.RELATED,
        "notes": "Also linked via procurement committee",
    } in response.data["related_cases"]


@pytest.mark.django_db
def test_entity_detail_excludes_non_published_case_relationships():
    """Only relationships from published cases should be returned."""
    entity = JawafEntity.objects.create(nes_id="entity:person/test-person")

    published_case = Case.objects.create(
        case_id="case-001",
        state=CaseState.PUBLISHED,
        title="Published Case",
        description="Test",
    )
    draft_case = Case.objects.create(
        case_id="case-002",
        state=CaseState.DRAFT,
        title="Draft Case",
        description="Test",
    )

    CaseEntityRelationship.objects.create(
        case=published_case,
        entity=entity,
        relationship_type=RelationshipType.RELATED,
    )
    CaseEntityRelationship.objects.create(
        case=draft_case,
        entity=entity,
        relationship_type=RelationshipType.ACCUSED,
    )

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert response.data["related_cases"] == [
        {
            "case_id": published_case.id,
            "relation_type": RelationshipType.RELATED,
            "notes": "",
        }
    ]


@pytest.mark.django_db
def test_entity_list_includes_unified_related_cases_field():
    """Entity list endpoint should include the same related_cases structure."""
    entity = JawafEntity.objects.create(nes_id="entity:person/test-person")
    case = Case.objects.create(
        case_id="case-001",
        state=CaseState.PUBLISHED,
        title="Test Case",
        description="Test description",
    )
    CaseEntityRelationship.objects.create(
        case=case,
        entity=entity,
        relationship_type=RelationshipType.WITNESS,
        notes="Appeared during committee hearing",
    )

    client = APIClient()
    response = client.get("/api/entities/")

    assert response.status_code == 200
    entity_data = next(item for item in response.data["results"] if item["id"] == entity.id)

    assert entity_data["related_cases"] == [
        {
            "case_id": case.id,
            "relation_type": RelationshipType.WITNESS,
            "notes": "Appeared during committee hearing",
        }
    ]
