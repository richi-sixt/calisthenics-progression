"""Integration tests for authentication routes."""

from datetime import datetime, timezone

import pytest

from flask import url_for

from project import db
from project.models import User
from project.token import generate_confirmation_token


class TestLoginRoute:
    """Tests for the login route."""

    def test_login_page_renders(self, client, app):
        """Test that login page renders correctly."""
        with app.app_context():
            response = client.get(url_for("auth.login"))
            assert response.status_code == 200
            assert b"Anmelden" in response.data

    def test_login_success(self, client, user, app):
        """Test successful login."""
        with app.app_context():
            response = client.post(
                url_for("auth.login"),
                data={
                    "username": "testuser",
                    "password": "password123",
                    "remember_me": False,
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

    def test_login_invalid_username(self, client, app):
        """Test login with invalid username."""
        with app.app_context():
            response = client.post(
                url_for("auth.login"),
                data={
                    "username": "nonexistent",
                    "password": "password123",
                },
                follow_redirects=True,
            )
            assert response.status_code == 200
            # Check for German error message
            assert "Ung" in response.get_data(as_text=True)

    def test_login_invalid_password(self, client, user, app):
        """Test login with invalid password."""
        with app.app_context():
            response = client.post(
                url_for("auth.login"),
                data={
                    "username": "testuser",
                    "password": "wrongpassword",
                },
                follow_redirects=True,
            )
            assert response.status_code == 200
            assert "Ung" in response.get_data(as_text=True)

    def test_already_logged_in_redirects(self, auth_client, app):
        """Test that already logged in users are redirected from login page."""
        with app.app_context():
            response = auth_client.get(
                url_for("auth.login"),
                follow_redirects=False,
            )
            assert response.status_code == 302


class TestLogoutRoute:
    """Tests for the logout route."""

    def test_logout(self, auth_client, app):
        """Test logout redirects to index."""
        with app.app_context():
            response = auth_client.get(
                url_for("auth.logout"),
                follow_redirects=False,
            )
            assert response.status_code == 302


class TestRegistrationRoute:
    """Tests for the registration route."""

    def test_registration_page_renders(self, client, app):
        """Test that registration page renders correctly."""
        with app.app_context():
            response = client.get(url_for("auth.register"))
            assert response.status_code == 200
            assert b"Registrieren" in response.data

    def test_registration_success(self, client, app, mail_outbox):
        """Test successful registration."""
        with app.app_context():
            response = client.post(
                url_for("auth.register"),
                data={
                    "username": "newuser",
                    "email": "newuser@example.com",
                    "password": "password123",
                    "repeat_password": "password123",
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            # Verify user was created
            user = User.query.filter_by(username="newuser").first()
            assert user is not None
            assert user.email == "newuser@example.com"
            assert user.confirmed is False

    def test_registration_duplicate_username(self, client, user, app):
        """Test registration with duplicate username fails."""
        with app.app_context():
            response = client.post(
                url_for("auth.register"),
                data={
                    "username": "testuser",  # Already exists
                    "email": "unique@example.com",
                    "password": "password123",
                    "repeat_password": "password123",
                },
                follow_redirects=True,
            )
            assert response.status_code == 200
            # Form should show error
            assert b"Benutzernamen" in response.data

    def test_already_logged_in_redirects(self, auth_client, app):
        """Test that logged in users are redirected from registration."""
        with app.app_context():
            response = auth_client.get(
                url_for("auth.register"),
                follow_redirects=False,
            )
            assert response.status_code == 302


class TestEmailConfirmationRoute:
    """Tests for email confirmation routes."""

    def test_confirm_email_valid_token(self, client, app, unconfirmed_user):
        """Test email confirmation with valid token."""
        with app.app_context():
            # Login as unconfirmed user first
            with client.session_transaction() as sess:
                sess["_user_id"] = str(unconfirmed_user.id)
                sess["_fresh"] = True

            token = generate_confirmation_token(unconfirmed_user.email)
            response = client.get(
                url_for("auth.confirm_email", token=token),
                follow_redirects=True,
            )
            assert response.status_code == 200

            # Verify user is now confirmed
            user = User.query.filter_by(username="unconfirmed").first()
            assert user.confirmed is True

    def test_confirm_email_invalid_token(self, client, app, unconfirmed_user):
        """Test email confirmation with invalid token."""
        with app.app_context():
            with client.session_transaction() as sess:
                sess["_user_id"] = str(unconfirmed_user.id)
                sess["_fresh"] = True

            response = client.get(
                url_for("auth.confirm_email", token="invalid-token"),
                follow_redirects=True,
            )
            assert response.status_code == 200

            # User should still be unconfirmed
            user = User.query.filter_by(username="unconfirmed").first()
            assert user.confirmed is False

    def test_confirm_already_confirmed(self, auth_client, app, user):
        """Test confirming an already confirmed account."""
        with app.app_context():
            token = generate_confirmation_token(user.email)
            response = auth_client.get(
                url_for("auth.confirm_email", token=token),
                follow_redirects=True,
            )
            assert response.status_code == 200
            # Should show already confirmed message
            assert "bereits" in response.get_data(as_text=True)

    def test_unconfirmed_page(self, unconfirmed_auth_client, app):
        """Test unconfirmed page renders."""
        with app.app_context():
            response = unconfirmed_auth_client.get(url_for("auth.unconfirmed"))
            assert response.status_code == 200

    def test_unconfirmed_page_redirects_if_confirmed(self, auth_client, app):
        """Test confirmed users are redirected from unconfirmed page."""
        with app.app_context():
            response = auth_client.get(
                url_for("auth.unconfirmed"),
                follow_redirects=False,
            )
            assert response.status_code == 302

    def test_resend_confirmation(self, unconfirmed_auth_client, app, mail_outbox):
        """Test resending confirmation email."""
        with app.app_context():
            response = unconfirmed_auth_client.get(
                url_for("auth.resend_confirmation"),
                follow_redirects=True,
            )
            assert response.status_code == 200


class TestPasswordResetRoute:
    """Tests for password reset routes."""

    def test_forgot_page_renders(self, client, app):
        """Test forgot password page renders."""
        with app.app_context():
            response = client.get(url_for("auth.forgot"))
            assert response.status_code == 200

    def test_forgot_sends_email(self, client, user, app, mail_outbox):
        """Test forgot password sends reset email."""
        with app.app_context():
            response = client.post(
                url_for("auth.forgot"),
                data={"email": "test@example.com"},
                follow_redirects=True,
            )
            assert response.status_code == 200

            # Verify token was set on user
            user = User.query.filter_by(email="test@example.com").first()
            assert user.password_reset_token is not None

    def test_forgot_new_page_renders(self, client, user, app):
        """Test password reset page renders with valid token."""
        with app.app_context():
            token = generate_confirmation_token(user.email)
            user = User.query.filter_by(email="test@example.com").first()
            user.password_reset_token = token
            db.session.commit()

            response = client.get(url_for("auth.forgot_new", token=token))
            assert response.status_code == 200

    def test_forgot_new_resets_password(self, client, user, app):
        """Test password reset with valid token."""
        with app.app_context():
            token = generate_confirmation_token(user.email)
            user = User.query.filter_by(email="test@example.com").first()
            user.password_reset_token = token
            db.session.commit()

            response = client.post(
                url_for("auth.forgot_new", token=token),
                data={
                    "password": "newpassword456",
                    "password2": "newpassword456",
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            # Verify password was changed
            user = User.query.filter_by(email="test@example.com").first()
            assert user.check_password("newpassword456") is True
            assert user.password_reset_token is None

    def test_forgot_new_invalid_token(self, client, app):
        """Test password reset with invalid token returns 404."""
        with app.app_context():
            response = client.get(
                url_for("auth.forgot_new", token="invalid-token"),
            )
            assert response.status_code == 404


class TestEditProfileRoute:
    """Tests for the edit profile route."""

    def test_edit_profile_page_renders(self, auth_client, app):
        """Test edit profile page renders."""
        with app.app_context():
            response = auth_client.get(url_for("auth.edit_profile"))
            assert response.status_code == 200
            assert b"testuser" in response.data

    def test_edit_profile_update_username(self, auth_client, app):
        """Test updating username via edit profile."""
        with app.app_context():
            response = auth_client.post(
                url_for("auth.edit_profile"),
                data={
                    "username": "updateduser",
                    "about_me": "Updated bio",
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            # Verify username was updated
            user = User.query.filter_by(username="updateduser").first()
            assert user is not None
            assert user.about_me == "Updated bio"

    def test_edit_profile_requires_login(self, client, app):
        """Test edit profile requires authentication."""
        with app.app_context():
            response = client.get(
                url_for("auth.edit_profile"),
                follow_redirects=False,
            )
            assert response.status_code == 302
            assert "login" in response.location

    def test_edit_profile_requires_confirmation(self, unconfirmed_auth_client, app):
        """Test edit profile requires email confirmation."""
        with app.app_context():
            response = unconfirmed_auth_client.get(
                url_for("auth.edit_profile"),
                follow_redirects=False,
            )
            assert response.status_code == 302
            assert "unconfirmed" in response.location

    def test_edit_profile_with_picture_upload(self, auth_client, app):
        """Test updating profile with a picture upload."""
        import io

        with app.app_context():
            # Create a minimal valid PNG image (1x1 pixel)
            from PIL import Image
            img = Image.new("RGB", (200, 200), color="red")
            img_bytes = io.BytesIO()
            img.save(img_bytes, format="PNG")
            img_bytes.seek(0)

            response = auth_client.post(
                url_for("auth.edit_profile"),
                data={
                    "username": "testuser",
                    "about_me": "Bio with pic",
                    "picture": (img_bytes, "test_pic.png"),
                },
                content_type="multipart/form-data",
                follow_redirects=True,
            )
            assert response.status_code == 200

            user = User.query.filter_by(username="testuser").first()
            assert user.image_file != "default.jpg"


class TestForgotNewTokenUsed:
    """Tests for forgot_new when token was already consumed."""

    def test_forgot_new_token_already_used(self, client, user, app):
        """Test password reset when token has already been used (None)."""
        with app.app_context():
            token = generate_confirmation_token(user.email)
            # Don't set password_reset_token → it stays None
            user_obj = User.query.filter_by(email="test@example.com").first()
            user_obj.password_reset_token = None
            db.session.commit()

            response = client.get(
                url_for("auth.forgot_new", token=token),
                follow_redirects=True,
            )
            assert response.status_code == 200
            assert "nicht zur\u00fcckgesetzt" in response.get_data(as_text=True)
