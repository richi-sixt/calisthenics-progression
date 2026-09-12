"""Integration tests for API workout and template endpoints."""

import json
from datetime import date, timedelta


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

    def test_list_workouts_filters_by_date(
        self, client, api_headers, workout, workout_with_two_exercises
    ):
        from project import db
        from project.models import Workout

        # Re-fetch via db.session.get() (no nested app_context) rather than
        # mutating the fixture-returned object directly: with two fixtures in
        # play, only the most-recently-set-up one is guaranteed to belong to
        # the session later HTTP requests in this test will reuse.
        other_day = date.today() + timedelta(days=5)
        w = db.session.get(Workout, workout_with_two_exercises.id)
        w.planned_date = other_day
        db.session.commit()

        resp = client.get(
            f"/api/v1/workouts?date={other_day.isoformat()}", headers=api_headers
        )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert len(data) == 1
        assert data[0]["id"] == workout_with_two_exercises.id

    def test_list_workouts_date_and_hide_done_combine(
        self, client, api_headers, workout, workout_with_two_exercises
    ):
        from project import db
        from project.models import Workout

        same_day = date.today()
        w1 = db.session.get(Workout, workout.id)
        w1.planned_date = same_day
        w1.is_done = True
        w2 = db.session.get(Workout, workout_with_two_exercises.id)
        w2.planned_date = same_day
        db.session.commit()

        resp = client.get(
            f"/api/v1/workouts?date={same_day.isoformat()}&hide_done=1",
            headers=api_headers,
        )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert len(data) == 1
        assert data[0]["id"] == workout_with_two_exercises.id

    def test_list_workouts_invalid_date_format(self, client, api_headers, workout):
        resp = client.get("/api/v1/workouts?date=not-a-date", headers=api_headers)
        assert resp.status_code == 400


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

    def test_create_workout_with_others_private_exercise_fails(
        self, client, api_headers_second, exercise_definition
    ):
        # exercise_definition is private and owned by `user`, not `second_user`.
        resp = client.post(
            "/api/v1/workouts",
            headers=api_headers_second,
            data=json.dumps(
                {
                    "title": "Sneaky Workout",
                    "exercises": [
                        {
                            "exercise_definition_id": exercise_definition.id,
                            "sets": [{"progression": "Standard", "reps": 10}],
                        }
                    ],
                }
            ),
        )
        assert resp.status_code == 400

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

    def test_create_workout_defaults_planned_date_to_today(
        self, client, api_headers, exercise_definition
    ):
        resp = client.post(
            "/api/v1/workouts",
            headers=api_headers,
            data=json.dumps(
                {
                    "title": "Today Workout",
                    "exercises": [
                        {
                            "exercise_definition_id": exercise_definition.id,
                            "sets": [{"reps": 10}],
                        }
                    ],
                }
            ),
        )
        assert resp.status_code == 201
        assert resp.get_json()["data"]["planned_date"] == date.today().isoformat()

    def test_create_workout_with_future_planned_date(
        self, client, api_headers, exercise_definition
    ):
        future = (date.today() + timedelta(days=14)).isoformat()
        resp = client.post(
            "/api/v1/workouts",
            headers=api_headers,
            data=json.dumps(
                {
                    "title": "Planned Workout",
                    "planned_date": future,
                    "exercises": [
                        {
                            "exercise_definition_id": exercise_definition.id,
                            "sets": [{"reps": 10}],
                        }
                    ],
                }
            ),
        )
        assert resp.status_code == 201
        data = resp.get_json()["data"]
        assert data["planned_date"] == future
        # timestamp must never be driven by client-provided planned_date
        assert data["timestamp"].startswith(date.today().isoformat())

    def test_create_workout_invalid_planned_date_format(
        self, client, api_headers, exercise_definition
    ):
        resp = client.post(
            "/api/v1/workouts",
            headers=api_headers,
            data=json.dumps(
                {
                    "title": "Bad Date",
                    "planned_date": "not-a-date",
                    "exercises": [
                        {
                            "exercise_definition_id": exercise_definition.id,
                            "sets": [{"reps": 10}],
                        }
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

    def test_update_workout_planned_date_reflects_immediately(
        self, client, api_headers, workout
    ):
        from project import db
        from project.models import Workout

        future = (date.today() + timedelta(days=7)).isoformat()
        resp = client.put(
            f"/api/v1/workouts/{workout.id}",
            headers=api_headers,
            data=json.dumps({"planned_date": future}),
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["planned_date"] == future

        # No nested `with app.app_context()` here -- that would create a second,
        # separately-scoped session whose identity map wouldn't see the PUT's
        # commit reflected on the ambient-session object (a real trap hit
        # earlier in this project's test suite).
        stored = db.session.get(Workout, workout.id)
        assert stored.planned_date.isoformat() == future

    def test_update_workout_can_reset_planned_date_to_none(
        self, client, api_headers, workout
    ):
        resp = client.put(
            f"/api/v1/workouts/{workout.id}",
            headers=api_headers,
            data=json.dumps({"planned_date": None}),
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["planned_date"] is None

    def test_update_workout_replan_after_done(self, client, api_headers, workout):
        from project import db

        workout.is_done = True
        db.session.commit()

        future = (date.today() + timedelta(days=3)).isoformat()
        resp = client.put(
            f"/api/v1/workouts/{workout.id}",
            headers=api_headers,
            data=json.dumps({"planned_date": future}),
        )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["planned_date"] == future
        assert data["is_done"] is True

    def test_update_workout_invalid_planned_date_format(
        self, client, api_headers, workout
    ):
        resp = client.put(
            f"/api/v1/workouts/{workout.id}",
            headers=api_headers,
            data=json.dumps({"planned_date": "not-a-date"}),
        )
        assert resp.status_code == 400


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


class TestApiWorkoutsCalendar:
    def test_calendar_returns_dates_with_workouts(self, client, api_headers, workout):
        month = date.today().strftime("%Y-%m")
        resp = client.get(
            f"/api/v1/workouts/calendar?month={month}", headers=api_headers
        )
        assert resp.status_code == 200
        assert workout.planned_date.isoformat() in resp.get_json()["data"]

    def test_calendar_excludes_other_months(self, client, api_headers, workout):
        from project import db

        workout.planned_date = date.today() + timedelta(days=60)
        db.session.commit()

        month = date.today().strftime("%Y-%m")
        resp = client.get(
            f"/api/v1/workouts/calendar?month={month}", headers=api_headers
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"] == []

    def test_calendar_excludes_templates(self, client, api_headers, workout_template):
        month = date.today().strftime("%Y-%m")
        resp = client.get(
            f"/api/v1/workouts/calendar?month={month}", headers=api_headers
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"] == []

    def test_calendar_excludes_other_users_workouts(
        self, client, api_headers_second, workout
    ):
        month = date.today().strftime("%Y-%m")
        resp = client.get(
            f"/api/v1/workouts/calendar?month={month}", headers=api_headers_second
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"] == []

    def test_calendar_invalid_month_format(self, client, api_headers):
        resp = client.get(
            "/api/v1/workouts/calendar?month=not-a-month", headers=api_headers
        )
        assert resp.status_code == 400

    def test_calendar_unauthorized(self, client):
        month = date.today().strftime("%Y-%m")
        resp = client.get(f"/api/v1/workouts/calendar?month={month}")
        assert resp.status_code == 401

    def test_calendar_unconfirmed(self, client, api_headers_unconfirmed):
        month = date.today().strftime("%Y-%m")
        resp = client.get(
            f"/api/v1/workouts/calendar?month={month}",
            headers=api_headers_unconfirmed,
        )
        assert resp.status_code == 403
