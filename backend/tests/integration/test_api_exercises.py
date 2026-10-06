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

    def test_list_all_excludes_others_followers_only_exercises_from_non_follower(
        self, client, api_headers_second, exercise_definition
    ):
        # exercise_definition defaults to followers-only and is owned by `user`,
        # and `second_user` does not follow `user`.
        resp = client.get("/api/v1/exercises?user=all", headers=api_headers_second)
        assert resp.status_code == 200
        assert resp.get_json()["data"] == []

    def test_list_all_includes_others_followers_only_exercises_for_follower(
        self, client, api_headers_second, exercise_definition, second_user, user, app
    ):
        from project import db
        from project.models import User

        with app.app_context():
            follower = db.session.get(User, second_user.id)
            followed = db.session.get(User, user.id)
            follower.request_follow(followed)
            followed.accept_follow_request(follower)
            db.session.commit()

        resp = client.get("/api/v1/exercises?user=all", headers=api_headers_second)
        assert resp.status_code == 200
        titles = [e["title"] for e in resp.get_json()["data"]]
        assert titles == ["Push-ups"]

    def test_list_all_includes_others_public_exercises(
        self, client, api_headers_second, exercise_definition, app
    ):
        from project import db
        from project.models import ExerciseDefinition

        with app.app_context():
            ex = db.session.get(ExerciseDefinition, exercise_definition.id)
            ex.visibility = "public"
            db.session.commit()

        resp = client.get("/api/v1/exercises?user=all", headers=api_headers_second)
        assert resp.status_code == 200
        titles = [e["title"] for e in resp.get_json()["data"]]
        assert titles == ["Push-ups"]

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

    def _exercises_with_categories(self, app, user, exercise_categories):
        """Create three exercises: Cardio only, Core only, Cardio + Core."""
        from project import db
        from project.models import ExerciseCategory, ExerciseDefinition

        with app.app_context():
            cardio = db.session.get(ExerciseCategory, exercise_categories[0].id)
            core = db.session.get(ExerciseCategory, exercise_categories[1].id)
            for title, cats in [
                ("Only Cardio", [cardio]),
                ("Only Core", [core]),
                ("Cardio And Core", [cardio, core]),
            ]:
                ex = ExerciseDefinition(title=title, user_id=user.id)
                ex.categories = cats
                db.session.add(ex)
            db.session.commit()
            return cardio.id, core.id

    def test_filter_multiple_categories_comma_separated_is_and(
        self, client, api_headers, user, exercise_categories, app
    ):
        # The web and mobile clients send ?category=1,2 (one comma-joined value).
        cardio_id, core_id = self._exercises_with_categories(
            app, user, exercise_categories
        )
        resp = client.get(
            f"/api/v1/exercises?category={cardio_id},{core_id}", headers=api_headers
        )
        assert resp.status_code == 200
        titles = [e["title"] for e in resp.get_json()["data"]]
        assert titles == ["Cardio And Core"]

    def test_filter_multiple_categories_repeated_params_is_and(
        self, client, api_headers, user, exercise_categories, app
    ):
        cardio_id, core_id = self._exercises_with_categories(
            app, user, exercise_categories
        )
        resp = client.get(
            f"/api/v1/exercises?category={cardio_id}&category={core_id}",
            headers=api_headers,
        )
        assert resp.status_code == 200
        titles = [e["title"] for e in resp.get_json()["data"]]
        assert titles == ["Cardio And Core"]

    def test_filter_invalid_category_returns_400(self, client, api_headers):
        resp = client.get("/api/v1/exercises?category=abc", headers=api_headers)
        assert resp.status_code == 400


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
                }
            ),
        )
        assert resp.status_code == 201
        data = resp.get_json()["data"]
        assert data["title"] == "Pull-ups"
        assert data["progressions"] == []
        assert data["progression_levels"] == []

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

    def test_create_exercise_defaults_followers(self, client, api_headers):
        resp = client.post(
            "/api/v1/exercises",
            headers=api_headers,
            data=json.dumps({"title": "Squats", "counting_type": "reps"}),
        )
        assert resp.status_code == 201
        assert resp.get_json()["data"]["visibility"] == "followers"

    def test_create_exercise_public(self, client, api_headers):
        resp = client.post(
            "/api/v1/exercises",
            headers=api_headers,
            data=json.dumps(
                {"title": "Lunges", "counting_type": "reps", "visibility": "public"}
            ),
        )
        assert resp.status_code == 201
        assert resp.get_json()["data"]["visibility"] == "public"

    def test_create_exercise_invalid_visibility(self, client, api_headers):
        resp = client.post(
            "/api/v1/exercises",
            headers=api_headers,
            data=json.dumps(
                {"title": "Burpees", "counting_type": "reps", "visibility": "bogus"}
            ),
        )
        assert resp.status_code == 400


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

    def test_get_followers_only_exercise_forbidden_for_non_follower(
        self, client, api_headers_second, exercise_definition
    ):
        resp = client.get(
            f"/api/v1/exercises/{exercise_definition.id}", headers=api_headers_second
        )
        assert resp.status_code == 404

    def test_get_followers_only_exercise_visible_to_follower(
        self, client, api_headers_second, exercise_definition, second_user, user, app
    ):
        from project import db
        from project.models import User

        with app.app_context():
            follower = db.session.get(User, second_user.id)
            followed = db.session.get(User, user.id)
            follower.request_follow(followed)
            followed.accept_follow_request(follower)
            db.session.commit()

        resp = client.get(
            f"/api/v1/exercises/{exercise_definition.id}", headers=api_headers_second
        )
        assert resp.status_code == 200

    def test_get_private_exercise_forbidden_even_for_follower(
        self, client, api_headers_second, exercise_definition, second_user, user, app
    ):
        from project import db
        from project.models import User

        with app.app_context():
            follower = db.session.get(User, second_user.id)
            followed = db.session.get(User, user.id)
            follower.request_follow(followed)
            followed.accept_follow_request(follower)
            exercise_definition.visibility = "private"
            db.session.commit()

        resp = client.get(
            f"/api/v1/exercises/{exercise_definition.id}", headers=api_headers_second
        )
        assert resp.status_code == 404

    def test_get_public_exercise_visible_to_others(
        self, client, api_headers_second, exercise_definition, app
    ):
        from project import db

        exercise_definition.visibility = "public"
        db.session.commit()

        resp = client.get(
            f"/api/v1/exercises/{exercise_definition.id}", headers=api_headers_second
        )
        assert resp.status_code == 200


class TestApiUpdateExercise:
    def test_update_exercise(self, client, api_headers, exercise_definition):
        resp = client.put(
            f"/api/v1/exercises/{exercise_definition.id}",
            headers=api_headers,
            data=json.dumps(
                {
                    "title": "Diamond Push-ups",
                    # Legacy name list from older app versions: accepted, ignored.
                    "progression_levels": ["Easy", "Hard"],
                }
            ),
        )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["title"] == "Diamond Push-ups"
        assert data["progressions"] == []

    def test_update_exercise_visibility(self, client, api_headers, exercise_definition):
        resp = client.put(
            f"/api/v1/exercises/{exercise_definition.id}",
            headers=api_headers,
            data=json.dumps({"visibility": "public"}),
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["visibility"] == "public"

    def test_update_exercise_invalid_visibility(
        self, client, api_headers, exercise_definition
    ):
        resp = client.put(
            f"/api/v1/exercises/{exercise_definition.id}",
            headers=api_headers,
            data=json.dumps({"visibility": "bogus"}),
        )
        assert resp.status_code == 400

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
        self, client, api_headers_second, exercise_definition, second_user, app
    ):
        from project import db

        exercise_definition.visibility = "public"
        db.session.commit()

        resp = client.post(
            f"/api/v1/exercises/{exercise_definition.id}/copy",
            headers=api_headers_second,
        )
        assert resp.status_code == 201
        data = resp.get_json()["data"]
        assert "Kopie" in data["title"]
        assert data["user_id"] == second_user.id
        assert data["visibility"] == "followers"

    def test_copy_own_exercise(self, client, api_headers, exercise_definition):
        resp = client.post(
            f"/api/v1/exercises/{exercise_definition.id}/copy",
            headers=api_headers,
        )
        assert resp.status_code == 400

    def test_copy_followers_only_exercise_not_found_for_non_follower(
        self, client, api_headers_second, exercise_definition
    ):
        # exercise_definition defaults to followers-only and is owned by `user`,
        # and `second_user` does not follow `user`.
        resp = client.post(
            f"/api/v1/exercises/{exercise_definition.id}/copy",
            headers=api_headers_second,
        )
        assert resp.status_code == 404

    def test_copy_followers_only_exercise_allowed_for_follower(
        self, client, api_headers_second, exercise_definition, second_user, user, app
    ):
        from project import db
        from project.models import User

        with app.app_context():
            follower = db.session.get(User, second_user.id)
            followed = db.session.get(User, user.id)
            follower.request_follow(followed)
            followed.accept_follow_request(follower)
            db.session.commit()

        resp = client.post(
            f"/api/v1/exercises/{exercise_definition.id}/copy",
            headers=api_headers_second,
        )
        assert resp.status_code == 201


class TestApiExerciseUsage:
    def test_used_count_zero_when_unused(
        self, client, api_headers, exercise_definition
    ):
        resp = client.get("/api/v1/exercises", headers=api_headers)
        assert resp.get_json()["data"][0]["used_count"] == 0

    def test_used_count_in_list_and_detail(
        self, client, api_headers, exercise_definition, workout
    ):
        resp = client.get("/api/v1/exercises", headers=api_headers)
        assert resp.get_json()["data"][0]["used_count"] == 1
        resp = client.get(
            f"/api/v1/exercises/{exercise_definition.id}", headers=api_headers
        )
        assert resp.get_json()["data"]["used_count"] == 1

    def test_workouts_list_for_exercise(
        self, client, api_headers, exercise_definition, workout
    ):
        resp = client.get(
            f"/api/v1/exercises/{exercise_definition.id}/workouts",
            headers=api_headers,
        )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert [w["title"] for w in data] == ["Morning Workout"]
        assert set(data[0]) == {"id", "title", "planned_date", "is_done"}

    def test_workouts_list_empty_when_unused(
        self, client, api_headers, exercise_definition
    ):
        resp = client.get(
            f"/api/v1/exercises/{exercise_definition.id}/workouts",
            headers=api_headers,
        )
        assert resp.get_json()["data"] == []

    def test_workouts_list_404_for_invisible_exercise(
        self, client, api_headers_second, exercise_definition
    ):
        resp = client.get(
            f"/api/v1/exercises/{exercise_definition.id}/workouts",
            headers=api_headers_second,
        )
        assert resp.status_code == 404


THUMB = "a" * 32 + ".webp"
OTHER_THUMB = "b" * 32 + ".webp"


def _add_upload(app, user_id, filename):
    from project import db
    from project.models import UploadedImage

    with app.app_context():
        db.session.add(UploadedImage(filename=filename, user_id=user_id))
        db.session.commit()


class TestApiExerciseThumbnail:
    def test_no_thumbnail_by_default(self, client, api_headers, exercise_definition):
        data = client.get("/api/v1/exercises", headers=api_headers).get_json()["data"]
        assert data[0]["thumbnail"] is None
        assert data[0]["thumbnail_url"] is None

    def test_falls_back_to_first_description_image(self, client, api_headers):
        desc = f"Intro\n\n![x](/static/exercise_images/{THUMB})\n\n![y](/static/exercise_images/{OTHER_THUMB})"
        resp = client.post(
            "/api/v1/exercises",
            headers=api_headers,
            data=json.dumps({"title": "Pike", "description": desc}),
        )
        data = resp.get_json()["data"]
        assert data["thumbnail"] is None
        assert data["thumbnail_url"] == f"/static/exercise_images/{THUMB}"

    def test_create_with_own_thumbnail(self, app, client, api_headers, user):
        _add_upload(app, user.id, THUMB)
        resp = client.post(
            "/api/v1/exercises",
            headers=api_headers,
            data=json.dumps({"title": "Pike", "thumbnail": THUMB}),
        )
        assert resp.status_code == 201
        data = resp.get_json()["data"]
        assert data["thumbnail"] == THUMB
        assert data["thumbnail_url"] == f"/static/exercise_images/{THUMB}"

    def test_explicit_thumbnail_beats_description_image(
        self, app, client, api_headers, user
    ):
        _add_upload(app, user.id, THUMB)
        desc = f"![y](/static/exercise_images/{OTHER_THUMB})"
        resp = client.post(
            "/api/v1/exercises",
            headers=api_headers,
            data=json.dumps({"title": "Pike", "description": desc, "thumbnail": THUMB}),
        )
        assert resp.get_json()["data"]["thumbnail_url"].endswith(THUMB)

    def test_rejects_thumbnail_not_uploaded_by_user(
        self, app, client, api_headers, second_user
    ):
        _add_upload(app, second_user.id, THUMB)
        resp = client.post(
            "/api/v1/exercises",
            headers=api_headers,
            data=json.dumps({"title": "Pike", "thumbnail": THUMB}),
        )
        assert resp.status_code == 400

    def test_rejects_malformed_thumbnail(self, client, api_headers):
        for bad in ("../../etc/passwd", "x.webp", 5):
            resp = client.post(
                "/api/v1/exercises",
                headers=api_headers,
                data=json.dumps({"title": "Pike", "thumbnail": bad}),
            )
            assert resp.status_code == 400, bad

    def test_update_and_clear_thumbnail(
        self, app, client, api_headers, user, exercise_definition
    ):
        _add_upload(app, user.id, THUMB)
        url = f"/api/v1/exercises/{exercise_definition.id}"
        resp = client.put(
            url, headers=api_headers, data=json.dumps({"thumbnail": THUMB})
        )
        assert resp.get_json()["data"]["thumbnail"] == THUMB
        resp = client.put(
            url, headers=api_headers, data=json.dumps({"thumbnail": None})
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["thumbnail"] is None

    def test_copy_keeps_thumbnail_and_stays_editable(
        self, app, client, api_headers, api_headers_second, user
    ):
        _add_upload(app, user.id, THUMB)
        original = client.post(
            "/api/v1/exercises",
            headers=api_headers,
            data=json.dumps(
                {"title": "Pike", "thumbnail": THUMB, "visibility": "public"}
            ),
        ).get_json()["data"]
        copy = client.post(
            f"/api/v1/exercises/{original['id']}/copy", headers=api_headers_second
        ).get_json()["data"]
        assert copy["thumbnail"] == THUMB
        # Re-sending the unchanged value (form round-trip) must not be rejected.
        resp = client.put(
            f"/api/v1/exercises/{copy['id']}",
            headers=api_headers_second,
            data=json.dumps({"thumbnail": THUMB, "title": "Mine"}),
        )
        assert resp.status_code == 200
