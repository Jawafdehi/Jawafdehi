"""
Admin configuration for the NES Queue System (NESQ).

Provides a Django Admin interface for reviewing, approving, and rejecting
NES queue items. Includes bulk actions for efficient moderation and
color-coded status display for quick visual scanning.

See .kiro/specs/nes-queue-system/ for full specification.
"""

import json

from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html

from nesq.models import NESQueueItem, QueueStatus


@admin.register(NESQueueItem)
class NESQueueItemAdmin(admin.ModelAdmin):
    """Admin configuration for NESQueueItem model.

    Features:
    - List view with color-coded status badges
    - Bulk approve/reject actions for PENDING items
    - Formatted JSON payload display
    - Inline error message display for failed items
    - Read-only fields for completed/failed items
    """

    list_display = (
        "id",
        "action",
        "status_badge",
        "submitted_by",
        "reviewed_by",
        "created_at",
    )
    list_filter = ("status", "action", "created_at")
    search_fields = ("change_description", "submitted_by__username")
    readonly_fields = (
        "formatted_payload",
        "formatted_result",
        "error_display",
        "created_at",
        "updated_at",
    )
    actions = ["bulk_approve", "bulk_reject"]

    # ------------------------------------------------------------------
    # Custom display methods
    # ------------------------------------------------------------------

    def status_badge(self, obj):
        """Display status as a colored badge."""
        colors = {
            QueueStatus.PENDING: "#ffc107",    # amber
            QueueStatus.APPROVED: "#17a2b8",   # teal
            QueueStatus.REJECTED: "#6c757d",   # grey
            QueueStatus.COMPLETED: "#28a745",  # green
            QueueStatus.FAILED: "#dc3545",     # red
        }
        text_color = "#212529" if obj.status == QueueStatus.PENDING else "white"
        color = colors.get(obj.status, "#6c757d")
        return format_html(
            '<span style="background-color: {}; color: {}; padding: 3px 10px; '
            'border-radius: 3px; font-weight: bold;">{}</span>',
            color,
            text_color,
            obj.get_status_display(),
        )

    status_badge.short_description = "Status"
    status_badge.admin_order_field = "status"

    def formatted_payload(self, obj):
        """Display payload as formatted, readable JSON."""
        if obj.payload is None:
            return "-"
        try:
            formatted = json.dumps(obj.payload, indent=2, ensure_ascii=False)
            return format_html("<pre>{}</pre>", formatted)
        except (TypeError, ValueError):
            return str(obj.payload)

    formatted_payload.short_description = "Payload (formatted)"

    def formatted_result(self, obj):
        """Display result as formatted, readable JSON."""
        if obj.result is None:
            return "-"
        try:
            formatted = json.dumps(obj.result, indent=2, ensure_ascii=False)
            return format_html("<pre>{}</pre>", formatted)
        except (TypeError, ValueError):
            return str(obj.result)

    formatted_result.short_description = "Result (formatted)"

    def error_display(self, obj):
        """Display error message with red styling for failed items."""
        if not obj.error_message:
            return "-"
        return format_html(
            '<span style="color: #dc3545; font-weight: bold;">{}</span>',
            obj.error_message,
        )

    error_display.short_description = "Error Message"

    # ------------------------------------------------------------------
    # Read-only enforcement for terminal states
    # ------------------------------------------------------------------

    def get_readonly_fields(self, request, obj=None):
        """Make all fields read-only for items in terminal states (COMPLETED/FAILED)."""
        base_readonly = list(self.readonly_fields)
        if obj and obj.status in (QueueStatus.COMPLETED, QueueStatus.FAILED):
            # All model fields become read-only for completed/failed items
            return base_readonly + [
                "action",
                "payload",
                "status",
                "submitted_by",
                "reviewed_by",
                "reviewed_at",
                "processed_at",
                "change_description",
                "error_message",
                "result",
            ]
        return base_readonly

    # ------------------------------------------------------------------
    # Fieldsets for the detail view
    # ------------------------------------------------------------------

    def get_fieldsets(self, request, obj=None):
        """Organise fields into logical groups on the detail page."""
        fieldsets = [
            (
                "Queue Item",
                {
                    "fields": (
                        "action",
                        "status",
                        "change_description",
                        "formatted_payload",
                    ),
                },
            ),
            (
                "Submission",
                {
                    "fields": (
                        "submitted_by",
                        "created_at",
                        "updated_at",
                    ),
                },
            ),
            (
                "Review",
                {
                    "fields": (
                        "reviewed_by",
                        "reviewed_at",
                    ),
                },
            ),
            (
                "Processing",
                {
                    "fields": (
                        "processed_at",
                        "formatted_result",
                        "error_display",
                    ),
                },
            ),
        ]
        return fieldsets

    # ------------------------------------------------------------------
    # Bulk admin actions
    # ------------------------------------------------------------------

    @admin.action(description="Approve selected PENDING queue items")
    def bulk_approve(self, request, queryset):
        """Approve all selected items that are currently PENDING.

        Sets status to APPROVED, records the reviewer, and timestamps the review.
        Non-PENDING items in the selection are silently skipped.
        """
        pending_items = queryset.filter(status=QueueStatus.PENDING)
        count = pending_items.update(
            status=QueueStatus.APPROVED,
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
        )
        self.message_user(
            request,
            f"{count} queue item(s) approved successfully.",
        )

    @admin.action(description="Reject selected PENDING queue items")
    def bulk_reject(self, request, queryset):
        """Reject all selected items that are currently PENDING.

        Sets status to REJECTED, records the reviewer, and timestamps the review.
        Non-PENDING items in the selection are silently skipped.
        """
        pending_items = queryset.filter(status=QueueStatus.PENDING)
        count = pending_items.update(
            status=QueueStatus.REJECTED,
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
        )
        self.message_user(
            request,
            f"{count} queue item(s) rejected.",
        )
