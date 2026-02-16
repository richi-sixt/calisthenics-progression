"""Unit tests for database models."""

from datetime import datetime, timezone

import pytest

from project import db
from project.models import (
    User,
    Workout,
    Exercise,
    ExerciseDefinition,
    Set,
    Message,
    Notification,
)


class TestUserModel:
    """Tests for the User model."""

    def test_password_hashing(self, app, user):
        """Test that password hashing and verification works."""
        with app.app_context():
            user = User.query.filter_by(username="testuser").first()
            assert user.check_password("password123") is True
            assert user.check_password("wrongpassword") is False

    def test_password_hash_is_not_plain_text(self, app, user):
        """Test that password is stored as hash, not plain text."""
        with app.app_context():
            user = User.query.filter_by(username="testuser").first()
            assert user.password_hash != "password123"
            assert user.password_hash is not None

    def test_user_repr(self, app, user):
        """Test User string representation."""
        with app.app_context():
            user = User.query.filter_by(username="testuser").first()
            assert repr(user) == "<User testuser>"

    def test_follow_user(self, app, user, second_user):
        """Test following another user."""
        with app.app_context():
            user1 = User.query.filter_by(username="testuser").first()
            user2 = User.query.filter_by(username="seconduser").first()

            assert user1.is_following(user2) is False

            user1.follow(user2)
            db.session.commit()

            assert user1.is_following(user2) is True
            assert user2.is_following(user1) is False

    def test_unfollow_user(self, app, user, second_user):
        """Test unfollowing a user."""
        with app.app_context():
            user1 = User.query.filter_by(username="testuser").first()
            user2 = User.query.filter_by(username="seconduser").first()

            user1.follow(user2)
            db.session.commit()
            assert user1.is_following(user2) is True

            user1.unfollow(user2)
            db.session.commit()
            assert user1.is_following(user2) is False

    def test_follow_idempotent(self, app, user, second_user):
        """Test that following same user twice doesn't duplicate."""
        with app.app_context():
            user1 = User.query.filter_by(username="testuser").first()
            user2 = User.query.filter_by(username="seconduser").first()

            user1.follow(user2)
            user1.follow(user2)  # Follow again
            db.session.commit()

            assert user1.followed.count() == 1

    def test_followed_workouts(self, app, user, second_user, workout):
        """Test getting workouts from followed users and self."""
        with app.app_context():
            user1 = User.query.filter_by(username="testuser").first()
            user2 = User.query.filter_by(username="seconduser").first()

            # Create workout for second user
            workout2 = Workout(title="Second Workout", user_id=user2.id)
            db.session.add(workout2)
            db.session.commit()

            # Before following, should only see own workouts
            own_workouts = user1.followed_workouts().all()
            assert len(own_workouts) == 1
            assert own_workouts[0].title == "Morning Workout"

            # After following, should see both
            user1.follow(user2)
            db.session.commit()

            all_workouts = user1.followed_workouts().all()
            assert len(all_workouts) == 2

    def test_new_messages_count(self, app, user, second_user):
        """Test counting unread messages."""
        with app.app_context():
            user1 = User.query.filter_by(username="testuser").first()
            user2 = User.query.filter_by(username="seconduser").first()

            # Initially no unread messages
            assert user1.new_messages() == 0

            # Send a message to user1
            msg = Message(
                sender_id=user2.id,
                recipient_id=user1.id,
                body="Hello!",
            )
            db.session.add(msg)
            db.session.commit()

            assert user1.new_messages() == 1

            # Mark messages as read
            user1.last_message_read_time = datetime.now(timezone.utc)
            db.session.commit()

            assert user1.new_messages() == 0

    def test_add_notification(self, app, user):
        """Test adding and updating notifications."""
        with app.app_context():
            user = User.query.filter_by(username="testuser").first()

            # Add notification
            notification = user.add_notification("unread_message_count", 5)
            db.session.commit()

            assert notification.name == "unread_message_count"
            assert notification.get_data() == 5

            # Update notification (should replace old one)
            user.add_notification("unread_message_count", 10)
            db.session.commit()

            notifications = user.notifications.filter_by(
                name="unread_message_count"
            ).all()
            assert len(notifications) == 1
            assert notifications[0].get_data() == 10


class TestWorkoutModel:
    """Tests for the Workout model."""

    def test_workout_repr(self, app, workout):
        """Test Workout string representation."""
        with app.app_context():
            workout = Workout.query.filter_by(title="Morning Workout").first()
            assert repr(workout) == "<Workout Morning Workout>"

    def test_workout_cascade_delete(self, app, workout):
        """Test that deleting workout deletes exercises and sets."""
        with app.app_context():
            workout = Workout.query.filter_by(title="Morning Workout").first()
            workout_id = workout.id

            # Verify exercises and sets exist
            assert Exercise.query.filter_by(workout_id=workout_id).count() > 0

            db.session.delete(workout)
            db.session.commit()

            # Verify cascade delete
            assert Workout.query.filter_by(id=workout_id).first() is None
            assert Exercise.query.filter_by(workout_id=workout_id).count() == 0


class TestExercisesModel:
    """Tests for the Exercises (exercise definition) model."""

    def test_exercises_repr(self, app, exercise_definition):
        """Test Exercises string representation."""
        with app.app_context():
            ex = ExerciseDefinition.query.filter_by(title="Push-ups").first()
            assert repr(ex) == "<ExerciseDefinition Push-ups>"

    def test_exercise_definition_with_explicit_date(self, app, user):
        """Test creating ExerciseDefinition with explicit date_created."""
        with app.app_context():
            custom_date = datetime(2024, 1, 15)
            ex = ExerciseDefinition(
                title="Planche",
                description="A planche hold",
                user_id=user.id,
                date_created=custom_date,
            )
            db.session.add(ex)
            db.session.commit()

            assert ex.date_created == custom_date


    def test_counting_type_defaults_to_reps(self, app, exercise_definition):
        """Test counting_type defaults to 'reps'."""
        with app.app_context():
            ex = ExerciseDefinition.query.filter_by(title="Push-ups").first()
            assert ex.counting_type == "reps"

    def test_counting_type_duration(self, app, duration_exercise_definition):
        """Test creating exercise definition with duration counting_type."""
        with app.app_context():
            ex = ExerciseDefinition.query.filter_by(title="Plank").first()
            assert ex.counting_type == "duration"

    def test_counting_type_persists(self, app, user):
        """Test counting_type value is persisted to database."""
        with app.app_context():
            ex = ExerciseDefinition(
                title="L-Sit",
                description="L-Sit hold",
                user_id=user.id,
                counting_type="duration",
            )
            db.session.add(ex)
            db.session.commit()

            fetched = ExerciseDefinition.query.filter_by(title="L-Sit").first()
            assert fetched.counting_type == "duration"

class TestExerciseModel:
    """Tests for the Exercise model."""

    def test_exercise_repr(self, app, workout):
        """Test Exercise string representation."""
        with app.app_context():
            exercise = Exercise.query.first()
            assert "Order 1" in repr(exercise)

    def test_exercise_cascade_delete_sets(self, app, workout):
        """Test that deleting exercise deletes its sets."""
        with app.app_context():
            exercise = Exercise.query.first()
            exercise_id = exercise.id

            assert Set.query.filter_by(exercise_id=exercise_id).count() > 0

            db.session.delete(exercise)
            db.session.commit()

            assert Set.query.filter_by(exercise_id=exercise_id).count() == 0


class TestSetModel:
    """Tests for the Set model."""

    def test_set_repr(self, app, workout):
        """Test Set string representation."""
        with app.app_context():
            work_set = Set.query.first()
            assert "10 reps" in repr(work_set)


    def test_set_with_duration(self, app, duration_workout):
        """Test creating a set with duration instead of reps."""
        with app.app_context():
            work_set = Set.query.first()
            assert work_set.duration == 90
            assert work_set.reps is None

    def test_duration_formatted_minutes_and_seconds(self, app, user):
        """Test duration_formatted returns mm:ss format."""
        with app.app_context():
            w = Workout(title="Test", user_id=user.id)
            db.session.add(w)
            db.session.flush()
            ex = Exercise(exercise_order=1, workout_id=w.id)
            db.session.add(ex)
            db.session.flush()

            work_set = Set(set_order=1, exercise_id=ex.id, duration=90)
            db.session.add(work_set)
            db.session.commit()

            assert work_set.duration_formatted == "01:30"

    def test_duration_formatted_zero(self, app, user):
        """Test duration_formatted with zero seconds."""
        with app.app_context():
            w = Workout(title="Test", user_id=user.id)
            db.session.add(w)
            db.session.flush()
            ex = Exercise(exercise_order=1, workout_id=w.id)
            db.session.add(ex)
            db.session.flush()

            work_set = Set(set_order=1, exercise_id=ex.id, duration=0)
            db.session.add(work_set)
            db.session.commit()

            assert work_set.duration_formatted == "00:00"

    def test_duration_formatted_none(self, app, user):
        """Test duration_formatted returns 00:00 when duration is None."""
        with app.app_context():
            w = Workout(title="Test", user_id=user.id)
            db.session.add(w)
            db.session.flush()
            ex = Exercise(exercise_order=1, workout_id=w.id)
            db.session.add(ex)
            db.session.flush()

            work_set = Set(set_order=1, exercise_id=ex.id)
            db.session.add(work_set)
            db.session.commit()

            assert work_set.duration_formatted == "00:00"

    def test_duration_formatted_seconds_only(self, app, user):
        """Test duration_formatted with less than a minute."""
        with app.app_context():
            w = Workout(title="Test", user_id=user.id)
            db.session.add(w)
            db.session.flush()
            ex = Exercise(exercise_order=1, workout_id=w.id)
            db.session.add(ex)
            db.session.flush()

            work_set = Set(set_order=1, exercise_id=ex.id, duration=45)
            db.session.add(work_set)
            db.session.commit()

            assert work_set.duration_formatted == "00:45"


class TestMessageModel:
    """Tests for the Message model."""

    def test_message_repr(self, app, user, second_user):
        """Test Message string representation."""
        with app.app_context():
            user1 = User.query.filter_by(username="testuser").first()
            user2 = User.query.filter_by(username="seconduser").first()

            msg = Message(
                sender_id=user1.id,
                recipient_id=user2.id,
                body="Test message",
            )
            db.session.add(msg)
            db.session.commit()

            assert repr(msg) == "<Message Test message>"


    def test_message_with_explicit_timestamp(self, app, user, second_user):
        """Test creating Message with explicit timestamp."""
        with app.app_context():
            user1 = User.query.filter_by(username="testuser").first()
            user2 = User.query.filter_by(username="seconduser").first()
            custom_time = datetime(2024, 6, 1, 12, 0, 0)

            msg = Message(
                sender_id=user1.id,
                recipient_id=user2.id,
                body="Timed message",
                timestamp=custom_time,
            )
            db.session.add(msg)
            db.session.commit()

            assert msg.timestamp == custom_time


class TestNotificationModel:
    """Tests for the Notification model."""

    def test_notification_repr(self, app, user):
        """Test Notification string representation."""
        with app.app_context():
            user = User.query.filter_by(username="testuser").first()
            notification = user.add_notification("test_notification", {"key": "value"})
            db.session.commit()

            assert repr(notification) == "<Notification test_notification>"

    def test_notification_get_data(self, app, user):
        """Test getting notification payload data."""
        with app.app_context():
            user = User.query.filter_by(username="testuser").first()
            data = {"count": 5, "items": ["a", "b"]}
            notification = user.add_notification("complex_data", data)
            db.session.commit()

            retrieved = notification.get_data()
            assert retrieved == data

    def test_notification_with_explicit_timestamp(self, app, user):
        """Test creating a Notification with an explicit timestamp."""
        with app.app_context():
            user = User.query.filter_by(username="testuser").first()
            n = Notification(name="timed", user=user, timestamp=123.456)
            db.session.add(n)
            db.session.commit()

            assert n.timestamp == 123.456
