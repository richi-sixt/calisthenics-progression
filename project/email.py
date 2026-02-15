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
    subject: str,
    sender: str,
    recipients: Sequence[str],
    text_body: str,
    html_body: str
) -> None:
    """Create and send an email message asynchronously."""
    msg = Message(
        subject=subject,
        sender=sender,
        recipients=list(recipients)
    )
    msg.body = text_body
    msg.html = html_body

    app = current_app
    Thread(
        target=send_async_email,
        args=(app, msg),
        daemon=True
    ).start()

