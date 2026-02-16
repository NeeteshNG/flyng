"""
User Models for FlyNG
"""
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

from apps.core.models import TimeStampedModel


class UserManager(BaseUserManager):
    """
    Custom user manager where email is the unique identifier.
    """

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', User.Role.ADMIN)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser, TimeStampedModel):
    """
    Custom User model for FlyNG.
    Uses email as the unique identifier instead of username.
    """

    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Administrator'
        MANAGER = 'MANAGER', 'Manager'
        OPERATOR = 'OPERATOR', 'Operator'
        VIEWER = 'VIEWER', 'Viewer'

    # Remove username field, use email instead
    username = None
    email = models.EmailField('Email Address', unique=True)

    # Profile fields
    phone = models.CharField('Phone Number', max_length=15, blank=True)
    role = models.CharField(
        'Role',
        max_length=20,
        choices=Role.choices,
        default=Role.VIEWER
    )
    is_verified = models.BooleanField('Email Verified', default=False)
    profile_picture = models.ImageField(
        'Profile Picture',
        upload_to='profile_pictures/',
        blank=True,
        null=True
    )

    # Organization relationship (to be added later)
    # organization = models.ForeignKey(
    #     'organizations.Organization',
    #     on_delete=models.CASCADE,
    #     related_name='users',
    #     null=True,
    #     blank=True
    # )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    objects = UserManager()

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-created_at']

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'.strip()

    def is_admin(self):
        return self.role == self.Role.ADMIN

    def is_manager(self):
        return self.role in [self.Role.ADMIN, self.Role.MANAGER]

    def can_modify(self):
        return self.role in [self.Role.ADMIN, self.Role.MANAGER, self.Role.OPERATOR]


class OTP(TimeStampedModel):
    """
    OTP model for password reset and email verification.
    """
    email = models.EmailField()
    otp = models.CharField(max_length=6)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()

    class Meta:
        verbose_name = 'OTP'
        verbose_name_plural = 'OTPs'
        ordering = ['-created_at']

    def __str__(self):
        return f'OTP for {self.email}'

    def is_valid(self):
        from django.utils import timezone
        return not self.is_used and self.expires_at > timezone.now()
