"""Integration tests for API workout and template endpoints."""

import json


class TestApiListWorkouts:
    def test_list_workouts(self, client, api_headers, workout):
        resp = client.get("/api/v1/workouts", headers=api_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data["data"]) == 1
        assert data["data"][0]["title"] == "Morning Workout"
        assert "meta" in data

    def test_list_workouts_unauthorized(self, client):
        resp = client.get("/api/v1/workouts")
        assert resp.status_code == 401

    def test_list_workouts_unconfirmed(self, client, api_headers_unconfirmed):
        resp = client.get("/api/v1/workouts", headers=api_headers_unconfirmed)
        assert resp.status_code == 403

    def test_list_workouts_hide_done(self, client, api_headers, workout, app):
        # Mark workout as done
        from project import db
        from project.models import Workout

        with app.app_context():
            w = db.session.get(Workout, workout.id)
            w.is_done = True
            db.session.commit()

        resp = client.get("/api/v1/workouts?hide_done=1", headers=api_headers)
        assert resp.status_code == 200
        assert len(resp.get_json()["data"]) == 0


class TestApiCreateWorkout:
    def test_create_workout(self, client, api_headers, exercise_definition):
        resp = client.post(
            "/api/v1/workouts",
            headers=api_headers,
            data=json.dumps(
                {
                    "title": "New Workout",
                    "exercises": [
                        {
                            "exercise_definition_id": exercise_definition.id,
                            "sets": [{"progression": "Standard", "reps": 10}],
                        }
                    ],
                }
            ),
        )
        assert resp.status_code == 201
        data = resp.get_json()["data"]
        assert data["title"] == "New Workout"
        assert len(data["exercises"]) == 1
        assert len(data["exercises"][0]["sets"]) == 1

    def test_create_workout_no_title(self, client, api_headers, exercise_definition):
        resp = client.post(
            "/api/v1/workouts",
            headers=api_headers,
            data=json.dumps(
                {
                    "title": "",
                    "exercises": [
                        {"exercise_definition_id": exercise_definition.id, "sets": []}
                    ],
                }
            ),
        )
        assert resp.status_code == 400

    def test_create_workout_no_exercises(self, client, api_headers):
        resp = client.post(
            "/api/v1/workouts",
            headers=api_headers,
            data=json.dumps({"title": "Empty", "exercises": []}),
        )
        assert resp.status_code == 400

    def test_create_workout_invalid_exercise_def(self, client, api_headers):
        resp = client.post(
            "/api/v1/workouts",
            headers=api_headers,
            data=json.dumps(
                {
                    "title": "Bad",
                    "exercises": [
                        {"exercise_definition_id": 99999, "sets": [{"reps": 5}]}
                    ],
                }
            ),
        )
        assert resp.status_code == 400


class TestApiGetWorkout:
    def test_get_workout(self, client, api_headers, workout):
        resp = client.get(f"/api/v1/workouts/{workout.id}", headers=api_headers)
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["title"] == "Morning Workout"
        assert "exercises" in data

    def test_get_workout_not_found(self, client, api_headers):
        resp = client.get("/api/v1/workouts/99999", headers=api_headers)
        assert resp.status_code == 404

    def test_get_workout_forbidden(self, client, api_headers_second, workout):
        resp = client.get(f"/api/v1/workouts/{workout.id}", headers=api_headers_second)
        assert resp.status_code == 403


class TestApiUpdateWorkout:
    def test_update_workout_title(self, client, api_headers, workout):
        resp = client.put(
            f"/api/v1/workouts/{workout.id}",
            headers=api_headers,
            data=json.dumps({"title": "Updated Title"}),
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["title"] == "Updated Title"

    def test_update_workout_exercises(
        self, client, api_headers, workout, exercise_definition
    ):
        resp = client.put(
            f"/api/v1/workouts/{workout.id}",
            headers=api_headers,
            data=json.dumps(
                {
                    "exercises": [
                        {
                            "exercise_definition_id": exercise_definition.id,
                            "sets": [
                                {"progression": "Standard", "reps": 15},
                                {"progression": "Standard", "reps": 12},
                            ],
                        }
                    ]
                }
            ),
        )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert len(data["exercises"][0]["sets"]) == 2


class TestApiDeleteWorkout:
    def test_delete_workout(self, client, api_headers, workout):
        resp = client.delete(f"/api/v1/workouts/{workout.id}", headers=api_headers)
        assert resp.status_code == 200

        # Verify deleted
        resp = client.get(f"/api/v1/workouts/{workout.id}", headers=api_headers)
        assert resp.status_code == 404

    def test_delete_workout_forbidden(self, client, api_headers_second, workout):
        resp = client.delete(
            f"/api/v1/workouts/{workout.id}", headers=api_headers_second
        )
        assert resp.status_code == 403


class TestApiToggleDone:
    def test_toggle_done(self, client, api_headers, workout):
        resp = client.post(
            f"/api/v1/workouts/{workout.id}/toggle-done", headers=api_headers
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["is_done"] is True

        # Toggle back
        resp = client.post(
            f"/api/v1/workouts/{workout.id}/toggle-done", headers=api_headers
        )
        assert resp.get_json()["data"]["is_done"] is False


class TestApiTemplates:
    def test_list_templates(self, client, api_headers, workout_template):
        resp = client.get("/api/v1/templates", headers=api_headers)
        assert resp.status_code == 200
        assert len(resp.get_json()["data"]) == 1

    def test_create_template(self, client, api_headers, exercise_definition):
        resp = client.post(
            "/api/v1/templates",
            headers=api_headers,
            data=json.dumps(
                {
                    "title": "New Template",
                    "exercises": [
                        {
                            "exercise_definition_id": exercise_definition.id,
                            "sets": [{"progression": "Standard", "reps": 10}],
                        }
                    ],
                }
            ),
        )
        assert resp.status_code == 201
        assert resp.get_json()["data"]["is_template"] is True

    def test_update_template(self, client, api_headers, workout_template):
        resp = client.put(
            f"/api/v1/templates/{workout_template.id}",
            headers=api_headers,
            data=json.dumps({"title": "Updated Template"}),
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["title"] == "Updated Template"

    def test_delete_template(self, client, api_headers, workout_template):
        resp = client.delete(
            f"/api/v1/templates/{workout_template.id}", headers=api_headers
        )
        assert resp.status_code == 200

    def test_use_template(self, client, api_headers, workout_template):
        resp = client.post(
            f"/api/v1/templates/{workout_template.id}/use", headers=api_headers
        )
        assert resp.status_code == 201
        data = resp.get_json()["data"]
        assert data["is_template"] is False
        assert len(data["exercises"]) == 1

    def test_template_forbidden(self, client, api_headers_second, workout_template):
        resp = client.put(
            f"/api/v1/templates/{workout_template.id}",
            headers=api_headers_second,
            data=json.dumps({"title": "Hack"}),
        )
        assert resp.status_code == 403
