import re
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import MCPServer, Skill, Summary, Draft, DraftVersion, LLMProvider
from .serializers import (
    CurrentUserSerializer,
    MCPServerSerializer,
    SkillSerializer,
    SummarySerializer,
    DraftSerializer,
    DraftVersionSerializer,
    LLMProviderSerializer,
)
from .permissions import IsAdminOrReadOnly, IsOwnerOrAdmin
from .services import MCPService, LLMService, SummaryGenerationService

logger = logging.getLogger(__name__)


class UserViewSet(viewsets.ViewSet):
    """Current user endpoint."""

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def me(self, request):
        return Response(CurrentUserSerializer(request.user).data)


class QueryViewSet(viewsets.ViewSet):
    """Query processing and case data retrieval."""

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"])
    def extract_case_number(self, request):
        query_text = request.data.get("query", "")
        if not query_text:
            return Response(
                {"error": "Query text is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        match = re.search(
            r"(\d{3}-\d{3}-\d{4}|\d{3}-CR-\d{4})", query_text, re.IGNORECASE
        )
        if match:
            return Response({"case_number": match.group(1), "found": True})
        return Response({"case_number": None, "found": False})

    @action(detail=False, methods=["get"])
    def get_case_data(self, request):
        case_number = request.query_params.get("case_number")
        if not case_number:
            return Response(
                {"error": "case_number query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            mcp_service = MCPService()
            case_data = mcp_service.retrieve_case_data(case_number)
            if case_data:
                return Response(
                    {"case_number": case_number, "data": case_data, "found": True}
                )
            return Response(
                {"error": f"Case {case_number} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            logger.error(f"Error retrieving case data: {e}")
            return Response(
                {"error": f"Failed to retrieve case data: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class MCPServerViewSet(viewsets.ModelViewSet):
    queryset = MCPServer.objects.all()
    serializer_class = MCPServerSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]

    @action(detail=True, methods=["post"])
    def test_connection(self, request, pk=None):
        server = self.get_object()
        is_connected = MCPService().test_connection(server)
        server.status = "connected" if is_connected else "error"
        server.save(update_fields=["status"])
        return Response({"connected": is_connected})


class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]


class SummaryViewSet(viewsets.ModelViewSet):
    serializer_class = SummarySerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Summary.objects.all()
        return Summary.objects.filter(user=user)

    @action(detail=False, methods=["post"])
    def generate(self, request):
        case_number = request.data.get("case_number")
        skill_id = request.data.get("skill_id")
        query = request.data.get("query", "")

        if not case_number or not skill_id:
            return Response(
                {"error": "case_number and skill_id are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            skill = get_object_or_404(Skill, id=skill_id)

            summary_service = SummaryGenerationService()
            is_valid, message = summary_service.validate_skill_prompt(skill)
            if not is_valid:
                return Response(
                    {"error": f"Invalid skill prompt: {message}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            case_data = MCPService().retrieve_case_data(case_number)
            content = summary_service.generate_summary(case_data, skill, query)

            summary = Summary.objects.create(
                user=request.user,
                case_number=case_number,
                skill=skill,
                content=content,
            )
            return Response(
                self.get_serializer(summary).data, status=status.HTTP_201_CREATED
            )

        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            return Response(
                {"error": "Failed to generate summary. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class DraftViewSet(viewsets.ModelViewSet):
    serializer_class = DraftSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Draft.objects.all()
        return Draft.objects.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        draft = self.get_object()
        old_content = draft.content
        serializer.save()
        if old_content != serializer.instance.content:
            DraftVersion.objects.create(draft=draft, content=old_content)

    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        draft = self.get_object()
        return Response(DraftVersionSerializer(draft.versions.all(), many=True).data)

    @action(detail=True, methods=["post"])
    def restore_version(self, request, pk=None):
        draft = self.get_object()
        version_id = request.data.get("version_id")
        version = get_object_or_404(DraftVersion, id=version_id, draft=draft)
        DraftVersion.objects.create(draft=draft, content=draft.content)
        draft.content = version.content
        draft.save()
        return Response(self.get_serializer(draft).data)


class LLMProviderViewSet(viewsets.ModelViewSet):
    queryset = LLMProvider.objects.all()
    serializer_class = LLMProviderSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]

    @action(detail=True, methods=["post"])
    def test_connection(self, request, pk=None):
        provider = self.get_object()
        is_connected = LLMService().test_connection(provider)
        return Response({"connected": is_connected})
