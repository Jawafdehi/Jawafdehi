from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    MCPServer,
    Skill,
    Summary,
    Draft,
    DraftVersion,
    LLMProvider,
    PROVIDERS_REQUIRING_API_KEY,
)


class CurrentUserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "role"]

    def get_role(self, obj):
        return "administrator" if obj.is_staff else "caseworker"


class MCPServerSerializer(serializers.ModelSerializer):
    class Meta:
        model = MCPServer
        fields = [
            "id",
            "name",
            "display_name",
            "url",
            "auth_type",
            "auth_token",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "status", "created_at", "updated_at"]
        extra_kwargs = {"auth_token": {"write_only": True}}


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = [
            "id",
            "name",
            "display_name",
            "description",
            "prompt",
            "model",
            "temperature",
            "max_tokens",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SummarySerializer(serializers.ModelSerializer):
    skill_name = serializers.SerializerMethodField()

    class Meta:
        model = Summary
        fields = [
            "id",
            "case_number",
            "skill",
            "skill_name",
            "content",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_skill_name(self, obj):
        """Return skill name or None if skill is not set."""
        return obj.skill.name if obj.skill else None


class DraftVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DraftVersion
        fields = ["id", "content", "created_at"]
        read_only_fields = ["id", "created_at"]


class DraftSerializer(serializers.ModelSerializer):
    skill_name = serializers.SerializerMethodField()
    versions = DraftVersionSerializer(many=True, read_only=True)

    class Meta:
        model = Draft
        fields = [
            "id",
            "case_number",
            "skill",
            "skill_name",
            "content",
            "status",
            "external_reference_id",
            "versions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "external_reference_id",
            "versions",
            "created_at",
            "updated_at",
        ]

    def get_skill_name(self, obj):
        """Return skill name or None if skill is not set."""
        return obj.skill.name if obj.skill else None


class LLMProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = LLMProvider
        fields = [
            "id",
            "provider_type",
            "model",
            "api_key",
            "temperature",
            "max_tokens",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {"api_key": {"write_only": True}}

    def validate(self, data):
        """Validate that api_key is provided for providers that require it."""
        provider_type = data.get("provider_type")
        api_key = data.get("api_key")

        if provider_type in PROVIDERS_REQUIRING_API_KEY and not api_key:
            raise serializers.ValidationError(
                {"api_key": f"API key is required for {provider_type}"}
            )

        return data
