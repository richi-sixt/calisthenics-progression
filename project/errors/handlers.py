from werkzeug.exceptions import HTTPException
from flask import render_template
from flask.typing import ResponseReturnValue
from project import db
from project.errors import bp


@bp.app_errorhandler(404)
def not_found_error(error: HTTPException) -> ResponseReturnValue:
    return render_template('errors/404.html'), 404

@bp.app_errorhandler(403)
def forbidden_error(error: HTTPException) -> ResponseReturnValue:
    db.session.rollback()
    return render_template('errors/403.html'), 403

@bp.app_errorhandler(500)
def internal_error(error: HTTPException) -> ResponseReturnValue:
    db.session.rollback()
    return render_template('errors/500.html'), 500
