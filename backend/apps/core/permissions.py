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


class HasPermission(permissions.BasePermission):
    """
    Per-action permission check based on OrganizationMembership.user_role.

    Builds a permission code as: {app_label}.{resource}.{action}
    and checks it against the role's permission matrix.

    ViewSets can override detection with:
      - permission_resource: str  (e.g., "export")
      - permission_app: str       (e.g., "core")
    """

    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        from apps.organizations.models import OrganizationMembership

        membership = OrganizationMembership.objects.filter(
            user=request.user, is_active=True
        ).first()

        # Use membership role if available, otherwise fall back to global User.role
        role = membership.user_role if membership else request.user.role

        permission_code = self._get_permission_code(request, view)
        if not permission_code:
            return True  # Can't determine code — allow as fallback

        from apps.core.permission_matrix import has_permission as check_perm

        return check_perm(role, permission_code)

    def _get_permission_code(self, request, view):
        # Determine action
        action = getattr(view, "action", None)
        if not action:
            method_map = {
                "GET": "list",
                "POST": "create",
                "PUT": "update",
                "PATCH": "partial_update",
                "DELETE": "destroy",
            }
            action = method_map.get(request.method, "list")

        # Determine resource name
        resource = getattr(view, "permission_resource", None)
        if not resource:
            queryset = getattr(view, "queryset", None)
            model = getattr(queryset, "model", None) if queryset is not None else None
            if model:
                resource = model.__name__.lower()
            else:
                return None

        # Determine app label
        app_label = getattr(view, "permission_app", None)
        if not app_label:
            queryset = getattr(view, "queryset", None)
            model = getattr(queryset, "model", None) if queryset is not None else None
            if model:
                app_label = model._meta.app_label
            else:
                return None

        return f"{app_label}.{resource}.{action}"


class PlanLimitPermission(permissions.BasePermission):
    """
    Blocks POST (create) when the organization has hit the plan limit
    for the resource type declared on the view.

    Usage: Set ``plan_limit_resource`` on the ViewSet.
    Valid values: "user", "warehouse", "drone", "storage_location", "order"
    """

    LIMIT_MAP = {
        "user": "can_add_user",
        "warehouse": "can_add_warehouse",
        "drone": "can_add_drone",
        "storage_location": "can_add_storage_location",
        "order": "can_add_order",
    }

    message = "Plan limit reached. Upgrade your plan to add more resources."

    def has_permission(self, request, view):
        if request.method != "POST":
            return True

        resource = getattr(view, "plan_limit_resource", None)
        if not resource:
            return True

        checker_name = self.LIMIT_MAP.get(resource)
        if not checker_name:
            return True

        from apps.organizations.models import OrganizationMembership

        membership = (
            OrganizationMembership.objects.filter(user=request.user, is_active=True)
            .select_related("organization__plan")
            .first()
        )

        if not membership or not membership.organization:
            return True  # No org — other permission classes will block

        org = membership.organization
        checker = getattr(org, checker_name, None)
        if checker and not checker():
            self.message = (
                f"Plan limit reached for {resource.replace('_', ' ')}s. "
                f"Upgrade your plan to add more."
            )
            return False

        return True
