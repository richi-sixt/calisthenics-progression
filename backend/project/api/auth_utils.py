"""Supabase JWT authentication utilities for the API blueprint."""

from __future__ import annotations

import logging
from functools import wraps
from typing import Any, Callable

import jwt
from flask import current_app, g, jsonify, request
from project import db
from project.models import User
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)


def _verify_supabase_jwt(token: str) -> dict[str, Any] | None:
    """Verify a Supabase-issued JWT and return the payload, or None on failure.

    Supabase JWTs use HS256 with the project's JWT secret and contain:
    - sub: Supabase user UUID
    - email: user's email
    - email_confirmed_at: ISO timestamp or None
    - aud: "authenticated"
    """
    secret = current_app.config.get("SUPABASE_JWT_SECRET")
    if not secret:
        logger.error("SUPABASE_JWT_SECRET not configured")
        return None

    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def _get_or_create_user(payload: dict[str, Any]) -> User | None:
    """Look up or auto-create a Flask User from a verified Supabase JWT payload.

    Maps the Supabase UUID (sub) to a local User via supabase_uid.
    Auto-creates a new User on first API hit from a new Supabase user.
    Syncs email and confirmed status from the JWT on every request.
    """
    supabase_uid = payload.get("sub")
    if not supabase_uid:
        return None

    email = payload.get("email", "")
    confirmed = payload.get("email_confirmed_at") is not None

    # Look up existing user by supabase_uid
    user = db.session.execute(
        db.select(User).filter_by(supabase_uid=supabase_uid)
    ).scalar_one_or_none()

    if user is not None:
        # Sync email and confirmed status from Supabase
        changed = False
        if email and user.email != email:
            user.email = email
            changed = True
        if user.confirmed != confirmed:
            user.confirmed = confirmed
            changed = True
        if changed:
            db.session.commit()
        return user

    # Auto-create new user on first API hit
    # Use email prefix as initial username, ensure uniqueness
    base_username = email.split("@")[0] if email else f"user_{supabase_uid[:8]}"
    username = base_username

    # Check for username collision and make unique
    suffix = 1
    while (
        db.session.execute(
            db.select(User).filter_by(username=username)
        ).scalar_one_or_none()
        is not None
    ):
        username = f"{base_username}_{suffix}"
        suffix += 1

    try:
        user = User(
            username=username,
            email=email,
            admin=False,
            confirmed=confirmed,
        )
        user.supabase_uid = supabase_uid
        db.session.add(user)
        db.session.commit()
        logger.info("Auto-created user %s for Supabase UID %s", username, supabase_uid)
        return user
    except IntegrityError:
        # Race condition: another request created this user simultaneously
        db.session.rollback()
        return db.session.execute(
            db.select(User).filter_by(supabase_uid=supabase_uid)
        ).scalar_one_or_none()


def _get_current_api_user() -> User | None:
    """Extract and validate the Bearer token from the Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header[7:]
    payload = _verify_supabase_jwt(token)
    if payload is None:
        return None

    return _get_or_create_user(payload)


def api_login_required(f: Callable[..., Any]) -> Callable[..., Any]:
    """Decorator that requires a valid Supabase JWT Bearer token."""

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
