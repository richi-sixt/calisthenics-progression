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
    scope = request.args.get("scope", "all")
    username = request.args.get("username")

    followed_ids = {u.id for u in g.current_api_user.followed}

    query = db.select(Workout).filter(
        Workout.user_id != g.current_api_user.id,
        Workout.is_template == False,  # noqa: E712
        db.or_(
            Workout.visibility == "public",
            db.and_(
                Workout.visibility == "followers",
                Workout.user_id.in_(followed_ids),
            ),
        ),
    )

    if username:
        target = (
            db.session.execute(db.select(User).filter_by(username=username))
            .scalars()
            .first()
        )
        if target is None:
            return jsonify({"error": "User not found."}), 404
        query = query.filter(Workout.user_id == target.id)
    elif scope == "following":
        query = query.filter(Workout.user_id.in_(followed_ids))

    pagination = db.paginate(
        query.order_by(Workout.timestamp.desc()),
        page=page,
        per_page=current_app.config["WORKOUTS_PER_PAGE"],
        error_out=False,
    )

    def _serialize(w: Workout) -> dict:
        data = w.to_dict(include_exercises=True)
        data["is_following"] = w.user_id in followed_ids
        return data

    return jsonify(
        {
            "data": [_serialize(w) for w in pagination.items],
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
    workouts_query = user.workouts.filter(Workout.is_template == False)  # noqa: E712
    if user.id != g.current_api_user.id:
        is_follower = g.current_api_user.is_following(user)
        allowed = ("public", "followers") if is_follower else ("public",)
        workouts_query = workouts_query.filter(Workout.visibility.in_(allowed))
    workouts_pagination = (
        workouts_query.order_by(Workout.timestamp.desc())
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
                "workouts": [
                    w.to_dict(include_exercises=True) for w in workouts_pagination.items
                ],
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


def _paginated_user_list(query, page: int) -> ResponseReturnValue:
    """Paginate a dynamic User relationship query and serialize as summaries."""
    followed_ids = {u.id for u in g.current_api_user.followed}
    pagination = query.paginate(
        page=page,
        per_page=current_app.config["WORKOUTS_PER_PAGE"],
        error_out=False,
    )
    return jsonify(
        {
            "data": [
                {
                    "id": u.id,
                    "username": u.username,
                    "image_file": u.image_file,
                    "is_following": u.id in followed_ids,
                }
                for u in pagination.items
            ],
            "meta": {
                "page": pagination.page,
                "per_page": pagination.per_page,
                "total": pagination.total,
                "has_next": pagination.has_next,
                "has_prev": pagination.has_prev,
            },
        }
    )


@bp.route("/users/<username>/followers", methods=["GET"])
@api_login_required
@api_check_confirmed
def api_list_followers(username: str) -> ResponseReturnValue:
    user = (
        db.session.execute(db.select(User).filter_by(username=username))
        .scalars()
        .first()
    )
    if user is None:
        return jsonify({"error": "User not found."}), 404

    page = request.args.get("page", 1, type=int)
    query = user.followers.order_by(User.username.asc())  # type: ignore[attr-defined]
    return _paginated_user_list(query, page)


@bp.route("/users/<username>/following", methods=["GET"])
@api_login_required
@api_check_confirmed
def api_list_following(username: str) -> ResponseReturnValue:
    user = (
        db.session.execute(db.select(User).filter_by(username=username))
        .scalars()
        .first()
    )
    if user is None:
        return jsonify({"error": "User not found."}), 404

    page = request.args.get("page", 1, type=int)
    query = user.followed.order_by(User.username.asc())
    return _paginated_user_list(query, page)


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
