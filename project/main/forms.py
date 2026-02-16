from flask_wtf import FlaskForm
from wtforms import SubmitField, TextAreaField, StringField, RadioField
from wtforms.validators import DataRequired, Length

class MessageForm(FlaskForm):
    message = TextAreaField(('Nachricht'), validators=[DataRequired(), Length(min=0, max=140)])
    submit = SubmitField('Senden')

class CreateExerciseForm(FlaskForm):
    title = StringField('Titel', validators=[DataRequired()])
    description = TextAreaField('Beschreibung', validators=[DataRequired()])
    counting_type = RadioField(
        'Zählweise',
        choices=[('reps', 'Wiederhoolungen'), ('duration', 'Dauer (mm:ss')],
        default='reps',
        validators=[DataRequired()]
    )
    submit = SubmitField('Hinzufügen')
