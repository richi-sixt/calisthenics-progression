"""Unit tests for token generation and validation."""

import time

import pytest

from project.token import generate_confirmation_token, confirm_token


class TestTokenGeneration:
    """Tests for token generation."""

    def test_generate_token(self, app):
        """Test that token generation returns a string."""
        with app.app_context():
            token = generate_confirmation_token("test@example.com")
            assert token is not None
            assert isinstance(token, str)
            assert len(token) > 0

    def test_generate_different_tokens_for_different_emails(self, app):
        """Test that different emails get different tokens."""
        with app.app_context():
            token1 = generate_confirmation_token("user1@example.com")
            token2 = generate_confirmation_token("user2@example.com")
            assert token1 != token2


class TestTokenConfirmation:
    """Tests for token confirmation."""

    def test_confirm_valid_token(self, app):
        """Test confirming a valid token returns the email."""
        with app.app_context():
            email = "test@example.com"
            token = generate_confirmation_token(email)
            confirmed_email = confirm_token(token)
            assert confirmed_email == email

    def test_confirm_invalid_token(self, app):
        """Test that an invalid token returns False."""
        with app.app_context():
            result = confirm_token("invalid-token-string")
            assert result is False

    def test_confirm_tampered_token(self, app):
        """Test that a tampered token returns False."""
        with app.app_context():
            token = generate_confirmation_token("test@example.com")
            # Tamper with the token
            tampered = token[:-5] + "xxxxx"
            result = confirm_token(tampered)
            assert result is False

    def test_confirm_expired_token(self, app):
        """Test that an expired token returns False."""
        with app.app_context():
            token = generate_confirmation_token("test@example.com")
            # Wait longer than expiration window
            time.sleep(2)
            result = confirm_token(token, expiration=1)
            assert result is False

    def test_token_expiration_boundary(self, app):
        """Test token near expiration boundary."""
        with app.app_context():
            token = generate_confirmation_token("test@example.com")
            # Should be valid with default expiration (3600 seconds)
            result = confirm_token(token, expiration=3600)
            assert result == "test@example.com"

    def test_empty_email_token(self, app):
        """Test token generation and confirmation with empty email."""
        with app.app_context():
            token = generate_confirmation_token("")
            result = confirm_token(token)
            assert result == ""
