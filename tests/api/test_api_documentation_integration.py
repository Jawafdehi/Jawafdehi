"""
Integration tests for API documentation with real data.

Validates that the OpenAPI documentation works correctly with actual cases and sources.
"""

import pytest
from django.test import Client
from django.urls import reverse

from cases.models import CaseState, CaseType
from tests.conftest import (
    create_case_with_entities,
    create_document_source_with_entities,
)


@pytest.mark.django_db
class TestAPIDocumentationIntegration:
    """Integration tests for API documentation with real data."""

    @pytest.fixture
    def published_case(self):
        """Create a published case for testing."""
        case = create_case_with_entities(
            case_id="case-test123",
            case_type=CaseType.CORRUPTION,
            state=CaseState.PUBLISHED,
            title="Test Corruption Case",
            alleged_entities=["entity:person/test-person"],
            related_entities=["entity:organization/test-ministry"],
            locations=["entity:location/kathmandu"],
            tags=["corruption", "test"],
            description="Test case description",
            key_allegations=["Test allegation 1", "Test allegation 2"],
            timeline=[
                {
                    "date": "2024-01-15",
                    "title": "Event 1",
                    "description": "Event description",
                }
            ],
            evidence=[{"source_id": "source:test:123", "description": "Test evidence"}],
            versionInfo={
                "action": "published",
                "datetime": "2024-01-15T10:00:00Z",
            },
        )
        return case

    @pytest.fixture
    def document_source(self, published_case):
        """Create a document source referenced by a published case."""
        source = create_document_source_with_entities(
            source_id="source:test:123",
            title="Test Source",
            description="Test source description",
            url="https://example.com/test.pdf",
            related_entity_ids=["entity:person/test-person"],
        )
        # Add evidence to the published case that references this source
        published_case.evidence = [
            {"source_id": source.source_id, "description": "Test evidence"}
        ]
        published_case.save()
        return source

    def test_swagger_ui_loads_with_real_data(self, published_case, document_source):
        """Test that Swagger UI loads successfully with real data."""
        client = Client()
        response = client.get(reverse("swagger-ui"))

        assert response.status_code == 200
        assert "text/html" in response["Content-Type"]

        # Verify the page contains references to the API
        content = response.content.decode("utf-8")
        assert "Jawafdehi" in content or "swagger" in content.lower()

    def test_schema_reflects_actual_case_structure(self, published_case):
        """Test that the schema accurately reflects the case model structure."""
        client = Client()
        response = client.get(reverse("schema"))

        import yaml

        schema = yaml.safe_load(response.content)

        # Verify Case schema includes all expected fields
        case_schema = schema["components"]["schemas"]["Case"]
        expected_fields = [
            "id",
            "case_id",
            "case_type",
            "title",
            "alleged_entities",
            "related_entities",
            "locations",
            "tags",
            "description",
            "key_allegations",
            "timeline",
            "evidence",
            "notes",
            "versionInfo",
        ]

        for field in expected_fields:
            assert (
                field in case_schema["properties"]
            ), f"Field {field} missing from schema"

    def test_schema_reflects_actual_source_structure(self, document_source):
        """Test that the schema accurately reflects the source model structure."""
        client = Client()
        response = client.get(reverse("schema"))

        import yaml

        schema = yaml.safe_load(response.content)

        # Verify DocumentSource schema includes all expected fields
        source_schema = schema["components"]["schemas"]["DocumentSource"]
        expected_fields = [
            "id",
            "source_id",
            "title",
            "description",
            "url",
            "related_entities",
        ]

        for field in expected_fields:
            assert (
                field in source_schema["properties"]
            ), f"Field {field} missing from schema"

    def test_api_endpoints_match_schema(self, published_case, document_source):
        """Test that actual API responses match the schema structure."""
        client = Client()

        # Get the schema
        schema_response = client.get(reverse("schema"))
        import yaml

        schema = yaml.safe_load(schema_response.content)

        # Get actual API response
        api_response = client.get("/api/cases/")
        assert api_response.status_code == 200

        api_data = api_response.json()
        assert "results" in api_data
        assert len(api_data["results"]) > 0

        # Verify the response structure matches schema
        case_data = api_data["results"][0]
        case_schema = schema["components"]["schemas"]["Case"]

        # Check that all schema properties exist in the response
        for prop in case_schema["properties"]:
            assert prop in case_data, f"Property {prop} from schema not in API response"

    def test_case_detail_includes_notes(self, published_case):
        """Test that case detail endpoint includes notes field as documented."""
        client = Client()

        # Get the schema
        schema_response = client.get(reverse("schema"))
        import yaml

        schema = yaml.safe_load(schema_response.content)

        # Verify CaseDetail schema includes notes
        case_detail_schema = schema["components"]["schemas"]["CaseDetail"]
        assert "notes" in case_detail_schema["properties"]

        # Get actual API response
        api_response = client.get(f"/api/cases/{published_case.id}/")
        assert api_response.status_code == 200

        case_data = api_response.json()
        assert "notes" in case_data

    def test_schema_documents_filtering_parameters(self):
        """Test that the schema properly documents filtering parameters."""
        client = Client()
        response = client.get(reverse("schema"))

        import yaml

        schema = yaml.safe_load(response.content)

        # Get the cases list endpoint
        cases_list = schema["paths"]["/api/cases/"]["get"]

        # Verify filtering parameters are documented
        param_names = [p["name"] for p in cases_list["parameters"]]
        assert "case_type" in param_names
        assert "tags" in param_names
        assert "search" in param_names
        assert "page" in param_names

        # Verify case_type has enum values
        case_type_param = next(
            p for p in cases_list["parameters"] if p["name"] == "case_type"
        )
        assert "enum" in case_type_param["schema"]
        assert "CORRUPTION" in case_type_param["schema"]["enum"]
        assert "PROMISES" in case_type_param["schema"]["enum"]
