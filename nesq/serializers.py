"""DRF serializers for the NES Queue System (NESQ).

Provides request and response serializers for the NESQ API endpoints:

- ``NESQueueSubmitSerializer``: Validates incoming submission requests
  (action, payload, change_description, auto_approve).
- ``NESQueueItemSerializer``: Formats queue items for API responses,
  resolving user foreign keys to usernames.

See .kiro/specs/nes-queue-system/ for full specification.
"""

from rest_framework import serializers

from nesq.models import NESQueueItem, QueueAction


class NESQueueSubmitSerializer(serializers.Serializer):
    """Validates incoming POST /api/submit_nes_change requests.

    Performs shallow validation of the request structure. Deep payload
    validation (e.g., entity_id format, name fields) is handled by the
    Pydantic ``AddNamePayload`` model in the view layer.

    Fields:
        action: Must be a valid QueueAction value (MVP: only ADD_NAME).
        payload: Must be a dict — deeper validation is done by Pydantic.
        change_description: Non-empty human-readable description of the change.
        auto_approve: Optional boolean. If True, the queue item skips manual
            review and is created with status=APPROVED. Only Admin/Moderator
            users may set this to True; the view enforces that constraint.
    """

    action = serializers.ChoiceField(
        choices=QueueAction.choices,
        help_text="Type of entity operation (MVP: only ADD_NAME is supported).",
    )
    payload = serializers.DictField(
        help_text="Action-specific data structure, validated by Pydantic in the view.",
    )
    change_description = serializers.CharField(
        help_text="Human-readable description of the requested change.",
    )
    auto_approve = serializers.BooleanField(
        required=False,
        default=False,
        help_text=(
            "If True, skip manual review (Admin/Moderator only). "
            "Contributors who set this to True will receive a 403 response."
        ),
    )

    def validate_change_description(self, value):
        """Ensure change_description is non-empty after stripping whitespace."""
        stripped = value.strip()
        if not stripped:
            raise serializers.ValidationError(
                "change_description must not be empty."
            )
        return stripped


class NESQueueItemSerializer(serializers.ModelSerializer):
    """Serializes NESQueueItem instances for API responses.

    Resolves the ``submitted_by`` and ``reviewed_by`` foreign keys to
    human-readable usernames instead of raw user IDs.

    Example response::

        {
            "id": 42,
            "action": "ADD_NAME",
            "status": "PENDING",
            "submitted_by": "contributor_user",
            "reviewed_by": null,
            "reviewed_at": null,
            "processed_at": null,
            "created_at": "2025-01-15T10:30:00Z"
        }
    """

    submitted_by = serializers.SerializerMethodField(
        help_text="Username of the user who submitted this request.",
    )
    reviewed_by = serializers.SerializerMethodField(
        help_text="Username of the admin/moderator who reviewed this request.",
    )

    class Meta:
        model = NESQueueItem
        fields = [
            "id",
            "action",
            "status",
            "submitted_by",
            "reviewed_by",
            "reviewed_at",
            "processed_at",
            "created_at",
        ]

    def get_submitted_by(self, obj):
        """Return the username of the submitter."""
        return obj.submitted_by.username

    def get_reviewed_by(self, obj):
        """Return the username of the reviewer, or None if not yet reviewed."""
        if obj.reviewed_by is not None:
            return obj.reviewed_by.username
        return None
