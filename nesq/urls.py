"""URL configuration for the NES Queue System (NESQ).

Routes:
    POST /api/submit_nes_change   — Submit a new entity update request.
    GET  /api/my_nes_submissions  — List the authenticated user's submissions.

See .kiro/specs/nes-queue-system/ for full specification.
"""

from django.urls import path

from nesq.api_views import ListMySubmissionsView, SubmitNESChangeView

urlpatterns = [
    path(
        "submit_nes_change",
        SubmitNESChangeView.as_view(),
        name="nesq-submit",
    ),
    path(
        "my_nes_submissions",
        ListMySubmissionsView.as_view(),
        name="nesq-my-submissions",
    ),
]
