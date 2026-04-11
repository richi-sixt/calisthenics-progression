"""Integration tests for API authentication (Supabase JWT)."""

import json
import uuid
from datetime import datetime, timedelta, timezone

import jwt as pyjwt
from project.models import User
from tests.test_config import TestConfig


def _make_jwt(sub, email, confirmed=True, expired=False, audience="authenticated"):
    """Helper to build Supabase-shaped JWTs for test cases."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": sub,
        "email": email,
        "aud": audience,
        "role": "authenticated",
        "iat": now,
        "exp": now + timedelta(hours=-1 if expired else 1),
    }
    if confirmed:
        payload["email_confirmed_at"] = now.isoformat()
    else:
        payload["email_confirmed_at"] = None

    return pyjwt.encode(payload, TestConfig.SUPABASE_JWT_SECRET, algorithm="HS256")


class TestSupabaseJwtAuth:
    """Tests for Supabase JWT verification and user lookup."""

    def test_valid_jwt_existing_user(self, client, api_headers):
        """Existing user with valid JWT can access profile."""
        resp = client.get("/api/v1/auth/profile", headers=api_headers)
        assert resp.status_code == 200
        assert resp.get_json()["data"]["username"] == "testuser"

    def test_no_auth_header(self, client):
        """Request without Authorization header returns 401."""
        resp = client.get("/api/v1/auth/profile")
        assert resp.status_code == 401

    def test_invalid_token(self, client):
        """Invalid JWT returns 401."""
        resp = client.get(
            "/api/v1/auth/profile",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert resp.status_code == 401

    def test_expired_token(self, client, user, app):
        """Expired JWT returns 401."""
        with app.app_context():
            token = _make_jwt(user.supabase_uid, user.email, expired=True)
        resp = client.get(
            "/api/v1/auth/profile",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 401

    def test_wrong_audience(self, client, user, app):
        """JWT with wrong audience returns 401."""
        with app.app_context():
            token = _make_jwt(user.supabase_uid, user.email, audience="wrong-audience")
        resp = client.get(
            "/api/v1/auth/profile",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 401

    def test_wrong_secret(self, client, user, app):
        """JWT signed with wrong secret returns 401."""
        now = datetime.now(timezone.utc)
        token = pyjwt.encode(
            {
                "sub": user.supabase_uid,
                "email": user.email,
                "aud": "authenticated",
                "iat": now,
                "exp": now + timedelta(hours=1),
                "email_confirmed_at": now.isoformat(),
            },
            "wrong-secret",
            algorithm="HS256",
        )
        resp = client.get(
            "/api/v1/auth/profile",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 401


class TestAutoCreateUser:
    """Tests for auto-provisioning Flask User on first API hit."""

    def test_auto_create_on_first_hit(self, client, app):
        """New Supabase user gets a Flask User record auto-created."""
        new_uid = str(uuid.uuid4())
        token = _make_jwt(new_uid, "newuser@example.com", confirmed=True)

        resp = client.get(
            "/api/v1/auth/profile",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["email"] == "newuser@example.com"
        assert data["confirmed"] is True

        # Verify user was persisted
        with app.app_context():
            from project import db

            user = db.session.execute(
                db.select(User).filter_by(supabase_uid=new_uid)
            ).scalar_one_or_none()
            assert user is not None
            assert user.username == "newuser"

    def test_auto_create_username_from_email(self, client, app):
        """Auto-created username is derived from email prefix."""
        uid = str(uuid.uuid4())
        token = _make_jwt(uid, "john.doe@gmail.com", confirmed=True)

        resp = client.get(
            "/api/v1/auth/profile",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["username"] == "john.doe"

    def test_auto_create_username_collision(self, client, user, app):
        """Auto-created username gets suffix when email prefix matches existing user."""
        # user fixture has username "testuser", so create a new Supabase user
        # whose email prefix would collide
        uid = str(uuid.uuid4())
        token = _make_jwt(uid, "testuser@other.com", confirmed=True)

        resp = client.get(
            "/api/v1/auth/profile",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        # Should get "testuser_1" since "testuser" is taken
        assert resp.get_json()["data"]["username"] == "testuser_1"

    def test_auto_create_unconfirmed(self, client, app):
        """Auto-created user with unconfirmed email gets confirmed=False."""
        uid = str(uuid.uuid4())
        token = _make_jwt(uid, "unverified@example.com", confirmed=False)

        resp = client.get(
            "/api/v1/auth/profile",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["confirmed"] is False


class TestEmailSync:
    """Tests for syncing email and confirmed status from Supabase JWT."""

    def test_email_synced_from_jwt(self, client, user, app):
        """User email is updated when JWT has a different email."""
        with app.app_context():
            token = _make_jwt(user.supabase_uid, "updated@example.com", confirmed=True)

        resp = client.get(
            "/api/v1/auth/profile",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["email"] == "updated@example.com"

    def test_confirmed_synced_from_jwt(self, client, unconfirmed_user, app):
        """Confirmed status is updated when JWT says email is now confirmed."""
        with app.app_context():
            # Send JWT with email_confirmed_at set (confirmed=True)
            token = _make_jwt(
                unconfirmed_user.supabase_uid,
                unconfirmed_user.email,
                confirmed=True,
            )

        resp = client.get(
            "/api/v1/auth/profile",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["confirmed"] is True


class TestApiProfile:
    """Tests for profile GET/PUT endpoints."""

    def test_get_profile(self, client, api_headers):
        resp = client.get("/api/v1/auth/profile", headers=api_headers)
        assert resp.status_code == 200
        assert resp.get_json()["data"]["username"] == "testuser"

    def test_get_profile_unauthorized(self, client):
        resp = client.get("/api/v1/auth/profile")
        assert resp.status_code == 401

    def test_update_profile(self, client, api_headers):
        resp = client.put(
            "/api/v1/auth/profile",
            headers=api_headers,
            data=json.dumps({"about_me": "I love calisthenics"}),
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["about_me"] == "I love calisthenics"

    def test_update_profile_username(self, client, api_headers):
        resp = client.put(
            "/api/v1/auth/profile",
            headers=api_headers,
            data=json.dumps({"username": "newname"}),
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["username"] == "newname"

    def test_update_profile_duplicate_username(self, client, api_headers, second_user):
        resp = client.put(
            "/api/v1/auth/profile",
            headers=api_headers,
            data=json.dumps({"username": "seconduser"}),
        )
        assert resp.status_code == 409

    def test_update_profile_unconfirmed(self, client, api_headers_unconfirmed):
        resp = client.put(
            "/api/v1/auth/profile",
            headers=api_headers_unconfirmed,
            data=json.dumps({"about_me": "test"}),
        )
        assert resp.status_code == 403


class TestDeletedRoutes:
    """Verify that old auth routes no longer exist."""

    def test_login_gone(self, client):
        resp = client.post("/api/v1/auth/login")
        assert resp.status_code == 404

    def test_register_gone(self, client):
        resp = client.post("/api/v1/auth/register")
        assert resp.status_code == 404

    def test_refresh_gone(self, client):
        resp = client.post("/api/v1/auth/refresh")
        assert resp.status_code == 404

    def test_change_password_gone(self, client):
        resp = client.post("/api/v1/auth/change-password")
        assert resp.status_code == 404

    def test_forgot_password_gone(self, client):
        resp = client.post("/api/v1/auth/forgot-password")
        assert resp.status_code == 404

    def test_resend_confirmation_gone(self, client):
        resp = client.post("/api/v1/auth/confirm-email/resend")
        assert resp.status_code == 404
