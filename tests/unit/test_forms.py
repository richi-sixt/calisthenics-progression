"""Unit tests for form validation."""

import pytest

from project import db
from project.auth.forms import (
    LoginForm,
    RegistrationForm,
    EditProfileForm,
    ResetPasswordRequestForm,
    ResetPasswordForm,
    ChangePasswordForm
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
                original_email="test@example.com",
                data={
                    "username": "testuser",
                    "email": "test@example.com",
                    "about_me": "I love calisthenics",
                },
            )
            assert form.validate() is True

    def test_edit_profile_form_same_username(self, app, user):
        """Test edit profile allows keeping same username."""
        with app.app_context():
            form = EditProfileForm(
                original_username="testuser",
                original_email="test@example.com",
                data={
                    "username": "testuser",
                    "email": "test@example.com",
                    "about_me": "",
                },
            )
            assert form.validate() is True

    def test_edit_profile_form_new_username(self, app, user):
        """Test edit profile allows changing to new username."""
        with app.app_context():
            form = EditProfileForm(
                original_username="testuser",
                original_email="test@example.com",
                data={
                    "username": "newusername",
                    "email": "test@example.com",
                    "about_me": "",                },
            )
            assert form.validate() is True

    def test_edit_profile_form_duplicate_username(self, app, user, second_user):
        """Test edit profile rejects changing to existing username."""
        with app.app_context():
            form = EditProfileForm(
                original_username="testuser",
                original_email="test@example.com",
                data={
                    "username": "seconduser",  # Already taken
                    "email": "test@example.com",
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
                original_email="test@example.com",
                data={
                    "username": "testuser",
                    "email": "test@example.com",
                    "about_me": "x" * 281,  # Exceeds 280 char limit
                },
            )
            assert form.validate() is False
            assert "about_me" in form.errors

    def test_edit_profile_form_same_email_valid(self, app, user):
        """Test that submitting the same email as original passes (no uniqueness check)."""
        with app.app_context():
            form = EditProfileForm(
                original_username="testuser",
                original_email="test@example.com",
                data={
                    "username": "testuser",
                    "email": "test@example.com",
                    "about_me": "",
                },
            )
            assert form.validate() is True

    def test_edit_profile_form_new_unique_email_valid(self, app, user):
        """Test that changing to a new unique email address passes validation."""
        with app.app_context():
            form = EditProfileForm(
                original_username="testuser",
                original_email="test@example.com",
                data={
                    "username": "testuser",
                    "email": "brand_new@example.com",
                    "about_me": "",
                },
            )
            assert form.validate() is True

    def test_edit_profile_form_duplicate_email_rejected(self, app, user, second_user):
        """Test that changing to an already-taken email fails validation."""
        with app.app_context():
            form = EditProfileForm(
                original_username="testuser",
                original_email="test@example.com",
                data={
                    "username": "testuser",
                    "email": "second@example.com",  # belongs to second_user
                    "about_me": "",
                },
            )
            assert form.validate() is False
            assert "email" in form.errors

    def test_edit_profile_form_missing_email(self, app, user):
        """Test that omitting email fails validation."""
        with app.app_context():
            form = EditProfileForm(
                original_username="testuser",
                original_email="test@example.com",
                data={
                    "username": "testuser",
                    "email": "",
                    "about_me": "",
                },
            )
            assert form.validate() is False
            assert "email" in form.errors

    def test_edit_profile_form_invalid_email_format(self, app, user):
        """Test that an invalid email format fails validation."""
        with app.app_context():
            form = EditProfileForm(
                original_username="testuser",
                original_email="test@example.com",
                data={
                    "username": "testuser",
                    "email": "not-a-valid-email",
                    "about_me": "",
                },
            )
            assert form.validate() is False
            assert "email" in form.errors


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

    def test_create_exercise_form_with_reps_counting_type(self, app):
        """Test create exercise form with reps counting type."""
        with app.app_context():
            form = CreateExerciseForm(
                data={
                    "title": "Push-ups",
                    "description": "Standard push-ups",
                    "counting_type": "reps",
                }
            )
            assert form.validate() is True
            assert form.counting_type.data == "reps"

    def test_create_exercise_form_with_duration_counting_type(self, app):
        """Test create exercise form with duration counting type."""
        with app.app_context():
            form = CreateExerciseForm(
                data={
                    "title": "Plank",
                    "description": "Hold a plank",
                    "counting_type": "duration",
                }
            )
            assert form.validate() is True
            assert form.counting_type.data == "duration"

    def test_create_exercise_form_invalid_counting_type(self, app):
        """Test create exercise form rejects invalid counting type."""
        with app.app_context():
            form = CreateExerciseForm(
                data={
                    "title": "Exercise",
                    "description": "Description",
                    "counting_type": "invalid",
                }
            )
            assert form.validate() is False
            assert "counting_type" in form.errors

    def test_create_exercise_form_defaults_to_reps(self, app):
        """Test create exercise form defaults counting_type to reps."""
        with app.app_context():
            form = CreateExerciseForm(
                data={
                    "title": "Push-ups",
                    "description": "Standard push-ups",
                }
            )
            assert form.counting_type.data == "reps"


class TestChangePasswordForm:
    """Tests for the ChangePasswordForm."""

    def test_change_password_form_valid(self, app):
        """Test form passes with all fields correctly filled."""
        with app.app_context():
            form = ChangePasswordForm(
                data={
                    "current_password": "oldpassword123",
                    "new_password": "newpassword456",
                    "confirm_password": "newpassword456",
                }
            )
            assert form.validate() is True

    def test_change_password_form_missing_current_password(self, app):
        """Test form fails when current password is empty."""
        with app.app_context():
            form = ChangePasswordForm(
                data={
                    "current_password": "",
                    "new_password": "newpassword456",
                    "confirm_password": "newpassword456",
                }
            )
            assert form.validate() is False
            assert "current_password" in form.errors

    def test_change_password_form_missing_new_password(self, app):
        """Test form fails when new password is empty."""
        with app.app_context():
            form = ChangePasswordForm(
                data={
                    "current_password": "oldpassword123",
                    "new_password": "",
                    "confirm_password": "",
                }
            )
            assert form.validate() is False
            assert "new_password" in form.errors

    def test_change_password_form_mismatched_confirm(self, app):
        """Test form fails when confirm password does not match new password."""
        with app.app_context():
            form = ChangePasswordForm(
                data={
                    "current_password": "oldpassword123",
                    "new_password": "newpassword456",
                    "confirm_password": "totallydifferent",
                }
            )
            assert form.validate() is False
            assert "confirm_password" in form.errors

    def test_change_password_form_missing_confirm(self, app):
        """Test form fails when confirm password field is empty."""
        with app.app_context():
            form = ChangePasswordForm(
                data={
                    "current_password": "oldpassword123",
                    "new_password": "newpassword456",
                    "confirm_password": "",
                }
            )
            assert form.validate() is False
            assert "confirm_password" in form.errors
