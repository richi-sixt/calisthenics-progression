"""Integration tests for the app-wide JSON error handlers."""

import pytest

__all__ = ("pytest",)


class TestErrorHandlers:
    """Tests for the app-wide error handlers (project/errors/handlers.py)."""

    def test_404_on_unknown_path(self, client, app):
        """An unmatched route returns a JSON 404."""
        with app.app_context():
            response = client.get("/nonexistent-page-that-does-not-exist")
            assert response.status_code == 404
            assert response.content_type.startswith("application/json")
            assert response.get_json() == {"error": "Resource not found."}

    def test_404_on_unknown_api_path(self, client, app):
        """An unmatched /api/v1 route also returns a JSON 404."""
        with app.app_context():
            response = client.get("/api/v1/nonexistent-endpoint")
            assert response.status_code == 404
            assert response.content_type.startswith("application/json")
            assert response.get_json() == {"error": "Resource not found."}

    def test_500_error_returns_json(self, app):
        """An unhandled exception returns a JSON 500."""

        @app.route("/trigger-500")
        def trigger_500():
            raise Exception("Test internal server error")

        app.config["TESTING"] = False
        app.config["PROPAGATE_EXCEPTIONS"] = False
        app.config["TRAP_HTTP_EXCEPTIONS"] = False

        with app.test_client() as client:
            response = client.get("/trigger-500")
            assert response.status_code == 500
            assert response.content_type.startswith("application/json")
            assert response.get_json() == {"error": "Internal server error."}
