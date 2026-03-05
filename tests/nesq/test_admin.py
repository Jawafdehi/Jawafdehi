"""
Tests for the NES Queue System Django Admin interface.

Covers:
- Admin list view display of queue items
- bulk_approve action on PENDING items
- bulk_reject action on PENDING items
- bulk_approve sets reviewed_by and reviewed_at
- bulk actions skip non-PENDING items
- Color-coded status badge rendering
- Formatted payload display
- Error display for failed items
- Read-only fields for terminal states

See .kiro/specs/nes-queue-system/tasks.md §10.6 for requirements.
"""

import json

import pytest

from django.contrib.admin.sites import AdminSite
from django.utils import timezone

from nesq.admin import NESQueueItemAdmin
from nesq.models import NESQueueItem, QueueAction, QueueStatus
from tests.conftest import create_user_with_role


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def admin_site():
    """Provide a Django AdminSite instance."""
    return AdminSite()


@pytest.fixture
def nesq_admin(admin_site):
    """Provide a configured NESQueueItemAdmin instance."""
    return NESQueueItemAdmin(NESQueueItem, admin_site)


@pytest.fixture
def admin_user(db):
    """Create an Admin user for admin actions."""
    return create_user_with_role("ram_admin", "ram@example.com", "Admin")


@pytest.fixture
def contributor_user(db):
    """Create a Contributor user for submissions."""
    return create_user_with_role("sita_contrib", "sita@example.com", "Contributor")


def _make_queue_item(user, status=QueueStatus.PENDING, **overrides):
    """Helper: create an NESQueueItem with sensible defaults."""
    defaults = {
        "action": QueueAction.ADD_NAME,
        "payload": {
            "entity_id": "entity:person/test-nepali",
            "name": {"en": "Test Name", "kind": "full_name"},
        },
        "status": status,
        "submitted_by": user,
        "change_description": "Adding test name",
    }
    defaults.update(overrides)
    return NESQueueItem.objects.create(**defaults)


def _make_admin_request(user):
    """Create a request suitable for admin action calls with message support."""
    from django.contrib.messages.storage.fallback import FallbackStorage
    from django.contrib.sessions.backends.db import SessionStore
    from django.test import RequestFactory

    request = RequestFactory().post("/admin/nesq/nesqueueitem/")
    request.user = user
    request.session = SessionStore()
    messages = FallbackStorage(request)
    setattr(request, "_messages", messages)
    return request


# ============================================================================
# Admin list view
# ============================================================================


@pytest.mark.django_db
class TestAdminListView:
    """Test that the admin list view displays queue items correctly."""

    def test_list_display_contains_expected_columns(self, nesq_admin):
        """list_display should include id, action, status_badge, submitted_by, reviewed_by, created_at."""
        expected = {"id", "action", "status_badge", "submitted_by", "reviewed_by", "created_at"}
        assert expected == set(nesq_admin.list_display)

    def test_list_filter_contains_expected_filters(self, nesq_admin):
        """list_filter should include status, action, created_at."""
        assert ("status", "action", "created_at") == nesq_admin.list_filter

    def test_search_fields_contain_expected_fields(self, nesq_admin):
        """search_fields should include change_description and submitted_by__username."""
        assert ("change_description", "submitted_by__username") == nesq_admin.search_fields


# ============================================================================
# Status badge rendering
# ============================================================================


@pytest.mark.django_db
class TestStatusBadge:
    """Test the color-coded status badge display."""

    @pytest.mark.parametrize(
        "status, expected_color",
        [
            (QueueStatus.PENDING, "#ffc107"),
            (QueueStatus.APPROVED, "#17a2b8"),
            (QueueStatus.REJECTED, "#6c757d"),
            (QueueStatus.COMPLETED, "#28a745"),
            (QueueStatus.FAILED, "#dc3545"),
        ],
    )
    def test_status_badge_color(self, nesq_admin, contributor_user, status, expected_color):
        """Each status should render with its designated background color."""
        item = _make_queue_item(contributor_user, status=status)
        badge_html = nesq_admin.status_badge(item)
        assert expected_color in badge_html

    def test_pending_badge_uses_dark_text(self, nesq_admin, contributor_user):
        """PENDING badge uses dark text for readability on amber background."""
        item = _make_queue_item(contributor_user, status=QueueStatus.PENDING)
        badge_html = nesq_admin.status_badge(item)
        assert "#212529" in badge_html  # dark text color

    def test_non_pending_badges_use_white_text(self, nesq_admin, contributor_user):
        """Non-PENDING badges should use white text."""
        for status in [QueueStatus.APPROVED, QueueStatus.COMPLETED, QueueStatus.FAILED]:
            item = _make_queue_item(contributor_user, status=status)
            badge_html = nesq_admin.status_badge(item)
            assert "white" in badge_html

    def test_status_badge_contains_display_label(self, nesq_admin, contributor_user):
        """Badge should contain the human-readable status label."""
        item = _make_queue_item(contributor_user, status=QueueStatus.PENDING)
        badge_html = nesq_admin.status_badge(item)
        assert "Pending Review" in badge_html


# ============================================================================
# Formatted payload & result display
# ============================================================================


@pytest.mark.django_db
class TestFormattedDisplay:
    """Test formatted JSON display and error rendering."""

    def test_formatted_payload_renders_json(self, nesq_admin, contributor_user):
        """Payload should be rendered as indented JSON inside a <pre> tag."""
        payload = {"entity_id": "entity:person/lakpa-sherpa", "name": {"en": "Lakpa Sherpa"}}
        item = _make_queue_item(contributor_user, payload=payload)
        html = nesq_admin.formatted_payload(item)
        assert "<pre>" in html
        assert "Lakpa Sherpa" in html

    def test_formatted_payload_none_returns_dash(self, nesq_admin, contributor_user):
        """None payload should display a dash."""
        item = _make_queue_item(contributor_user)
        item.payload = None
        assert nesq_admin.formatted_payload(item) == "-"

    def test_formatted_result_renders_json(self, nesq_admin, contributor_user):
        """Result should be rendered as indented JSON inside a <pre> tag."""
        item = _make_queue_item(contributor_user)
        item.result = {"updated_entity": "entity:person/test"}
        html = nesq_admin.formatted_result(item)
        assert "<pre>" in html
        assert "updated_entity" in html

    def test_formatted_result_none_returns_dash(self, nesq_admin, contributor_user):
        """None result should display a dash."""
        item = _make_queue_item(contributor_user)
        item.result = None
        assert nesq_admin.formatted_result(item) == "-"

    def test_error_display_shows_red_text(self, nesq_admin, contributor_user):
        """Error messages should be displayed in red."""
        item = _make_queue_item(contributor_user, status=QueueStatus.FAILED)
        item.error_message = "Entity not found"
        html = nesq_admin.error_display(item)
        assert "#dc3545" in html
        assert "Entity not found" in html

    def test_error_display_empty_returns_dash(self, nesq_admin, contributor_user):
        """Empty error_message should display a dash."""
        item = _make_queue_item(contributor_user)
        assert nesq_admin.error_display(item) == "-"


# ============================================================================
# Bulk approve action
# ============================================================================


@pytest.mark.django_db
class TestBulkApprove:
    """Test the bulk_approve admin action."""

    def test_bulk_approve_pending_items(self, nesq_admin, admin_user, contributor_user):
        """bulk_approve should set PENDING items to APPROVED."""
        item1 = _make_queue_item(contributor_user)
        item2 = _make_queue_item(contributor_user)

        request = _make_admin_request(admin_user)
        queryset = NESQueueItem.objects.filter(pk__in=[item1.pk, item2.pk])
        nesq_admin.bulk_approve(request, queryset)

        item1.refresh_from_db()
        item2.refresh_from_db()
        assert item1.status == QueueStatus.APPROVED
        assert item2.status == QueueStatus.APPROVED

    def test_bulk_approve_sets_reviewed_by(self, nesq_admin, admin_user, contributor_user):
        """bulk_approve should record the admin as reviewer."""
        item = _make_queue_item(contributor_user)

        request = _make_admin_request(admin_user)
        queryset = NESQueueItem.objects.filter(pk=item.pk)
        nesq_admin.bulk_approve(request, queryset)

        item.refresh_from_db()
        assert item.reviewed_by == admin_user

    def test_bulk_approve_sets_reviewed_at(self, nesq_admin, admin_user, contributor_user):
        """bulk_approve should timestamp the review."""
        before = timezone.now()
        item = _make_queue_item(contributor_user)

        request = _make_admin_request(admin_user)
        queryset = NESQueueItem.objects.filter(pk=item.pk)
        nesq_admin.bulk_approve(request, queryset)

        item.refresh_from_db()
        assert item.reviewed_at is not None
        assert item.reviewed_at >= before

    def test_bulk_approve_skips_non_pending(self, nesq_admin, admin_user, contributor_user):
        """bulk_approve should not modify items that are not PENDING."""
        approved_item = _make_queue_item(contributor_user, status=QueueStatus.APPROVED)
        completed_item = _make_queue_item(contributor_user, status=QueueStatus.COMPLETED)
        failed_item = _make_queue_item(contributor_user, status=QueueStatus.FAILED)
        rejected_item = _make_queue_item(contributor_user, status=QueueStatus.REJECTED)

        request = _make_admin_request(admin_user)
        queryset = NESQueueItem.objects.filter(
            pk__in=[approved_item.pk, completed_item.pk, failed_item.pk, rejected_item.pk]
        )
        nesq_admin.bulk_approve(request, queryset)

        # All should remain unchanged
        approved_item.refresh_from_db()
        completed_item.refresh_from_db()
        failed_item.refresh_from_db()
        rejected_item.refresh_from_db()

        assert approved_item.status == QueueStatus.APPROVED
        assert completed_item.status == QueueStatus.COMPLETED
        assert failed_item.status == QueueStatus.FAILED
        assert rejected_item.status == QueueStatus.REJECTED

    def test_bulk_approve_mixed_selection(self, nesq_admin, admin_user, contributor_user):
        """When selection contains both PENDING and non-PENDING, only PENDING items are approved."""
        pending_item = _make_queue_item(contributor_user, status=QueueStatus.PENDING)
        completed_item = _make_queue_item(contributor_user, status=QueueStatus.COMPLETED)

        request = _make_admin_request(admin_user)
        queryset = NESQueueItem.objects.filter(pk__in=[pending_item.pk, completed_item.pk])
        nesq_admin.bulk_approve(request, queryset)

        pending_item.refresh_from_db()
        completed_item.refresh_from_db()

        assert pending_item.status == QueueStatus.APPROVED
        assert completed_item.status == QueueStatus.COMPLETED


# ============================================================================
# Bulk reject action
# ============================================================================


@pytest.mark.django_db
class TestBulkReject:
    """Test the bulk_reject admin action."""

    def test_bulk_reject_pending_items(self, nesq_admin, admin_user, contributor_user):
        """bulk_reject should set PENDING items to REJECTED."""
        item1 = _make_queue_item(contributor_user)
        item2 = _make_queue_item(contributor_user)

        request = _make_admin_request(admin_user)
        queryset = NESQueueItem.objects.filter(pk__in=[item1.pk, item2.pk])
        nesq_admin.bulk_reject(request, queryset)

        item1.refresh_from_db()
        item2.refresh_from_db()
        assert item1.status == QueueStatus.REJECTED
        assert item2.status == QueueStatus.REJECTED

    def test_bulk_reject_sets_reviewed_by(self, nesq_admin, admin_user, contributor_user):
        """bulk_reject should record the admin as reviewer."""
        item = _make_queue_item(contributor_user)

        request = _make_admin_request(admin_user)
        queryset = NESQueueItem.objects.filter(pk=item.pk)
        nesq_admin.bulk_reject(request, queryset)

        item.refresh_from_db()
        assert item.reviewed_by == admin_user

    def test_bulk_reject_sets_reviewed_at(self, nesq_admin, admin_user, contributor_user):
        """bulk_reject should timestamp the review."""
        before = timezone.now()
        item = _make_queue_item(contributor_user)

        request = _make_admin_request(admin_user)
        queryset = NESQueueItem.objects.filter(pk=item.pk)
        nesq_admin.bulk_reject(request, queryset)

        item.refresh_from_db()
        assert item.reviewed_at is not None
        assert item.reviewed_at >= before

    def test_bulk_reject_skips_non_pending(self, nesq_admin, admin_user, contributor_user):
        """bulk_reject should not modify items that are not PENDING."""
        approved_item = _make_queue_item(contributor_user, status=QueueStatus.APPROVED)
        completed_item = _make_queue_item(contributor_user, status=QueueStatus.COMPLETED)

        request = _make_admin_request(admin_user)
        queryset = NESQueueItem.objects.filter(
            pk__in=[approved_item.pk, completed_item.pk]
        )
        nesq_admin.bulk_reject(request, queryset)

        approved_item.refresh_from_db()
        completed_item.refresh_from_db()

        assert approved_item.status == QueueStatus.APPROVED
        assert completed_item.status == QueueStatus.COMPLETED


# ============================================================================
# Read-only fields for terminal states
# ============================================================================


@pytest.mark.django_db
class TestReadOnlyFields:
    """Test that completed/failed items have all fields read-only."""

    def test_pending_item_has_base_readonly_fields(self, nesq_admin, contributor_user):
        """PENDING items should only have the base set of read-only fields."""
        item = _make_queue_item(contributor_user, status=QueueStatus.PENDING)

        from django.test import RequestFactory
        request = RequestFactory().get("/admin/nesq/nesqueueitem/")
        request.user = contributor_user

        readonly = nesq_admin.get_readonly_fields(request, item)
        assert "action" not in readonly
        assert "status" not in readonly

    def test_completed_item_has_all_fields_readonly(self, nesq_admin, contributor_user):
        """COMPLETED items should have all model fields read-only."""
        item = _make_queue_item(contributor_user, status=QueueStatus.COMPLETED)

        from django.test import RequestFactory
        request = RequestFactory().get("/admin/nesq/nesqueueitem/")
        request.user = contributor_user

        readonly = nesq_admin.get_readonly_fields(request, item)
        for field in ["action", "status", "submitted_by", "reviewed_by", "change_description"]:
            assert field in readonly, f"{field} should be read-only for COMPLETED items"

    def test_failed_item_has_all_fields_readonly(self, nesq_admin, contributor_user):
        """FAILED items should have all model fields read-only."""
        item = _make_queue_item(contributor_user, status=QueueStatus.FAILED)

        from django.test import RequestFactory
        request = RequestFactory().get("/admin/nesq/nesqueueitem/")
        request.user = contributor_user

        readonly = nesq_admin.get_readonly_fields(request, item)
        for field in ["action", "status", "submitted_by", "reviewed_by", "error_message"]:
            assert field in readonly, f"{field} should be read-only for FAILED items"

    def test_new_item_has_base_readonly_fields(self, nesq_admin):
        """A new (unsaved) item should only have the base read-only fields."""
        from django.test import RequestFactory
        request = RequestFactory().get("/admin/nesq/nesqueueitem/add/")

        readonly = nesq_admin.get_readonly_fields(request, obj=None)
        assert "action" not in readonly
        assert "status" not in readonly
