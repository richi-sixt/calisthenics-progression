import secrets
import os
from datetime import datetime, timezone
from PIL import Image
from flask import render_template, flash, redirect, url_for, request, current_app
from flask.typing import ResponseReturnValue
from flask_login import current_user, login_user, logout_user, login_required
from urllib.parse import urlsplit

from werkzeug.datastructures import FileStorage
from project import db
from project.auth import bp
from project.auth.forms import (
    LoginForm,
    RegistrationForm,
    ResetPasswordRequestForm,
    ResetPasswordForm,
    EditProfileForm,
    DeleteAccountForm,
    ChangePasswordForm,
)
from project.email import send_email
from project.models import User, Message, Notification, ExerciseDefinition, followers
from project.token import generate_confirmation_token, confirm_token
from project.decorators import check_confirmed


@bp.route("/login", methods=["GET", "POST"])
def login() -> ResponseReturnValue:
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
def edit_profile() -> ResponseReturnValue:
    form = EditProfileForm(current_user.username, current_user.email)
    if form.validate_on_submit():
        if form.picture.data:
            picture_file = save_picture(form.picture.data)
            current_user.image_file = picture_file
        current_user.username = form.username.data
        current_user.about_me = form.about_me.data
        if form.email.data and form.email.data != current_user.email:
            current_user.email = form.email.data
            current_user.confirmed = False
            token = generate_confirmation_token(current_user.email)
            confirm_url = url_for("auth.confirm_email", token=token, _external=True)
            html = render_template("email/activate.html", confirm_url=confirm_url)
            send_email(current_user.email, "Bitte Email-Adresse bestätigen.", html)
            flash("Deine E-Mail-Adresse wurde geändert. Bitte bestätige deine neue E-Mail-Adresse.", "warning")
        else:
            flash("Deine Änderungen wurden gespeichert.", "success")
        db.session.commit()
        flash("Deine Änderungen wurden gespeichert")
        return redirect(url_for("auth.edit_profile"))
    elif request.method == "GET":
        form.username.data = current_user.username
        form.email.data = current_user.email
        form.about_me.data = current_user.about_me
    image_file = url_for("static", filename="profile_pics/" + current_user.image_file)
    password_form = ChangePasswordForm(prefix="pwd")
    return render_template(
        "edit_profile.html", title="Profil bearbeiten", image_file=image_file, form=form, password_form=password_form
    )


@bp.route("/change_password", methods=["POST"])
@login_required
@check_confirmed
def change_password() -> ResponseReturnValue:
    form = ChangePasswordForm(prefix="pwd")
    if form.validate_on_submit():
        if not current_user.check_password(form.current_password.data):
            flash("Das aktuelle Passwort ist falsch.", "danger")
            return redirect(url_for("auth.edit_profile"))
        current_user.set_password(form.new_password.data)
        db.session.commit()
        flash("Dein Passwort wurde erfolgreich geändert.", "success")
    else:
        for field_errors in form.errors.values():
            for error in field_errors:
                flash(error, "danger")
    return redirect(url_for("auth.edit_profile"))


@bp.route("/delete_account", methods=["GET", "POST"])
@login_required
@check_confirmed
def delete_account() -> ResponseReturnValue:
    form = DeleteAccountForm()
    if form.validate_on_submit():
        if not current_user.check_password(form.password.data):
            flash("Falsches Passwort. Konto wurde nicht gelöscht.", "danger")
            return redirect(url_for("auth.delete_account"))
 
        user = db.session.get(User, current_user.id)

        # 1. Remove follow relationships from association table
        db.session.execute(
            followers.delete().where(
                (followers.c.follower_id == user.id)
                | (followers.c.followed_id == user.id)
            )
        )

        # 2. Delete notifications (bulk, no children)
        Notification.query.filter_by(user_id=user.id).delete()

        # 3. Delete messages (bulk, no children)
        Message.query.filter(
            (Message.sender_id == user.id) | (Message.recipient_id == user.id)
        ).delete()

        # 4. Delete workouts via ORM to trigger cascade → Exercise → Set
        for workout in user.workouts.all():
            db.session.delete(workout)

        # 5. Flush so Exercise rows are gone before deleting ExerciseDefinitions
        db.session.flush()   

        # 6. Delete exercise definitions
        ExerciseDefinition.query.filter_by(user_id=user.id).delete()

        # 7. Delete user and commit
        db.session.delete(user)
        db.session.commit()
     
        logout_user()
        flash("Dein Konto wurde erfolgreich gelöscht.", "success")
        return redirect(url_for("main.index"))
             
    return render_template(
        "auth/delete_account.html",
            title="Konto löschen",
            form=form,
    )

def save_picture(form_picture: FileStorage) -> str:
    random_hex = secrets.token_hex(8)
    assert form_picture.filename is not None
    _, f_ext = os.path.splitext(form_picture.filename)
    picture_fn = random_hex + f_ext
    picture_path = os.path.join(
        current_app.root_path, "static/profile_pics", picture_fn
    )

    output_size = (125, 125)
    i = Image.open(form_picture) # type: ignore[arg-type]
    i.thumbnail(output_size)
    i.save(picture_path)

    return picture_fn


@bp.route("/logout")
def logout() -> ResponseReturnValue:
    logout_user()
    return redirect(url_for("main.index"))


@bp.route("/register", methods=["GET", "POST"])
def register() -> ResponseReturnValue:
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
        assert form.password.data is not None
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()

        assert user.email is not None
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
def confirm_email(token: str) -> ResponseReturnValue:
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
def unconfirmed() -> ResponseReturnValue:
    if current_user.confirmed:
        return redirect(url_for("main.index"))
    return render_template("auth/unconfirmed.html")


@bp.route("/resend")
@login_required
def resend_confirmation() -> ResponseReturnValue:
    token = generate_confirmation_token(current_user.email)
    confirm_url = url_for("auth.confirm_email", token=token, _external=True)
    html = render_template("email/activate.html", confirm_url=confirm_url)
    subject = "Bitte Email-Adresse bestätigen."
    send_email(current_user.email, subject, html)
    flash("Eine neue Bestätigungsmail wurde versendet.", "success")
    return redirect(url_for("auth.register"))


@bp.route("/forgot", methods=["GET", "POST"])
def forgot() -> ResponseReturnValue:
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
def forgot_new(token: str) -> ResponseReturnValue:
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

