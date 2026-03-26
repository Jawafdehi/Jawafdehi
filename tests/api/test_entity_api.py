"""
Property-based and E2E tests for JawafEntity API endpoint.

Feature: Entity Management API
Tests entity listing, retrieval, search, and pagination
"""

import pytest

from django.core.cache import cache
from hypothesis import given, strategies as st, settings
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
# Hypothesis Strategies
# ============================================================================


@st.composite
def valid_entity_id(draw):
    """Generate valid entity IDs matching NES format."""
    entity_types = ["person", "organization", "location"]
    entity_type = draw(st.sampled_from(entity_types))

    slug = draw(
        st.text(
            alphabet="abcdefghijklmnopqrstuvwxyz0123456789-", min_size=3, max_size=50
        ).filter(
            lambda x: x
            and not x.startswith("-")
            and not x.endswith("-")
            and "--" not in x
        )
    )

    return f"entity:{entity_type}/{slug}"


# ============================================================================
# Basic API Tests
# ============================================================================


@pytest.mark.django_db
def test_entity_list_endpoint_returns_200():
    """Test that the entity list endpoint is accessible."""
    client = APIClient()
    response = client.get("/api/entities/")

    assert response.status_code == 200
    assert "results" in response.data
    assert "count" in response.data


@pytest.mark.django_db
def test_entity_list_includes_all_entities():
    """Test that the entity list includes all entities in published cases."""
    from cases.models import (
        JawafEntity,
    )

    # Create test entities
    entity1 = JawafEntity.objects.create(nes_id="entity:person/test-person")
    entity2 = JawafEntity.objects.create(display_name="Custom Entity")
    entity3 = JawafEntity.objects.create(
        nes_id="entity:organization/test-org", display_name="Test Organization"
    )

    # Create published case with entities
    case = Case.objects.create(
        case_id="test-case",
        state=CaseState.PUBLISHED,
        title="Test Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity1, relationship_type=RelationshipType.ALLEGED
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity2, relationship_type=RelationshipType.ALLEGED
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity3, relationship_type=RelationshipType.RELATED
    )

    client = APIClient()
    response = client.get("/api/entities/")

    assert response.status_code == 200
    assert response.data["count"] >= 3

    # Verify all entities are in results
    entity_ids = [e["id"] for e in response.data["results"]]
    assert entity1.id in entity_ids
    assert entity2.id in entity_ids
    assert entity3.id in entity_ids


@pytest.mark.django_db
def test_entity_retrieve_endpoint():
    """Test that individual entities can be retrieved."""
    entity = JawafEntity.objects.create(nes_id="entity:person/test-person")

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert response.data["id"] == entity.id
    assert response.data["nes_id"] == "entity:person/test-person"
    assert response.data["display_name"] is None


@pytest.mark.django_db
def test_entity_retrieve_with_display_name():
    """Test retrieving entity with display_name."""
    entity = JawafEntity.objects.create(
        nes_id="entity:person/john-doe", display_name="John Doe"
    )

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert response.data["nes_id"] == "entity:person/john-doe"
    assert response.data["display_name"] == "John Doe"


@pytest.mark.django_db
def test_entity_retrieve_custom_entity():
    """Test retrieving custom entity (no nes_id)."""
    entity = JawafEntity.objects.create(display_name="Custom Entity Name")

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert response.data["nes_id"] is None
    assert response.data["display_name"] == "Custom Entity Name"


@pytest.mark.django_db
def test_entity_retrieve_nonexistent_returns_404():
    """Test that retrieving non-existent entity returns 404."""
    client = APIClient()
    response = client.get("/api/entities/99999/")

    assert response.status_code == 404


# ============================================================================
# Search Tests
# ============================================================================


@pytest.mark.django_db
def test_entity_search_by_nes_id():
    """Test searching entities by nes_id."""
    from cases.models import (
        JawafEntity,
    )

    entity1 = JawafEntity.objects.create(nes_id="entity:person/john-doe")
    entity2 = JawafEntity.objects.create(nes_id="entity:person/jane-smith")
    entity3 = JawafEntity.objects.create(display_name="John Williams")

    # Create published case with entities
    case = Case.objects.create(
        case_id="test-case",
        state=CaseState.PUBLISHED,
        title="Test Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity1, relationship_type=RelationshipType.ALLEGED
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity2, relationship_type=RelationshipType.ALLEGED
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity3, relationship_type=RelationshipType.ALLEGED
    )

    client = APIClient()
    response = client.get("/api/entities/?search=john")

    assert response.status_code == 200
    assert response.data["count"] >= 2  # Should find john-doe and John Williams

    entity_ids = [e["id"] for e in response.data["results"]]
    assert entity1.id in entity_ids
    assert entity3.id in entity_ids


@pytest.mark.django_db
def test_entity_search_by_display_name():
    """Test searching entities by display_name."""
    from cases.models import (
        JawafEntity,
    )

    entity1 = JawafEntity.objects.create(display_name="Jane Smith")
    entity2 = JawafEntity.objects.create(display_name="John Doe")
    entity3 = JawafEntity.objects.create(nes_id="entity:person/test-person")

    # Create published case with entities
    case = Case.objects.create(
        case_id="test-case",
        state=CaseState.PUBLISHED,
        title="Test Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity1, relationship_type=RelationshipType.ALLEGED
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity2, relationship_type=RelationshipType.ALLEGED
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity3, relationship_type=RelationshipType.ALLEGED
    )

    client = APIClient()
    response = client.get("/api/entities/?search=Jane")

    assert response.status_code == 200
    assert response.data["count"] >= 1

    entity_ids = [e["id"] for e in response.data["results"]]
    assert entity1.id in entity_ids
    assert entity2.id not in entity_ids


@pytest.mark.django_db
def test_entity_search_case_insensitive():
    """Test that entity search is case-insensitive."""
    from cases.models import (
        JawafEntity,
    )

    entity = JawafEntity.objects.create(display_name="Test Entity")

    # Create published case with entity
    case = Case.objects.create(
        case_id="test-case",
        state=CaseState.PUBLISHED,
        title="Test Case",
        description="Test",
    )
    CaseEntityRelationship.objects.create(
        case=case, entity=entity, relationship_type=RelationshipType.ALLEGED
    )

    client = APIClient()

    # Search with lowercase
    response1 = client.get("/api/entities/?search=test")
    assert response1.status_code == 200
    assert response1.data["count"] >= 1

    # Search with uppercase
    response2 = client.get("/api/entities/?search=TEST")
    assert response2.status_code == 200
    assert response2.data["count"] >= 1


@pytest.mark.django_db
def test_entity_search_no_results():
    """Test that search with no matches returns empty results."""
    JawafEntity.objects.create(nes_id="entity:person/test-person")

    client = APIClient()
    response = client.get("/api/entities/?search=nonexistent")

    assert response.status_code == 200
    assert response.data["count"] == 0
    assert len(response.data["results"]) == 0


# ============================================================================
# Pagination Tests
# ============================================================================


@pytest.mark.django_db
def test_entity_list_pagination():
    """Test that entity list is paginated."""
    from cases.models import (
        JawafEntity,
    )

    # Create more than 50 entities (default page size)
    entities = []
    for i in range(60):
        entities.append(JawafEntity.objects.create(display_name=f"Entity {i}"))

    # Create published case with all entities
    case = Case.objects.create(
        case_id="test-case",
        state=CaseState.PUBLISHED,
        title="Test Case",
        description="Test",
    )
    [
        CaseEntityRelationship.objects.create(
            case=case, entity=_e, relationship_type=RelationshipType.ALLEGED
        )
        for _e in entities
    ]

    client = APIClient()
    response = client.get("/api/entities/")

    assert response.status_code == 200
    assert response.data["count"] >= 60
    assert len(response.data["results"]) <= 50  # Page size limit
    assert "next" in response.data
    assert "previous" in response.data


@pytest.mark.django_db
def test_entity_list_pagination_navigation():
    """Test navigating through paginated entity results."""
    from cases.models import (
        JawafEntity,
    )

    # Create entities
    entities = []
    for i in range(60):
        entities.append(JawafEntity.objects.create(display_name=f"Entity {i}"))

    # Create published case with all entities
    case = Case.objects.create(
        case_id="test-case",
        state=CaseState.PUBLISHED,
        title="Test Case",
        description="Test",
    )
    [
        CaseEntityRelationship.objects.create(
            case=case, entity=_e, relationship_type=RelationshipType.ALLEGED
        )
        for _e in entities
    ]

    client = APIClient()

    # Get first page
    response1 = client.get("/api/entities/")
    assert response1.status_code == 200
    page1_ids = [e["id"] for e in response1.data["results"]]

    # Get second page
    response2 = client.get("/api/entities/?page=2")
    assert response2.status_code == 200
    page2_ids = [e["id"] for e in response2.data["results"]]

    # Verify pages don't overlap
    assert len(set(page1_ids) & set(page2_ids)) == 0


# ============================================================================
# Property-Based Tests
# ============================================================================


@pytest.mark.django_db(transaction=True)
@settings(max_examples=20, derandomize=True)
@given(nes_id=valid_entity_id())
def test_entity_with_nes_id_accessible_via_api(nes_id):
    """
    Property: Any entity with a valid nes_id should be accessible via API.
    """
    # Use get_or_create to handle potential duplicates from previous test runs
    entity, _ = JawafEntity.objects.get_or_create(nes_id=nes_id)

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert response.data["nes_id"] == nes_id


@pytest.mark.django_db(transaction=True)
@settings(max_examples=20)
@given(display_name=st.text(min_size=1, max_size=100).filter(lambda x: x.strip()))
def test_entity_with_display_name_accessible_via_api(display_name):
    """
    Property: Any entity with a display_name should be accessible via API.
    """
    entity = JawafEntity.objects.create(display_name=display_name)

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200
    assert response.data["display_name"] == display_name


# ============================================================================
# Response Structure Tests
# ============================================================================


@pytest.mark.django_db
def test_entity_list_response_structure():
    """Test that entity list response has correct structure."""
    JawafEntity.objects.create(nes_id="entity:person/test")

    client = APIClient()
    response = client.get("/api/entities/")

    assert response.status_code == 200

    # Check pagination structure
    assert "count" in response.data
    assert "next" in response.data
    assert "previous" in response.data
    assert "results" in response.data

    # Check entity structure
    if response.data["results"]:
        entity = response.data["results"][0]
        assert "id" in entity
        assert "nes_id" in entity
        assert "display_name" in entity


@pytest.mark.django_db
def test_entity_retrieve_response_structure():
    """Test that entity retrieve response has correct structure."""
    entity = JawafEntity.objects.create(
        nes_id="entity:person/test", display_name="Test Person"
    )

    client = APIClient()
    response = client.get(f"/api/entities/{entity.id}/")

    assert response.status_code == 200

    # Check all expected fields are present
    assert "id" in response.data
    assert "nes_id" in response.data
    assert "display_name" in response.data

    # Verify field values
    assert response.data["id"] == entity.id
    assert response.data["nes_id"] == "entity:person/test"
    assert response.data["display_name"] == "Test Person"


# ============================================================================
# E2E Workflow Tests
# ============================================================================


@pytest.mark.django_db
class TestEntityAPIWorkflows:
    """End-to-end workflow tests for entity API."""

    def test_browse_and_search_entities_workflow(self):
        """
        E2E Test: User browses entities and searches for specific ones.

        Workflow:
        1. User lists all entities
        2. User searches for entities by name
        3. User retrieves specific entity details
        """
        from cases.models import (
            JawafEntity,
        )

        # Setup: Create test entities
        entity1 = JawafEntity.objects.create(nes_id="entity:person/rabi-lamichhane")
        entity2 = JawafEntity.objects.create(display_name="Pushpa Kamal Dahal")
        entity3 = JawafEntity.objects.create(nes_id="entity:organization/ciaa")

        # Create published case with entities
        case = Case.objects.create(
            case_id="test-case",
            state=CaseState.PUBLISHED,
            title="Test Case",
            description="Test",
        )
        CaseEntityRelationship.objects.create(
            case=case, entity=entity1, relationship_type=RelationshipType.ALLEGED
        )
        CaseEntityRelationship.objects.create(
            case=case, entity=entity2, relationship_type=RelationshipType.ALLEGED
        )
        CaseEntityRelationship.objects.create(
            case=case, entity=entity3, relationship_type=RelationshipType.ALLEGED
        )

        client = APIClient()

        # Step 1: List all entities
        response = client.get("/api/entities/")
        assert response.status_code == 200
        assert response.data["count"] >= 3

        # Step 2: Search for specific entity
        response = client.get("/api/entities/?search=rabi")
        assert response.status_code == 200
        assert response.data["count"] >= 1

        found_entity = None
        for entity in response.data["results"]:
            if entity["id"] == entity1.id:
                found_entity = entity
                break

        assert found_entity is not None
        assert "rabi" in found_entity["nes_id"].lower()

        # Step 3: Retrieve full entity details
        response = client.get(f"/api/entities/{entity1.id}/")
        assert response.status_code == 200
        assert response.data["nes_id"] == "entity:person/rabi-lamichhane"

    def test_pagination_workflow(self):
        """
        E2E Test: User navigates through paginated entity results.

        Workflow:
        1. Create many entities
        2. User gets first page
        3. User navigates to next page
        4. User verifies different results
        """
        from cases.models import (
            JawafEntity,
        )

        # Setup: Create 60 entities
        entities = []
        for i in range(60):
            entity = JawafEntity.objects.create(display_name=f"Entity {i:03d}")
            entities.append(entity)

        # Create published case with all entities
        case = Case.objects.create(
            case_id="test-case",
            state=CaseState.PUBLISHED,
            title="Test Case",
            description="Test",
        )
        [
            CaseEntityRelationship.objects.create(
                case=case, entity=_e, relationship_type=RelationshipType.ALLEGED
            )
            for _e in entities
        ]

        client = APIClient()

        # Step 1: Get first page
        response1 = client.get("/api/entities/")
        assert response1.status_code == 200
        assert response1.data["count"] >= 60
        page1_count = len(response1.data["results"])
        assert page1_count > 0

        # Step 2: Navigate to next page
        if response1.data["next"]:
            response2 = client.get("/api/entities/?page=2")
            assert response2.status_code == 200
            page2_count = len(response2.data["results"])
            assert page2_count > 0

            # Step 3: Verify different results
            page1_ids = {e["id"] for e in response1.data["results"]}
            page2_ids = {e["id"] for e in response2.data["results"]}
            assert len(page1_ids & page2_ids) == 0  # No overlap
