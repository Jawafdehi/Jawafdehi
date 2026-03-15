"""
Models for the NES Queue System (NESQ).

The NESQ system provides a queue-based workflow for updating the Nepal Entity
Service (NES) database. Authenticated contributors submit change requests via
a REST API, which are reviewed by admins/moderators and then processed by a
daily cron job that commits approved changes to the nes-db repository.

See .kiro/specs/nes-queue-system/ for full specification.
"""

from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class QueueAction(models.TextChoices):
    """Actions that can be requested through the NES Queue System."""

    ADD_NAME = "ADD_NAME", "Add Name"
    CREATE_ENTITY = "CREATE_ENTITY", "Create Entity"
    # Future actions:
    # UPDATE_ENTITY = "UPDATE_ENTITY", "Update Entity"


class QueueStatus(models.TextChoices):
    """Status values tracking a queue item through its lifecycle.

    Workflow:
        PENDING  → APPROVED → COMPLETED (success)
        PENDING  → APPROVED → FAILED    (processing error)
        PENDING  → REJECTED              (admin rejects)

    Admin/Moderator submissions with auto_approve=True skip PENDING
    and start directly at APPROVED.
    """

    PENDING = "PENDING", "Pending Review"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"
    COMPLETED = "COMPLETED", "Completed"
    FAILED = "FAILED", "Failed"


class NESQueueItem(models.Model):
    """A single entity update request in the NES Queue.

    Each NESQueueItem represents a requested change to the NES database
    (e.g., adding a name to an existing entity). Items progress through
    a status workflow: PENDING → APPROVED → COMPLETED/FAILED, with full
    audit trail of who submitted, reviewed, and when processing occurred.

    The payload field stores action-specific data validated by Pydantic
    models before persistence (see nesq/validators.py).
    """

    action = models.CharField(
        max_length=20,
        choices=QueueAction.choices,
        help_text="Type of entity operation to perform.",
    )
    payload = models.JSONField(
        help_text="Action-specific data structure, validated by Pydantic schema.",
    )
    status = models.CharField(
        max_length=20,
        choices=QueueStatus.choices,
        default=QueueStatus.PENDING,
        help_text="Current workflow status of this queue item.",
    )
    submitted_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="nesq_submissions",
        help_text="User who submitted this request.",
    )
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="nesq_reviews",
        help_text="Admin/moderator who approved or rejected this request.",
    )
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when this item was approved or rejected.",
    )
    processed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when the queue processor attempted this item.",
    )
    change_description = models.TextField(
        help_text="Human-readable description of the requested change.",
    )
    error_message = models.TextField(
        blank=True,
        default="",
        help_text="Error details if processing failed.",
    )
    result = models.JSONField(
        null=True,
        blank=True,
        help_text="Processing result data on success (e.g., updated entity info).",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when this item was submitted.",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp of the last modification.",
    )

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["status"], name="nesq_status_idx"),
        ]
        verbose_name = "NES Queue Item"
        verbose_name_plural = "NES Queue Items"

    def __str__(self):
        return f"NESQ-{self.pk} [{self.action}] {self.status}"
