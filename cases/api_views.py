"""
API ViewSets for the Jawafdehi accountability platform.

See: .kiro/specs/accountability-platform-core/design.md
"""

from django.core.cache import cache
from django.db import connection
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiExample,
    OpenApiParameter,
    extend_schema,
    extend_schema_view,
)
from rest_framework import filters, status, viewsets
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
import jsonpatch

from .caseworker_serializers import BLOCKED_PATH_PREFIXES, CasePatchSerializer
from .models import Case, CaseState, DocumentSource, JawafEntity
from .rules.predicates import can_change_case
from .serializers import (
    CaseDetailSerializer,
    CaseSerializer,
    DocumentSourceSerializer,
    FeedbackSerializer,
    JawafEntitySerializer,
)


@extend_schema_view(
    list=extend_schema(
        summary="List published cases",
        description="""
        Retrieve a paginated list of published accountability cases.
        
        Only cases with state=PUBLISHED are returned.
        Results are ordered by creation date (newest first).
        
        **Filtering:**
        - `case_type`: Filter by case type (CORRUPTION or PROMISES)
        - `tags`: Filter cases containing a specific tag
        
        **Search:**
        - `search`: Full-text search across title, description, and key allegations
        
        **Pagination:**
        - Results are paginated with 20 items per page
        - Use `page` parameter to navigate pages
        """,
        parameters=[
            OpenApiParameter(
                name="case_type",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="Filter by case type",
                enum=["CORRUPTION", "PROMISES"],
                required=False,
            ),
            OpenApiParameter(
                name="tags",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="Filter cases containing this tag",
                required=False,
            ),
            OpenApiParameter(
                name="search",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="Search across title, description, and key allegations",
                required=False,
            ),
            OpenApiParameter(
                name="page",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description="Page number for pagination",
                required=False,
            ),
        ],
        tags=["cases"],
    ),
    retrieve=extend_schema(
        summary="Retrieve a case",
        description="""
        Retrieve detailed information about a specific published case.
        
        This endpoint includes complete case data (title, description, allegations,
        evidence, timeline) and any internal notes.
        
        Published and IN_REVIEW cases are accessible through this endpoint.
        """,
        tags=["cases"],
    ),
)
class CaseViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public read-only API for Cases (with PATCH support for authenticated users).

    Provides:
    - List endpoint: GET /api/cases/
    - Retrieve endpoint: GET /api/cases/{id}/
    - Patch endpoint: PATCH /api/cases/{id}/ (authenticated users only)

    Filtering:
    - case_type: Filter by case type
    - tags: Filter by tags

    Search:
    - Full-text search across title, description, key_allegations

    Only published cases (state=PUBLISHED) are accessible.
    The detail endpoint also includes IN_REVIEW cases.
    """

    serializer_class = CaseSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["case_type"]
    search_fields = ["title", "description", "key_allegations"]
    authentication_classes = [TokenAuthentication]

    def get_permissions(self):
        """
        Allow PATCH for authenticated users, read-only for everyone else.
        """
        if self.action == "partial_update":
            return [IsAuthenticated()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return CaseDetailSerializer
        return CaseSerializer

    def get_queryset(self):
        """
        Return cases filtered by state.

        List endpoint: PUBLISHED cases only.
        Retrieve endpoint: PUBLISHED and IN_REVIEW cases.
        Partial update endpoint: all cases (permission check happens in partial_update).
        """
        if self.action == "partial_update":
            # PATCH endpoint: return all cases, permission check happens in partial_update method
            return Case.objects.all()

        if self.action == "retrieve":
            queryset = Case.objects.filter(
                state__in=[CaseState.PUBLISHED, CaseState.IN_REVIEW]
            )
        else:
            # List endpoint: only published cases
            queryset = Case.objects.filter(state=CaseState.PUBLISHED)

        # Apply tag filtering if provided
        tags_param = self.request.query_params.get("tags", None)
        if tags_param:
            # Filter cases that contain the specified tag
            # For SQLite, we need to filter in Python since it doesn't support JSON contains
            # For PostgreSQL, we can use the contains lookup
            if connection.vendor == "postgresql":
                queryset = queryset.filter(tags__contains=[tags_param])
            else:
                # For SQLite, filter by checking if tag is in the list
                # Get all case IDs that have the tag
                case_ids_with_tag = [
                    case.id
                    for case in queryset
                    if case.tags and tags_param in case.tags
                ]
                queryset = queryset.filter(id__in=case_ids_with_tag)

        return queryset.order_by("-created_at")

    def partial_update(self, request, pk=None):
        """
        PATCH /api/cases/{id}/

        Accepts an RFC 6902 JSON Patch document and applies it against a writable
        snapshot of the case. The snapshot is validated after patching, then scalar
        fields are saved via a bulk UPDATE and M2M relations are updated with .set().

        Blocked paths (id, case_id, version, state, contributors, timestamps,
        versionInfo) are rejected before the patch is applied.
        """
        try:
            case = self.get_object()
        except Case.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if not can_change_case(request.user, case):
            return Response(
                {"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN
            )

        patch_ops = request.data
        if not isinstance(patch_ops, list):
            return Response(
                {"detail": "Request body must be a JSON array of patch operations."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Reject blocked paths before applying the patch
        for op in patch_ops:
            if not isinstance(op, dict):
                return Response(
                    {"detail": "Each patch operation must be a JSON object."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            path = op.get("path", "")
            for blocked in BLOCKED_PATH_PREFIXES:
                if path == blocked or path.startswith(blocked + "/"):
                    return Response(
                        {"detail": f"Patching path '{path}' is not allowed."},
                        status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    )

        snapshot = self._build_snapshot(case)
        try:
            patched = jsonpatch.apply_patch(snapshot, patch_ops)
        except (jsonpatch.JsonPatchException, jsonpatch.JsonPointerException) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CasePatchSerializer(data=patched)
        if not serializer.is_valid():
            return Response(
                serializer.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        validated = serializer.validated_data

        # Fields that map directly to Case model columns (updated via bulk UPDATE)
        scalar_fields = frozenset(
            [
                "title",
                "short_description",
                "description",
                "thumbnail_url",
                "banner_url",
                "case_start_date",
                "case_end_date",
                "tags",
                "key_allegations",
                "timeline",
                "evidence",
            ]
        )

        # Maps writable snapshot key → Case M2M attribute name
        m2m_fields = {
            "alleged_entity_ids": "alleged_entities",
            "related_entity_ids": "related_entities",
            "location_ids": "locations",
        }

        # Persist scalar field changes
        scalar_updates = {
            field: validated[field] for field in scalar_fields if field in validated
        }
        if scalar_updates:
            Case.objects.filter(pk=pk).update(**scalar_updates)

        # Persist M2M changes
        case.refresh_from_db()
        for id_field, m2m_attr in m2m_fields.items():
            if id_field in validated:
                getattr(case, m2m_attr).set(validated[id_field])

        case.refresh_from_db()
        return Response(CaseSerializer(case).data, status=status.HTTP_200_OK)

    def _build_snapshot(self, case: Case) -> dict:
        """Return a writable dict representing the patchable surface of a case."""
        return {
            "title": case.title,
            "short_description": case.short_description,
            "description": case.description,
            "thumbnail_url": case.thumbnail_url,
            "banner_url": case.banner_url,
            "case_start_date": (
                str(case.case_start_date) if case.case_start_date else None
            ),
            "case_end_date": str(case.case_end_date) if case.case_end_date else None,
            "case_type": case.case_type,
            "tags": list(case.tags) if case.tags else [],
            "key_allegations": (
                list(case.key_allegations) if case.key_allegations else []
            ),
            "timeline": list(case.timeline) if case.timeline else [],
            "evidence": list(case.evidence) if case.evidence else [],
            "alleged_entity_ids": list(
                case.alleged_entities.values_list("id", flat=True)
            ),
            "related_entity_ids": list(
                case.related_entities.values_list("id", flat=True)
            ),
            "location_ids": list(case.locations.values_list("id", flat=True)),
        }


@extend_schema_view(
    list=extend_schema(
        summary="List document sources",
        description="""
        Retrieve a paginated list of document sources.
        
        Only sources associated with published cases are accessible.
        Soft-deleted sources (is_deleted=True) are excluded.
        
        **Pagination:**
        - Results are paginated with 20 items per page
        - Use `page` parameter to navigate pages
        """,
        parameters=[
            OpenApiParameter(
                name="page",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description="Page number for pagination",
                required=False,
            ),
        ],
        tags=["sources"],
    ),
    retrieve=extend_schema(
        summary="Retrieve a document source",
        description="""
        Retrieve detailed information about a specific document source.
        
        The endpoint accepts either the database id (numeric) or the source_id 
        (e.g., 'source:20240115:abc123').
        
        Only sources associated with at least one published case are accessible.
        """,
        tags=["sources"],
    ),
)
class DocumentSourceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public read-only API for DocumentSources.

    Provides:
    - List endpoint: GET /api/sources/
    - Retrieve endpoint: GET /api/sources/{id_or_source_id}/

    The retrieve endpoint accepts either the database id or the source_id.
    Only sources associated with published cases are accessible.
    """

    serializer_class = DocumentSourceSerializer
    lookup_field = "pk"

    def get_queryset(self):
        """
        Return only sources referenced in evidence of published cases.

        A source is accessible if it's referenced in the evidence field
        of at least one published case.
        """
        published_cases = Case.objects.filter(state=CaseState.PUBLISHED)

        # Extract all source_ids from evidence fields
        source_ids = set()
        for case in published_cases:
            if case.evidence:
                for evidence_item in case.evidence:
                    if isinstance(evidence_item, dict) and "source_id" in evidence_item:
                        source_ids.add(evidence_item["source_id"])

        # Return sources that are referenced and not soft-deleted
        return DocumentSource.objects.filter(
            source_id__in=source_ids, is_deleted=False
        ).distinct()

    def get_object(self):
        """
        Override to support lookup by either id or source_id.

        Tries to lookup by id first (if numeric), then falls back to source_id.
        """
        queryset = self.filter_queryset(self.get_queryset())
        lookup_value = self.kwargs.get(self.lookup_field)

        # Try to lookup by id if the value is numeric
        if lookup_value.isdigit():
            try:
                obj = queryset.get(id=int(lookup_value))
                self.check_object_permissions(self.request, obj)
                return obj
            except DocumentSource.DoesNotExist:
                pass

        # Fall back to lookup by source_id
        try:
            obj = queryset.get(source_id=lookup_value)
            self.check_object_permissions(self.request, obj)
            return obj
        except DocumentSource.DoesNotExist:
            from rest_framework.exceptions import NotFound

            raise NotFound(f"Source with id or source_id '{lookup_value}' not found.")


@extend_schema_view(
    list=extend_schema(
        summary="List all entities",
        description="""
        Retrieve a paginated list of all entities in the system.
        
        Entities can have either:
        - `nes_id`: Reference to Nepal Entity Service
        - `display_name`: Custom entity name
        - Both fields (display_name is optional when nes_id is present)
        
        **Search:**
        - `search`: Search across nes_id and display_name
        
        **Pagination:**
        - Results are paginated with 50 items per page
        - Use `page` parameter to navigate pages
        """,
        parameters=[
            OpenApiParameter(
                name="search",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="Search across nes_id and display_name",
                required=False,
            ),
            OpenApiParameter(
                name="page",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description="Page number for pagination",
                required=False,
            ),
        ],
        tags=["entities"],
    ),
    retrieve=extend_schema(
        summary="Retrieve an entity",
        description="""
        Retrieve detailed information about a specific entity.
        
        Returns entity with id, nes_id, and display_name.
        """,
        tags=["entities"],
    ),
)
class JawafEntityViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public read-only API for JawafEntities.

    Provides:
    - List endpoint: GET /api/entities/ (filtered by case association)
    - Retrieve endpoint: GET /api/entities/{id}/

    Search:
    - Full-text search across nes_id and display_name

    Only entities associated with published cases are returned in list view.
    Entities must appear in alleged_entities or related_entities (not locations).
    """

    serializer_class = JawafEntitySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["nes_id", "display_name"]

    def get_queryset(self):
        """
        Return entities based on action.

        For list action: Only entities that appear in published cases.
        For retrieve action: All entities (no filtering).

        An entity is included in list if it appears in alleged_entities or
        related_entities of at least one published case.

        Note: Location entities are excluded from the list.

        Uses caching to avoid expensive queryset evaluation.
        """
        # For retrieve action, return all entities
        if self.action == "retrieve":
            return JawafEntity.objects.all()

        # For list action, filter by case association
        from django.core.cache import cache

        # Try to get entity IDs from cache
        entity_ids = cache.get("public_entities_list")

        if entity_ids is None:
            # Cache miss - compute entity IDs
            published_cases = Case.objects.filter(state=CaseState.PUBLISHED)

            entity_ids = set()
            for case in published_cases:
                # Add alleged entities
                entity_ids.update(case.alleged_entities.values_list("id", flat=True))
                # Add related entities
                entity_ids.update(case.related_entities.values_list("id", flat=True))

            # Cache for 10 minutes - stale cache is acceptable
            cache.set("public_entities_list", entity_ids, timeout=600)

        return JawafEntity.objects.filter(id__in=entity_ids).order_by("-created_at")


@extend_schema(
    summary="Get case statistics",
    description="""
    Retrieve aggregate statistics about cases in the system.
    
    Returns:
    - `published_cases`: Number of cases with state PUBLISHED
    - `cases_under_investigation`: Number of cases with state DRAFT or IN_REVIEW
    - `cases_closed`: Number of cases with state CLOSED
    - `entities_tracked`: Number of unique entities involved in published cases
    - `last_updated`: Timestamp when statistics were last calculated
    
    **Caching:**
    - Statistics are cached for 5 minutes to optimize performance
    - The cache is automatically refreshed after expiration
    """,
    tags=["statistics"],
    responses={
        200: {
            "type": "object",
            "properties": {
                "published_cases": {"type": "integer", "example": 127},
                "cases_under_investigation": {"type": "integer", "example": 43},
                "cases_closed": {"type": "integer", "example": 31},
                "entities_tracked": {"type": "integer", "example": 89},
                "last_updated": {
                    "type": "string",
                    "format": "date-time",
                    "example": "2024-12-04T10:30:00Z",
                },
            },
        }
    },
)
class StatisticsView(APIView):
    """
    Public API endpoint for case statistics.

    Provides aggregate counts of cases by state and unique entities tracked.
    Results are cached for 5 minutes using LocMemCache.
    """

    def get(self, request):
        """
        Get cached or calculate fresh statistics.
        """
        cache_key = "stats-cache"

        # Try to get from cache
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        # Calculate statistics
        stats = {
            "published_cases": Case.objects.filter(state=CaseState.PUBLISHED).count(),
            "cases_under_investigation": Case.objects.filter(
                state__in=[CaseState.DRAFT, CaseState.IN_REVIEW]
            ).count(),
            "cases_closed": Case.objects.filter(state=CaseState.CLOSED).count(),
            "entities_tracked": JawafEntity.objects.count(),
            "last_updated": timezone.now().isoformat(),
        }

        # Cache for 5 minutes
        cache.set(cache_key, stats, timeout=300)

        return Response(stats)


class FeedbackRateThrottle(AnonRateThrottle):
    """Rate throttle for feedback submissions: 5 per hour."""

    rate = "5/hour"


@extend_schema(
    summary="Submit platform feedback",
    description="""
    Submit feedback, bug reports, feature requests, or general comments about the platform.
    
    Rate limited to 5 submissions per IP address per hour.
    Contact information is optional - anonymous submissions are welcome.
    """,
    request=FeedbackSerializer,
    responses={
        201: FeedbackSerializer,
        400: OpenApiTypes.OBJECT,
        429: OpenApiTypes.OBJECT,
    },
    examples=[
        OpenApiExample(
            "Bug Report",
            value={
                "feedbackType": "bug",
                "subject": "Search not working on Cases page",
                "description": "When I try to search for cases, nothing happens.",
                "relatedPage": "Cases page",
                "contactInfo": {
                    "name": "राम बहादुर",
                    "contactMethods": [{"type": "email", "value": "ram@example.com"}],
                },
            },
            request_only=True,
        ),
        OpenApiExample(
            "Anonymous Feedback",
            value={
                "feedbackType": "general",
                "subject": "Great platform",
                "description": "This platform is very helpful!",
            },
            request_only=True,
        ),
    ],
)
class FeedbackView(APIView):
    """API view for submitting platform feedback."""

    throttle_classes = [FeedbackRateThrottle]

    def post(self, request):
        """Handle feedback submission."""
        serializer = FeedbackSerializer(data=request.data)

        if serializer.is_valid():
            # Capture metadata
            feedback = serializer.save(
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
            )

            return Response(
                serializer.to_representation(feedback), status=status.HTTP_201_CREATED
            )

        return Response(
            {"error": "Validation error", "details": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0].strip()
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip
