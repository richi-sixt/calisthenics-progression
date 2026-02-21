"""Unit tests for project/email.py async email sending."""

from unittest.mock import patch, MagicMock

from project.email import send_email, send_async_email


class TestSendEmail:
    """Tests for the send_email utility function."""

    def test_send_email_creates_message_and_starts_thread(self, app):
        """Test that send_email creates a Message and starts a daemon Thread."""
        with app.app_context():
            with patch("project.email.Thread") as mock_thread_cls:
                mock_thread = MagicMock()
                mock_thread_cls.return_value = mock_thread

                send_email(
                    to="recipient@example.com",
                    subject="Test Subject",
                    template="<p>html</p>",
                    sender="sender@example.com",
                )

                mock_thread_cls.assert_called_once()
                call_kwargs = mock_thread_cls.call_args
                assert call_kwargs.kwargs["daemon"] is True
                mock_thread.start.assert_called_once()

    def test_send_async_email_sends_within_app_context(self, app):
        """Test that send_async_email calls mail.send inside app context."""
        with patch("project.email.mail") as mock_mail:
            msg = MagicMock()
            send_async_email(app, msg)
            mock_mail.send.assert_called_once_with(msg)
