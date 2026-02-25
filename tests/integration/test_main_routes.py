"""Integration tests for main application routes."""

import pytest

__all__ = ("pytest",)
from flask import url_for
from sqlalchemy import func

from project import db
from project.models import (
    Exercise,
    ExerciseCategory,
    ExerciseDefinition,
    Message,
    ProgressionLevel,
    Set,
    User,
    Workout,
)


class TestIndexRoute:
    """Tests for the index route."""

    def test_index_anonymous_user(self, client, app):
        """Test index page for anonymous user."""
        with app.app_context():
            response = client.get(url_for("main.index"))
            assert response.status_code == 200

    def test_index_authenticated_user_redirects(self, auth_client, app):
        """Test authenticated user is redirected to workouts."""
        with app.app_context():
            response = auth_client.get(
                url_for("main.index"),
                follow_redirects=False,
            )
            assert response.status_code == 302


class TestWorkoutsRoute:
    """Tests for workout routes."""

    def test_workouts_page_renders(self, auth_client, app):
        """Test workouts page renders."""
        with app.app_context():
            response = auth_client.get(url_for("main.workouts"))
            assert response.status_code == 200

    def test_workouts_requires_login(self, client, app):
        """Test workouts page requires authentication."""
        with app.app_context():
            response = client.get(
                url_for("main.workouts"),
                follow_redirects=False,
            )
            assert response.status_code == 302

    def test_workout_detail_page(self, auth_client, workout, app):
        """Test workout detail page renders."""
        with app.app_context():
            workout = db.session.execute(db.select(Workout)).scalars().first()
            response = auth_client.get(url_for("main.workout", workout_id=workout.id))
            assert response.status_code == 200
            assert b"Morning Workout" in response.data

    def test_workout_not_found(self, auth_client, app):
        """Test 404 for non-existent workout."""
        with app.app_context():
            response = auth_client.get(url_for("main.workout", workout_id=99999))
            assert response.status_code == 404

    def test_add_workout_page_renders(self, auth_client, app, exercise_definition):
        """Test add workout page renders."""
        with app.app_context():
            response = auth_client.get(url_for("main.add_workout"))
            assert response.status_code == 200

    def test_add_workout_creates_workout(self, auth_client, app, exercise_definition):
        """Test creating a new workout."""
        with app.app_context():
            exercise_def = (
                db.session.execute(db.select(ExerciseDefinition)).scalars().first()
            )
            response = auth_client.post(
                url_for("main.add_workout"),
                data={
                    "wtitle": "New Test Workout",
                    "exercise_count": "1",
                    "exercise1": str(exercise_def.id),
                    "progression1": ["Beginner"],
                    "reps1": ["8"],
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            # Verify workout was created
            workout = (
                db.session.execute(
                    db.select(Workout).filter_by(title="New Test Workout")
                )
                .scalars()
                .first()
            )
            assert workout is not None

    def test_delete_workout_own(self, auth_client, workout, app):
        """Test user can delete their own workout."""
        with app.app_context():
            workout = db.session.execute(db.select(Workout)).scalars().first()
            workout_id = workout.id
            response = auth_client.post(
                url_for("main.delete_workout", workout_id=workout_id),
                follow_redirects=True,
            )
            assert response.status_code == 200

            # Verify workout was deleted
            assert (
                db.session.execute(db.select(Workout).filter_by(id=workout_id))
                .scalars()
                .first()
                is None
            )

    def test_delete_workout_others_forbidden(self, client, workout, second_user, app):
        """Test user cannot delete another user's workout."""
        with app.app_context():
            # Login as second user
            with client.session_transaction() as sess:
                sess["_user_id"] = str(second_user.id)
                sess["_fresh"] = True

            workout = db.session.execute(db.select(Workout)).scalars().first()
            response = client.post(
                url_for("main.delete_workout", workout_id=workout.id),
            )
            assert response.status_code == 403

    def test_add_workout_invalid_exercise_count(self, auth_client, app):
        """Test add_workout with non-numeric exercise_count."""
        with app.app_context():
            response = auth_client.post(
                url_for("main.add_workout"),
                data={"exercise_count": "abc", "wtitle": "Bad Workout"},
                follow_redirects=True,
            )
            assert response.status_code == 200
            assert "Ung\u00fcltige Formulardaten" in response.get_data(as_text=True)

    def test_add_workout_zero_exercises(self, auth_client, app):
        """Test add_workout with exercise_count < 1."""
        with app.app_context():
            response = auth_client.post(
                url_for("main.add_workout"),
                data={"exercise_count": "0", "wtitle": "Empty Workout"},
                follow_redirects=True,
            )
            assert response.status_code == 200
            assert "Mindestens eine" in response.get_data(as_text=True)

    def test_add_workout_missing_exercise_data(self, auth_client, app):
        """Test add_workout when exercise field is missing from form."""
        with app.app_context():
            response = auth_client.post(
                url_for("main.add_workout"),
                data={"exercise_count": "1", "wtitle": "Missing Ex"},
                follow_redirects=True,
            )
            assert response.status_code == 200
            assert "Fehlende" in response.get_data(as_text=True)

    def test_add_workout_exercise_not_found(self, auth_client, app):
        """Test add_workout with non-existent exercise definition ID."""
        with app.app_context():
            response = auth_client.post(
                url_for("main.add_workout"),
                data={
                    "exercise_count": "1",
                    "wtitle": "Bad Ex",
                    "exercise1": "99999",
                },
                follow_redirects=True,
            )
            assert response.status_code == 200
            assert "nicht gefunden" in response.get_data(as_text=True)

    def test_delete_workout_not_found(self, auth_client, app):
        """Test deleting a non-existent workout returns 404."""
        with app.app_context():
            response = auth_client.post(
                url_for("main.delete_workout", workout_id=99999)
            )
            assert response.status_code == 404


class TestExercisesRoute:
    """Tests for exercise routes."""

    def test_all_exercises_page_renders(self, auth_client, app):
        """Test all exercises page renders."""
        with app.app_context():
            response = auth_client.get(url_for("main.all_exercises"))
            assert response.status_code == 200

    def test_add_exercise_page_renders(self, auth_client, app):
        """Test add exercise page renders."""
        with app.app_context():
            response = auth_client.get(url_for("main.add_exercise"))
            assert response.status_code == 200

    def test_add_exercise_creates_exercise(self, auth_client, app):
        """Test creating a new exercise definition."""
        with app.app_context():
            response = auth_client.post(
                url_for("main.add_exercise"),
                data={
                    "title": "Pull-ups",
                    "description": "Standard pull-up exercise for back.",
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            # Verify exercise was created
            exercise = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Pull-ups")
                )
                .scalars()
                .first()
            )
            assert exercise is not None
            assert exercise.description == "Standard pull-up exercise for back."

    def test_exercise_detail_page(self, auth_client, exercise_definition, app):
        """Test exercise detail page renders."""
        with app.app_context():
            exercise = (
                db.session.execute(db.select(ExerciseDefinition)).scalars().first()
            )
            response = auth_client.get(
                url_for("main.exercise", exercises_id=exercise.id)
            )
            assert response.status_code == 200
            assert b"Push-ups" in response.data

    def test_update_exercise_page_renders(self, auth_client, exercise_definition, app):
        """Test update exercise page renders."""
        with app.app_context():
            exercise = (
                db.session.execute(db.select(ExerciseDefinition)).scalars().first()
            )
            response = auth_client.get(
                url_for("main.update_exercise", exercises_id=exercise.id)
            )
            assert response.status_code == 200

    def test_update_exercise(self, auth_client, exercise_definition, app):
        """Test updating an exercise."""
        with app.app_context():
            exercise = (
                db.session.execute(db.select(ExerciseDefinition)).scalars().first()
            )
            response = auth_client.post(
                url_for("main.update_exercise", exercises_id=exercise.id),
                data={
                    "title": "Updated Push-ups",
                    "description": "Updated description",
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            # Verify exercise was updated
            exercise = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Updated Push-ups")
                )
                .scalars()
                .first()
            )
            assert exercise is not None

    def test_update_exercise_others_forbidden(
        self, client, exercise_definition, second_user, app
    ):
        """Test user cannot update another user's exercise."""
        with app.app_context():
            with client.session_transaction() as sess:
                sess["_user_id"] = str(second_user.id)
                sess["_fresh"] = True

            exercise = (
                db.session.execute(db.select(ExerciseDefinition)).scalars().first()
            )
            response = client.post(
                url_for("main.update_exercise", exercises_id=exercise.id),
                data={
                    "title": "Hacked Title",
                    "description": "Hacked description",
                },
            )
            assert response.status_code == 403

    def test_delete_exercise_own(self, auth_client, exercise_definition, app):
        """Test user can archive their own exercise."""
        with app.app_context():
            exercise = (
                db.session.execute(db.select(ExerciseDefinition)).scalars().first()
            )
            exercise_id = exercise.id
            response = auth_client.post(
                url_for("main.delete_exercise", exercises_id=exercise_id),
                follow_redirects=True,
            )
            assert response.status_code == 200

            # Verify exercise was archived, not deleted
            exercise = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(id=exercise_id)
                )
                .scalars()
                .first()
            )
            assert exercise is not None
            assert exercise.archived is True

    def test_delete_exercise_others_forbidden(
        self, client, exercise_definition, second_user, app
    ):
        """Test user cannot delete another user's exercise."""
        with app.app_context():
            with client.session_transaction() as sess:
                sess["_user_id"] = str(second_user.id)
                sess["_fresh"] = True

            exercise = (
                db.session.execute(db.select(ExerciseDefinition)).scalars().first()
            )
            response = client.post(
                url_for("main.delete_exercise", exercises_id=exercise.id),
            )
            assert response.status_code == 403

    def test_archived_exercise_not_in_add_workout(
        self, auth_client, exercise_definition, app
    ):
        """Test archived exercises don't appear in add_workout dropdown."""
        with app.app_context():
            exercise = (
                db.session.execute(db.select(ExerciseDefinition)).scalars().first()
            )
            exercise.archived = True
            db.session.commit()

            response = auth_client.get(url_for("main.add_workout"))
            assert response.status_code == 200
            assert exercise.title.encode() not in response.data

    def test_archived_exercise_not_in_exercises_list(
        self, auth_client, exercise_definition, app
    ):
        """Test archived exercises don't appear in exercises list."""
        with app.app_context():
            exercise = (
                db.session.execute(db.select(ExerciseDefinition)).scalars().first()
            )
            exercise.archived = True
            db.session.commit()

            response = auth_client.get(url_for("main.all_exercises"))
            assert response.status_code == 200
            assert exercise.title.encode() not in response.data

    def test_archived_exercise_keeps_workout_reference(self, auth_client, workout, app):
        """Test archiving an exercise definition preserves workout references."""
        with app.app_context():
            exercise_def = (
                db.session.execute(db.select(ExerciseDefinition)).scalars().first()
            )
            exercise_instance = (
                db.session.execute(db.select(Exercise)).scalars().first()
            )
            assert exercise_instance.exercise_definition_id == exercise_def.id

            # Archive the definition
            exercise_def.archived = True
            db.session.commit()

            # Exercise instance still references the definition
            exercise_instance = (
                db.session.execute(db.select(Exercise)).scalars().first()
            )
            assert exercise_instance is not None
            assert exercise_instance.exercise_definition_id == exercise_def.id

    def test_copy_exercise(self, auth_client, second_user, app):
        """Test copying another user's exercise definition."""
        with app.app_context():
            # Create exercise owned by second_user
            ex = ExerciseDefinition(
                title="Squats",
                description="Bodyweight squats",
                user_id=second_user.id,
            )
            db.session.add(ex)
            db.session.commit()

            response = auth_client.post(
                url_for("main.copy_exercise", exercises_id=ex.id)
            )
            assert response.status_code == 200
            data = response.get_json()
            assert data["success"] is True
            assert "Kopie" in data["title"]

    def test_copy_exercise_duplicate_title(self, auth_client, second_user, app):
        """Test copying exercise when '(Kopie)' title already exists."""
        with app.app_context():
            # Create exercise owned by second_user
            ex = ExerciseDefinition(
                title="Dips",
                description="Parallel bar dips",
                user_id=second_user.id,
            )
            db.session.add(ex)
            # Create existing copy with "(Kopie)" title owned by current user
            user = (
                db.session.execute(db.select(User).filter_by(username="testuser"))
                .scalars()
                .first()
            )
            existing_copy = ExerciseDefinition(
                title="Dips (Kopie)",
                description="Parallel bar dips",
                user_id=user.id,
            )
            db.session.add(existing_copy)
            db.session.commit()

            response = auth_client.post(
                url_for("main.copy_exercise", exercises_id=ex.id)
            )
            assert response.status_code == 200
            data = response.get_json()
            assert data["success"] is True
            assert "Kopie 2" in data["title"]

    def test_copy_exercise_not_found(self, auth_client, app):
        """Test copying a non-existent exercise returns 404."""
        with app.app_context():
            response = auth_client.post(
                url_for("main.copy_exercise", exercises_id=99999)
            )
            assert response.status_code == 404

    def test_copy_own_exercise_fails(self, auth_client, exercise_definition, app):
        """Test copying own exercise returns 400 error."""
        with app.app_context():
            ex = db.session.execute(db.select(ExerciseDefinition)).scalars().first()
            response = auth_client.post(
                url_for("main.copy_exercise", exercises_id=ex.id)
            )
            assert response.status_code == 400
            data = response.get_json()
            assert "error" in data

    def test_update_exercise_not_found(self, auth_client, app):
        """Test updating a non-existent exercise returns 404."""
        with app.app_context():
            response = auth_client.get(
                url_for("main.update_exercise", exercises_id=99999)
            )
            assert response.status_code == 404

    def test_delete_exercise_not_found(self, auth_client, app):
        """Test deleting a non-existent exercise returns 404."""
        with app.app_context():
            response = auth_client.post(
                url_for("main.delete_exercise", exercises_id=99999)
            )
            assert response.status_code == 404

    def test_add_exercise_with_reps_counting_type(self, auth_client, app):
        """Test creating exercise with reps counting type."""
        with app.app_context():
            response = auth_client.post(
                url_for("main.add_exercise"),
                data={
                    "title": "Pull-ups",
                    "description": "Standard pull-ups",
                    "counting_type": "reps",
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            exercise = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Pull-ups")
                )
                .scalars()
                .first()
            )
            assert exercise is not None
            assert exercise.counting_type == "reps"

    def test_add_exercise_with_duration_counting_type(self, auth_client, app):
        """Test creating exercise with duration counting type."""
        with app.app_context():
            response = auth_client.post(
                url_for("main.add_exercise"),
                data={
                    "title": "Plank",
                    "description": "Hold a plank position",
                    "counting_type": "duration",
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            exercise = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Plank")
                )
                .scalars()
                .first()
            )
            assert exercise is not None
            assert exercise.counting_type == "duration"

    def test_update_exercise_counting_type(self, auth_client, exercise_definition, app):
        """Test updating exercise counting_type from reps to duration."""
        with app.app_context():
            exercise = (
                db.session.execute(db.select(ExerciseDefinition)).scalars().first()
            )
            assert exercise.counting_type == "reps"

            response = auth_client.post(
                url_for("main.update_exercise", exercises_id=exercise.id),
                data={
                    "title": exercise.title,
                    "description": exercise.description,
                    "counting_type": "duration",
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            exercise = (
                db.session.execute(db.select(ExerciseDefinition)).scalars().first()
            )
            assert exercise.counting_type == "duration"

    def test_update_exercise_preserves_counting_type_on_get(
        self, auth_client, app, user
    ):
        """Test that update exercise form pre-fills counting_type on GET."""
        with app.app_context():
            ex = ExerciseDefinition(
                title="L-Sit",
                description="L-Sit hold",
                user_id=user.id,
                counting_type="duration",
            )
            db.session.add(ex)
            db.session.commit()

            response = auth_client.get(
                url_for("main.update_exercise", exercises_id=ex.id)
            )
            assert response.status_code == 200
            # The duration radio button should be checked
            html = response.get_data(as_text=True)
            assert "checked" in html
            assert 'value="duration"' in html

    def test_copy_exercise_preserves_counting_type(self, auth_client, second_user, app):
        """Test copying exercise preserves counting_type in response."""
        with app.app_context():
            ex = ExerciseDefinition(
                title="Plank",
                description="Hold a plank",
                user_id=second_user.id,
                counting_type="duration",
            )
            db.session.add(ex)
            db.session.commit()

            response = auth_client.post(
                url_for("main.copy_exercise", exercises_id=ex.id)
            )
            assert response.status_code == 200
            data = response.get_json()
            assert data["success"] is True
            assert data["counting_type"] == "duration"

            # Verify the copied exercise has duration counting_type
            user = (
                db.session.execute(db.select(User).filter_by(username="testuser"))
                .scalars()
                .first()
            )
            copied = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(
                        user_id=user.id, counting_type="duration"
                    )
                )
                .scalars()
                .first()
            )
            assert copied is not None

    def test_add_exercise_form_shows_counting_type(self, auth_client, app):
        """Test add exercise page shows counting_type radio buttons."""
        with app.app_context():
            response = auth_client.get(url_for("main.add_exercise"))
            assert response.status_code == 200
            assert b"counting_type" in response.data
            assert b"reps" in response.data
            assert b"duration" in response.data


class TestWorkoutWithDuration:
    """Tests for workout creation and display with duration exercises."""

    def test_add_workout_with_duration_exercise(
        self, auth_client, app, duration_exercise_definition
    ):
        """Test creating a workout with a duration-based exercise."""
        with app.app_context():
            exercise_def = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Plank")
                )
                .scalars()
                .first()
            )
            response = auth_client.post(
                url_for("main.add_workout"),
                data={
                    "wtitle": "Duration Test Workout",
                    "exercise_count": "1",
                    "exercise1": str(exercise_def.id),
                    "progression1": ["Standard"],
                    "duration1": ["01:30"],
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            workout = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Duration Test Workout")
                )
                .scalars()
                .first()
            )
            assert workout is not None

            exercise = (
                db.session.execute(db.select(Exercise).filter_by(workout_id=workout.id))
                .scalars()
                .first()
            )
            work_set = (
                db.session.execute(db.select(Set).filter_by(exercise_id=exercise.id))
                .scalars()
                .first()
            )
            assert work_set.duration == 90
            assert work_set.reps is None

    def test_add_workout_with_reps_exercise(
        self, auth_client, app, exercise_definition
    ):
        """Test creating a workout with a reps-based exercise still works."""
        with app.app_context():
            exercise_def = (
                db.session.execute(db.select(ExerciseDefinition)).scalars().first()
            )
            response = auth_client.post(
                url_for("main.add_workout"),
                data={
                    "wtitle": "Reps Test Workout",
                    "exercise_count": "1",
                    "exercise1": str(exercise_def.id),
                    "progression1": ["Beginner"],
                    "reps1": ["12"],
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            workout = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Reps Test Workout")
                )
                .scalars()
                .first()
            )
            assert workout is not None

            exercise = (
                db.session.execute(db.select(Exercise).filter_by(workout_id=workout.id))
                .scalars()
                .first()
            )
            work_set = (
                db.session.execute(db.select(Set).filter_by(exercise_id=exercise.id))
                .scalars()
                .first()
            )
            assert work_set.reps == 12
            assert work_set.duration is None

    def test_add_workout_duration_multiple_sets(
        self, auth_client, app, duration_exercise_definition
    ):
        """Test creating a workout with multiple duration sets."""
        with app.app_context():
            exercise_def = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Plank")
                )
                .scalars()
                .first()
            )
            response = auth_client.post(
                url_for("main.add_workout"),
                data={
                    "wtitle": "Multi Set Duration",
                    "exercise_count": "1",
                    "exercise1": str(exercise_def.id),
                    "progression1": ["Easy", "Hard"],
                    "duration1": ["00:30", "01:00"],
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            workout = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Multi Set Duration")
                )
                .scalars()
                .first()
            )
            assert workout is not None

            exercise = (
                db.session.execute(db.select(Exercise).filter_by(workout_id=workout.id))
                .scalars()
                .first()
            )
            sets = (
                db.session.execute(
                    db.select(Set)
                    .filter_by(exercise_id=exercise.id)
                    .order_by(Set.set_order)
                )
                .scalars()
                .all()
            )
            assert len(sets) == 2
            assert sets[0].duration == 30
            assert sets[1].duration == 60

    def test_workout_detail_shows_duration(self, auth_client, duration_workout, app):
        """Test workout detail page displays duration instead of reps."""
        with app.app_context():
            workout = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Duration Workout")
                )
                .scalars()
                .first()
            )
            response = auth_client.get(url_for("main.workout", workout_id=workout.id))
            assert response.status_code == 200
            assert b"Dauer:" in response.data
            assert b"01:30" in response.data
            # Should NOT show "Reps:" for a duration exercise
            assert b"Reps:" not in response.data

    def test_workout_detail_shows_reps(self, auth_client, workout, app):
        """Test workout detail page displays reps for reps-based exercises."""
        with app.app_context():
            workout = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Morning Workout")
                )
                .scalars()
                .first()
            )
            response = auth_client.get(url_for("main.workout", workout_id=workout.id))
            assert response.status_code == 200
            assert b"Reps:" in response.data
            # Should NOT show "Dauer:" for a reps exercise
            assert b"Dauer:" not in response.data

    def test_add_workout_page_shows_counting_type_data(
        self, auth_client, app, duration_exercise_definition
    ):
        """Test add workout page includes counting-type data attribute on options."""
        with app.app_context():
            response = auth_client.get(url_for("main.add_workout"))
            assert response.status_code == 200
            assert b"data-counting-type" in response.data


class TestFollowRoutes:
    """Tests for follow/unfollow routes."""

    def test_follow_user(self, auth_client, second_user, app):
        """Test following another user."""
        with app.app_context():
            response = auth_client.get(
                url_for("main.follow", username="seconduser"),
                follow_redirects=True,
            )
            assert response.status_code == 200

            # Verify follow relationship
            user = (
                db.session.execute(db.select(User).filter_by(username="testuser"))
                .scalars()
                .first()
            )
            second = (
                db.session.execute(db.select(User).filter_by(username="seconduser"))
                .scalars()
                .first()
            )
            assert user.is_following(second) is True

    def test_unfollow_user(self, auth_client, second_user, app):
        """Test unfollowing a user."""
        with app.app_context():
            # First follow
            user = (
                db.session.execute(db.select(User).filter_by(username="testuser"))
                .scalars()
                .first()
            )
            second = (
                db.session.execute(db.select(User).filter_by(username="seconduser"))
                .scalars()
                .first()
            )
            user.follow(second)
            db.session.commit()

            response = auth_client.get(
                url_for("main.unfollow", username="seconduser"),
                follow_redirects=True,
            )
            assert response.status_code == 200

            # Verify unfollow
            user = (
                db.session.execute(db.select(User).filter_by(username="testuser"))
                .scalars()
                .first()
            )
            second = (
                db.session.execute(db.select(User).filter_by(username="seconduser"))
                .scalars()
                .first()
            )
            assert user.is_following(second) is False

    def test_follow_self_fails(self, auth_client, app):
        """Test user cannot follow themselves."""
        with app.app_context():
            response = auth_client.get(
                url_for("main.follow", username="testuser"),
                follow_redirects=True,
            )
            assert response.status_code == 200
            # Should show error message (in German)
            assert "selber" in response.get_data(as_text=True)

    def test_follow_nonexistent_user(self, auth_client, app):
        """Test following a non-existent user."""
        with app.app_context():
            response = auth_client.get(
                url_for("main.follow", username="nonexistent"),
                follow_redirects=True,
            )
            assert response.status_code == 200
            # Should show not found message
            assert "nicht gefunden" in response.get_data(as_text=True)

    def test_unfollow_nonexistent_user(self, auth_client, app):
        """Test unfollowing a non-existent user."""
        with app.app_context():
            response = auth_client.get(
                url_for("main.unfollow", username="nonexistent"),
                follow_redirects=True,
            )
            assert response.status_code == 200
            assert "nicht gefunden" in response.get_data(as_text=True)

    def test_unfollow_self_fails(self, auth_client, app):
        """Test user cannot unfollow themselves."""
        with app.app_context():
            response = auth_client.get(
                url_for("main.unfollow", username="testuser"),
                follow_redirects=True,
            )
            assert response.status_code == 200
            assert "selber" in response.get_data(as_text=True)


class TestUserProfileRoute:
    """Tests for user profile route."""

    def test_user_profile_renders(self, auth_client, app):
        """Test user profile page renders."""
        with app.app_context():
            response = auth_client.get(url_for("main.user", username="testuser"))
            assert response.status_code == 200
            assert b"testuser" in response.data

    def test_user_profile_not_found(self, auth_client, app):
        """Test 404 for non-existent user."""
        with app.app_context():
            response = auth_client.get(url_for("main.user", username="nonexistent"))
            assert response.status_code == 404


class TestMessageRoutes:
    """Tests for messaging routes."""

    def test_messages_page_renders(self, auth_client, app):
        """Test messages page renders."""
        with app.app_context():
            response = auth_client.get(url_for("main.messages"))
            assert response.status_code == 200

    def test_send_message_page_renders(self, auth_client, second_user, app):
        """Test send message page renders."""
        with app.app_context():
            response = auth_client.get(
                url_for("main.send_message", recipient="seconduser")
            )
            assert response.status_code == 200

    def test_send_message(self, auth_client, second_user, app):
        """Test sending a message."""
        with app.app_context():
            response = auth_client.post(
                url_for("main.send_message", recipient="seconduser"),
                data={"message": "Hello, second user!"},
                follow_redirects=True,
            )
            assert response.status_code == 200

            # Verify message was sent
            message = (
                db.session.execute(
                    db.select(Message).filter_by(body="Hello, second user!")
                )
                .scalars()
                .first()
            )
            assert message is not None

    def test_send_message_to_nonexistent_user(self, auth_client, app):
        """Test sending message to non-existent user."""
        with app.app_context():
            response = auth_client.get(
                url_for("main.send_message", recipient="nonexistent")
            )
            assert response.status_code == 404


class TestExploreRoute:
    """Tests for the explore route."""

    def test_explore_page_renders(self, auth_client, app):
        """Test explore page renders."""
        with app.app_context():
            response = auth_client.get(url_for("main.explore"))
            assert response.status_code == 200

    def test_explore_shows_other_users_workouts(self, auth_client, second_user, app):
        """Test explore shows workouts from other users."""
        with app.app_context():
            # Create workout for second user
            workout = Workout(
                title="Second User Workout",
                user_id=second_user.id,
            )
            db.session.add(workout)
            db.session.commit()

            response = auth_client.get(url_for("main.explore"))
            assert response.status_code == 200
            assert b"Second User Workout" in response.data


class TestNotificationsRoute:
    """Tests for the notifications route."""

    def test_notifications_returns_json(self, auth_client, app):
        """Test notifications endpoint returns JSON."""
        with app.app_context():
            response = auth_client.get(url_for("main.notifications"))
            assert response.status_code == 200
            assert response.content_type == "application/json"

    def test_notifications_with_since_param(self, auth_client, app):
        """Test notifications with since parameter."""
        with app.app_context():
            response = auth_client.get(url_for("main.notifications") + "?since=0")
            assert response.status_code == 200
            data = response.get_json()
            assert isinstance(data, list)


class TestProgressionLevels:
    """Integration tests for progression levels feature."""

    def test_add_exercise_with_progression_levels(self, auth_client, app):
        """Test creating an exercise with progression levels stores them in DB."""
        with app.app_context():
            response = auth_client.post(
                url_for("main.add_exercise"),
                data={
                    "title": "Push-ups",
                    "description": "Standard push-ups",
                    "counting_type": "reps",
                    "progressions": "Knie-Liegestütze\nNormale Liegestütze\nEnge Liegestütze",
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            ex = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
            assert ex is not None
            levels = ex.progression_levels.all()
            assert len(levels) == 3
            assert levels[0].name == "Knie-Liegestütze"
            assert levels[1].name == "Normale Liegestütze"
            assert levels[2].name == "Enge Liegestütze"
            assert levels[0].level_order == 1

    def test_add_exercise_without_progression_levels(self, auth_client, app):
        """Test creating an exercise without progression levels works fine."""
        with app.app_context():
            response = auth_client.post(
                url_for("main.add_exercise"),
                data={
                    "title": "Plank",
                    "counting_type": "duration",
                    "progressions": "",
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            ex = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Plank")
                )
                .scalars()
                .first()
            )
            assert ex is not None
            assert ex.progression_levels.count() == 0

    def test_add_exercise_without_description(self, auth_client, app):
        """Test creating an exercise without a description succeeds."""
        with app.app_context():
            response = auth_client.post(
                url_for("main.add_exercise"),
                data={
                    "title": "No Desc Exercise",
                    "counting_type": "reps",
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            ex = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="No Desc Exercise")
                )
                .scalars()
                .first()
            )
            assert ex is not None
            assert ex.description is None

    def test_update_exercise_replaces_progression_levels(
        self, auth_client, exercise_definition, app
    ):
        """Test that updating an exercise replaces all existing progression levels."""
        with app.app_context():
            ex = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )

            # First, add some initial levels
            db.session.add(
                ProgressionLevel(
                    exercise_definition_id=ex.id, name="Easy", level_order=1
                )
            )
            db.session.add(
                ProgressionLevel(
                    exercise_definition_id=ex.id, name="Hard", level_order=2
                )
            )
            db.session.commit()
            assert ex.progression_levels.count() == 2

            # Update with different levels
            response = auth_client.post(
                url_for("main.update_exercise", exercises_id=ex.id),
                data={
                    "title": "Push-ups",
                    "description": "Updated description",
                    "counting_type": "reps",
                    "progressions": "Anfänger\nFortgeschrittener",
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            ex = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
            levels = ex.progression_levels.all()
            assert len(levels) == 2
            assert levels[0].name == "Anfänger"
            assert levels[1].name == "Fortgeschrittener"

    def test_update_exercise_prefills_existing_progressions(
        self, auth_client, exercise_definition, app
    ):
        """Test that the update exercise GET request pre-fills progression levels."""
        with app.app_context():
            ex = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
            db.session.add(
                ProgressionLevel(
                    exercise_definition_id=ex.id, name="Level 1", level_order=1
                )
            )
            db.session.add(
                ProgressionLevel(
                    exercise_definition_id=ex.id, name="Level 2", level_order=2
                )
            )
            db.session.commit()

            response = auth_client.get(
                url_for("main.update_exercise", exercises_id=ex.id)
            )
            assert response.status_code == 200
            html = response.get_data(as_text=True)
            assert "Level 1" in html
            assert "Level 2" in html

    def test_copy_exercise_copies_progression_levels(
        self, auth_client, second_user, app
    ):
        """Test that copying an exercise also copies its progression levels."""
        with app.app_context():
            ex = ExerciseDefinition(
                title="Squats",
                description="Bodyweight squats",
                user_id=second_user.id,
            )
            db.session.add(ex)
            db.session.flush()
            db.session.add(
                ProgressionLevel(
                    exercise_definition_id=ex.id, name="Shallow", level_order=1
                )
            )
            db.session.add(
                ProgressionLevel(
                    exercise_definition_id=ex.id, name="Deep", level_order=2
                )
            )
            db.session.commit()

            response = auth_client.post(
                url_for("main.copy_exercise", exercises_id=ex.id)
            )
            assert response.status_code == 200
            data = response.get_json()
            assert data["success"] is True
            assert data["progression_levels"] == ["Shallow", "Deep"]

            # Verify in DB
            user = (
                db.session.execute(db.select(User).filter_by(username="testuser"))
                .scalars()
                .first()
            )
            copied = (
                db.session.execute(
                    db.select(ExerciseDefinition).where(
                        ExerciseDefinition.user_id == user.id,
                        ExerciseDefinition.title.contains("Squats"),
                    )
                )
                .scalars()
                .first()
            )
            assert copied is not None
            copied_levels = copied.progression_levels.all()
            assert len(copied_levels) == 2
            assert copied_levels[0].name == "Shallow"
            assert copied_levels[1].name == "Deep"

    def test_add_workout_page_includes_progression_map(
        self, auth_client, exercise_definition, app
    ):
        """Test that add_workout GET response includes progressionMap JSON."""
        with app.app_context():
            ex = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
            db.session.add(
                ProgressionLevel(
                    exercise_definition_id=ex.id, name="Easy", level_order=1
                )
            )
            db.session.add(
                ProgressionLevel(
                    exercise_definition_id=ex.id, name="Hard", level_order=2
                )
            )
            db.session.commit()

            response = auth_client.get(url_for("main.add_workout"))
            assert response.status_code == 200
            html = response.get_data(as_text=True)
            assert "progressionMap" in html
            assert "Easy" in html
            assert "Hard" in html

    def test_add_workout_saves_progression_from_dropdown(
        self, auth_client, exercise_definition, app
    ):
        """Test that a workout is saved correctly with a progression value selected from a dropdown."""
        with app.app_context():
            ex = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
            db.session.add(
                ProgressionLevel(
                    exercise_definition_id=ex.id, name="Knee Push-ups", level_order=1
                )
            )
            db.session.commit()

            response = auth_client.post(
                url_for("main.add_workout"),
                data={
                    "wtitle": "Progression Dropdown Test",
                    "exercise_count": "1",
                    "exercise1": str(ex.id),
                    "progression1": ["Knee Push-ups"],
                    "reps1": ["10"],
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            workout = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Progression Dropdown Test")
                )
                .scalars()
                .first()
            )
            assert workout is not None
            exercise_inst = (
                db.session.execute(db.select(Exercise).filter_by(workout_id=workout.id))
                .scalars()
                .first()
            )
            work_set = (
                db.session.execute(
                    db.select(Set).filter_by(exercise_id=exercise_inst.id)
                )
                .scalars()
                .first()
            )
            assert work_set.progression == "Knee Push-ups"

    def test_exercise_detail_shows_progression_levels(
        self, auth_client, exercise_definition, app
    ):
        """Test that the exercise detail page shows progression levels."""
        with app.app_context():
            ex = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
            db.session.add(
                ProgressionLevel(
                    exercise_definition_id=ex.id, name="Easy", level_order=1
                )
            )
            db.session.add(
                ProgressionLevel(
                    exercise_definition_id=ex.id, name="Medium", level_order=2
                )
            )
            db.session.commit()

            response = auth_client.get(url_for("main.exercise", exercises_id=ex.id))
            assert response.status_code == 200
            html = response.get_data(as_text=True)
            assert "Progressionsstufen" in html
            assert "Easy" in html
            assert "Medium" in html


class TestEditWorkout:
    """Integration tests for the edit workout feature."""

    def test_edit_workout_page_renders(self, auth_client, workout, app):
        """Test that the edit workout GET page renders successfully."""
        with app.app_context():
            w = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Morning Workout")
                )
                .scalars()
                .first()
            )
            response = auth_client.get(url_for("main.edit_workout", workout_id=w.id))
            assert response.status_code == 200

    def test_edit_workout_page_prefills_title(self, auth_client, workout, app):
        """Test that the edit workout page pre-fills the workout title."""
        with app.app_context():
            w = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Morning Workout")
                )
                .scalars()
                .first()
            )
            response = auth_client.get(url_for("main.edit_workout", workout_id=w.id))
            html = response.get_data(as_text=True)
            assert "Morning Workout" in html
            assert 'value="Morning Workout"' in html

    def test_edit_workout_page_prefills_sets(self, auth_client, workout, app):
        """Test that the edit page includes the existing set data in the prefill JSON."""
        with app.app_context():
            w = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Morning Workout")
                )
                .scalars()
                .first()
            )
            response = auth_client.get(url_for("main.edit_workout", workout_id=w.id))
            html = response.get_data(as_text=True)
            # prefill JSON should appear in the page
            assert "prefill" in html
            assert '"reps": 10' in html
            assert '"progression": "Standard"' in html

    def test_edit_workout_requires_login(self, client, workout, app):
        """Test that the edit workout page requires authentication."""
        with app.app_context():
            w = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Morning Workout")
                )
                .scalars()
                .first()
            )
            response = client.get(
                url_for("main.edit_workout", workout_id=w.id),
                follow_redirects=False,
            )
            assert response.status_code == 302

    def test_edit_workout_requires_confirmation(
        self, unconfirmed_auth_client, workout, app
    ):
        """Test that an unconfirmed user is redirected away from edit workout."""
        with app.app_context():
            w = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Morning Workout")
                )
                .scalars()
                .first()
            )
            response = unconfirmed_auth_client.get(
                url_for("main.edit_workout", workout_id=w.id),
                follow_redirects=False,
            )
            assert response.status_code == 302

    def test_edit_workout_forbidden_for_other_user(
        self, client, workout, second_user, app
    ):
        """Test that another user cannot edit someone else's workout."""
        with app.app_context():
            with client.session_transaction() as sess:
                sess["_user_id"] = str(second_user.id)
                sess["_fresh"] = True

            w = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Morning Workout")
                )
                .scalars()
                .first()
            )
            response = client.get(url_for("main.edit_workout", workout_id=w.id))
            assert response.status_code == 403

    def test_edit_workout_not_found(self, auth_client, app):
        """Test that editing a non-existent workout returns 404."""
        with app.app_context():
            response = auth_client.get(url_for("main.edit_workout", workout_id=99999))
            assert response.status_code == 404

    def test_edit_workout_updates_title(
        self, auth_client, workout, exercise_definition, app
    ):
        """Test that POSTing to edit_workout updates the workout title."""
        with app.app_context():
            w = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Morning Workout")
                )
                .scalars()
                .first()
            )
            ex_def = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
            response = auth_client.post(
                url_for("main.edit_workout", workout_id=w.id),
                data={
                    "wtitle": "Evening Workout",
                    "exercise_count": "1",
                    "exercise1": str(ex_def.id),
                    "progression1": ["Standard"],
                    "reps1": ["10"],
                },
                follow_redirects=True,
            )
            assert response.status_code == 200
            w = (
                db.session.execute(db.select(Workout).filter_by(id=w.id))
                .scalars()
                .first()
            )
            assert w.title == "Evening Workout"

    def test_edit_workout_updates_reps(
        self, auth_client, workout, exercise_definition, app
    ):
        """Test that editing a workout updates the set reps in the database."""
        with app.app_context():
            w = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Morning Workout")
                )
                .scalars()
                .first()
            )
            ex_def = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
            response = auth_client.post(
                url_for("main.edit_workout", workout_id=w.id),
                data={
                    "wtitle": "Morning Workout",
                    "exercise_count": "1",
                    "exercise1": str(ex_def.id),
                    "progression1": ["Standard"],
                    "reps1": ["15"],
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            ex = (
                db.session.execute(db.select(Exercise).filter_by(workout_id=w.id))
                .scalars()
                .first()
            )
            work_set = (
                db.session.execute(db.select(Set).filter_by(exercise_id=ex.id))
                .scalars()
                .first()
            )
            assert work_set.reps == 15

    def test_edit_workout_updates_progression(
        self, auth_client, workout, exercise_definition, app
    ):
        """Test that editing a workout updates the set progression value."""
        with app.app_context():
            w = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Morning Workout")
                )
                .scalars()
                .first()
            )
            ex_def = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
            response = auth_client.post(
                url_for("main.edit_workout", workout_id=w.id),
                data={
                    "wtitle": "Morning Workout",
                    "exercise_count": "1",
                    "exercise1": str(ex_def.id),
                    "progression1": ["Advanced"],
                    "reps1": ["10"],
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            ex = (
                db.session.execute(db.select(Exercise).filter_by(workout_id=w.id))
                .scalars()
                .first()
            )
            work_set = (
                db.session.execute(db.select(Set).filter_by(exercise_id=ex.id))
                .scalars()
                .first()
            )
            assert work_set.progression == "Advanced"

    def test_edit_workout_updates_duration(self, auth_client, duration_workout, app):
        """Test that editing a duration-based workout updates set duration."""
        with app.app_context():
            w = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Duration Workout")
                )
                .scalars()
                .first()
            )
            ex_def = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Plank")
                )
                .scalars()
                .first()
            )
            response = auth_client.post(
                url_for("main.edit_workout", workout_id=w.id),
                data={
                    "wtitle": "Duration Workout",
                    "exercise_count": "1",
                    "exercise1": str(ex_def.id),
                    "progression1": ["Standard"],
                    "duration1": ["02:00"],
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            ex = (
                db.session.execute(db.select(Exercise).filter_by(workout_id=w.id))
                .scalars()
                .first()
            )
            work_set = (
                db.session.execute(db.select(Set).filter_by(exercise_id=ex.id))
                .scalars()
                .first()
            )
            assert work_set.duration == 120

    def test_edit_workout_can_add_set(
        self, auth_client, workout, exercise_definition, app
    ):
        """Test that editing a workout can add an extra set."""
        with app.app_context():
            w = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Morning Workout")
                )
                .scalars()
                .first()
            )
            ex_def = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
            response = auth_client.post(
                url_for("main.edit_workout", workout_id=w.id),
                data={
                    "wtitle": "Morning Workout",
                    "exercise_count": "1",
                    "exercise1": str(ex_def.id),
                    "progression1": ["Standard", "Standard"],
                    "reps1": ["10", "8"],
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            ex = (
                db.session.execute(db.select(Exercise).filter_by(workout_id=w.id))
                .scalars()
                .first()
            )
            assert (
                db.session.execute(
                    db.select(func.count())
                    .select_from(Set)
                    .filter_by(exercise_id=ex.id)
                ).scalar()
                == 2
            )

    def test_edit_workout_can_remove_set(
        self, auth_client, workout_with_two_exercises, app
    ):
        """Test that editing a workout can reduce sets (remove one set)."""
        with app.app_context():
            w = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Two Exercise Workout")
                )
                .scalars()
                .first()
            )
            ex = (
                db.session.execute(
                    db.select(Exercise).filter_by(workout_id=w.id, exercise_order=1)
                )
                .scalars()
                .first()
            )
            ex_def = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(
                        id=ex.exercise_definition_id
                    )
                )
                .scalars()
                .first()
            )

            # Originally 2 sets; submit only 1
            response = auth_client.post(
                url_for("main.edit_workout", workout_id=w.id),
                data={
                    "wtitle": "Two Exercise Workout",
                    "exercise_count": "1",
                    "exercise1": str(ex_def.id),
                    "progression1": ["Standard"],
                    "reps1": ["10"],
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            ex = (
                db.session.execute(db.select(Exercise).filter_by(workout_id=w.id))
                .scalars()
                .first()
            )
            assert (
                db.session.execute(
                    db.select(func.count())
                    .select_from(Set)
                    .filter_by(exercise_id=ex.id)
                ).scalar()
                == 1
            )

    def test_edit_workout_can_add_exercise(
        self, auth_client, workout, exercise_definition, app
    ):
        """Test that editing a workout can add a second exercise."""
        with app.app_context():
            w = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Morning Workout")
                )
                .scalars()
                .first()
            )
            ex_def = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
            response = auth_client.post(
                url_for("main.edit_workout", workout_id=w.id),
                data={
                    "wtitle": "Morning Workout",
                    "exercise_count": "2",
                    "exercise1": str(ex_def.id),
                    "progression1": ["Standard"],
                    "reps1": ["10"],
                    "exercise2": str(ex_def.id),
                    "progression2": ["Standard"],
                    "reps2": ["8"],
                },
                follow_redirects=True,
            )
            assert response.status_code == 200
            assert (
                db.session.execute(
                    db.select(func.count())
                    .select_from(Exercise)
                    .filter_by(workout_id=w.id)
                ).scalar()
                == 2
            )

    def test_edit_workout_can_remove_exercise(
        self, auth_client, workout_with_two_exercises, app
    ):
        """Test that editing a workout can remove one of two exercises."""
        with app.app_context():
            w = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Two Exercise Workout")
                )
                .scalars()
                .first()
            )
            assert (
                db.session.execute(
                    db.select(func.count())
                    .select_from(Exercise)
                    .filter_by(workout_id=w.id)
                ).scalar()
                == 2
            )

            ex_def = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Pull-ups")
                )
                .scalars()
                .first()
            )
            response = auth_client.post(
                url_for("main.edit_workout", workout_id=w.id),
                data={
                    "wtitle": "Two Exercise Workout",
                    "exercise_count": "1",
                    "exercise1": str(ex_def.id),
                    "progression1": ["Standard"],
                    "reps1": ["10"],
                },
                follow_redirects=True,
            )
            assert response.status_code == 200
            assert (
                db.session.execute(
                    db.select(func.count())
                    .select_from(Exercise)
                    .filter_by(workout_id=w.id)
                ).scalar()
                == 1
            )

    def test_edit_workout_invalid_exercise_count(self, auth_client, workout, app):
        """Test that a non-numeric exercise_count causes a flash error and redirect."""
        with app.app_context():
            w = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Morning Workout")
                )
                .scalars()
                .first()
            )
            response = auth_client.post(
                url_for("main.edit_workout", workout_id=w.id),
                data={"exercise_count": "abc", "wtitle": "Test"},
                follow_redirects=True,
            )
            assert response.status_code == 200
            assert "Ung\u00fcltige Formulardaten" in response.get_data(as_text=True)

    def test_edit_workout_invalid_exercise_id(self, auth_client, workout, app):
        """Test that a nonexistent exercise definition ID causes a flash error."""
        with app.app_context():
            w = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Morning Workout")
                )
                .scalars()
                .first()
            )
            response = auth_client.post(
                url_for("main.edit_workout", workout_id=w.id),
                data={
                    "exercise_count": "1",
                    "wtitle": "Test",
                    "exercise1": "99999",
                },
                follow_redirects=True,
            )
            assert response.status_code == 200
            assert "nicht gefunden" in response.get_data(as_text=True)

    def test_edit_workout_redirects_to_detail_on_success(
        self, auth_client, workout, exercise_definition, app
    ):
        """Test that a successful POST redirects to the workout detail page."""
        with app.app_context():
            w = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Morning Workout")
                )
                .scalars()
                .first()
            )
            ex_def = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
            response = auth_client.post(
                url_for("main.edit_workout", workout_id=w.id),
                data={
                    "wtitle": "Morning Workout",
                    "exercise_count": "1",
                    "exercise1": str(ex_def.id),
                    "progression1": ["Standard"],
                    "reps1": ["10"],
                },
                follow_redirects=False,
            )
            assert response.status_code == 302
            assert f"/workout/{w.id}" in response.headers["Location"]

    def test_edit_workout_button_shown_to_owner(self, auth_client, workout, app):
        """Test that the edit workout button appears on the detail page for the owner."""
        with app.app_context():
            w = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Morning Workout")
                )
                .scalars()
                .first()
            )
            response = auth_client.get(url_for("main.workout", workout_id=w.id))
            assert response.status_code == 200
            assert "Workout bearbeiten" in response.get_data(as_text=True)

    def test_edit_workout_button_hidden_from_other(
        self, client, workout, second_user, app
    ):
        """Test that the edit workout button is hidden for non-owners."""
        with app.app_context():
            with client.session_transaction() as sess:
                sess["_user_id"] = str(second_user.id)
                sess["_fresh"] = True

            w = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Morning Workout")
                )
                .scalars()
                .first()
            )
            response = client.get(url_for("main.workout", workout_id=w.id))
            assert response.status_code == 200
            assert "Workout bearbeiten" not in response.get_data(as_text=True)


class TestWorkoutTemplatesRoutes:
    """Tests for workout template routes."""

    # ── Template list ──────────────────────────────────────────────────────

    def test_templates_page_renders(self, auth_client, app):
        """GET /workout_templates returns 200."""
        with app.app_context():
            response = auth_client.get(url_for("main.workout_templates"))
            assert response.status_code == 200

    def test_templates_page_empty(self, auth_client, app):
        """Templates page renders correctly when there are no templates."""
        with app.app_context():
            response = auth_client.get(url_for("main.workout_templates"))
            assert response.status_code == 200
            assert "noch keine Vorlagen" in response.get_data(as_text=True)

    def test_templates_page_shows_own_templates(
        self, auth_client, workout_template, app
    ):
        """User's template title appears on the templates list page."""
        with app.app_context():
            response = auth_client.get(url_for("main.workout_templates"))
            assert response.status_code == 200
            assert b"My Template" in response.data

    # ── Create template ────────────────────────────────────────────────────

    def test_add_template_page_renders(self, auth_client, app):
        """GET /add_template returns 200."""
        with app.app_context():
            response = auth_client.get(url_for("main.add_template"))
            assert response.status_code == 200

    def test_add_template_creates_template(self, auth_client, exercise_definition, app):
        """POST /add_template creates a Workout with is_template=True."""
        with app.app_context():
            ex_def = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )

            response = auth_client.post(
                url_for("main.add_template"),
                data={
                    "wtitle": "New Template",
                    "exercise_count": "1",
                    "exercise1": str(ex_def.id),
                    "progression1": "Standard",
                    "reps1": "10",
                },
                follow_redirects=False,
            )
            assert response.status_code == 302

            template = (
                db.session.execute(db.select(Workout).filter_by(title="New Template"))
                .scalars()
                .first()
            )
            assert template is not None
            assert template.is_template is True
            assert template.exercises.count() == 1

    def test_add_template_requires_exercise(self, auth_client, app):
        """POST /add_template with exercise_count=0 flashes an error."""
        with app.app_context():
            response = auth_client.post(
                url_for("main.add_template"),
                data={"wtitle": "Bad Template", "exercise_count": "0"},
                follow_redirects=True,
            )
            assert response.status_code == 200
            assert "Mindestens eine" in response.get_data(as_text=True)

    def test_add_template_redirects_to_templates_on_success(
        self, auth_client, exercise_definition, app
    ):
        """Successful template creation redirects to the templates list."""
        with app.app_context():
            ex_def = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )

            response = auth_client.post(
                url_for("main.add_template"),
                data={
                    "wtitle": "Redirect Template",
                    "exercise_count": "1",
                    "exercise1": str(ex_def.id),
                    "progression1": "Standard",
                    "reps1": "5",
                },
                follow_redirects=True,
            )
            assert response.status_code == 200
            assert b"Redirect Template" in response.data

    # ── Edit template ──────────────────────────────────────────────────────

    def test_edit_template_page_renders_with_prefill(
        self, auth_client, workout_template, app
    ):
        """GET /workout_template/<id>/edit returns 200 and shows the template title."""
        with app.app_context():
            tmpl = (
                db.session.execute(db.select(Workout).filter_by(title="My Template"))
                .scalars()
                .first()
            )
            response = auth_client.get(
                url_for("main.edit_template", workout_id=tmpl.id)
            )
            assert response.status_code == 200
            assert b"My Template" in response.data

    def test_edit_template_saves_changes(
        self, auth_client, workout_template, exercise_definition, app
    ):
        """POST /workout_template/<id>/edit updates the template."""
        with app.app_context():
            tmpl = (
                db.session.execute(db.select(Workout).filter_by(title="My Template"))
                .scalars()
                .first()
            )
            ex_def = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )

            response = auth_client.post(
                url_for("main.edit_template", workout_id=tmpl.id),
                data={
                    "wtitle": "Updated Template",
                    "exercise_count": "1",
                    "exercise1": str(ex_def.id),
                    "progression1": "Advanced",
                    "reps1": "15",
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            updated = db.session.get(Workout, tmpl.id)
            assert updated.title == "Updated Template"
            sets = updated.exercises.first().sets.all()
            assert sets[0].reps == 15

    def test_edit_template_forbidden_for_other_user(
        self, client, workout_template, second_user, app
    ):
        """Non-owner gets 403 when trying to edit a template."""
        with app.app_context():
            with client.session_transaction() as sess:
                sess["_user_id"] = str(second_user.id)
                sess["_fresh"] = True

            tmpl = (
                db.session.execute(db.select(Workout).filter_by(title="My Template"))
                .scalars()
                .first()
            )
            response = client.get(url_for("main.edit_template", workout_id=tmpl.id))
            assert response.status_code == 403

    # ── Delete template ────────────────────────────────────────────────────

    def test_delete_template_removes_template(self, auth_client, workout_template, app):
        """POST /workout_template/<id>/delete removes the template."""
        with app.app_context():
            tmpl = (
                db.session.execute(db.select(Workout).filter_by(title="My Template"))
                .scalars()
                .first()
            )
            tmpl_id = tmpl.id

            response = auth_client.post(
                url_for("main.delete_template", workout_id=tmpl_id),
                follow_redirects=True,
            )
            assert response.status_code == 200
            assert db.session.get(Workout, tmpl_id) is None

    def test_delete_template_forbidden_for_other_user(
        self, client, workout_template, second_user, app
    ):
        """Non-owner gets 403 when trying to delete a template."""
        with app.app_context():
            with client.session_transaction() as sess:
                sess["_user_id"] = str(second_user.id)
                sess["_fresh"] = True

            tmpl = (
                db.session.execute(db.select(Workout).filter_by(title="My Template"))
                .scalars()
                .first()
            )
            response = client.post(url_for("main.delete_template", workout_id=tmpl.id))
            assert response.status_code == 403

    def test_delete_template_does_not_affect_regular_workouts(
        self, auth_client, workout_template, workout, app
    ):
        """Deleting a template does not affect regular workouts."""
        with app.app_context():
            tmpl = (
                db.session.execute(db.select(Workout).filter_by(title="My Template"))
                .scalars()
                .first()
            )
            regular = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Morning Workout")
                )
                .scalars()
                .first()
            )
            regular_id = regular.id

            auth_client.post(url_for("main.delete_template", workout_id=tmpl.id))

            assert db.session.get(Workout, regular_id) is not None

    # ── Use template ───────────────────────────────────────────────────────

    def test_use_template_redirects_to_add_workout(
        self, auth_client, workout_template, app
    ):
        """GET /workout_template/<id>/use redirects to add_workout with template_id."""
        with app.app_context():
            tmpl = (
                db.session.execute(db.select(Workout).filter_by(title="My Template"))
                .scalars()
                .first()
            )

            response = auth_client.get(
                url_for("main.use_template", workout_id=tmpl.id),
                follow_redirects=False,
            )
            assert response.status_code == 302
            assert "template_id" in response.location
            assert str(tmpl.id) in response.location

    def test_add_workout_with_template_prefill_renders(
        self, auth_client, workout_template, app
    ):
        """GET /add_workout?template_id=X returns 200 with the template title."""
        with app.app_context():
            tmpl = (
                db.session.execute(db.select(Workout).filter_by(title="My Template"))
                .scalars()
                .first()
            )

            response = auth_client.get(url_for("main.add_workout", template_id=tmpl.id))
            assert response.status_code == 200
            assert b"My Template" in response.data

    def test_add_workout_from_template_creates_independent_copy(
        self, auth_client, workout_template, exercise_definition, app
    ):
        """Saving a workout pre-filled from a template creates a new regular workout
        and leaves the template unchanged."""
        with app.app_context():
            tmpl = (
                db.session.execute(db.select(Workout).filter_by(title="My Template"))
                .scalars()
                .first()
            )
            ex_def = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )

            response = auth_client.post(
                url_for("main.add_workout"),
                data={
                    "wtitle": "My Template",
                    "exercise_count": "1",
                    "exercise1": str(ex_def.id),
                    "progression1": "Standard",
                    "reps1": "12",
                },
                follow_redirects=False,
            )
            assert response.status_code == 302

            # A new regular workout was created
            new_workout = (
                db.session.execute(
                    db.select(Workout).filter(
                        Workout.title == "My Template",
                        Workout.is_template == False,  # noqa: E712
                    )
                )
                .scalars()
                .first()
            )
            assert new_workout is not None

            # The template still exists and is unchanged
            tmpl_reloaded = db.session.get(Workout, tmpl.id)
            assert tmpl_reloaded is not None
            assert tmpl_reloaded.is_template is True
            original_reps = tmpl_reloaded.exercises.first().sets.first().reps
            assert original_reps == 10  # original value, not 12

    # ── Isolation / regression ─────────────────────────────────────────────

    def test_workouts_page_excludes_templates(
        self, auth_client, workout, workout_template, app
    ):
        """The workouts list page does not show templates."""
        with app.app_context():
            response = auth_client.get(url_for("main.workouts"))
            html = response.get_data(as_text=True)
            assert "Morning Workout" in html
            assert "My Template" not in html

    def test_explore_page_excludes_templates(
        self, client, workout_template, second_user, app
    ):
        """The explore page does not include templates from other users."""
        with app.app_context():
            with client.session_transaction() as sess:
                sess["_user_id"] = str(second_user.id)
                sess["_fresh"] = True

            response = client.get(url_for("main.explore"))
            assert response.status_code == 200
            assert b"My Template" not in response.data


class TestExerciseCategoryRoutes:
    """Tests for exercise category feature: filtering, creation, and form integration."""

    def test_exercises_page_shows_category_chips(
        self, auth_client, exercise_categories, app
    ):
        """Exercise library page renders category filter chips."""
        with app.app_context():
            response = auth_client.get(url_for("main.all_exercises"))
            assert response.status_code == 200
            assert b"Upper Body" in response.data
            assert b"Core" in response.data
            assert b"Cardio" in response.data

    def test_exercises_filter_by_user_mine(
        self, auth_client, exercise_definition, second_user, app
    ):
        """?user=mine excludes exercises owned by other users."""
        with app.app_context():
            # Create an exercise owned by second_user
            other_ex = ExerciseDefinition(
                title="Other Exercise",
                user_id=second_user.id,
                counting_type="reps",
            )
            db.session.add(other_ex)
            db.session.commit()

            response = auth_client.get(url_for("main.all_exercises", user="mine"))
            assert response.status_code == 200
            assert b"Push-ups" in response.data
            assert b"Other Exercise" not in response.data

    def test_exercises_filter_by_category(
        self, auth_client, exercise_definition, exercise_categories, app
    ):
        """?category=<id> shows only exercises with that category."""
        with app.app_context():
            ex = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
            upper_body = (
                db.session.execute(
                    db.select(ExerciseCategory).filter_by(name="Upper Body")
                )
                .scalars()
                .first()
            )
            core = (
                db.session.execute(db.select(ExerciseCategory).filter_by(name="Core"))
                .scalars()
                .first()
            )
            ex.categories = [upper_body]
            db.session.commit()

            # Filter by Upper Body — should show Push-ups
            response = auth_client.get(
                url_for("main.all_exercises", category=upper_body.id)
            )
            assert response.status_code == 200
            assert b"Push-ups" in response.data

            # Filter by Core — should not show Push-ups
            response2 = auth_client.get(url_for("main.all_exercises", category=core.id))
            assert response2.status_code == 200
            assert b"Push-ups" not in response2.data

    def test_exercises_combined_filter(
        self, auth_client, exercise_definition, exercise_categories, second_user, app
    ):
        """?user=mine&category=<id> applies both filters (intersection)."""
        with app.app_context():
            # Assign category to testuser's push-ups
            ex = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
            upper_body = (
                db.session.execute(
                    db.select(ExerciseCategory).filter_by(name="Upper Body")
                )
                .scalars()
                .first()
            )
            ex.categories = [upper_body]

            # Create exercise by second_user with same category
            other_ex = ExerciseDefinition(
                title="Other Pull-ups", user_id=second_user.id, counting_type="reps"
            )
            db.session.add(other_ex)
            db.session.flush()
            other_ex.categories = [upper_body]
            db.session.commit()

            response = auth_client.get(
                url_for("main.all_exercises", user="mine", category=upper_body.id)
            )
            assert response.status_code == 200
            assert b"Push-ups" in response.data
            assert b"Other Pull-ups" not in response.data

    def test_add_exercise_shows_category_checkboxes(
        self, auth_client, exercise_categories, app
    ):
        """GET /add_exercise renders category checkboxes."""
        with app.app_context():
            response = auth_client.get(url_for("main.add_exercise"))
            assert response.status_code == 200
            assert b"Kategorien" in response.data
            assert b"Upper Body" in response.data

    def test_add_exercise_saves_categories(self, auth_client, exercise_categories, app):
        """POST /add_exercise with category_ids persists bridge rows."""
        with app.app_context():
            upper_body = (
                db.session.execute(
                    db.select(ExerciseCategory).filter_by(name="Upper Body")
                )
                .scalars()
                .first()
            )
            core = (
                db.session.execute(db.select(ExerciseCategory).filter_by(name="Core"))
                .scalars()
                .first()
            )

            response = auth_client.post(
                url_for("main.add_exercise"),
                data={
                    "title": "Dips",
                    "description": "Tricep dips",
                    "counting_type": "reps",
                    "category_ids": [str(upper_body.id), str(core.id)],
                },
                follow_redirects=True,
            )
            assert response.status_code == 200

            ex = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Dips")
                )
                .scalars()
                .first()
            )
            assert ex is not None
            cat_names = {c.name for c in ex.categories}
            assert "Upper Body" in cat_names
            assert "Core" in cat_names

    def test_update_exercise_shows_selected_categories(
        self, auth_client, exercise_definition, exercise_categories, app
    ):
        """GET /exercise/<id>/update pre-checks existing categories."""
        with app.app_context():
            ex = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
            upper_body = (
                db.session.execute(
                    db.select(ExerciseCategory).filter_by(name="Upper Body")
                )
                .scalars()
                .first()
            )
            ex.categories = [upper_body]
            db.session.commit()
            ex_id = ex.id
            cat_id = upper_body.id

        response = auth_client.get(url_for("main.update_exercise", exercises_id=ex_id))
        assert response.status_code == 200
        # The checkbox with the category's value should be present and checked
        assert f'value="{cat_id}"'.encode() in response.data
        assert b"checked" in response.data

    def test_update_exercise_replaces_categories(
        self, auth_client, exercise_definition, exercise_categories, app
    ):
        """POST /exercise/<id>/update replaces category assignments."""
        with app.app_context():
            ex = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
            upper_body = (
                db.session.execute(
                    db.select(ExerciseCategory).filter_by(name="Upper Body")
                )
                .scalars()
                .first()
            )
            core = (
                db.session.execute(db.select(ExerciseCategory).filter_by(name="Core"))
                .scalars()
                .first()
            )
            ex.categories = [upper_body]
            db.session.commit()
            ex_id = ex.id
            core_id = core.id

        # Update: replace Upper Body with Core
        auth_client.post(
            url_for("main.update_exercise", exercises_id=ex_id),
            data={
                "title": "Push-ups",
                "counting_type": "reps",
                "category_ids": [str(core_id)],
            },
            follow_redirects=True,
        )
        with app.app_context():
            ex = db.session.get(ExerciseDefinition, ex_id)
            cat_names = {c.name for c in ex.categories}
            assert cat_names == {"Core"}
            assert "Upper Body" not in cat_names

    def test_add_category_creates_new(self, auth_client, app):
        """POST /categories/add creates a new category and returns 201."""
        with app.app_context():
            response = auth_client.post(
                url_for("main.add_category"),
                json={"name": "Gymnastics"},
            )
            assert response.status_code == 201
            data = response.get_json()
            assert data["name"] == "Gymnastics"
            assert isinstance(data["id"], int)

            cat = (
                db.session.execute(
                    db.select(ExerciseCategory).filter_by(name="Gymnastics")
                )
                .scalars()
                .first()
            )
            assert cat is not None

    def test_add_category_returns_existing_on_duplicate(self, auth_client, app):
        """POST /categories/add returns 200 and existing id for duplicate name."""
        with app.app_context():
            cat = ExerciseCategory(name="Stretching")
            db.session.add(cat)
            db.session.commit()
            existing_id = cat.id

        response = auth_client.post(
            url_for("main.add_category"),
            json={"name": "Stretching"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["id"] == existing_id
        assert data["name"] == "Stretching"

    def test_add_category_empty_name_returns_400(self, auth_client, app):
        """POST /categories/add with empty name returns 400."""
        with app.app_context():
            response = auth_client.post(
                url_for("main.add_category"),
                json={"name": "   "},
            )
            assert response.status_code == 400

    def test_add_workout_context_includes_category_map(
        self, auth_client, exercise_definition, exercise_categories, app
    ):
        """GET /add_workout passes category_map and all_categories to template."""
        with app.app_context():
            response = auth_client.get(url_for("main.add_workout"))
            assert response.status_code == 200
            assert b"categoryMap" in response.data
            assert b"Upper Body" in response.data

    def test_edit_workout_context_includes_category_map(
        self, auth_client, workout, exercise_categories, app
    ):
        """GET /workout/<id>/edit passes category_map to template."""
        with app.app_context():
            w = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Morning Workout")
                )
                .scalars()
                .first()
            )
            response = auth_client.get(url_for("main.edit_workout", workout_id=w.id))
            assert response.status_code == 200
            assert b"categoryMap" in response.data

    def test_add_template_context_includes_category_map(
        self, auth_client, exercise_definition, exercise_categories, app
    ):
        """GET /add_template passes category_map to template."""
        with app.app_context():
            response = auth_client.get(url_for("main.add_template"))
            assert response.status_code == 200
            assert b"categoryMap" in response.data

    def test_exercises_filter_by_multiple_categories(
        self, auth_client, exercise_definition, exercise_categories, second_user, app
    ):
        """?category=id1&category=id2 shows only exercises with ALL selected categories (AND logic)."""
        with app.app_context():
            push_ups = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
            upper_body = (
                db.session.execute(
                    db.select(ExerciseCategory).filter_by(name="Upper Body")
                )
                .scalars()
                .first()
            )
            core = (
                db.session.execute(db.select(ExerciseCategory).filter_by(name="Core"))
                .scalars()
                .first()
            )
            # Create a second exercise with Core category only (not Upper Body)
            core_ex = ExerciseDefinition(
                title="Plank",
                user_id=second_user.id,
                counting_type="duration",
            )
            db.session.add(core_ex)
            db.session.flush()
            # Push-ups gets BOTH categories; Plank gets only Core
            push_ups.categories = [upper_body, core]
            core_ex.categories = [core]
            db.session.commit()

            # Filter by Upper Body AND Core — only Push-ups qualifies (has both)
            response = auth_client.get(
                f"{url_for('main.all_exercises')}?category={upper_body.id}&category={core.id}"
            )
            assert response.status_code == 200
            assert b"Push-ups" in response.data
            assert b"Plank" not in response.data  # Plank only has Core, not Upper Body

            # Filter by Core only — both exercises appear
            response2 = auth_client.get(url_for("main.all_exercises", category=core.id))
            assert response2.status_code == 200
            assert b"Push-ups" in response2.data
            assert b"Plank" in response2.data


class TestCategoryManagementRoutes:
    """Tests for the category management CRUD page (/categories)."""

    def test_manage_categories_page_accessible(
        self, auth_client, exercise_categories, app
    ):
        """GET /categories returns 200."""
        with app.app_context():
            response = auth_client.get(url_for("main.manage_categories"))
            assert response.status_code == 200

    def test_manage_categories_shows_all_categories(
        self, auth_client, exercise_categories, app
    ):
        """GET /categories shows all category names."""
        with app.app_context():
            response = auth_client.get(url_for("main.manage_categories"))
            assert response.status_code == 200
            assert b"Upper Body" in response.data
            assert b"Core" in response.data
            assert b"Cardio" in response.data

    def test_manage_categories_requires_login(self, client, app):
        """Unauthenticated user is redirected."""
        with app.app_context():
            response = client.get(
                url_for("main.manage_categories"), follow_redirects=False
            )
            assert response.status_code == 302

    def test_manage_categories_create_new(self, auth_client, app):
        """POST /categories creates a new category and redirects."""
        with app.app_context():
            response = auth_client.post(
                url_for("main.manage_categories"),
                data={"name": "Gymnastics"},
                follow_redirects=True,
            )
            assert response.status_code == 200
            assert b"Gymnastics" in response.data

            cat = (
                db.session.execute(
                    db.select(ExerciseCategory).filter_by(name="Gymnastics")
                )
                .scalars()
                .first()
            )
            assert cat is not None

    def test_manage_categories_create_duplicate_shows_warning(
        self, auth_client, exercise_categories, app
    ):
        """POST /categories with duplicate name shows a flash warning."""
        with app.app_context():
            response = auth_client.post(
                url_for("main.manage_categories"),
                data={"name": "Upper Body"},
                follow_redirects=True,
            )
            assert response.status_code == 200
            assert b"existiert bereits" in response.data

    def test_manage_categories_create_empty_name_shows_warning(self, auth_client, app):
        """POST /categories with empty name shows a flash warning."""
        with app.app_context():
            response = auth_client.post(
                url_for("main.manage_categories"),
                data={"name": "   "},
                follow_redirects=True,
            )
            assert response.status_code == 200
            assert b"leer" in response.data

    def test_rename_category_success(self, auth_client, exercise_categories, app):
        """POST /categories/<id>/rename (JSON) updates name and returns 200."""
        with app.app_context():
            cat = (
                db.session.execute(db.select(ExerciseCategory).filter_by(name="Core"))
                .scalars()
                .first()
            )
            cat_id = cat.id

        response = auth_client.post(
            url_for("main.rename_category", cat_id=cat_id),
            json={"name": "Core & Abs"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["name"] == "Core & Abs"
        assert data["id"] == cat_id

        with app.app_context():
            updated = db.session.get(ExerciseCategory, cat_id)
            assert updated.name == "Core & Abs"

    def test_rename_category_duplicate_returns_409(
        self, auth_client, exercise_categories, app
    ):
        """POST /categories/<id>/rename returns 409 when name is already taken."""
        with app.app_context():
            core = (
                db.session.execute(db.select(ExerciseCategory).filter_by(name="Core"))
                .scalars()
                .first()
            )
            core_id = core.id

        response = auth_client.post(
            url_for("main.rename_category", cat_id=core_id),
            json={"name": "Upper Body"},
        )
        assert response.status_code == 409

    def test_rename_category_not_found_returns_404(self, auth_client, app):
        """POST /categories/99999/rename returns 404 for unknown ID."""
        with app.app_context():
            response = auth_client.post(
                url_for("main.rename_category", cat_id=99999),
                json={"name": "Whatever"},
            )
            assert response.status_code == 404

    def test_rename_category_empty_name_returns_400(
        self, auth_client, exercise_categories, app
    ):
        """POST /categories/<id>/rename with empty name returns 400."""
        with app.app_context():
            cat = (
                db.session.execute(db.select(ExerciseCategory).filter_by(name="Core"))
                .scalars()
                .first()
            )
            cat_id = cat.id

        response = auth_client.post(
            url_for("main.rename_category", cat_id=cat_id),
            json={"name": "  "},
        )
        assert response.status_code == 400

    def test_delete_category_success(self, auth_client, app):
        """POST /categories/<id>/delete removes a category with 0 exercises."""
        with app.app_context():
            cat = ExerciseCategory(name="ToDelete")
            db.session.add(cat)
            db.session.commit()
            cat_id = cat.id

        response = auth_client.post(
            url_for("main.delete_category", cat_id=cat_id),
            follow_redirects=True,
        )
        assert response.status_code == 200
        assert b"gel" in response.data  # "gelöscht" in flash message

        with app.app_context():
            gone = db.session.get(ExerciseCategory, cat_id)
            assert gone is None

    def test_delete_category_blocked_when_in_use(
        self, auth_client, exercise_definition, exercise_categories, app
    ):
        """POST /categories/<id>/delete is refused when exercises use the category."""
        with app.app_context():
            ex = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
            upper_body = (
                db.session.execute(
                    db.select(ExerciseCategory).filter_by(name="Upper Body")
                )
                .scalars()
                .first()
            )
            ex.categories = [upper_body]
            db.session.commit()
            cat_id = upper_body.id

        response = auth_client.post(
            url_for("main.delete_category", cat_id=cat_id),
            follow_redirects=True,
        )
        assert response.status_code == 200
        # Flash message warns about usage
        assert b"verwendet" in response.data

        with app.app_context():
            still_there = db.session.get(ExerciseCategory, cat_id)
            assert still_there is not None

    def test_delete_category_not_found_redirects(self, auth_client, app):
        """POST /categories/99999/delete with unknown ID redirects gracefully."""
        with app.app_context():
            response = auth_client.post(
                url_for("main.delete_category", cat_id=99999),
                follow_redirects=True,
            )
            assert response.status_code == 200

    def test_manage_categories_shows_exercise_count(
        self, auth_client, exercise_definition, exercise_categories, app
    ):
        """Category list shows how many exercises use each category."""
        with app.app_context():
            ex = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
            upper_body = (
                db.session.execute(
                    db.select(ExerciseCategory).filter_by(name="Upper Body")
                )
                .scalars()
                .first()
            )
            ex.categories = [upper_body]
            db.session.commit()

            response = auth_client.get(url_for("main.manage_categories"))
            assert response.status_code == 200
            # The count badge for Upper Body should be visible
            assert b"badge-info" in response.data
