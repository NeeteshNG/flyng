"""
Custom Permission Classes for FlyNG
"""

from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """
    Permission check for Admin role.
    """

    message = "Admin access required."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_admin()


class IsManager(permissions.BasePermission):
    """
    Permission check for Manager role (includes Admin).
    """

    message = "Manager access required."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_manager()


class IsOperator(permissions.BasePermission):
    """
    Permission check for Operator role (includes Admin and Manager).
    """

    message = "Operator access required."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.can_modify()


class IsVerified(permissions.BasePermission):
    """
    Permission check for verified users.
    """

    message = "Email verification required."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_verified


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Object-level permission to only allow owners or admins to edit.
    """

    message = "You do not have permission to access this resource."

    def has_object_permission(self, request, view, obj):
        if request.user.is_admin():
            return True

        # Check if the object has a user field
        if hasattr(obj, "user"):
            return obj.user == request.user

        # Check if the object is the user itself
        if hasattr(obj, "email"):
            return obj == request.user

        return False


class ReadOnly(permissions.BasePermission):
    """
    Permission to allow read-only access.
    """

    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permission to allow read access to anyone, but write access to admins only.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated and request.user.is_admin()


class IsManagerOrReadOnly(permissions.BasePermission):
    """
    Permission to allow read access to anyone, but write access to managers only.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated and request.user.is_manager()


class IsAdminOrManager(permissions.BasePermission):
    """
    Permission check for Admin or Manager role.
    """

    message = "Admin or Manager access required."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_manager()


class IsAdminOrManagerOrReadOnly(permissions.BasePermission):
    """
    Permission to allow read access to anyone, but write access to admin/managers only.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated and request.user.is_manager()
