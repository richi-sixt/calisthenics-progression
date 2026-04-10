"""Integration tests for API category endpoints."""

import json


class TestApiListCategories:
    def test_list_categories(self, client, api_headers, exercise_categories):
        resp = client.get("/api/v1/categories", headers=api_headers)
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert len(data) == 3
        names = [c["name"] for c in data]
        assert "Cardio" in names

    def test_list_categories_empty(self, client, api_headers):
        resp = client.get("/api/v1/categories", headers=api_headers)
        assert resp.status_code == 200
        assert resp.get_json()["data"] == []


class TestApiCreateCategory:
    def test_create_category(self, client, api_headers):
        resp = client.post(
            "/api/v1/categories",
            headers=api_headers,
            data=json.dumps({"name": "Legs"}),
        )
        assert resp.status_code == 201
        assert resp.get_json()["data"]["name"] == "Legs"

    def test_create_category_existing(self, client, api_headers, exercise_categories):
        resp = client.post(
            "/api/v1/categories",
            headers=api_headers,
            data=json.dumps({"name": "Cardio"}),
        )
        # Returns existing, not 409
        assert resp.status_code == 200
        assert resp.get_json()["data"]["name"] == "Cardio"

    def test_create_category_empty_name(self, client, api_headers):
        resp = client.post(
            "/api/v1/categories",
            headers=api_headers,
            data=json.dumps({"name": ""}),
        )
        assert resp.status_code == 400


class TestApiRenameCategory:
    def test_rename_category(self, client, api_headers, exercise_categories):
        cat = exercise_categories[0]  # "Cardio"
        resp = client.put(
            f"/api/v1/categories/{cat.id}",
            headers=api_headers,
            data=json.dumps({"name": "Endurance"}),
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["name"] == "Endurance"

    def test_rename_category_duplicate(self, client, api_headers, exercise_categories):
        cat = exercise_categories[0]  # "Cardio"
        resp = client.put(
            f"/api/v1/categories/{cat.id}",
            headers=api_headers,
            data=json.dumps({"name": "Core"}),  # Already exists
        )
        assert resp.status_code == 409

    def test_rename_category_not_found(self, client, api_headers):
        resp = client.put(
            "/api/v1/categories/99999",
            headers=api_headers,
            data=json.dumps({"name": "Test"}),
        )
        assert resp.status_code == 404


class TestApiDeleteCategory:
    def test_delete_category(self, client, api_headers, exercise_categories):
        cat = exercise_categories[0]  # "Cardio" (unused)
        resp = client.delete(f"/api/v1/categories/{cat.id}", headers=api_headers)
        assert resp.status_code == 200

    def test_delete_category_in_use(
        self, client, api_headers, exercise_categories, exercise_definition, app
    ):
        from project import db
        from project.models import ExerciseCategory, ExerciseDefinition

        with app.app_context():
            ex = db.session.get(ExerciseDefinition, exercise_definition.id)
            cat = db.session.get(ExerciseCategory, exercise_categories[0].id)
            ex.categories = [cat]
            db.session.commit()
            cat_id = cat.id

        resp = client.delete(f"/api/v1/categories/{cat_id}", headers=api_headers)
        assert resp.status_code == 409

    def test_delete_category_not_found(self, client, api_headers):
        resp = client.delete("/api/v1/categories/99999", headers=api_headers)
        assert resp.status_code == 404
