"""
Tests for OpenAPI documentation endpoints.

Validates that the API documentation is properly configured and accessible.
"""

import pytest

from django.test import Client
from django.urls import reverse


@pytest.mark.django_db
class TestOpenAPIDocumentation:
    """Test OpenAPI schema and documentation endpoints."""

    def test_schema_endpoint_accessible(self):
        """Test that the OpenAPI schema endpoint is accessible."""
        client = Client()
        response = client.get(reverse("schema"))

        assert response.status_code == 200
        assert "application/vnd.oai.openapi" in response["Content-Type"]

    def test_schema_contains_api_info(self):
        """Test that the schema contains proper API information."""
        client = Client()
        response = client.get(reverse("schema"))

        # Parse the YAML response
        import yaml

        schema = yaml.safe_load(response.content)

        # Verify basic structure
        assert "openapi" in schema
        assert "info" in schema
        assert "paths" in schema
        assert "components" in schema

        # Verify API info
        assert schema["info"]["title"] == "Jawafdehi Public Accountability API"
        assert schema["info"]["version"] == "1.0.0"
        assert "description" in schema["info"]

    def test_schema_contains_case_endpoints(self):
        """Test that the schema documents case endpoints."""
        client = Client()
        response = client.get(reverse("schema"))

        import yaml

        schema = yaml.safe_load(response.content)

        # Verify case endpoints are documented
        assert "/api/cases/" in schema["paths"]
        assert "/api/cases/{id}/" in schema["paths"]
        assert "post" in schema["paths"]["/api/cases/"]

        # Verify list endpoint has proper documentation
        cases_list = schema["paths"]["/api/cases/"]["get"]
        assert "summary" in cases_list
        assert "description" in cases_list
        assert "parameters" in cases_list

        # Verify create endpoint has proper documentation
        cases_create = schema["paths"]["/api/cases/"]["post"]
        assert "summary" in cases_create
        assert "description" in cases_create
        assert "requestBody" in cases_create

        # Verify parameters are documented
        param_names = [p["name"] for p in cases_list["parameters"]]
        assert "case_type" in param_names
        assert "tags" in param_names
        assert "search" in param_names
        assert "page" in param_names

    def test_schema_contains_source_endpoints(self):
        """Test that the schema documents source endpoints."""
        client = Client()
        response = client.get(reverse("schema"))

        import yaml

        schema = yaml.safe_load(response.content)

        # Verify source endpoints are documented
        assert "/api/sources/" in schema["paths"]
        assert "/api/sources/{id}/" in schema["paths"]

    def test_schema_contains_component_schemas(self):
        """Test that the schema contains component definitions."""
        client = Client()
        response = client.get(reverse("schema"))

        import yaml

        schema = yaml.safe_load(response.content)

        # Verify component schemas exist
        assert "schemas" in schema["components"]
        assert "Case" in schema["components"]["schemas"]
        assert "CaseDetail" in schema["components"]["schemas"]
        assert "DocumentSource" in schema["components"]["schemas"]

        # Verify Case schema has proper fields
        case_schema = schema["components"]["schemas"]["Case"]
        assert "properties" in case_schema
        assert "case_id" in case_schema["properties"]
        assert "case_type" in case_schema["properties"]
        assert "title" in case_schema["properties"]
        assert "entities" in case_schema["properties"]
        assert "evidence" in case_schema["properties"]
        assert "timeline" in case_schema["properties"]

    def test_swagger_ui_accessible(self):
        """Test that the Swagger UI is accessible."""
        client = Client()
        response = client.get(reverse("swagger-ui"))

        assert response.status_code == 200
        assert "text/html" in response["Content-Type"]

    def test_schema_has_tags(self):
        """Test that the schema has proper tags for organization."""
        client = Client()
        response = client.get(reverse("schema"))

        import yaml

        schema = yaml.safe_load(response.content)

        # Verify endpoints are tagged
        cases_list = schema["paths"]["/api/cases/"]["get"]
        assert "tags" in cases_list
        assert "cases" in cases_list["tags"]

        sources_list = schema["paths"]["/api/sources/"]["get"]
        assert "tags" in sources_list
        assert "sources" in sources_list["tags"]

    def test_schema_documents_case_type_enum(self):
        """Test that the CaseType enum is properly documented."""
        client = Client()
        response = client.get(reverse("schema"))

        import yaml

        schema = yaml.safe_load(response.content)

        # Find CaseTypeEnum in components
        assert "CaseTypeEnum" in schema["components"]["schemas"]
        case_type_enum = schema["components"]["schemas"]["CaseTypeEnum"]

        # Verify enum values
        assert "enum" in case_type_enum
        assert "CORRUPTION" in case_type_enum["enum"]
        assert "PROMISES" in case_type_enum["enum"]
