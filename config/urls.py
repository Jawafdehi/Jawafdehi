"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from cases.views import index, docs
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("", index, name="index"),
    path("docs/", docs, name="docs"),
    path("admin/", admin.site.urls),
    path("tinymce/", include("tinymce.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/swagger/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/", include("cases.urls")),
    path("api/", include("nesq.urls")),
    path("api/", include("ngm.urls")),
    # Caseworker Agent routes
    path("api/caseworker/", include("caseworker.urls")),
    path(
        "api/caseworker/auth/token/",
        TokenObtainPairView.as_view(),
        name="cw-token-obtain",
    ),
    path(
        "api/caseworker/auth/token/refresh/",
        TokenRefreshView.as_view(),
        name="cw-token-refresh",
    ),
]
