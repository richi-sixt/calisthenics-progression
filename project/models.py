"""Database models for calisthenics-progression."""

from __future__ import annotations

from datetime import datetime, timezone
from time import time
import json
from typing import Any

from flask_login import UserMixin
from sqlalchemy.orm import Query
from werkzeug.security import generate_password_hash, check_password_hash

from project import db, login

# Followers association table for many-to-many relationship
followers = db.Table(
    "followers",
    db.Column("follower_id", db.Integer, db.ForeignKey("user.id")),
    db.Column("followed_id", db.Integer, db.ForeignKey("user.id")),
)


class User(UserMixin, db.Model):
    """User model for authentication and profile management."""

    # Primary fields
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True)
    email = db.Column(db.String(120), index=True, unique=True)
    password_hash = db.Column(db.String(128))

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
        return self.followed.filter(followers.c.followed_id == user.id).count() > 0

    def followed_workouts(self) -> Query:
        """Get workouts from followed users and own workouts."""
        followed = Workout.query.join(
            followers, (followers.c.followed_id == Workout.user_id)
        ).filter(followers.c.follower_id == self.id)

        own = Workout.query.filter_by(user_id=self.id)

        return followed.union(own).order_by(Workout.timestamp.desc()) # type: ignore[union-attr]

    def new_messages(self) -> int:
        """Count unread messages since last read time."""
        last_read_time = self.last_message_read_time or datetime(
            1900, 1, 1, tzinfo=timezone.utc
        )
        return (
            Message.query.filter_by(recipient_id=self.id)
            # SQLAlchemy's __eq__, __gt__, __ne__ operators
            # return ColumnElement[bool] at runtime,
            # but pyright sees them as plain bool.
            .filter(Message.timestamp > last_read_time)  # type: ignore[arg-type]
            .count()
        )

    def add_notification(self, name: str, data: dict) -> Notification:
        """Add or update a notification for this user."""
        self.notifications.filter_by(name=name).delete()
        n = Notification(name=name, user=self)
        n.payload_json = json.dumps(data)
        db.session.add(n)
        return n


# Load user for session
@login.user_loader
def load_user(id: str) -> User | None:
    """Load user for Flask-Login session management."""
    return db.session.get(User, int(id))


class Workout(db.Model):
    """Workout model representing a training session."""

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(80), index=True)
    timestamp = db.Column(
        db.DateTime, index=True, default=lambda: datetime.now(timezone.utc)
    )
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))

    # Relationships to exercises in this workout
    exercises = db.relationship(
        "Exercise", backref="workout", cascade="all, delete-orphan", lazy="dynamic"
    )

    def __init__(
        self,
        title: str,
        user_id: int,
        timestamp: datetime | None = None,
    ) -> None:
        """Initialize a workout session."""
        self.title = title
        self.user_id = user_id
        if timestamp is not None:  # has a default
            self.timestamp = timestamp

    def __repr__(self) -> str:
        """String representation of Workout."""
        return f"<Workout {self.title}>"


class ExerciseDefinition(db.Model):
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
    __table_args__ = (
        db.UniqueConstraint("title", "user_id", name="uq_exercise_title_user"),
        {},
    )

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(80), index=True)
    description = db.Column(db.Text, nullable=False)
    date_created = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    archived = db.Column(db.Boolean, nullable=False, default=False)

    # Relationships to actual exercise instances
    exercise = db.relationship(
        "Exercise", backref="exercise_definition", lazy="dynamic"
    )


    def __init__(
        self,
        title: str | None = None,
        description: str | None = None,
        user_id: int | None = None,
        date_created: datetime | None = None,
        archived: bool = False,
    ) -> None:
        """Initialize an ExerciseDefinition instance.

        Args:
            title: Unique name/title of the exercise (max 80 characters).
            description: Detailed description of the exercise.
            user_id: ID of the user creating this exercise definition.
            date_created: Timestamp when the exercise definition was created.
            **kwargs: Additional keyword arguments passed to the parent Model class.

        Example:
            >>> exercise_def = ExerciseDefinition(
            ...     title="Push-ups",
            ...     description="Standard push-up exercise",
            ...     user_id=1
            ... )
        """

        """Initialize ExerciseDefinition."""
        self.title = title
        self.description = description
        self.user_id = user_id
        self.archived = archived
        if date_created is not None:
            self.date_created = date_created

    def __repr__(self) -> str:
        """String representation of Exercise definition."""
        return f"<ExerciseDefinition {self.title}>"


class Exercise(db.Model):
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


class Set(db.Model):
    """Set model representing a single set within an exercise."""

    __tablename__ = "exercise_sets"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    set_order = db.Column(db.Integer, nullable=False)
    progression = db.Column(db.String(80), index=True)
    reps = db.Column(db.Integer)
    exercise_id = db.Column(db.Integer, db.ForeignKey("exercise.id"), nullable=False)

    def __init__(
        self,
        set_order: int,
        exercise_id: int,
        progression: str | None = None,
        reps: int | None = None,
    ) -> None:
        """Initialize a set with an exercise."""
        self.set_order = set_order
        self.exercise_id = exercise_id
        self.progression = progression
        self.reps = reps

    def __repr__(self) -> str:
        """String representation of Set."""
        return f"<Set {self.id}: {self.reps} reps>"


class Message(db.Model):
    """Message model for user-to-user messaging."""

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


class Notification(db.Model):
    """Notification model for user notifications."""

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
        return json.loads(str(self.payload_json))

    def __repr__(self) -> str:
        """String representation of Notification."""
        return f"<Notification {self.name}>"
