"""API views for the NES Queue System (NESQ).

Provides REST API endpoints for submitting and viewing NES entity update
requests. Submissions are validated using both DRF serializers (request
structure) and Pydantic models (payload content), then stored as
NESQueueItem records for admin review and batch processing.

Endpoints:
    POST /api/submit_nes_change — Submit a new entity update request.
    GET  /api/my_nes_submissions — List the authenticated user's submissions.

See .kiro/specs/nes-queue-system/ for full specification.
"""

import logging

from pydantic import ValidationError as PydanticValidationError
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from cases.rules.predicates import is_admin_or_moderator

from nesq.models import NESQueueItem, QueueAction, QueueStatus
from nesq.serializers import NESQueueItemSerializer, NESQueueSubmitSerializer
from nesq.validators import validate_action_payload

logger = logging.getLogger(__name__)


# ============================================================================
# Pagination
# ============================================================================


class NESQueuePagination(PageNumberPagination):
    """Pagination for the user's submission list.

    Returns 20 items per page by default, configurable up to 100 via
    the ``page_size`` query parameter.
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


# ============================================================================
# Submit Endpoint
# ============================================================================


class SubmitNESChangeView(APIView):
    """Submit a new NES entity update request.

    Accepts token-authenticated POST requests with an action, payload,
    change description, and optional auto_approve flag. The payload is
    validated in two stages:

    1. **DRF serializer** — checks request structure (action is a valid
       QueueAction, payload is a dict, change_description is non-empty).
    2. **Pydantic model** — validates payload content against the
       action-specific schema (e.g. AddNamePayload for ADD_NAME).

    If ``auto_approve=True`` and the user is an Admin or Moderator, the
    queue item is created with status=APPROVED (skipping manual review).
    Contributors who attempt ``auto_approve=True`` receive a 403 response.

    MVP: Only the ADD_NAME action is supported. Other actions return 400.
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Handle POST /api/submit_nes_change.

        Returns:
            201 Created with the serialized NESQueueItem on success.
            400 Bad Request if DRF or Pydantic validation fails.
            403 Forbidden if a contributor tries auto_approve=True.
        """
        # ------------------------------------------------------------------
        # Step 1: Validate request structure with DRF serializer
        # ------------------------------------------------------------------
        serializer = NESQueueSubmitSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        action = serializer.validated_data["action"]
        payload = serializer.validated_data["payload"]
        change_description = serializer.validated_data["change_description"]
        auto_approve = serializer.validated_data.get("auto_approve", False)

        # ------------------------------------------------------------------
        # Step 2: Reject unsupported actions (MVP: ADD_NAME only)
        # ------------------------------------------------------------------
        if action != QueueAction.ADD_NAME:
            return Response(
                {"action": "Only ADD_NAME action is supported in this version."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ------------------------------------------------------------------
        # Step 3: Validate payload with Pydantic
        # ------------------------------------------------------------------
        try:
            validate_action_payload(action, payload)
        except PydanticValidationError as exc:
            # Use include_context=False to strip non-JSON-serializable
            # objects (e.g., raw ValueError instances) from the ctx field.
            return Response(
                {"payload": exc.errors(include_context=False)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ValueError as exc:
            return Response(
                {"payload": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ------------------------------------------------------------------
        # Step 4: Check auto_approve permission
        # ------------------------------------------------------------------
        if auto_approve:
            if not is_admin_or_moderator(request.user):
                return Response(
                    {
                        "auto_approve": (
                            "Only Admin and Moderator users can set "
                            "auto_approve=true."
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        # ------------------------------------------------------------------
        # Step 5: Determine initial status
        # ------------------------------------------------------------------
        from django.utils import timezone

        if auto_approve:
            initial_status = QueueStatus.APPROVED
            reviewed_by = request.user
            reviewed_at = timezone.now()
        else:
            initial_status = QueueStatus.PENDING
            reviewed_by = None
            reviewed_at = None

        # ------------------------------------------------------------------
        # Step 6: Create the queue item
        # ------------------------------------------------------------------
        queue_item = NESQueueItem.objects.create(
            action=action,
            payload=payload,
            status=initial_status,
            change_description=change_description,
            submitted_by=request.user,
            reviewed_by=reviewed_by,
            reviewed_at=reviewed_at,
        )

        logger.info(
            "NESQ item %d created: action=%s status=%s user=%s",
            queue_item.pk,
            action,
            initial_status,
            request.user.username,
        )

        # ------------------------------------------------------------------
        # Step 7: Return serialized response
        # ------------------------------------------------------------------
        response_serializer = NESQueueItemSerializer(queue_item)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


# ============================================================================
# List User Submissions Endpoint
# ============================================================================


class ListMySubmissionsView(APIView):
    """List the authenticated user's NESQ submissions.

    Returns a paginated list of NESQueueItem records submitted by the
    current user, ordered newest-first.

    Query parameters:
        page — Page number (default: 1).
        page_size — Items per page (default: 20, max: 100).
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Handle GET /api/my_nes_submissions.

        Returns:
            200 OK with a paginated list of serialized NESQueueItems.
        """
        queryset = (
            NESQueueItem.objects.filter(submitted_by=request.user)
            .select_related("submitted_by", "reviewed_by")
            .order_by("-created_at")
        )

        paginator = NESQueuePagination()
        page = paginator.paginate_queryset(queryset, request)

        if page is not None:
            serializer = NESQueueItemSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        # Fallback if pagination is not applicable (shouldn't happen)
        serializer = NESQueueItemSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)