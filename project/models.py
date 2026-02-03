"""Database models for calisthenics-progression."""

from datetime import datetime, timezone
from time import time
import json

from flask_login import UserMixin
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
    image_file = db.Column(
        db.String(20), 
        nullable=False,
        default="default.jpg"
    )

    # Timestamp fields - using timezone-aware UTC
    last_seen = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )
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
    workouts = db.relationship(
        "Workout",
        backref="athlet",
        lazy="dynamic"
    )
    exercises = db.relationship(
        "Exercises",
        backref="athlet",
        lazy="dynamic"
    )

    # Relationships Messaging
    messages_sent = db.relationship(
        "Message",
        foreign_keys="Message.sender_id",
        backref="athlet",
        lazy="dynamic"
    )
    messages_received = db.relationship(
        "Message",
        foreign_keys="Message.recipient_id",
        backref="recipient",
        lazy="dynamic",
    )

    # Relationships - Notifications
    notifications = db.relationship(
        "Notification",
        backref="user",
        lazy="dynamic"
    )

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

    def __repr__(self):
        """String representation of User."""
        return f"<User {self.username}>"

    def set_password(self, password):
        """Hash and set the user's password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verify the user's password."""
        return check_password_hash(self.password_hash, password)

    # Following methods
    def follow(self, user):
        """Follow another user if not already following."""
        if not self.is_following(user):
            self.followed.append(user)

    def unfollow(self, user):
        """Unfollow a user if currently following."""
        if self.is_following(user):
            self.followed.remove(user)

    def is_following(self, user):
        """Check if this user is following another user."""
        return self.followed.filter(followers.c.followed_id == user.id).count() > 0

    def followed_workouts(self):
        """Get workouts from followed users and own workouts."""
        followed = Workout.query.join(
            followers,
            (followers.c.followed_id == Workout.user_id)
        ).filter(followers.c.follower_id == self.id)

        own = Workout.query.filter_by(user_id=self.id)

        return followed.union(own).order_by(Workout.timestamp.desc())

    def new_messages(self):
        """Count unread messages since last read time."""
        last_read_time = (
                self.last_message_read_time
                or datetime(1900, 1, 1, tzinfo=timezone.utc)
        )
        return (
            Message.query.filter_by(recipient=self)
            .filter(Message.timestamp > last_read_time)
            .count()
        )

    def add_notification(self, name, data):
        """Add or update a notification for this user."""
        self.notifications.filter_by(name=name).delete()
        n = Notification(name=name, user=self)
        n.payload_json = json.dumps(data)
        db.session.add(n)
        return n


# Load user for session
@login.user_loader
def load_user(id):
    """Load user for Flask-Login session management."""
    return User.query.get(int(id))


class Workout(db.Model):
    """Workout model representing a training session."""

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(80), index=True)
    timestamp = db.Column(
        db.DateTime,
        index=True,
        default=lambda: datetime.now(timezone.utc)
    )
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))

    # Relationships to exercises in this workout
    exercises = db.relationship(
        "Exercise",
        backref="workout",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )

    def __repr__(self):
        """String representation of Workout."""
        return f"<Workout {self.title}>"


class Exercises(db.Model):
    """Exercise definition model (exercise library/templates)."""

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(80), index=True, unique=True)
    description = db.Column(db.Text, nullable=False)
    date_created = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("user.id"),
        nullable=False
    )

    # Relationships to actual exercise instances
    exercise = db.relationship(
        "Exercise",
        backref="exercise_definition",
        lazy="dynamic"
    )

    def __repr__(self):
        """String representation of Exercise definition."""
        return f"<Exercises {self.title}>"


class Exercise(db.Model):
    """Exercise instance within a workout."""

    __tablename__ = "exercise"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    exercise_order = db.Column(db.Integer, nullable=False)
    workout_id = db.Column(
        db.Integer,
        db.ForeignKey("workout.id"),
        nullable=False
    )
    exercise2exercises_id = db.Column(
        db.Integer,
        db.ForeignKey("exercises.id")
    )

    # Relationship to sets in this exercise
    sets = db.relationship(
        "Set",
        backref="exercise",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )

    def __repr__(self):
        """String representation of Exercise instance."""
        return f"<Exercise {self.id}: Order {self.exercise_order}>"


class Set(db.Model):
    """Set model representing a single set within an exercise."""

    __tablename__ = "exercise_sets"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    set_order = db.Column(db.Integer, nullable=False)
    progression = db.Column(db.String(80), index=True)
    reps = db.Column(db.Integer)
    exercise_id = db.Column(
        db.Integer,
        db.ForeignKey("exercise.id"),
        nullable=False
    )

    def __repr__(self):
        """String representation of Set."""
        return f"<Set {self.id}: {self.reps} reps>"


class Message(db.Model):
    """Message model for user-to-user messaging."""

    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    recipient_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    body = db.Column(db.String(140))
    timestamp = db.Column(
        db.DateTime,
        index=True,
        default=lambda: datetime.now(timezone.utc)
    )

    def __repr__(self):
        """String representation of Message."""
        return f"<Message {self.body}>"


class Notification(db.Model):
    """Notification model for user notifications."""

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    timestamp = db.Column(db.Float, index=True, default=time)
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

    def get_data(self):
        """Parse and return the JSON payload."""
        return json.loads(str(self.payload_json))


    def __repr__(self):
        """String representation of Notification."""

        return f"<Notification {self.name}>"
