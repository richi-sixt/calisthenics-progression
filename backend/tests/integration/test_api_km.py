"""Integration tests for the "km" counting type (distance + optional time)."""

import json
from datetime import date


def _create_km_exercise(client, headers):
    resp = client.post(
        "/api/v1/exercises",
        headers=headers,
        data=json.dumps({"title": "Running", "counting_type": "km"}),
    )
    assert resp.status_code == 201
    return resp.get_json()["data"]["id"]


def _create_workout(client, headers, exercise_id, sets):
    resp = client.post(
        "/api/v1/workouts",
        headers=headers,
        data=json.dumps(
            {
                "title": "Run",
                "planned_date": date.today().isoformat(),
                "exercises": [{"exercise_definition_id": exercise_id, "sets": sets}],
            }
        ),
    )
    return resp


class TestKmCountingType:
    def test_create_exercise_with_km(self, client, api_headers):
        resp = client.post(
            "/api/v1/exercises",
            headers=api_headers,
            data=json.dumps({"title": "Cycling", "counting_type": "km"}),
        )
        assert resp.status_code == 201
        assert resp.get_json()["data"]["counting_type"] == "km"

    def test_update_exercise_to_km(self, client, api_headers, exercise_definition):
        resp = client.put(
            f"/api/v1/exercises/{exercise_definition.id}",
            headers=api_headers,
            data=json.dumps({"counting_type": "km"}),
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["counting_type"] == "km"

    def test_set_stores_distance_and_optional_duration(self, client, api_headers):
        ex_id = _create_km_exercise(client, api_headers)
        resp = _create_workout(
            client,
            api_headers,
            ex_id,
            [{"distance_km": 5.25, "duration": 1500}, {"distance_km": 3}],
        )
        assert resp.status_code == 201
        sets = resp.get_json()["data"]["exercises"][0]["sets"]
        assert sets[0]["distance_km"] == 5.25
        assert sets[0]["duration"] == 1500
        assert sets[1]["distance_km"] == 3
        assert sets[1]["duration"] is None

    def test_invalid_distance_rejected(self, client, api_headers):
        ex_id = _create_km_exercise(client, api_headers)
        for bad in ("far", -1, 10001, True):
            resp = _create_workout(client, api_headers, ex_id, [{"distance_km": bad}])
            assert resp.status_code == 400, bad

    def test_stats_for_km_exercise(self, client, api_headers):
        ex_id = _create_km_exercise(client, api_headers)
        resp = _create_workout(
            client,
            api_headers,
            ex_id,
            [{"distance_km": 5.5}, {"distance_km": 2.25}],
        )
        workout_id = resp.get_json()["data"]["id"]
        client.post(f"/api/v1/workouts/{workout_id}/toggle-done", headers=api_headers)

        resp = client.get(f"/api/v1/exercises/{ex_id}/stats", headers=api_headers)
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["counting_type"] == "km"
        bucket = {b["period"]: b for b in data["buckets"]}[
            date.today().strftime("%Y-%m")
        ]
        assert bucket["best"] == 5.5
        assert bucket["total"] == 7.75

        resp = client.get("/api/v1/workouts/stats", headers=api_headers)
        bucket = {b["period"]: b for b in resp.get_json()["data"]["buckets"]}[
            date.today().strftime("%Y-%m")
        ]
        assert bucket["total_distance_km"] == 7.75

    def test_template_use_copies_distance(self, client, api_headers):
        ex_id = _create_km_exercise(client, api_headers)
        resp = client.post(
            "/api/v1/templates",
            headers=api_headers,
            data=json.dumps(
                {
                    "title": "Run tpl",
                    "exercises": [
                        {
                            "exercise_definition_id": ex_id,
                            "sets": [{"distance_km": 10, "duration": 3000}],
                        }
                    ],
                }
            ),
        )
        assert resp.status_code == 201
        tpl_id = resp.get_json()["data"]["id"]
        resp = client.post(f"/api/v1/templates/{tpl_id}/use", headers=api_headers)
        assert resp.status_code == 201
        s = resp.get_json()["data"]["exercises"][0]["sets"][0]
        assert s["distance_km"] == 10
        assert s["duration"] == 3000
