from django.contrib import admin
from .models import MCPServer, Skill, Summary, Draft, DraftVersion, LLMProvider


@admin.register(MCPServer)
class MCPServerAdmin(admin.ModelAdmin):
    list_display = ["name", "display_name", "url", "auth_type", "status", "created_at"]
    list_filter = ["status", "auth_type"]
    search_fields = ["name"]
    # Exclude auth_token from admin forms to prevent displaying secrets
    exclude = ["auth_token"]
    readonly_fields = ["status", "created_at", "updated_at"]


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "display_name",
        "model",
        "temperature",
        "max_tokens",
        "created_at",
    ]
    search_fields = ["name", "description"]


@admin.register(Summary)
class SummaryAdmin(admin.ModelAdmin):
    list_display = ["case_number", "user", "skill", "created_at"]
    list_filter = ["skill"]
    search_fields = ["case_number", "user__username"]


@admin.register(Draft)
class DraftAdmin(admin.ModelAdmin):
    list_display = ["case_number", "user", "skill", "status", "created_at"]
    list_filter = ["status", "skill"]
    search_fields = ["case_number", "user__username"]


@admin.register(DraftVersion)
class DraftVersionAdmin(admin.ModelAdmin):
    list_display = ["draft", "created_at"]
    list_filter = []


@admin.register(LLMProvider)
class LLMProviderAdmin(admin.ModelAdmin):
    list_display = [
        "provider_type",
        "model",
        "temperature",
        "max_tokens",
        "is_active",
        "created_at",
    ]
    list_filter = ["provider_type", "is_active"]
    # Exclude api_key from admin forms to prevent displaying secrets
    exclude = ["api_key"]
    readonly_fields = ["created_at", "updated_at"]
