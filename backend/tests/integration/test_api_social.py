"""Integration tests for API social endpoints: explore, follow, messages, notifications."""

import json


class TestApiExplore:
    def test_explore(self, client, api_headers, second_user, app):
        # Create a workout for second_user
        from project import db
        from project.models import Workout

        with app.app_context():
            w = Workout(title="Other Workout", user_id=second_user.id)
            db.session.add(w)
            db.session.commit()

        resp = client.get("/api/v1/explore", headers=api_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data["data"]) == 1
        assert data["data"][0]["title"] == "Other Workout"

    def test_explore_excludes_own(self, client, api_headers, workout):
        resp = client.get("/api/v1/explore", headers=api_headers)
        assert resp.status_code == 200
        # Own workout should not appear
        assert len(resp.get_json()["data"]) == 0


class TestApiGetUser:
    def test_get_user(self, client, api_headers, second_user):
        resp = client.get(f"/api/v1/users/{second_user.username}", headers=api_headers)
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["user"]["username"] == "seconduser"
        assert data["user"]["is_following"] is False

    def test_get_user_not_found(self, client, api_headers):
        resp = client.get("/api/v1/users/ghost", headers=api_headers)
        assert resp.status_code == 404


class TestApiFollow:
    def test_follow(self, client, api_headers, second_user):
        resp = client.post(
            f"/api/v1/users/{second_user.username}/follow", headers=api_headers
        )
        assert resp.status_code == 200

        # Verify following
        resp = client.get(f"/api/v1/users/{second_user.username}", headers=api_headers)
        assert resp.get_json()["data"]["user"]["is_following"] is True

    def test_follow_self(self, client, api_headers, user):
        resp = client.post(f"/api/v1/users/{user.username}/follow", headers=api_headers)
        assert resp.status_code == 400

    def test_unfollow(self, client, api_headers, second_user, app):
        # Follow first
        from project import db
        from project.models import User

        with app.app_context():
            u = db.session.get(User, 1)
            u2 = db.session.get(User, second_user.id)
            u.follow(u2)
            db.session.commit()

        resp = client.post(
            f"/api/v1/users/{second_user.username}/unfollow", headers=api_headers
        )
        assert resp.status_code == 200


class TestApiMessages:
    def test_list_messages_empty(self, client, api_headers):
        resp = client.get("/api/v1/messages", headers=api_headers)
        assert resp.status_code == 200
        assert resp.get_json()["data"] == []

    def test_send_message(self, client, api_headers, second_user):
        resp = client.post(
            f"/api/v1/messages/{second_user.username}",
            headers=api_headers,
            data=json.dumps({"body": "Hello!"}),
        )
        assert resp.status_code == 201
        assert resp.get_json()["data"]["body"] == "Hello!"

    def test_send_message_empty_body(self, client, api_headers, second_user):
        resp = client.post(
            f"/api/v1/messages/{second_user.username}",
            headers=api_headers,
            data=json.dumps({"body": ""}),
        )
        assert resp.status_code == 400

    def test_send_message_too_long(self, client, api_headers, second_user):
        resp = client.post(
            f"/api/v1/messages/{second_user.username}",
            headers=api_headers,
            data=json.dumps({"body": "x" * 141}),
        )
        assert resp.status_code == 400

    def test_send_message_user_not_found(self, client, api_headers):
        resp = client.post(
            "/api/v1/messages/ghost",
            headers=api_headers,
            data=json.dumps({"body": "Hi"}),
        )
        assert resp.status_code == 404

    def test_receive_message(self, client, api_headers, api_headers_second, user):
        # Second user sends a message to first user
        client.post(
            f"/api/v1/messages/{user.username}",
            headers=api_headers_second,
            data=json.dumps({"body": "Hey there!"}),
        )

        # First user reads messages
        resp = client.get("/api/v1/messages", headers=api_headers)
        assert resp.status_code == 200
        assert len(resp.get_json()["data"]) == 1
        assert resp.get_json()["data"][0]["body"] == "Hey there!"


class TestApiNotifications:
    def test_notifications_empty(self, client, api_headers):
        resp = client.get("/api/v1/notifications", headers=api_headers)
        assert resp.status_code == 200
        assert resp.get_json()["data"] == []
