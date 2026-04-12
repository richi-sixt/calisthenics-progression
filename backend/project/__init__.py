import logging
import os
from logging.handlers import RotatingFileHandler, SMTPHandler
from typing import Type

from flask import Flask
from flask_bootstrap import Bootstrap5
from flask_cors import CORS
from flask_login import LoginManager
from flask_mail import Mail
from flask_migrate import Migrate
from flask_moment import Moment
from flask_sqlalchemy import SQLAlchemy
from project.config import Config
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Initialize Flask extensions without app binding
db = SQLAlchemy(model_class=Base)
migrate = Migrate()
login = LoginManager()
mail = Mail()
bootstrap = Bootstrap5()
moment = Moment()


def create_app(config_class: Type[Config] = Config) -> Flask:
    """
    Application factory for creating Flask app instances.

    Args:
        config_class: Configuration class (defaults to Config)

    Returns:
        Configured Flask application instance
    """
    app = Flask(__name__)
    app.config.from_object(config_class)
    app.secret_key = app.config["SECRET_KEY"]

    # Initialize extensions with app context
    db.init_app(app)
    migrate.init_app(app, db)
    login.init_app(app)
    mail.init_app(app)
    bootstrap.init_app(app)
    moment.init_app(app)

    # Configure Flask-Login after init_app
    login.login_view = "auth.login"  # type: ignore[assignment]
    login.login_message = "Du musst angemeldet sein, um diese Seite zu sehen."

    # Register blueprints
    from project.errors import bp as errors_bp

    app.register_blueprint(errors_bp)

    from project.auth import bp as auth_bp

    app.register_blueprint(auth_bp, url_prefix="/auth")

    from project.main import bp as main_bp

    app.register_blueprint(main_bp)

    from project.api import bp as api_bp

    app.register_blueprint(api_bp, url_prefix="/api/v1")

    # Enable CORS for API routes only
    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    # Configure logging (production only)
    if not app.debug and not app.testing:
        _configure_logging(app)

    app.logger.setLevel(logging.INFO)
    app.logger.info("Calisthenics-Progression startup")

    # Import models for Flask-Migrate
    from project import models  # noqa: F401 # type: ignore[import]

    return app


def _configure_logging(app: Flask) -> None:
    """
    Configure production logging (email alerts + file/stdout).

    Args:
        app: Flask application instance
    """
    # Email error logging
    if app.config.get("MAIL_SERVER"):
        auth = None
        if app.config.get("MAIL_USERNAME") or app.config.get("MAIL_PASSWORD"):
            auth = (app.config["MAIL_USERNAME"], app.config["MAIL_PASSWORD"])

        secure = () if app.config.get("MAIL_USE_TLS") else None

        mail_handler = SMTPHandler(
            mailhost=(app.config["MAIL_SERVER"], app.config["MAIL_PORT"]),
            fromaddr=f"no-reply@{app.config['MAIL_SERVER']}",
            toaddrs=app.config["ADMINS"],
            subject="Calisthenics-Progression Failure",
            credentials=auth,
            secure=secure,
        )
        mail_handler.setLevel(logging.ERROR)
        app.logger.addHandler(mail_handler)

    # Console or file logging
    if app.config.get("LOG_TO_STDOUT"):
        stream_handler = logging.StreamHandler()
        stream_handler.setLevel(logging.INFO)
        app.logger.addHandler(stream_handler)

    else:
        # Ensure logs directory exists
        logs_dir = os.path.join(
            os.path.abspath(os.path.dirname(__file__)), "..", "logs"
        )
        os.makedirs(logs_dir, exist_ok=True)

        file_handler = RotatingFileHandler(
            os.path.join(logs_dir, "calisthenics-progression.log"),
            maxBytes=10240,
            backupCount=10,
            encoding="utf-8",
        )
        file_handler.setFormatter(
            logging.Formatter(
                "%(asctime)s %(levelname)s: %(message)s " "[in %(pathname)s:%(lineno)d]"
            )
        )
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
