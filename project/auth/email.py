"""Utility functions for sending emails."""

from collections.abc import Sequence

from flask import current_app
from flask_mail import Message

from project import mail


def send_email(
    to: str | Sequence[str],
    subject: str,
    template: str,
    sender: str | None = None,
) -> None:
    """
    Send an email using Flask-Mail.
    
    Args:
        to: Recipient email address(es)
        subject: Email subject line
        template: HTML content for email body
        sender: Optional sender address (uses default if None)
    """
    # Normalize recipient(s) to list
    recipients = [to] if isinstance(to, str) else list(to)
    
    # Use provided sender or fall back to config default
    from_addr = sender or current_app.config.get(
        "MAIL_DEFAULT_SENDER",
        "noreply@example.com"
    )
    
    msg = Message(
        subject=subject,
        recipients=list(recipients),
        html=template,
        sender=from_addr,
    )
    
    mail.send(msg)
