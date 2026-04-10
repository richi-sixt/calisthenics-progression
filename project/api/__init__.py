"""API blueprint for JSON endpoints consumed by mobile and external clients."""

from flask import Blueprint

bp = Blueprint("api", __name__)

from project.api import (  # noqa: E402, F401
    auth_routes,
    category_routes,
    errors,
    exercise_routes,
    social_routes,
    workout_routes,
)
