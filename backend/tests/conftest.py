"""Pytest fixtures for the test suite."""

import glob
import os
import uuid
from datetime import datetime, timedelta, timezone

import jwt as pyjwt
import pytest
from project import create_app, db
from project.models import (Exercise, ExerciseCategory, ExerciseDefinition,
                            Set, User, Workout)
from tests.test_config import TestConfig


def _make_supabase_jwt(supabase_uid: str, email: str, confirmed: bool = True) -> str:
    """Generate a Supabase-shaped JWT for testing.

    Mirrors the structure of real Supabase Auth JWTs.
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub": supabase_uid,
        "email": email,
        "aud": "authenticated",
        "role": "authenticated",
        "iat": now,
        "exp": now + timedelta(hours=1),
    }
    if confirmed:
        payload["email_confirmed_at"] = now.isoformat()
    else:
        payload["email_confirmed_at"] = None

    return pyjwt.encode(payload, TestConfig.SUPABASE_JWT_SECRET, algorithm="HS256")


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
    """Create a confirmed test user with a Supabase UID."""
    with app.app_context():
        supabase_uid = str(uuid.uuid4())
        user = User(
            username="testuser",
            email="test@example.com",
            admin=False,
            confirmed=True,
            confirmed_on=datetime.now(timezone.utc),
        )
        user.supabase_uid = supabase_uid
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        user = (
            db.session.execute(db.select(User).filter_by(username="testuser"))
            .scalars()
            .first()
        )
        yield user


@pytest.fixture
def unconfirmed_user(app):
    """Create an unconfirmed test user with a Supabase UID."""
    with app.app_context():
        supabase_uid = str(uuid.uuid4())
        user = User(
            username="unconfirmed",
            email="unconfirmed@example.com",
            admin=False,
            confirmed=False,
        )
        user.supabase_uid = supabase_uid
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        user = (
            db.session.execute(db.select(User).filter_by(username="unconfirmed"))
            .scalars()
            .first()
        )
        yield user


@pytest.fixture
def second_user(app):
    """Create a second confirmed test user for relationship testing."""
    with app.app_context():
        supabase_uid = str(uuid.uuid4())
        user = User(
            username="seconduser",
            email="second@example.com",
            admin=False,
            confirmed=True,
            confirmed_on=datetime.now(timezone.utc),
        )
        user.supabase_uid = supabase_uid
        user.set_password("password456")
        db.session.add(user)
        db.session.commit()

        user = (
            db.session.execute(db.select(User).filter_by(username="seconduser"))
            .scalars()
            .first()
        )
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
def api_headers(app, user):
    """Return headers with a valid Supabase JWT for the confirmed test user."""
    with app.app_context():
        token = _make_supabase_jwt(user.supabase_uid, user.email, confirmed=True)
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }


@pytest.fixture
def api_headers_unconfirmed(app, unconfirmed_user):
    """Return headers with a valid Supabase JWT for the unconfirmed test user."""
    with app.app_context():
        token = _make_supabase_jwt(
            unconfirmed_user.supabase_uid,
            unconfirmed_user.email,
            confirmed=False,
        )
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }


@pytest.fixture
def api_headers_second(app, second_user):
    """Return headers with a valid Supabase JWT for the second test user."""
    with app.app_context():
        token = _make_supabase_jwt(
            second_user.supabase_uid, second_user.email, confirmed=True
        )
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }


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

        exercise_def = (
            db.session.execute(
                db.select(ExerciseDefinition).filter_by(title="Push-ups")
            )
            .scalars()
            .first()
        )
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

        workout = (
            db.session.execute(db.select(Workout).filter_by(title="Morning Workout"))
            .scalars()
            .first()
        )
        yield workout


@pytest.fixture
def duration_exercise_definition(app, user):
    """Create a duration-based exercise definition."""
    with app.app_context():
        exercise_def = ExerciseDefinition(
            title="Plank",
            description="Hold a plank position",
            user_id=user.id,
            counting_type="duration",
        )
        db.session.add(exercise_def)
        db.session.commit()

        exercise_def = (
            db.session.execute(db.select(ExerciseDefinition).filter_by(title="Plank"))
            .scalars()
            .first()
        )
        yield exercise_def


@pytest.fixture
def duration_workout(app, user, duration_exercise_definition):
    """Create a workout with a duration-based exercise and sets."""
    with app.app_context():
        w = Workout(
            title="Duration Workout",
            user_id=user.id,
        )
        db.session.add(w)
        db.session.flush()

        exercise = Exercise(
            exercise_order=1,
            workout_id=w.id,
            exercise_definition_id=duration_exercise_definition.id,
        )
        db.session.add(exercise)
        db.session.flush()

        work_set = Set(
            set_order=1,
            exercise_id=exercise.id,
            progression="Standard",
            duration=90,
        )
        db.session.add(work_set)
        db.session.commit()

        w = (
            db.session.execute(db.select(Workout).filter_by(title="Duration Workout"))
            .scalars()
            .first()
        )
        yield w


@pytest.fixture
def workout_with_two_exercises(app, user):
    """Create a workout with two exercises (one reps, one duration) and two sets each."""
    with app.app_context():
        reps_def = ExerciseDefinition(
            title="Pull-ups",
            description="Standard pull-ups",
            user_id=user.id,
            counting_type="reps",
        )
        duration_def = ExerciseDefinition(
            title="Plank",
            description="Hold a plank",
            user_id=user.id,
            counting_type="duration",
        )
        db.session.add(reps_def)
        db.session.add(duration_def)
        db.session.flush()

        w = Workout(title="Two Exercise Workout", user_id=user.id)
        db.session.add(w)
        db.session.flush()

        ex1 = Exercise(
            exercise_order=1, workout_id=w.id, exercise_definition_id=reps_def.id
        )
        db.session.add(ex1)
        db.session.flush()
        db.session.add(
            Set(set_order=1, exercise_id=ex1.id, progression="Standard", reps=10)
        )
        db.session.add(
            Set(set_order=2, exercise_id=ex1.id, progression="Standard", reps=8)
        )

        ex2 = Exercise(
            exercise_order=2, workout_id=w.id, exercise_definition_id=duration_def.id
        )
        db.session.add(ex2)
        db.session.flush()
        db.session.add(
            Set(set_order=1, exercise_id=ex2.id, progression="Standard", duration=60)
        )
        db.session.add(
            Set(set_order=2, exercise_id=ex2.id, progression="Standard", duration=90)
        )

        db.session.commit()
        w = (
            db.session.execute(
                db.select(Workout).filter_by(title="Two Exercise Workout")
            )
            .scalars()
            .first()
        )
        yield w


@pytest.fixture
def workout_template(app, user, exercise_definition):
    """Create a workout template with one reps-based exercise and set."""
    with app.app_context():
        template = Workout(
            title="My Template",
            user_id=user.id,
            is_template=True,
        )
        db.session.add(template)
        db.session.flush()

        exercise = Exercise(
            exercise_order=1,
            workout_id=template.id,
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

        template = (
            db.session.execute(db.select(Workout).filter_by(title="My Template"))
            .scalars()
            .first()
        )
        yield template


@pytest.fixture
def workout_template_with_two_exercises(app, user):
    """Create a workout template with two exercises (reps + duration) and two sets each."""
    with app.app_context():
        reps_def = ExerciseDefinition(
            title="Template Pull-ups",
            description="Pull-ups for template",
            user_id=user.id,
            counting_type="reps",
        )
        duration_def = ExerciseDefinition(
            title="Template Plank",
            description="Plank for template",
            user_id=user.id,
            counting_type="duration",
        )
        db.session.add(reps_def)
        db.session.add(duration_def)
        db.session.flush()

        template = Workout(
            title="Two Exercise Template",
            user_id=user.id,
            is_template=True,
        )
        db.session.add(template)
        db.session.flush()

        ex1 = Exercise(
            exercise_order=1, workout_id=template.id, exercise_definition_id=reps_def.id
        )
        db.session.add(ex1)
        db.session.flush()
        db.session.add(
            Set(set_order=1, exercise_id=ex1.id, progression="Standard", reps=10)
        )
        db.session.add(
            Set(set_order=2, exercise_id=ex1.id, progression="Standard", reps=8)
        )

        ex2 = Exercise(
            exercise_order=2,
            workout_id=template.id,
            exercise_definition_id=duration_def.id,
        )
        db.session.add(ex2)
        db.session.flush()
        db.session.add(
            Set(set_order=1, exercise_id=ex2.id, progression="Standard", duration=60)
        )
        db.session.add(
            Set(set_order=2, exercise_id=ex2.id, progression="Standard", duration=90)
        )

        db.session.commit()
        template = (
            db.session.execute(
                db.select(Workout).filter_by(title="Two Exercise Template")
            )
            .scalars()
            .first()
        )
        yield template


@pytest.fixture
def exercise_categories(app):
    """Create standard test categories: Cardio, Core, Upper Body."""
    with app.app_context():
        cats = [ExerciseCategory(name=n) for n in ["Cardio", "Core", "Upper Body"]]
        for c in cats:
            db.session.add(c)
        db.session.commit()
        cats = (
            db.session.execute(
                db.select(ExerciseCategory).order_by(ExerciseCategory.name)
            )
            .scalars()
            .all()
        )
        yield cats


@pytest.fixture
def mail_outbox(app):
    """Fixture to capture sent emails."""
    from project import mail

    with mail.record_messages() as outbox:
        yield outbox


@pytest.fixture(autouse=True)
def cleanup_profile_pics(app):
    """Remove any profile pictures created during a test."""
    pics_dir = os.path.join(app.root_path, "static", "profile_pics")
    before = set(glob.glob(os.path.join(pics_dir, "*")))
    yield
    after = set(glob.glob(os.path.join(pics_dir, "*")))
    for new_file in after - before:
        os.remove(new_file)
