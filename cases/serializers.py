"""
Serializers for the Jawafdehi accountability platform API.

See: .kiro/specs/accountability-platform-core/design.md
"""

import logging
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from drf_spectacular.types import OpenApiTypes
from .models import (
    Case,
    DocumentSource,
    JawafEntity,
    CaseState,
    Feedback,
    CaseEntityRelationship,
)

logger = logging.getLogger(__name__)


class JawafEntitySerializer(serializers.ModelSerializer):
    """
    Serializer for JawafEntity model.

    Updated for the completed unified entity-case relationships migration.
    Uses the unified system to get case relationships.
    """

    alleged_cases = serializers.SerializerMethodField(
        help_text="List of case IDs where this entity is alleged"
    )
    related_cases = serializers.SerializerMethodField(
        help_text="List of case IDs where this entity is related or a location"
    )

    class Meta:
        model = JawafEntity
        fields = ["id", "nes_id", "display_name", "alleged_cases", "related_cases"]

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_alleged_cases(self, obj):
        """
        Get list of case IDs where this entity is alleged.

        Only includes PUBLISHED cases. Uses the unified relationship system.
        """
        from .models import RelationshipType

        # Get cases where this entity has an 'alleged' relationship
        cases = Case.objects.filter(
            entity_relationships__entity=obj,
            entity_relationships__relationship_type=RelationshipType.ALLEGED,
            state=CaseState.PUBLISHED,
        )

        return list(cases.values_list("id", flat=True))

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_related_cases(self, obj):
        """
        Get list of case IDs where this entity is related.

        Only includes PUBLISHED cases. Uses the unified relationship system.
        Excludes cases where entity is already alleged (to avoid duplicates).
        """
        from .models import RelationshipType

        # Get alleged case IDs to exclude
        alleged_case_ids = Case.objects.filter(
            entity_relationships__entity=obj,
            entity_relationships__relationship_type=RelationshipType.ALLEGED,
            state=CaseState.PUBLISHED,
        ).values_list("id", flat=True)

        # Get related cases from unified system
        related_cases = Case.objects.filter(
            entity_relationships__entity=obj,
            entity_relationships__relationship_type=RelationshipType.RELATED,
            state=CaseState.PUBLISHED,
        ).exclude(id__in=alleged_case_ids)
        return list(related_cases.values_list("id", flat=True))


class CaseEntityRelationshipSerializer(serializers.ModelSerializer):
    """
    Serializer for CaseEntityRelationship through-model.

    Provides entity display information as read-only fields and validates
    relationship_type choices. Used for the unified entity relationship system.
    """

    entity_display_name = serializers.CharField(
        source="entity.display_name",
        read_only=True,
        help_text="Display name of the related entity",
    )
    entity_nes_id = serializers.CharField(
        source="entity.nes_id",
        read_only=True,
        help_text="NES ID of the related entity (if available)",
    )

    class Meta:
        model = CaseEntityRelationship
        fields = [
            "id",
            "entity",
            "entity_display_name",
            "entity_nes_id",
            "relationship_type",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "entity_display_name", "entity_nes_id", "created_at"]

    def validate_relationship_type(self, value):
        """
        Validate that relationship_type is one of the allowed choices.
        """
        from .models import RelationshipType

        valid_types = [choice[0] for choice in RelationshipType.choices]
        if value not in valid_types:
            raise serializers.ValidationError(
                f"Invalid relationship type '{value}'. Must be one of: {', '.join(valid_types)}"
            )
        return value


class SimplifiedEntitySerializer(serializers.ModelSerializer):
    """
    Simplified serializer for entities in case responses.

    Returns only id, nes_id, display_name, type (relationship_type), and notes.
    Used for the new unified entities format.

    CRITICAL FIX: The 'id' field now properly maps to 'entity.id' instead of
    the relationship ID, ensuring backward compatibility and correct entity identification.
    """

    id = serializers.IntegerField(
        source="entity.id",
        read_only=True,
        help_text="ID of the entity (not the relationship ID)",
    )
    nes_id = serializers.CharField(
        source="entity.nes_id",
        read_only=True,
        help_text="NES ID of the related entity (if available)",
    )
    display_name = serializers.CharField(
        source="entity.display_name",
        read_only=True,
        help_text="Display name of the related entity",
    )
    type = serializers.CharField(
        source="relationship_type",
        read_only=True,
        help_text="Type of relationship (alleged, related, witness, etc.)",
    )

    class Meta:
        model = CaseEntityRelationship
        fields = ["id", "nes_id", "display_name", "type", "notes"]
        read_only_fields = fields


class CaseSerializer(serializers.ModelSerializer):
    """
    Serializer for Case model.

    Exposes all fields except contributors (internal only).

    The state field is always included to indicate case status (PUBLISHED or IN_REVIEW).

    Uses the unified entities list for all related entities.

    SCHEMA FIX: Removed legacy alleged_entities and related_entities fields to eliminate
    schema discrepancy. The API now returns only the unified format as documented.
    """

    entities = serializers.SerializerMethodField(
        help_text="Entity relationships using the unified relationship system"
    )

    @extend_schema_field(SimplifiedEntitySerializer(many=True))
    def get_entities(self, obj):
        """Get entities from unified relationship system."""
        try:
            relationships = obj.entity_relationships.select_related("entity")
            return SimplifiedEntitySerializer(relationships, many=True).data
        except (ValueError, TypeError, AttributeError) as e:
            logger.error(
                f"Error serializing entities for case {obj.case_id}: {e}",
                exc_info=True,
                extra={"case_id": obj.case_id},
            )
            raise

    tags = serializers.ListField(
        child=serializers.CharField(),
        help_text="List of tags for categorization (e.g., 'land-encroachment', 'national-interest')",
        required=False,
    )
    key_allegations = serializers.ListField(
        child=serializers.CharField(),
        help_text="List of key allegation statements",
        required=False,
    )
    timeline = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of timeline entries with date, title, and description",
        required=False,
    )
    evidence = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of evidence entries with source_id and description",
        required=False,
    )
    versionInfo = serializers.JSONField(
        help_text="Version metadata tracking changes (version_number, user_id, change_summary, datetime)",
        required=False,
    )

    class Meta:
        model = Case
        fields = [
            "id",
            "case_id",
            "case_type",
            "state",
            "title",
            "short_description",
            "thumbnail_url",
            "banner_url",
            "case_start_date",
            "case_end_date",
            "entities",
            "tags",
            "description",
            "key_allegations",
            "timeline",
            "evidence",
            "notes",
            "versionInfo",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields  # API is read-only


class CaseDetailSerializer(CaseSerializer):
    """
    Serializer for Case detail view.

    Inherits all fields from CaseSerializer including the `notes` field.
    """

    class Meta(CaseSerializer.Meta):
        pass


class DocumentSourceSerializer(serializers.ModelSerializer):
    """
    Serializer for DocumentSource model.

    Used for public API access to sources associated with published cases.
    """

    related_entities = JawafEntitySerializer(many=True, read_only=True)
    url = serializers.SerializerMethodField(
        help_text="List of URLs for this source, including uploaded file URL when available"
    )

    def get_url(self, obj):
        request = self.context.get("request")
        merged_urls = []
        seen = set()

        def add_url(value):
            if not value:
                return
            candidate = value
            if request is not None:
                candidate = request.build_absolute_uri(candidate)
            if candidate not in seen:
                seen.add(candidate)
                merged_urls.append(candidate)

        for url in list(obj.url or []):
            add_url(url)

        if obj.uploaded_file:
            try:
                add_url(obj.uploaded_file.url)
            except Exception:
                pass

        uploaded_files = getattr(obj, "uploaded_files", None)
        if uploaded_files is not None:
            uploads_iterable = (
                uploaded_files.all()
                if hasattr(uploaded_files, "all")
                else uploaded_files
            )
            for uploaded_file in uploads_iterable:
                try:
                    add_url(uploaded_file.file.url)
                except Exception:
                    pass

        return merged_urls

    class Meta:
        model = DocumentSource
        fields = [
            "id",
            "source_id",
            "title",
            "description",
            "source_type",
            "url",
            "related_entities",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields  # API is read-only


class ContactMethodSerializer(serializers.Serializer):
    """Serializer for contact method within feedback."""

    type = serializers.ChoiceField(
        choices=["email", "phone", "whatsapp", "instagram", "facebook", "other"],
        help_text="Type of contact method",
    )
    value = serializers.CharField(
        max_length=300, help_text="Contact value (email, phone, username, etc.)"
    )


class ContactInfoSerializer(serializers.Serializer):
    """Serializer for contact information within feedback."""

    name = serializers.CharField(
        max_length=200, required=False, allow_blank=True, help_text="Submitter's name"
    )
    contactMethods = ContactMethodSerializer(
        many=True, required=False, help_text="List of contact methods"
    )


class FeedbackSerializer(serializers.ModelSerializer):
    """Serializer for Feedback model."""

    feedbackType = serializers.CharField(
        source="feedback_type", help_text="Type of feedback"
    )
    relatedPage = serializers.CharField(
        source="related_page",
        required=False,
        allow_blank=True,
        help_text="Page or feature related to feedback",
    )
    contactInfo = ContactInfoSerializer(
        source="contact_info", required=False, help_text="Optional contact information"
    )
    submittedAt = serializers.DateTimeField(
        source="submitted_at",
        read_only=True,
        help_text="Timestamp when feedback was submitted",
    )

    class Meta:
        model = Feedback
        fields = [
            "id",
            "feedbackType",
            "subject",
            "description",
            "relatedPage",
            "contactInfo",
            "status",
            "submittedAt",
        ]
        read_only_fields = ["id", "status", "submittedAt"]

    def validate_feedbackType(self, value):
        """Validate feedback type."""
        from .models import FeedbackType

        valid_types = [choice[0] for choice in FeedbackType.choices]
        if value not in valid_types:
            raise serializers.ValidationError(
                f"Invalid feedback type. Must be one of: {', '.join(valid_types)}"
            )
        return value

    def validate_contactInfo(self, value):
        """Validate contact info structure."""
        if not value:
            return {}

        # Validate contact methods if present
        if "contactMethods" in value:
            valid_types = [
                "email",
                "phone",
                "whatsapp",
                "instagram",
                "facebook",
                "other",
            ]
            for method in value["contactMethods"]:
                if method.get("type") not in valid_types:
                    raise serializers.ValidationError(
                        f"Invalid contact method type. Must be one of: {', '.join(valid_types)}"
                    )

        return value

    def to_representation(self, instance):
        """Convert to camelCase response format."""
        data = super().to_representation(instance)

        # Return simplified response for API
        return {
            "id": data["id"],
            "feedbackType": data["feedbackType"],
            "subject": data["subject"],
            "status": data["status"],
            "submittedAt": data["submittedAt"],
            "message": "Thank you for your feedback! We will review it and get back to you if needed.",
        }
