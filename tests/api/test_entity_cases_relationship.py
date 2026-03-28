"""
TDD tests for entity-cases relationship in Entity API.

Feature: Entity Cases Relationship
Tests that entity detail endpoint returns alleged_cases and related_cases lists.
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


# ============================================================================
# Basic Functionality Tests
# ============================================================================


@pytest.mark.django_db
def test_entity_detail_includes_alleged_cases_field():
    """Test that entity detail response includes alleged_cases field."""
    entity = JawafEntity.objects.create(nes_id="entity:person/test-person")

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert "alleged_cases" in response.data


@pytest.mark.django_db
def test_entity_detail_includes_related_cases_field():
    """Test that entity detail response includes related_cases field."""
    entity = JawafEntity.objects.create(nes_id="entity:person/test-person")

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert "related_cases" in response.data


@pytest.mark.django_db
def test_entity_with_no_cases_returns_empty_lists():
    """Test that entity with no cases returns empty lists."""
    entity = JawafEntity.objects.create(nes_id="entity:person/test-person")

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert response.data["alleged_cases"] == []
    assert response.data["related_cases"] == []


# ============================================================================
# Alleged Cases Tests
# ============================================================================


@pytest.mark.django_db
def test_entity_alleged_in_published_case():
    """Test that entity shows case ID when alleged in published case."""
    entity = JawafEntity.objects.create(nes_id="entity:person/accused")

    case = Case.objects.create(
        case_id="case-001",
        state=CaseState.PUBLISHED,
        title="Test Case",
        description="Test description",
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity, relationship_type=RelationshipType.ACCUSED
    )

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert case.id in response.data["alleged_cases"]
    assert len(response.data["alleged_cases"]) == 1


@pytest.mark.django_db
def test_entity_alleged_in_multiple_published_cases():
    """Test that entity shows all case IDs when alleged in multiple cases."""
    entity = JawafEntity.objects.create(nes_id="entity:person/accused")

    case1 = Case.objects.create(
        case_id="case-001",
        state=CaseState.PUBLISHED,
        title="Case 1",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case1, entity=entity, relationship_type=RelationshipType.ACCUSED
    )

    case2 = Case.objects.create(
        case_id="case-002",
        state=CaseState.PUBLISHED,
        title="Case 2",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case2, entity=entity, relationship_type=RelationshipType.ACCUSED
    )

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert case1.id in response.data["alleged_cases"]
    assert case2.id in response.data["alleged_cases"]
    assert len(response.data["alleged_cases"]) == 2


@pytest.mark.django_db
def test_entity_alleged_in_draft_case_not_included():
    """Test that draft cases are not included in alleged_cases."""
    entity = JawafEntity.objects.create(nes_id="entity:person/accused")

    case = Case.objects.create(
        case_id="case-001",
        state=CaseState.DRAFT,
        title="Draft Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity, relationship_type=RelationshipType.ACCUSED
    )

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert response.data["alleged_cases"] == []


@pytest.mark.django_db
def test_entity_alleged_in_closed_case_not_included():
    """Test that closed cases are not included in alleged_cases."""
    entity = JawafEntity.objects.create(nes_id="entity:person/accused")

    case = Case.objects.create(
        case_id="case-001",
        state=CaseState.CLOSED,
        title="Closed Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity, relationship_type=RelationshipType.ACCUSED
    )

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert response.data["alleged_cases"] == []


# ============================================================================
# Related Cases Tests
# ============================================================================


@pytest.mark.django_db
def test_entity_related_in_published_case():
    """Test that entity shows case ID when related in published case."""
    entity = JawafEntity.objects.create(nes_id="entity:person/related")

    case = Case.objects.create(
        case_id="case-001",
        state=CaseState.PUBLISHED,
        title="Test Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity, relationship_type=RelationshipType.RELATED
    )

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert case.id in response.data["related_cases"]
    assert len(response.data["related_cases"]) == 1


@pytest.mark.django_db
def test_entity_location_in_published_case():
    """Test that location entities linked as related appear in related_cases."""
    entity = JawafEntity.objects.create(nes_id="entity:location/kathmandu")

    case = Case.objects.create(
        case_id="case-001",
        state=CaseState.PUBLISHED,
        title="Test Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity, relationship_type=RelationshipType.RELATED
    )

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert case.id in response.data["related_cases"]
    assert len(response.data["related_cases"]) == 1


@pytest.mark.django_db
def test_entity_related_and_location_in_same_case():
    """Test that duplicate related links do not duplicate case IDs in response."""
    entity = JawafEntity.objects.create(nes_id="entity:organization/test-org")

    case = Case.objects.create(
        case_id="case-001",
        state=CaseState.PUBLISHED,
        title="Test Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity, relationship_type=RelationshipType.RELATED
    )
    CaseEntityRelationship.objects.get_or_create(
        case=case, entity=entity, relationship_type=RelationshipType.RELATED
    )

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    # Should appear only once even though in both fields
    assert response.data["related_cases"].count(case.id) == 1


@pytest.mark.django_db
def test_entity_related_in_draft_case_not_included():
    """Test that draft cases are not included in related_cases."""
    entity = JawafEntity.objects.create(nes_id="entity:person/related")

    case = Case.objects.create(
        case_id="case-001",
        state=CaseState.DRAFT,
        title="Draft Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity, relationship_type=RelationshipType.RELATED
    )

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert response.data["related_cases"] == []


# ============================================================================
# Alleged vs Related Separation Tests
# ============================================================================


@pytest.mark.django_db
def test_entity_alleged_not_in_related_cases():
    """Test that alleged cases don't appear in related_cases."""
    entity = JawafEntity.objects.create(nes_id="entity:person/test")

    case = Case.objects.create(
        case_id="case-001",
        state=CaseState.PUBLISHED,
        title="Test Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity, relationship_type=RelationshipType.ACCUSED
    )

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert case.id in response.data["alleged_cases"]
    assert case.id not in response.data["related_cases"]


@pytest.mark.django_db
def test_entity_both_alleged_and_related_in_same_case():
    """Test that case appears only in alleged_cases when entity is both alleged and related."""
    entity = JawafEntity.objects.create(nes_id="entity:person/test")

    case = Case.objects.create(
        case_id="case-001",
        state=CaseState.PUBLISHED,
        title="Test Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity, relationship_type=RelationshipType.ACCUSED
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity, relationship_type=RelationshipType.RELATED
    )

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert case.id in response.data["alleged_cases"]
    assert case.id not in response.data["related_cases"]


@pytest.mark.django_db
def test_entity_both_alleged_and_location_in_same_case():
    """Test that case appears only in alleged_cases when entity is both alleged and related."""
    entity = JawafEntity.objects.create(nes_id="entity:location/test")

    case = Case.objects.create(
        case_id="case-001",
        state=CaseState.PUBLISHED,
        title="Test Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity, relationship_type=RelationshipType.ACCUSED
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity, relationship_type=RelationshipType.RELATED
    )

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert case.id in response.data["alleged_cases"]
    assert case.id not in response.data["related_cases"]


# ============================================================================
# Complex Scenarios
# ============================================================================


@pytest.mark.django_db
def test_entity_in_multiple_cases_with_different_roles():
    """Test entity appearing in different roles across multiple cases."""
    entity = JawafEntity.objects.create(nes_id="entity:person/test")

    # Case 1: Entity is alleged
    case1 = Case.objects.create(
        case_id="case-001",
        state=CaseState.PUBLISHED,
        title="Case 1",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case1, entity=entity, relationship_type=RelationshipType.ACCUSED
    )

    # Case 2: Entity is related
    case2 = Case.objects.create(
        case_id="case-002",
        state=CaseState.PUBLISHED,
        title="Case 2",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case2, entity=entity, relationship_type=RelationshipType.RELATED
    )

    # Case 3: Entity is related again
    case3 = Case.objects.create(
        case_id="case-003",
        state=CaseState.PUBLISHED,
        title="Case 3",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case3, entity=entity, relationship_type=RelationshipType.RELATED
    )

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert case1.id in response.data["alleged_cases"]
    assert case2.id in response.data["related_cases"]
    assert case3.id in response.data["related_cases"]
    assert len(response.data["alleged_cases"]) == 1
    assert len(response.data["related_cases"]) == 2


@pytest.mark.django_db
def test_entity_with_mix_of_published_and_draft_cases():
    """Test that only published cases appear in the lists."""
    entity = JawafEntity.objects.create(nes_id="entity:person/test")

    # Published case
    published_case = Case.objects.create(
        case_id="case-published",
        state=CaseState.PUBLISHED,
        title="Published Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=published_case, entity=entity, relationship_type=RelationshipType.ACCUSED
    )

    # Draft case
    draft_case = Case.objects.create(
        case_id="case-draft",
        state=CaseState.DRAFT,
        title="Draft Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=draft_case, entity=entity, relationship_type=RelationshipType.ACCUSED
    )

    # Closed case
    closed_case = Case.objects.create(
        case_id="case-closed",
        state=CaseState.CLOSED,
        title="Closed Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=closed_case, entity=entity, relationship_type=RelationshipType.RELATED
    )

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert published_case.id in response.data["alleged_cases"]
    assert draft_case.id not in response.data["alleged_cases"]
    assert closed_case.id not in response.data["related_cases"]
    assert len(response.data["alleged_cases"]) == 1
    assert len(response.data["related_cases"]) == 0


@pytest.mark.django_db
def test_in_review_cases_excluded_from_entity_detail_case_lists():
    """Test that IN_REVIEW cases are excluded from related case lists."""

    entity = JawafEntity.objects.create(nes_id="entity:person/test")

    case = Case.objects.create(
        case_id="case-001",
        state=CaseState.IN_REVIEW,
        title="In Review Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity, relationship_type=RelationshipType.ACCUSED
    )

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert case.id not in response.data["alleged_cases"]
    assert response.data["alleged_cases"] == []


# ============================================================================
# Data Type Tests
# ============================================================================


@pytest.mark.django_db
def test_alleged_cases_is_list_of_integers():
    """Test that alleged_cases returns a list of integer IDs."""
    entity = JawafEntity.objects.create(nes_id="entity:person/test")

    case = Case.objects.create(
        case_id="case-001",
        state=CaseState.PUBLISHED,
        title="Test Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity, relationship_type=RelationshipType.ACCUSED
    )

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert isinstance(response.data["alleged_cases"], list)
    assert all(isinstance(case_id, int) for case_id in response.data["alleged_cases"])


@pytest.mark.django_db
def test_related_cases_is_list_of_integers():
    """Test that related_cases returns a list of integer IDs."""
    entity = JawafEntity.objects.create(nes_id="entity:person/test")

    case = Case.objects.create(
        case_id="case-001",
        state=CaseState.PUBLISHED,
        title="Test Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity, relationship_type=RelationshipType.RELATED
    )

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert isinstance(response.data["related_cases"], list)
    assert all(isinstance(case_id, int) for case_id in response.data["related_cases"])


# ============================================================================
# List Endpoint Tests
# ============================================================================


@pytest.mark.django_db
def test_entity_list_includes_case_fields():
    """Test that entity list endpoint includes alleged_cases and related_cases fields."""
    entity = JawafEntity.objects.create(nes_id="entity:person/test")

    case = Case.objects.create(
        case_id="case-001",
        state=CaseState.PUBLISHED,
        title="Test Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity, relationship_type=RelationshipType.ACCUSED
    )

    client = APIClient()
    response = client.get("/api/entities/")

    assert response.status_code == 200
    assert len(response.data["results"]) > 0

    entity_data = next(e for e in response.data["results"] if e["id"] == entity.id)
    assert "alleged_cases" in entity_data
    assert "related_cases" in entity_data


@pytest.mark.django_db
def test_entity_list_shows_correct_case_ids():
    """Test that entity list shows correct case IDs for each entity."""
    entity = JawafEntity.objects.create(nes_id="entity:person/test")

    # Alleged case
    case1 = Case.objects.create(
        case_id="case-001",
        state=CaseState.PUBLISHED,
        title="Alleged Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case1, entity=entity, relationship_type=RelationshipType.ACCUSED
    )

    # Related case
    case2 = Case.objects.create(
        case_id="case-002",
        state=CaseState.PUBLISHED,
        title="Related Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case2, entity=entity, relationship_type=RelationshipType.RELATED
    )

    client = APIClient()
    response = client.get("/api/entities/")

    assert response.status_code == 200
    entity_data = next(e for e in response.data["results"] if e["id"] == entity.id)

    assert case1.id in entity_data["alleged_cases"]
    assert case2.id in entity_data["related_cases"]
    assert len(entity_data["alleged_cases"]) == 1
    assert len(entity_data["related_cases"]) == 1
