"""Pytest fixtures for the test suite."""

from datetime import datetime, timezone

import pytest

from project import create_app, db
from project.models import User, Workout, Exercise, ExerciseDefinition, Set, Message
from tests.test_config import TestConfig


@pytest.fixture
def app():
    """Create and configure a test application instance."""
    app = create_app(TestConfig)

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Create a test client for the application."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create a test CLI runner for the application."""
    return app.test_cli_runner()


@pytest.fixture
def user(app):
    """Create a confirmed test user."""
    with app.app_context():
        user = User(
            username="testuser",
            email="test@example.com",
            admin=False,
            confirmed=True,
            confirmed_on=datetime.now(timezone.utc),
        )
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        # Re-query to get attached instance
        user = User.query.filter_by(username="testuser").first()
        yield user


@pytest.fixture
def unconfirmed_user(app):
    """Create an unconfirmed test user."""
    with app.app_context():
        user = User(
            username="unconfirmed",
            email="unconfirmed@example.com",
            admin=False,
            confirmed=False,
        )
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        user = User.query.filter_by(username="unconfirmed").first()
        yield user


@pytest.fixture
def second_user(app):
    """Create a second confirmed test user for relationship testing."""
    with app.app_context():
        user = User(
            username="seconduser",
            email="second@example.com",
            admin=False,
            confirmed=True,
            confirmed_on=datetime.now(timezone.utc),
        )
        user.set_password("password456")
        db.session.add(user)
        db.session.commit()

        user = User.query.filter_by(username="seconduser").first()
        yield user


@pytest.fixture
def auth_client(client, user, app):
    """Create a test client logged in as the confirmed user."""
    with app.app_context():
        with client.session_transaction() as sess:
            # Flask-Login uses _user_id in session
            sess["_user_id"] = str(user.id)
            sess["_fresh"] = True
    return client


@pytest.fixture
def unconfirmed_auth_client(client, unconfirmed_user, app):
    """Create a test client logged in as an unconfirmed user."""
    with app.app_context():
        with client.session_transaction() as sess:
            sess["_user_id"] = str(unconfirmed_user.id)
            sess["_fresh"] = True
    return client


@pytest.fixture
def exercise_definition(app, user):
    """Create an exercise definition (Exercises model)."""
    with app.app_context():
        exercise_def = ExerciseDefinition(
            title="Push-ups",
            description="Standard push-up exercise",
            user_id=user.id,
        )
        db.session.add(exercise_def)
        db.session.commit()

        exercise_def = ExerciseDefinition.query.filter_by(title="Push-ups").first()
        yield exercise_def


@pytest.fixture
def workout(app, user, exercise_definition):
    """Create a workout with exercises and sets."""
    with app.app_context():
        workout = Workout(
            title="Morning Workout",
            user_id=user.id,
        )
        db.session.add(workout)
        db.session.flush()

        exercise = Exercise(
            exercise_order=1,
            workout_id=workout.id,
            exercise_definition_id=exercise_definition.id,
        )
        db.session.add(exercise)
        db.session.flush()

        work_set = Set(
            set_order=1,
            exercise_id=exercise.id,
            progression="Standard",
            reps=10,
        )
        db.session.add(work_set)
        db.session.commit()

        workout = Workout.query.filter_by(title="Morning Workout").first()
        yield workout


@pytest.fixture
def mail_outbox(app):
    """Fixture to capture sent emails."""
    from project import mail

    with mail.record_messages() as outbox:
        yield outbox
