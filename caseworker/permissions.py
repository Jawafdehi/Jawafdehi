from rest_framework import permissions


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permission class that allows access to authenticated users for collection actions,
    and restricts object-level access to owners or admins.
    """

    def has_permission(self, request, view):
        """Require authentication for all actions."""
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        """Allow access to staff or the object owner."""
        if request.user.is_staff:
            return True
        return obj.user == request.user
