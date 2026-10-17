"""Integration tests for the admin-curated app library (catalog)."""

import json

import pytest

from project import db
from project.models import UserBlock


def _post(client, headers, url, body=None):
    return client.post(url, headers=headers, data=json.dumps(body or {}))


@pytest.fixture
def catalog_exercise(client, api_headers_admin):
    resp = _post(
        client,
        api_headers_admin,
        "/api/v1/exercises",
        {"title": "Tuck Planche", "counting_type": "duration", "is_catalog": True},
    )
    assert resp.status_code == 201
    return resp.get_json()["data"]["id"]


class TestCatalogCreate:
    def test_non_admin_cannot_create_catalog_exercise(self, client, api_headers):
        resp = _post(
            client,
            api_headers,
            "/api/v1/exercises",
            {"title": "X", "is_catalog": True},
        )
        assert resp.status_code == 403

    def test_non_admin_cannot_flag_existing_exercise(
        self, client, api_headers, exercise_definition
    ):
        resp = client.put(
            f"/api/v1/exercises/{exercise_definition.id}",
            headers=api_headers,
            data=json.dumps({"is_catalog": True}),
        )
        assert resp.status_code == 403

    def test_admin_creates_public_catalog_exercise(
        self, client, api_headers_admin, catalog_exercise
    ):
        data = client.get(
            f"/api/v1/exercises/{catalog_exercise}", headers=api_headers_admin
        ).get_json()["data"]
        assert data["is_catalog"] is True
        assert data["visibility"] == "public"

    def test_invalid_flag_type(self, client, api_headers_admin):
        resp = _post(
            client,
            api_headers_admin,
            "/api/v1/exercises",
            {"title": "X", "is_catalog": "yes"},
        )
        assert resp.status_code == 400

    def test_other_user_cannot_edit_catalog_exercise(
        self, client, api_headers, catalog_exercise
    ):
        resp = client.put(
            f"/api/v1/exercises/{catalog_exercise}",
            headers=api_headers,
            data=json.dumps({"title": "Hacked"}),
        )
        assert resp.status_code == 403


class TestCatalogList:
    def test_users_see_catalog(self, client, api_headers, catalog_exercise):
        resp = client.get("/api/v1/catalog/exercises", headers=api_headers)
        data = resp.get_json()["data"]
        assert [e["id"] for e in data] == [catalog_exercise]
        assert data[0]["imported_exercise_id"] is None
        assert data[0]["category_ids"] == []

    def test_catalog_hidden_from_regular_lists(
        self, client, api_headers, api_headers_admin, catalog_exercise
    ):
        for headers in (api_headers, api_headers_admin):
            for scope in ("mine", "all", "following"):
                resp = client.get(f"/api/v1/exercises?user={scope}", headers=headers)
                assert resp.get_json()["data"] == []

    def test_search(self, client, api_headers, api_headers_admin, catalog_exercise):
        _post(
            client,
            api_headers_admin,
            "/api/v1/exercises",
            {"title": "Pike Push-up", "is_catalog": True},
        )
        resp = client.get("/api/v1/catalog/exercises?q=planche", headers=api_headers)
        assert [e["title"] for e in resp.get_json()["data"]] == ["Tuck Planche"]
        resp = client.get("/api/v1/catalog/exercises?q=%25", headers=api_headers)
        assert resp.get_json()["data"] == []

    def test_requires_login(self, client):
        assert client.get("/api/v1/catalog/exercises").status_code == 401

    def test_visible_even_if_user_blocked_admin(
        self, client, api_headers, catalog_exercise, user, admin_user
    ):
        db.session.add(UserBlock(blocker_id=user.id, blocked_id=admin_user.id))
        db.session.commit()
        resp = client.get("/api/v1/catalog/exercises", headers=api_headers)
        assert len(resp.get_json()["data"]) == 1

    def test_archived_not_listed(
        self, client, api_headers, api_headers_admin, catalog_exercise
    ):
        client.delete(
            f"/api/v1/exercises/{catalog_exercise}", headers=api_headers_admin
        )
        resp = client.get("/api/v1/catalog/exercises", headers=api_headers)
        assert resp.get_json()["data"] == []


class TestCatalogImport:
    def test_import_copies_without_suffix(
        self, client, api_headers, catalog_exercise, user
    ):
        resp = _post(
            client, api_headers, f"/api/v1/catalog/exercises/{catalog_exercise}/import"
        )
        assert resp.status_code == 201
        data = resp.get_json()["data"]
        assert data["title"] == "Tuck Planche"
        assert data["user_id"] == user.id
        assert data["is_catalog"] is False
        assert data["counting_type"] == "duration"

        mine = client.get("/api/v1/exercises?user=mine", headers=api_headers)
        assert [e["id"] for e in mine.get_json()["data"]] == [data["id"]]

    def test_import_twice_reuses_copy_and_marks_listing(
        self, client, api_headers, catalog_exercise
    ):
        url = f"/api/v1/catalog/exercises/{catalog_exercise}/import"
        first = _post(client, api_headers, url)
        second = _post(client, api_headers, url)
        assert second.status_code == 200
        own_id = first.get_json()["data"]["id"]
        assert second.get_json()["data"]["id"] == own_id
        listed = client.get("/api/v1/catalog/exercises", headers=api_headers)
        assert listed.get_json()["data"][0]["imported_exercise_id"] == own_id

    def test_import_title_clash_gets_owner_suffix(
        self, client, api_headers, catalog_exercise
    ):
        _post(
            client,
            api_headers,
            "/api/v1/exercises",
            {"title": "Tuck Planche", "counting_type": "duration"},
        )
        resp = _post(
            client, api_headers, f"/api/v1/catalog/exercises/{catalog_exercise}/import"
        )
        assert resp.get_json()["data"]["title"] == "Tuck Planche (adminuser)"

    def test_import_copies_progression_children(
        self, client, api_headers, api_headers_admin
    ):
        child = _post(
            client,
            api_headers_admin,
            "/api/v1/exercises",
            {"title": "Frog Stand", "is_catalog": True},
        ).get_json()["data"]["id"]
        parent = _post(
            client,
            api_headers_admin,
            "/api/v1/exercises",
            {"title": "Planche", "is_catalog": True, "progressions": [child]},
        ).get_json()["data"]["id"]

        resp = _post(client, api_headers, f"/api/v1/catalog/exercises/{parent}/import")
        data = resp.get_json()["data"]
        assert [p["title"] for p in data["progressions"]] == ["Frog Stand"]
        assert data["progressions"][0]["id"] != child

    def test_import_unknown_or_non_catalog_is_404(
        self, client, api_headers, api_headers_second, exercise_definition
    ):
        for ex_id in (99999, exercise_definition.id):
            resp = _post(
                client, api_headers_second, f"/api/v1/catalog/exercises/{ex_id}/import"
            )
            assert resp.status_code == 404

    def test_admin_cannot_import_own(self, client, api_headers_admin, catalog_exercise):
        resp = _post(
            client,
            api_headers_admin,
            f"/api/v1/catalog/exercises/{catalog_exercise}/import",
        )
        assert resp.status_code == 400


class TestCatalogInWorkouts:
    def test_catalog_exercise_cannot_be_used_directly(
        self, client, api_headers, catalog_exercise
    ):
        resp = _post(
            client,
            api_headers,
            "/api/v1/workouts",
            {
                "title": "W",
                "exercises": [
                    {
                        "exercise_definition_id": catalog_exercise,
                        "sets": [{"duration": 5}],
                    }
                ],
            },
        )
        assert resp.status_code == 400


class TestAdminFlagInProfile:
    def test_profile_exposes_own_admin_flag_only(
        self, client, api_headers, api_headers_admin
    ):
        mine = client.get("/api/v1/auth/profile", headers=api_headers)
        admin = client.get("/api/v1/auth/profile", headers=api_headers_admin)
        assert mine.get_json()["data"]["admin"] is False
        assert admin.get_json()["data"]["admin"] is True

    def test_admin_flag_not_in_public_profile(self, client, api_headers, admin_user):
        resp = client.get(f"/api/v1/users/{admin_user.username}", headers=api_headers)
        if resp.status_code == 200:
            assert "admin" not in resp.get_json()["data"]


class TestCopyButtonOnCatalogExercise:
    def test_plain_copy_of_catalog_exercise_has_no_suffix(
        self, client, api_headers, catalog_exercise
    ):
        resp = _post(client, api_headers, f"/api/v1/exercises/{catalog_exercise}/copy")
        assert resp.status_code == 201
        assert resp.get_json()["data"]["title"] == "Tuck Planche"


@pytest.fixture
def catalog_skill(client, api_headers_admin):
    tuck = _post(
        client,
        api_headers_admin,
        "/api/v1/exercises",
        {"title": "Tuck Hold", "counting_type": "duration", "is_catalog": True},
    ).get_json()["data"]["id"]
    straddle = _post(
        client,
        api_headers_admin,
        "/api/v1/exercises",
        {"title": "Straddle Hold", "counting_type": "duration", "is_catalog": True},
    ).get_json()["data"]["id"]
    resp = _post(
        client,
        api_headers_admin,
        "/api/v1/skills",
        {
            "title": "Planche",
            "is_catalog": True,
            "exercises": [
                {"exercise_id": tuck, "target_value": 10},
                {"exercise_id": straddle, "target_value": 15},
            ],
        },
    )
    assert resp.status_code == 201
    return {"id": resp.get_json()["data"]["id"], "tuck": tuck, "straddle": straddle}


class TestCatalogSkills:
    def test_non_admin_cannot_create_catalog_skill(self, client, api_headers):
        resp = _post(
            client, api_headers, "/api/v1/skills", {"title": "X", "is_catalog": True}
        )
        assert resp.status_code == 403

    def test_catalog_skill_needs_catalog_exercises(self, client, api_headers_admin):
        own = _post(
            client, api_headers_admin, "/api/v1/exercises", {"title": "Private one"}
        ).get_json()["data"]["id"]
        resp = _post(
            client,
            api_headers_admin,
            "/api/v1/skills",
            {
                "title": "Bad",
                "is_catalog": True,
                "exercises": [{"exercise_id": own, "target_value": 5}],
            },
        )
        assert resp.status_code == 400

    def test_personal_skill_cannot_contain_catalog_exercise(
        self, client, api_headers_admin, catalog_exercise
    ):
        resp = _post(
            client,
            api_headers_admin,
            "/api/v1/skills",
            {
                "title": "Mine",
                "exercises": [{"exercise_id": catalog_exercise, "target_value": 5}],
            },
        )
        assert resp.status_code == 400

    def test_catalog_skill_hidden_from_personal_list(
        self, client, api_headers, api_headers_admin, catalog_skill
    ):
        for headers in (api_headers, api_headers_admin):
            assert (
                client.get("/api/v1/skills", headers=headers).get_json()["data"] == []
            )

    def test_list_catalog_skills_shows_plan_only(
        self, client, api_headers, catalog_skill
    ):
        data = client.get("/api/v1/catalog/skills", headers=api_headers).get_json()[
            "data"
        ]
        assert [s["title"] for s in data] == ["Planche"]
        assert [(e["title"], e["target_value"]) for e in data[0]["exercises"]] == [
            ("Tuck Hold", 10),
            ("Straddle Hold", 15),
        ]
        assert "best" not in data[0]["exercises"][0]
        assert data[0]["imported_skill_id"] is None

    def test_import_creates_skill_and_exercises(
        self, client, api_headers, catalog_skill
    ):
        resp = _post(
            client, api_headers, f"/api/v1/catalog/skills/{catalog_skill['id']}/import"
        )
        assert resp.status_code == 201
        skill_id = resp.get_json()["data"]["id"]

        skill = client.get(
            f"/api/v1/skills/{skill_id}", headers=api_headers
        ).get_json()["data"]
        assert skill["is_catalog"] is False
        assert [(e["title"], e["target_value"]) for e in skill["exercises"]] == [
            ("Tuck Hold", 10),
            ("Straddle Hold", 15),
        ]
        mine = client.get("/api/v1/exercises?user=mine", headers=api_headers)
        assert {e["title"] for e in mine.get_json()["data"]} == {
            "Tuck Hold",
            "Straddle Hold",
        }
        own_ids = {e["id"] for e in mine.get_json()["data"]}
        assert {e["exercise_id"] for e in skill["exercises"]} == own_ids

    def test_import_twice_reuses_skill(self, client, api_headers, catalog_skill):
        url = f"/api/v1/catalog/skills/{catalog_skill['id']}/import"
        first = _post(client, api_headers, url)
        second = _post(client, api_headers, url)
        assert second.status_code == 200
        assert first.get_json()["data"]["id"] == second.get_json()["data"]["id"]
        listed = client.get("/api/v1/catalog/skills", headers=api_headers)
        assert (
            listed.get_json()["data"][0]["imported_skill_id"]
            == first.get_json()["data"]["id"]
        )
        assert (
            len(client.get("/api/v1/skills", headers=api_headers).get_json()["data"])
            == 1
        )

    def test_import_reuses_already_imported_exercise(
        self, client, api_headers, catalog_skill
    ):
        imported = _post(
            client,
            api_headers,
            f"/api/v1/catalog/exercises/{catalog_skill['tuck']}/import",
        ).get_json()["data"]["id"]
        resp = _post(
            client, api_headers, f"/api/v1/catalog/skills/{catalog_skill['id']}/import"
        )
        skill = client.get(
            f"/api/v1/skills/{resp.get_json()['data']['id']}", headers=api_headers
        ).get_json()["data"]
        assert skill["exercises"][0]["exercise_id"] == imported
        mine = client.get("/api/v1/exercises?user=mine", headers=api_headers)
        assert len(mine.get_json()["data"]) == 2

    def test_import_title_clash_gets_owner_suffix(
        self, client, api_headers, catalog_skill
    ):
        _post(client, api_headers, "/api/v1/skills", {"title": "Planche"})
        resp = _post(
            client, api_headers, f"/api/v1/catalog/skills/{catalog_skill['id']}/import"
        )
        assert resp.get_json()["data"]["title"] == "Planche (adminuser)"

    def test_import_non_catalog_skill_is_404(
        self, client, api_headers, api_headers_second
    ):
        skill_id = _post(
            client, api_headers, "/api/v1/skills", {"title": "Private"}
        ).get_json()["data"]["id"]
        resp = _post(
            client, api_headers_second, f"/api/v1/catalog/skills/{skill_id}/import"
        )
        assert resp.status_code == 404

    def test_admin_cannot_import_own(self, client, api_headers_admin, catalog_skill):
        resp = _post(
            client,
            api_headers_admin,
            f"/api/v1/catalog/skills/{catalog_skill['id']}/import",
        )
        assert resp.status_code == 400

    def test_catalog_skill_not_in_exercise_skills_field(
        self, client, api_headers_admin, catalog_skill
    ):
        data = client.get(
            f"/api/v1/exercises/{catalog_skill['tuck']}", headers=api_headers_admin
        ).get_json()["data"]
        assert data["skills"] == []
