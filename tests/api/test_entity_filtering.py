"""
Tests for entity filtering by case association.

Feature: Entity API should only return entities associated with published cases
Tests that entities appear in alleged_entities or related_entities of published cases
"""

import pytest
from django.core.cache import cache
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
    cache.clear()
    yield
    cache.clear()


# ============================================================================
# Entity Filtering Tests
# ============================================================================


@pytest.mark.django_db
def test_entity_list_only_returns_entities_in_published_cases():
    """Test that only entities associated with published cases are returned."""
    # Create entities
    entity_in_published = JawafEntity.objects.create(
        nes_id="entity:person/in-published"
    )
    entity_in_draft = JawafEntity.objects.create(nes_id="entity:person/in-draft")
    entity_not_in_cases = JawafEntity.objects.create(
        nes_id="entity:person/not-in-cases"
    )

    # Create published case with entity
    published_case = Case.objects.create(
        case_id="case-001",
        state=CaseState.PUBLISHED,
        title="Published Case",
        description="Test case",
    )
    CaseEntityRelationship.objects.create(
        case=published_case,
        entity=entity_in_published,
        relationship_type=RelationshipType.ALLEGED,
    )

    # Create draft case with entity
    draft_case = Case.objects.create(
        case_id="case-002",
        state=CaseState.DRAFT,
        title="Draft Case",
        description="Test case",
    )
    CaseEntityRelationship.objects.create(
        case=draft_case,
        entity=entity_in_draft,
        relationship_type=RelationshipType.ALLEGED,
    )

    client = APIClient()
    response = client.get("/api/entities/")

    assert response.status_code == 200

    # Extract entity IDs from response
    entity_ids = [e["id"] for e in response.data["results"]]

    # Only entity in published case should be returned
    assert entity_in_published.id in entity_ids
    assert entity_in_draft.id not in entity_ids
    assert entity_not_in_cases.id not in entity_ids


@pytest.mark.django_db
def test_entity_in_alleged_entities_is_returned():
    """Test that entities in alleged_entities are returned."""
    entity = JawafEntity.objects.create(nes_id="entity:person/alleged")

    case = Case.objects.create(
        case_id="case-001",
        state=CaseState.PUBLISHED,
        title="Test Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity, relationship_type=RelationshipType.ALLEGED
    )

    client = APIClient()
    response = client.get("/api/entities/")

    assert response.status_code == 200
    entity_ids = [e["id"] for e in response.data["results"]]
    assert entity.id in entity_ids


@pytest.mark.django_db
def test_entity_in_related_entities_is_returned():
    """Test that entities in related_entities are returned."""
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
    response = client.get("/api/entities/")

    assert response.status_code == 200
    entity_ids = [e["id"] for e in response.data["results"]]
    assert entity.id in entity_ids


@pytest.mark.django_db
def test_entity_in_locations_is_not_returned():
    """Test that entities in locations are NOT returned."""
    entity = JawafEntity.objects.create(nes_id="entity:location/test-location")

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
    response = client.get("/api/entities/")

    assert response.status_code == 200
    entity_ids = [e["id"] for e in response.data["results"]]
    assert entity.id not in entity_ids


@pytest.mark.django_db
def test_entity_in_multiple_cases_appears_once():
    """Test that entity appearing in multiple cases is returned only once."""
    entity = JawafEntity.objects.create(nes_id="entity:person/multi-case")

    # Create multiple published cases with same entity
    for i in range(3):
        case = Case.objects.create(
            case_id=f"case-00{i}",
            state=CaseState.PUBLISHED,
            title=f"Case {i}",
            description="Test",
        )
        CaseEntityRelationship.objects.create(
            case=case, entity=entity, relationship_type=RelationshipType.ALLEGED
        )

    client = APIClient()
    response = client.get("/api/entities/")

    assert response.status_code == 200

    # Count how many times entity appears
    entity_count = sum(1 for e in response.data["results"] if e["id"] == entity.id)
    assert entity_count == 1


@pytest.mark.django_db
def test_entity_in_both_alleged_and_related_appears_once():
    """Test that entity in both alleged and related appears only once."""
    entity = JawafEntity.objects.create(nes_id="entity:person/both")

    case = Case.objects.create(
        case_id="case-001",
        state=CaseState.PUBLISHED,
        title="Test Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity, relationship_type=RelationshipType.ALLEGED
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity, relationship_type=RelationshipType.RELATED
    )

    client = APIClient()
    response = client.get("/api/entities/")

    assert response.status_code == 200

    # Count how many times entity appears
    entity_count = sum(1 for e in response.data["results"] if e["id"] == entity.id)
    assert entity_count == 1


@pytest.mark.django_db
def test_entity_list_excludes_in_review_cases():
    """Test that IN_REVIEW cases are excluded from public entity list."""

    entity_in_review = JawafEntity.objects.create(nes_id="entity:person/in-review")
    entity_in_published = JawafEntity.objects.create(
        nes_id="entity:person/in-published"
    )

    # Create IN_REVIEW case
    review_case = Case.objects.create(
        case_id="case-001",
        state=CaseState.IN_REVIEW,
        title="Review Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=review_case,
        entity=entity_in_review,
        relationship_type=RelationshipType.ALLEGED,
    )

    # Create PUBLISHED case
    published_case = Case.objects.create(
        case_id="case-002",
        state=CaseState.PUBLISHED,
        title="Published Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=published_case,
        entity=entity_in_published,
        relationship_type=RelationshipType.ALLEGED,
    )

    client = APIClient()
    response = client.get("/api/entities/")

    assert response.status_code == 200
    entity_ids = [e["id"] for e in response.data["results"]]

    # Only published entity should be returned
    assert entity_in_review.id not in entity_ids
    assert entity_in_published.id in entity_ids


# ============================================================================
# Caching Tests
# ============================================================================


@pytest.mark.django_db
def test_entity_list_uses_cache():
    """Test that entity list uses caching."""
    entity = JawafEntity.objects.create(nes_id="entity:person/test")

    case = Case.objects.create(
        case_id="case-001",
        state=CaseState.PUBLISHED,
        title="Test Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity, relationship_type=RelationshipType.ALLEGED
    )

    client = APIClient()

    # First request - cache miss
    response1 = client.get("/api/entities/")
    assert response1.status_code == 200

    # Verify cache was set
    cached_ids = cache.get("public_entities_list")
    assert cached_ids is not None
    assert entity.id in cached_ids

    # Second request - cache hit
    response2 = client.get("/api/entities/")
    assert response2.status_code == 200

    # Results should be the same
    assert response1.data["count"] == response2.data["count"]


@pytest.mark.django_db
def test_entity_list_cache_expires():
    """Test that cache expires after TTL."""
    entity = JawafEntity.objects.create(nes_id="entity:person/test")

    case = Case.objects.create(
        case_id="case-001",
        state=CaseState.PUBLISHED,
        title="Test Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity, relationship_type=RelationshipType.ALLEGED
    )

    client = APIClient()

    # First request - populate cache
    response1 = client.get("/api/entities/")
    assert response1.status_code == 200

    # Manually clear cache to simulate expiration
    cache.delete("public_entities_list")

    # Create new entity and case
    new_entity = JawafEntity.objects.create(nes_id="entity:person/new")
    new_case = Case.objects.create(
        case_id="case-002",
        state=CaseState.PUBLISHED,
        title="New Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=new_case, entity=new_entity, relationship_type=RelationshipType.ALLEGED
    )

    # Second request - cache miss, should include new entity
    response2 = client.get("/api/entities/")
    assert response2.status_code == 200

    entity_ids = [e["id"] for e in response2.data["results"]]
    assert new_entity.id in entity_ids


# ============================================================================
# Edge Cases
# ============================================================================


@pytest.mark.django_db
def test_entity_list_empty_when_no_published_cases():
    """Test that entity list is empty when there are no published cases."""
    # Create entities but no published cases
    JawafEntity.objects.create(nes_id="entity:person/test1")
    JawafEntity.objects.create(nes_id="entity:person/test2")

    client = APIClient()
    response = client.get("/api/entities/")

    assert response.status_code == 200
    assert response.data["count"] == 0
    assert len(response.data["results"]) == 0


@pytest.mark.django_db
def test_entity_list_excludes_closed_cases():
    """Test that entities in CLOSED cases are not returned."""
    entity = JawafEntity.objects.create(nes_id="entity:person/closed")

    case = Case.objects.create(
        case_id="case-001",
        state=CaseState.CLOSED,
        title="Closed Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity, relationship_type=RelationshipType.ALLEGED
    )

    client = APIClient()
    response = client.get("/api/entities/")

    assert response.status_code == 200
    entity_ids = [e["id"] for e in response.data["results"]]
    assert entity.id not in entity_ids


@pytest.mark.django_db
def test_entity_retrieve_works_for_entity_not_in_published_cases():
    """Test that individual entity retrieval works even if entity is not in published cases."""
    entity = JawafEntity.objects.create(nes_id="entity:person/standalone")

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    # Retrieve should still work (only list is filtered)
    assert response.status_code == 200
    assert response.data["id"] == entity.id
