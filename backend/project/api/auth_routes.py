"""API authentication routes: profile management.

Auth operations (login, register, password reset, email confirmation)
are handled by Supabase Auth on the frontend. Flask only serves
profile data for authenticated users.
"""

import os
import secrets

from flask import current_app, g, jsonify, request
from flask.typing import ResponseReturnValue
from PIL import Image
from project import db
from project.api import bp
from project.api.auth_utils import api_check_confirmed, api_login_required
from project.models import (ExerciseDefinition, Message, Notification, User,
                            followers)


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


@bp.route("/auth/profile/picture", methods=["PUT"])
@api_login_required
@api_check_confirmed
def api_update_profile_picture() -> ResponseReturnValue:
    if "picture" not in request.files:
        return jsonify({"error": "No picture file provided."}), 400

    picture = request.files["picture"]
    if not picture.filename:
        return jsonify({"error": "No file selected."}), 400

    allowed = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    _, ext = os.path.splitext(picture.filename)
    if ext.lower() not in allowed:
        return jsonify({"error": "File type not allowed."}), 400

    random_hex = secrets.token_hex(8)
    picture_fn = random_hex + ext.lower()
    picture_path = os.path.join(
        current_app.root_path, "static/profile_pics", picture_fn
    )

    output_size = (125, 125)
    img = Image.open(picture)  # type: ignore[arg-type]
    img.thumbnail(output_size)
    img.save(picture_path)

    user = g.current_api_user
    # Delete old picture if not default
    if user.image_file and user.image_file != "default.jpg":
        old_path = os.path.join(
            current_app.root_path, "static/profile_pics", user.image_file
        )
        if os.path.exists(old_path):
            os.remove(old_path)

    user.image_file = picture_fn
    db.session.commit()
    return jsonify({"data": user.to_dict()}), 200


@bp.route("/auth/account", methods=["DELETE"])
@api_login_required
@api_check_confirmed
def api_delete_account() -> ResponseReturnValue:
    user = g.current_api_user

    # 1. Remove follow relationships from association table
    db.session.execute(
        followers.delete().where(
            (followers.c.follower_id == user.id) | (followers.c.followed_id == user.id)
        )
    )

    # 2. Delete notifications
    db.session.execute(db.delete(Notification).where(Notification.user_id == user.id))

    # 3. Delete messages
    db.session.execute(
        db.delete(Message).where(
            (Message.sender_id == user.id) | (Message.recipient_id == user.id)
        )
    )

    # 4. Delete workouts via ORM to trigger cascade → Exercise → Set
    for workout in user.workouts.all():
        db.session.delete(workout)

    # 5. Flush so Exercise rows are gone before deleting ExerciseDefinitions
    db.session.flush()

    # 6. Delete exercise definitions
    db.session.execute(
        db.delete(ExerciseDefinition).where(ExerciseDefinition.user_id == user.id)
    )

    # 7. Delete user and commit
    db.session.delete(user)
    db.session.commit()

    return jsonify({"data": {"message": "Account deleted."}}), 200
