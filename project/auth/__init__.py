from flask import Blueprint

bp = Blueprint('auth', __name__)

from project.auth import routes # noqa: F401 # type: ignore[import]
