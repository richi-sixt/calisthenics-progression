from itsdangerous import (
    URLSafeTimedSerializer,
    SignatureExpired,
    BadSignature
)
from flask import current_app


def generate_confirmation_token(email):
    """Generate a confirmation token for the given email."""
    serializer = URLSafeTimedSerializer(
        current_app.config["SECRET_KEY"]
    )
    return serializer.dumps(
        email, 
        salt=current_app.config["SECURITY_PASSWORD_SALT"]
    )


def confirm_token(token, expiration=3600):
    """Confirm a token and return the email if valid."""
    serializer = URLSafeTimedSerializer(
        current_app.config["SECRET_KEY"]
    )
    try:
        email = serializer.loads(
            token, salt=current_app.config["SECURITY_PASSWORD_SALT"], 
            max_age=expiration
        )
    except (SignatureExpired, BadSignature):
        return False
    return email
