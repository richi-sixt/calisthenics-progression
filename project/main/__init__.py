from flask import Blueprint

bp = Blueprint('main', __name__)

from project.main import routes # noqa: F401 # type: ignore[import]
