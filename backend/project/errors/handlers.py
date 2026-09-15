from flask import jsonify
from flask.typing import ResponseReturnValue
from project import db
from project.errors import bp
from werkzeug.exceptions import HTTPException


@bp.app_errorhandler(404)
def not_found_error(error: HTTPException) -> ResponseReturnValue:
    return jsonify({"error": "Resource not found."}), 404


@bp.app_errorhandler(403)
def forbidden_error(error: HTTPException) -> ResponseReturnValue:
    db.session.rollback()
    return jsonify({"error": "Forbidden."}), 403


@bp.app_errorhandler(500)
def internal_error(error: HTTPException) -> ResponseReturnValue:
    db.session.rollback()
    return jsonify({"error": "Internal server error."}), 500
