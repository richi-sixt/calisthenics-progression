"""Unit tests for form validation."""

import pytest

from project import db
from project.auth.forms import (
    LoginForm,
    RegistrationForm,
    EditProfileForm,
    ResetPasswordRequestForm,
    ResetPasswordForm,
)
from project.main.forms import MessageForm, CreateExerciseForm
from project.models import User


class TestLoginForm:
    """Tests for the LoginForm."""

    def test_login_form_valid(self, app):
        """Test login form with valid data."""
        with app.app_context():
            form = LoginForm(
                data={
                    "username": "testuser",
                    "password": "password123",
                    "remember_me": True,
                }
            )
            assert form.validate() is True

    def test_login_form_missing_username(self, app):
        """Test login form requires username."""
        with app.app_context():
            form = LoginForm(
                data={
                    "username": "",
                    "password": "password123",
                }
            )
            assert form.validate() is False
            assert "username" in form.errors

    def test_login_form_missing_password(self, app):
        """Test login form requires password."""
        with app.app_context():
            form = LoginForm(
                data={
                    "username": "testuser",
                    "password": "",
                }
            )
            assert form.validate() is False
            assert "password" in form.errors


class TestRegistrationForm:
    """Tests for the RegistrationForm."""

    def test_registration_form_valid(self, app):
        """Test registration form with valid data."""
        with app.app_context():
            form = RegistrationForm(
                data={
                    "username": "newuser",
                    "email": "new@example.com",
                    "password": "password123",
                    "repeat_password": "password123",
                }
            )
            assert form.validate() is True

    def test_registration_form_password_mismatch(self, app):
        """Test registration form requires matching passwords."""
        with app.app_context():
            form = RegistrationForm(
                data={
                    "username": "newuser",
                    "email": "new@example.com",
                    "password": "password123",
                    "repeat_password": "differentpassword",
                }
            )
            assert form.validate() is False
            assert "repeat_password" in form.errors

    def test_registration_form_invalid_email(self, app):
        """Test registration form validates email format."""
        with app.app_context():
            form = RegistrationForm(
                data={
                    "username": "newuser",
                    "email": "not-an-email",
                    "password": "password123",
                    "repeat_password": "password123",
                }
            )
            assert form.validate() is False
            assert "email" in form.errors

    def test_registration_form_duplicate_username(self, app, user):
        """Test registration form rejects duplicate username."""
        with app.app_context():
            form = RegistrationForm(
                data={
                    "username": "testuser",  # Already exists
                    "email": "unique@example.com",
                    "password": "password123",
                    "repeat_password": "password123",
                }
            )
            assert form.validate() is False
            assert "username" in form.errors

    def test_registration_form_duplicate_email(self, app, user):
        """Test registration form rejects duplicate email."""
        with app.app_context():
            form = RegistrationForm(
                data={
                    "username": "uniqueuser",
                    "email": "test@example.com",  # Already exists
                    "password": "password123",
                    "repeat_password": "password123",
                }
            )
            assert form.validate() is False
            assert "email" in form.errors


class TestEditProfileForm:
    """Tests for the EditProfileForm."""

    def test_edit_profile_form_valid(self, app, user):
        """Test edit profile form with valid data."""
        with app.app_context():
            form = EditProfileForm(
                original_username="testuser",
                data={
                    "username": "testuser",
                    "about_me": "I love calisthenics",
                },
            )
            assert form.validate() is True

    def test_edit_profile_form_same_username(self, app, user):
        """Test edit profile allows keeping same username."""
        with app.app_context():
            form = EditProfileForm(
                original_username="testuser",
                data={
                    "username": "testuser",
                    "about_me": "",
                },
            )
            assert form.validate() is True

    def test_edit_profile_form_new_username(self, app, user):
        """Test edit profile allows changing to new username."""
        with app.app_context():
            form = EditProfileForm(
                original_username="testuser",
                data={
                    "username": "newusername",
                    "about_me": "",
                },
            )
            assert form.validate() is True

    def test_edit_profile_form_duplicate_username(self, app, user, second_user):
        """Test edit profile rejects changing to existing username."""
        with app.app_context():
            form = EditProfileForm(
                original_username="testuser",
                data={
                    "username": "seconduser",  # Already taken
                    "about_me": "",
                },
            )
            assert form.validate() is False
            assert "username" in form.errors

    def test_edit_profile_form_about_me_length(self, app, user):
        """Test edit profile validates about_me max length."""
        with app.app_context():
            form = EditProfileForm(
                original_username="testuser",
                data={
                    "username": "testuser",
                    "about_me": "x" * 281,  # Exceeds 280 char limit
                },
            )
            assert form.validate() is False
            assert "about_me" in form.errors


class TestResetPasswordRequestForm:
    """Tests for the ResetPasswordRequestForm."""

    def test_reset_password_request_valid(self, app):
        """Test reset password request form with valid email."""
        with app.app_context():
            form = ResetPasswordRequestForm(
                data={
                    "email": "user@example.com",
                }
            )
            assert form.validate() is True

    def test_reset_password_request_invalid_email(self, app):
        """Test reset password request validates email format."""
        with app.app_context():
            form = ResetPasswordRequestForm(
                data={
                    "email": "not-an-email",
                }
            )
            assert form.validate() is False
            assert "email" in form.errors


class TestResetPasswordForm:
    """Tests for the ResetPasswordForm."""

    def test_reset_password_form_valid(self, app):
        """Test reset password form with valid matching passwords."""
        with app.app_context():
            form = ResetPasswordForm(
                data={
                    "password": "newpassword123",
                    "password2": "newpassword123",
                }
            )
            assert form.validate() is True

    def test_reset_password_form_mismatch(self, app):
        """Test reset password form requires matching passwords."""
        with app.app_context():
            form = ResetPasswordForm(
                data={
                    "password": "newpassword123",
                    "password2": "differentpassword",
                }
            )
            assert form.validate() is False
            assert "password2" in form.errors


class TestMessageForm:
    """Tests for the MessageForm."""

    def test_message_form_valid(self, app):
        """Test message form with valid data."""
        with app.app_context():
            form = MessageForm(
                data={
                    "message": "Hello, how are you?",
                }
            )
            assert form.validate() is True

    def test_message_form_empty(self, app):
        """Test message form requires message content."""
        with app.app_context():
            form = MessageForm(
                data={
                    "message": "",
                }
            )
            assert form.validate() is False
            assert "message" in form.errors

    def test_message_form_max_length(self, app):
        """Test message form validates max length."""
        with app.app_context():
            form = MessageForm(
                data={
                    "message": "x" * 141,  # Exceeds 140 char limit
                }
            )
            assert form.validate() is False
            assert "message" in form.errors


class TestCreateExerciseForm:
    """Tests for the CreateExerciseForm."""

    def test_create_exercise_form_valid(self, app):
        """Test create exercise form with valid data."""
        with app.app_context():
            form = CreateExerciseForm(
                data={
                    "title": "Push-ups",
                    "description": "Standard push-up exercise for upper body.",
                }
            )
            assert form.validate() is True

    def test_create_exercise_form_missing_title(self, app):
        """Test create exercise form requires title."""
        with app.app_context():
            form = CreateExerciseForm(
                data={
                    "title": "",
                    "description": "Description here",
                }
            )
            assert form.validate() is False
            assert "title" in form.errors

    def test_create_exercise_form_missing_description(self, app):
        """Test create exercise form requires description."""
        with app.app_context():
            form = CreateExerciseForm(
                data={
                    "title": "Exercise Title",
                    "description": "",
                }
            )
            assert form.validate() is False
            assert "description" in form.errors
