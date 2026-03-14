"""
Tests for the statistics API endpoint.

Tests the /api/statistics/ endpoint for case statistics aggregation and caching.
"""

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from cases.models import Case, CaseState, CaseType, JawafEntity


@pytest.fixture
def api_client():
    """Create an API client for testing."""
    return APIClient()


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear cache before each test."""
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
class TestStatisticsEndpoint:
    """Test suite for the statistics API endpoint."""

    def test_statistics_endpoint_returns_200(self, api_client):
        """Test that the statistics endpoint returns 200 OK."""
        response = api_client.get("/api/statistics/")
        assert response.status_code == 200

    def test_statistics_response_structure(self, api_client):
        """Test that the response contains all required fields."""
        response = api_client.get("/api/statistics/")
        data = response.json()

        assert "published_cases" in data
        assert "entities_tracked" in data
        assert "cases_under_investigation" in data
        assert "cases_closed" in data
        assert "last_updated" in data

    def test_statistics_field_types(self, api_client):
        """Test that all fields have correct types."""
        response = api_client.get("/api/statistics/")
        data = response.json()

        assert isinstance(data["published_cases"], int)
        assert isinstance(data["entities_tracked"], int)
        assert isinstance(data["cases_under_investigation"], int)
        assert isinstance(data["cases_closed"], int)
        assert isinstance(data["last_updated"], str)

    def test_statistics_empty_database(self, api_client):
        """Test statistics with empty database returns zeros."""
        response = api_client.get("/api/statistics/")
        data = response.json()

        assert data["published_cases"] == 0
        assert data["entities_tracked"] == 0
        assert data["cases_under_investigation"] == 0
        assert data["cases_closed"] == 0


@pytest.mark.django_db
class TestStatisticsCounting:
    """Test suite for statistics counting logic."""

    def test_published_cases_count(self, api_client):
        """Test that published cases are counted correctly."""
        # Create cases in different states
        Case.objects.create(
            case_type=CaseType.CORRUPTION,
            state=CaseState.PUBLISHED,
            title="Published Case 1",
        )
        Case.objects.create(
            case_type=CaseType.CORRUPTION,
            state=CaseState.PUBLISHED,
            title="Published Case 2",
        )
        Case.objects.create(
            case_type=CaseType.CORRUPTION, state=CaseState.DRAFT, title="Draft Case"
        )

        response = api_client.get("/api/statistics/")
        data = response.json()

        assert data["published_cases"] == 2

    def test_cases_under_investigation_count(self, api_client):
        """Test that draft and in-review cases are counted as under investigation."""
        Case.objects.create(
            case_type=CaseType.CORRUPTION, state=CaseState.DRAFT, title="Draft Case 1"
        )
        Case.objects.create(
            case_type=CaseType.CORRUPTION, state=CaseState.DRAFT, title="Draft Case 2"
        )
        Case.objects.create(
            case_type=CaseType.CORRUPTION,
            state=CaseState.IN_REVIEW,
            title="In Review Case",
        )
        Case.objects.create(
            case_type=CaseType.CORRUPTION,
            state=CaseState.PUBLISHED,
            title="Published Case",
        )

        response = api_client.get("/api/statistics/")
        data = response.json()

        assert data["cases_under_investigation"] == 3  # 2 DRAFT + 1 IN_REVIEW

    def test_cases_under_investigation_excludes_published_and_closed(self, api_client):
        """Test that only DRAFT and IN_REVIEW cases count as under investigation."""
        draft_case = Case.objects.create(
            case_type=CaseType.CORRUPTION,
            state=CaseState.DRAFT,
            title="Draft Investigation Case",
        )
        review_case = Case.objects.create(
            case_type=CaseType.CORRUPTION,
            state=CaseState.IN_REVIEW,
            title="Review Investigation Case",
        )
        Case.objects.create(
            case_type=CaseType.CORRUPTION,
            state=CaseState.PUBLISHED,
            title="Published Case",
        )
        Case.objects.create(
            case_type=CaseType.CORRUPTION,
            state=CaseState.CLOSED,
            title="Closed Case",
        )

        response = api_client.get("/api/statistics/")
        data = response.json()

        assert draft_case.case_id != review_case.case_id
        assert data["cases_under_investigation"] == 2

    def test_cases_closed_count(self, api_client):
        """Test that closed cases are counted correctly."""
        Case.objects.create(
            case_type=CaseType.CORRUPTION, state=CaseState.CLOSED, title="Closed Case 1"
        )
        Case.objects.create(
            case_type=CaseType.CORRUPTION, state=CaseState.CLOSED, title="Closed Case 2"
        )
        Case.objects.create(
            case_type=CaseType.CORRUPTION,
            state=CaseState.PUBLISHED,
            title="Published Case",
        )

        response = api_client.get("/api/statistics/")
        data = response.json()

        assert data["cases_closed"] == 2

    def test_entities_tracked_count(self, api_client):
        """Test that all entities in the system are counted."""
        JawafEntity.objects.create(nes_id="entity:person/test1")
        JawafEntity.objects.create(nes_id="entity:person/test2")
        JawafEntity.objects.create(display_name="Custom Entity")

        response = api_client.get("/api/statistics/")
        data = response.json()

        assert data["entities_tracked"] == 3

    def test_statistics_with_mixed_states(self, api_client):
        """Test statistics with cases in all different states."""
        # Create entities
        entity1 = JawafEntity.objects.create(nes_id="entity:person/test1")
        JawafEntity.objects.create(nes_id="entity:person/test2")

        # Create cases in different states
        published_case = Case.objects.create(
            case_type=CaseType.CORRUPTION,
            state=CaseState.PUBLISHED,
            title="Published Case",
        )
        published_case.alleged_entities.add(entity1)

        Case.objects.create(
            case_type=CaseType.CORRUPTION, state=CaseState.DRAFT, title="Draft Case"
        )
        Case.objects.create(
            case_type=CaseType.CORRUPTION,
            state=CaseState.IN_REVIEW,
            title="In Review Case",
        )
        Case.objects.create(
            case_type=CaseType.CORRUPTION, state=CaseState.CLOSED, title="Closed Case"
        )

        response = api_client.get("/api/statistics/")
        data = response.json()

        assert data["published_cases"] == 1
        assert data["cases_under_investigation"] == 2
        assert data["cases_closed"] == 1
        assert data["entities_tracked"] == 2


@pytest.mark.django_db
class TestStatisticsCaching:
    """Test suite for statistics caching behavior."""

    def test_statistics_are_cached(self, api_client):
        """Test that statistics are cached and reused."""
        # Create initial case
        Case.objects.create(
            case_type=CaseType.CORRUPTION,
            state=CaseState.PUBLISHED,
            title="Initial Case",
        )

        # First request - should calculate and cache
        response1 = api_client.get("/api/statistics/")
        data1 = response1.json()
        assert data1["published_cases"] == 1

        # Create another case
        Case.objects.create(
            case_type=CaseType.CORRUPTION, state=CaseState.PUBLISHED, title="New Case"
        )

        # Second request - should return cached data (still 1)
        response2 = api_client.get("/api/statistics/")
        data2 = response2.json()
        assert data2["published_cases"] == 1  # Cached value

        # Verify last_updated is the same (cached)
        assert data1["last_updated"] == data2["last_updated"]

    def test_cache_refresh_after_clear(self, api_client):
        """Test that statistics are recalculated after cache is cleared."""
        # Create initial case
        Case.objects.create(
            case_type=CaseType.CORRUPTION,
            state=CaseState.PUBLISHED,
            title="Initial Case",
        )

        # First request
        response1 = api_client.get("/api/statistics/")
        data1 = response1.json()
        assert data1["published_cases"] == 1

        # Create another case
        Case.objects.create(
            case_type=CaseType.CORRUPTION, state=CaseState.PUBLISHED, title="New Case"
        )

        # Clear cache
        cache.clear()

        # Request after cache clear - should reflect new case
        response2 = api_client.get("/api/statistics/")
        data2 = response2.json()
        assert data2["published_cases"] == 2

    def test_cache_key_is_consistent(self, api_client):
        """Test that the same cache key is used across requests."""
        # First request
        response1 = api_client.get("/api/statistics/")
        data1 = response1.json()

        # Second request
        response2 = api_client.get("/api/statistics/")
        data2 = response2.json()

        # Should return identical data (from cache)
        assert data1 == data2

    def test_cache_stores_complete_response(self, api_client):
        """Test that all fields are cached correctly."""
        JawafEntity.objects.create(nes_id="entity:person/test")
        Case.objects.create(
            case_type=CaseType.CORRUPTION, state=CaseState.PUBLISHED, title="Test Case"
        )

        # First request - caches data
        response1 = api_client.get("/api/statistics/")
        data1 = response1.json()

        # Second request - from cache
        response2 = api_client.get("/api/statistics/")
        data2 = response2.json()

        # All fields should match
        assert data1["published_cases"] == data2["published_cases"]
        assert data1["entities_tracked"] == data2["entities_tracked"]
        assert data1["cases_under_investigation"] == data2["cases_under_investigation"]
        assert data1["cases_closed"] == data2["cases_closed"]
        assert data1["last_updated"] == data2["last_updated"]


@pytest.mark.django_db
class TestStatisticsPerformance:
    """Test suite for statistics performance characteristics."""

    def test_statistics_with_large_dataset(self, api_client):
        """Test statistics calculation with a larger dataset."""
        # Create multiple entities
        for i in range(10):
            JawafEntity.objects.create(nes_id=f"entity:person/test{i}")

        # Create multiple cases in different states
        for i in range(5):
            Case.objects.create(
                case_type=CaseType.CORRUPTION,
                state=CaseState.PUBLISHED,
                title=f"Published Case {i}",
            )

        for i in range(3):
            Case.objects.create(
                case_type=CaseType.CORRUPTION,
                state=CaseState.DRAFT,
                title=f"Draft Case {i}",
            )

        for i in range(2):
            Case.objects.create(
                case_type=CaseType.CORRUPTION,
                state=CaseState.CLOSED,
                title=f"Closed Case {i}",
            )

        response = api_client.get("/api/statistics/")
        data = response.json()

        assert data["published_cases"] == 5
        assert data["cases_under_investigation"] == 3
        assert data["cases_closed"] == 2
        assert data["entities_tracked"] == 10

    def test_multiple_concurrent_requests(self, api_client):
        """Test that multiple requests return consistent results."""
        Case.objects.create(
            case_type=CaseType.CORRUPTION, state=CaseState.PUBLISHED, title="Test Case"
        )

        # Make multiple requests
        responses = [api_client.get("/api/statistics/") for _ in range(5)]

        # All should return 200
        assert all(r.status_code == 200 for r in responses)

        # All should return same data (from cache after first request)
        data_list = [r.json() for r in responses]
        first_data = data_list[0]
        assert all(d == first_data for d in data_list)
