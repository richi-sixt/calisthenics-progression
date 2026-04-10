"""Database models for calisthenics-progression."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from time import time
from typing import Any

from flask_login import UserMixin
from project import Base, db, login
from werkzeug.security import check_password_hash, generate_password_hash

# Followers association table for many-to-many relationship
followers = db.Table(
    "followers",
    db.Column("follower_id", db.Integer, db.ForeignKey("user.id")),
    db.Column("followed_id", db.Integer, db.ForeignKey("user.id")),
)

# Exercise categories many-to-many association table
exercise_categories = db.Table(
    "exercise_categories",
    db.Column(
        "exercise_definition_id",
        db.Integer,
        db.ForeignKey("exercises.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    db.Column(
        "category_id",
        db.Integer,
        db.ForeignKey("exercise_category.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class User(UserMixin, Base):
    """User model for authentication and profile management."""

    __tablename__ = "user"

    # Primary fields
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True)
    email = db.Column(db.String(120), index=True, unique=True)
    password_hash = db.Column(db.String(512))

    # User status fields
    admin = db.Column(db.Boolean, nullable=False, default=False)
    confirmed = db.Column(db.Boolean, nullable=False, default=False)
    confirmed_on = db.Column(db.DateTime, nullable=True)
    password_reset_token = db.Column(db.String(255), nullable=True)

    # Profile fields
    about_me = db.Column(db.String(280))
    image_file = db.Column(db.String(20), nullable=False, default="default.jpg")

    # Timestamp fields - using timezone-aware UTC
    last_seen = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    registered_on = db.Column(db.DateTime, nullable=False)
    last_message_read_time = db.Column(db.DateTime)

    # Relationships - Following system
    followed = db.relationship(
        "User",
        secondary=followers,
        primaryjoin=(followers.c.follower_id == id),
        secondaryjoin=(followers.c.followed_id == id),
        backref=db.backref("followers", lazy="dynamic"),
        lazy="dynamic",
    )

    # Relationships - User content
    workouts = db.relationship("Workout", backref="athlete", lazy="dynamic")
    exercises = db.relationship("ExerciseDefinition", backref="athlete", lazy="dynamic")

    # Relationships Messaging
    messages_sent = db.relationship(
        "Message", foreign_keys="Message.sender_id", backref="athlete", lazy="dynamic"
    )
    messages_received = db.relationship(
        "Message",
        foreign_keys="Message.recipient_id",
        backref="recipient",
        lazy="dynamic",
    )

    # Relationships - Notifications
    notifications = db.relationship("Notification", backref="user", lazy="dynamic")

    def __init__(
        self,
        username,
        email,
        admin,
        confirmed,
        confirmed_on=None,
        password_reset_token=None,
    ):
        """Initialize a new user with timezone-aware registration."""
        self.username = username
        self.email = email
        self.registered_on = datetime.now(timezone.utc)
        self.admin = admin
        self.confirmed = confirmed
        self.confirmed_on = confirmed_on
        self.password_reset_token = password_reset_token

    def __repr__(self) -> str:
        """String representation of User."""
        return f"<User {self.username}>"

    def set_password(self, password: str) -> None:
        """Hash and set the user's password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Verify the user's password."""
        return check_password_hash(self.password_hash, password)

    # Following methods
    def follow(self, user: "User") -> None:
        """Follow another user if not already following."""
        if not self.is_following(user):
            self.followed.append(user)

    def unfollow(self, user: "User") -> None:
        """Unfollow a user if currently following."""
        if self.is_following(user):
            self.followed.remove(user)

    def is_following(self, user: "User") -> bool:
        """Check if this user is following another user."""
        return bool(self.followed.filter(followers.c.followed_id == user.id).count())

    def followed_workouts(self):  # type: ignore[return]
        """Get workouts from followed users and own workouts (excludes templates)."""
        followed = (
            db.select(Workout)
            .join(  # type: ignore[name-defined]
                followers, (followers.c.followed_id == Workout.user_id)  # type: ignore[name-defined]
            )
            .filter(
                followers.c.follower_id == self.id,
                Workout.is_template == False,  # noqa: E712
            )
        )

        own = db.select(Workout).filter_by(user_id=self.id, is_template=False)

        union_stmt = followed.union(own).order_by(Workout.timestamp.desc())  # type: ignore[union-attr]
        return db.select(Workout).from_statement(union_stmt)

    def new_messages(self) -> int:
        """Count unread messages since last read time."""
        last_read_time = self.last_message_read_time or datetime(
            1900, 1, 1, tzinfo=timezone.utc
        )
        result = db.session.execute(
            db.select(db.func.count())
            .select_from(Message)
            .filter(
                Message.recipient_id == self.id,
                Message.timestamp > last_read_time,  # type: ignore[arg-type]
            )
        ).scalar()
        return int(result) if result is not None else 0

    def add_notification(self, name: str, data: dict) -> Notification:
        """Add or update a notification for this user."""
        self.notifications.filter_by(name=name).delete()
        n = Notification(name=name, user=self)
        n.payload_json = json.dumps(data)
        db.session.add(n)
        return n

    def to_dict(self) -> dict[str, Any]:
        """Serialize user to dictionary for API responses."""
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "about_me": self.about_me,
            "image_file": self.image_file,
            "confirmed": self.confirmed,
            "last_seen": self.last_seen.isoformat() if self.last_seen else None,
            "registered_on": (
                self.registered_on.isoformat() if self.registered_on else None
            ),
            "follower_count": self.followers.count(),
            "following_count": self.followed.count(),
        }


# Load user for session
@login.user_loader
def load_user(id: str) -> User | None:
    """Load user for Flask-Login session management."""
    return db.session.get(User, int(id))


class Workout(Base):
    """Workout model representing a training session or a reusable template."""

    __tablename__ = "workout"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(80), index=True)
    timestamp = db.Column(
        db.DateTime, index=True, default=lambda: datetime.now(timezone.utc)
    )
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    is_template = db.Column(
        db.Boolean, nullable=False, default=False, server_default="0"
    )
    is_done = db.Column(db.Boolean, nullable=False, default=False, server_default="0")

    # Relationships to exercises in this workout
    exercises = db.relationship(
        "Exercise", backref="workout", cascade="all, delete-orphan", lazy="dynamic"
    )

    def __init__(
        self,
        title: str,
        user_id: int,
        timestamp: datetime | None = None,
        is_template: bool = False,
        is_done: bool = False,
    ) -> None:
        """Initialize a workout session or template."""
        self.title = title
        self.user_id = user_id
        self.is_template = is_template
        self.is_done = is_done
        if timestamp is not None:  # has a default
            self.timestamp = timestamp

    def __repr__(self) -> str:
        """String representation of Workout."""
        return f"<Workout {self.title}>"

    def to_dict(self, include_exercises: bool = False) -> dict[str, Any]:
        """Serialize workout to dictionary for API responses."""
        data: dict[str, Any] = {
            "id": self.id,
            "title": self.title,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "user_id": self.user_id,
            "is_template": self.is_template,
            "is_done": self.is_done,
        }
        if include_exercises:
            data["exercises"] = [
                ex.to_dict(include_sets=True)
                for ex in self.exercises.order_by(Exercise.exercise_order).all()  # type: ignore[union-attr]
            ]
        return data


class ExerciseDefinition(Base):
    """Exercise definition model (exercise library/templates).

    Represents a definition for an exercise.
    Each definition can be instantiated multiple times
    as actual exercise instances.

    Attributes:
        id: Primary key identifier.
        title: Unique name/title of the exercise.
        description: Detailed description of how to perform the exercise.
        date_created: Timestamp when the exercise definition was created.
        user_id: Foreign key reference to the user who created this definition.
        exercise: Relationship to actual exercise instances based on this definition.
    """

    __tablename__ = "exercises"
    __table_args__: Any = (
        db.UniqueConstraint("title", "user_id", name="uq_exercise_title_user"),
        {},
    )

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(80), index=True)
    description = db.Column(db.Text, nullable=True)
    counting_type = db.Column(
        db.String(10), nullable=False, default="reps", server_default="reps"
    )  # default=reps is only python-sid. server_default avoids row getting NULL
    date_created = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    archived = db.Column(db.Boolean, nullable=False, default=False)

    # Relationships to actual exercise instances
    exercise = db.relationship(
        "Exercise", backref="exercise_definition", lazy="dynamic"
    )

    # Ordered list of user-defined progression levels for this exercise
    progression_levels = db.relationship(
        "ProgressionLevel",
        backref="exercise_definition",
        cascade="all, delete-orphan",
        order_by="ProgressionLevel.level_order",
        lazy="dynamic",
    )

    # Categories this exercise belongs to (many-to-many, global)
    categories = db.relationship(
        "ExerciseCategory",
        secondary=exercise_categories,
        backref=db.backref("exercise_definitions", lazy="dynamic"),
        lazy="subquery",
    )

    def __init__(
        self,
        title: str | None = None,
        description: str | None = None,
        user_id: int | None = None,
        date_created: datetime | None = None,
        archived: bool = False,
        counting_type: str = "reps",
    ) -> None:
        """Initialize an ExerciseDefinition instance.

        Args:
            title: Unique name/title of the exercise (max 80 characters).
            description: Detailed description of the exercise.
            user_id: ID of the user creating this exercise definition.
            date_created: Timestamp when the exercise definition was created.
            counting_type: How sets are counted - "reps" or "duration".

        Example:
            >>> exercise_def = ExerciseDefinition(
            ...     title="Push-ups",
            ...     description="Standard push-up exercise",
            ...     user_id=1
            ... )
        """
        self.title = title
        self.description = description
        self.user_id = user_id
        self.archived = archived
        self.counting_type = counting_type
        if date_created is not None:
            self.date_created = date_created

    def __repr__(self) -> str:
        """String representation of Exercise definition."""
        return f"<ExerciseDefinition {self.title}>"

    def to_dict(self) -> dict[str, Any]:
        """Serialize exercise definition to dictionary for API responses."""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "counting_type": self.counting_type,
            "date_created": (
                self.date_created.isoformat() if self.date_created else None
            ),
            "user_id": self.user_id,
            "archived": self.archived,
            "progression_levels": [
                pl.to_dict() for pl in self.progression_levels.all()
            ],
            "category_ids": [c.id for c in self.categories],
        }


class Exercise(Base):
    """Exercise instance within a workout."""

    __tablename__ = "exercise"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    exercise_order = db.Column(db.Integer, nullable=False)
    workout_id = db.Column(db.Integer, db.ForeignKey("workout.id"), nullable=False)
    exercise_definition_id = db.Column(db.Integer, db.ForeignKey("exercises.id"))

    # Relationship to sets in this exercise
    sets = db.relationship(
        "Set", backref="exercise", cascade="all, delete-orphan", lazy="dynamic"
    )

    def __init__(
        self,
        exercise_order: int,
        workout_id: int,
        exercise_definition_id: int | None = None,
    ) -> None:
        """Initialize an exercise instance within a workout."""
        self.exercise_order = exercise_order
        self.workout_id = workout_id
        self.exercise_definition_id = exercise_definition_id

    def __repr__(self) -> str:
        """String representation of Exercise instance."""
        return f"<Exercise {self.id}: Order {self.exercise_order}>"

    def to_dict(self, include_sets: bool = False) -> dict[str, Any]:
        """Serialize exercise instance to dictionary for API responses."""
        data: dict[str, Any] = {
            "id": self.id,
            "exercise_order": self.exercise_order,
            "workout_id": self.workout_id,
            "exercise_definition_id": self.exercise_definition_id,
        }
        if include_sets:
            data["sets"] = [
                s.to_dict() for s in self.sets.order_by(Set.set_order).all()  # type: ignore[union-attr]
            ]
        return data


class Set(Base):
    """Set model representing a single set within an exercise."""

    __tablename__ = "exercise_sets"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    set_order = db.Column(db.Integer, nullable=False)
    progression = db.Column(db.String(80), index=True)
    reps = db.Column(db.Integer)
    duration = db.Column(db.Integer)
    exercise_id = db.Column(db.Integer, db.ForeignKey("exercise.id"), nullable=False)

    def __init__(
        self,
        set_order: int,
        exercise_id: int,
        progression: str | None = None,
        reps: int | None = None,
        duration: int | None = None,
    ) -> None:
        """Initialize a set with an exercise."""
        self.set_order = set_order
        self.exercise_id = exercise_id
        self.progression = progression
        self.reps = reps
        self.duration = duration

    @property
    def duration_formatted(self) -> str:
        """Format duration in seconds as mm:ss."""
        if self.duration is None:
            return "00:00"
        minutes = self.duration // 60
        seconds = self.duration % 60
        return f"{minutes:02d}:{seconds:02d}"

    def __repr__(self) -> str:
        """String representation of Set."""
        return f"<Set {self.id}: {self.reps} reps>"

    def to_dict(self) -> dict[str, Any]:
        """Serialize set to dictionary for API responses."""
        return {
            "id": self.id,
            "set_order": self.set_order,
            "progression": self.progression,
            "reps": self.reps,
            "duration": self.duration,
            "duration_formatted": self.duration_formatted,
        }


class ProgressionLevel(Base):
    """A named progression level belonging to an ExerciseDefinition.

    Users define these on their exercise definitions so that when
    logging a workout they can pick a level from a dropdown instead
    of typing free-form text.
    """

    __tablename__ = "progression_levels"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    exercise_definition_id = db.Column(
        db.Integer, db.ForeignKey("exercises.id"), nullable=False
    )
    name = db.Column(db.String(80), nullable=False)
    level_order = db.Column(db.Integer, nullable=False)

    def __init__(
        self,
        exercise_definition_id: int,
        name: str,
        level_order: int,
    ) -> None:
        """Initialize a progression level."""
        self.exercise_definition_id = exercise_definition_id
        self.name = name
        self.level_order = level_order

    def __repr__(self) -> str:
        """String representation of ProgressionLevel."""
        return f"<ProgressionLevel {self.name} (order {self.level_order})>"

    def to_dict(self) -> dict[str, Any]:
        """Serialize progression level to dictionary for API responses."""
        return {
            "id": self.id,
            "name": self.name,
            "level_order": self.level_order,
        }


class ExerciseCategory(Base):
    """Global category for exercise definitions (e.g. 'Upper Body', 'Push').

    Categories are shared across all users to provide a consistent vocabulary
    for filtering exercises in the library and workout forms.
    """

    __tablename__ = "exercise_category"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False, unique=True, index=True)

    def __init__(self, name: str) -> None:
        """Initialize an exercise category."""
        self.name = name

    def __repr__(self) -> str:
        """String representation of ExerciseCategory."""
        return f"<ExerciseCategory {self.name}>"

    def to_dict(self) -> dict[str, Any]:
        """Serialize category to dictionary for API responses."""
        return {
            "id": self.id,
            "name": self.name,
        }


class Message(Base):
    """Message model for user-to-user messaging."""

    __tablename__ = "message"

    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    recipient_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    body = db.Column(db.String(140))
    timestamp = db.Column(
        db.DateTime, index=True, default=lambda: datetime.now(timezone.utc)
    )

    def __init__(
        self,
        sender_id: int,
        recipient_id: int,
        body: str | None = None,
        timestamp: datetime | None = None,
    ) -> None:
        """Initialize a message between users."""
        self.sender_id = sender_id
        self.recipient_id = recipient_id
        self.body = body
        if timestamp is not None:
            self.timestamp = timestamp

    def __repr__(self) -> str:
        """String representation of Message."""
        return f"<Message {self.body}>"

    def to_dict(self) -> dict[str, Any]:
        """Serialize message to dictionary for API responses."""
        return {
            "id": self.id,
            "sender_id": self.sender_id,
            "recipient_id": self.recipient_id,
            "body": self.body,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }


class Notification(Base):
    """Notification model for user notifications."""

    __tablename__ = "notification"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    timestamp = db.Column(db.Float, index=True, default=lambda: time())
    payload_json = db.Column(db.Text)

    # Constructo for add_notification
    def __init__(
        self,
        name: str,
        user: "User",
        payload_json: str | None = None,
        timestamp: float | None = None,
    ) -> None:
        self.name = name
        self.user = user
        self.payload_json = payload_json
        if timestamp is not None:
            self.timestamp = timestamp

    def get_data(self) -> dict[str, Any]:
        """Parse and return the JSON payload."""
        return json.loads(str(self.payload_json))  # type: ignore[no-any-return]

    def __repr__(self) -> str:
        """String representation of Notification."""
        return f"<Notification {self.name}>"

    def to_dict(self) -> dict[str, Any]:
        """Serialize notification to dictionary for API responses."""
        return {
            "id": self.id,
            "name": self.name,
            "timestamp": self.timestamp,
            "data": self.get_data() if self.payload_json else None,
        }
