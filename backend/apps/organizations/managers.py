"""
Custom Managers for Organization Models
"""

import datetime

from django.db import models
from django.utils import timezone

from apps.core.choices import InvitationStatus, MembershipRole


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
        ).filter(models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=now))
