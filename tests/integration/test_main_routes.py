"""Integration tests for main application routes."""

import pytest

from flask import url_for

from project import db
from project.models import User, Workout, ExerciseDefinition, Exercise, Set, Message


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
            workout = Workout.query.first()
            response = auth_client.get(
                url_for("main.workout", workout_id=workout.id)
            )
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
            exercise_def = ExerciseDefinition.query.first()
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
            workout = Workout.query.filter_by(title="New Test Workout").first()
            assert workout is not None

    def test_delete_workout_own(self, auth_client, workout, app):
        """Test user can delete their own workout."""
        with app.app_context():
            workout = Workout.query.first()
            workout_id = workout.id
            response = auth_client.post(
                url_for("main.delete_workout", workout_id=workout_id),
                follow_redirects=True,
            )
            assert response.status_code == 200

            # Verify workout was deleted
            assert Workout.query.filter_by(id=workout_id).first() is None

    def test_delete_workout_others_forbidden(self, client, workout, second_user, app):
        """Test user cannot delete another user's workout."""
        with app.app_context():
            # Login as second user
            with client.session_transaction() as sess:
                sess["_user_id"] = str(second_user.id)
                sess["_fresh"] = True

            workout = Workout.query.first()
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
            exercise = ExerciseDefinition.query.filter_by(title="Pull-ups").first()
            assert exercise is not None
            assert exercise.description == "Standard pull-up exercise for back."

    def test_exercise_detail_page(self, auth_client, exercise_definition, app):
        """Test exercise detail page renders."""
        with app.app_context():
            exercise = ExerciseDefinition.query.first()
            response = auth_client.get(
                url_for("main.exercise", exercises_id=exercise.id)
            )
            assert response.status_code == 200
            assert b"Push-ups" in response.data

    def test_update_exercise_page_renders(self, auth_client, exercise_definition, app):
        """Test update exercise page renders."""
        with app.app_context():
            exercise = ExerciseDefinition.query.first()
            response = auth_client.get(
                url_for("main.update_exercise", exercises_id=exercise.id)
            )
            assert response.status_code == 200

    def test_update_exercise(self, auth_client, exercise_definition, app):
        """Test updating an exercise."""
        with app.app_context():
            exercise = ExerciseDefinition.query.first()
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
            exercise = ExerciseDefinition.query.filter_by(title="Updated Push-ups").first()
            assert exercise is not None

    def test_update_exercise_others_forbidden(
        self, client, exercise_definition, second_user, app
    ):
        """Test user cannot update another user's exercise."""
        with app.app_context():
            with client.session_transaction() as sess:
                sess["_user_id"] = str(second_user.id)
                sess["_fresh"] = True

            exercise = ExerciseDefinition.query.first()
            response = client.post(
                url_for("main.update_exercise", exercises_id=exercise.id),
                data={
                    "title": "Hacked Title",
                    "description": "Hacked description",
                },
            )
            assert response.status_code == 403

    def test_delete_exercise_own(self, auth_client, exercise_definition, app):
        """Test user can delete their own exercise."""
        with app.app_context():
            exercise = ExerciseDefinition.query.first()
            exercise_id = exercise.id
            response = auth_client.post(
                url_for("main.delete_exercise", exercises_id=exercise_id),
                follow_redirects=True,
            )
            assert response.status_code == 200

            # Verify exercise was deleted
            assert ExerciseDefinition.query.filter_by(id=exercise_id).first() is None

    def test_delete_exercise_others_forbidden(
        self, client, exercise_definition, second_user, app
    ):
        """Test user cannot delete another user's exercise."""
        with app.app_context():
            with client.session_transaction() as sess:
                sess["_user_id"] = str(second_user.id)
                sess["_fresh"] = True

            exercise = ExerciseDefinition.query.first()
            response = client.post(
                url_for("main.delete_exercise", exercises_id=exercise.id),
            )
            assert response.status_code == 403

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
            ex = ExerciseDefinition.query.first()
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
            user = User.query.filter_by(username="testuser").first()
            second = User.query.filter_by(username="seconduser").first()
            assert user.is_following(second) is True

    def test_unfollow_user(self, auth_client, second_user, app):
        """Test unfollowing a user."""
        with app.app_context():
            # First follow
            user = User.query.filter_by(username="testuser").first()
            second = User.query.filter_by(username="seconduser").first()
            user.follow(second)
            db.session.commit()

            response = auth_client.get(
                url_for("main.unfollow", username="seconduser"),
                follow_redirects=True,
            )
            assert response.status_code == 200

            # Verify unfollow
            user = User.query.filter_by(username="testuser").first()
            second = User.query.filter_by(username="seconduser").first()
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
            message = Message.query.filter_by(body="Hello, second user!").first()
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

    def test_explore_shows_other_users_workouts(
        self, auth_client, second_user, app
    ):
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
            response = auth_client.get(
                url_for("main.notifications") + "?since=0"
            )
            assert response.status_code == 200
            data = response.get_json()
            assert isinstance(data, list)
