"""JWT authentication utilities for the API blueprint."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from functools import wraps
from typing import Any, Callable

import jwt
from flask import current_app, g, jsonify, request
from project import db
from project.models import User


def generate_api_token(user_id: int) -> str:
    """Create a JWT token for the given user.

    Args:
        user_id: The user's primary key.

    Returns:
        Encoded JWT string.
    """
    expiry_hours = current_app.config.get("JWT_EXPIRY_HOURS", 24)
    payload = {
        "sub": str(user_id),
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=expiry_hours),
    }
    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")


def decode_api_token(token: str) -> int | None:
    """Decode a JWT token and return the user_id, or None on failure."""
    try:
        payload = jwt.decode(
            token, current_app.config["SECRET_KEY"], algorithms=["HS256"]
        )
        sub = payload.get("sub")
        return int(sub) if sub is not None else None
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def _get_current_api_user() -> User | None:
    """Extract and validate the Bearer token from the Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header[7:]
    user_id = decode_api_token(token)
    if user_id is None:
        return None

    return db.session.get(User, user_id)


def api_login_required(f: Callable[..., Any]) -> Callable[..., Any]:
    """Decorator that requires a valid JWT Bearer token."""

    @wraps(f)
    def decorated(*args: Any, **kwargs: Any) -> Any:
        user = _get_current_api_user()
        if user is None:
            return jsonify({"error": "Authentication required."}), 401
        g.current_api_user = user
        return f(*args, **kwargs)

    return decorated


def api_check_confirmed(f: Callable[..., Any]) -> Callable[..., Any]:
    """Decorator that requires the authenticated user's email to be confirmed.

    Must be used after @api_login_required.
    """

    @wraps(f)
    def decorated(*args: Any, **kwargs: Any) -> Any:
        if not g.current_api_user.confirmed:
            return jsonify({"error": "Email confirmation required."}), 403
        return f(*args, **kwargs)

    return decorated
