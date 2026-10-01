"""Integration tests for blocking, reporting and terms acceptance."""

import pytest

from project import db
from project.models import (
    ExerciseDefinition,
    Message,
    Report,
    User,
    UserBlock,
    Workout,
)


def _block(client, headers, username):
    return client.post(f"/api/v1/users/{username}/block", headers=headers)


def _public_workout(app, owner, title="Public"):
    with app.app_context():
        w = Workout(title=title, user_id=owner.id, visibility="public")
        db.session.add(w)
        db.session.commit()
        return w.id


class TestBlocking:
    def test_block_and_list(self, client, api_headers, second_user):
        resp = _block(client, api_headers, "seconduser")
        assert resp.status_code == 200
        assert resp.get_json()["data"]["blocked"] is True

        listing = client.get("/api/v1/blocks", headers=api_headers).get_json()["data"]
        assert [u["username"] for u in listing] == ["seconduser"]

    def test_block_is_idempotent(self, client, api_headers, second_user, app):
        _block(client, api_headers, "seconduser")
        assert _block(client, api_headers, "seconduser").status_code == 200
        with app.app_context():
            assert db.session.query(UserBlock).count() == 1

    def test_block_self(self, client, api_headers, user):
        assert _block(client, api_headers, "testuser").status_code == 400

    def test_block_unknown_user(self, client, api_headers):
        assert _block(client, api_headers, "nobody").status_code == 404

    def test_unblock(self, client, api_headers, second_user):
        _block(client, api_headers, "seconduser")
        resp = client.delete("/api/v1/users/seconduser/block", headers=api_headers)
        assert resp.status_code == 200
        assert (
            client.get("/api/v1/blocks", headers=api_headers).get_json()["data"] == []
        )

    def test_block_removes_follows_both_ways(
        self, client, api_headers, second_user, user, app
    ):
        with app.app_context():
            u = db.session.get(User, user.id)
            u2 = db.session.get(User, second_user.id)
            u.request_follow(u2)
            u2.accept_follow_request(u)
            u2.request_follow(u)
            db.session.commit()

        _block(client, api_headers, "seconduser")

        with app.app_context():
            u = db.session.get(User, user.id)
            u2 = db.session.get(User, second_user.id)
            assert u.follow_status(u2) == "none"
            assert u2.follow_status(u) == "none"

    @pytest.mark.parametrize("blocker_is_viewer", [True, False])
    def test_explore_hides_workouts_either_direction(
        self,
        client,
        api_headers,
        api_headers_second,
        user,
        second_user,
        app,
        blocker_is_viewer,
    ):
        _public_workout(app, second_user)
        if blocker_is_viewer:
            _block(client, api_headers, "seconduser")
        else:
            _block(client, api_headers_second, "testuser")
        resp = client.get("/api/v1/explore", headers=api_headers)
        assert resp.get_json()["data"] == []

    def test_unblock_restores_explore(self, client, api_headers, second_user, app):
        _public_workout(app, second_user)
        _block(client, api_headers, "seconduser")
        client.delete("/api/v1/users/seconduser/block", headers=api_headers)
        assert (
            len(client.get("/api/v1/explore", headers=api_headers).get_json()["data"])
            == 1
        )

    def test_profile_hidden_either_direction(
        self, client, api_headers, api_headers_second, user, second_user
    ):
        _block(client, api_headers_second, "testuser")
        assert (
            client.get("/api/v1/users/seconduser", headers=api_headers).status_code
            == 404
        )
        assert (
            client.get("/api/v1/users/testuser", headers=api_headers_second).status_code
            == 404
        )

    def test_follow_blocked_user_rejected(
        self, client, api_headers, api_headers_second, user, second_user
    ):
        _block(client, api_headers_second, "testuser")
        resp = client.post("/api/v1/users/seconduser/follow", headers=api_headers)
        assert resp.status_code == 404

    def test_cannot_message_blocked_user(
        self, client, api_headers, api_headers_second, user, second_user
    ):
        _block(client, api_headers_second, "testuser")
        resp = client.post(
            "/api/v1/messages/seconduser", headers=api_headers, json={"body": "hi"}
        )
        assert resp.status_code == 404

    def test_blocked_sender_messages_hidden(
        self, client, api_headers, api_headers_second, user, second_user, app
    ):
        client.post(
            "/api/v1/messages/testuser", headers=api_headers_second, json={"body": "hi"}
        )
        _block(client, api_headers, "seconduser")
        resp = client.get("/api/v1/messages", headers=api_headers)
        assert resp.get_json()["data"] == []

    def test_exercise_hidden_in_list_and_detail(
        self, client, api_headers, second_user, app
    ):
        with app.app_context():
            ex = ExerciseDefinition(
                title="Shared", user_id=second_user.id, counting_type="reps"
            )
            ex.visibility = "public"
            db.session.add(ex)
            db.session.commit()
            ex_id = ex.id

        assert (
            len(
                client.get(
                    "/api/v1/exercises?user=all", headers=api_headers
                ).get_json()["data"]
            )
            == 1
        )
        _block(client, api_headers, "seconduser")
        assert (
            client.get("/api/v1/exercises?user=all", headers=api_headers).get_json()[
                "data"
            ]
            == []
        )
        assert (
            client.get(f"/api/v1/exercises/{ex_id}", headers=api_headers).status_code
            == 404
        )


class TestReports:
    def _report(self, client, headers, **overrides):
        body = {"target_type": "user", "target_id": 0, "reason": "spam"}
        body.update(overrides)
        return client.post("/api/v1/reports", headers=headers, json=body)

    def test_report_user(self, client, api_headers, second_user, app):
        resp = self._report(client, api_headers, target_id=second_user.id)
        assert resp.status_code == 201
        with app.app_context():
            r = db.session.query(Report).one()
            assert r.reported_user_id == second_user.id
            assert r.status == "open"

    def test_report_is_idempotent(self, client, api_headers, second_user, app):
        self._report(client, api_headers, target_id=second_user.id)
        resp = self._report(client, api_headers, target_id=second_user.id)
        assert resp.status_code == 200
        with app.app_context():
            assert db.session.query(Report).count() == 1

    def test_report_workout_resolves_owner(self, client, api_headers, second_user, app):
        wid = _public_workout(app, second_user)
        resp = self._report(
            client,
            api_headers,
            target_type="workout",
            target_id=wid,
            reason="other",
            details="nope",
        )
        assert resp.status_code == 201
        with app.app_context():
            assert db.session.query(Report).one().reported_user_id == second_user.id

    def test_report_invisible_workout_is_404(
        self, client, api_headers, second_user, app
    ):
        with app.app_context():
            w = Workout(title="Hidden", user_id=second_user.id, visibility="private")
            db.session.add(w)
            db.session.commit()
            wid = w.id
        resp = self._report(client, api_headers, target_type="workout", target_id=wid)
        assert resp.status_code == 404

    def test_report_message_only_by_recipient(
        self, client, api_headers, api_headers_second, user, second_user, app
    ):
        with app.app_context():
            m = Message(sender_id=second_user.id, recipient_id=user.id, body="bad")
            db.session.add(m)
            db.session.commit()
            mid = m.id
        ok = self._report(client, api_headers, target_type="message", target_id=mid)
        assert ok.status_code == 201
        denied = self._report(
            client, api_headers_second, target_type="message", target_id=mid
        )
        assert denied.status_code == 404

    def test_report_self_rejected(self, client, api_headers, user):
        assert self._report(client, api_headers, target_id=user.id).status_code == 400

    @pytest.mark.parametrize(
        "override",
        [
            {"target_type": "bogus"},
            {"reason": "bogus"},
            {"target_id": "x"},
            {"details": "x" * 501},
        ],
    )
    def test_report_validation(self, client, api_headers, second_user, override):
        override.setdefault("target_id", second_user.id)
        assert self._report(client, api_headers, **override).status_code == 400

    def test_report_emails_admins(
        self, client, api_headers, second_user, admin_user, app
    ):
        from project import mail

        with mail.record_messages() as outbox:
            self._report(client, api_headers, target_id=second_user.id)
            import time

            time.sleep(0.2)
        assert any("Report #" in m.subject for m in outbox)


class TestTermsAndDeletion:
    def test_accept_terms(self, client, api_headers, user, app):
        resp = client.post("/api/v1/auth/accept-terms", headers=api_headers)
        assert resp.status_code == 200
        with app.app_context():
            assert db.session.get(User, user.id).terms_accepted_at is not None

    def test_account_deletion_cleans_blocks_and_reports(
        self, client, api_headers, api_headers_second, user, second_user, app
    ):
        _block(client, api_headers, "seconduser")
        _block(client, api_headers_second, "testuser")
        client.post(
            "/api/v1/reports",
            headers=api_headers_second,
            json={"target_type": "user", "target_id": user.id, "reason": "spam"},
        )
        resp = client.delete("/api/v1/auth/account", headers=api_headers)
        assert resp.status_code == 200
        with app.app_context():
            assert db.session.query(UserBlock).count() == 0
            assert db.session.query(Report).count() == 0
