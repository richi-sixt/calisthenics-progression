"""API routes for moderation: blocking users, reporting content, terms."""

import logging
from datetime import datetime, timezone

from flask import g, jsonify, render_template, request
from flask.typing import ResponseReturnValue

from project import db
from project.api import bp
from project.api.auth_utils import api_check_confirmed, api_login_required
from project.email import send_email
from project.models import (
    REPORT_REASONS,
    REPORT_TARGET_TYPES,
    ExerciseDefinition,
    Follow,
    Message,
    Report,
    User,
    UserBlock,
    Workout,
)

logger = logging.getLogger(__name__)


def _find_user(username: str) -> User | None:
    return (
        db.session.execute(db.select(User).filter_by(username=username))
        .scalars()
        .first()
    )


@bp.route("/users/<username>/block", methods=["POST"])
@api_login_required
@api_check_confirmed
def api_block_user(username: str) -> ResponseReturnValue:
    me = g.current_api_user
    user = _find_user(username)
    if user is None:
        return jsonify({"error": "User not found."}), 404
    if user.id == me.id:
        return jsonify({"error": "Cannot block yourself."}), 400

    already = db.session.execute(
        db.select(UserBlock.id).filter_by(blocker_id=me.id, blocked_id=user.id)
    ).first()
    if already is None:
        db.session.add(UserBlock(blocker_id=me.id, blocked_id=user.id))

    # A block ends any follow relationship, in both directions.
    db.session.execute(
        db.delete(Follow).where(
            ((Follow.follower_id == me.id) & (Follow.followed_id == user.id))
            | ((Follow.follower_id == user.id) & (Follow.followed_id == me.id))
        )
    )
    for u in (me, user):
        u.add_notification(
            "follow_request_count",
            u.follow_requests_received.filter_by(status="pending").count(),
        )
    db.session.commit()
    return jsonify({"data": {"blocked": True}}), 200


@bp.route("/users/<username>/block", methods=["DELETE"])
@api_login_required
@api_check_confirmed
def api_unblock_user(username: str) -> ResponseReturnValue:
    user = _find_user(username)
    if user is None:
        return jsonify({"error": "User not found."}), 404

    db.session.execute(
        db.delete(UserBlock).where(
            UserBlock.blocker_id == g.current_api_user.id,
            UserBlock.blocked_id == user.id,
        )
    )
    db.session.commit()
    return jsonify({"data": {"blocked": False}}), 200


@bp.route("/blocks", methods=["GET"])
@api_login_required
@api_check_confirmed
def api_list_blocks() -> ResponseReturnValue:
    users = (
        db.session.query(User)
        .join(UserBlock, UserBlock.blocked_id == User.id)
        .filter(UserBlock.blocker_id == g.current_api_user.id)
        .order_by(User.username.asc())
        .all()
    )
    return jsonify(
        {
            "data": [
                {"id": u.id, "username": u.username, "image_file": u.image_file}
                for u in users
            ]
        }
    )


def _resolve_report_target(target_type: str, target_id: int) -> tuple[int | None, bool]:
    """Return (reported_user_id, ok) for a report target the reporter may see."""
    me = g.current_api_user
    if target_type == "user":
        user = db.session.get(User, target_id)
        return (user.id, True) if user else (None, False)
    if target_type == "workout":
        workout = db.session.get(Workout, target_id)
        if workout is None or not workout.is_visible_to(me):
            return None, False
        return workout.user_id, True
    if target_type == "exercise":
        exercise = db.session.get(ExerciseDefinition, target_id)
        if exercise is None or not exercise.is_visible_to(me):
            return None, False
        return exercise.user_id, True
    message = db.session.get(Message, target_id)
    if message is None or message.recipient_id != me.id:
        return None, False
    return message.sender_id, True


@bp.route("/reports", methods=["POST"])
@api_login_required
@api_check_confirmed
def api_create_report() -> ResponseReturnValue:
    me = g.current_api_user
    data = request.get_json(silent=True) or {}
    target_type = data.get("target_type")
    target_id = data.get("target_id")
    reason = data.get("reason")
    details = (data.get("details") or "").strip()

    if target_type not in REPORT_TARGET_TYPES:
        return jsonify({"error": "Invalid target type."}), 400
    if not isinstance(target_id, int) or isinstance(target_id, bool):
        return jsonify({"error": "Invalid target id."}), 400
    if reason not in REPORT_REASONS:
        return jsonify({"error": "Invalid reason."}), 400
    if len(details) > 500:
        return jsonify({"error": "Details must be 500 characters or less."}), 400

    reported_user_id, ok = _resolve_report_target(target_type, target_id)
    if not ok or reported_user_id is None:
        return jsonify({"error": "Report target not found."}), 404
    if reported_user_id == me.id:
        return jsonify({"error": "Cannot report your own content."}), 400

    existing = (
        db.session.execute(
            db.select(Report).filter_by(
                reporter_id=me.id,
                target_type=target_type,
                target_id=target_id,
                status="open",
            )
        )
        .scalars()
        .first()
    )
    if existing is not None:
        return jsonify({"data": {"id": existing.id, "status": existing.status}}), 200

    report = Report(
        reporter_id=me.id,
        reported_user_id=reported_user_id,
        target_type=target_type,
        target_id=target_id,
        reason=reason,
        details=details or None,
    )
    db.session.add(report)
    db.session.commit()

    try:
        _notify_admins_of_report(report, me)
    except Exception:
        logger.exception("Failed to notify admins about report %s", report.id)

    return jsonify({"data": {"id": report.id, "status": report.status}}), 201


def _notify_admins_of_report(report: Report, reporter: User) -> None:
    admins = db.session.execute(db.select(User).filter_by(admin=True)).scalars().all()
    admin_emails = [a.email for a in admins if a.email]
    if not admin_emails:
        return
    reported = db.session.get(User, report.reported_user_id)
    html = render_template(
        "email/report_received.html",
        report=report,
        reporter=reporter,
        reported=reported,
    )
    send_email(admin_emails, f"Report #{report.id}: {report.target_type}", html)


@bp.route("/auth/accept-terms", methods=["POST"])
@api_login_required
def api_accept_terms() -> ResponseReturnValue:
    g.current_api_user.terms_accepted_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({"data": {"accepted": True}}), 200
