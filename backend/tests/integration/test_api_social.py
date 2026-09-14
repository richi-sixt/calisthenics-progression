"""Integration tests for API social endpoints: explore, follow, messages, notifications."""

import json


class TestApiExplore:
    def test_explore(self, client, api_headers, second_user, app):
        # Create a workout for second_user
        from project import db
        from project.models import Workout

        with app.app_context():
            w = Workout(
                title="Other Workout", user_id=second_user.id, visibility="public"
            )
            db.session.add(w)
            db.session.commit()

        resp = client.get("/api/v1/explore", headers=api_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data["data"]) == 1
        assert data["data"][0]["title"] == "Other Workout"
        assert data["data"][0]["follow_status"] == "none"

    def test_explore_excludes_own(self, client, api_headers, workout):
        resp = client.get("/api/v1/explore", headers=api_headers)
        assert resp.status_code == 200
        # Own workout should not appear
        assert len(resp.get_json()["data"]) == 0

    def test_explore_excludes_followers_only_from_non_follower(
        self, client, api_headers, second_user, app
    ):
        from project import db
        from project.models import Workout

        with app.app_context():
            w = Workout(
                title="Followers Workout",
                user_id=second_user.id,
                visibility="followers",
            )
            db.session.add(w)
            db.session.commit()

        resp = client.get("/api/v1/explore", headers=api_headers)
        assert resp.status_code == 200
        assert len(resp.get_json()["data"]) == 0

    def test_explore_excludes_private(self, client, api_headers, second_user, app):
        from project import db
        from project.models import Workout

        with app.app_context():
            w = Workout(
                title="Private Workout", user_id=second_user.id, visibility="private"
            )
            db.session.add(w)
            db.session.commit()

        resp = client.get("/api/v1/explore", headers=api_headers)
        assert resp.status_code == 200
        assert len(resp.get_json()["data"]) == 0

    def test_explore_shows_followers_only_workout_to_follower(
        self, client, api_headers, second_user, user, app
    ):
        from project import db
        from project.models import User, Workout

        with app.app_context():
            u = db.session.get(User, user.id)
            u2 = db.session.get(User, second_user.id)
            u.request_follow(u2)
            u2.accept_follow_request(u)
            db.session.add(
                Workout(
                    title="Followers Workout",
                    user_id=second_user.id,
                    visibility="followers",
                )
            )
            db.session.commit()

        resp = client.get("/api/v1/explore", headers=api_headers)
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert len(data) == 1
        assert data[0]["title"] == "Followers Workout"
        assert data[0]["follow_status"] == "accepted"

    def test_explore_scope_following(
        self, client, api_headers, second_user, user, app
    ):
        from project import db
        from project.models import User, Workout

        with app.app_context():
            u = db.session.get(User, user.id)
            u2 = db.session.get(User, second_user.id)
            u.request_follow(u2)
            u2.accept_follow_request(u)
            db.session.add(
                Workout(
                    title="Followed User Workout",
                    user_id=second_user.id,
                    visibility="public",
                )
            )
            db.session.commit()

        # A third, unfollowed user's public workout should not show up when
        # scope=following is requested.
        resp = client.get(
            "/api/v1/explore", query_string={"scope": "following"}, headers=api_headers
        )
        assert resp.status_code == 200
        titles = [w["title"] for w in resp.get_json()["data"]]
        assert titles == ["Followed User Workout"]

    def test_explore_filter_by_username(
        self, client, api_headers, second_user, app
    ):
        from project import db
        from project.models import Workout

        with app.app_context():
            db.session.add(
                Workout(
                    title="Second User Workout",
                    user_id=second_user.id,
                    visibility="public",
                )
            )
            db.session.commit()

        resp = client.get(
            "/api/v1/explore",
            query_string={"username": second_user.username},
            headers=api_headers,
        )
        assert resp.status_code == 200
        titles = [w["title"] for w in resp.get_json()["data"]]
        assert titles == ["Second User Workout"]

    def test_explore_filter_by_username_not_found(self, client, api_headers):
        resp = client.get(
            "/api/v1/explore", query_string={"username": "ghost"}, headers=api_headers
        )
        assert resp.status_code == 404


class TestApiGetUser:
    def test_get_user(self, client, api_headers, second_user):
        resp = client.get(f"/api/v1/users/{second_user.username}", headers=api_headers)
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["user"]["username"] == "seconduser"
        assert data["user"]["follow_status"] == "none"

    def test_get_user_not_found(self, client, api_headers):
        resp = client.get("/api/v1/users/ghost", headers=api_headers)
        assert resp.status_code == 404

    def test_get_user_hides_followers_and_private_workouts_from_non_follower(
        self, client, api_headers, second_user, app
    ):
        from project import db
        from project.models import Workout

        with app.app_context():
            db.session.add(
                Workout(title="Public One", user_id=second_user.id, visibility="public")
            )
            db.session.add(
                Workout(
                    title="Followers One", user_id=second_user.id, visibility="followers"
                )
            )
            db.session.add(
                Workout(title="Private One", user_id=second_user.id, visibility="private")
            )
            db.session.commit()

        resp = client.get(f"/api/v1/users/{second_user.username}", headers=api_headers)
        assert resp.status_code == 200
        titles = [w["title"] for w in resp.get_json()["data"]["workouts"]]
        assert titles == ["Public One"]

    def test_get_user_shows_followers_workouts_to_follower(
        self, client, api_headers, second_user, user, app
    ):
        from project import db
        from project.models import User, Workout

        with app.app_context():
            u = db.session.get(User, user.id)
            u2 = db.session.get(User, second_user.id)
            u.request_follow(u2)
            u2.accept_follow_request(u)
            db.session.add(
                Workout(
                    title="Followers One", user_id=second_user.id, visibility="followers"
                )
            )
            db.session.add(
                Workout(title="Private One", user_id=second_user.id, visibility="private")
            )
            db.session.commit()

        resp = client.get(f"/api/v1/users/{second_user.username}", headers=api_headers)
        assert resp.status_code == 200
        titles = [w["title"] for w in resp.get_json()["data"]["workouts"]]
        assert titles == ["Followers One"]


class TestApiFollow:
    def test_follow_creates_pending_request(self, client, api_headers, second_user):
        resp = client.post(
            f"/api/v1/users/{second_user.username}/follow", headers=api_headers
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["follow_status"] == "pending"

        # Not yet an accepted follow
        resp = client.get(f"/api/v1/users/{second_user.username}", headers=api_headers)
        assert resp.get_json()["data"]["user"]["follow_status"] == "pending"

    def test_follow_self(self, client, api_headers, user):
        resp = client.post(f"/api/v1/users/{user.username}/follow", headers=api_headers)
        assert resp.status_code == 400

    def test_follow_notifies_target(self, client, api_headers, api_headers_second, second_user):
        client.post(f"/api/v1/users/{second_user.username}/follow", headers=api_headers)

        resp = client.get("/api/v1/notifications", headers=api_headers_second)
        names = {n["name"]: n["data"] for n in resp.get_json()["data"]}
        assert names.get("follow_request_count") == 1

    def test_follow_idempotent_when_pending(self, client, api_headers, second_user):
        client.post(f"/api/v1/users/{second_user.username}/follow", headers=api_headers)
        resp = client.post(
            f"/api/v1/users/{second_user.username}/follow", headers=api_headers
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["follow_status"] == "pending"

    def test_unfollow_accepted(self, client, api_headers, second_user, app):
        from project import db
        from project.models import User

        with app.app_context():
            u = db.session.get(User, 1)
            u2 = db.session.get(User, second_user.id)
            u.request_follow(u2)
            u2.accept_follow_request(u)
            db.session.commit()

        resp = client.post(
            f"/api/v1/users/{second_user.username}/unfollow", headers=api_headers
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["follow_status"] == "none"

    def test_unfollow_cancels_pending_request(self, client, api_headers, second_user):
        client.post(f"/api/v1/users/{second_user.username}/follow", headers=api_headers)

        resp = client.post(
            f"/api/v1/users/{second_user.username}/unfollow", headers=api_headers
        )
        assert resp.status_code == 200

        resp = client.get(f"/api/v1/users/{second_user.username}", headers=api_headers)
        assert resp.get_json()["data"]["user"]["follow_status"] == "none"


class TestApiFollowRequests:
    def test_list_follow_requests(self, client, api_headers, api_headers_second, second_user, user):
        client.post(f"/api/v1/users/{user.username}/follow", headers=api_headers_second)

        resp = client.get("/api/v1/follow-requests", headers=api_headers)
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert len(data) == 1
        assert data[0]["username"] == second_user.username

    def test_list_follow_requests_empty(self, client, api_headers):
        resp = client.get("/api/v1/follow-requests", headers=api_headers)
        assert resp.status_code == 200
        assert resp.get_json()["data"] == []

    def test_accept_follow_request(
        self, client, api_headers, api_headers_second, second_user, user
    ):
        client.post(f"/api/v1/users/{user.username}/follow", headers=api_headers_second)

        resp = client.post(
            f"/api/v1/follow-requests/{second_user.username}/accept", headers=api_headers
        )
        assert resp.status_code == 200

        resp = client.get(f"/api/v1/users/{user.username}", headers=api_headers_second)
        assert resp.get_json()["data"]["user"]["follow_status"] == "accepted"

        # Request no longer pending
        resp = client.get("/api/v1/follow-requests", headers=api_headers)
        assert resp.get_json()["data"] == []

    def test_accept_updates_notification_count(
        self, client, api_headers, api_headers_second, second_user, user
    ):
        client.post(f"/api/v1/users/{user.username}/follow", headers=api_headers_second)
        client.post(
            f"/api/v1/follow-requests/{second_user.username}/accept", headers=api_headers
        )

        resp = client.get("/api/v1/notifications", headers=api_headers)
        names = {n["name"]: n["data"] for n in resp.get_json()["data"]}
        assert names.get("follow_request_count") == 0

    def test_deny_follow_request(
        self, client, api_headers, api_headers_second, second_user, user
    ):
        client.post(f"/api/v1/users/{user.username}/follow", headers=api_headers_second)

        resp = client.post(
            f"/api/v1/follow-requests/{second_user.username}/deny", headers=api_headers
        )
        assert resp.status_code == 200

        resp = client.get(f"/api/v1/users/{user.username}", headers=api_headers_second)
        assert resp.get_json()["data"]["user"]["follow_status"] == "none"

        # Denied requester can request again
        resp = client.post(
            f"/api/v1/users/{user.username}/follow", headers=api_headers_second
        )
        assert resp.get_json()["data"]["follow_status"] == "pending"

    def test_accept_not_found(self, client, api_headers):
        resp = client.post(
            "/api/v1/follow-requests/ghost/accept", headers=api_headers
        )
        assert resp.status_code == 404


class TestApiRemoveFollower:
    def test_remove_follower(
        self, client, api_headers, api_headers_second, second_user, user, app
    ):
        from project import db
        from project.models import User

        with app.app_context():
            u = db.session.get(User, user.id)
            u2 = db.session.get(User, second_user.id)
            u2.request_follow(u)
            u.accept_follow_request(u2)
            db.session.commit()

        resp = client.post(
            f"/api/v1/users/{second_user.username}/remove-follower", headers=api_headers
        )
        assert resp.status_code == 200

        resp = client.get(f"/api/v1/users/{user.username}", headers=api_headers_second)
        assert resp.get_json()["data"]["user"]["follow_status"] == "none"

    def test_remove_follower_self(self, client, api_headers, user):
        resp = client.post(
            f"/api/v1/users/{user.username}/remove-follower", headers=api_headers
        )
        assert resp.status_code == 400

    def test_remove_follower_not_found(self, client, api_headers):
        resp = client.post(
            "/api/v1/users/ghost/remove-follower", headers=api_headers
        )
        assert resp.status_code == 404


class TestApiFollowersList:
    def test_followers_list(self, client, api_headers, second_user, user, app):
        from project import db
        from project.models import User

        with app.app_context():
            u = db.session.get(User, user.id)
            u2 = db.session.get(User, second_user.id)
            u2.request_follow(u)
            u.accept_follow_request(u2)
            db.session.commit()

        resp = client.get(f"/api/v1/users/{user.username}/followers", headers=api_headers)
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert len(data) == 1
        assert data[0]["username"] == second_user.username
        assert data[0]["follow_status"] == "none"

    def test_followers_list_not_found(self, client, api_headers):
        resp = client.get("/api/v1/users/ghost/followers", headers=api_headers)
        assert resp.status_code == 404

    def test_followers_list_empty(self, client, api_headers, user):
        resp = client.get(f"/api/v1/users/{user.username}/followers", headers=api_headers)
        assert resp.status_code == 200
        assert resp.get_json()["data"] == []


class TestApiFollowingList:
    def test_following_list(self, client, api_headers, second_user, user, app):
        from project import db
        from project.models import User

        with app.app_context():
            u = db.session.get(User, user.id)
            u2 = db.session.get(User, second_user.id)
            u.request_follow(u2)
            u2.accept_follow_request(u)
            db.session.commit()

        resp = client.get(f"/api/v1/users/{user.username}/following", headers=api_headers)
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert len(data) == 1
        assert data[0]["username"] == second_user.username
        assert data[0]["follow_status"] == "accepted"

    def test_following_list_not_found(self, client, api_headers):
        resp = client.get("/api/v1/users/ghost/following", headers=api_headers)
        assert resp.status_code == 404


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
