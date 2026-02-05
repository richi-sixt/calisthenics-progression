"""Unit tests for database models."""

from datetime import datetime, timezone

import pytest

from project import db
from project.models import (
    User,
    Workout,
    Exercise,
    Exercises,
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
            ex = Exercises.query.filter_by(title="Push-ups").first()
            assert repr(ex) == "<Exercises Push-ups>"


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
