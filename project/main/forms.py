from flask_wtf import FlaskForm
from wtforms import SubmitField, TextAreaField, StringField
from wtforms.validators import DataRequired, Length

class MessageForm(FlaskForm):
    message = TextAreaField(('Nachricht'), validators=[DataRequired(), Length(min=0, max=140)])
    submit = SubmitField('Senden')

class CreateExerciseForm(FlaskForm):
    title = StringField('Titel', validators=[DataRequired()])
    description = TextAreaField('Beschreibung', validators=[DataRequired()])
    submit = SubmitField('Hinzufügen')
