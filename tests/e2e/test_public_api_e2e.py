"""
End-to-End tests for public API workflows.

Feature: accountability-platform-core
Tests complete user workflows through the public API
Validates: Requirements 6.1, 6.2, 6.3, 8.1, 8.3
"""

import pytest

from rest_framework.test import APIClient

from cases.models import CaseState, CaseType
from tests.conftest import (
    create_case_with_entities,
    create_document_source_with_entities,
)


@pytest.mark.django_db
class TestPublicAPIWorkflows:
    """
    End-to-end tests for public API user workflows.

    These tests simulate complete user journeys through the API,
    testing the integration of multiple endpoints and features.
    """

    def setup_method(self):
        """Set up test data for each test."""
        self.client = APIClient()

        # Create test cases with different states and types
        self.published_corruption_case = create_case_with_entities(
            title="Corruption Case - Land Encroachment",
            alleged_entities=["entity:person/test-official"],
            related_entities=["entity:organization/test-ministry"],
            locations=["entity:location/district/kathmandu"],
            key_allegations=[
                "Illegally acquired public land",
                "Failed to disclose assets",
            ],
            case_type=CaseType.CORRUPTION,
            description="A detailed description of the corruption case involving land encroachment.",
            tags=["land-encroachment", "public-land"],
            timeline=[
                {
                    "date": "2024-01-15",
                    "title": "Initial complaint filed",
                    "description": "Citizens filed complaint with authorities",
                },
                {
                    "date": "2024-02-20",
                    "title": "Investigation started",
                    "description": "Official investigation commenced",
                },
            ],
            state=CaseState.PUBLISHED,
        )

        # Create a source for the corruption case
        self.corruption_source = create_document_source_with_entities(
            title="Land Registry Document",
            description="Official land registry showing illegal transfer",
            related_entity_ids=["entity:person/test-official"],
        )

        # Add evidence to the case
        self.published_corruption_case.evidence = [
            {
                "source_id": self.corruption_source.source_id,
                "description": "This document proves the illegal land transfer",
            }
        ]
        self.published_corruption_case.save()

        # Create another published case with different type
        self.published_promises_case = create_case_with_entities(
            title="Broken Promise - Infrastructure Project",
            alleged_entities=["entity:person/test-politician"],
            key_allegations=["Failed to deliver promised infrastructure"],
            case_type=CaseType.PROMISES,
            description="Election promise to build hospital was not fulfilled.",
            tags=["infrastructure", "healthcare"],
            state=CaseState.PUBLISHED,
        )

        # Create a draft case (should not be visible)
        self.draft_case = create_case_with_entities(
            title="Draft Case - Should Not Appear",
            alleged_entities=["entity:person/test-person"],
            key_allegations=["Test allegation"],
            case_type=CaseType.CORRUPTION,
            description="This is a draft case",
            state=CaseState.DRAFT,
        )

        # Create a closed case (should not be visible)
        self.closed_case = create_case_with_entities(
            title="Closed Case - Should Not Appear",
            alleged_entities=["entity:person/test-person"],
            key_allegations=["Test allegation"],
            case_type=CaseType.CORRUPTION,
            description="This is a closed case",
            state=CaseState.CLOSED,
        )

    def test_browse_filter_search_view_workflow(self):
        """
        E2E Test: Complete user workflow from browsing to viewing details.

        Workflow:
        1. Browse all cases (list endpoint)
        2. Filter by case type
        3. Search for specific term
        4. View detailed case information

        Validates: Requirements 6.1, 6.2, 6.3, 8.1
        """
        # Step 1: Browse all published cases
        response = self.client.get("/api/cases/")
        assert response.status_code == 200, "Browse endpoint should return 200"

        results = response.data.get("results", [])
        assert (
            len(results) == 2
        ), "Should return 2 published cases (not draft or closed)"

        # Verify only published cases appear
        case_titles = [case["title"] for case in results]
        assert "Corruption Case - Land Encroachment" in case_titles
        assert "Broken Promise - Infrastructure Project" in case_titles
        assert "Draft Case - Should Not Appear" not in case_titles
        assert "Closed Case - Should Not Appear" not in case_titles

        # Step 2: Filter by case type (CORRUPTION)
        response = self.client.get("/api/cases/?case_type=CORRUPTION")
        assert response.status_code == 200, "Filter endpoint should return 200"

        results = response.data.get("results", [])
        assert len(results) == 1, "Should return 1 corruption case"
        assert results[0]["case_type"] == CaseType.CORRUPTION
        assert results[0]["title"] == "Corruption Case - Land Encroachment"

        # Step 3: Search for specific term
        response = self.client.get("/api/cases/?search=land")
        assert response.status_code == 200, "Search endpoint should return 200"

        results = response.data.get("results", [])
        assert len(results) >= 1, "Should find at least 1 case with 'land' in content"

        # Find the corruption case in results
        corruption_case_result = next(
            (case for case in results if "Land Encroachment" in case["title"]), None
        )
        assert (
            corruption_case_result is not None
        ), "Should find the land encroachment case"

        # Step 4: View detailed case information
        case_id = corruption_case_result["id"]
        response = self.client.get(f"/api/cases/{case_id}/")
        assert response.status_code == 200, "Detail endpoint should return 200"

        case_detail = response.data

        # Verify complete data is present
        assert case_detail["title"] == "Corruption Case - Land Encroachment"
        assert case_detail["description"] is not None
        assert len(case_detail["key_allegations"]) == 2
        assert len(case_detail["timeline"]) == 2
        assert len(case_detail["evidence"]) == 1
        assert len(case_detail["tags"]) == 2

        # Verify evidence includes source information
        evidence = case_detail["evidence"][0]
        assert "source_id" in evidence
        assert "description" in evidence
        assert evidence["source_id"] == self.corruption_source.source_id
        # Detail endpoint enriches evidence with nested source details
        assert "source" in evidence
        assert evidence["source"] is not None
        assert evidence["source"]["title"] == self.corruption_source.title
        assert "source_type" in evidence["source"]
        assert "url" in evidence["source"]

    def test_only_published_cases_accessible(self):
        """
        E2E Test: Verify that only published cases are accessible through the API.

        Tests:
        1. List endpoint only shows published cases
        2. Draft cases are not accessible via detail endpoint
        3. Closed cases are not accessible via detail endpoint
        4. In Review cases are accessible via detail endpoint but not list endpoint

        Validates: Requirements 6.1, 8.3
        """
        # Test 1: List endpoint only shows published cases
        response = self.client.get("/api/cases/")
        assert response.status_code == 200

        results = response.data.get("results", [])
        case_ids = [case["case_id"] for case in results]

        assert self.published_corruption_case.case_id in case_ids
        assert self.published_promises_case.case_id in case_ids
        assert self.draft_case.case_id not in case_ids
        assert self.closed_case.case_id not in case_ids

        # Test 2: Draft cases return 404 when accessed directly
        response = self.client.get(f"/api/cases/{self.draft_case.id}/")
        assert (
            response.status_code == 404
        ), "Draft cases should not be accessible via detail endpoint"

        # Test 3: Closed cases return 404 when accessed directly
        response = self.client.get(f"/api/cases/{self.closed_case.id}/")
        assert (
            response.status_code == 404
        ), "Closed cases should not be accessible via detail endpoint"

        # Test 4: Create an IN_REVIEW case and verify accessibility
        in_review_case = create_case_with_entities(
            title="In Review Case",
            alleged_entities=["entity:person/test-person"],
            key_allegations=["Test allegation"],
            case_type=CaseType.CORRUPTION,
            description="This is an in-review case",
            state=CaseState.IN_REVIEW,
        )

        # IN_REVIEW cases are always accessible via detail endpoint
        response = self.client.get(f"/api/cases/{in_review_case.id}/")
        assert (
            response.status_code == 200
        ), "IN_REVIEW cases should always be accessible via detail endpoint"
        assert (
            response.data["state"] == CaseState.IN_REVIEW
        ), "State field should show IN_REVIEW"

        # IN_REVIEW cases should not appear in list endpoint
        response = self.client.get("/api/cases/")
        case_ids = [case["case_id"] for case in response.data.get("results", [])]
        assert (
            in_review_case.case_id not in case_ids
        ), "In Review cases should not appear in list"

    def test_notes_field_in_case_detail(self):
        """
        E2E Test: Verify notes field is included when retrieving case details.

        Workflow:
        1. Create a published case with notes
        2. Retrieve the case via API
        3. Verify notes field is included in the response

        Validates: Requirements 6.3
        """
        # Step 1: Create a published case with notes
        case = create_case_with_entities(
            title="Case with Notes",
            alleged_entities=["entity:person/test-official"],
            key_allegations=["Initial allegation"],
            case_type=CaseType.CORRUPTION,
            description="A case with markdown notes.",
            state=CaseState.PUBLISHED,
        )
        case.notes = (
            "## Background\n\nThis case involves corruption at the ministry level."
        )
        case.save()

        # Step 2: Retrieve the case via API
        response = self.client.get(f"/api/cases/{case.id}/")
        assert response.status_code == 200

        case_detail = response.data

        # Step 3: Verify notes field is included
        assert "notes" in case_detail, "Detail endpoint should include notes field"
        assert (
            case_detail["notes"]
            == "## Background\n\nThis case involves corruption at the ministry level."
        ), "Notes content should match what was saved"

        # Verify audit_history is NOT included
        assert (
            "audit_history" not in case_detail
        ), "Detail endpoint should not include audit_history"

    def test_filter_by_tags_workflow(self):
        """
        E2E Test: Filter cases by tags and verify results.

        Workflow:
        1. Browse all cases
        2. Filter by specific tag
        3. Verify only cases with that tag are returned

        Validates: Requirements 6.2, 8.1
        """
        # Step 1: Browse all cases
        response = self.client.get("/api/cases/")
        assert response.status_code == 200
        initial_count = len(response.data.get("results", []))
        assert initial_count == 2, "Should have 2 published cases"

        # Step 2: Filter by tag "land-encroachment"
        response = self.client.get("/api/cases/?tags=land-encroachment")
        assert response.status_code == 200

        results = response.data.get("results", [])
        assert len(results) == 1, "Should return 1 case with 'land-encroachment' tag"

        # Step 3: Verify the correct case is returned
        case = results[0]
        assert case["title"] == "Corruption Case - Land Encroachment"
        assert "land-encroachment" in case["tags"]

        # Test filtering by another tag
        response = self.client.get("/api/cases/?tags=infrastructure")
        assert response.status_code == 200

        results = response.data.get("results", [])
        assert len(results) == 1, "Should return 1 case with 'infrastructure' tag"
        assert results[0]["title"] == "Broken Promise - Infrastructure Project"

    def test_search_across_multiple_fields(self):
        """
        E2E Test: Search functionality across title, description, and allegations.

        Workflow:
        1. Search for term in title
        2. Search for term in description
        3. Search for term in key allegations
        4. Verify all searches return correct results

        Validates: Requirements 6.2, 8.1
        """
        # Test 1: Search for term in title
        response = self.client.get("/api/cases/?search=Corruption")
        assert response.status_code == 200

        results = response.data.get("results", [])
        assert len(results) >= 1, "Should find cases with 'Corruption' in title"

        titles = [case["title"] for case in results]
        assert any("Corruption" in title for title in titles)

        # Test 2: Search for term in description
        response = self.client.get("/api/cases/?search=hospital")
        assert response.status_code == 200

        results = response.data.get("results", [])
        assert len(results) >= 1, "Should find cases with 'hospital' in description"

        # Verify the promises case is found
        found_promises_case = any(
            case["title"] == "Broken Promise - Infrastructure Project"
            for case in results
        )
        assert found_promises_case, "Should find the infrastructure case"

        # Test 3: Search for term in key allegations
        response = self.client.get("/api/cases/?search=assets")
        assert response.status_code == 200

        results = response.data.get("results", [])
        assert len(results) >= 1, "Should find cases with 'assets' in allegations"

        # Verify the corruption case is found
        found_corruption_case = any(
            case["title"] == "Corruption Case - Land Encroachment" for case in results
        )
        assert found_corruption_case, "Should find the corruption case"

    def test_document_source_visibility_workflow(self):
        """
        E2E Test: Verify document sources are only visible for published cases.

        Workflow:
        1. List all sources
        2. Verify only sources from published cases appear
        3. Retrieve specific source
        4. Verify source details are complete

        Validates: Requirements 4.1, 6.3
        """

        # Create a source referenced by the draft case (should not be visible)
        draft_source = create_document_source_with_entities(
            title="Draft Source - Should Not Appear",
            description="Source for draft case",
        )

        # Add evidence to draft case referencing this source
        self.draft_case.evidence = [
            {
                "source_id": draft_source.source_id,
                "description": "Evidence from draft case",
            }
        ]
        self.draft_case.save()

        # Step 1: List all sources
        response = self.client.get("/api/sources/")
        assert response.status_code == 200

        results = response.data.get("results", [])
        source_ids = [source["source_id"] for source in results]

        # Step 2: Verify only sources from published cases appear
        assert (
            self.corruption_source.source_id in source_ids
        ), "Source from published case should appear"
        assert (
            draft_source.source_id not in source_ids
        ), "Source from draft case should NOT appear"

        # Step 3: Retrieve specific source
        response = self.client.get(f"/api/sources/{self.corruption_source.id}/")
        assert response.status_code == 200

        # Step 4: Verify source details are complete
        source_detail = response.data
        assert source_detail["title"] == "Land Registry Document"
        assert source_detail["description"] is not None

        # Verify draft source is not accessible directly
        response = self.client.get(f"/api/sources/{draft_source.id}/")
        assert (
            response.status_code == 404
        ), "Source from draft case should not be accessible"

    def test_single_row_per_case_in_list(self):
        """
        E2E Test: Verify each case_id appears exactly once in the list.

        Workflow:
        1. Create a published case
        2. Edit it in-place
        3. List all cases
        4. Verify the case appears exactly once with updated content

        Validates: Requirements 6.1, 8.3
        """
        # Step 1: Create a published case
        case = create_case_with_entities(
            title="Single Row Case - Original Title",
            alleged_entities=["entity:person/test"],
            key_allegations=["Original allegation"],
            case_type=CaseType.CORRUPTION,
            description="Original description",
            state=CaseState.PUBLISHED,
        )

        case_id = case.case_id

        # Step 2: Edit the case in-place
        case.title = "Single Row Case - Updated Title"
        case.description = "Updated description"
        case.save()

        # Step 3: List all cases
        response = self.client.get("/api/cases/")
        assert response.status_code == 200

        results = response.data.get("results", [])

        # Step 4: Verify the case appears exactly once with updated content
        matching_cases = [c for c in results if c["case_id"] == case_id]
        assert len(matching_cases) == 1, "Should only return one row per case_id"

        returned_case = matching_cases[0]
        assert (
            returned_case["title"] == "Single Row Case - Updated Title"
        ), "Should return the current (updated) title"
        assert returned_case["description"] == "Updated description"

    def test_pagination_workflow(self):
        """
        E2E Test: Verify pagination works correctly.

        Workflow:
        1. Create multiple published cases
        2. Request first page
        3. Verify pagination metadata
        4. Request next page if available

        Validates: Requirements 6.1, 8.1
        """
        # Create additional cases to test pagination
        for i in range(5):
            create_case_with_entities(
                title=f"Pagination Test Case {i}",
                alleged_entities=["entity:person/test"],
                key_allegations=["Test allegation"],
                case_type=CaseType.CORRUPTION,
                description=f"Test case {i}",
                state=CaseState.PUBLISHED,
            )

        # Request first page
        response = self.client.get("/api/cases/")
        assert response.status_code == 200

        # Verify pagination metadata exists
        assert "count" in response.data, "Response should include total count"
        assert "results" in response.data, "Response should include results"

        # Verify we have results
        results = response.data.get("results", [])
        assert len(results) > 0, "Should have at least some results"

        # Total count should be at least 7 (2 original + 5 new)
        total_count = response.data.get("count", 0)
        assert total_count >= 7, f"Should have at least 7 cases, got {total_count}"
