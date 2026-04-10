"""API-specific error handlers returning JSON responses."""

from flask import jsonify
from flask.typing import ResponseReturnValue
from werkzeug.exceptions import HTTPException

from project import db
from project.api import bp


@bp.errorhandler(400)
def bad_request(error: HTTPException) -> ResponseReturnValue:
    return jsonify({"error": "Bad request."}), 400


@bp.errorhandler(404)
def not_found(error: HTTPException) -> ResponseReturnValue:
    return jsonify({"error": "Resource not found."}), 404


@bp.errorhandler(403)
def forbidden(error: HTTPException) -> ResponseReturnValue:
    db.session.rollback()
    return jsonify({"error": "Forbidden."}), 403


@bp.errorhandler(500)
def internal_error(error: HTTPException) -> ResponseReturnValue:
    db.session.rollback()
    return jsonify({"error": "Internal server error."}), 500
