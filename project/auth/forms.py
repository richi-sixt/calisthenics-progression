from __future__ import annotations

from typing import Any
from flask_wtf import FlaskForm
from flask_wtf.file import FileField, FileAllowed
from wtforms import StringField, PasswordField, BooleanField, SubmitField, TextAreaField
from wtforms.validators import DataRequired, ValidationError, Email, EqualTo, Length
from project.models import User


class EditProfileForm(FlaskForm):
    """Form for editing user profile information."""

    username: StringField = StringField("Benutzername", validators=[DataRequired()])
    email: StringField = StringField("E-Mail", validators=[DataRequired(), Email()])
    about_me: TextAreaField = TextAreaField("Über mich", validators=[Length(min=0, max=280)])
    picture: FileField = FileField(
        "Profilebild hinzufügen", validators=[FileAllowed(["jpg", "png"])]
    )
    submit: SubmitField = SubmitField("Senden")

    def __init__(self, original_username: str, *args: Any, **kwargs: Any) -> None:
        """Initialize the form with the original username for validation."""
        super().__init__(*args, **kwargs)
        self.original_username = original_username
        self.original_email = original_email

    def validate_username(self, username: StringField) -> None:
        """Validate that the username is unique if changed."""
        if username.data and username.data != self.original_username:
            user = User.query.filter_by(username=username.data).first()
            if user is not None:
                raise ValidationError(
                    "Dieser Benutzername ist nicht verfügbar. Bitte einen anderen Benutzernamen wählen."
                )

    def validate_email(self, email: StringField) -> None:
        """Validate that the email is unique if changed."""
        if email.data and email.data != self.original_email:
            user = User.query.filter_by(email=email.data).first()
            if user is not None:
                raise ValidationError("Diese E-Mail-Adresse wird bereits verwendet.")


class LoginForm(FlaskForm):
    """Form for user login."""

    username: StringField = StringField("Benutzername", validators=[DataRequired()])
    password: PasswordField = PasswordField("Passwort", validators=[DataRequired()])
    remember_me: BooleanField = BooleanField("Anmeldung speichern")
    submit: SubmitField = SubmitField("Anmelden")


class RegistrationForm(FlaskForm):
    """Form for user registration."""

    username: StringField = StringField("Benutzername", validators=[DataRequired()])
    email: StringField = StringField("E-Mail", validators=[DataRequired(), Email()])
    password: PasswordField = PasswordField("Passwort", validators=[DataRequired()])
    repeat_password: PasswordField = PasswordField(
        "Passwort wiederholen", validators=[DataRequired(), EqualTo("password")]
    )
    submit: SubmitField = SubmitField("Registrieren")

    def validate_username(self, username: StringField) -> None:
        """Validate that the username is unique."""
        if username.data:
            user = User.query.filter_by(username=username.data).first()
            if user is not None:
                raise ValidationError("Bitte einen anderen Benutzernamen wählen.")

    def validate_email(self, email: StringField) -> None:
        """Validate that the email is unique."""
        if email.data:
            user = User.query.filter_by(email=email.data).first()
            if user is not None:
                raise ValidationError("Bitte eine andere Email-Adresse wählen.")


class ResetPasswordRequestForm(FlaskForm):
    """Form for requesting a password reset."""

    email: StringField = StringField("E-Mail", validators=[DataRequired(), Email()])
    submit: SubmitField = SubmitField("Passwort zurücksetzen")


class ResetPasswordForm(FlaskForm):
    """Form for resetting password with token."""

    password: PasswordField = PasswordField("Password", validators=[DataRequired()])
    password2: PasswordField = PasswordField(
        "Passwort wiederholen", validators=[DataRequired(), EqualTo("password")]
    )
    submit: SubmitField = SubmitField("Passwort ändern")


class DeleteAccountForm(FlaskForm):
    """Form for confirming account deletion with password."""

    password: PasswordField = PasswordField(
        "Passwort bestätigen", validators=[DataRequired()]
    )
    submit: SubmitField = SubmitField("Konto löschen")


class ChangePasswordForm(FlaskForm):
    """Form for changing the user's password from the profile page."""

    current_password: PasswordField = PasswordField(
        "Aktuelles Passwort", validators=[DataRequired()]
    )
    new_password: PasswordField = PasswordField(
        "Neues Passwort", validators=[DataRequired()]
    )
    confirm_password: PasswordField = PasswordField(
        "Neues Passwort bestätigen", validators=[DataRequired(), EqualTo("new_password", message="Die Passwörter stimmen nicht überein.")]
    )
    submit_password: SubmitField = SubmitField("Passwort ändern")
