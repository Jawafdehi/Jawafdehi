"""
Unit tests for NESQ Pydantic payload validators.

Feature: nes-queue-system
Task 10.2: Test Pydantic Validators

Tests cover:
    - AddNamePayload with valid English, Nepali, and bilingual names
    - AddNamePayload rejection of missing languages, invalid entity_id, invalid kind
    - is_misspelling flag defaults and explicit values
    - validate_action_payload dispatch for supported and unsupported actions
    - Validation uses the NES Name model (NameKind, NameParts) directly
"""

import pytest
from pydantic import ValidationError

from nesq.validators import AddNamePayload, CreateEntityPayload, validate_action_payload
from nes.core.models.base import NameKind

# ============================================================================
# Valid entity IDs for testing — must pass NES validate_entity_id()
# ============================================================================

VALID_PERSON_ID = "entity:person/sher-bahadur-deuba"
VALID_ORG_ID = "entity:organization/nepal-rastra-bank"


# ============================================================================
# AddNamePayload — Valid payloads
# ============================================================================


class TestAddNamePayloadValid:
    """Tests for AddNamePayload with valid inputs."""

    def test_valid_english_name(self):
        """AddNamePayload accepts a name with only English language data."""
        payload = AddNamePayload(
            entity_id=VALID_PERSON_ID,
            name={"kind": "ALIAS", "en": {"full": "S.B. Deuba"}},
        )
        assert payload.entity_id == VALID_PERSON_ID
        assert payload.name.kind == NameKind.ALIAS
        assert payload.name.en.full == "S.B. Deuba"
        assert payload.is_misspelling is False

    def test_valid_nepali_name(self):
        """AddNamePayload accepts a name with only Nepali language data."""
        payload = AddNamePayload(
            entity_id=VALID_PERSON_ID,
            name={"kind": "PRIMARY", "ne": {"full": "शेर बहादुर देउवा"}},
        )
        assert payload.name.ne.full == "शेर बहादुर देउवा"
        assert payload.is_misspelling is False

    def test_valid_bilingual_name(self):
        """AddNamePayload accepts a name with both English and Nepali data."""
        payload = AddNamePayload(
            entity_id=VALID_PERSON_ID,
            name={
                "kind": "PRIMARY",
                "en": {"full": "Sher Bahadur Deuba"},
                "ne": {"full": "शेर बहादुर देउवा"},
            },
        )
        assert payload.name.en is not None
        assert payload.name.ne is not None

    def test_is_misspelling_true(self):
        """AddNamePayload accepts is_misspelling=True explicitly."""
        payload = AddNamePayload(
            entity_id=VALID_PERSON_ID,
            name={"kind": "ALIAS", "ne": {"full": "शेर बहादुर देउबा"}},
            is_misspelling=True,
        )
        assert payload.is_misspelling is True

    def test_is_misspelling_defaults_to_false(self):
        """is_misspelling defaults to False when not provided."""
        payload = AddNamePayload(
            entity_id=VALID_PERSON_ID,
            name={"kind": "ALIAS", "en": {"full": "S.B. Deuba"}},
        )
        assert payload.is_misspelling is False

    @pytest.mark.parametrize("kind", [k.value for k in NameKind])
    def test_all_valid_name_kinds(self, kind):
        """AddNamePayload accepts each valid NameKind from NES."""
        payload = AddNamePayload(
            entity_id=VALID_PERSON_ID,
            name={"kind": kind, "en": {"full": "Test Name"}},
        )
        assert payload.name.kind.value == kind

    def test_valid_organization_entity_id(self):
        """AddNamePayload accepts organization entity IDs."""
        payload = AddNamePayload(
            entity_id=VALID_ORG_ID,
            name={"kind": "ALIAS", "en": {"full": "NRB"}},
        )
        assert payload.entity_id == VALID_ORG_ID

    def test_name_with_optional_parts(self):
        """AddNamePayload accepts name with optional NameParts fields."""
        payload = AddNamePayload(
            entity_id=VALID_PERSON_ID,
            name={
                "kind": "PRIMARY",
                "en": {
                    "full": "Sher Bahadur Deuba",
                    "given": "Sher Bahadur",
                    "family": "Deuba",
                },
            },
        )
        assert payload.name.en.given == "Sher Bahadur"
        assert payload.name.en.family == "Deuba"


# ============================================================================
# AddNamePayload — Invalid payloads
# ============================================================================


class TestAddNamePayloadInvalid:
    """Tests for AddNamePayload with invalid inputs."""

    def test_missing_both_languages(self):
        """AddNamePayload rejects a name with neither 'en' nor 'ne'."""
        with pytest.raises(ValidationError) as exc_info:
            AddNamePayload(
                entity_id=VALID_PERSON_ID,
                name={"kind": "ALIAS"},
            )
        errors = exc_info.value.errors()
        assert any("en" in str(e["msg"]) or "ne" in str(e["msg"]) for e in errors)

    def test_missing_name_kind(self):
        """AddNamePayload rejects a name without 'kind' key."""
        with pytest.raises(ValidationError) as exc_info:
            AddNamePayload(
                entity_id=VALID_PERSON_ID,
                name={"en": {"full": "Test Name"}},
            )
        errors = exc_info.value.errors()
        assert any("kind" in str(e["loc"]) for e in errors)

    def test_invalid_name_kind(self):
        """AddNamePayload rejects an invalid name.kind value."""
        with pytest.raises(ValidationError):
            AddNamePayload(
                entity_id=VALID_PERSON_ID,
                name={"kind": "NICKNAME", "en": {"full": "Test"}},
            )

    def test_invalid_entity_id_format(self):
        """AddNamePayload rejects a malformed entity ID."""
        with pytest.raises(ValidationError) as exc_info:
            AddNamePayload(
                entity_id="not-a-valid-id",
                name={"kind": "ALIAS", "en": {"full": "Test"}},
            )
        errors = exc_info.value.errors()
        assert any("entity_id" in str(e["loc"]) for e in errors)

    def test_empty_entity_id(self):
        """AddNamePayload rejects an empty string entity ID."""
        with pytest.raises(ValidationError):
            AddNamePayload(
                entity_id="",
                name={"kind": "ALIAS", "en": {"full": "Test"}},
            )

    def test_missing_entity_id(self):
        """AddNamePayload rejects payload without entity_id."""
        with pytest.raises(ValidationError) as exc_info:
            AddNamePayload(
                name={"kind": "ALIAS", "en": {"full": "Test"}},
            )
        errors = exc_info.value.errors()
        assert any("entity_id" in str(e["loc"]) for e in errors)

    def test_missing_name(self):
        """AddNamePayload rejects payload without name."""
        with pytest.raises(ValidationError) as exc_info:
            AddNamePayload(entity_id=VALID_PERSON_ID)
        errors = exc_info.value.errors()
        assert any("name" in str(e["loc"]) for e in errors)

    def test_empty_name_dict(self):
        """AddNamePayload rejects an empty name dictionary (missing kind)."""
        with pytest.raises(ValidationError):
            AddNamePayload(
                entity_id=VALID_PERSON_ID,
                name={},
            )

    def test_name_rejects_extra_fields(self):
        """NES Name model uses extra='forbid', so unknown fields are rejected."""
        with pytest.raises(ValidationError):
            AddNamePayload(
                entity_id=VALID_PERSON_ID,
                name={
                    "kind": "ALIAS",
                    "en": {"full": "Test"},
                    "unknown_field": "value",
                },
            )

    def test_name_parts_missing_full(self):
        """NameParts requires 'full' — rejects name parts without it."""
        with pytest.raises(ValidationError):
            AddNamePayload(
                entity_id=VALID_PERSON_ID,
                name={
                    "kind": "PRIMARY",
                    "en": {"given": "Sher Bahadur", "family": "Deuba"},
                },
            )


# ============================================================================
# validate_action_payload — dispatch function
# ============================================================================


class TestValidateActionPayload:
    """Tests for the validate_action_payload dispatch function."""

    def test_add_name_action_returns_payload(self):
        """validate_action_payload returns AddNamePayload for ADD_NAME."""
        result = validate_action_payload(
            action="ADD_NAME",
            payload={
                "entity_id": VALID_PERSON_ID,
                "name": {"kind": "ALIAS", "en": {"full": "S.B. Deuba"}},
            },
        )
        assert isinstance(result, AddNamePayload)
        assert result.entity_id == VALID_PERSON_ID

    def test_add_name_with_invalid_payload_raises(self):
        """validate_action_payload raises ValidationError for invalid ADD_NAME payload."""
        with pytest.raises(ValidationError):
            validate_action_payload(
                action="ADD_NAME",
                payload={"entity_id": "bad-id"},
            )

    def test_validate_action_payload_create_entity_support(self):
        """validate_action_payload now supports CREATE_ENTITY."""
        # This test is updated to reflect CREATE_ENTITY support
        result = validate_action_payload(
            action="CREATE_ENTITY",
            payload={
                "entity_data": {
                    "entity_prefix": "person",
                    "slug": "test-person",
                    "names": [{"kind": "PRIMARY", "en": {"full": "Test Person"}}],
                },
            },
        )
        assert isinstance(result, CreateEntityPayload)

    def test_update_entity_action_unsupported(self):
        """validate_action_payload raises ValueError for UPDATE_ENTITY (not in MVP)."""
        with pytest.raises(ValueError, match="not supported"):
            validate_action_payload(
                action="UPDATE_ENTITY",
                payload={},
            )

    def test_unknown_action_unsupported(self):
        """validate_action_payload raises ValueError for arbitrary unknown actions."""
        with pytest.raises(ValueError, match="not supported"):
            validate_action_payload(
                action="DELETE_ENTITY",
                payload={},
            )


# ============================================================================
# CreateEntityPayload — Valid payloads
# ============================================================================


class TestCreateEntityPayloadValid:
    """Tests for CreateEntityPayload with valid inputs."""

    def test_valid_person_minimal(self):
        """CreateEntityPayload accepts minimal person entity data."""
        payload = CreateEntityPayload(
            entity_data={
                "entity_prefix": "person",
                "slug": "sher-bahadur-deuba",
                "names": [
                    {
                        "kind": "PRIMARY",
                        "en": {"full": "Sher Bahadur Deuba"},
                        "ne": {"full": "शेर बहादुर देउबा"},
                    }
                ],
            },
        )
        assert payload.entity_data["entity_prefix"] == "person"
        assert payload.entity_data["slug"] == "sher-bahadur-deuba"
        assert len(payload.entity_data["names"]) == 1

    def test_valid_person_with_details(self):
        """CreateEntityPayload accepts person with personal_details."""
        payload = CreateEntityPayload(
            entity_data={
                "entity_prefix": "person",
                "slug": "test-person",
                "names": [{"kind": "PRIMARY", "en": {"full": "Test Person"}}],
                "tags": ["politician", "test"],
                "personal_details": {
                    "gender": "male",
                    "birth_date": "1990-01-01",
                },
            },
        )
        assert payload.entity_data["personal_details"]["gender"] == "male"
        assert payload.entity_data["tags"] == ["politician", "test"]

    def test_valid_organization_with_subtype(self):
        """CreateEntityPayload accepts organization with multi-level prefix."""
        payload = CreateEntityPayload(
            entity_data={
                "entity_prefix": "organization/political_party",
                "slug": "nepali-congress",
                "names": [
                    {
                        "kind": "PRIMARY",
                        "en": {"full": "Nepali Congress"},
                        "ne": {"full": "नेपाली कांग्रेस"},
                    }
                ],
            },
        )
        assert payload.entity_data["entity_prefix"] == "organization/political_party"

    def test_valid_with_multiple_names(self):
        """CreateEntityPayload accepts multiple names including PRIMARY."""
        payload = CreateEntityPayload(
            entity_data={
                "entity_prefix": "person",
                "slug": "test-person",
                "names": [
                    {"kind": "PRIMARY", "en": {"full": "Test Person"}},
                    {"kind": "ALIAS", "en": {"full": "T.P."}},
                    {"kind": "ALTERNATE", "ne": {"full": "टेस्ट व्यक्ति"}},
                ],
            },
        )
        assert len(payload.entity_data["names"]) == 3

    def test_valid_with_optional_fields(self):
        """CreateEntityPayload accepts all optional entity fields."""
        payload = CreateEntityPayload(
            entity_data={
                "entity_prefix": "person",
                "slug": "test-person",
                "names": [{"kind": "PRIMARY", "en": {"full": "Test Person"}}],
                "tags": ["test", "example"],
                "short_description": {"en": {"value": "A test person"}},
                "description": {"en": {"value": "Detailed description"}},
                "contacts": [{"type": "EMAIL", "value": "test@example.com"}],
                "identifiers": [
                    {
                        "scheme": "wikipedia",
                        "value": "Test_Person",
                        "url": "https://en.wikipedia.org/wiki/Test_Person",
                    }
                ],
                "attributes": {"custom_field": "custom_value"},
                "pictures": [
                    {
                        "type": "thumb",
                        "url": "https://example.com/thumb.jpg",
                        "width": 100,
                        "height": 100,
                    }
                ],
            },
        )
        assert payload.entity_data["tags"] == ["test", "example"]
        assert payload.entity_data["contacts"] is not None
        assert len(payload.entity_data["contacts"]) == 1
        assert payload.entity_data["identifiers"] is not None
        assert payload.entity_data["attributes"] == {"custom_field": "custom_value"}

    def test_valid_location_entity(self):
        """CreateEntityPayload accepts location entity with multi-level prefix."""
        payload = CreateEntityPayload(
            entity_data={
                "entity_prefix": "location/district",
                "slug": "kathmandu",
                "names": [
                    {
                        "kind": "PRIMARY",
                        "en": {"full": "Kathmandu"},
                        "ne": {"full": "काठमाडौं"},
                    }
                ],
            },
        )
        assert payload.entity_data["entity_prefix"] == "location/district"


# ============================================================================
# CreateEntityPayload — Invalid payloads
# ============================================================================


class TestCreateEntityPayloadInvalid:
    """Tests for CreateEntityPayload with invalid inputs."""

    def test_missing_primary_name(self):
        """CreateEntityPayload rejects entity_data without PRIMARY name."""
        with pytest.raises(ValidationError) as exc_info:
            CreateEntityPayload(
                entity_data={
                    "entity_prefix": "person",
                    "slug": "test-person",
                    "names": [{"kind": "ALIAS", "en": {"full": "Test Alias"}}],
                },
            )
        errors = exc_info.value.errors()
        assert any("PRIMARY" in str(e) for e in errors)

    def test_missing_entity_prefix(self):
        """CreateEntityPayload rejects entity_data without entity_prefix field."""
        with pytest.raises(ValidationError) as exc_info:
            CreateEntityPayload(
                entity_data={
                    "slug": "test-person",
                    "names": [{"kind": "PRIMARY", "en": {"full": "Test Person"}}],
                },
            )
        errors = exc_info.value.errors()
        assert any("entity_prefix" in str(e).lower() for e in errors)

    def test_missing_slug(self):
        """CreateEntityPayload rejects entity_data without slug."""
        with pytest.raises(ValidationError) as exc_info:
            CreateEntityPayload(
                entity_data={
                    "entity_prefix": "person",
                    "names": [{"kind": "PRIMARY", "en": {"full": "Test Person"}}],
                },
            )
        errors = exc_info.value.errors()
        assert any("slug" in str(e).lower() for e in errors)

    def test_missing_names(self):
        """CreateEntityPayload rejects entity_data without names."""
        with pytest.raises(ValidationError) as exc_info:
            CreateEntityPayload(
                entity_data={
                    "entity_prefix": "person",
                    "slug": "test-person",
                },
            )
        errors = exc_info.value.errors()
        assert any("names" in str(e).lower() for e in errors)

    def test_empty_names_list(self):
        """CreateEntityPayload rejects entity_data with empty names list."""
        with pytest.raises(ValidationError) as exc_info:
            CreateEntityPayload(
                entity_data={
                    "entity_prefix": "person",
                    "slug": "test-person",
                    "names": [],
                },
            )
        errors = exc_info.value.errors()
        assert any("names" in str(e).lower() for e in errors)

    def test_missing_entity_data(self):
        """CreateEntityPayload rejects payload without entity_data."""
        with pytest.raises(ValidationError) as exc_info:
            CreateEntityPayload()
        errors = exc_info.value.errors()
        assert any("entity_data" in str(e["loc"]) for e in errors)

    def test_invalid_entity_prefix(self):
        """CreateEntityPayload rejects invalid entity_prefix value."""
        with pytest.raises(ValidationError):
            CreateEntityPayload(
                entity_data={
                    "entity_prefix": "invalid_type",
                    "slug": "test-person",
                    "names": [{"kind": "PRIMARY", "en": {"full": "Test Person"}}],
                },
            )

    def test_invalid_slug_format(self):
        """CreateEntityPayload rejects invalid slug format (uppercase, spaces)."""
        with pytest.raises(ValidationError):
            CreateEntityPayload(
                entity_data={
                    "entity_prefix": "person",
                    "slug": "Invalid Slug With Spaces",
                    "names": [{"kind": "PRIMARY", "en": {"full": "Test Person"}}],
                },
            )

    def test_invalid_contact_format(self):
        """CreateEntityPayload rejects invalid contact data."""
        with pytest.raises(ValidationError):
            CreateEntityPayload(
                entity_data={
                    "entity_prefix": "person",
                    "slug": "test-person",
                    "names": [{"kind": "PRIMARY", "en": {"full": "Test Person"}}],
                    "contacts": [{"type": "EMAIL", "value": "not-an-email"}],
                },
            )

    def test_rejects_version_summary(self):
        """CreateEntityPayload rejects entity_data with version_summary."""
        with pytest.raises(ValidationError) as exc_info:
            CreateEntityPayload(
                entity_data={
                    "entity_prefix": "person",
                    "slug": "test-person",
                    "names": [{"kind": "PRIMARY", "en": {"full": "Test Person"}}],
                    "version_summary": {
                        "entity_or_relationship_id": "entity:person/test-person",
                        "type": "ENTITY",
                        "version_number": 1,
                        "author": {"slug": "test"},
                        "change_description": "test",
                        "created_at": "2024-01-01T00:00:00Z",
                    },
                },
            )
        errors = exc_info.value.errors()
        assert any("version_summary" in str(e).lower() for e in errors)

    def test_rejects_created_at(self):
        """CreateEntityPayload rejects entity_data with created_at."""
        with pytest.raises(ValidationError) as exc_info:
            CreateEntityPayload(
                entity_data={
                    "entity_prefix": "person",
                    "slug": "test-person",
                    "names": [{"kind": "PRIMARY", "en": {"full": "Test Person"}}],
                    "created_at": "2024-01-01T00:00:00Z",
                },
            )
        errors = exc_info.value.errors()
        assert any("created_at" in str(e).lower() for e in errors)
