"""Utility functions for sending emails asynchronously."""
from threading import Thread
from typing import Sequence

from flask import current_app
from flask_mail import Message

from project import mail


def send_async_email(app, msg: Message) -> None:
    """Send an email inside the given Flask application context."""
    with app.app_context():
        mail.send(msg)


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

