"""Integration tests for authentication routes."""

from datetime import datetime, timezone

import pytest

from flask import url_for

from project import db
from project.models import (
        User,
        Message,
        Notification,
        ExerciseDefinition,
        Exercise,
        Set,
        Workout,
        followers,
)
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
                    "email": "test@example.com",
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
                    "email": "test@example.com",
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


class TestDeleteAccountRoute:
    """Tests for the delete account route."""

    def test_delete_account_page_renders(self, auth_client, app):
        """Test that delete account page renders for authenticated confirmed users."""
        with app.app_context():
            response = auth_client.get(url_for("auth.delete_account"))
            assert response.status_code == 200
            assert "Konto l\u00f6schen" in response.get_data(as_text=True)

    def test_delete_account_requires_login(self, client, app):
        """Test that delete account page requires authentication."""
        with app.app_context():
            response = client.get(
                url_for("auth.delete_account"),
                follow_redirects=False,
            )
            assert response.status_code == 302
            assert "login" in response.location

    def test_delete_account_requires_confirmation(self, unconfirmed_auth_client, app):
        """Test that unconfirmed users cannot access delete account page."""
        with app.app_context():
            response = unconfirmed_auth_client.get(
                url_for("auth.delete_account"),
                follow_redirects=False,
            )
            assert response.status_code == 302
            assert "unconfirmed" in response.location

    def test_delete_account_wrong_password(self, auth_client, user, app):
        """Test that wrong password prevents account deletion."""
        with app.app_context():
            response = auth_client.post(
                url_for("auth.delete_account"),
                data={"password": "wrongpassword"},
                follow_redirects=True,
            )
            assert response.status_code == 200
            existing_user = User.query.filter_by(username="testuser").first()
            assert existing_user is not None
            assert "Falsches Passwort" in response.get_data(as_text=True)

    def test_delete_account_success(self, auth_client, user, app):
        """Test successful account deletion removes user and redirects."""
        with app.app_context():
            user_id = user.id
            response = auth_client.post(
                url_for("auth.delete_account"),
                data={"password": "password123"},
                follow_redirects=True,
            )
            assert response.status_code == 200
            assert db.session.get(User, user_id) is None
            assert "gel\u00f6scht" in response.get_data(as_text=True)

    def test_delete_account_removes_workouts(self, auth_client, user, workout, app):
        """Test that account deletion removes all associated workouts, exercises, and sets."""
        with app.app_context():
            user_id = user.id
            auth_client.post(
                url_for("auth.delete_account"),
                data={"password": "password123"},
                follow_redirects=True,
            )
            assert Workout.query.filter_by(user_id=user_id).count() == 0
            assert Exercise.query.count() == 0
            assert Set.query.count() == 0

    def test_delete_account_removes_exercise_definitions(
        self, auth_client, user, exercise_definition, app
    ):
        """Test that account deletion removes all exercise definitions."""
        with app.app_context():
            user_id = user.id
            auth_client.post(
                url_for("auth.delete_account"),
                data={"password": "password123"},
                follow_redirects=True,
            )
            assert ExerciseDefinition.query.filter_by(user_id=user_id).count() == 0

    def test_delete_account_removes_messages(
        self, auth_client, user, second_user, app
    ):
        """Test that account deletion removes sent and received messages."""
        with app.app_context():
            u = User.query.filter_by(username="testuser").first()
            u2 = User.query.filter_by(username="seconduser").first()
            msg1 = Message(sender_id=u.id, recipient_id=u2.id, body="sent")
            msg2 = Message(sender_id=u2.id, recipient_id=u.id, body="received")
            db.session.add_all([msg1, msg2])
            db.session.commit()
            user_id = u.id

            auth_client.post(
                url_for("auth.delete_account"),
                data={"password": "password123"},
                follow_redirects=True,
            )
            assert (
                Message.query.filter(
                    (Message.sender_id == user_id) | (Message.recipient_id == user_id)
                ).count()
                == 0
            )

    def test_delete_account_removes_follow_relationships(
        self, auth_client, user, second_user, app
    ):
        """Test that account deletion removes all follow relationships."""
        with app.app_context():
            u1 = User.query.filter_by(username="testuser").first()
            u2 = User.query.filter_by(username="seconduser").first()
            u1.follow(u2)
            u2.follow(u1)
            db.session.commit()
            user_id = u1.id

            auth_client.post(
                url_for("auth.delete_account"),
                data={"password": "password123"},
                follow_redirects=True,
            )
            result = db.session.execute(
                db.select(followers).where(
                    (followers.c.follower_id == user_id)
                    | (followers.c.followed_id == user_id)
                )
            ).fetchall()
            assert len(result) == 0

    def test_delete_account_removes_notifications(self, auth_client, user, app):
        """Test that account deletion removes all notifications."""
        with app.app_context():
            u = User.query.filter_by(username="testuser").first()
            u.add_notification("unread_message_count", 3)
            db.session.commit()
            user_id = u.id

            auth_client.post(
                url_for("auth.delete_account"),
                data={"password": "password123"},
                follow_redirects=True,
            )
            assert Notification.query.filter_by(user_id=user_id).count() == 0

class TestEmailChangeInProfile:
    """Tests for changing email via the edit profile route."""

    def test_email_change_updates_email_and_unconfirms(self, auth_client, app, mail_outbox):
        """Test that changing email updates it and sets confirmed to False."""
        with app.app_context():
            response = auth_client.post(
                url_for("auth.edit_profile"),
                data={
                    "username": "testuser",
                    "email": "newemail@example.com",
                    "about_me": "",
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            user = User.query.filter_by(username="testuser").first()
            assert user.email == "newemail@example.com"
            assert user.confirmed is False

    def test_email_change_sends_confirmation_email(self, auth_client, app, mail_outbox):
        """Test that changing email sends a confirmation email to the new address."""
        with app.app_context():
            auth_client.post(
                url_for("auth.edit_profile"),
                data={
                    "username": "testuser",
                    "email": "newemail@example.com",
                    "about_me": "",
                },
                follow_redirects=True,
            )
            # At least one email was sent
            assert len(mail_outbox) >= 1

    def test_email_change_duplicate_rejected(self, auth_client, second_user, app):
        """Test that changing to an already-taken email shows a form error."""
        with app.app_context():
            response = auth_client.post(
                url_for("auth.edit_profile"),
                data={
                    "username": "testuser",
                    "email": "second@example.com",  # belongs to second_user
                    "about_me": "",
                },
                follow_redirects=True,
            )
            assert response.status_code == 200
            assert "bereits verwendet" in response.get_data(as_text=True)

            # Email must not have changed
            user = User.query.filter_by(username="testuser").first()
            assert user.email == "test@example.com"

    def test_same_email_does_not_trigger_reconfirmation(self, auth_client, app, mail_outbox):
        """Test that submitting the same email does not change confirmed status."""
        with app.app_context():
            response = auth_client.post(
                url_for("auth.edit_profile"),
                data={
                    "username": "testuser",
                    "email": "test@example.com",  # unchanged
                    "about_me": "",
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            user = User.query.filter_by(username="testuser").first()
            assert user.confirmed is True
            assert len(mail_outbox) == 0


class TestChangePasswordRoute:
    """Tests for the change_password route."""

    def test_change_password_success(self, auth_client, app):
        """Test successful password change."""
        with app.app_context():
            response = auth_client.post(
                url_for("auth.change_password"),
                data={
                    "pwd-current_password": "password123",
                    "pwd-new_password": "newpassword456",
                    "pwd-confirm_password": "newpassword456",
                },
                follow_redirects=True,
            )
            assert response.status_code == 200
            assert "erfolgreich ge\u00e4ndert" in response.get_data(as_text=True)

            user = User.query.filter_by(username="testuser").first()
            assert user.check_password("newpassword456") is True

    def test_change_password_wrong_current_password(self, auth_client, app):
        """Test that wrong current password is rejected."""
        with app.app_context():
            response = auth_client.post(
                url_for("auth.change_password"),
                data={
                    "pwd-current_password": "wrongpassword",
                    "pwd-new_password": "newpassword456",
                    "pwd-confirm_password": "newpassword456",
                },
                follow_redirects=True,
            )
            assert response.status_code == 200
            assert "falsch" in response.get_data(as_text=True)

            # Password must not have changed
            user = User.query.filter_by(username="testuser").first()
            assert user.check_password("password123") is True

    def test_change_password_mismatched_new_passwords(self, auth_client, app):
        """Test that mismatched new passwords are rejected."""
        with app.app_context():
            response = auth_client.post(
                url_for("auth.change_password"),
                data={
                    "pwd-current_password": "password123",
                    "pwd-new_password": "newpassword456",
                    "pwd-confirm_password": "differentpassword",
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            # Password must not have changed
            user = User.query.filter_by(username="testuser").first()
            assert user.check_password("password123") is True

    def test_change_password_requires_login(self, client, app):
        """Test that change_password requires authentication."""
        with app.app_context():
            response = client.post(
                url_for("auth.change_password"),
                data={
                    "pwd-current_password": "password123",
                    "pwd-new_password": "newpassword456",
                    "pwd-confirm_password": "newpassword456",
                },
                follow_redirects=False,
            )
            assert response.status_code == 302
            assert "login" in response.location

    def test_change_password_requires_confirmation(self, unconfirmed_auth_client, app):
        """Test that unconfirmed users cannot change password."""
        with app.app_context():
            response = unconfirmed_auth_client.post(
                url_for("auth.change_password"),
                data={
                    "pwd-current_password": "password123",
                    "pwd-new_password": "newpassword456",
                    "pwd-confirm_password": "newpassword456",
                },
                follow_redirects=False,
            )
            assert response.status_code == 302
            assert "unconfirmed" in response.location


class TestPasswordToggleUI:
    """Tests that password toggle eye-icon markup is present in templates."""

    def test_login_has_password_toggle(self, client, app):
        """Test that login page renders with the eye-icon toggle button."""
        with app.app_context():
            response = client.get(url_for("auth.login"))
            assert response.status_code == 200
            assert b"togglePassword" in response.data
            assert b"bi-eye" in response.data

    def test_register_has_password_toggles(self, client, app):
        """Test that register page renders with eye-icon toggle buttons."""
        with app.app_context():
            response = client.get(url_for("auth.register"))
            assert response.status_code == 200
            assert response.data.count(b"togglePassword") >= 2

    def test_edit_profile_has_password_toggle(self, auth_client, app):
        """Test that edit profile page renders with eye-icon toggle buttons."""
        with app.app_context():
            response = auth_client.get(url_for("auth.edit_profile"))
            assert response.status_code == 200
            assert b"togglePassword" in response.data
            assert b"bi-eye" in response.data

    def test_edit_profile_shows_email_field(self, auth_client, app):
        """Test that edit profile page shows the email field."""
        with app.app_context():
            response = auth_client.get(url_for("auth.edit_profile"))
            assert response.status_code == 200
            assert b"test@example.com" in response.data

    def test_edit_profile_shows_password_change_section(self, auth_client, app):
        """Test that edit profile page shows the password change section."""
        with app.app_context():
            response = auth_client.get(url_for("auth.edit_profile"))
            assert response.status_code == 200
            assert "Passwort \u00e4ndern" in response.get_data(as_text=True)

