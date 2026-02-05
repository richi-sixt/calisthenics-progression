"""Integration tests for error handlers."""

import pytest

from flask import url_for, abort

from project import db


class TestErrorHandlers:
    """Tests for error handler routes."""

    def test_404_error_page(self, client, app):
        """Test 404 error page renders correctly."""
        with app.app_context():
            response = client.get("/nonexistent-page-that-does-not-exist")
            assert response.status_code == 404
            # Should render 404 template
            assert b"404" in response.data or b"nicht gefunden" in response.data.lower()

    def test_404_for_nonexistent_workout(self, auth_client, app):
        """Test 404 for non-existent workout."""
        with app.app_context():
            response = auth_client.get(url_for("main.workout", workout_id=99999))
            assert response.status_code == 404

    def test_404_for_nonexistent_exercise(self, auth_client, app):
        """Test 404 for non-existent exercise."""
        with app.app_context():
            response = auth_client.get(url_for("main.exercise", exercises_id=99999))
            assert response.status_code == 404

    def test_404_for_nonexistent_user(self, auth_client, app):
        """Test 404 for non-existent user profile."""
        with app.app_context():
            response = auth_client.get(
                url_for("main.user", username="definitely-not-a-real-user")
            )
            assert response.status_code == 404

    def test_403_forbidden_delete_workout(self, client, workout, second_user, app):
        """Test 403 when trying to delete another user's workout."""
        with app.app_context():
            from project.models import Workout

            # Login as second user
            with client.session_transaction() as sess:
                sess["_user_id"] = str(second_user.id)
                sess["_fresh"] = True

            workout = Workout.query.first()
            response = client.post(
                url_for("main.delete_workout", workout_id=workout.id)
            )
            assert response.status_code == 403

    def test_403_forbidden_delete_exercise(
        self, client, exercise_definition, second_user, app
    ):
        """Test 403 when trying to delete another user's exercise."""
        with app.app_context():
            from project.models import Exercises

            with client.session_transaction() as sess:
                sess["_user_id"] = str(second_user.id)
                sess["_fresh"] = True

            exercise = Exercises.query.first()
            response = client.post(
                url_for("main.delete_exercise", exercises_id=exercise.id)
            )
            assert response.status_code == 403

    def test_403_forbidden_update_exercise(
        self, client, exercise_definition, second_user, app
    ):
        """Test 403 when trying to update another user's exercise."""
        with app.app_context():
            from project.models import Exercises

            with client.session_transaction() as sess:
                sess["_user_id"] = str(second_user.id)
                sess["_fresh"] = True

            exercise = Exercises.query.first()
            response = client.post(
                url_for("main.update_exercise", exercises_id=exercise.id),
                data={
                    "title": "Unauthorized Update",
                    "description": "This should not work",
                },
            )
            assert response.status_code == 403


class TestErrorHandlerContent:
    """Tests for error page content."""

    def test_404_page_for_known_route_pattern(self, auth_client, app):
        """Test 404 page for non-existent resource in known route."""
        with app.app_context():
            # Use a route pattern that goes through blueprints
            response = auth_client.get(url_for("main.workout", workout_id=99999))
            assert response.status_code == 404
            html = response.get_data(as_text=True)
            # Should render custom 404 template
            assert "404" in html

    def test_error_pages_are_html(self, client, app):
        """Test error pages return HTML content type."""
        with app.app_context():
            response = client.get("/nonexistent")
            assert response.status_code == 404
            assert "text/html" in response.content_type
