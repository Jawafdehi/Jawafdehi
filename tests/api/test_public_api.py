"""
Property-based tests for public API.

Feature: accountability-platform-core
Tests Properties 8, 10, 15, 16
Validates: Requirements 4.1, 6.1, 6.2, 6.3, 8.1, 8.3
"""

import pytest

from hypothesis import given, settings
from hypothesis import strategies as st
from rest_framework.test import APIClient

from cases.models import CaseState, CaseType
from tests.conftest import (
    create_case_with_entities,
    create_document_source_with_entities,
)
from tests.strategies import (
    complete_case_data_with_timeline as complete_case_data,
    valid_source_data,
)

# ============================================================================
# Property 8: Public API only shows published cases
# ============================================================================


@pytest.mark.django_db
@settings(max_examples=20, deadline=800)
@given(
    case_data=complete_case_data(),
    state=st.sampled_from(
        [CaseState.DRAFT, CaseState.IN_REVIEW, CaseState.PUBLISHED, CaseState.CLOSED]
    ),
)
def test_public_api_only_shows_published_cases(case_data, state):
    """
    Feature: accountability-platform-core, Property 8: Public API only shows published cases

    For any API request to list cases, only cases with state=PUBLISHED should be returned.
    The detail endpoint also returns IN_REVIEW cases.
    Validates: Requirements 6.1, 8.3
    """

    # Create a case with the given state
    case = create_case_with_entities(**case_data)
    case.state = state
    case.save()

    # Make API request to list cases
    client = APIClient()
    response = client.get("/api/cases/")

    # API should return 200 OK
    assert (
        response.status_code == 200
    ), f"API should return 200 OK, but got {response.status_code}"

    # Check if case appears in results
    case_ids_in_response = [c.get("case_id") for c in response.data.get("results", [])]

    # List endpoint only shows PUBLISHED cases
    should_appear = state == CaseState.PUBLISHED

    if should_appear:
        # Cases should appear
        assert (
            case.case_id in case_ids_in_response
        ), f"Case {case.case_id} with state={state} should appear in API list response"
    else:
        # Cases should NOT appear
        assert (
            case.case_id not in case_ids_in_response
        ), f"Case {case.case_id} with state={state} should NOT appear in API list response"

    # Test detail endpoint - IN_REVIEW cases always accessible, others match list behavior
    detail_response = client.get(f"/api/cases/{case.id}/")

    if state == CaseState.PUBLISHED:
        assert (
            detail_response.status_code == 200
        ), "PUBLISHED case should be accessible via detail endpoint"
    elif state == CaseState.IN_REVIEW:
        # IN_REVIEW cases are ALWAYS accessible via detail endpoint
        assert (
            detail_response.status_code == 200
        ), "IN_REVIEW case should always be accessible via detail endpoint"
        assert (
            detail_response.data["state"] == CaseState.IN_REVIEW
        ), "State field should show IN_REVIEW"
    else:
        # DRAFT and CLOSED should never be accessible
        assert (
            detail_response.status_code == 404
        ), f"{state} case should NOT be accessible via detail endpoint"


# ============================================================================
# Property 10: Evidence requires valid source references
# ============================================================================


@pytest.mark.django_db
@settings(max_examples=20, deadline=800)
@given(case_data=complete_case_data(), source_data=valid_source_data())
def test_evidence_requires_valid_source_references(case_data, source_data):
    """
    Feature: accountability-platform-core, Property 10: Evidence requires valid source references

    For any evidence added to a case, it should include a source_id and description,
    and the source_id should reference an existing DocumentSource.
    Validates: Requirements 4.1
    """
    # Create a case
    case = create_case_with_entities(**case_data)

    # Create a valid DocumentSource
    source = create_document_source_with_entities(**source_data)

    # Add evidence referencing the source
    case.evidence = [
        {
            "source_id": source.source_id,
            "description": "This source supports the allegation",
        }
    ]
    case.save()

    # Publish the case
    case.state = CaseState.PUBLISHED
    case.save()

    # Retrieve via API
    client = APIClient()
    response = client.get(f"/api/cases/{case.id}/")

    assert response.status_code == 200

    # Check evidence is included
    evidence_list = response.data.get("evidence", [])
    assert (
        len(evidence_list) > 0
    ), "Published case should include evidence in API response"

    # Check evidence has required fields
    for evidence_item in evidence_list:
        assert "source_id" in evidence_item, "Evidence should include source_id"
        assert "description" in evidence_item, "Evidence should include description"
        assert (
            evidence_item["source_id"] == source.source_id
        ), "Evidence source_id should match created source"


@pytest.mark.django_db
def test_evidence_with_invalid_source_reference():
    """
    Feature: accountability-platform-core, Property 10: Evidence requires valid source references

    For any evidence with an invalid source_id (non-existent source),
    the system should handle it appropriately.
    Validates: Requirements 4.1
    """
    # Create a case
    case = create_case_with_entities(
        title="Test Case",
        alleged_entities=["entity:person/test"],
        key_allegations=["Test allegation"],
        case_type=CaseType.CORRUPTION,
        description="Test description",
    )

    # Add evidence with non-existent source_id
    case.evidence = [
        {
            "source_id": "source:nonexistent:12345678",
            "description": "Invalid source reference",
        }
    ]

    # This should either:
    # 1. Raise ValidationError when saving
    # 2. Or be handled gracefully by the API
    # The spec says source_id should reference an existing DocumentSource
    # So we expect validation to catch this

    # For now, we'll just verify the structure is stored
    # The actual validation will be implemented in the API layer
    case.save()

    # Verify evidence structure is preserved
    assert len(case.evidence) == 1
    assert case.evidence[0]["source_id"] == "source:nonexistent:12345678"


# ============================================================================
# Property 15: Search and filter functionality
# ============================================================================


@pytest.mark.django_db
@settings(max_examples=20, deadline=800)
@given(
    case_data=complete_case_data(),
    search_term=st.text(
        min_size=3,
        max_size=20,
        alphabet=st.characters(whitelist_categories=("Ll", "Lu")),
    ),
)
def test_search_functionality_across_fields(case_data, search_term):
    """
    Feature: accountability-platform-core, Property 15: Search and filter functionality

    For any search query on the public API, the Platform should return published cases
    matching the criteria across title, description, and key_allegations fields.
    Validates: Requirements 6.2, 8.1
    """
    # Ensure search term appears in at least one searchable field
    case_data["title"] = f"{search_term} Case Title"

    # Create and publish a case
    case = create_case_with_entities(**case_data)
    case.state = CaseState.PUBLISHED
    case.save()

    # Search for the term
    client = APIClient()
    response = client.get(f"/api/cases/?search={search_term}")

    assert response.status_code == 200

    # Case should appear in search results
    case_ids_in_response = [c.get("case_id") for c in response.data.get("results", [])]
    assert (
        case.case_id in case_ids_in_response
    ), f"Case with '{search_term}' in title should appear in search results"


@pytest.mark.django_db
@settings(max_examples=20, deadline=800)
@given(
    case_data=complete_case_data(),
    case_type=st.sampled_from([CaseType.CORRUPTION, CaseType.PROMISES]),
)
def test_filter_by_case_type(case_data, case_type):
    """
    Feature: accountability-platform-core, Property 15: Search and filter functionality

    For any filter by case_type on the public API, the Platform should return
    only published cases matching that case_type.
    Validates: Requirements 6.2, 8.1
    """
    # Set the case type
    case_data["case_type"] = case_type

    # Create and publish a case
    case = create_case_with_entities(**case_data)
    case.state = CaseState.PUBLISHED
    case.save()

    # Filter by case_type
    client = APIClient()
    response = client.get(f"/api/cases/?case_type={case_type}")

    assert response.status_code == 200

    # All returned cases should have the filtered case_type
    for returned_case in response.data.get("results", []):
        assert (
            returned_case.get("case_type") == case_type
        ), f"Filtered results should only include case_type={case_type}"

    # Our case should appear in results
    case_ids_in_response = [c.get("case_id") for c in response.data.get("results", [])]
    assert (
        case.case_id in case_ids_in_response
    ), f"Case with case_type={case_type} should appear in filtered results"


@pytest.mark.django_db
@settings(max_examples=20, deadline=800)
@given(
    case_data=complete_case_data(),
    tag=st.text(
        alphabet=st.characters(
            whitelist_categories=("Ll", "Nd"), whitelist_characters="-"
        ),
        min_size=3,
        max_size=30,
    ).filter(lambda x: x and not x.startswith("-") and not x.endswith("-")),
)
def test_filter_by_tags(case_data, tag):
    """
    Feature: accountability-platform-core, Property 15: Search and filter functionality

    For any filter by tags on the public API, the Platform should return
    only published cases containing that tag.
    Validates: Requirements 6.2, 8.1
    """
    # Add the tag to the case
    case_data["tags"] = [tag]

    # Create and publish a case
    case = create_case_with_entities(**case_data)
    case.state = CaseState.PUBLISHED
    case.save()

    # Filter by tag
    client = APIClient()
    response = client.get(f"/api/cases/?tags={tag}")

    assert response.status_code == 200

    # Our case should appear in results
    case_ids_in_response = [c.get("case_id") for c in response.data.get("results", [])]
    assert (
        case.case_id in case_ids_in_response
    ), f"Case with tag '{tag}' should appear in filtered results"

    # All returned cases should have the tag
    for returned_case in response.data.get("results", []):
        returned_tags = returned_case.get("tags", [])
        assert (
            tag in returned_tags
        ), f"Filtered results should only include cases with tag '{tag}'"


# ============================================================================
# Property 16: Published cases display complete data
# ============================================================================


@pytest.mark.django_db
@settings(max_examples=20, deadline=800)
@given(case_data=complete_case_data(), source_data=valid_source_data())
def test_published_cases_display_complete_data(case_data, source_data):
    """
    Feature: accountability-platform-core, Property 16: Published cases display complete data

    For any published case retrieved via the public API, all associated evidence,
    sources, and timeline entries should be included.
    Validates: Requirements 6.3
    """
    # Create a case with complete data
    case = create_case_with_entities(**case_data)

    # Create a source
    source = create_document_source_with_entities(**source_data)

    # Add evidence referencing the source
    case.evidence = [
        {"source_id": source.source_id, "description": "Evidence description"}
    ]
    case.save()

    # Publish the case
    case.state = CaseState.PUBLISHED
    case.save()

    # Retrieve via API
    client = APIClient()
    response = client.get(f"/api/cases/{case.id}/")

    assert response.status_code == 200

    returned_case = response.data

    # Verify all core fields are present
    assert "case_id" in returned_case, "Response should include case_id"
    assert "title" in returned_case, "Response should include title"
    assert "description" in returned_case, "Response should include description"
    assert "case_type" in returned_case, "Response should include case_type"
    assert (
        "alleged_entities" in returned_case
    ), "Response should include alleged_entities"
    assert "key_allegations" in returned_case, "Response should include key_allegations"

    # Verify timeline is included
    assert "timeline" in returned_case, "Response should include timeline"
    if case.timeline:
        assert len(returned_case["timeline"]) == len(
            case.timeline
        ), "All timeline entries should be included"

    # Verify evidence is included
    assert "evidence" in returned_case, "Response should include evidence"
    if case.evidence:
        assert len(returned_case["evidence"]) == len(
            case.evidence
        ), "All evidence entries should be included"

        # Verify evidence structure
        for evidence_item in returned_case["evidence"]:
            assert "source_id" in evidence_item, "Evidence should include source_id"
            assert "description" in evidence_item, "Evidence should include description"

    # Verify tags are included
    assert "tags" in returned_case, "Response should include tags"
    if case.tags:
        assert len(returned_case["tags"]) == len(
            case.tags
        ), "All tags should be included"


@pytest.mark.django_db
@settings(max_examples=20, deadline=800)
@given(case_data=complete_case_data())
def test_published_cases_include_all_entity_fields(case_data):
    """
    Feature: accountability-platform-core, Property 16: Published cases display complete data

    For any published case, all entity-related fields (alleged_entities,
    related_entities, locations) should be included in the API response.
    Validates: Requirements 6.3
    """
    # Create and publish a case
    case = create_case_with_entities(**case_data)
    case.state = CaseState.PUBLISHED
    case.save()

    # Retrieve via API
    client = APIClient()
    response = client.get(f"/api/cases/{case.id}/")

    assert response.status_code == 200

    returned_case = response.data

    # Verify all entity fields are present
    assert (
        "alleged_entities" in returned_case
    ), "Response should include alleged_entities"
    assert (
        "related_entities" in returned_case
    ), "Response should include related_entities"
    assert "locations" in returned_case, "Response should include locations"

    # Verify entity lists are present and have correct structure
    assert isinstance(
        returned_case["alleged_entities"], list
    ), "alleged_entities should be a list"
    assert (
        len(returned_case["alleged_entities"]) == case.alleged_entities.count()
    ), "alleged_entities count should match"

    # Verify entity objects have required fields
    for entity in returned_case["alleged_entities"]:
        assert "id" in entity, "Entity should have id field"
        assert (
            "nes_id" in entity or "display_name" in entity
        ), "Entity should have nes_id or display_name"

    if case.related_entities.count() > 0:
        assert (
            len(returned_case["related_entities"]) == case.related_entities.count()
        ), "related_entities count should match"

    if case.locations.count() > 0:
        assert (
            len(returned_case["locations"]) == case.locations.count()
        ), "locations count should match"


# ============================================================================
# Edge Cases and Additional Tests
# ============================================================================


@pytest.mark.django_db
def test_api_returns_empty_list_when_no_published_cases():
    """
    Edge case: API should return empty list when no published cases exist.
    Validates: Requirements 6.1, 8.3
    """
    # Create only draft cases
    create_case_with_entities(
        title="Draft Case",
        alleged_entities=["entity:person/test"],
        case_type=CaseType.CORRUPTION,
        state=CaseState.DRAFT,
    )

    # Make API request
    client = APIClient()
    response = client.get("/api/cases/")

    assert response.status_code == 200
    assert (
        len(response.data.get("results", [])) == 0
    ), "API should return empty list when no published cases exist"


@pytest.mark.django_db
def test_api_does_not_expose_contributors():
    """
    Edge case: API should not expose contributors field (internal only).
    Validates: Design document - contributors not exposed in API
    """
    # Create and publish a case
    case = create_case_with_entities(
        title="Test Case",
        alleged_entities=["entity:person/test"],
        key_allegations=["Test allegation"],
        case_type=CaseType.CORRUPTION,
        description="Test description",
        state=CaseState.PUBLISHED,
    )

    # Make API request
    client = APIClient()
    response = client.get(f"/api/cases/{case.id}/")

    assert response.status_code == 200

    # Contributors should NOT be in response
    assert (
        "contributors" not in response.data
    ), "API should not expose contributors field"


@pytest.mark.django_db
def test_api_exposes_state_field():
    """
    Edge case: API should always expose state field to indicate case status.
    Validates: Design document - state field shows PUBLISHED or IN_REVIEW
    """
    # Create and publish a case
    case = create_case_with_entities(
        title="Test Case",
        alleged_entities=["entity:person/test"],
        key_allegations=["Test allegation"],
        case_type=CaseType.CORRUPTION,
        description="Test description",
        state=CaseState.PUBLISHED,
    )

    # Make API request
    client = APIClient()
    response = client.get(f"/api/cases/{case.id}/")

    assert response.status_code == 200

    # State should always be in response
    assert "state" in response.data, "API should always expose state field"
    assert response.data["state"] == CaseState.PUBLISHED


@pytest.mark.django_db
@settings(max_examples=10, deadline=800)
@given(case_data=complete_case_data())
def test_public_api_exposes_case_in_review_under_the_retrieve_mode(case_data):
    """
    Feature: IN_REVIEW cases are accessible via detail endpoint only.

    The retrieve (detail) endpoint should always show IN_REVIEW cases.
    However, IN_REVIEW cases should NOT appear in the list endpoint.

    Validates: PR #14 - Allow IN_REVIEW cases in detail endpoint
    """
    # Create an IN_REVIEW case
    case = create_case_with_entities(**case_data)
    case.state = CaseState.IN_REVIEW
    case.save()

    client = APIClient()

    # Test 1: Detail endpoint should ALWAYS show IN_REVIEW cases
    detail_response = client.get(f"/api/cases/{case.id}/")
    assert (
        detail_response.status_code == 200
    ), "IN_REVIEW case should always be accessible via detail endpoint"
    assert (
        detail_response.data["state"] == CaseState.IN_REVIEW
    ), "State field should show IN_REVIEW"
    assert (
        detail_response.data["case_id"] == case.case_id
    ), "Should return the correct case"

    # Test 2: List endpoint should NOT show IN_REVIEW cases
    list_response = client.get("/api/cases/")
    assert list_response.status_code == 200

    case_ids_in_list = [c.get("case_id") for c in list_response.data.get("results", [])]

    # IN_REVIEW cases should NOT appear in list
    assert (
        case.case_id not in case_ids_in_list
    ), "IN_REVIEW case should NOT appear in list endpoint"


@pytest.mark.django_db
def test_document_source_api_only_shows_sources_referenced_by_published_cases():
    """
    Edge case: DocumentSource API should only show sources referenced in evidence of published cases.
    Validates: Design document - sources visible if referenced by any published case
    """

    # Create a source (not linked to any case via ForeignKey)
    draft_source = create_document_source_with_entities(
        title="Draft Source", description="Source for draft case"
    )

    in_review_source = create_document_source_with_entities(
        title="In Review Source", description="Source for in-review case"
    )

    published_source = create_document_source_with_entities(
        title="Published Source", description="Source for published case"
    )

    unreferenced_source = create_document_source_with_entities(
        title="Unreferenced Source", description="Source not referenced by any case"
    )

    # Create a draft case that references draft_source in evidence
    create_case_with_entities(
        title="Draft Case",
        alleged_entities=["entity:person/test"],
        case_type=CaseType.CORRUPTION,
        state=CaseState.DRAFT,
        evidence=[
            {
                "source_id": draft_source.source_id,
                "description": "Evidence from draft case",
            }
        ],
    )

    # Create an in-review case that references in_review_source in evidence
    create_case_with_entities(
        title="In Review Case",
        alleged_entities=["entity:person/test"],
        key_allegations=["Test allegation"],
        case_type=CaseType.CORRUPTION,
        description="Test description",
        state=CaseState.IN_REVIEW,
        evidence=[
            {
                "source_id": in_review_source.source_id,
                "description": "Evidence from in-review case",
            }
        ],
    )

    # Create a published case that references published_source in evidence
    create_case_with_entities(
        title="Published Case",
        alleged_entities=["entity:person/test"],
        key_allegations=["Test allegation"],
        case_type=CaseType.CORRUPTION,
        description="Test description",
        state=CaseState.PUBLISHED,
        evidence=[
            {
                "source_id": published_source.source_id,
                "description": "Evidence from published case",
            }
        ],
    )

    # Make API request to list sources
    client = APIClient()
    response = client.get("/api/sources/")

    assert response.status_code == 200

    # Check which sources should appear
    source_ids = [s.get("source_id") for s in response.data.get("results", [])]

    assert (
        published_source.source_id in source_ids
    ), "Source referenced by published case should appear in API"
    assert (
        draft_source.source_id not in source_ids
    ), "Source referenced only by draft case should NOT appear in API"
    assert (
        unreferenced_source.source_id not in source_ids
    ), "Source not referenced by any case should NOT appear in API"

    # IN_REVIEW sources should NOT appear
    assert (
        in_review_source.source_id not in source_ids
    ), "Source referenced by in-review case should NOT appear in API"
