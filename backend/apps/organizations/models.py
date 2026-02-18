"""
Organization Models for FlyNG

Day 2: Organization, OrganizationSettings, Plan
Day 3: OrganizationMembership, OrganizationInvitation, Subscription, OrganizationAPIKey

Multi-tenant architecture with:
- Organizations (companies/tenants)
- Subscription plans with feature limits
- Organization settings and preferences
- Team membership and invitations
- Subscription billing management
- API key management for external integrations
"""
import datetime
import hashlib
import secrets
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _
from phonenumber_field.modelfields import PhoneNumberField

from apps.core.choices import (
    BillingCycle,
    CurrencyChoices,
    DateFormatChoices,
    InvitationStatus,
    LanguageChoices,
    MembershipRole,
    PlanType,
    SubscriptionStatus,
    TimezoneChoices,
    UserRole,
)
from apps.core.models import AuditedModel, BaseModel, ReadOnlyModel


# =============================================================================
# Validators
# =============================================================================

# GST number validator for India (15 characters)
gst_validator = RegexValidator(
    regex=r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$',
    message='Enter a valid GST number (e.g., 22AAAAA0000A1Z5)',
)

# PAN number validator for India (10 characters)
pan_validator = RegexValidator(
    regex=r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$',
    message='Enter a valid PAN number (e.g., ABCDE1234F)',
)


# =============================================================================
# Managers
# =============================================================================

class OrganizationManager(models.Manager):
    """Custom manager for Organization model."""

    def active(self):
        """Return only active organizations."""
        return self.filter(is_active=True)

    def verified(self):
        """Return only verified organizations."""
        return self.filter(is_verified=True, is_active=True)

    def on_trial(self):
        """Return organizations currently on trial."""
        return self.filter(
            trial_ends_at__isnull=False,
            trial_ends_at__gt=timezone.now(),
            is_active=True,
        )

    def trial_expiring_soon(self, days=7):
        """Return organizations with trial expiring in N days."""
        cutoff = timezone.now() + datetime.timedelta(days=days)
        return self.filter(
            trial_ends_at__isnull=False,
            trial_ends_at__lte=cutoff,
            trial_ends_at__gt=timezone.now(),
            is_active=True,
        )


class Plan(BaseModel):
    """
    Subscription plans that define feature limits and pricing.
    Plans are predefined by the system (Free, Starter, Professional, Enterprise).
    """

    name = models.CharField(
        max_length=50,
        unique=True,
        verbose_name=_('Name'),
        help_text=_('Display name of the plan'),
    )
    plan_type = models.CharField(
        max_length=20,
        choices=PlanType.choices,
        unique=True,
        db_index=True,
        verbose_name=_('Plan Type'),
    )
    description = models.TextField(
        blank=True,
        verbose_name=_('Description'),
        help_text=_('Description of plan features'),
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name=_('Is Active'),
        help_text=_('Whether this plan is available for new subscriptions'),
    )

    # Pricing (in INR)
    monthly_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name=_('Monthly Price'),
        help_text=_('Monthly price in INR'),
    )
    annual_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name=_('Annual Price'),
        help_text=_('Annual price in INR (typically discounted)'),
    )

    # Feature Limits
    max_users = models.PositiveIntegerField(
        default=1,
        verbose_name=_('Maximum Users'),
        help_text=_('Maximum number of users allowed'),
    )
    max_warehouses = models.PositiveIntegerField(
        default=1,
        verbose_name=_('Maximum Warehouses'),
        help_text=_('Maximum number of warehouses'),
    )
    max_drones = models.PositiveIntegerField(
        default=1,
        verbose_name=_('Maximum Drones'),
        help_text=_('Maximum number of drones per warehouse'),
    )
    max_storage_locations = models.PositiveIntegerField(
        default=100,
        verbose_name=_('Maximum Storage Locations'),
        help_text=_('Maximum storage locations per warehouse'),
    )
    max_orders_per_month = models.PositiveIntegerField(
        default=100,
        verbose_name=_('Maximum Orders Per Month'),
        help_text=_('Maximum orders per month (0 = unlimited)'),
    )

    # Feature Flags
    analytics_enabled = models.BooleanField(
        default=False,
        verbose_name=_('Analytics Enabled'),
        help_text=_('Access to analytics dashboard'),
    )
    api_access_enabled = models.BooleanField(
        default=False,
        verbose_name=_('API Access Enabled'),
        help_text=_('Access to public API'),
    )
    priority_support = models.BooleanField(
        default=False,
        verbose_name=_('Priority Support'),
        help_text=_('Priority customer support'),
    )
    custom_branding = models.BooleanField(
        default=False,
        verbose_name=_('Custom Branding'),
        help_text=_('Custom logo and branding'),
    )
    audit_logs_enabled = models.BooleanField(
        default=False,
        verbose_name=_('Audit Logs Enabled'),
        help_text=_('Access to detailed audit logs'),
    )
    export_enabled = models.BooleanField(
        default=True,
        verbose_name=_('Export Enabled'),
        help_text=_('Allow data export (CSV, JSON)'),
    )

    # API Rate Limits
    api_rate_limit_per_minute = models.PositiveIntegerField(
        default=60,
        verbose_name=_('API Rate Limit'),
        help_text=_('API requests allowed per minute'),
    )

    # Data Retention
    data_retention_days = models.PositiveIntegerField(
        default=90,
        verbose_name=_('Data Retention Days'),
        help_text=_('Days to retain telemetry and log data'),
    )

    # Display order for pricing page
    display_order = models.PositiveIntegerField(
        default=0,
        verbose_name=_('Display Order'),
        help_text=_('Order for displaying plans (lower = first)'),
    )

    class Meta:
        verbose_name = _('Plan')
        verbose_name_plural = _('Plans')
        ordering = ['display_order', 'monthly_price']

    def __str__(self):
        return f'{self.name} ({self.get_plan_type_display()})'

    @property
    def is_free(self):
        return self.plan_type == PlanType.FREE

    @property
    def annual_savings(self):
        """Calculate savings when paying annually."""
        monthly_annual = self.monthly_price * 12
        return monthly_annual - self.annual_price

    @property
    def annual_discount_percent(self):
        """Calculate annual discount percentage."""
        if self.monthly_price == 0:
            return 0
        monthly_annual = self.monthly_price * 12
        if monthly_annual == 0:
            return 0
        return int(((monthly_annual - self.annual_price) / monthly_annual) * 100)

    def has_unlimited_orders(self):
        return self.max_orders_per_month == 0

    @classmethod
    def get_default_plan(cls):
        """Get the default (FREE) plan."""
        return cls.objects.filter(plan_type=PlanType.FREE).first()


class Organization(AuditedModel):
    """
    Organization (Tenant) - the top-level entity in the multi-tenant hierarchy.
    Each organization has its own users, warehouses, drones, inventory, etc.
    """

    name = models.CharField(
        max_length=100,
        verbose_name=_('Name'),
        help_text=_('Organization name'),
    )
    slug = models.SlugField(
        max_length=120,
        unique=True,
        db_index=True,
        verbose_name=_('Slug'),
        help_text=_('URL-friendly identifier'),
    )
    description = models.TextField(
        blank=True,
        verbose_name=_('Description'),
        help_text=_('Brief description of the organization'),
    )

    # Logo and branding
    logo = models.ImageField(
        upload_to='organizations/logos/%Y/%m/',
        blank=True,
        null=True,
        verbose_name=_('Logo'),
        help_text=_('Organization logo (recommended: 256x256 px)'),
    )

    # Contact information
    email = models.EmailField(
        verbose_name=_('Primary Email'),
        help_text=_('Primary contact email'),
    )
    phone = PhoneNumberField(
        verbose_name=_('Phone Number'),
        blank=True,
        region='IN',
        help_text=_('Primary contact phone with country code'),
    )
    website = models.URLField(
        blank=True,
        verbose_name=_('Website'),
        help_text=_('Organization website'),
    )

    # Address
    address_line1 = models.CharField(
        verbose_name=_('Address Line 1'),
        max_length=255,
        blank=True,
    )
    address_line2 = models.CharField(
        verbose_name=_('Address Line 2'),
        max_length=255,
        blank=True,
    )
    city = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_('City'),
    )
    state = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_('State'),
    )
    postal_code = models.CharField(
        verbose_name=_('PIN Code'),
        max_length=10,
        blank=True,
    )
    country = models.CharField(
        max_length=100,
        default='India',
        verbose_name=_('Country'),
    )

    # India-specific compliance fields
    gst_number = models.CharField(
        verbose_name=_('GST Number'),
        max_length=15,
        blank=True,
        validators=[gst_validator],
        help_text=_('GST Identification Number (GSTIN)'),
    )
    pan_number = models.CharField(
        verbose_name=_('PAN Number'),
        max_length=10,
        blank=True,
        validators=[pan_validator],
        help_text=_('Permanent Account Number'),
    )

    # Subscription
    plan = models.ForeignKey(
        Plan,
        on_delete=models.PROTECT,
        related_name='organizations',
        null=True,
        blank=True,
        verbose_name=_('Plan'),
        help_text=_('Current subscription plan'),
    )

    # Owner
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='owned_organizations',
        verbose_name=_('Owner'),
        help_text=_('Organization owner/creator'),
    )

    # Status
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name=_('Is Active'),
        help_text=_('Whether the organization is active'),
    )
    is_verified = models.BooleanField(
        default=False,
        verbose_name=_('Is Verified'),
        help_text=_('Whether the organization has been verified'),
    )
    verified_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_('Verified At'),
    )

    # Timestamps
    trial_ends_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_('Trial Ends At'),
        help_text=_('When the trial period ends'),
    )

    class Meta:
        verbose_name = _('Organization')
        verbose_name_plural = _('Organizations')
        ordering = ['name']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_active', 'is_verified']),
            models.Index(fields=['owner']),
        ]

    objects = OrganizationManager()

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Auto-generate slug from name if not provided
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Organization.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f'{base_slug}-{counter}'
                counter += 1
            self.slug = slug

        # Set default plan if not provided
        if not self.plan:
            self.plan = Plan.get_default_plan()

        super().save(*args, **kwargs)

    @property
    def full_address(self):
        """Return formatted full address."""
        parts = [
            self.address_line1,
            self.address_line2,
            self.city,
            self.state,
            self.postal_code,
            self.country,
        ]
        return ', '.join(filter(None, parts))

    @property
    def is_on_trial(self):
        """Check if organization is on trial."""
        if not self.trial_ends_at:
            return False
        return timezone.now() < self.trial_ends_at

    @property
    def trial_days_remaining(self):
        """Get remaining trial days."""
        if not self.is_on_trial:
            return 0
        delta = self.trial_ends_at - timezone.now()
        return max(0, delta.days)

    def verify(self):
        """Mark organization as verified."""
        self.is_verified = True
        self.verified_at = timezone.now()
        self.save(update_fields=['is_verified', 'verified_at'])

    def deactivate(self):
        """Deactivate the organization."""
        self.is_active = False
        self.save(update_fields=['is_active'])

    def activate(self):
        """Activate the organization."""
        self.is_active = True
        self.save(update_fields=['is_active'])

    # Plan limit checks
    def can_add_user(self):
        """Check if organization can add more users."""
        if not self.plan:
            return False
        current_count = self.memberships.filter(is_active=True).count()
        return current_count < self.plan.max_users

    def can_add_warehouse(self):
        """Check if organization can add more warehouses."""
        if not self.plan:
            return False
        current_count = self.warehouses.count()
        return current_count < self.plan.max_warehouses

    def get_usage_stats(self):
        """Get current usage vs plan limits."""
        if not self.plan:
            return {}

        return {
            'users': {
                'current': self.memberships.filter(is_active=True).count(),
                'limit': self.plan.max_users,
            },
            'warehouses': {
                'current': self.warehouses.count() if hasattr(self, 'warehouses') else 0,
                'limit': self.plan.max_warehouses,
            },
        }


class OrganizationSettings(BaseModel):
    """
    Organization-specific settings and preferences.
    One-to-one relationship with Organization.
    """

    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name='settings',
        verbose_name=_('Organization'),
    )

    # Regional settings
    timezone = models.CharField(
        max_length=50,
        choices=TimezoneChoices.choices,
        default=TimezoneChoices.IST,
        verbose_name=_('Timezone'),
    )
    date_format = models.CharField(
        max_length=20,
        choices=DateFormatChoices.choices,
        default=DateFormatChoices.DMY,
        verbose_name=_('Date Format'),
    )
    currency = models.CharField(
        max_length=3,
        choices=CurrencyChoices.choices,
        default=CurrencyChoices.INR,
        verbose_name=_('Currency'),
    )
    language = models.CharField(
        max_length=10,
        choices=LanguageChoices.choices,
        default=LanguageChoices.ENGLISH,
        verbose_name=_('Language'),
        help_text=_('Preferred language'),
    )

    # Inventory settings
    min_stock_threshold = models.PositiveIntegerField(
        default=10,
        verbose_name=_('Minimum Stock Threshold'),
        help_text=_('Default minimum stock threshold for alerts'),
    )
    enable_low_stock_alerts = models.BooleanField(
        default=True,
        verbose_name=_('Enable Low Stock Alerts'),
        help_text=_('Enable low stock email alerts'),
    )
    auto_reorder_enabled = models.BooleanField(
        default=False,
        verbose_name=_('Auto Reorder Enabled'),
        help_text=_('Enable automatic reorder suggestions'),
    )

    # Notification settings
    email_notifications_enabled = models.BooleanField(
        default=True,
        verbose_name=_('Email Notifications Enabled'),
        help_text=_('Enable email notifications'),
    )
    daily_summary_enabled = models.BooleanField(
        default=False,
        verbose_name=_('Daily Summary Enabled'),
        help_text=_('Send daily summary emails'),
    )
    daily_summary_time = models.TimeField(
        default=datetime.time(9, 0),
        verbose_name=_('Daily Summary Time'),
        help_text=_('Time to send daily summary (in organization timezone)'),
    )

    # Drone operation settings
    drone_idle_timeout_minutes = models.PositiveIntegerField(
        default=30,
        verbose_name=_('Drone Idle Timeout'),
        help_text=_('Minutes before marking drone as idle'),
    )
    battery_low_threshold_percent = models.PositiveIntegerField(
        default=20,
        verbose_name=_('Battery Low Threshold'),
        help_text=_('Battery percentage threshold for low battery alert'),
    )
    battery_critical_threshold_percent = models.PositiveIntegerField(
        default=10,
        verbose_name=_('Battery Critical Threshold'),
        help_text=_('Battery percentage threshold for critical alert'),
    )

    # Order settings
    auto_assign_jobs = models.BooleanField(
        default=True,
        verbose_name=_('Auto Assign Jobs'),
        help_text=_('Automatically assign drone jobs from order queue'),
    )
    order_priority_enabled = models.BooleanField(
        default=True,
        verbose_name=_('Order Priority Enabled'),
        help_text=_('Enable order priority levels'),
    )

    # Security settings
    session_timeout_minutes = models.PositiveIntegerField(
        default=480,  # 8 hours
        verbose_name=_('Session Timeout'),
        help_text=_('Session timeout in minutes'),
    )
    require_2fa_for_admins = models.BooleanField(
        default=False,
        verbose_name=_('Require 2FA for Admins'),
        help_text=_('Require 2FA for admin users'),
    )
    password_expiry_days = models.PositiveIntegerField(
        default=0,  # 0 = never expires
        verbose_name=_('Password Expiry Days'),
        help_text=_('Days before password expires (0 = never)'),
    )

    # API settings
    webhook_url = models.URLField(
        blank=True,
        verbose_name=_('Webhook URL'),
        help_text=_('Webhook URL for event notifications'),
    )
    webhook_secret = models.CharField(
        max_length=64,
        blank=True,
        verbose_name=_('Webhook Secret'),
        help_text=_('Secret for webhook signature verification'),
    )

    class Meta:
        verbose_name = _('Organization Settings')
        verbose_name_plural = _('Organization Settings')

    def __str__(self):
        return f'Settings for {self.organization.name}'

    def save(self, *args, **kwargs):
        # Generate webhook secret if webhook URL is set but secret is empty
        if self.webhook_url and not self.webhook_secret:
            self.webhook_secret = secrets.token_hex(32)
        super().save(*args, **kwargs)

    def regenerate_webhook_secret(self):
        """Generate a new webhook secret."""
        self.webhook_secret = secrets.token_hex(32)
        self.save(update_fields=['webhook_secret'])
        return self.webhook_secret


# =============================================================================
# Organization Membership
# =============================================================================

class OrganizationMembershipManager(models.Manager):
    """Custom manager for OrganizationMembership."""

    def active(self):
        """Return only active memberships."""
        return self.filter(is_active=True)

    def for_organization(self, organization):
        """Return memberships for a specific organization."""
        return self.filter(organization=organization, is_active=True)

    def for_user(self, user):
        """Return memberships for a specific user."""
        return self.filter(user=user, is_active=True)

    def owners(self):
        """Return owner memberships."""
        return self.filter(membership_role=MembershipRole.OWNER, is_active=True)

    def admins(self):
        """Return admin memberships."""
        return self.filter(
            membership_role__in=[MembershipRole.OWNER, MembershipRole.ADMIN],
            is_active=True,
        )


class OrganizationMembership(AuditedModel):
    """
    Represents a user's membership in an organization.

    This is the M:M relationship between User and Organization with
    additional metadata like role, permissions, and status.
    """

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='memberships',
        verbose_name=_('Organization'),
        help_text=_('The organization this membership belongs to'),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='memberships',
        verbose_name=_('User'),
        help_text=_('The user who is a member'),
    )

    # Role within the organization
    membership_role = models.CharField(
        max_length=20,
        choices=MembershipRole.choices,
        default=MembershipRole.MEMBER,
        verbose_name=_('Membership Role'),
        help_text=_('Role within the organization (Owner, Admin, Member)'),
    )

    # User's functional role (for permissions)
    user_role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.VIEWER,
        verbose_name=_('User Role'),
        help_text=_('Functional role for permissions (Admin, Manager, Operator, Viewer)'),
    )

    # Status
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name=_('Is Active'),
        help_text=_('Whether this membership is active'),
    )

    # Timestamps
    joined_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Joined At'),
        help_text=_('When the user joined the organization'),
    )
    deactivated_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_('Deactivated At'),
        help_text=_('When the membership was deactivated'),
    )

    # Invitation tracking
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_membership_invitations',
        verbose_name=_('Invited By'),
        help_text=_('User who invited this member'),
    )

    # Optional notes
    notes = models.TextField(
        blank=True,
        verbose_name=_('Notes'),
        help_text=_('Internal notes about this membership'),
    )

    objects = OrganizationMembershipManager()

    class Meta:
        verbose_name = _('Organization Membership')
        verbose_name_plural = _('Organization Memberships')
        ordering = ['-joined_at']
        unique_together = ['organization', 'user']
        indexes = [
            models.Index(fields=['organization', 'is_active']),
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['membership_role']),
        ]

    def __str__(self):
        return f'{self.user} @ {self.organization} ({self.get_membership_role_display()})'

    @property
    def is_owner(self):
        """Check if this member is an owner."""
        return self.membership_role == MembershipRole.OWNER

    @property
    def is_admin(self):
        """Check if this member is an admin or owner."""
        return self.membership_role in [MembershipRole.OWNER, MembershipRole.ADMIN]

    def deactivate(self):
        """Deactivate this membership."""
        self.is_active = False
        self.deactivated_at = timezone.now()
        self.save(update_fields=['is_active', 'deactivated_at'])

    def activate(self):
        """Activate this membership."""
        self.is_active = True
        self.deactivated_at = None
        self.save(update_fields=['is_active', 'deactivated_at'])

    def promote_to_admin(self):
        """Promote member to admin."""
        if self.membership_role == MembershipRole.MEMBER:
            self.membership_role = MembershipRole.ADMIN
            self.save(update_fields=['membership_role'])

    def demote_to_member(self):
        """Demote admin to member."""
        if self.membership_role == MembershipRole.ADMIN:
            self.membership_role = MembershipRole.MEMBER
            self.save(update_fields=['membership_role'])

    def transfer_ownership(self, new_owner_membership):
        """Transfer ownership to another member."""
        if self.is_owner and new_owner_membership.organization == self.organization:
            # Current owner becomes admin
            self.membership_role = MembershipRole.ADMIN
            self.save(update_fields=['membership_role'])

            # New owner gets ownership
            new_owner_membership.membership_role = MembershipRole.OWNER
            new_owner_membership.save(update_fields=['membership_role'])

            # Update organization owner
            self.organization.owner = new_owner_membership.user
            self.organization.save(update_fields=['owner'])


# =============================================================================
# Organization Invitation
# =============================================================================

class OrganizationInvitationManager(models.Manager):
    """Custom manager for OrganizationInvitation."""

    def pending(self):
        """Return pending invitations."""
        return self.filter(status=InvitationStatus.PENDING)

    def valid(self):
        """Return pending and non-expired invitations."""
        return self.filter(
            status=InvitationStatus.PENDING,
            expires_at__gt=timezone.now(),
        )

    def expired(self):
        """Return expired invitations."""
        return self.filter(
            status=InvitationStatus.PENDING,
            expires_at__lte=timezone.now(),
        )


class OrganizationInvitation(AuditedModel):
    """
    Invitation to join an organization.

    Invitations are sent via email and contain a unique token.
    They expire after a configurable period (default: 7 days).
    """

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='invitations',
        verbose_name=_('Organization'),
        help_text=_('The organization being invited to'),
    )

    # Invitee information
    email = models.EmailField(
        verbose_name=_('Email'),
        help_text=_('Email address of the invitee'),
    )
    first_name = models.CharField(
        max_length=150,
        blank=True,
        verbose_name=_('First Name'),
        help_text=_('First name of the invitee (optional)'),
    )
    last_name = models.CharField(
        max_length=150,
        blank=True,
        verbose_name=_('Last Name'),
        help_text=_('Last name of the invitee (optional)'),
    )

    # Role to assign on acceptance
    membership_role = models.CharField(
        max_length=20,
        choices=MembershipRole.choices,
        default=MembershipRole.MEMBER,
        verbose_name=_('Membership Role'),
        help_text=_('Role to assign when invitation is accepted'),
    )
    user_role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.VIEWER,
        verbose_name=_('User Role'),
        help_text=_('Functional role to assign on acceptance'),
    )

    # Invitation details
    token = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        verbose_name=_('Token'),
        help_text=_('Unique invitation token'),
    )
    status = models.CharField(
        max_length=20,
        choices=InvitationStatus.choices,
        default=InvitationStatus.PENDING,
        db_index=True,
        verbose_name=_('Status'),
        help_text=_('Current status of the invitation'),
    )

    # Timestamps
    expires_at = models.DateTimeField(
        verbose_name=_('Expires At'),
        help_text=_('When the invitation expires'),
    )
    sent_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_('Sent At'),
        help_text=_('When the invitation email was sent'),
    )
    responded_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_('Responded At'),
        help_text=_('When the invitee responded'),
    )

    # Tracking
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='sent_invitations',
        verbose_name=_('Invited By'),
        help_text=_('User who sent the invitation'),
    )
    accepted_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='accepted_invitations',
        verbose_name=_('Accepted By'),
        help_text=_('User who accepted the invitation'),
    )

    # Message
    personal_message = models.TextField(
        blank=True,
        verbose_name=_('Personal Message'),
        help_text=_('Optional personal message to include in invitation'),
    )

    # Resend tracking
    resend_count = models.PositiveIntegerField(
        default=0,
        verbose_name=_('Resend Count'),
        help_text=_('Number of times invitation was resent'),
    )
    last_resent_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_('Last Resent At'),
    )

    objects = OrganizationInvitationManager()

    class Meta:
        verbose_name = _('Organization Invitation')
        verbose_name_plural = _('Organization Invitations')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['email', 'status']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f'Invitation to {self.email} for {self.organization}'

    def save(self, *args, **kwargs):
        # Generate token if not provided
        if not self.token:
            self.token = secrets.token_urlsafe(48)

        # Set default expiry (7 days)
        if not self.expires_at:
            self.expires_at = timezone.now() + datetime.timedelta(days=7)

        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        """Check if invitation has expired."""
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        """Check if invitation is valid (pending and not expired)."""
        return self.status == InvitationStatus.PENDING and not self.is_expired

    def mark_sent(self):
        """Mark invitation as sent."""
        self.sent_at = timezone.now()
        self.save(update_fields=['sent_at'])

    def accept(self, user):
        """Accept the invitation."""
        if not self.is_valid:
            raise ValueError(_('This invitation is no longer valid'))

        self.status = InvitationStatus.ACCEPTED
        self.responded_at = timezone.now()
        self.accepted_by_user = user
        self.save(update_fields=['status', 'responded_at', 'accepted_by_user'])

        # Create membership
        membership = OrganizationMembership.objects.create(
            organization=self.organization,
            user=user,
            membership_role=self.membership_role,
            user_role=self.user_role,
            invited_by=self.invited_by,
        )
        return membership

    def decline(self):
        """Decline the invitation."""
        if self.status != InvitationStatus.PENDING:
            raise ValueError(_('This invitation has already been processed'))

        self.status = InvitationStatus.DECLINED
        self.responded_at = timezone.now()
        self.save(update_fields=['status', 'responded_at'])

    def revoke(self):
        """Revoke the invitation."""
        if self.status != InvitationStatus.PENDING:
            raise ValueError(_('Only pending invitations can be revoked'))

        self.status = InvitationStatus.REVOKED
        self.save(update_fields=['status'])

    def resend(self, extend_expiry=True):
        """Resend the invitation."""
        if self.status != InvitationStatus.PENDING:
            raise ValueError(_('Only pending invitations can be resent'))

        self.resend_count += 1
        self.last_resent_at = timezone.now()

        if extend_expiry:
            self.expires_at = timezone.now() + datetime.timedelta(days=7)

        self.save(update_fields=['resend_count', 'last_resent_at', 'expires_at'])

    @classmethod
    def mark_expired_invitations(cls):
        """Mark all expired pending invitations as expired."""
        return cls.objects.filter(
            status=InvitationStatus.PENDING,
            expires_at__lte=timezone.now(),
        ).update(status=InvitationStatus.EXPIRED)


# =============================================================================
# Subscription (Billing)
# =============================================================================

class Subscription(AuditedModel):
    """
    Tracks organization subscriptions for billing.

    Handles subscription lifecycle: trial → active → renewal/cancellation.
    Integrates with payment gateways (Razorpay, Stripe, etc.).
    """

    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name='subscription',
        verbose_name=_('Organization'),
        help_text=_('The organization this subscription belongs to'),
    )
    plan = models.ForeignKey(
        Plan,
        on_delete=models.PROTECT,
        related_name='subscriptions',
        verbose_name=_('Plan'),
        help_text=_('The subscribed plan'),
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.TRIALING,
        db_index=True,
        verbose_name=_('Status'),
        help_text=_('Current subscription status'),
    )

    # Billing
    billing_cycle = models.CharField(
        max_length=20,
        choices=BillingCycle.choices,
        default=BillingCycle.MONTHLY,
        verbose_name=_('Billing Cycle'),
        help_text=_('Monthly or annual billing'),
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name=_('Amount'),
        help_text=_('Subscription amount per billing cycle'),
    )
    currency = models.CharField(
        max_length=3,
        choices=CurrencyChoices.choices,
        default=CurrencyChoices.INR,
        verbose_name=_('Currency'),
    )

    # Important dates
    started_at = models.DateTimeField(
        verbose_name=_('Started At'),
        help_text=_('When the subscription started'),
    )
    trial_ends_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_('Trial Ends At'),
        help_text=_('When the trial period ends'),
    )
    current_period_start = models.DateTimeField(
        verbose_name=_('Current Period Start'),
        help_text=_('Start of current billing period'),
    )
    current_period_end = models.DateTimeField(
        verbose_name=_('Current Period End'),
        help_text=_('End of current billing period'),
    )
    cancelled_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_('Cancelled At'),
        help_text=_('When the subscription was cancelled'),
    )
    cancel_at_period_end = models.BooleanField(
        default=False,
        verbose_name=_('Cancel at Period End'),
        help_text=_('Whether to cancel at end of current period'),
    )

    # Payment gateway integration
    external_subscription_id = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        verbose_name=_('External Subscription ID'),
        help_text=_('Subscription ID from payment gateway (Razorpay, etc.)'),
    )
    external_customer_id = models.CharField(
        max_length=255,
        blank=True,
        verbose_name=_('External Customer ID'),
        help_text=_('Customer ID from payment gateway'),
    )
    payment_method = models.CharField(
        max_length=50,
        blank=True,
        verbose_name=_('Payment Method'),
        help_text=_('Last used payment method (e.g., card_xxxx)'),
    )

    # Metadata
    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name=_('Metadata'),
        help_text=_('Additional subscription metadata'),
    )

    class Meta:
        verbose_name = _('Subscription')
        verbose_name_plural = _('Subscriptions')
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['current_period_end']),
        ]

    def __str__(self):
        return f'{self.organization} - {self.plan} ({self.get_status_display()})'

    @property
    def is_active(self):
        """Check if subscription is active."""
        return self.status in [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]

    @property
    def is_trialing(self):
        """Check if subscription is on trial."""
        return self.status == SubscriptionStatus.TRIALING

    @property
    def days_until_renewal(self):
        """Get days until next renewal."""
        if not self.is_active:
            return 0
        delta = self.current_period_end - timezone.now()
        return max(0, delta.days)

    @property
    def is_past_due(self):
        """Check if subscription is past due."""
        return self.status == SubscriptionStatus.PAST_DUE

    def activate(self):
        """Activate the subscription."""
        self.status = SubscriptionStatus.ACTIVE
        self.save(update_fields=['status'])

    def cancel(self, immediately=False):
        """Cancel the subscription."""
        self.cancelled_at = timezone.now()

        if immediately:
            self.status = SubscriptionStatus.CANCELLED
        else:
            self.cancel_at_period_end = True

        self.save(update_fields=['status', 'cancelled_at', 'cancel_at_period_end'])

    def pause(self):
        """Pause the subscription."""
        self.status = SubscriptionStatus.PAUSED
        self.save(update_fields=['status'])

    def resume(self):
        """Resume a paused subscription."""
        if self.status == SubscriptionStatus.PAUSED:
            self.status = SubscriptionStatus.ACTIVE
            self.save(update_fields=['status'])

    def renew(self, new_period_end):
        """Renew the subscription for another period."""
        self.current_period_start = self.current_period_end
        self.current_period_end = new_period_end
        self.status = SubscriptionStatus.ACTIVE
        self.save(update_fields=[
            'current_period_start', 'current_period_end', 'status'
        ])

    def upgrade_plan(self, new_plan, prorate=True):
        """Upgrade to a new plan."""
        old_plan = self.plan
        self.plan = new_plan

        # Update amount based on billing cycle
        if self.billing_cycle == BillingCycle.MONTHLY:
            self.amount = new_plan.monthly_price
        else:
            self.amount = new_plan.annual_price

        self.save(update_fields=['plan', 'amount'])

        # Also update organization's plan reference
        self.organization.plan = new_plan
        self.organization.save(update_fields=['plan'])

        return old_plan

    def downgrade_plan(self, new_plan, at_period_end=True):
        """Downgrade to a lower plan."""
        if at_period_end:
            # Store pending downgrade in metadata
            self.metadata['pending_plan_change'] = {
                'new_plan_id': str(new_plan.id),
                'effective_at': self.current_period_end.isoformat(),
            }
            self.save(update_fields=['metadata'])
        else:
            return self.upgrade_plan(new_plan)


# =============================================================================
# Organization API Key
# =============================================================================

class OrganizationAPIKeyManager(models.Manager):
    """Custom manager for OrganizationAPIKey."""

    def active(self):
        """Return active API keys."""
        return self.filter(is_active=True)

    def valid(self):
        """Return active, non-expired API keys."""
        now = timezone.now()
        return self.filter(
            is_active=True,
        ).filter(
            models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=now)
        )


class OrganizationAPIKey(AuditedModel):
    """
    API keys for organization integrations.

    Allows external systems to authenticate with the API using
    organization-scoped API keys with configurable permissions.
    """

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='api_keys',
        verbose_name=_('Organization'),
        help_text=_('The organization this API key belongs to'),
    )

    # Key identification
    name = models.CharField(
        max_length=100,
        verbose_name=_('Name'),
        help_text=_('Friendly name for this API key'),
    )
    prefix = models.CharField(
        max_length=8,
        db_index=True,
        verbose_name=_('Key Prefix'),
        help_text=_('First 8 characters of the key for identification'),
    )
    key_hash = models.CharField(
        max_length=128,
        verbose_name=_('Key Hash'),
        help_text=_('SHA-256 hash of the full API key'),
    )

    # Status
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name=_('Is Active'),
        help_text=_('Whether this API key is active'),
    )

    # Expiry
    expires_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_('Expires At'),
        help_text=_('When the API key expires (null = never)'),
    )

    # Permissions (JSON array of permission strings)
    scopes = models.JSONField(
        default=list,
        blank=True,
        verbose_name=_('Scopes'),
        help_text=_('List of allowed permission scopes'),
    )

    # Rate limiting
    rate_limit_per_minute = models.PositiveIntegerField(
        default=60,
        verbose_name=_('Rate Limit'),
        help_text=_('API requests allowed per minute'),
    )

    # Usage tracking
    last_used_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_('Last Used At'),
        help_text=_('When the key was last used'),
    )
    last_used_ip = models.GenericIPAddressField(
        blank=True,
        null=True,
        verbose_name=_('Last Used IP'),
        help_text=_('IP address that last used this key'),
    )
    usage_count = models.PositiveIntegerField(
        default=0,
        verbose_name=_('Usage Count'),
        help_text=_('Total number of API calls with this key'),
    )

    # Created by
    created_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_api_keys',
        verbose_name=_('Created By'),
        help_text=_('User who created this API key'),
    )

    # Notes
    description = models.TextField(
        blank=True,
        verbose_name=_('Description'),
        help_text=_('Description of what this API key is used for'),
    )

    objects = OrganizationAPIKeyManager()

    class Meta:
        verbose_name = _('Organization API Key')
        verbose_name_plural = _('Organization API Keys')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'is_active']),
            models.Index(fields=['prefix']),
        ]

    def __str__(self):
        return f'{self.name} ({self.prefix}...)'

    @property
    def is_expired(self):
        """Check if the API key has expired."""
        if not self.expires_at:
            return False
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        """Check if the API key is valid (active and not expired)."""
        return self.is_active and not self.is_expired

    def record_usage(self, ip_address=None):
        """Record API key usage."""
        self.last_used_at = timezone.now()
        self.usage_count += 1

        update_fields = ['last_used_at', 'usage_count']

        if ip_address:
            self.last_used_ip = ip_address
            update_fields.append('last_used_ip')

        self.save(update_fields=update_fields)

    def revoke(self):
        """Revoke the API key."""
        self.is_active = False
        self.save(update_fields=['is_active'])

    def verify_key(self, raw_key):
        """Verify a raw API key against the stored hash."""
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        return key_hash == self.key_hash

    @classmethod
    def generate_key(cls, organization, name, created_by, scopes=None,
                     expires_at=None, description=''):
        """
        Generate a new API key.

        Returns tuple of (OrganizationAPIKey instance, raw_key).
        The raw_key is only available at creation time.
        """
        # Generate a secure random key
        raw_key = f'flyng_{secrets.token_urlsafe(32)}'
        prefix = raw_key[:8]
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

        api_key = cls.objects.create(
            organization=organization,
            name=name,
            prefix=prefix,
            key_hash=key_hash,
            scopes=scopes or [],
            expires_at=expires_at,
            created_by_user=created_by,
            description=description,
        )

        return api_key, raw_key

    @classmethod
    def authenticate(cls, raw_key):
        """
        Authenticate with a raw API key.

        Returns the OrganizationAPIKey if valid, None otherwise.
        """
        if not raw_key or len(raw_key) < 8:
            return None

        prefix = raw_key[:8]
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

        try:
            api_key = cls.objects.get(
                prefix=prefix,
                key_hash=key_hash,
                is_active=True,
            )

            # Check expiry
            if api_key.is_expired:
                return None

            return api_key
        except cls.DoesNotExist:
            return None
