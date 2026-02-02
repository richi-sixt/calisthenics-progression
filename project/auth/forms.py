from flask_wtf import FlaskForm
from flask_wtf.file import FileField, FileAllowed
from wtforms import StringField, PasswordField, BooleanField, SubmitField, TextAreaField
from wtforms.validators import DataRequired, ValidationError, Email, EqualTo, Length
from project.models import User


class EditProfileForm(FlaskForm):
    username = StringField(("Benutzername"), validators=[DataRequired()])
    about_me = TextAreaField(("Über mich"), validators=[Length(min=0, max=280)])
    picture = FileField(
        "Profilebild hinzufügen", validators=[FileAllowed(["jpg", "png"])]
    )
    submit = SubmitField("Senden")

    def __init__(self, original_username, *args, **kwargs):
        super(EditProfileForm, self).__init__(*args, **kwargs)
        self.original_username = original_username

    def validate_username(self, username):
        if username.data != self.original_username:
            user = User.query.filter_by(username=self.username.data).first()
            if user is not None:
                raise ValidationError(
                    "Dieser Benutzername ist nicht verfügbar. Bitte einen anderen Benutzernamen wählen."
                )


class LoginForm(FlaskForm):
    username = StringField("Benutzername", validators=[DataRequired()])
    password = PasswordField("Passwort", validators=[DataRequired()])
    remember_me = BooleanField("Anmeldung speichern")
    submit = SubmitField("Anmelden")


class RegistrationForm(FlaskForm):
    username = StringField("Benutzername", validators=[DataRequired()])
    email = StringField("E-Mail", validators=[DataRequired(), Email()])
    password = PasswordField("Passwort", validators=[DataRequired()])
    repeat_password = PasswordField(
        "Passwort wiederholen", validators=[DataRequired(), EqualTo("password")]
    )
    submit = SubmitField("Registrieren")

    @staticmethod
    def validate_username(self, username):
        user = User.query.filter_by(username=username.data).first()
        if user is not None:
            raise ValidationError("Bitte einen anderen Benutzernamen wählen.")

    @staticmethod
    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user is not None:
            raise ValidationError("Bitte eine andere Email-Adresse wählen.")


class ResetPasswordRequestForm(FlaskForm):
    email = StringField("E-Mail", validators=[DataRequired(), Email()])
    submit = SubmitField("Passwort zurücksetzen")


class ResetPasswordForm(FlaskForm):
    password = PasswordField("Password", validators=[DataRequired()])
    password2 = PasswordField(
        "Passwort wiederholen", validators=[DataRequired(), EqualTo("password")]
    )
    submit = SubmitField("Passwort ändern")

