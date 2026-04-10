from flask import Blueprint

bp = Blueprint("auth", __name__)

from project.auth import routes  # noqa: E402

__all__ = ("routes",)  # handles flake8 top level import
