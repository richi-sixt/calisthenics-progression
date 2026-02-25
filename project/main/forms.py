from flask_wtf import FlaskForm
from wtforms import RadioField, StringField, SubmitField, TextAreaField
from wtforms.validators import DataRequired, Length, Optional


class ManageCategoriesForm(FlaskForm):
    """Minimal form used solely for CSRF token generation on the manage-categories page."""

    submit = SubmitField("Hinzufügen")


class MessageForm(FlaskForm):
    message = TextAreaField(
        ("Nachricht"), validators=[DataRequired(), Length(min=0, max=140)]
    )
    submit = SubmitField("Senden")


class CreateExerciseForm(FlaskForm):
    title = StringField("Titel", validators=[DataRequired()])
    description = TextAreaField("Beschreibung", validators=[Optional()])
    counting_type = RadioField(
        "Zählweise",
        choices=[("reps", "Reps"), ("duration", "Dauer (mm:ss)")],
        default="reps",
        validators=[DataRequired()],
    )
    submit = SubmitField("Hinzufügen")
