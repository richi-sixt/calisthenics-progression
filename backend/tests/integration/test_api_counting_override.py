"""Integration tests for the per-workout counting type override."""

import json
from datetime import date


def _exercise(client, headers, counting_type="reps"):
    resp = client.post(
        "/api/v1/exercises",
        headers=headers,
        data=json.dumps({"title": "Plank", "counting_type": counting_type}),
    )
    assert resp.status_code == 201
    return resp.get_json()["data"]["id"]


def _workout(client, headers, ex_id, override, sets, **extra):
    entry = {"exercise_definition_id": ex_id, "sets": sets}
    if override is not None:
        entry["counting_type"] = override
    return client.post(
        "/api/v1/workouts",
        headers=headers,
        data=json.dumps(
            {
                "title": "W",
                "planned_date": date.today().isoformat(),
                "exercises": [entry],
                **extra,
            }
        ),
    )


class TestCountingOverride:
    def test_override_is_stored_and_serialized(self, client, api_headers):
        ex_id = _exercise(client, api_headers)
        resp = _workout(client, api_headers, ex_id, "duration", [{"duration": 30}])
        assert resp.status_code == 201
        ex = resp.get_json()["data"]["exercises"][0]
        assert ex["counting_type"] == "duration"
        assert ex["default_counting_type"] == "reps"

    def test_default_when_no_override(self, client, api_headers):
        ex_id = _exercise(client, api_headers)
        resp = _workout(client, api_headers, ex_id, None, [{"reps": 5}])
        ex = resp.get_json()["data"]["exercises"][0]
        assert ex["counting_type"] == "reps"
        assert ex["default_counting_type"] == "reps"

    def test_same_as_default_is_not_stored(self, client, api_headers, app):
        from project import db
        from project.models import Exercise

        ex_id = _exercise(client, api_headers)
        _workout(client, api_headers, ex_id, "reps", [{"reps": 5}])
        with app.app_context():
            assert (
                db.session.execute(db.select(Exercise)).scalars().one().counting_type
                is None
            )

    def test_invalid_override_rejected(self, client, api_headers):
        ex_id = _exercise(client, api_headers)
        resp = _workout(client, api_headers, ex_id, "bogus", [{"reps": 5}])
        assert resp.status_code == 400

    def test_template_use_copies_override(self, client, api_headers):
        ex_id = _exercise(client, api_headers)
        tpl = client.post(
            "/api/v1/templates",
            headers=api_headers,
            data=json.dumps(
                {
                    "title": "T",
                    "exercises": [
                        {
                            "exercise_definition_id": ex_id,
                            "counting_type": "duration",
                            "sets": [{"duration": 30}],
                        }
                    ],
                }
            ),
        )
        assert tpl.status_code == 201
        resp = client.post(
            f"/api/v1/templates/{tpl.get_json()['data']['id']}/use",
            headers=api_headers,
            data=json.dumps({}),
        )
        assert resp.status_code == 201
        ex = resp.get_json()["data"]["exercises"][0]
        assert ex["counting_type"] == "duration"

    def test_stats_ignore_overridden_sets(self, client, api_headers):
        ex_id = _exercise(client, api_headers)
        today = date.today().isoformat()
        for override, sets in ((None, [{"reps": 8}]), ("duration", [{"duration": 99}])):
            resp = _workout(client, api_headers, ex_id, override, sets)
            assert resp.status_code == 201
            done = client.post(
                f"/api/v1/workouts/{resp.get_json()['data']['id']}/toggle-done",
                headers=api_headers,
            )
            assert done.status_code == 200
        resp = client.get(
            f"/api/v1/exercises/{ex_id}/stats?granularity=week&from={today}&to={today}",
            headers=api_headers,
        )
        assert resp.status_code == 200
        buckets = resp.get_json()["data"]["buckets"]
        assert max(b["best"] for b in buckets) == 8
