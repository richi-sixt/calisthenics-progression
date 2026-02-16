from flask import (
    render_template,
    flash,
    redirect,
    url_for,
    request,
    jsonify,
    abort,
    current_app,
)
from flask.typing import ResponseReturnValue
from flask_login import current_user, login_required
from datetime import datetime, timezone


from project import db
from project.models import (
    User,
    Workout,
    ExerciseDefinition,
    Exercise,
    Set,
    Message,
    Notification,
)
from project.main import bp
from project.main.forms import MessageForm, CreateExerciseForm
from project.decorators import check_confirmed


# helper functions
@bp.before_request
def before_request() -> None:
    if current_user.is_authenticated:
        current_user.last_seen = datetime.now(timezone.utc)
        db.session.commit()


# routes

@bp.route("/", methods=["GET", "POST"])
@bp.route("/index", methods=["GET", "POST"])
def index() -> ResponseReturnValue:
    if current_user.is_authenticated:
        return redirect(url_for("main.workouts"))
    return render_template("index.html", title="Home")


@bp.route("/workouts", methods=["GET", "POST"])
@login_required
def workouts() -> ResponseReturnValue:
    page = request.args.get("page", 1, type=int)
    workouts = (
        Workout.query.filter_by(user_id=current_user.get_id())
        .order_by(Workout.timestamp.desc()) # type: ignore[union-attr]
        .paginate(
            page=page, per_page=current_app.config["WORKOUTS_PER_PAGE"], error_out=False
        )
    )
    next_url = (
        url_for("main.index", page=workouts.next_num) if workouts.has_next else None
    )
    prev_url = (
        url_for("main.index", page=workouts.prev_num) if workouts.has_prev else None
    )
    return render_template(
        "workouts.html",
        title="Home",
        workouts=workouts.items,
        next_url=next_url,
        prev_url=prev_url,
    )


@bp.route("/add_workout", methods=["POST", "GET"])
@login_required
@check_confirmed
def add_workout() -> ResponseReturnValue:
    if request.method == "POST":
        try:
            exercise_count = int(request.form.get("exercise_count", 0))
        except (ValueError, TypeError):
            flash("Ungültige Formulardaten.", "danger")
            return redirect(url_for("main.add_workout"))

        if exercise_count < 1:
            flash("Mindestens eine Übung ist erforderlich.", "danger")
            return redirect(url_for("main.add_workout"))

        user = current_user
        workout = Workout(
            timestamp=datetime.now(timezone.utc), user_id=user.id, title=request.form.get("wtitle", "")
        )
        db.session.add(workout)
        db.session.flush()

        for exercise_num in range(1, exercise_count + 1):
            exercise_def_id = request.form.get("exercise" + str(exercise_num))
            if not exercise_def_id:
                db.session.rollback()
                flash("Fehlende Übungsdaten.", "danger")
                return redirect(url_for("main.add_workout"))

            exercise_def = db.session.get(ExerciseDefinition, exercise_def_id)
            if exercise_def is None:
                db.session.rollback()
                flash("Übung nicht gefunden.", "danger")
                return redirect(url_for("main.add_workout"))

            exercise = Exercise(
                exercise_order=exercise_num,
                exercise_definition_id=int(exercise_def_id),
                workout_id=workout.id,
            )
            db.session.add(exercise)  # Add exercise to session
            db.session.flush()  # flush() to generate the ID

            progressions = request.form.getlist(
                "progression" + str(exercise_num))

            set_order = 1
            if exercise_def.counting_type == "duration":
                durations = request.form.getlist("duration" + str(exercise_num))
                for progression, dur in zip(progressions, durations):
                    parts = dur.split(":")
                    total_seconds = int(parts[0]) * 60 + int(parts[1]) if len(parts) == 2 else int(dur)
                    work_set = Set(
                        set_order=set_order,
                        exercise_id=exercise.id,
                        progression=progression,
                        duration=total_seconds,
                    )
                    set_order += 1
                    db.session.add(work_set)
            else:
                reps = request.form.getlist("reps" + str(exercise_num))
                for progression, rep in zip(progressions, reps):
                    work_set = Set(
                        set_order=set_order,
                        exercise_id=exercise.id,
                        progression=progression,
                        reps=int(rep),
                    )
                    set_order += 1
                    db.session.add(work_set)

        db.session.commit()
        return redirect(url_for("main.index"))

    my_exercises = ExerciseDefinition.query.filter_by(user_id=current_user.id, archived=False).order_by(ExerciseDefinition.title.asc()).all() # type: ignore[union-attr]
    other_exercises = ExerciseDefinition.query.filter(
        ExerciseDefinition.user_id != current_user.id,
        ExerciseDefinition.archived == False,  # noqa: E712 # type: ignore[arg-type]
    ).order_by(ExerciseDefinition.title.asc()).all() # type: ignore[union-attr]
    return render_template(
        "add_workout.html",
        my_exercises=my_exercises,
        other_exercises=other_exercises
    )


@bp.route("/copy_exercise/<int:exercises_id>", methods=["POST"])
@login_required
@check_confirmed
def copy_exercise(exercises_id: int) -> ResponseReturnValue:
    original = db.session.get(ExerciseDefinition, exercises_id)
    if original is None:
        abort(404)
    if original.user_id == current_user.id:
        return jsonify({"error": "Du kannst deine eigenen Übungen nicht kopieren."}), 400

    # Generate a unique title by appending "(Kopie)" "(Kopie 2)" etc.
    base_title = original.title
    new_title = f"{base_title} (Kopie)"
    counter = 2
    while ExerciseDefinition.query.filter_by(title=new_title, user_id=current_user.id).first() is not None:
        new_title = f"{base_title} (Kopie {counter})"
        counter += 1

    copied = ExerciseDefinition(
        title=new_title,
        description=original.description,
        user_id=current_user.id,
        counting_type=original.counting_type,
    )
    db.session.add(copied)
    db.session.commit()

    return jsonify({
        "success": True,
        "id": copied.id,
        "title": copied.title,
        "username": current_user.username,
        "counting_type": copied.counting_type,
    })

@bp.route("/workout/<int:workout_id>")
@login_required
@check_confirmed
def workout(workout_id: int) -> ResponseReturnValue:
    workout = db.session.get(Workout, workout_id)
    if workout is None:
        abort(404)
    return render_template("workout.html", title=workout.title, workout=workout)


@bp.route("/workout/<int:workout_id>/delete", methods=["POST"])
@login_required
@check_confirmed
def delete_workout(workout_id: int) -> ResponseReturnValue:
    workout = db.session.get(Workout, workout_id)
    if workout is None:
        abort(404)
    if workout.user_id != current_user.id:
        abort(403)
    db.session.delete(workout)
    db.session.commit()
    flash("Dein Workout wurde gelöscht!", "success")
    return redirect(url_for("main.workouts"))


@bp.route("/add_exercise", methods=["GET", "POST"])
@login_required
@check_confirmed
def add_exercise() -> str | ResponseReturnValue:
    form = CreateExerciseForm()
    if form.validate_on_submit():
        # check for duplicates (user scope)
        existing = ExerciseDefinition.query.filter_by(
            title=form.title.data, user_id=current_user.id
        ).first()
        if existing:
            flash("Du hast bereits eine Übung mit diesem Namen.", "warning")
        else:
            exercise = ExerciseDefinition(
                title=form.title.data,
                description=form.description.data,
                user_id=current_user.id,
                counting_type=form.counting_type.data,
            )
            db.session.add(exercise)
            db.session.commit()
            flash("Deine Übung wurde erstellt!", "success")
            return redirect(url_for("main.all_exercises"))
    return render_template(
        "add_exercise.html", title="Neue Übung", form=form, legend="Neue Übung"
    )


@bp.route("/exercises/<int:exercises_id>")
@login_required
@check_confirmed
def exercise(exercises_id: int) -> ResponseReturnValue:
    exercise = db.session.get(ExerciseDefinition, exercises_id)
    if exercise is None:
        abort(404)
    return render_template("exercise.html", title=exercise.title, exercise=exercise)


@bp.route("/exercises", methods=["GET"])
@login_required
@check_confirmed
def all_exercises() -> str:
    page = request.args.get("page", 1, type=int)
    exercises = ExerciseDefinition.query.filter_by(archived=False).order_by(ExerciseDefinition.title.asc()).paginate( # type: ignore[umion-attr]
        page=page, per_page=current_app.config["WORKOUTS_PER_PAGE"], error_out=False
    )
    next_url = (
        url_for("main.index", page=exercises.next_num) if exercises.has_next else None
    )
    prev_url = (
        url_for("main.index", page=exercises.prev_num) if exercises.has_prev else None
    )
    return render_template(
        "exercises.html",
        title="Alle Übungen",
        exercises=exercises.items,
        next_url=next_url,
        prev_url=prev_url,
    )


@bp.route("/exercise/<int:exercises_id>/update", methods=["GET", "POST"])
@login_required
@check_confirmed
def update_exercise(exercises_id: int) -> ResponseReturnValue:
    exercise = db.session.get(ExerciseDefinition, exercises_id)
    if exercise is None:
        abort(404)
    if exercise.user_id != current_user.id:
        abort(403)
    form = CreateExerciseForm()
    if form.validate_on_submit():
        # Add a duplicate check before commiting
        existing = ExerciseDefinition.query.filter_by(
            title=form.title.data, user_id=current_user.id
        ).first()
        if existing and existing.id != exercise.id:
            flash("Du hast bereits eine Übung mit diesem Namen", "warning")
        else:
            exercise.title = form.title.data
            exercise.description = form.description.data
            exercise.counting_type = form.counting_type.data
            db.session.commit()
            flash("Deine Übung wurde geändert", "success")
            return redirect(url_for("main.exercise", exercises_id=exercise.id))
    elif request.method == "GET":
        form.title.data = exercise.title
        form.description.data = exercise.description
        form.counting_type.data = exercise.counting_type
    return render_template(
        "add_exercise.html", title="Ändere Übung", form=form, legend="Ändere Übung"
    )


@bp.route("/exercise/<int:exercises_id>/delete", methods=["POST"])
@login_required
@check_confirmed
def delete_exercise(exercises_id: int) -> ResponseReturnValue:
    exercise = db.session.get(ExerciseDefinition, exercises_id)
    if exercise is None:
        abort(404)
    if exercise.user_id != current_user.id:
        abort(403)
    exercise.archived = True
    db.session.commit()
    flash("Deine Übung wurde archiviert!", "success")
    return redirect(url_for("main.all_exercises"))


@bp.route("/explore")
@login_required
@check_confirmed
def explore() -> ResponseReturnValue:
    page = request.args.get("page", 1, type=int)
    workouts = (
        Workout.query.filter(Workout.user_id != current_user.id)
        .order_by(Workout.timestamp.desc()) # type: ignore[union-attr]
        .paginate(
            page=page, per_page=current_app.config["WORKOUTS_PER_PAGE"], error_out=False
        )
    )

    next_url = (
        url_for("main.explore",
                page=workouts.next_num) if workouts.has_next else None
    )
    prev_url = (
        url_for("main.explore",
                page=workouts.prev_num) if workouts.has_prev else None
    )
    return render_template(
        "explore.html",
        title="Entdecken",
        workouts=workouts.items,
        next_url=next_url,
        prev_url=prev_url,
    )


@bp.route("/user/<username>")
@login_required
@check_confirmed
def user(username: str) -> ResponseReturnValue:
    user = User.query.filter_by(username=username).first_or_404()
    page = request.args.get("page", 1, type=int)
    workouts = user.workouts.order_by(Workout.timestamp.desc()).paginate( #type: ignore[union-attr]
        page=page, per_page=current_app.config["WORKOUTS_PER_PAGE"], error_out=False
    )
    next_url = (
        url_for("main.user", username=user.username, page=workouts.next_num)
        if workouts.has_next
        else None
    )
    prev_url = (
        url_for("main.user", username=user.username, page=workouts.prev_num)
        if workouts.has_prev
        else None
    )
    image_file = url_for("static", filename="profile_pics/" + user.image_file)
    return render_template(
        "user.html",
        user=user,
        image_file=image_file,
        workouts=workouts.items,
        next_url=next_url,
        prev_url=prev_url,
    )


@bp.route("/follow/<username>")
@login_required
@check_confirmed
def follow(username: str) -> ResponseReturnValue:
    user = User.query.filter_by(username=username).first()
    if user is None:
        flash("Benutzer {} konnte nicht gefunden werden.".format(username))
        return redirect(url_for("main.index"))
    if user == current_user:
        flash("Du kannst dir nicht selber folgen.")
        return redirect(url_for("main.user", username=username))
    current_user.follow(user)
    db.session.commit()
    flash("Du folgst {}!".format(username))
    return redirect(url_for("main.user", username=username))


@bp.route("/unfollow/<username>")
@login_required
@check_confirmed
def unfollow(username: str) -> ResponseReturnValue:
    user = User.query.filter_by(username=username).first()
    if user is None:
        flash("Benutzer {} konnte nicht gefunden werden.".format(username))
        return redirect(url_for("main.index"))
    if user == current_user:
        flash("Du kannst dir nicht selber entfolgen")
        return redirect(url_for("main.user", username=username))
    current_user.unfollow(user)
    db.session.commit()
    flash("Du folgst {} nicht.".format(username))
    return redirect(url_for("main.user", username=username))


@bp.route("/messages")
@login_required
@check_confirmed
def messages() -> ResponseReturnValue:
    current_user.last_message_read_time = datetime.now(timezone.utc)
    current_user.add_notification("unread_message_count", 0)
    db.session.commit()
    page = request.args.get("page", 1, type=int)
    messages = current_user.messages_received.order_by(
        Message.timestamp.desc() # type: ignore[union-attr]
    ).paginate(
        page=page, per_page=current_app.config["WORKOUTS_PER_PAGE"], error_out=False
    )
    next_url = (
        url_for("main.messages",
                page=messages.next_num) if messages.has_next else None
    )
    prev_url = (
        url_for("main.messages",
                page=messages.prev_num) if messages.has_prev else None
    )
    return render_template(
        "messages.html", messages=messages.items, next_url=next_url, prev_url=prev_url
    )


@bp.route("/send_message/<recipient>", methods=["GET", "POST"])
@login_required
@check_confirmed
def send_message(recipient: str) -> ResponseReturnValue:
    user = User.query.filter_by(username=recipient).first_or_404()
    form = MessageForm()
    if form.validate_on_submit():
        msg = Message(sender_id=current_user.id, recipient_id=user.id,
                      body=form.message.data)
        db.session.add(msg)
        user.add_notification("unread_message_count", user.new_messages())
        db.session.commit()
        flash("Deine Nachricht wurde gesendet.")
        return redirect(url_for("main.user", username=recipient))
    return render_template(
        "send_message.html", title="Nachricht senden", form=form, recipient=recipient
    )


@bp.route("/notifications")
@login_required
@check_confirmed
def notifications() -> ResponseReturnValue:
    since = request.args.get("since", 0.0, type=float)
    notifications = current_user.notifications.filter(
        Notification.timestamp > since
        ).order_by(Notification.timestamp.asc()) # type: ignore[arg-type]
    return jsonify(
        [
            {"name": n.name, "data": n.get_data(), "timestamp": n.timestamp}
            for n in notifications
        ]
    )
