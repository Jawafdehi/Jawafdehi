from django.db import models
from django.contrib.auth.models import User

# Providers that require an API key for authentication
PROVIDERS_REQUIRING_API_KEY = ["openai", "anthropic", "google", "azure"]


class MCPServer(models.Model):
    name = models.CharField(max_length=255, unique=True)
    display_name = models.CharField(
        max_length=255,
        unique=True,
        null=True,
        blank=True,
        help_text="Custom name for reference (no spaces, use hyphens)",
    )
    url = models.URLField()
    auth_type = models.CharField(
        max_length=50,
        choices=[("bearer", "Bearer"), ("api_key", "API Key")],
    )
    # TODO: Replace with encrypted field or secret reference (e.g., django-encrypted-model-fields)
    # Storing secrets as plain text is a security risk
    auth_token = models.CharField(max_length=500, blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ("connected", "Connected"),
            ("disconnected", "Disconnected"),
            ("error", "Error"),
        ],
        default="disconnected",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["-created_at"]


class Skill(models.Model):
    name = models.CharField(max_length=255, unique=True)
    display_name = models.CharField(
        max_length=255,
        unique=True,
        null=True,
        blank=True,
        help_text="Custom name for loading skill with /display_name syntax (no spaces, use hyphens)",
    )
    description = models.TextField()
    prompt = models.TextField()
    # Model should be set by application logic based on configured provider
    model = models.CharField(max_length=100)
    temperature = models.FloatField(default=0.7)
    max_tokens = models.IntegerField(default=2000)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["-created_at"]


class Summary(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="cw_summaries"
    )
    case_number = models.CharField(max_length=100)
    skill = models.ForeignKey(Skill, on_delete=models.SET_NULL, null=True, blank=True)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.case_number} - {self.user.username}"

    class Meta:
        ordering = ["-created_at"]


class Draft(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("posted", "Posted"),
        ("archived", "Archived"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="cw_drafts")
    case_number = models.CharField(max_length=100)
    skill = models.ForeignKey(Skill, on_delete=models.SET_NULL, null=True, blank=True)
    content = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    external_reference_id = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.case_number} - {self.user.username}"

    class Meta:
        ordering = ["-created_at"]


class DraftVersion(models.Model):
    draft = models.ForeignKey(Draft, on_delete=models.CASCADE, related_name="versions")
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.draft.case_number} - v{self.id}"

    class Meta:
        ordering = ["-created_at"]


class LLMProvider(models.Model):
    PROVIDER_CHOICES = [
        ("openai", "OpenAI"),
        ("anthropic", "Anthropic Claude"),
        ("google", "Google Gemini"),
        ("ollama", "Ollama (Local)"),
        ("azure", "Azure OpenAI"),
        ("custom", "Custom"),
    ]

    provider_type = models.CharField(
        max_length=50, choices=PROVIDER_CHOICES, unique=True
    )
    model = models.CharField(max_length=100)
    # TODO: Replace with encrypted field or secret reference (e.g., django-encrypted-model-fields)
    # Storing secrets as plain text is a security risk
    # Optional for local providers like ollama
    api_key = models.CharField(max_length=500, blank=True, null=True)
    temperature = models.FloatField(default=0.7)
    max_tokens = models.IntegerField(default=2000)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        """Validate that api_key is provided for providers that require it."""
        from django.core.exceptions import ValidationError

        if self.provider_type in PROVIDERS_REQUIRING_API_KEY and not self.api_key:
            raise ValidationError(
                f"API key is required for {self.get_provider_type_display()}"
            )

    def __str__(self):
        return f"{self.provider_type} - {self.model}"

    class Meta:
        ordering = ["-created_at"]
