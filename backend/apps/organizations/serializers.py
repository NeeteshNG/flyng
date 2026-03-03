"""
Organization API Serializers
"""

from rest_framework import serializers

from apps.organizations.models import (
    Organization,
    OrganizationAPIKey,
    OrganizationMembership,
    Plan,
    Subscription,
)


class PlanSerializer(serializers.ModelSerializer):
    """Serializer for Plan model (read-only listing)."""

    annual_savings = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    annual_discount_percent = serializers.DecimalField(
        max_digits=5, decimal_places=1, read_only=True
    )

    class Meta:
        model = Plan
        fields = [
            "id",
            "name",
            "plan_type",
            "description",
            "is_active",
            "monthly_price",
            "annual_price",
            "max_users",
            "max_warehouses",
            "max_drones",
            "max_storage_locations",
            "max_orders_per_month",
            "analytics_enabled",
            "api_access_enabled",
            "priority_support",
            "custom_branding",
            "audit_logs_enabled",
            "export_enabled",
            "api_rate_limit_per_minute",
            "data_retention_days",
            "display_order",
            "annual_savings",
            "annual_discount_percent",
        ]
        read_only_fields = fields


class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for Subscription model."""

    plan_name = serializers.CharField(source="plan.name", read_only=True)
    plan_type = serializers.CharField(source="plan.plan_type", read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    is_trialing = serializers.BooleanField(read_only=True)
    days_until_renewal = serializers.IntegerField(read_only=True)
    is_past_due = serializers.BooleanField(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    billing_cycle_display = serializers.CharField(
        source="get_billing_cycle_display", read_only=True
    )

    class Meta:
        model = Subscription
        fields = [
            "id",
            "plan",
            "plan_name",
            "plan_type",
            "status",
            "status_display",
            "billing_cycle",
            "billing_cycle_display",
            "amount",
            "currency",
            "started_at",
            "trial_ends_at",
            "current_period_start",
            "current_period_end",
            "cancelled_at",
            "cancel_at_period_end",
            "is_active",
            "is_trialing",
            "days_until_renewal",
            "is_past_due",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class OrganizationBillingSerializer(serializers.ModelSerializer):
    """Serializer for Organization billing overview."""

    plan_name = serializers.CharField(source="plan.name", read_only=True)
    plan_type = serializers.CharField(source="plan.plan_type", read_only=True)
    is_on_trial = serializers.BooleanField(read_only=True)
    trial_days_remaining = serializers.IntegerField(read_only=True)
    usage_stats = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "slug",
            "logo",
            "plan",
            "plan_name",
            "plan_type",
            "is_on_trial",
            "trial_days_remaining",
            "trial_ends_at",
            "usage_stats",
        ]
        read_only_fields = fields

    def get_usage_stats(self, obj):
        return obj.get_usage_stats()


class OrganizationMembershipSerializer(serializers.ModelSerializer):
    """Serializer for reading the current user's membership."""

    organization_name = serializers.CharField(
        source="organization.name", read_only=True
    )
    organization_id = serializers.IntegerField(
        source="organization.id", read_only=True
    )

    class Meta:
        model = OrganizationMembership
        fields = [
            "id",
            "organization_id",
            "organization_name",
            "membership_role",
            "user_role",
            "is_active",
            "joined_at",
        ]
        read_only_fields = fields


class APIKeyListSerializer(serializers.ModelSerializer):
    """Serializer for listing API keys (no sensitive data)."""

    created_by_name = serializers.CharField(
        source="created_by_user.get_full_name", read_only=True
    )
    is_expired = serializers.BooleanField(read_only=True)
    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = OrganizationAPIKey
        fields = [
            "id",
            "name",
            "prefix",
            "description",
            "is_active",
            "is_expired",
            "is_valid",
            "scopes",
            "rate_limit_per_minute",
            "expires_at",
            "last_used_at",
            "last_used_ip",
            "usage_count",
            "created_by_user",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class APIKeyCreateSerializer(serializers.Serializer):
    """Serializer for creating a new API key."""

    name = serializers.CharField(max_length=100)
    description = serializers.CharField(required=False, default="", allow_blank=True)
    scopes = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        default=list,
    )
    expires_at = serializers.DateTimeField(required=False, allow_null=True, default=None)

    def validate_name(self, value):
        organization = self.context.get("organization")
        if organization and OrganizationAPIKey.objects.filter(
            organization=organization, name=value, is_active=True
        ).exists():
            raise serializers.ValidationError("An active API key with this name already exists.")
        return value


class APIKeyCreateResponseSerializer(serializers.ModelSerializer):
    """Serializer for the create response (includes the raw key, shown only once)."""

    raw_key = serializers.CharField(read_only=True)
    created_by_name = serializers.CharField(
        source="created_by_user.get_full_name", read_only=True
    )

    class Meta:
        model = OrganizationAPIKey
        fields = [
            "id",
            "name",
            "prefix",
            "description",
            "is_active",
            "scopes",
            "rate_limit_per_minute",
            "expires_at",
            "created_by_user",
            "created_by_name",
            "created_at",
            "raw_key",
        ]
        read_only_fields = fields
