from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth import get_user_model
from django import forms
from django.db import models
from django.utils.html import format_html
from django.core.exceptions import ValidationError
from tinymce.widgets import TinyMCE
from .models import (
    Case,
    DocumentSource,
    JawafEntity,
    CaseState,
    Feedback,
)
from .widgets import (
    MultiTextField,
    MultiTimelineField,
    MultiEvidenceField,
    MultiURLField,
)
from .rules.predicates import (
    is_admin,
    is_moderator,
    is_contributor,
    is_admin_or_moderator,
    can_transition_case_state,
    can_manage_user,
    can_view_case,
    can_change_case,
    can_view_source,
    can_change_source,
)

User = get_user_model()


# ============================================================================
# Custom Admin Forms
# ============================================================================


class CaseAdminForm(forms.ModelForm):
    """
    Custom form for Case admin with rich text editor and custom widgets.
    """

    key_allegations = MultiTextField(
        required=False,
        button_label="Add Key Allegation",
        label="Key Allegations",
        help_text="List of key allegation statements",
    )

    tags = MultiTextField(
        required=False,
        button_label="Add Tag",
        label="Tags",
        help_text="Tags for categorization",
    )

    timeline = MultiTimelineField(
        required=False,
        label="Timeline",
        help_text="Timeline of events (add in reverse-chronological order: most recent first)",
    )

    evidence = MultiEvidenceField(
        required=False,
        label="Evidence",
        help_text="Evidence entries with source references",
    )

    start_date_bs = forms.CharField(
        label="Case start date (BS)",
        required=False,
        widget=forms.TextInput(
            attrs={
                "placeholder": "YYYY-MM-DD",
                "class": "vTextField nepali-date-picker",
                "autocomplete": "off",
                "readonly": "readonly",
                "style": "cursor: pointer;",
            }
        ),
    )
    end_date_bs = forms.CharField(
        label="Case end date (BS)",
        required=False,
        widget=forms.TextInput(
            attrs={
                "placeholder": "YYYY-MM-DD",
                "class": "vTextField nepali-date-picker",
                "autocomplete": "off",
                "readonly": "readonly",
                "style": "cursor: pointer;",
            }
        ),
    )

    class Meta:
        model = Case
        fields = "__all__"
        widgets = {
            "description": TinyMCE(attrs={"cols": 80, "rows": 30}),
            "state": forms.RadioSelect(),
            "case_start_date": forms.DateInput(attrs={"type": "date"}),
            "case_end_date": forms.DateInput(attrs={"type": "date"}),
        }
        help_texts = {
            "state": "Current workflow state: DRAFT (editable), IN_REVIEW (pending approval), PUBLISHED (public), CLOSED (archived)",
        }

    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop("request", None)
        super().__init__(*args, **kwargs)

        # Populate evidence field with available sources based on user permissions
        if self.request:
            user = self.request.user
            sources_queryset = DocumentSource.objects.filter(is_deleted=False)

            # Filter sources based on user role
            if not is_admin_or_moderator(user):
                # Contributors see sources they're assigned to
                if is_contributor(user):
                    sources_queryset = sources_queryset.filter(contributors=user)

                    # Also include sources already referenced in this case's evidence
                    if self.instance and self.instance.pk and self.instance.evidence:
                        existing_source_ids = [
                            entry.get("source_id")
                            for entry in self.instance.evidence
                            if entry.get("source_id")
                        ]
                        if existing_source_ids:
                            # Combine: sources assigned to user OR sources already in evidence
                            sources_queryset = (
                                DocumentSource.objects.filter(is_deleted=False)
                                .filter(
                                    models.Q(contributors=user)
                                    | models.Q(source_id__in=existing_source_ids)
                                )
                                .distinct()
                            )
                else:
                    # No role - see nothing
                    sources_queryset = DocumentSource.objects.none()

            sources = sources_queryset.values_list("source_id", "title", "url")
        else:
            # Fallback if no request (shouldn't happen in normal admin usage)
            sources = DocumentSource.objects.filter(is_deleted=False).values_list(
                "source_id", "title", "url"
            )

        self.fields["evidence"].sources = list(sources)
        self.fields["evidence"].widget.sources = list(sources)

        # Disable PUBLISHED and CLOSED states for Contributors
        if self.request:
            user = self.request.user
            if is_contributor(user) and not is_admin_or_moderator(user):
                # Disable PUBLISHED and CLOSED options for contributors
                state_field = self.fields.get("state")
                if state_field:
                    # Create custom choices with disabled options
                    state_field.widget.attrs["class"] = "contributor-state-field"

    class Media:
        css = {
            "all": (
                "https://nepalidatepicker.sajanmaharjan.com.np/v5/nepali.datepicker/css/nepali.datepicker.v5.0.6.min.css",
            )
        }
        js = (
            "https://nepalidatepicker.sajanmaharjan.com.np/v5/nepali.datepicker/js/nepali.datepicker.v5.0.6.min.js",
            "cases/js/date_converter.js",
        )

    def clean(self):
        """
        Validate state transitions, new case state requirements, and required fields.
        """
        cleaned_data = super().clean()
        errors = {}

        # For new cases, enforce DRAFT state
        if not self.instance.pk:
            new_state = cleaned_data.get("state")
            if new_state != CaseState.DRAFT:
                errors["state"] = (
                    f"New cases must be created in DRAFT state. Cannot create a new case with state {new_state}."
                )

        # Check state transitions for existing cases
        if self.instance.pk:
            old_state = Case.objects.get(pk=self.instance.pk).state
            new_state = cleaned_data.get("state")

            if old_state != new_state and self.request:
                if not can_transition_case_state(
                    self.request.user, self.instance, new_state
                ):
                    errors["state"] = (
                        f"You do not have permission to transition from {old_state} to {new_state}. Contributors can only transition between DRAFT and IN_REVIEW states."
                    )

        # Validate required fields based on state
        new_state = cleaned_data.get("state")

        # Always require title
        if not cleaned_data.get("title", "").strip():
            errors["title"] = "Title is required"

        # Strict validation for IN_REVIEW and PUBLISHED states
        if new_state in [CaseState.IN_REVIEW, CaseState.PUBLISHED]:
            # Check alleged_entities (m2m field - check form data)
            alleged_entities = cleaned_data.get("alleged_entities")
            if not alleged_entities or alleged_entities.count() == 0:
                errors["alleged_entities"] = (
                    "At least one alleged entity is required for IN_REVIEW or PUBLISHED state"
                )

            # Check key_allegations
            key_allegations = cleaned_data.get("key_allegations")
            if not key_allegations or len(key_allegations) == 0:
                errors["key_allegations"] = (
                    "At least one key allegation is required for IN_REVIEW or PUBLISHED state"
                )

            # Check description
            description = cleaned_data.get("description", "").strip()
            if not description:
                errors["description"] = (
                    "Description is required for IN_REVIEW or PUBLISHED state"
                )

        if errors:
            raise ValidationError(errors)

        return cleaned_data


# ============================================================================
# Case Admin
# ============================================================================


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    """
    Django Admin configuration for Case model.

    Features:
    - Custom form with rich text editor
    - State transition controls with validation
    - Version history display
    - Contributor assignment
    - Role-based permissions
    """

    form = CaseAdminForm

    class Media:
        js = ("admin/js/case_admin.js",)
        css = {"all": ("admin/css/case_admin.css",)}

    list_display = [
        "case_id",
        "title",
        "case_type",
        "state_badge",
        "created_at",
        "updated_at",
    ]

    list_filter = [
        "state",
        "case_type",
        "created_at",
    ]

    search_fields = [
        "case_id",
        "title",
        "description",
    ]

    readonly_fields = [
        "case_id",
        "created_at",
        "updated_at",
        "version_info_display",
    ]

    fieldsets = (
        (
            "Basic Information",
            {
                "fields": (
                    "case_id",
                    "title",
                    "short_description",
                    "thumbnail_url",
                    "banner_url",
                    "case_type",
                    "state",
                    "alleged_entities",
                )
            },
        ),
        (
            "Dates",
            {
                "fields": (
                    "case_start_date",
                    "start_date_bs",
                    "case_end_date",
                    "end_date_bs",
                )
            },
        ),
        (
            "Entities",
            {
                "fields": (
                    "related_entities",
                    "locations",
                )
            },
        ),
        (
            "Content",
            {
                "fields": (
                    "key_allegations",
                    "timeline",
                    "description",
                    "tags",
                    "notes",
                )
            },
        ),
        ("Evidence", {"fields": ("evidence",)}),
        ("Assignment", {"fields": ("contributors",)}),
        (
            "Metadata",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                    "version_info_display",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    filter_horizontal = [
        "contributors",
        "alleged_entities",
        "related_entities",
        "locations",
    ]

    def state_badge(self, obj):
        """Display state as a colored badge."""
        colors = {
            CaseState.DRAFT: "#6c757d",
            CaseState.IN_REVIEW: "#ffc107",
            CaseState.PUBLISHED: "#28a745",
            CaseState.CLOSED: "#dc3545",
        }
        color = colors.get(obj.state, "#6c757d")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px; font-weight: bold;">{}</span>',
            color,
            obj.get_state_display(),
        )

    state_badge.short_description = "State"

    def version_info_display(self, obj):
        """Display version info in a readable format."""
        if not obj.versionInfo:
            return "No version info"

        info = obj.versionInfo
        html = "<div style='font-family: monospace;'>"

        if "action" in info:
            html += f"<strong>Action:</strong> {info['action']}<br>"

        if "datetime" in info:
            html += f"<strong>DateTime:</strong> {info['datetime']}<br>"

        if "user_id" in info:
            html += f"<strong>User ID:</strong> {info['user_id']}<br>"

        if "change_summary" in info:
            html += f"<strong>Summary:</strong> {info['change_summary']}<br>"

        html += "</div>"
        return format_html(html)

    version_info_display.short_description = "Version Info"

    def get_queryset(self, request):
        """
        Filter queryset based on user role.

        - Contributors: Only see assigned cases
        - Moderators/Admins: See all cases
        """
        qs = super().get_queryset(request)

        # Admins and Moderators see everything
        if is_admin_or_moderator(request.user):
            return qs

        # Contributors only see assigned cases
        if is_contributor(request.user):
            return qs.filter(contributors=request.user)

        # No role - see nothing
        return qs.none()

    def has_view_permission(self, request, obj=None):
        """
        Check if user can view a case.

        - Contributors: Can only view assigned cases
        - Moderators/Admins: Can view all cases
        """
        if obj is None:
            return True

        return can_view_case(request.user, obj)

    def has_change_permission(self, request, obj=None):
        """
        Check if user can change a case.

        - Contributors: Can only change assigned cases
        - Moderators/Admins: Can change all cases
        """
        if obj is None:
            return True

        return can_change_case(request.user, obj)

    def get_form(self, request, obj=None, **kwargs):
        """Pass request to form for role-based field customization."""
        form_class = super().get_form(request, obj, **kwargs)

        class FormWithRequest(form_class):
            def __new__(cls, *args, **kwargs):
                kwargs["request"] = request
                return form_class(*args, **kwargs)

        return FormWithRequest

    def save_related(self, request, form, formsets, change):
        """
        Save related objects (including many-to-many relationships).
        Automatically adds the creator to contributors when creating a new case.
        """
        # First save the form's many-to-many data
        super().save_related(request, form, formsets, change)

        # Then add creator to contributors for new cases
        if not change:
            form.instance.contributors.add(request.user)

    def get_actions(self, request):
        """
        Get available actions based on user role.
        """
        actions = super().get_actions(request)

        # Add custom actions for state transitions
        if is_admin_or_moderator(request.user):
            # Moderators and Admins can publish and close
            actions["publish_cases"] = (
                self.__class__.publish_cases,
                "publish_cases",
                "Publish selected cases",
            )
            actions["close_cases"] = (
                self.__class__.close_cases,
                "close_cases",
                "Close selected cases",
            )

        return actions

    def publish_cases(self, request, queryset):
        """
        Bulk action to publish cases.
        """
        count = 0
        for case in queryset:
            try:
                if case.state in [CaseState.IN_REVIEW, CaseState.DRAFT]:
                    case.publish()
                    count += 1
            except ValidationError:
                pass

        self.message_user(request, f"{count} case(s) published successfully.")

    publish_cases.short_description = "Publish selected cases"

    def close_cases(self, request, queryset):
        """
        Bulk action to close cases.
        """
        count = queryset.update(state=CaseState.CLOSED)
        self.message_user(request, f"{count} case(s) closed successfully.")

    close_cases.short_description = "Close selected cases"


# ============================================================================
# DocumentSource Admin
# ============================================================================


class DocumentSourceAdminForm(forms.ModelForm):
    """
    Custom form for DocumentSource admin with custom widgets.
    """

    # Override url field to use MultiURLField widget
    url = MultiURLField(
        required=False,
        button_label="Add URL",
        label="URLs",
        help_text="URLs to the source (you can add multiple)",
    )

    class Meta:
        model = DocumentSource
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop("request", None)
        super().__init__(*args, **kwargs)

        # Restrict contributors field visibility based on user role
        if self.request:
            user = self.request.user

            # Only Moderators and Admins can edit contributors
            if not is_admin_or_moderator(user):
                # Contributors cannot edit the contributors field
                if "contributors" in self.fields:
                    self.fields["contributors"].disabled = True
                    self.fields["contributors"].help_text = (
                        "Only Moderators and Admins can assign contributors"
                    )

    def clean(self):
        """
        Validate the form.
        """
        cleaned_data = super().clean()

        # Validate title is not empty
        title = cleaned_data.get("title")
        if not title or not title.strip():
            raise ValidationError({"title": "Title is required and cannot be empty"})

        return cleaned_data


@admin.register(DocumentSource)
class DocumentSourceAdmin(admin.ModelAdmin):
    """
    Django Admin configuration for DocumentSource model.

    Features:
    - Custom form with entity ID validation
    - Soft deletion interface
    - Role-based permissions
    """

    form = DocumentSourceAdminForm

    list_display = [
        "source_id",
        "title",
        "source_type",
        "deletion_status",
        "created_at",
    ]

    list_filter = [
        "source_type",
        "is_deleted",
        "created_at",
    ]

    search_fields = [
        "source_id",
        "title",
        "description",
    ]

    readonly_fields = [
        "source_id",
        "created_at",
        "updated_at",
    ]

    fieldsets = (
        (
            "Basic Information",
            {
                "fields": (
                    "source_id",
                    "title",
                    "description",
                    "source_type",
                    "url",
                    "related_entities",
                    "contributors",
                )
            },
        ),
        (
            "Metadata",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    filter_horizontal = ["related_entities", "contributors"]

    def deletion_status(self, obj):
        """Display deletion status as a colored badge."""
        if obj.is_deleted:
            return format_html(
                '<span style="background-color: #dc3545; color: white; padding: 3px 10px; border-radius: 3px; font-weight: bold;">{}</span>',
                "Deleted",
            )
        return format_html(
            '<span style="background-color: #28a745; color: white; padding: 3px 10px; border-radius: 3px; font-weight: bold;">{}</span>',
            "Active",
        )

    deletion_status.short_description = "Status"

    def get_queryset(self, request):
        """
        Filter queryset based on user role.

        - Admins: See all sources (including deleted)
        - Moderators: Only see active sources (exclude deleted)
        - Contributors: See active sources they're assigned to OR sources referenced in their assigned cases
        """
        qs = super().get_queryset(request)

        # Admins see everything including deleted
        if is_admin(request.user):
            return qs

        # Moderators see all active sources
        if is_moderator(request.user):
            return qs.filter(is_deleted=False)

        # Contributors see sources they're assigned to OR sources in their cases
        if is_contributor(request.user):
            # Get cases where user is a contributor
            user_cases = Case.objects.filter(contributors=request.user)

            # Extract source_ids from evidence of user's cases
            source_ids_from_cases = set()
            for case in user_cases:
                if case.evidence:
                    for evidence_item in case.evidence:
                        if (
                            isinstance(evidence_item, dict)
                            and "source_id" in evidence_item
                        ):
                            source_ids_from_cases.add(evidence_item["source_id"])

            # Return sources where user is contributor OR source is in their cases
            return (
                qs.filter(is_deleted=False)
                .filter(
                    models.Q(contributors=request.user)
                    | models.Q(source_id__in=source_ids_from_cases)
                )
                .distinct()
            )

        # No role - see nothing
        return qs.none()

    def get_list_filter(self, request):
        """
        Customize list filters based on user role.

        - Admins: See source_type, is_deleted and created_at filters
        - Moderators: See source_type and created_at filters
        - Contributors: See source_type and created_at filters
        """
        if is_admin(request.user):
            return ["source_type", "is_deleted", "created_at"]

        # Moderators and Contributors see source_type and created_at
        return ["source_type", "created_at"]

    def has_view_permission(self, request, obj=None):
        """
        Check if user can view a source.

        - Contributors: Can only view sources they're assigned to
        - Moderators/Admins: Can view all sources
        """
        if obj is None:
            return True

        return can_view_source(request.user, obj)

    def has_change_permission(self, request, obj=None):
        """
        Check if user can change a source.

        - Contributors: Can only change sources they're directly assigned to (not case-based access)
        - Moderators/Admins: Can change all sources
        """
        if obj is None:
            return True

        return can_change_source(request.user, obj)

    def has_delete_permission(self, request, obj=None):
        """
        Prevent hard deletion - use soft deletion instead.

        Hard deletion is disabled to preserve audit history.
        Users should set is_deleted=True instead.
        """
        # Disable hard deletion for all users
        return False

    def get_form(self, request, obj=None, **kwargs):
        """Pass request to form for filtering case dropdown."""
        form_class = super().get_form(request, obj, **kwargs)

        class FormWithRequest(form_class):
            def __new__(cls, *args, **kwargs):
                kwargs["request"] = request
                return form_class(*args, **kwargs)

        return FormWithRequest

    def save_model(self, request, obj, form, change):
        """
        Save the model with validation.

        Note: Model's save() method calls full_clean() which handles all validation.
        No need for explicit validation here.
        """
        super().save_model(request, obj, form, change)

    def save_related(self, request, form, formsets, change):
        """
        Save related objects (including many-to-many relationships).
        Automatically adds the creator to contributors when creating a new source.
        """
        # First save the form's many-to-many data
        super().save_related(request, form, formsets, change)

        # Then add creator to contributors for new sources
        if not change:
            form.instance.contributors.add(request.user)

    def get_actions(self, request):
        """
        Get available actions based on user role.
        """
        actions = super().get_actions(request)

        # Remove default delete action (we use soft delete)
        if "delete_selected" in actions:
            del actions["delete_selected"]

        # Add soft delete action
        if is_admin_or_moderator(request.user):
            actions["soft_delete_sources"] = (
                self.__class__.soft_delete_sources,
                "soft_delete_sources",
                "Mark selected sources as deleted",
            )
            actions["restore_sources"] = (
                self.__class__.restore_sources,
                "restore_sources",
                "Restore selected sources",
            )

        return actions

    def soft_delete_sources(self, request, queryset):
        """
        Bulk action to soft delete sources.
        """
        count = queryset.update(is_deleted=True)
        self.message_user(request, f"{count} source(s) marked as deleted.")

    soft_delete_sources.short_description = "Mark selected sources as deleted"

    def restore_sources(self, request, queryset):
        """
        Bulk action to restore soft-deleted sources.
        """
        count = queryset.update(is_deleted=False)
        self.message_user(request, f"{count} source(s) restored.")

    restore_sources.short_description = "Restore selected sources"


# ============================================================================
# User Admin (for moderator restrictions)
# ============================================================================


class CustomUserAdmin(BaseUserAdmin):
    """
    Custom User admin to prevent Moderators from managing other Moderators.

    Property 14: Moderators cannot manage other Moderators in Django Admin
    """

    def get_queryset(self, request):
        """
        Filter queryset based on user role.

        - Admins: See all users
        - Moderators: See all users except other Moderators
        - Others: See nothing
        """
        qs = super().get_queryset(request)

        # Admins see everything
        if is_admin(request.user):
            return qs

        # Moderators see all users except other Moderators
        if is_moderator(request.user):
            # Exclude users who are in the Moderator group
            moderator_group_users = User.objects.filter(
                groups__name="Moderator"
            ).values_list("id", flat=True)
            return qs.exclude(id__in=moderator_group_users)

        # Others see nothing
        return qs.none()

    def has_change_permission(self, request, obj=None):
        """
        Check if user can change another user.

        - Admins: Can change all users
        - Moderators: Cannot change other Moderators
        """
        if obj is None:
            return True

        return can_manage_user(request.user, obj)

    def has_delete_permission(self, request, obj=None):
        """
        Check if user can delete another user.

        - Admins: Can delete users
        - Moderators: Cannot delete other Moderators
        """
        if obj is None:
            return True

        return can_manage_user(request.user, obj)


# Unregister the default User admin and register our custom one
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)


# ============================================================================
# JawafEntity Admin
# ============================================================================


class JawafEntityAdminForm(forms.ModelForm):
    """
    Custom form for JawafEntity admin with validation.
    """

    class Meta:
        model = JawafEntity
        fields = "__all__"

    def clean(self):
        """
        Validate entity data.
        """
        cleaned_data = super().clean()
        nes_id = cleaned_data.get("nes_id")
        display_name = cleaned_data.get("display_name")

        # Check that at least one is provided
        if not nes_id and not display_name:
            raise ValidationError("Entity must have either NES ID or Display Name")

        return cleaned_data


@admin.register(JawafEntity)
class JawafEntityAdmin(admin.ModelAdmin):
    """
    Django Admin configuration for JawafEntity model.
    """

    form = JawafEntityAdminForm

    list_display = [
        "id",
        "nes_id",
        "display_name",
        "created_at",
    ]

    list_filter = [
        "created_at",
    ]

    search_fields = [
        "nes_id",
        "display_name",
    ]

    readonly_fields = [
        "created_at",
        "updated_at",
    ]

    fieldsets = (
        (
            "Entity Information",
            {
                "fields": (
                    "nes_id",
                    "display_name",
                ),
                "description": "Provide either NES ID (from Nepal Entity Service) or a custom Display Name. Both can be provided if needed.",
            },
        ),
        (
            "Metadata",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )


# ============================================================================
# Admin Site Configuration
# ============================================================================

admin.site.site_header = "Jawafdehi"
admin.site.site_title = "Jawafdehi Contributor Portal"
admin.site.index_title = "Welcome to Jawafdehi Contributor Portal"


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    """Admin interface for Feedback model."""

    list_display = [
        "id",
        "feedback_type",
        "subject",
        "status",
        "has_contact_info",
        "submitted_at",
    ]
    list_filter = ["feedback_type", "status", "submitted_at"]
    search_fields = ["subject", "description", "related_page"]
    readonly_fields = ["submitted_at", "updated_at", "ip_address", "user_agent"]

    fieldsets = (
        (
            "Feedback Details",
            {"fields": ("feedback_type", "subject", "description", "related_page")},
        ),
        (
            "Contact Information",
            {"fields": ("contact_info",), "classes": ("collapse",)},
        ),
        ("Status", {"fields": ("status", "admin_notes")}),
        (
            "Metadata",
            {
                "fields": ("ip_address", "user_agent", "submitted_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def has_contact_info(self, obj):
        """Check if feedback has contact information."""
        return bool(obj.contact_info and obj.contact_info.get("contactMethods"))

    has_contact_info.boolean = True
    has_contact_info.short_description = "Has Contact"
