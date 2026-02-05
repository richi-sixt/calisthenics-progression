"""Unit tests for decorators."""

import pytest

from flask import url_for


class TestCheckConfirmedDecorator:
    """Tests for the @check_confirmed decorator."""

    def test_confirmed_user_can_access_protected_route(self, auth_client, app):
        """Test that confirmed users can access protected routes."""
        with app.app_context():
            # Try to access a route protected by @check_confirmed
            response = auth_client.get(
                url_for("main.all_exercises"),
                follow_redirects=False,
            )
            # Should not redirect to unconfirmed page
            assert response.status_code == 200

    def test_unconfirmed_user_redirected(self, unconfirmed_auth_client, app):
        """Test that unconfirmed users are redirected."""
        with app.app_context():
            # Try to access a route protected by @check_confirmed
            response = unconfirmed_auth_client.get(
                url_for("main.all_exercises"),
                follow_redirects=False,
            )
            # Should redirect
            assert response.status_code == 302
            assert "unconfirmed" in response.location

    def test_unconfirmed_user_sees_flash_message(self, unconfirmed_auth_client, app):
        """Test that unconfirmed users see a flash message."""
        with app.app_context():
            response = unconfirmed_auth_client.get(
                url_for("main.all_exercises"),
                follow_redirects=True,
            )
            # Check for the German flash message
            assert "Bitte best" in response.get_data(as_text=True)

    def test_confirmed_user_can_add_workout(self, auth_client, app):
        """Test confirmed user can access add_workout page."""
        with app.app_context():
            response = auth_client.get(
                url_for("main.add_workout"),
                follow_redirects=False,
            )
            assert response.status_code == 200

    def test_unconfirmed_user_cannot_add_workout(self, unconfirmed_auth_client, app):
        """Test unconfirmed user is redirected from add_workout."""
        with app.app_context():
            response = unconfirmed_auth_client.get(
                url_for("main.add_workout"),
                follow_redirects=False,
            )
            assert response.status_code == 302
            assert "unconfirmed" in response.location

    def test_confirmed_user_can_send_message(self, auth_client, app, second_user):
        """Test confirmed user can access send_message page."""
        with app.app_context():
            response = auth_client.get(
                url_for("main.send_message", recipient="seconduser"),
                follow_redirects=False,
            )
            assert response.status_code == 200

    def test_unconfirmed_user_cannot_send_message(
        self, unconfirmed_auth_client, app, user
    ):
        """Test unconfirmed user is redirected from send_message."""
        with app.app_context():
            response = unconfirmed_auth_client.get(
                url_for("main.send_message", recipient="testuser"),
                follow_redirects=False,
            )
            assert response.status_code == 302
            assert "unconfirmed" in response.location
