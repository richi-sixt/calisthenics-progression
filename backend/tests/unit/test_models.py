"""Unit tests for database models."""

from datetime import datetime, timezone

import pytest

__all__ = ("pytest",)
import sqlalchemy.exc
from project import db
from project.models import (Exercise, ExerciseCategory, ExerciseDefinition,
                            Message, Notification, ProgressionLevel, Set, User,
                            Workout, followers)
from sqlalchemy import func


class TestUserModel:
    """Tests for the User model."""

    def test_password_hashing(self, app, user):
        """Test that password hashing and verification works."""
        with app.app_context():
            user = (
                db.session.execute(db.select(User).filter_by(username="testuser"))
                .scalars()
                .first()
            )
            assert user.check_password("password123") is True
            assert user.check_password("wrongpassword") is False

    def test_password_hash_is_not_plain_text(self, app, user):
        """Test that password is stored as hash, not plain text."""
        with app.app_context():
            user = (
                db.session.execute(db.select(User).filter_by(username="testuser"))
                .scalars()
                .first()
            )
            assert user.password_hash != "password123"
            assert user.password_hash is not None

    def test_user_repr(self, app, user):
        """Test User string representation."""
        with app.app_context():
            user = (
                db.session.execute(db.select(User).filter_by(username="testuser"))
                .scalars()
                .first()
            )
            assert repr(user) == "<User testuser>"

    def test_follow_user(self, app, user, second_user):
        """Test following another user."""
        with app.app_context():
            user1 = (
                db.session.execute(db.select(User).filter_by(username="testuser"))
                .scalars()
                .first()
            )
            user2 = (
                db.session.execute(db.select(User).filter_by(username="seconduser"))
                .scalars()
                .first()
            )

            assert user1.is_following(user2) is False

            user1.follow(user2)
            db.session.commit()

            assert user1.is_following(user2) is True
            assert user2.is_following(user1) is False

    def test_unfollow_user(self, app, user, second_user):
        """Test unfollowing a user."""
        with app.app_context():
            user1 = (
                db.session.execute(db.select(User).filter_by(username="testuser"))
                .scalars()
                .first()
            )
            user2 = (
                db.session.execute(db.select(User).filter_by(username="seconduser"))
                .scalars()
                .first()
            )

            user1.follow(user2)
            db.session.commit()
            assert user1.is_following(user2) is True

            user1.unfollow(user2)
            db.session.commit()
            assert user1.is_following(user2) is False

    def test_follow_idempotent(self, app, user, second_user):
        """Test that following same user twice doesn't duplicate."""
        with app.app_context():
            user1 = (
                db.session.execute(db.select(User).filter_by(username="testuser"))
                .scalars()
                .first()
            )
            user2 = (
                db.session.execute(db.select(User).filter_by(username="seconduser"))
                .scalars()
                .first()
            )

            user1.follow(user2)
            user1.follow(user2)  # Follow again
            db.session.commit()

            assert user1.followed.count() == 1

    def test_followed_workouts(self, app, user, second_user, workout):
        """Test getting workouts from followed users and self."""
        with app.app_context():
            user1 = (
                db.session.execute(db.select(User).filter_by(username="testuser"))
                .scalars()
                .first()
            )
            user2 = (
                db.session.execute(db.select(User).filter_by(username="seconduser"))
                .scalars()
                .first()
            )

            # Create workout for second user
            workout2 = Workout(title="Second Workout", user_id=user2.id)
            db.session.add(workout2)
            db.session.commit()

            # Before following, should only see own workouts
            own_workouts = db.session.execute(user1.followed_workouts()).scalars().all()
            assert len(own_workouts) == 1
            assert own_workouts[0].title == "Morning Workout"

            # After following, should see both
            user1.follow(user2)
            db.session.commit()

            all_workouts = db.session.execute(user1.followed_workouts()).scalars().all()
            assert len(all_workouts) == 2

    def test_new_messages_count(self, app, user, second_user):
        """Test counting unread messages."""
        with app.app_context():
            user1 = (
                db.session.execute(db.select(User).filter_by(username="testuser"))
                .scalars()
                .first()
            )
            user2 = (
                db.session.execute(db.select(User).filter_by(username="seconduser"))
                .scalars()
                .first()
            )

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
            user = (
                db.session.execute(db.select(User).filter_by(username="testuser"))
                .scalars()
                .first()
            )

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
            workout = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Morning Workout")
                )
                .scalars()
                .first()
            )
            assert repr(workout) == "<Workout Morning Workout>"

    def test_workout_cascade_delete(self, app, workout):
        """Test that deleting workout deletes exercises and sets."""
        with app.app_context():
            workout = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Morning Workout")
                )
                .scalars()
                .first()
            )
            workout_id = workout.id

            # Verify exercises and sets exist
            assert (
                db.session.execute(
                    db.select(func.count())
                    .select_from(Exercise)
                    .where(Exercise.workout_id == workout_id)
                ).scalar()
                > 0
            )

            db.session.delete(workout)
            db.session.commit()

            # Verify cascade delete
            assert (
                db.session.execute(db.select(Workout).filter_by(id=workout_id))
                .scalars()
                .first()
                is None
            )
            assert (
                db.session.execute(
                    db.select(func.count())
                    .select_from(Exercise)
                    .where(Exercise.workout_id == workout_id)
                ).scalar()
                == 0
            )

    def test_workout_is_template_defaults_to_false(self, app, user):
        """Test that a newly created Workout has is_template=False by default."""
        with app.app_context():
            user = (
                db.session.execute(db.select(User).filter_by(username="testuser"))
                .scalars()
                .first()
            )
            w = Workout(title="Regular Workout", user_id=user.id)
            db.session.add(w)
            db.session.commit()
            w = (
                db.session.execute(
                    db.select(Workout).filter_by(title="Regular Workout")
                )
                .scalars()
                .first()
            )
            assert w.is_template is False

    def test_workout_template_flag_persists(self, app, user):
        """Test that is_template=True is stored and retrieved correctly."""
        with app.app_context():
            user = (
                db.session.execute(db.select(User).filter_by(username="testuser"))
                .scalars()
                .first()
            )
            tmpl = Workout(title="Test Template", user_id=user.id, is_template=True)
            db.session.add(tmpl)
            db.session.commit()
            tmpl = (
                db.session.execute(db.select(Workout).filter_by(title="Test Template"))
                .scalars()
                .first()
            )
            assert tmpl.is_template is True

    def test_template_cascade_delete(self, app, workout_template):
        """Test that deleting a template cascades to its exercises and sets."""
        with app.app_context():
            template = (
                db.session.execute(db.select(Workout).filter_by(title="My Template"))
                .scalars()
                .first()
            )
            template_id = template.id
            exercise_ids = [ex.id for ex in template.exercises.all()]

            db.session.delete(template)
            db.session.commit()

            assert db.session.get(Workout, template_id) is None
            for ex_id in exercise_ids:
                assert db.session.get(Exercise, ex_id) is None

    def test_is_template_filter_excludes_templates(self, app, user, workout_template):
        """Test that filtering is_template=False correctly excludes templates."""
        with app.app_context():
            user = (
                db.session.execute(db.select(User).filter_by(username="testuser"))
                .scalars()
                .first()
            )
            # Add a regular workout alongside the template
            w = Workout(title="Regular Workout", user_id=user.id, is_template=False)
            db.session.add(w)
            db.session.commit()

            regular = (
                db.session.execute(
                    db.select(Workout).filter(
                        Workout.user_id == user.id,
                        Workout.is_template == False,  # noqa: E712
                    )
                )
                .scalars()
                .all()
            )
            titles = [r.title for r in regular]
            assert "Regular Workout" in titles
            assert "My Template" not in titles


class TestExercisesModel:
    """Tests for the Exercises (exercise definition) model."""

    def test_exercises_repr(self, app, exercise_definition):
        """Test Exercises string representation."""
        with app.app_context():
            ex = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
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
            ex = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
            assert ex.counting_type == "reps"

    def test_counting_type_duration(self, app, duration_exercise_definition):
        """Test creating exercise definition with duration counting_type."""
        with app.app_context():
            ex = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Plank")
                )
                .scalars()
                .first()
            )
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

            fetched = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="L-Sit")
                )
                .scalars()
                .first()
            )
            assert fetched.counting_type == "duration"


class TestProgressionLevelModel:
    """Tests for the ProgressionLevel model."""

    def test_progression_levels_created_and_ordered(self, app, user):
        """Test creating multiple progression levels with correct ordering."""
        with app.app_context():
            ex = ExerciseDefinition(
                title="Push-ups",
                user_id=user.id,
            )
            db.session.add(ex)
            db.session.flush()

            levels_data = [
                "Knie-Liegestütze",
                "Normale Liegestütze",
                "Enge Liegestütze",
            ]
            for i, name in enumerate(levels_data, start=1):
                db.session.add(
                    ProgressionLevel(
                        exercise_definition_id=ex.id,
                        name=name,
                        level_order=i,
                    )
                )
            db.session.commit()

            fetched = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
            levels = fetched.progression_levels.all()
            assert len(levels) == 3
            assert levels[0].name == "Knie-Liegestütze"
            assert levels[1].name == "Normale Liegestütze"
            assert levels[2].name == "Enge Liegestütze"
            assert levels[0].level_order == 1
            assert levels[2].level_order == 3

    def test_progression_levels_cascade_delete(self, app, user):
        """Test that deleting an ExerciseDefinition deletes its ProgressionLevels."""
        with app.app_context():
            ex = ExerciseDefinition(
                title="Plank",
                user_id=user.id,
            )
            db.session.add(ex)
            db.session.flush()

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
            ex_id = ex.id

            assert (
                db.session.execute(
                    db.select(func.count())
                    .select_from(ProgressionLevel)
                    .where(ProgressionLevel.exercise_definition_id == ex_id)
                ).scalar()
                == 2
            )

            db.session.delete(ex)
            db.session.commit()

            assert (
                db.session.execute(
                    db.select(func.count())
                    .select_from(ProgressionLevel)
                    .where(ProgressionLevel.exercise_definition_id == ex_id)
                ).scalar()
                == 0
            )

    def test_exercise_definition_without_levels(self, app, exercise_definition):
        """Test that progression_levels returns empty for an exercise with none defined."""
        with app.app_context():
            ex = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
            assert ex.progression_levels.count() == 0

    def test_exercise_definition_description_optional(self, app, user):
        """Test that ExerciseDefinition can be created without a description."""
        with app.app_context():
            ex = ExerciseDefinition(
                title="No Description Exercise",
                description=None,
                user_id=user.id,
            )
            db.session.add(ex)
            db.session.commit()

            fetched = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(
                        title="No Description Exercise"
                    )
                )
                .scalars()
                .first()
            )
            assert fetched is not None
            assert fetched.description is None


class TestExerciseModel:
    """Tests for the Exercise model."""

    def test_exercise_repr(self, app, workout):
        """Test Exercise string representation."""
        with app.app_context():
            exercise = db.session.execute(db.select(Exercise)).scalars().first()
            assert "Order 1" in repr(exercise)

    def test_exercise_cascade_delete_sets(self, app, workout):
        """Test that deleting exercise deletes its sets."""
        with app.app_context():
            exercise = db.session.execute(db.select(Exercise)).scalars().first()
            exercise_id = exercise.id

            assert (
                db.session.execute(
                    db.select(func.count())
                    .select_from(Set)
                    .where(Set.exercise_id == exercise_id)
                ).scalar()
                > 0
            )

            db.session.delete(exercise)
            db.session.commit()

            assert (
                db.session.execute(
                    db.select(func.count())
                    .select_from(Set)
                    .where(Set.exercise_id == exercise_id)
                ).scalar()
                == 0
            )


class TestSetModel:
    """Tests for the Set model."""

    def test_set_repr(self, app, workout):
        """Test Set string representation."""
        with app.app_context():
            work_set = db.session.execute(db.select(Set)).scalars().first()
            assert "10 reps" in repr(work_set)

    def test_set_with_duration(self, app, duration_workout):
        """Test creating a set with duration instead of reps."""
        with app.app_context():
            work_set = db.session.execute(db.select(Set)).scalars().first()
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
            user1 = (
                db.session.execute(db.select(User).filter_by(username="testuser"))
                .scalars()
                .first()
            )
            user2 = (
                db.session.execute(db.select(User).filter_by(username="seconduser"))
                .scalars()
                .first()
            )

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
            user1 = (
                db.session.execute(db.select(User).filter_by(username="testuser"))
                .scalars()
                .first()
            )
            user2 = (
                db.session.execute(db.select(User).filter_by(username="seconduser"))
                .scalars()
                .first()
            )
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
            user = (
                db.session.execute(db.select(User).filter_by(username="testuser"))
                .scalars()
                .first()
            )
            notification = user.add_notification("test_notification", {"key": "value"})
            db.session.commit()

            assert repr(notification) == "<Notification test_notification>"

    def test_notification_get_data(self, app, user):
        """Test getting notification payload data."""
        with app.app_context():
            user = (
                db.session.execute(db.select(User).filter_by(username="testuser"))
                .scalars()
                .first()
            )
            data = {"count": 5, "items": ["a", "b"]}
            notification = user.add_notification("complex_data", data)
            db.session.commit()

            retrieved = notification.get_data()
            assert retrieved == data

    def test_notification_with_explicit_timestamp(self, app, user):
        """Test creating a Notification with an explicit timestamp."""
        with app.app_context():
            user = (
                db.session.execute(db.select(User).filter_by(username="testuser"))
                .scalars()
                .first()
            )
            n = Notification(name="timed", user=user, timestamp=123.456)
            db.session.add(n)
            db.session.commit()

            assert n.timestamp == 123.456


class TestUserAccountDeletion:
    """Unit tests for user account deletion data integrity."""

    def test_delete_user_with_workouts_cascade(self, app, user, workout):
        """Test that ORM-deleting workouts cascades to exercises and sets, then user can be deleted."""
        with app.app_context():
            u = (
                db.session.execute(db.select(User).filter_by(username="testuser"))
                .scalars()
                .first()
            )
            user_id = u.id

            for w in u.workouts.all():
                db.session.delete(w)
            db.session.flush()

            db.session.execute(
                db.delete(ExerciseDefinition).where(
                    ExerciseDefinition.user_id == user_id
                )
            )
            db.session.delete(u)
            db.session.commit()

            assert db.session.get(User, user_id) is None
            assert (
                db.session.execute(
                    db.select(func.count())
                    .select_from(Workout)
                    .where(Workout.user_id == user_id)
                ).scalar()
                == 0
            )
            assert (
                db.session.execute(
                    db.select(func.count()).select_from(Exercise)
                ).scalar()
                == 0
            )
            assert (
                db.session.execute(db.select(func.count()).select_from(Set)).scalar()
                == 0
            )

    def test_exercise_definition_deleted_after_workouts(self, app, user, workout):
        """Test that ExerciseDefinitions can be deleted after workouts (removes FK references via Exercise)."""
        with app.app_context():
            u = (
                db.session.execute(db.select(User).filter_by(username="testuser"))
                .scalars()
                .first()
            )
            for w in u.workouts.all():
                db.session.delete(w)
            db.session.flush()

            result = db.session.execute(
                db.delete(ExerciseDefinition).where(ExerciseDefinition.user_id == u.id)
            )
            db.session.commit()
            assert result.rowcount >= 1
            assert (
                db.session.execute(
                    db.select(func.count())
                    .select_from(ExerciseDefinition)
                    .where(ExerciseDefinition.user_id == u.id)
                ).scalar()
                == 0
            )

    def test_follow_relationships_deleted_via_sql(self, app, user, second_user):
        """Test that follow relationships can be deleted via direct SQL on the association table."""
        with app.app_context():
            u1 = (
                db.session.execute(db.select(User).filter_by(username="testuser"))
                .scalars()
                .first()
            )
            u2 = (
                db.session.execute(db.select(User).filter_by(username="seconduser"))
                .scalars()
                .first()
            )
            u1.follow(u2)
            u2.follow(u1)
            db.session.commit()
            user_id = u1.id

            db.session.execute(
                followers.delete().where(
                    (followers.c.follower_id == user_id)
                    | (followers.c.followed_id == user_id)
                )
            )
            db.session.commit()

            result = db.session.execute(
                db.select(followers).where(
                    (followers.c.follower_id == user_id)
                    | (followers.c.followed_id == user_id)
                )
            ).fetchall()
            assert len(result) == 0


class TestExerciseCategoryModel:
    """Tests for the ExerciseCategory model and many-to-many relationship."""

    def test_category_created(self, app):
        """Test that a category name persists correctly."""
        with app.app_context():
            cat = ExerciseCategory(name="Pull")
            db.session.add(cat)
            db.session.commit()
            fetched = (
                db.session.execute(db.select(ExerciseCategory).filter_by(name="Pull"))
                .scalars()
                .first()
            )
            assert fetched is not None
            assert fetched.name == "Pull"

    def test_category_name_unique(self, app):
        """Test that duplicate category names raise an IntegrityError."""
        with app.app_context():
            db.session.add(ExerciseCategory(name="Push"))
            db.session.commit()
            db.session.add(ExerciseCategory(name="Push"))
            with pytest.raises(sqlalchemy.exc.IntegrityError):
                db.session.commit()
            db.session.rollback()

    def test_exercise_can_have_one_category(
        self, app, exercise_definition, exercise_categories
    ):
        """Test assigning a single category to an exercise."""
        with app.app_context():
            ex = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
            cat = (
                db.session.execute(
                    db.select(ExerciseCategory).filter_by(name="Upper Body")
                )
                .scalars()
                .first()
            )
            ex.categories = [cat]
            db.session.commit()

            ex = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
            assert len(ex.categories) == 1
            assert ex.categories[0].name == "Upper Body"

    def test_exercise_can_have_multiple_categories(
        self, app, exercise_definition, exercise_categories
    ):
        """Test assigning multiple categories to an exercise."""
        with app.app_context():
            ex = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
            cats = (
                db.session.execute(
                    db.select(ExerciseCategory).where(
                        ExerciseCategory.name.in_(["Upper Body", "Core"])
                    )
                )
                .scalars()
                .all()
            )
            ex.categories = list(cats)
            db.session.commit()

            ex = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(title="Push-ups")
                )
                .scalars()
                .first()
            )
            cat_names = {c.name for c in ex.categories}
            assert cat_names == {"Upper Body", "Core"}

    def test_category_filter_any_query(
        self, app, exercise_definition, exercise_categories
    ):
        """Test that .any() filter returns only exercises with a given category."""
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

            results = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter(
                        ExerciseDefinition.categories.any(
                            ExerciseCategory.id == upper_body.id
                        )
                    )
                )
                .scalars()
                .all()
            )
            assert len(results) == 1
            assert results[0].title == "Push-ups"

            # Filtering by a different category returns nothing
            core = (
                db.session.execute(db.select(ExerciseCategory).filter_by(name="Core"))
                .scalars()
                .first()
            )
            results2 = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter(
                        ExerciseDefinition.categories.any(
                            ExerciseCategory.id == core.id
                        )
                    )
                )
                .scalars()
                .all()
            )
            assert len(results2) == 0

    def test_removing_exercise_cascades_bridge_rows(
        self, app, exercise_definition, exercise_categories
    ):
        """Test that archiving (or deleting) an exercise doesn't leave orphan bridge rows."""
        from project.models import exercise_categories as bridge_table

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

            # Hard-delete the exercise definition
            db.session.delete(ex)
            db.session.commit()

            # Bridge rows should be gone
            rows = db.session.execute(
                db.select(bridge_table).where(
                    bridge_table.c.exercise_definition_id == ex_id
                )
            ).fetchall()
            assert len(rows) == 0
