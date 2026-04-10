"""Integration tests for API exercise definition endpoints."""

import json


class TestApiListExercises:
    def test_list_my_exercises(self, client, api_headers, exercise_definition):
        resp = client.get("/api/v1/exercises", headers=api_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data["data"]) == 1
        assert data["data"][0]["title"] == "Push-ups"

    def test_list_all_exercises(self, client, api_headers, exercise_definition):
        resp = client.get("/api/v1/exercises?user=all", headers=api_headers)
        assert resp.status_code == 200

    def test_filter_by_category(
        self, client, api_headers, exercise_definition, exercise_categories, app
    ):
        # Assign category to exercise
        from project import db
        from project.models import ExerciseCategory, ExerciseDefinition

        with app.app_context():
            ex = db.session.get(ExerciseDefinition, exercise_definition.id)
            cat = db.session.get(ExerciseCategory, exercise_categories[2].id)
            ex.categories = [cat]
            db.session.commit()
            cat_id = cat.id

        resp = client.get(f"/api/v1/exercises?category={cat_id}", headers=api_headers)
        assert resp.status_code == 200
        assert len(resp.get_json()["data"]) == 1


class TestApiCreateExercise:
    def test_create_exercise(self, client, api_headers):
        resp = client.post(
            "/api/v1/exercises",
            headers=api_headers,
            data=json.dumps(
                {
                    "title": "Pull-ups",
                    "description": "Standard pull-ups",
                    "counting_type": "reps",
                    "progression_levels": ["Beginner", "Intermediate", "Advanced"],
                }
            ),
        )
        assert resp.status_code == 201
        data = resp.get_json()["data"]
        assert data["title"] == "Pull-ups"
        assert len(data["progression_levels"]) == 3
        assert data["progression_levels"][0]["name"] == "Beginner"

    def test_create_exercise_duplicate_title(
        self, client, api_headers, exercise_definition
    ):
        resp = client.post(
            "/api/v1/exercises",
            headers=api_headers,
            data=json.dumps({"title": "Push-ups", "counting_type": "reps"}),
        )
        assert resp.status_code == 409

    def test_create_exercise_invalid_counting_type(self, client, api_headers):
        resp = client.post(
            "/api/v1/exercises",
            headers=api_headers,
            data=json.dumps({"title": "Test", "counting_type": "invalid"}),
        )
        assert resp.status_code == 400

    def test_create_exercise_with_categories(
        self, client, api_headers, exercise_categories
    ):
        resp = client.post(
            "/api/v1/exercises",
            headers=api_headers,
            data=json.dumps(
                {
                    "title": "Dips",
                    "counting_type": "reps",
                    "category_ids": [exercise_categories[2].id],
                }
            ),
        )
        assert resp.status_code == 201
        assert exercise_categories[2].id in resp.get_json()["data"]["category_ids"]


class TestApiGetExercise:
    def test_get_exercise(self, client, api_headers, exercise_definition):
        resp = client.get(
            f"/api/v1/exercises/{exercise_definition.id}", headers=api_headers
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["title"] == "Push-ups"

    def test_get_exercise_not_found(self, client, api_headers):
        resp = client.get("/api/v1/exercises/99999", headers=api_headers)
        assert resp.status_code == 404


class TestApiUpdateExercise:
    def test_update_exercise(self, client, api_headers, exercise_definition):
        resp = client.put(
            f"/api/v1/exercises/{exercise_definition.id}",
            headers=api_headers,
            data=json.dumps(
                {
                    "title": "Diamond Push-ups",
                    "progression_levels": ["Easy", "Hard"],
                }
            ),
        )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["title"] == "Diamond Push-ups"
        assert len(data["progression_levels"]) == 2

    def test_update_exercise_forbidden(
        self, client, api_headers_second, exercise_definition
    ):
        resp = client.put(
            f"/api/v1/exercises/{exercise_definition.id}",
            headers=api_headers_second,
            data=json.dumps({"title": "Hack"}),
        )
        assert resp.status_code == 403

    def test_update_exercise_duplicate_title(
        self, client, api_headers, exercise_definition, app
    ):
        # Create a second exercise
        from project import db
        from project.models import ExerciseDefinition

        with app.app_context():
            ex2 = ExerciseDefinition(
                title="Squats", user_id=exercise_definition.user_id
            )
            db.session.add(ex2)
            db.session.commit()

        resp = client.put(
            f"/api/v1/exercises/{exercise_definition.id}",
            headers=api_headers,
            data=json.dumps({"title": "Squats"}),
        )
        assert resp.status_code == 409


class TestApiDeleteExercise:
    def test_delete_exercise(self, client, api_headers, exercise_definition):
        resp = client.delete(
            f"/api/v1/exercises/{exercise_definition.id}", headers=api_headers
        )
        assert resp.status_code == 200

        # Should be archived, not visible in list
        resp = client.get("/api/v1/exercises", headers=api_headers)
        assert len(resp.get_json()["data"]) == 0

    def test_delete_exercise_forbidden(
        self, client, api_headers_second, exercise_definition
    ):
        resp = client.delete(
            f"/api/v1/exercises/{exercise_definition.id}",
            headers=api_headers_second,
        )
        assert resp.status_code == 403


class TestApiCopyExercise:
    def test_copy_exercise(
        self, client, api_headers_second, exercise_definition, second_user
    ):
        resp = client.post(
            f"/api/v1/exercises/{exercise_definition.id}/copy",
            headers=api_headers_second,
        )
        assert resp.status_code == 201
        data = resp.get_json()["data"]
        assert "Kopie" in data["title"]
        assert data["user_id"] == second_user.id

    def test_copy_own_exercise(self, client, api_headers, exercise_definition):
        resp = client.post(
            f"/api/v1/exercises/{exercise_definition.id}/copy",
            headers=api_headers,
        )
        assert resp.status_code == 400
