"""Integration tests for API exercise/workout statistics endpoints."""

from datetime import date, datetime, timedelta, timezone


def _shift_months(d: date, months: int) -> date:
    """Return `d` shifted by a whole number of months, clamped to day 15.

    Avoids day-of-month overflow issues (e.g. Jan 31 minus 1 month) since
    tests only need a stable date that falls in a specific target month.
    """
    total = d.year * 12 + (d.month - 1) + months
    year, month = divmod(total, 12)
    return date(year, month + 1, 15)


class TestApiExerciseStats:
    def test_stats_requires_auth(self, client):
        resp = client.get("/api/v1/exercises/1/stats")
        assert resp.status_code == 401

    def test_stats_requires_confirmed(self, client, api_headers_unconfirmed):
        resp = client.get("/api/v1/exercises/1/stats", headers=api_headers_unconfirmed)
        assert resp.status_code == 403

    def test_stats_exercise_not_found(self, client, api_headers):
        resp = client.get("/api/v1/exercises/99999/stats", headers=api_headers)
        assert resp.status_code == 404

    def test_stats_basic_aggregation(
        self, client, api_headers, workout, exercise_definition
    ):
        resp = client.get(
            f"/api/v1/exercises/{exercise_definition.id}/stats", headers=api_headers
        )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["exercise_id"] == exercise_definition.id
        assert data["counting_type"] == "reps"
        assert data["granularity"] == "month"

        current_key = date.today().strftime("%Y-%m")
        buckets = {b["period"]: b for b in data["buckets"]}
        assert buckets[current_key]["best"] == 10
        assert buckets[current_key]["total"] == 10
        assert buckets[current_key]["session_count"] == 1

    def test_stats_best_vs_total_multiple_sets(
        self, client, api_headers, workout_with_two_exercises
    ):
        from project import db
        from project.models import ExerciseDefinition

        reps_def = (
            db.session.execute(
                db.select(ExerciseDefinition).filter_by(title="Pull-ups")
            )
            .scalars()
            .first()
        )
        resp = client.get(f"/api/v1/exercises/{reps_def.id}/stats", headers=api_headers)
        assert resp.status_code == 200
        current_key = date.today().strftime("%Y-%m")
        bucket = {b["period"]: b for b in resp.get_json()["data"]["buckets"]}[
            current_key
        ]
        assert bucket["best"] == 10  # max(10, 8)
        assert bucket["total"] == 18  # 10 + 8
        assert bucket["session_count"] == 1

    def test_stats_duration_exercise(
        self, client, api_headers, duration_workout, duration_exercise_definition
    ):
        resp = client.get(
            f"/api/v1/exercises/{duration_exercise_definition.id}/stats",
            headers=api_headers,
        )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["counting_type"] == "duration"
        current_key = date.today().strftime("%Y-%m")
        bucket = {b["period"]: b for b in data["buckets"]}[current_key]
        assert bucket["best"] == 90
        assert bucket["total"] == 90

    def test_stats_multiple_buckets_across_months(
        self, client, api_headers, workout, exercise_definition, user
    ):
        from project import db
        from project.models import Exercise, Set, Workout

        older_month = _shift_months(date.today(), -2)
        older_dt = datetime(
            older_month.year, older_month.month, older_month.day, tzinfo=timezone.utc
        )

        w1 = db.session.get(Workout, workout.id)
        w1.timestamp = older_dt
        db.session.commit()

        w2 = Workout(title="Second Session", user_id=user.id)
        db.session.add(w2)
        db.session.flush()
        ex2 = Exercise(
            exercise_order=1,
            workout_id=w2.id,
            exercise_definition_id=exercise_definition.id,
        )
        db.session.add(ex2)
        db.session.flush()
        db.session.add(Set(set_order=1, exercise_id=ex2.id, reps=15))
        db.session.commit()

        from_date = _shift_months(date.today(), -3)
        resp = client.get(
            f"/api/v1/exercises/{exercise_definition.id}/stats"
            f"?from={from_date.isoformat()}",
            headers=api_headers,
        )
        assert resp.status_code == 200
        buckets = {b["period"]: b for b in resp.get_json()["data"]["buckets"]}
        older_key = f"{older_month.year}-{older_month.month:02d}"
        current_key = date.today().strftime("%Y-%m")
        assert buckets[older_key]["total"] == 10
        assert buckets[current_key]["total"] == 15

    def test_stats_date_range_filtering(
        self, client, api_headers, workout, exercise_definition
    ):
        from project import db
        from project.models import Workout

        w = db.session.get(Workout, workout.id)
        w.timestamp = datetime.now(timezone.utc) - timedelta(days=40)
        db.session.commit()

        today = date.today().isoformat()
        resp = client.get(
            f"/api/v1/exercises/{exercise_definition.id}/stats"
            f"?from={today}&to={today}",
            headers=api_headers,
        )
        assert resp.status_code == 200
        buckets = resp.get_json()["data"]["buckets"]
        assert all(b["total"] == 0 for b in buckets)

    def test_stats_granularity_week(
        self, client, api_headers, workout, exercise_definition
    ):
        resp = client.get(
            f"/api/v1/exercises/{exercise_definition.id}/stats?granularity=week",
            headers=api_headers,
        )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["granularity"] == "week"

        iso_year, iso_week, _ = date.today().isocalendar()
        expected_period = f"{iso_year}-W{iso_week:02d}"
        bucket = {b["period"]: b for b in data["buckets"]}[expected_period]
        assert bucket["total"] == 10

    def test_stats_empty_range(self, client, api_headers, exercise_definition):
        resp = client.get(
            f"/api/v1/exercises/{exercise_definition.id}/stats", headers=api_headers
        )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert len(data["buckets"]) > 0
        assert all(
            b["total"] == 0 and b["best"] == 0 and b["session_count"] == 0
            for b in data["buckets"]
        )

    def test_stats_excludes_templates(
        self, client, api_headers, workout_template, exercise_definition
    ):
        resp = client.get(
            f"/api/v1/exercises/{exercise_definition.id}/stats", headers=api_headers
        )
        assert resp.status_code == 200
        assert all(b["total"] == 0 for b in resp.get_json()["data"]["buckets"])

    def test_stats_ownership_isolation(
        self, client, api_headers, api_headers_second, workout, exercise_definition
    ):
        from project import db
        from project.models import ExerciseDefinition

        ex_def = db.session.get(ExerciseDefinition, exercise_definition.id)
        ex_def.visibility = "public"
        db.session.commit()

        resp_other = client.get(
            f"/api/v1/exercises/{exercise_definition.id}/stats",
            headers=api_headers_second,
        )
        assert resp_other.status_code == 200
        assert all(b["total"] == 0 for b in resp_other.get_json()["data"]["buckets"])

        resp_owner = client.get(
            f"/api/v1/exercises/{exercise_definition.id}/stats", headers=api_headers
        )
        owner_buckets = resp_owner.get_json()["data"]["buckets"]
        assert any(b["total"] == 10 for b in owner_buckets)

    def test_stats_invisible_exercise_not_found(
        self, client, api_headers_second, exercise_definition
    ):
        # exercise_definition defaults to "followers" visibility and second_user
        # doesn't follow its owner, so it must not be found (not just empty).
        resp = client.get(
            f"/api/v1/exercises/{exercise_definition.id}/stats",
            headers=api_headers_second,
        )
        assert resp.status_code == 404

    def test_stats_invalid_granularity(self, client, api_headers, exercise_definition):
        resp = client.get(
            f"/api/v1/exercises/{exercise_definition.id}/stats?granularity=year",
            headers=api_headers,
        )
        assert resp.status_code == 400

    def test_stats_invalid_date_format(self, client, api_headers, exercise_definition):
        resp = client.get(
            f"/api/v1/exercises/{exercise_definition.id}/stats?from=not-a-date",
            headers=api_headers,
        )
        assert resp.status_code == 400

    def test_stats_progression_filter(
        self, client, api_headers, workout, exercise_definition, user
    ):
        from project import db
        from project.models import Exercise, Set, Workout

        # `workout` already has one "Standard" set (10 reps). Add a second
        # session on the same exercise definition logged at a different
        # progression level.
        w2 = Workout(title="Advanced Session", user_id=user.id)
        db.session.add(w2)
        db.session.flush()
        ex2 = Exercise(
            exercise_order=1,
            workout_id=w2.id,
            exercise_definition_id=exercise_definition.id,
        )
        db.session.add(ex2)
        db.session.flush()
        db.session.add(
            Set(set_order=1, exercise_id=ex2.id, progression="Advanced", reps=20)
        )
        db.session.commit()

        current_key = date.today().strftime("%Y-%m")

        resp_none = client.get(
            f"/api/v1/exercises/{exercise_definition.id}/stats", headers=api_headers
        )
        assert resp_none.get_json()["data"]["progression"] is None
        bucket_none = {b["period"]: b for b in resp_none.get_json()["data"]["buckets"]}[
            current_key
        ]
        assert bucket_none["total"] == 30  # both progressions combined

        resp_standard = client.get(
            f"/api/v1/exercises/{exercise_definition.id}/stats?progression=Standard",
            headers=api_headers,
        )
        data_standard = resp_standard.get_json()["data"]
        assert data_standard["progression"] == "Standard"
        assert {b["period"]: b for b in data_standard["buckets"]}[current_key][
            "total"
        ] == 10

        resp_advanced = client.get(
            f"/api/v1/exercises/{exercise_definition.id}/stats?progression=Advanced",
            headers=api_headers,
        )
        data_advanced = resp_advanced.get_json()["data"]
        assert {b["period"]: b for b in data_advanced["buckets"]}[current_key][
            "total"
        ] == 20

    def test_stats_progression_filter_no_match(
        self, client, api_headers, workout, exercise_definition
    ):
        resp = client.get(
            f"/api/v1/exercises/{exercise_definition.id}/stats?progression=Nonexistent",
            headers=api_headers,
        )
        assert resp.status_code == 200
        assert all(b["total"] == 0 for b in resp.get_json()["data"]["buckets"])


class TestApiWorkoutStats:
    def test_workout_stats_requires_auth(self, client):
        resp = client.get("/api/v1/workouts/stats")
        assert resp.status_code == 401

    def test_workout_stats_requires_confirmed(self, client, api_headers_unconfirmed):
        resp = client.get("/api/v1/workouts/stats", headers=api_headers_unconfirmed)
        assert resp.status_code == 403

    def test_workout_stats_counts_sessions(
        self, client, api_headers, workout_with_two_exercises
    ):
        resp = client.get("/api/v1/workouts/stats", headers=api_headers)
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        current_key = date.today().strftime("%Y-%m")
        bucket = {b["period"]: b for b in data["buckets"]}[current_key]
        assert bucket["workout_count"] == 1
        assert bucket["total_sets"] == 4
        assert bucket["total_reps"] == 18
        assert bucket["total_duration"] == 150

    def test_workout_stats_excludes_templates(
        self, client, api_headers, workout_template_with_two_exercises
    ):
        resp = client.get("/api/v1/workouts/stats", headers=api_headers)
        assert resp.status_code == 200
        buckets = resp.get_json()["data"]["buckets"]
        assert all(b["workout_count"] == 0 for b in buckets)

    def test_workout_stats_date_range_filtering(self, client, api_headers, workout):
        from project import db
        from project.models import Workout

        w = db.session.get(Workout, workout.id)
        w.timestamp = datetime.now(timezone.utc) - timedelta(days=40)
        db.session.commit()

        today = date.today().isoformat()
        resp = client.get(
            f"/api/v1/workouts/stats?from={today}&to={today}", headers=api_headers
        )
        assert resp.status_code == 200
        buckets = resp.get_json()["data"]["buckets"]
        assert all(b["workout_count"] == 0 for b in buckets)

    def test_workout_stats_granularity_week(self, client, api_headers, workout):
        resp = client.get(
            "/api/v1/workouts/stats?granularity=week", headers=api_headers
        )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["granularity"] == "week"
        iso_year, iso_week, _ = date.today().isocalendar()
        expected_period = f"{iso_year}-W{iso_week:02d}"
        bucket = {b["period"]: b for b in data["buckets"]}[expected_period]
        assert bucket["workout_count"] == 1

    def test_workout_stats_empty_range(self, client, api_headers):
        resp = client.get("/api/v1/workouts/stats", headers=api_headers)
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert len(data["buckets"]) > 0
        assert all(b["workout_count"] == 0 for b in data["buckets"])

    def test_workout_stats_ownership_isolation(
        self, client, api_headers, api_headers_second, workout
    ):
        resp = client.get("/api/v1/workouts/stats", headers=api_headers_second)
        assert resp.status_code == 200
        assert all(b["workout_count"] == 0 for b in resp.get_json()["data"]["buckets"])

        resp_owner = client.get("/api/v1/workouts/stats", headers=api_headers)
        owner_buckets = resp_owner.get_json()["data"]["buckets"]
        assert any(b["workout_count"] == 1 for b in owner_buckets)

    def test_workout_stats_invalid_granularity(self, client, api_headers):
        resp = client.get(
            "/api/v1/workouts/stats?granularity=year", headers=api_headers
        )
        assert resp.status_code == 400

    def test_workout_stats_invalid_date_format(self, client, api_headers):
        resp = client.get("/api/v1/workouts/stats?from=not-a-date", headers=api_headers)
        assert resp.status_code == 400

    def test_workout_stats_category_filter(
        self, client, api_headers, exercise_categories, user
    ):
        from project import db
        from project.models import Exercise, ExerciseDefinition, Set, Workout

        cardio_cat = next(c for c in exercise_categories if c.name == "Cardio")
        core_cat = next(c for c in exercise_categories if c.name == "Core")

        cardio_def = ExerciseDefinition(
            title="Running", user_id=user.id, counting_type="duration"
        )
        core_def = ExerciseDefinition(
            title="Sit-ups", user_id=user.id, counting_type="reps"
        )
        db.session.add(cardio_def)
        db.session.add(core_def)
        db.session.flush()
        cardio_def.categories = [cardio_cat]
        core_def.categories = [core_cat]
        db.session.commit()

        w1 = Workout(title="Cardio Session", user_id=user.id)
        db.session.add(w1)
        db.session.flush()
        ex1 = Exercise(
            exercise_order=1, workout_id=w1.id, exercise_definition_id=cardio_def.id
        )
        db.session.add(ex1)
        db.session.flush()
        db.session.add(Set(set_order=1, exercise_id=ex1.id, duration=300))

        w2 = Workout(title="Core Session", user_id=user.id)
        db.session.add(w2)
        db.session.flush()
        ex2 = Exercise(
            exercise_order=1, workout_id=w2.id, exercise_definition_id=core_def.id
        )
        db.session.add(ex2)
        db.session.flush()
        db.session.add(Set(set_order=1, exercise_id=ex2.id, reps=25))
        db.session.commit()

        current_key = date.today().strftime("%Y-%m")

        resp_cardio = client.get(
            f"/api/v1/workouts/stats?category={cardio_cat.id}", headers=api_headers
        )
        assert resp_cardio.status_code == 200
        data_cardio = resp_cardio.get_json()["data"]
        assert data_cardio["category_id"] == cardio_cat.id
        bucket_cardio = {b["period"]: b for b in data_cardio["buckets"]}[current_key]
        assert bucket_cardio["workout_count"] == 1
        assert bucket_cardio["total_duration"] == 300
        assert bucket_cardio["total_reps"] == 0

        resp_all = client.get("/api/v1/workouts/stats", headers=api_headers)
        data_all = resp_all.get_json()["data"]
        assert data_all["category_id"] is None
        bucket_all = {b["period"]: b for b in data_all["buckets"]}[current_key]
        assert bucket_all["workout_count"] == 2
        assert bucket_all["total_reps"] == 25
        assert bucket_all["total_duration"] == 300

    def test_workout_stats_category_no_match(
        self, client, api_headers, workout, exercise_categories
    ):
        unused_cat = next(c for c in exercise_categories if c.name == "Upper Body")
        resp = client.get(
            f"/api/v1/workouts/stats?category={unused_cat.id}", headers=api_headers
        )
        assert resp.status_code == 200
        assert all(b["workout_count"] == 0 for b in resp.get_json()["data"]["buckets"])
