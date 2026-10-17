"""Integration tests for skills and their progress."""

import json
from datetime import date

import pytest

from project import db
from project.models import Exercise, ExerciseDefinition, Set, Workout


def _post(client, headers, url, body):
    return client.post(url, headers=headers, data=json.dumps(body))


def _exercise(client, headers, title, counting_type="duration"):
    resp = _post(
        client,
        headers,
        "/api/v1/exercises",
        {"title": title, "counting_type": counting_type},
    )
    assert resp.status_code == 201
    return resp.get_json()["data"]["id"]


def _log(
    app, user, exercise_id, *, reps=None, duration=None, done=True, template=False
):
    with app.app_context():
        workout = Workout(
            title="W",
            user_id=user.id,
            is_done=done,
            is_template=template,
            planned_date=date(2026, 10, 1),
        )
        db.session.add(workout)
        db.session.flush()
        ex = Exercise(
            exercise_order=1, workout_id=workout.id, exercise_definition_id=exercise_id
        )
        db.session.add(ex)
        db.session.flush()
        db.session.add(
            Set(set_order=1, exercise_id=ex.id, reps=reps, duration=duration)
        )
        db.session.commit()


@pytest.fixture
def planche(client, api_headers):
    tuck = _exercise(client, api_headers, "Adv. Tuck Planche Hold")
    straddle = _exercise(client, api_headers, "Straddle Planche Hold")
    resp = _post(
        client,
        api_headers,
        "/api/v1/skills",
        {
            "title": "Planche",
            "exercises": [
                {"exercise_id": tuck, "target_value": 10},
                {"exercise_id": straddle, "target_value": 10},
            ],
        },
    )
    assert resp.status_code == 201
    return {"id": resp.get_json()["data"]["id"], "tuck": tuck, "straddle": straddle}


class TestSkillCrud:
    def test_create_and_get(self, client, api_headers, planche):
        resp = client.get(f"/api/v1/skills/{planche['id']}", headers=api_headers)
        data = resp.get_json()["data"]
        assert data["title"] == "Planche"
        assert [e["exercise_id"] for e in data["exercises"]] == [
            planche["tuck"],
            planche["straddle"],
        ]
        assert [e["step_order"] for e in data["exercises"]] == [1, 2]
        assert data["exercises"][0]["best"] == 0
        assert data["exercises"][0]["reached"] is False
        assert data["next_exercise_id"] == planche["tuck"]

    def test_duplicate_title_conflict(self, client, api_headers, planche):
        resp = _post(client, api_headers, "/api/v1/skills", {"title": "Planche"})
        assert resp.status_code == 409

    def test_title_required(self, client, api_headers):
        resp = _post(client, api_headers, "/api/v1/skills", {"title": " "})
        assert resp.status_code == 400

    def test_update_replaces_exercises(self, client, api_headers, planche):
        resp = client.put(
            f"/api/v1/skills/{planche['id']}",
            headers=api_headers,
            data=json.dumps(
                {
                    "title": "Planche 2",
                    "exercises": [
                        {"exercise_id": planche["straddle"], "target_value": 15}
                    ],
                }
            ),
        )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["title"] == "Planche 2"
        assert [(e["exercise_id"], e["target_value"]) for e in data["exercises"]] == [
            (planche["straddle"], 15)
        ]

    def test_delete(self, client, api_headers, planche):
        assert (
            client.delete(
                f"/api/v1/skills/{planche['id']}", headers=api_headers
            ).status_code
            == 200
        )
        assert (
            client.get("/api/v1/skills", headers=api_headers).get_json()["data"] == []
        )

    def test_list(self, client, api_headers, planche):
        data = client.get("/api/v1/skills", headers=api_headers).get_json()["data"]
        assert len(data) == 1
        assert data[0]["exercise_count"] == 2
        assert data[0]["reached_count"] == 0

    def test_invalid_target(self, client, api_headers):
        ex = _exercise(client, api_headers, "Hold")
        for target in (0, -1, "10", None, True):
            resp = _post(
                client,
                api_headers,
                "/api/v1/skills",
                {
                    "title": "S",
                    "exercises": [{"exercise_id": ex, "target_value": target}],
                },
            )
            assert resp.status_code == 400

    def test_km_exercise_rejected(self, client, api_headers):
        ex = _exercise(client, api_headers, "Run", counting_type="km")
        resp = _post(
            client,
            api_headers,
            "/api/v1/skills",
            {"title": "S", "exercises": [{"exercise_id": ex, "target_value": 5}]},
        )
        assert resp.status_code == 400

    def test_duplicate_exercise_rejected(self, client, api_headers):
        ex = _exercise(client, api_headers, "Hold")
        resp = _post(
            client,
            api_headers,
            "/api/v1/skills",
            {
                "title": "S",
                "exercises": [
                    {"exercise_id": ex, "target_value": 5},
                    {"exercise_id": ex, "target_value": 6},
                ],
            },
        )
        assert resp.status_code == 400

    def test_foreign_exercise_rejected(
        self, client, api_headers, api_headers_second, exercise_definition
    ):
        resp = _post(
            client,
            api_headers_second,
            "/api/v1/skills",
            {
                "title": "S",
                "exercises": [
                    {"exercise_id": exercise_definition.id, "target_value": 5}
                ],
            },
        )
        assert resp.status_code == 400


class TestSkillPrivacy:
    def test_other_user_cannot_access(self, client, api_headers_second, planche):
        url = f"/api/v1/skills/{planche['id']}"
        assert client.get(url, headers=api_headers_second).status_code == 404
        assert (
            client.put(
                url, headers=api_headers_second, data=json.dumps({"title": "x"})
            ).status_code
            == 404
        )
        assert client.delete(url, headers=api_headers_second).status_code == 404
        assert (
            client.get("/api/v1/skills", headers=api_headers_second).get_json()["data"]
            == []
        )

    def test_skills_in_exercise_dict_only_for_owner(
        self, client, api_headers, api_headers_second, planche
    ):
        from project.models import ExerciseDefinition

        exercise = db.session.get(ExerciseDefinition, planche["tuck"])
        exercise.visibility = "public"
        db.session.commit()

        own = client.get(f"/api/v1/exercises/{planche['tuck']}", headers=api_headers)
        assert own.get_json()["data"]["skills"] == [
            {"id": planche["id"], "title": "Planche"}
        ]
        other = client.get(
            f"/api/v1/exercises/{planche['tuck']}", headers=api_headers_second
        )
        assert other.get_json()["data"]["skills"] == []


class TestSkillProgress:
    def test_best_and_reached(self, client, api_headers, app, user, planche):
        _log(app, user, planche["tuck"], duration=6)
        _log(app, user, planche["tuck"], duration=12)
        _log(app, user, planche["straddle"], duration=4)

        data = client.get(
            f"/api/v1/skills/{planche['id']}", headers=api_headers
        ).get_json()["data"]
        tuck, straddle = data["exercises"]
        assert (tuck["best"], tuck["reached"]) == (12, True)
        assert tuck["last_done_date"] == "2026-10-01"
        assert (straddle["best"], straddle["reached"]) == (4, False)
        assert data["reached_count"] == 1
        assert data["next_exercise_id"] == planche["straddle"]

    def test_only_done_non_template_workouts_count(
        self, client, api_headers, app, user, planche
    ):
        _log(app, user, planche["tuck"], duration=30, done=False)
        _log(app, user, planche["tuck"], duration=30, template=True)

        data = client.get(
            f"/api/v1/skills/{planche['id']}", headers=api_headers
        ).get_json()["data"]
        assert data["exercises"][0]["best"] == 0

    def test_other_users_logs_do_not_count(
        self, client, api_headers, app, second_user, planche
    ):
        _log(app, second_user, planche["tuck"], duration=60)
        data = client.get(
            f"/api/v1/skills/{planche['id']}", headers=api_headers
        ).get_json()["data"]
        assert data["exercises"][0]["best"] == 0

    def test_reps_exercise_uses_reps(self, client, api_headers, app, user):
        ex = _exercise(client, api_headers, "Pull-ups", counting_type="reps")
        sid = _post(
            client,
            api_headers,
            "/api/v1/skills",
            {
                "title": "Muscle-up",
                "exercises": [{"exercise_id": ex, "target_value": 8}],
            },
        ).get_json()["data"]["id"]
        _log(app, user, ex, reps=9, duration=100)
        data = client.get(f"/api/v1/skills/{sid}", headers=api_headers).get_json()[
            "data"
        ]
        assert data["exercises"][0]["best"] == 9
        assert data["exercises"][0]["reached"] is True

    def test_progress_drops_when_workout_deleted(
        self, client, api_headers, app, user, planche
    ):
        _log(app, user, planche["tuck"], duration=12)
        with app.app_context():
            workout = db.session.scalar(db.select(Workout))
            db.session.delete(workout)
            db.session.commit()
        data = client.get(
            f"/api/v1/skills/{planche['id']}", headers=api_headers
        ).get_json()["data"]
        assert data["exercises"][0]["best"] == 0


class TestSkillExerciseFilter:
    def test_filter_exercises_by_skill(self, client, api_headers, planche):
        _exercise(client, api_headers, "Unrelated")
        resp = client.get(
            f"/api/v1/exercises?user=mine&skill={planche['id']}", headers=api_headers
        )
        ids = {e["id"] for e in resp.get_json()["data"]}
        assert ids == {planche["tuck"], planche["straddle"]}

    def test_foreign_skill_filter_returns_nothing(
        self, client, api_headers_second, planche
    ):
        resp = client.get(
            f"/api/v1/exercises?user=mine&skill={planche['id']}",
            headers=api_headers_second,
        )
        assert resp.get_json()["data"] == []


class TestSkillAccountDeletion:
    def test_account_deletion_removes_skills(self, client, api_headers, app, planche):
        from project.models import Skill, SkillExercise

        assert (
            client.delete("/api/v1/auth/account", headers=api_headers).status_code
            == 200
        )
        with app.app_context():
            assert db.session.scalars(db.select(Skill)).all() == []
            assert db.session.scalars(db.select(SkillExercise)).all() == []
            assert db.session.scalars(db.select(ExerciseDefinition)).all() == []
