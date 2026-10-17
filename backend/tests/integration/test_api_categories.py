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

    def test_list_categories_only_own(
        self, client, api_headers_second, exercise_categories
    ):
        resp = client.get("/api/v1/categories", headers=api_headers_second)
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

    def test_rename_foreign_category_is_404(
        self, client, api_headers_second, exercise_categories, second_user
    ):
        resp = client.put(
            f"/api/v1/categories/{exercise_categories[0].id}",
            headers=api_headers_second,
            data=json.dumps({"name": "Mine now"}),
        )
        assert resp.status_code == 404

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

    def test_delete_foreign_category_is_404(
        self, client, api_headers_second, exercise_categories, second_user
    ):
        resp = client.delete(
            f"/api/v1/categories/{exercise_categories[0].id}",
            headers=api_headers_second,
        )
        assert resp.status_code == 404

    def test_delete_category_not_found(self, client, api_headers):
        resp = client.delete("/api/v1/categories/99999", headers=api_headers)
        assert resp.status_code == 404


class TestApiCategoryGroups:
    def test_list_creates_defaults(self, client, api_headers):
        resp = client.get("/api/v1/category-groups", headers=api_headers)
        assert resp.status_code == 200
        names = [g["name"] for g in resp.get_json()["data"]]
        assert names == ["Workout-Art", "Körperteile"]
        # idempotent
        resp = client.get("/api/v1/category-groups", headers=api_headers)
        assert len(resp.get_json()["data"]) == 2

    def test_groups_are_per_user(self, client, api_headers, api_headers_second):
        client.post(
            "/api/v1/category-groups",
            headers=api_headers,
            data=json.dumps({"name": "Skills-Typ"}),
        )
        resp = client.get("/api/v1/category-groups", headers=api_headers_second)
        names = [g["name"] for g in resp.get_json()["data"]]
        assert "Skills-Typ" not in names

    def test_create_rename_delete_group(self, client, api_headers):
        resp = client.post(
            "/api/v1/category-groups",
            headers=api_headers,
            data=json.dumps({"name": "Equipment"}),
        )
        assert resp.status_code == 201
        gid = resp.get_json()["data"]["id"]

        resp = client.put(
            f"/api/v1/category-groups/{gid}",
            headers=api_headers,
            data=json.dumps({"name": "Geräte"}),
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["name"] == "Geräte"

        resp = client.delete(f"/api/v1/category-groups/{gid}", headers=api_headers)
        assert resp.status_code == 200

    def test_foreign_group_is_404(self, client, api_headers, api_headers_second):
        gid = client.post(
            "/api/v1/category-groups",
            headers=api_headers,
            data=json.dumps({"name": "Privat"}),
        ).get_json()["data"]["id"]
        for method in (client.put, client.delete):
            resp = method(
                f"/api/v1/category-groups/{gid}",
                headers=api_headers_second,
                data=json.dumps({"name": "x"}),
            )
            assert resp.status_code == 404

    def test_assign_category_to_group_and_delete_group(self, client, api_headers):
        gid = client.post(
            "/api/v1/category-groups",
            headers=api_headers,
            data=json.dumps({"name": "Equipment"}),
        ).get_json()["data"]["id"]
        cat = client.post(
            "/api/v1/categories",
            headers=api_headers,
            data=json.dumps({"name": "Rings", "group_id": gid}),
        ).get_json()["data"]
        assert cat["group_id"] == gid

        client.delete(f"/api/v1/category-groups/{gid}", headers=api_headers)
        cats = client.get("/api/v1/categories", headers=api_headers).get_json()["data"]
        assert cats[0]["group_id"] is None

    def test_cannot_assign_foreign_group(self, client, api_headers, api_headers_second):
        gid = client.post(
            "/api/v1/category-groups",
            headers=api_headers_second,
            data=json.dumps({"name": "Fremd"}),
        ).get_json()["data"]["id"]
        resp = client.post(
            "/api/v1/categories",
            headers=api_headers,
            data=json.dumps({"name": "X", "group_id": gid}),
        )
        assert resp.status_code == 404

    def test_update_category_group_only(self, client, api_headers):
        gid = client.post(
            "/api/v1/category-groups",
            headers=api_headers,
            data=json.dumps({"name": "Equipment"}),
        ).get_json()["data"]["id"]
        cid = client.post(
            "/api/v1/categories", headers=api_headers, data=json.dumps({"name": "Bar"})
        ).get_json()["data"]["id"]
        resp = client.put(
            f"/api/v1/categories/{cid}",
            headers=api_headers,
            data=json.dumps({"group_id": gid}),
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["name"] == "Bar"
        assert resp.get_json()["data"]["group_id"] == gid


class TestExerciseCategoryOwnership:
    def test_foreign_category_ids_are_ignored_on_create(
        self, client, api_headers, api_headers_second, exercise_categories
    ):
        # exercise_categories belong to the first user; second user can't use them
        resp = client.post(
            "/api/v1/exercises",
            headers=api_headers_second,
            data=json.dumps(
                {
                    "title": "Mine",
                    "counting_type": "reps",
                    "category_ids": [exercise_categories[0].id],
                }
            ),
        )
        assert resp.status_code == 201
        assert resp.get_json()["data"]["category_ids"] == []

    def test_own_category_ids_are_kept_on_create(
        self, client, api_headers, exercise_categories
    ):
        resp = client.post(
            "/api/v1/exercises",
            headers=api_headers,
            data=json.dumps(
                {
                    "title": "Mine",
                    "counting_type": "reps",
                    "category_ids": [exercise_categories[0].id],
                }
            ),
        )
        assert resp.status_code == 201
        assert resp.get_json()["data"]["category_ids"] == [exercise_categories[0].id]

    def test_account_deletion_removes_categories_and_groups(
        self, client, api_headers, exercise_categories, app, user
    ):
        client.get("/api/v1/category-groups", headers=api_headers)
        from project import db
        from project.models import CategoryGroup, ExerciseCategory

        resp = client.delete("/api/v1/auth/account", headers=api_headers)
        assert resp.status_code == 200
        with app.app_context():
            assert db.session.scalars(db.select(ExerciseCategory)).all() == []
            assert db.session.scalars(db.select(CategoryGroup)).all() == []
