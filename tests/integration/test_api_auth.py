"""Integration tests for API authentication endpoints."""

import json


class TestApiLogin:
    def test_login_success(self, client, user):
        resp = client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": "testuser", "password": "password123"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert "token" in data["data"]
        assert data["data"]["user"]["username"] == "testuser"

    def test_login_wrong_password(self, client, user):
        resp = client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": "testuser", "password": "wrong"}),
            content_type="application/json",
        )
        assert resp.status_code == 401
        assert "error" in resp.get_json()

    def test_login_missing_fields(self, client):
        resp = client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": "testuser"}),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_login_nonexistent_user(self, client):
        resp = client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": "ghost", "password": "pass"}),
            content_type="application/json",
        )
        assert resp.status_code == 401


class TestApiRegister:
    def test_register_success(self, client, app, mail_outbox):
        resp = client.post(
            "/api/v1/auth/register",
            data=json.dumps(
                {
                    "username": "newuser",
                    "email": "new@example.com",
                    "password": "securepass123",
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 201
        data = resp.get_json()["data"]
        assert "token" in data
        assert data["user"]["username"] == "newuser"
        assert data["user"]["confirmed"] is False

    def test_register_duplicate_username(self, client, user):
        resp = client.post(
            "/api/v1/auth/register",
            data=json.dumps(
                {
                    "username": "testuser",
                    "email": "other@example.com",
                    "password": "pass123",
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 409

    def test_register_duplicate_email(self, client, user):
        resp = client.post(
            "/api/v1/auth/register",
            data=json.dumps(
                {
                    "username": "unique",
                    "email": "test@example.com",
                    "password": "pass123",
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 409

    def test_register_missing_fields(self, client):
        resp = client.post(
            "/api/v1/auth/register",
            data=json.dumps({"username": "u"}),
            content_type="application/json",
        )
        assert resp.status_code == 400


class TestApiTokenRefresh:
    def test_refresh_success(self, client, api_headers):
        resp = client.post("/api/v1/auth/refresh", headers=api_headers)
        assert resp.status_code == 200
        assert "token" in resp.get_json()["data"]

    def test_refresh_no_token(self, client):
        resp = client.post("/api/v1/auth/refresh")
        assert resp.status_code == 401

    def test_refresh_invalid_token(self, client):
        resp = client.post(
            "/api/v1/auth/refresh",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert resp.status_code == 401


class TestApiProfile:
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


class TestApiChangePassword:
    def test_change_password_success(self, client, api_headers):
        resp = client.post(
            "/api/v1/auth/change-password",
            headers=api_headers,
            data=json.dumps(
                {"current_password": "password123", "new_password": "newpass456"}
            ),
        )
        assert resp.status_code == 200

    def test_change_password_wrong_current(self, client, api_headers):
        resp = client.post(
            "/api/v1/auth/change-password",
            headers=api_headers,
            data=json.dumps(
                {"current_password": "wrong", "new_password": "newpass456"}
            ),
        )
        assert resp.status_code == 400


class TestApiForgotPassword:
    def test_forgot_password(self, client, user, mail_outbox):
        resp = client.post(
            "/api/v1/auth/forgot-password",
            data=json.dumps({"email": "test@example.com"}),
            content_type="application/json",
        )
        assert resp.status_code == 200

    def test_forgot_password_nonexistent_email(self, client):
        """Should still return 200 to prevent email enumeration."""
        resp = client.post(
            "/api/v1/auth/forgot-password",
            data=json.dumps({"email": "ghost@example.com"}),
            content_type="application/json",
        )
        assert resp.status_code == 200


class TestApiResendConfirmation:
    def test_resend_unconfirmed(self, client, api_headers_unconfirmed, mail_outbox):
        resp = client.post(
            "/api/v1/auth/confirm-email/resend", headers=api_headers_unconfirmed
        )
        assert resp.status_code == 200

    def test_resend_already_confirmed(self, client, api_headers):
        resp = client.post("/api/v1/auth/confirm-email/resend", headers=api_headers)
        assert resp.status_code == 200
        assert "already confirmed" in resp.get_json()["data"]["message"]
