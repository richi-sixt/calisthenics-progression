"""API authentication routes: login, register, token refresh, profile, password."""

from flask import g, jsonify, render_template, request
from flask.typing import ResponseReturnValue
from project import db
from project.api import bp
from project.api.auth_utils import (
    api_check_confirmed,
    api_login_required,
    decode_api_token,
    generate_api_token,
)
from project.email import send_email
from project.models import User
from project.token import generate_confirmation_token


@bp.route("/auth/login", methods=["POST"])
def api_login() -> ResponseReturnValue:
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    user = (
        db.session.execute(db.select(User).filter_by(username=username))
        .scalars()
        .first()
    )
    if user is None or not user.check_password(password):
        return jsonify({"error": "Invalid username or password."}), 401

    token = generate_api_token(user.id)
    return jsonify({"data": {"token": token, "user": user.to_dict()}}), 200


@bp.route("/auth/register", methods=["POST"])
def api_register() -> ResponseReturnValue:
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not username or not email or not password:
        return jsonify({"error": "Username, email, and password are required."}), 400

    # Check for existing username or email
    if (
        db.session.execute(db.select(User).filter_by(username=username))
        .scalars()
        .first()
    ):
        return jsonify({"error": "Username already taken."}), 409

    if db.session.execute(db.select(User).filter_by(email=email)).scalars().first():
        return jsonify({"error": "Email already registered."}), 409

    user = User(username=username, email=email, confirmed=False, admin=False)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    # Send confirmation email
    confirm_token = generate_confirmation_token(user.email)
    from flask import url_for

    confirm_url = url_for("auth.confirm_email", token=confirm_token, _external=True)
    html = render_template("email/activate.html", confirm_url=confirm_url)
    send_email(user.email, "Bitte Email-Adresse bestätigen.", html)

    token = generate_api_token(user.id)
    return jsonify({"data": {"token": token, "user": user.to_dict()}}), 201


@bp.route("/auth/refresh", methods=["POST"])
def api_refresh() -> ResponseReturnValue:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Authentication required."}), 401

    old_token = auth_header[7:]
    user_id = decode_api_token(old_token)
    if user_id is None:
        return jsonify({"error": "Invalid or expired token."}), 401

    user = db.session.get(User, user_id)
    if user is None:
        return jsonify({"error": "User not found."}), 401

    new_token = generate_api_token(user.id)
    return jsonify({"data": {"token": new_token}}), 200


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

    if "email" in data:
        new_email = data["email"].strip()
        if new_email != user.email:
            existing = (
                db.session.execute(db.select(User).filter_by(email=new_email))
                .scalars()
                .first()
            )
            if existing:
                return jsonify({"error": "Email already registered."}), 409
            user.email = new_email
            user.confirmed = False
            confirm_token = generate_confirmation_token(new_email)
            from flask import url_for

            confirm_url = url_for(
                "auth.confirm_email", token=confirm_token, _external=True
            )
            html = render_template("email/activate.html", confirm_url=confirm_url)
            send_email(new_email, "Bitte Email-Adresse bestätigen.", html)

    db.session.commit()
    return jsonify({"data": user.to_dict()}), 200


@bp.route("/auth/change-password", methods=["POST"])
@api_login_required
@api_check_confirmed
def api_change_password() -> ResponseReturnValue:
    data = request.get_json(silent=True) or {}
    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")

    if not current_password or not new_password:
        return (
            jsonify({"error": "Current password and new password are required."}),
            400,
        )

    user = g.current_api_user
    if not user.check_password(current_password):
        return jsonify({"error": "Current password is incorrect."}), 400

    user.set_password(new_password)
    db.session.commit()
    return jsonify({"data": {"message": "Password changed successfully."}}), 200


@bp.route("/auth/forgot-password", methods=["POST"])
def api_forgot_password() -> ResponseReturnValue:
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip()

    if not email:
        return jsonify({"error": "Email is required."}), 400

    user = db.session.execute(db.select(User).filter_by(email=email)).scalars().first()
    if user is not None:
        token = generate_confirmation_token(user.email)
        user.password_reset_token = token
        db.session.commit()

        from flask import url_for

        reset_url = url_for("auth.forgot_new", token=token, _external=True)
        html = render_template(
            "auth/reset.html", username=user.email, reset_url=reset_url
        )
        send_email(user.email, "Passwort zurücksetzen", html)

    # Always return success to prevent email enumeration
    return (
        jsonify(
            {"data": {"message": "If the email exists, a reset link has been sent."}}
        ),
        200,
    )


@bp.route("/auth/confirm-email/resend", methods=["POST"])
@api_login_required
def api_resend_confirmation() -> ResponseReturnValue:
    user = g.current_api_user
    if user.confirmed:
        return jsonify({"data": {"message": "Email already confirmed."}}), 200

    token = generate_confirmation_token(user.email)
    from flask import url_for

    confirm_url = url_for("auth.confirm_email", token=token, _external=True)
    html = render_template("email/activate.html", confirm_url=confirm_url)
    send_email(user.email, "Bitte Email-Adresse bestätigen.", html)

    return jsonify({"data": {"message": "Confirmation email sent."}}), 200
