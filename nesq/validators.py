"""Pydantic payload validators for the NES Queue System (NESQ).

Provides action-specific payload validation using Pydantic v2 models.
Each queue action (e.g., ADD_NAME) has a corresponding Pydantic model that
validates the payload structure before a NESQueueItem is created.

MVP: Only AddNamePayload is supported. CREATE_ENTITY and UPDATE_ENTITY
will be added in future releases.

See .kiro/specs/nes-queue-system/ for full specification.
"""

from typing import Any, Dict

from pydantic import BaseModel, Field, ValidationError, field_validator

from nes.core.identifiers.validators import validate_entity_id
from nes.core.models.base import Name
from nes.core.utils.entity_utils import entity_from_dict


class AddNamePayload(BaseModel):
    """Payload for ADD_NAME action — adds a name or misspelling to an existing entity.

    MVP: This is the only supported action in the initial release.
    Future: CREATE_ENTITY and UPDATE_ENTITY will be added later.

    Uses the NES ``Name`` model directly for name validation, ensuring
    consistency with the NES data schema (NameKind enum, NameParts structure,
    and at-least-one-language constraint).

    Example payload::

        {
            "entity_id": "entity:person/sher-bahadur-deuba",
            "name": {
                "kind": "ALIAS",
                "en": {"full": "S.B. Deuba"}
            },
            "is_misspelling": false
        }
    """

    entity_id: str = Field(
        ...,
        description="NES entity ID to add the name to (e.g. 'entity:person/sher-bahadur-deuba').",
    )
    name: Name = Field(
        ...,
        description="Name object validated by the NES Name model (kind + at least one language).",
    )
    is_misspelling: bool = Field(
        default=False,
        description=(
            "If True, the name is added to the entity's misspelled_names list. "
            "If False (default), it is added to the regular names list."
        ),
    )

    @field_validator("entity_id")
    @classmethod
    def validate_entity_id_format(cls, v: str) -> str:
        """Validate entity_id using the NES validator.

        Delegates to ``nes.core.identifiers.validators.validate_entity_id``
        which checks type, subtype, and slug format/length constraints.

        Raises:
            ValueError: If the entity ID format is invalid.
        """
        validate_entity_id(v)
        return v


class CreateEntityPayload(BaseModel):
    """Payload for CREATE_ENTITY action — creates a new entity in the NES database.

    The entity_data field is validated by delegating to the appropriate NES
    entity model (Person, Organization, Location, Project) based on entity_prefix.
    This ensures that as the entity schema evolves, the validation stays in sync
    with the NES models.

    Example payload::

        {
            "entity_data": {
                "entity_prefix": "person",
                "slug": "sher-bahadur-deuba",
                "names": [
                    {
                        "kind": "PRIMARY",
                        "en": {"full": "Sher Bahadur Deuba"},
                        "ne": {"full": "शेर बहादुर देउबा"}
                    }
                ],
                "tags": ["politician", "prime-minister"],
                "personal_details": {
                    "gender": "male"
                }
            }
        }

    Note: The entity_data must include 'entity_prefix' field (e.g., 'person',
    'organization/political_party', 'organization/nepal_govt/moha'). The old
    'type' and 'sub_type' fields are deprecated.

    The entity_data must NOT include 'version_summary' or 'created_at' - these
    will be automatically added by the processor. The author_id is derived from
    the authenticated user by the processor.
    """

    entity_data: Dict[str, Any] = Field(
        ...,
        description=(
            "Complete entity data dictionary. Must include 'entity_prefix' field "
            "(e.g., 'person', 'organization/political_party'). "
            "Must NOT include 'version_summary' or 'created_at' - these are added by the processor. "
            "Will be validated against the appropriate NES entity model "
            "(Person, Organization, Location, Project)."
        ),
    )

    @field_validator("entity_data")
    @classmethod
    def validate_entity_data(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        """Validate entity_data using the appropriate NES entity model.

        This delegates to entity_from_dict which will:
        1. Check that 'entity_prefix' field is present
        2. Determine the correct entity class from the first prefix segment
        3. Validate all fields against that entity's Pydantic model

        Note: version_summary and created_at must NOT be in the payload - they
        will be added by the processor.
        """
        from datetime import datetime, timezone as dt_timezone
        from nes.core.identifiers import build_entity_id_from_prefix

        if "entity_prefix" not in v:
            raise ValueError(
                "entity_data must include 'entity_prefix' field. "
                "The old type/sub_type system is deprecated."
            )

        # Reject version_summary and created_at - these are added by the processor
        if "version_summary" in v:
            raise ValueError(
                "entity_data must not include 'version_summary' - it will be added by the processor"
            )
        if "created_at" in v:
            raise ValueError(
                "entity_data must not include 'created_at' - it will be added by the processor"
            )

        # Create a copy for validation with dummy version_summary and created_at
        validation_data = v.copy()

        # Build proper entity_id for validation
        entity_prefix = v["entity_prefix"]
        entity_slug = v.get("slug", "validation-slug")
        entity_id = build_entity_id_from_prefix(entity_prefix, entity_slug)

        # Use current timestamp for validation
        now_iso = datetime.now(dt_timezone.utc).isoformat()

        validation_data["version_summary"] = {
            "entity_or_relationship_id": entity_id,
            "type": "ENTITY",
            "version_number": 1,
            "author": {"slug": "dummy"},  # Will be replaced by the processor
            "change_description": "Validation placeholder",  # Will be replaced by the processor
            "created_at": now_iso,
        }
        validation_data["created_at"] = now_iso

        # Validate using the appropriate NES entity model
        try:
            entity_from_dict(validation_data)
        except (ValueError, ValidationError) as e:
            raise ValueError(f"Invalid entity_data: {e}") from e

        return v


def validate_action_payload(action: str, payload: Dict[str, Any]) -> BaseModel:
    """Validate a payload using the Pydantic model for the given action.

    MVP: Only ADD_NAME is supported in this version.

    Args:
        action: The QueueAction value (e.g. "ADD_NAME", "CREATE_ENTITY").
        payload: The raw payload dictionary to validate.

    Returns:
        A validated Pydantic model instance.

    Raises:
        ValueError: If the action is not supported.
        pydantic.ValidationError: If the payload fails validation.
    """
    if action == "ADD_NAME":
        return AddNamePayload(**payload)
    elif action == "CREATE_ENTITY":
        return CreateEntityPayload(**payload)

    raise ValueError(
        f"Action '{action}' is not supported in this version. "
        "Only ADD_NAME and CREATE_ENTITY are available."
    )
