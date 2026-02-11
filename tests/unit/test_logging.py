"""Unit tests for production logging configuration in project/__init__.py."""

import logging
from logging.handlers import RotatingFileHandler, SMTPHandler
from unittest.mock import patch

from project import create_app
from tests.test_config import TestConfig


class ProductionConfig(TestConfig):
    """Config that triggers _configure_logging (non-debug, non-testing)."""
    TESTING = False
    DEBUG = False
    MAIL_SERVER = None
    LOG_TO_STDOUT = None


class TestConfigureLogging:
    """Tests for the _configure_logging function."""

    def test_logging_with_mail_server(self):
        """Test that SMTPHandler is added when MAIL_SERVER is configured."""
        class MailConfig(ProductionConfig):
            MAIL_SERVER = "smtp.example.com"
            MAIL_PORT = 587
            MAIL_USE_TLS = True
            MAIL_USERNAME = "user"
            MAIL_PASSWORD = "pass"
            ADMINS = ["admin@example.com"]

        app = create_app(MailConfig)
        handler_types = [type(h) for h in app.logger.handlers]
        assert SMTPHandler in handler_types

    def test_logging_to_stdout(self):
        """Test that StreamHandler is added when LOG_TO_STDOUT is set."""
        class StdoutConfig(ProductionConfig):
            LOG_TO_STDOUT = True

        app = create_app(StdoutConfig)
        handler_types = [type(h) for h in app.logger.handlers]
        assert logging.StreamHandler in handler_types

    @patch("project.os.makedirs")
    def test_logging_to_file(self, mock_makedirs):
        """Test that RotatingFileHandler is added by default."""
        app = create_app(ProductionConfig)
        handler_types = [type(h) for h in app.logger.handlers]
        assert RotatingFileHandler in handler_types
        mock_makedirs.assert_called_once_with("logs", exist_ok=True)
