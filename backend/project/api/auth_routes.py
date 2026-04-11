"""API authentication routes: profile management.

Auth operations (login, register, password reset, email confirmation)
are handled by Supabase Auth on the frontend. Flask only serves
profile data for authenticated users.
"""

from flask import g, jsonify, request
from flask.typing import ResponseReturnValue
from project import db
from project.api import bp
from project.api.auth_utils import api_check_confirmed, api_login_required
from project.models import User


@bp.route("/auth/profile", methods=["GET"])
@api_login_required
def api_get_profile() -> ResponseReturnValue:
    return jsonify({"data": g.current_api_user.to_dict()}), 200


@bp.route("/auth/profile", methods=["PUT"])
@api_login_required
@api_check_confirmed
def api_update_profile() -> ResponseReturnValue:
    data = request.get_json(silent=True) or {}
    user = g.current_api_user

    if "username" in data:
        new_username = data["username"].strip()
        if new_username != user.username:
            existing = (
                db.session.execute(db.select(User).filter_by(username=new_username))
                .scalars()
                .first()
            )
            if existing:
                return jsonify({"error": "Username already taken."}), 409
            user.username = new_username

    if "about_me" in data:
        user.about_me = data["about_me"]

    db.session.commit()
    return jsonify({"data": user.to_dict()}), 200
