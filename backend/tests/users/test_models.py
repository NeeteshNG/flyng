"""
Tests for the User model.
"""

import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
class TestUserModel:
    """Tests for the custom User model."""

    def test_create_user_with_email(self, user_factory):
        """Test creating a user with email is successful."""
        user = user_factory(email="user@example.com")
        assert user.email == "user@example.com"
        assert user.check_password("testpass123")

    def test_new_user_email_normalized(self, user_factory):
        """Test email is normalized for new users."""
        user = user_factory(email="test@EXAMPLE.COM")
        assert user.email == "test@example.com"

    def test_user_str_representation(self, user_factory):
        """Test the user string representation."""
        user = user_factory(email="test@example.com")
        assert str(user) == "test@example.com"

    def test_user_roles(self, user_factory):
        """Test user role assignment."""
        admin = user_factory(email="admin@test.com", role="ADMIN")
        manager = user_factory(email="manager@test.com", role="MANAGER")
        operator = user_factory(email="operator@test.com", role="OPERATOR")
        viewer = user_factory(email="viewer@test.com", role="VIEWER")

        assert admin.role == "ADMIN"
        assert manager.role == "MANAGER"
        assert operator.role == "OPERATOR"
        assert viewer.role == "VIEWER"

    def test_user_full_name(self, user_factory):
        """Test getting user's full name."""
        user = user_factory(
            email="test@example.com",
            first_name="John",
            last_name="Doe",
        )
        assert user.get_full_name() == "John Doe"

    def test_create_superuser(self, db):
        """Test creating a superuser."""
        user = User.objects.create_superuser(
            email="super@example.com",
            password="superpass123",
        )
        assert user.is_superuser
        assert user.is_staff
        assert user.role == "ADMIN"
