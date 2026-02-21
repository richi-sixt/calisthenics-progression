"""Utility functions for sending emails asynchronously."""
from threading import Thread
from typing import Sequence

from flask import current_app
from flask_mail import Message

from project import mail


def send_async_email(app, msg: Message) -> None:
    """Send an email inside the given Flask application context."""
    with app.app_context():
        try:
            mail.send(msg)
            app.logger.info(
                "Email sent to %s | subject: %s | server: %s:%s | tls=%s ssl=%s",
                msg.recipients,
                msg.subject,
                app.config.get("MAIL_SERVER"),
                app.config.get("MAIL_PORT"),
                app.config.get("MAIL_USE_TLS"),
                app.config.get("MAIL_USE_SSL"),
            )
        except Exception:
            app.logger.exception(
                "Failed to send email to %s | subject: %s | server: %s:%s | tls=%s ssl=%s",
                msg.recipients,
                msg.subject,
                app.config.get("MAIL_SERVER"),
                app.config.get("MAIL_PORT"),
                app.config.get("MAIL_USE_TLS"),
                app.config.get("MAIL_USE_SSL"),
            )


def send_email(
    to: str | Sequence[str],
    subject: str,
    template: str,
    sender: str | None = None,
) -> None:
    """Create and send an email message asynchronously in a background thread."""
    recipients = [to] if isinstance(to, str) else list(to)
    from_addr = sender or current_app.config.get(
        "MAIL_DEFAULT_SENDER",
        "noreply@example.com"
    )
    msg = Message(
        subject=subject,
        sender=from_addr,
        recipients=list(recipients),
        html=template,
    )

    app = current_app._get_current_object()
    Thread(
        target=send_async_email,
        args=(app, msg),
        daemon=True,
    ).start()

