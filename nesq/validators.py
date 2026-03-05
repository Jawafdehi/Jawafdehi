"""Pydantic payload validators for the NES Queue System (NESQ).

Provides action-specific payload validation using Pydantic v2 models.
Each queue action (e.g., ADD_NAME) has a corresponding Pydantic model that
validates the payload structure before a NESQueueItem is created.

MVP: Only AddNamePayload is supported. CREATE_ENTITY and UPDATE_ENTITY
will be added in future releases.

See .kiro/specs/nes-queue-system/ for full specification.
"""

from typing import Any, Dict

from pydantic import BaseModel, Field, field_validator

from nes.core.identifiers.validators import validate_entity_id
from nes.core.models.base import Name


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


def validate_action_payload(action: str, payload: Dict[str, Any]) -> BaseModel:
    """Validate a payload using the Pydantic model for the given action.

    MVP: Only ADD_NAME is supported in this version.

    Args:
        action: The QueueAction value (e.g. "ADD_NAME").
        payload: The raw payload dictionary to validate.

    Returns:
        A validated Pydantic model instance.

    Raises:
        ValueError: If the action is not supported.
        pydantic.ValidationError: If the payload fails validation.
    """
    if action == "ADD_NAME":
        return AddNamePayload(**payload)

    raise ValueError(
        f"Action '{action}' is not supported in this version. "
        "Only ADD_NAME is available."
    )
