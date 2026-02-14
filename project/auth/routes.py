import secrets
import os
from datetime import datetime, timezone
from PIL import Image
from flask import render_template, flash, redirect, url_for, request, current_app
from flask_login import current_user, login_user, logout_user, login_required
from urllib.parse import urlsplit

# from werkzeug.urls import url_parse
from project import db
from project.auth import bp
from project.auth.forms import (
    LoginForm,
    RegistrationForm,
    ResetPasswordRequestForm,
    ResetPasswordForm,
    EditProfileForm,
)
from project.auth.email import send_email
from project.models import User
from project.token import generate_confirmation_token, confirm_token
from project.decorators import check_confirmed


@bp.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("main.index"))
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user is None or not user.check_password(form.password.data):
            flash("Ungültiger Benutzername oder Passwort")
            return redirect(url_for("auth.login"))
        login_user(user, remember=form.remember_me.data)
        next_page = request.args.get("next")
        if not next_page or urlsplit(next_page).netloc != "":
            next_page = url_for("main.index")
        return redirect(next_page)
    return render_template("auth/login.html", title="Anmelden", form=form)


@bp.route("/edit_profile", methods=["GET", "POST"])
@login_required
@check_confirmed
def edit_profile():
    form = EditProfileForm(current_user.username)
    if form.validate_on_submit():
        if form.picture.data:
            picture_file = save_picture(form.picture.data)
            current_user.image_file = picture_file
        current_user.username = form.username.data
        current_user.about_me = form.about_me.data
        db.session.commit()
        flash("Deine Änderungen wurden gespeichert")
        return redirect(url_for("auth.edit_profile"))
    elif request.method == "GET":
        form.username.data = current_user.username
        form.about_me.data = current_user.about_me
    image_file = url_for("static", filename="profile_pics/" + current_user.image_file)
    return render_template(
        "edit_profile.html", title="Profil bearbeiten", image_file=image_file, form=form
    )


def save_picture(form_picture):
    random_hex = secrets.token_hex(8)
    _, f_ext = os.path.splitext(form_picture.filename)
    picture_fn = random_hex + f_ext
    picture_path = os.path.join(
        current_app.root_path, "static/profile_pics", picture_fn
    )

    output_size = (125, 125)
    i = Image.open(form_picture)
    i.thumbnail(output_size)
    i.save(picture_path)

    return picture_fn


@bp.route("/logout")
def logout():
    logout_user()
    return redirect(url_for("main.index"))


@bp.route("/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        return redirect(url_for("main.index"))
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(
            username=form.username.data,
            email=form.email.data,
            confirmed=False,
            admin=False,
        )
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()
        token = generate_confirmation_token(user.email)
        confirm_url = url_for("auth.confirm_email", token=token, _external=True)
        html = render_template("email/activate.html", confirm_url=confirm_url)
        subject = "Bitte Email-Adresse bestätigen."
        send_email(user.email, subject, html)

        login_user(user)
        flash("Eine Bestätigungs-E-Mail wurde versendet.", "success")
        return redirect(url_for("main.index"))
    return render_template("auth/register.html", title="Registrieren", form=form)


@bp.route("/confirm/<token>")
@login_required
def confirm_email(token):
    if current_user.confirmed:
        flash("Das Konto wurde bereits bestätigt. Bitte anmelden.", "success")
        return redirect(url_for("main.index"))
    email = confirm_token(token)
    user = User.query.filter_by(email=current_user.email).first_or_404()
    if user.email == email:
        user.confirmed = True
        user.confirmed_on = datetime.now(timezone.utc)
        db.session.add(user)
        db.session.commit()
        flash("Du hast dein Konto bestätigt. Vielen Dank!", "success")
    else:
        flash("Der Bestätigungslink ist nicht gültig oder abgelaufen.", "danger")
    return redirect(url_for("main.index"))


@bp.route("/unconfirmed")
@login_required
def unconfirmed():
    if current_user.confirmed:
        return redirect(url_for("main.index"))
    return render_template("auth/unconfirmed.html")


@bp.route("/resend")
@login_required
def resend_confirmation():
    token = generate_confirmation_token(current_user.email)
    confirm_url = url_for("auth.confirm_email", token=token, _external=True)
    html = render_template("email/activate.html", confirm_url=confirm_url)
    subject = "Bitte Email-Adresse bestätigen."
    send_email(current_user.email, subject, html)
    flash("Eine neue Bestätigungsmail wurde versendet.", "success")
    return redirect(url_for("auth.register"))


@bp.route("/forgot", methods=["GET", "POST"])
def forgot():
    form = ResetPasswordRequestForm(request.form)
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if user is not None:
            token = generate_confirmation_token(user.email)

            user.password_reset_token = token
            db.session.commit()

            reset_url = url_for("auth.forgot_new", token=token, _external=True)
            html = render_template(
                "auth/reset.html", username=user.email, reset_url=reset_url
            )
            subject = "Passwort zurücksetzen"
            send_email(user.email, subject, html)

        flash("Eine Email zum zurücksetzen des Passwortes wurde versendet.", "success")
        return redirect(url_for("main.index"))

    return render_template("auth/forgot.html", form=form)


@bp.route("/forgot/new/<token>", methods=["GET", "POST"])
def forgot_new(token):
    email = confirm_token(token)
    user = User.query.filter_by(email=email).first_or_404()

    if user.password_reset_token is not None:
        form = ResetPasswordForm(request.form)
        if form.validate_on_submit():
            user = User.query.filter_by(email=email).first()
            if user:
                user.set_password(form.password.data)
                user.password_reset_token = None
                db.session.commit()

                login_user(user)

                flash("Passwort wurde erfolgreich geändert.", "success")
                return redirect(url_for("auth.login"))

            else:
                flash("Passwort konnte nicht geändert werden.", "danger")
                return redirect(url_for("auth.login"))
        else:
            flash("Du kannst dein Passwort jetzt ändern.", "success")
            return render_template("auth/forgot_new.html", form=form)
    else:
        flash(
            "Das Passwort konnte nicht zurückgesetzt werden. Bitte erneut versuchen.",
            "danger",
        )

    return redirect(url_for("main.index"))

