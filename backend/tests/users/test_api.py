"""
Tests for User API endpoints.
"""

import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestUserAPI:
    """Tests for user API endpoints."""

    def test_user_list_requires_auth(self, api_client):
        """Test that user list requires authentication."""
        url = reverse("user-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_user_list_as_admin(self, admin_client):
        """Test that admin can list users."""
        url = reverse("user-list")
        response = admin_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_user_me_endpoint(self, authenticated_client, operator_user):
        """Test the /me endpoint returns current user."""
        url = reverse("user-me")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == operator_user.email


@pytest.mark.django_db
class TestAuthAPI:
    """Tests for authentication endpoints."""

    def test_login_with_valid_credentials(self, api_client, user_factory):
        """Test login with valid credentials."""
        user_factory(email="login@test.com", password="testpass123")
        url = reverse("token_obtain_pair")
        response = api_client.post(
            url,
            {"email": "login@test.com", "password": "testpass123"},
        )
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data

    def test_login_with_invalid_credentials(self, api_client):
        """Test login with invalid credentials."""
        url = reverse("token_obtain_pair")
        response = api_client.post(
            url,
            {"email": "wrong@test.com", "password": "wrongpass"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_token_refresh(self, api_client, user_factory):
        """Test token refresh."""
        user_factory(email="refresh@test.com", password="testpass123")
        # Get initial tokens
        login_url = reverse("token_obtain_pair")
        login_response = api_client.post(
            login_url,
            {"email": "refresh@test.com", "password": "testpass123"},
        )
        refresh_token = login_response.data["refresh"]

        # Refresh the token
        refresh_url = reverse("token_refresh")
        response = api_client.post(refresh_url, {"refresh": refresh_token})
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
