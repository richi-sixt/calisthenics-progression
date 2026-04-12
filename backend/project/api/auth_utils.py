"""Supabase JWT authentication utilities for the API blueprint."""

from __future__ import annotations

import logging
from functools import wraps
from typing import Any, Callable

import jwt
from flask import current_app, g, jsonify, request
from jwt import PyJWKClient
from project import db
from project.models import User
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)

# Cached JWKS client (singleton per process)
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient | None:
    """Get or create a cached JWKS client for Supabase ES256 verification."""
    global _jwks_client
    if _jwks_client is not None:
        return _jwks_client

    supabase_url = current_app.config.get("SUPABASE_URL")
    if not supabase_url:
        return None

    jwks_url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_client


def _verify_supabase_jwt(token: str) -> dict[str, Any] | None:
    """Verify a Supabase-issued JWT and return the payload, or None on failure.

    Supports both:
    - HS256: legacy Supabase JWTs signed with the project's JWT secret
    - ES256: new Supabase JWTs signed with asymmetric keys (JWKS)

    JWT payload contains:
    - sub: Supabase user UUID
    - email: user's email
    - email_confirmed_at: ISO timestamp or None (HS256)
    - user_metadata.email_verified: boolean (ES256)
    - aud: "authenticated"
    """
    # Peek at the algorithm in the header without verifying
    try:
        header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError:
        return None

    alg = header.get("alg", "")

    if alg == "HS256":
        return _verify_hs256(token)
    elif alg.startswith("ES"):
        return _verify_es256(token)
    else:
        logger.warning("Unsupported JWT algorithm: %s", alg)
        return None


def _verify_hs256(token: str) -> dict[str, Any] | None:
    """Verify a legacy HS256-signed Supabase JWT."""
    secret = current_app.config.get("SUPABASE_JWT_SECRET")
    if not secret:
        logger.error("SUPABASE_JWT_SECRET not configured")
        return None

    try:
        return jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def _verify_es256(token: str) -> dict[str, Any] | None:
    """Verify an ES256-signed Supabase JWT using JWKS public keys."""
    jwks_client = _get_jwks_client()
    if jwks_client is None:
        logger.error("SUPABASE_URL not configured — cannot verify ES256 JWT")
        return None

    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError as e:
        logger.warning("ES256 JWT verification failed: %s", e)
        return None
    except Exception as e:
        logger.error("JWKS key fetch failed: %s", e)
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

    # Supabase ES256 JWTs no longer include email_confirmed_at at the top level.
    # Check multiple locations for email confirmation status.
    user_meta = payload.get("user_metadata") or {}
    app_meta = payload.get("app_metadata") or {}

    confirmed = (
        payload.get("email_confirmed_at") is not None
        or user_meta.get("email_verified") is True
        or app_meta.get("email_verified") is True
        # If the user passed email OTP/link, amr contains "email" factor
        or any(f.get("method") == "otp" for f in payload.get("amr", []))
    )

    logger.debug("JWT confirmed=%s", confirmed)

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
