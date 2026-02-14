"""Test configuration for the Flask application."""


from project.config import Config

class TestConfig(Config):
    """Configuration for testing environment."""

    TESTING = True
    DEBUG = True

    # Use in-memory SQLite for fast, isolated tests
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Disable CSRF for form testing
    WTF_CSRF_ENABLED = False

    # Test-specific secret keys
    SECRET_KEY = "test-secret-key-do-not-use-in-production"
    WTF_CSRF_SECRET_KEY = "test-csrf-key"
    SECURITY_PASSWORD_SALT = "test-password-salt"

    # Suppress mail sending during tests
    MAIL_SUPPRESS_SEND = True
    MAIL_SERVER = "localhost"
    MAIL_PORT = 25
    MAIL_USE_TLS = False
    MAIL_USERNAME = None
    MAIL_PASSWORD = None
    MAIL_DEFAULT_SENDER = "test@example.com"

    # Pagination settings
    WORKOUTS_PER_PAGE = 10

    # Server name for url_for with _external=True
    SERVER_NAME = "localhost"
