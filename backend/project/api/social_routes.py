"""API routes for social features: follow, explore, messages, notifications."""

from datetime import datetime, timezone

from flask import current_app, g, jsonify, request
from flask.typing import ResponseReturnValue
from project import db
from project.api import bp
from project.api.auth_utils import api_check_confirmed, api_login_required
from project.models import Message, Notification, User, Workout


@bp.route("/explore", methods=["GET"])
@api_login_required
@api_check_confirmed
def api_explore() -> ResponseReturnValue:
    page = request.args.get("page", 1, type=int)

    pagination = db.paginate(
        db.select(Workout)
        .filter(
            Workout.user_id != g.current_api_user.id,
            Workout.is_template == False,  # noqa: E712
        )
        .order_by(Workout.timestamp.desc()),
        page=page,
        per_page=current_app.config["WORKOUTS_PER_PAGE"],
        error_out=False,
    )
    return jsonify(
        {
            "data": [w.to_dict() for w in pagination.items],
            "meta": {
                "page": pagination.page,
                "per_page": pagination.per_page,
                "total": pagination.total,
                "has_next": pagination.has_next,
                "has_prev": pagination.has_prev,
            },
        }
    )


@bp.route("/users/<username>", methods=["GET"])
@api_login_required
@api_check_confirmed
def api_get_user(username: str) -> ResponseReturnValue:
    user = (
        db.session.execute(db.select(User).filter_by(username=username))
        .scalars()
        .first()
    )
    if user is None:
        return jsonify({"error": "User not found."}), 404

    page = request.args.get("page", 1, type=int)
    workouts_pagination = (
        user.workouts.filter(Workout.is_template == False)  # noqa: E712
        .order_by(Workout.timestamp.desc())
        .paginate(
            page=page,
            per_page=current_app.config["WORKOUTS_PER_PAGE"],
            error_out=False,
        )
    )

    user_data = user.to_dict()
    user_data["is_following"] = g.current_api_user.is_following(user)

    return jsonify(
        {
            "data": {
                "user": user_data,
                "workouts": [w.to_dict() for w in workouts_pagination.items],
            },
            "meta": {
                "page": workouts_pagination.page,
                "per_page": workouts_pagination.per_page,
                "total": workouts_pagination.total,
                "has_next": workouts_pagination.has_next,
                "has_prev": workouts_pagination.has_prev,
            },
        }
    )


@bp.route("/users/<username>/follow", methods=["POST"])
@api_login_required
@api_check_confirmed
def api_follow(username: str) -> ResponseReturnValue:
    user = (
        db.session.execute(db.select(User).filter_by(username=username))
        .scalars()
        .first()
    )
    if user is None:
        return jsonify({"error": "User not found."}), 404
    if user.id == g.current_api_user.id:
        return jsonify({"error": "Cannot follow yourself."}), 400

    g.current_api_user.follow(user)
    db.session.commit()
    return jsonify({"data": {"message": f"Now following {username}."}}), 200


@bp.route("/users/<username>/unfollow", methods=["POST"])
@api_login_required
@api_check_confirmed
def api_unfollow(username: str) -> ResponseReturnValue:
    user = (
        db.session.execute(db.select(User).filter_by(username=username))
        .scalars()
        .first()
    )
    if user is None:
        return jsonify({"error": "User not found."}), 404
    if user.id == g.current_api_user.id:
        return jsonify({"error": "Cannot unfollow yourself."}), 400

    g.current_api_user.unfollow(user)
    db.session.commit()
    return jsonify({"data": {"message": f"Unfollowed {username}."}}), 200


@bp.route("/messages", methods=["GET"])
@api_login_required
@api_check_confirmed
def api_list_messages() -> ResponseReturnValue:
    g.current_api_user.last_message_read_time = datetime.now(timezone.utc)
    g.current_api_user.add_notification("unread_message_count", 0)
    db.session.commit()

    page = request.args.get("page", 1, type=int)
    pagination = g.current_api_user.messages_received.order_by(
        Message.timestamp.desc()
    ).paginate(
        page=page,
        per_page=current_app.config["WORKOUTS_PER_PAGE"],
        error_out=False,
    )
    return jsonify(
        {
            "data": [m.to_dict() for m in pagination.items],
            "meta": {
                "page": pagination.page,
                "per_page": pagination.per_page,
                "total": pagination.total,
                "has_next": pagination.has_next,
                "has_prev": pagination.has_prev,
            },
        }
    )


@bp.route("/messages/<recipient>", methods=["POST"])
@api_login_required
@api_check_confirmed
def api_send_message(recipient: str) -> ResponseReturnValue:
    user = (
        db.session.execute(db.select(User).filter_by(username=recipient))
        .scalars()
        .first()
    )
    if user is None:
        return jsonify({"error": "User not found."}), 404

    data = request.get_json(silent=True) or {}
    body = data.get("body", "").strip()

    if not body:
        return jsonify({"error": "Message body is required."}), 400
    if len(body) > 140:
        return jsonify({"error": "Message body must be 140 characters or less."}), 400

    msg = Message(
        sender_id=g.current_api_user.id,
        recipient_id=user.id,
        body=body,
    )
    db.session.add(msg)
    user.add_notification("unread_message_count", user.new_messages())
    db.session.commit()
    return jsonify({"data": msg.to_dict()}), 201


@bp.route("/notifications", methods=["GET"])
@api_login_required
@api_check_confirmed
def api_notifications() -> ResponseReturnValue:
    since = request.args.get("since", 0.0, type=float)
    notifications = (
        g.current_api_user.notifications.filter(Notification.timestamp > since)
        .order_by(Notification.timestamp.asc())
        .all()
    )
    return jsonify({"data": [n.to_dict() for n in notifications]})
