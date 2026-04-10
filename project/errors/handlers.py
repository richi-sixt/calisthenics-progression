from flask import jsonify, render_template, request
from flask.typing import ResponseReturnValue
from werkzeug.exceptions import HTTPException

from project import db
from project.errors import bp


def _wants_json() -> bool:
    """Check if the request is for an API endpoint."""
    return request.path.startswith("/api/")


@bp.app_errorhandler(404)
def not_found_error(error: HTTPException) -> ResponseReturnValue:
    if _wants_json():
        return jsonify({"error": "Resource not found."}), 404
    return render_template("errors/404.html"), 404


@bp.app_errorhandler(403)
def forbidden_error(error: HTTPException) -> ResponseReturnValue:
    db.session.rollback()
    if _wants_json():
        return jsonify({"error": "Forbidden."}), 403
    return render_template("errors/403.html"), 403


@bp.app_errorhandler(500)
def internal_error(error: HTTPException) -> ResponseReturnValue:
    db.session.rollback()
    if _wants_json():
        return jsonify({"error": "Internal server error."}), 500
    return render_template("errors/500.html"), 500
