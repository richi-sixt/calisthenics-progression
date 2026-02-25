from datetime import datetime, timezone

from flask import (
    abort,
    current_app,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    url_for,
)
from flask.typing import ResponseReturnValue
from flask_login import current_user, login_required

from project import db
from project.decorators import check_confirmed
from project.main import bp
from project.main.forms import CreateExerciseForm, ManageCategoriesForm, MessageForm
from project.models import (
    Exercise,
    ExerciseCategory,
    ExerciseDefinition,
    Message,
    Notification,
    ProgressionLevel,
    Set,
    User,
    Workout,
)


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
    workouts = db.paginate(
        db.select(Workout)
        .filter(
            Workout.user_id == current_user.get_id(),
            Workout.is_template == False,  # noqa: E712
        )
        .order_by(Workout.timestamp.desc()),  # type: ignore[union-attr]
        page=page,
        per_page=current_app.config["WORKOUTS_PER_PAGE"],
        error_out=False,
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
            timestamp=datetime.now(timezone.utc),
            user_id=user.id,
            title=request.form.get("wtitle", ""),
        )
        db.session.add(workout)
        db.session.flush()

        err = _save_exercises_to_workout(
            workout,
            exercise_count,
            url_for("main.add_workout"),
        )
        if err is not None:
            return err

        db.session.commit()
        return redirect(url_for("main.index"))

    my_exercises, other_exercises, progression_map, category_map = (
        _get_exercise_lists_and_progression_map()
    )
    all_categories = _get_all_categories()

    # Fetch user's templates for the selector dropdown
    user_templates = list(
        db.session.execute(
            db.select(Workout)
            .filter_by(user_id=current_user.id, is_template=True)
            .order_by(Workout.title.asc())  # type: ignore[union-attr]
        )
        .scalars()
        .all()
    )

    # Optional: pre-fill from a template
    prefill = None
    template_title = None
    selected_template_id = request.args.get("template_id", type=int)
    if selected_template_id is not None:
        tmpl = db.session.get(Workout, selected_template_id)
        if tmpl is not None and tmpl.is_template and tmpl.user_id == current_user.id:
            template_title = tmpl.title
            prefill = _build_prefill(tmpl)

    return render_template(
        "add_workout.html",
        my_exercises=my_exercises,
        other_exercises=other_exercises,
        progression_map=progression_map,
        category_map=category_map,
        all_categories=all_categories,
        prefill=prefill,
        template_title=template_title,
        templates=user_templates,
        selected_template_id=selected_template_id,
    )


@bp.route("/copy_exercise/<int:exercises_id>", methods=["POST"])
@login_required
@check_confirmed
def copy_exercise(exercises_id: int) -> ResponseReturnValue:
    original = db.session.get(ExerciseDefinition, exercises_id)
    if original is None:
        abort(404)
    if original.user_id == current_user.id:
        return (
            jsonify({"error": "Du kannst deine eigenen Übungen nicht kopieren."}),
            400,
        )

    # Generate a unique title by appending "(Kopie)" "(Kopie 2)" etc.
    base_title = original.title
    new_title = f"{base_title} (Kopie)"
    counter = 2
    while (
        db.session.execute(
            db.select(ExerciseDefinition).filter_by(
                title=new_title, user_id=current_user.id
            )
        )
        .scalars()
        .first()
        is not None
    ):
        new_title = f"{base_title} (Kopie {counter})"
        counter += 1

    copied = ExerciseDefinition(
        title=new_title,
        description=original.description,
        user_id=current_user.id,
        counting_type=original.counting_type,
    )
    db.session.add(copied)
    db.session.flush()

    original_levels = original.progression_levels.all()
    for pl in original_levels:
        db.session.add(
            ProgressionLevel(
                exercise_definition_id=copied.id,
                name=pl.name,
                level_order=pl.level_order,
            )
        )
    db.session.commit()

    return jsonify(
        {
            "success": True,
            "id": copied.id,
            "title": copied.title,
            "username": current_user.username,
            "counting_type": copied.counting_type,
            "progression_levels": [pl.name for pl in original_levels],
            "category_ids": [c.id for c in original.categories],  # type: ignore[attr-defined]
        }
    )


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


@bp.route("/workout/<int:workout_id>/edit", methods=["GET", "POST"])
@login_required
@check_confirmed
def edit_workout(workout_id: int) -> ResponseReturnValue:
    workout = db.session.get(Workout, workout_id)
    if workout is None:
        abort(404)
    if workout.user_id != current_user.id:
        abort(403)

    if request.method == "POST":
        try:
            exercise_count = int(request.form.get("exercise_count", 0))
        except (ValueError, TypeError):
            flash("Ungültige Formulardaten.", "danger")
            return redirect(url_for("main.edit_workout", workout_id=workout_id))

        if exercise_count < 1:
            flash("Mindestens eine Übung ist erforderlich.", "danger")
            return redirect(url_for("main.edit_workout", workout_id=workout_id))

        # Remove all existing exercises (cascades to sets)
        for ex in workout.exercises.all():
            db.session.delete(ex)
        db.session.flush()

        workout.title = request.form.get("wtitle", "")

        err = _save_exercises_to_workout(
            workout,
            exercise_count,
            url_for("main.edit_workout", workout_id=workout_id),
        )
        if err is not None:
            return err

        db.session.commit()
        flash("Dein Workout wurde aktualisiert!", "success")
        return redirect(url_for("main.workout", workout_id=workout.id))

    # GET: build prefill data and exercise lists
    my_exercises, other_exercises, progression_map, category_map = (
        _get_exercise_lists_and_progression_map()
    )
    all_categories = _get_all_categories()
    prefill = _build_prefill(workout)

    return render_template(
        "edit_workout.html",
        title="Workout bearbeiten",
        workout=workout,
        my_exercises=my_exercises,
        other_exercises=other_exercises,
        progression_map=progression_map,
        category_map=category_map,
        all_categories=all_categories,
        prefill=prefill,
    )


@bp.route("/workout_templates")
@login_required
@check_confirmed
def workout_templates() -> ResponseReturnValue:
    templates = (
        db.session.execute(
            db.select(Workout)
            .filter_by(user_id=current_user.id, is_template=True)
            .order_by(Workout.title.asc())  # type: ignore[union-attr]
        )
        .scalars()
        .all()
    )
    return render_template(
        "workout_templates.html",
        title="Vorlagen",
        templates=templates,
    )


def _get_exercise_lists_and_progression_map() -> (
    tuple[list, list, dict[int, list[str]], dict[int, list[int]]]
):
    """Shared helper: fetch exercise lists, progression map, and category map for forms."""
    my_exercises = list(
        db.session.execute(
            db.select(ExerciseDefinition)
            .filter_by(user_id=current_user.id, archived=False)
            .order_by(ExerciseDefinition.title.asc())  # type: ignore[union-attr]
        )
        .scalars()
        .all()
    )
    other_exercises = list(
        db.session.execute(
            db.select(ExerciseDefinition)
            .filter(
                ExerciseDefinition.user_id != current_user.id,
                ExerciseDefinition.archived == False,  # noqa: E712
            )
            .order_by(ExerciseDefinition.title.asc())  # type: ignore[union-attr]
        )
        .scalars()
        .all()
    )
    progression_map: dict[int, list[str]] = {}
    category_map: dict[int, list[int]] = {}
    for ex in my_exercises + other_exercises:
        progression_map[ex.id] = [pl.name for pl in ex.progression_levels.all()]
        category_map[ex.id] = [c.id for c in ex.categories]
    return my_exercises, other_exercises, progression_map, category_map


def _get_all_categories() -> list:
    """Shared helper: fetch all exercise categories ordered by name."""
    return list(
        db.session.execute(
            db.select(ExerciseCategory).order_by(ExerciseCategory.name.asc())  # type: ignore[union-attr]
        )
        .scalars()
        .all()
    )


def _save_exercises_to_workout(
    workout: Workout,
    exercise_count: int,
    redirect_url: str,
) -> ResponseReturnValue | None:
    """Shared helper: parse form data and create Exercise+Set records for a workout/template.

    Returns a redirect Response on validation error, or None on success (caller commits).
    """
    for exercise_num in range(1, exercise_count + 1):
        exercise_def_id = request.form.get("exercise" + str(exercise_num))
        if not exercise_def_id:
            db.session.rollback()
            flash("Fehlende Übungsdaten.", "danger")
            return redirect(redirect_url)

        exercise_def = db.session.get(ExerciseDefinition, exercise_def_id)
        if exercise_def is None:
            db.session.rollback()
            flash("Übung nicht gefunden.", "danger")
            return redirect(redirect_url)

        exercise = Exercise(
            exercise_order=exercise_num,
            exercise_definition_id=int(exercise_def_id),
            workout_id=workout.id,
        )
        db.session.add(exercise)
        db.session.flush()

        progressions = request.form.getlist("progression" + str(exercise_num))
        set_order = 1
        if exercise_def.counting_type == "duration":
            durations = request.form.getlist("duration" + str(exercise_num))
            for progression, dur in zip(progressions, durations):
                if dur:
                    parts = dur.split(":")
                    total_seconds: int | None = (
                        int(parts[0]) * 60 + int(parts[1])
                        if len(parts) == 2
                        else int(dur)
                    )
                else:
                    total_seconds = None
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
                    reps=int(rep) if rep else None,
                )
                set_order += 1
                db.session.add(work_set)
    return None


def _build_prefill(workout: Workout) -> list[dict]:
    """Build prefill list from an existing workout or template for form pre-population."""
    return [
        {
            "exercise_def_id": ex.exercise_definition_id,
            "sets": [
                {
                    "progression": s.progression,
                    "reps": s.reps,
                    "duration": s.duration_formatted,
                }
                for s in ex.sets.order_by(Set.set_order).all()
            ],
        }
        for ex in workout.exercises.order_by(Exercise.exercise_order).all()  # type: ignore[misc, operator]
    ]


@bp.route("/add_template", methods=["GET", "POST"])
@login_required
@check_confirmed
def add_template() -> ResponseReturnValue:
    if request.method == "POST":
        try:
            exercise_count = int(request.form.get("exercise_count", 0))
        except (ValueError, TypeError):
            flash("Ungültige Formulardaten.", "danger")
            return redirect(url_for("main.add_template"))

        if exercise_count < 1:
            flash("Mindestens eine Übung ist erforderlich.", "danger")
            return redirect(url_for("main.add_template"))

        template = Workout(
            title=request.form.get("wtitle", ""),
            user_id=current_user.id,
            is_template=True,
        )
        db.session.add(template)
        db.session.flush()

        err = _save_exercises_to_workout(
            template,
            exercise_count,
            url_for("main.add_template"),
        )
        if err is not None:
            return err

        db.session.commit()
        flash("Deine Vorlage wurde erstellt!", "success")
        return redirect(url_for("main.workout_templates"))

    my_exercises, other_exercises, progression_map, category_map = (
        _get_exercise_lists_and_progression_map()
    )
    all_categories = _get_all_categories()
    return render_template(
        "add_template.html",
        title="Neue Vorlage",
        my_exercises=my_exercises,
        other_exercises=other_exercises,
        progression_map=progression_map,
        category_map=category_map,
        all_categories=all_categories,
        legend="Neue Vorlage",
    )


@bp.route("/workout_template/<int:workout_id>/edit", methods=["GET", "POST"])
@login_required
@check_confirmed
def edit_template(workout_id: int) -> ResponseReturnValue:
    template = db.session.get(Workout, workout_id)
    if template is None:
        abort(404)
    if template.user_id != current_user.id or not template.is_template:
        abort(403)

    if request.method == "POST":
        try:
            exercise_count = int(request.form.get("exercise_count", 0))
        except (ValueError, TypeError):
            flash("Ungültige Formulardaten.", "danger")
            return redirect(url_for("main.edit_template", workout_id=workout_id))

        if exercise_count < 1:
            flash("Mindestens eine Übung ist erforderlich.", "danger")
            return redirect(url_for("main.edit_template", workout_id=workout_id))

        for ex in template.exercises.all():
            db.session.delete(ex)
        db.session.flush()

        template.title = request.form.get("wtitle", "")

        err = _save_exercises_to_workout(
            template,
            exercise_count,
            url_for("main.edit_template", workout_id=workout_id),
        )
        if err is not None:
            return err

        db.session.commit()
        flash("Deine Vorlage wurde aktualisiert!", "success")
        return redirect(url_for("main.workout_templates"))

    my_exercises, other_exercises, progression_map, category_map = (
        _get_exercise_lists_and_progression_map()
    )
    all_categories = _get_all_categories()
    prefill = _build_prefill(template)
    return render_template(
        "add_template.html",
        title="Vorlage bearbeiten",
        template=template,
        my_exercises=my_exercises,
        other_exercises=other_exercises,
        progression_map=progression_map,
        category_map=category_map,
        all_categories=all_categories,
        prefill=prefill,
        legend="Vorlage bearbeiten",
    )


@bp.route("/workout_template/<int:workout_id>/delete", methods=["POST"])
@login_required
@check_confirmed
def delete_template(workout_id: int) -> ResponseReturnValue:
    template = db.session.get(Workout, workout_id)
    if template is None:
        abort(404)
    if template.user_id != current_user.id or not template.is_template:
        abort(403)
    db.session.delete(template)
    db.session.commit()
    flash("Deine Vorlage wurde gelöscht!", "success")
    return redirect(url_for("main.workout_templates"))


@bp.route("/workout_template/<int:workout_id>/use")
@login_required
@check_confirmed
def use_template(workout_id: int) -> ResponseReturnValue:
    template = db.session.get(Workout, workout_id)
    if template is None:
        abort(404)
    if template.user_id != current_user.id or not template.is_template:
        abort(403)
    return redirect(url_for("main.add_workout", template_id=workout_id))


@bp.route("/add_exercise", methods=["GET", "POST"])
@login_required
@check_confirmed
def add_exercise() -> str | ResponseReturnValue:
    form = CreateExerciseForm()
    if form.validate_on_submit():
        # check for duplicates (user scope)
        existing = (
            db.session.execute(
                db.select(ExerciseDefinition).filter_by(
                    title=form.title.data, user_id=current_user.id
                )
            )
            .scalars()
            .first()
        )
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
            db.session.flush()
            raw_levels = request.form.get("progressions", "")
            levels = [line.strip() for line in raw_levels.splitlines() if line.strip()]
            for i, name in enumerate(levels, start=1):
                db.session.add(
                    ProgressionLevel(
                        exercise_definition_id=exercise.id,
                        name=name,
                        level_order=i,
                    )
                )
            # Save category assignments
            raw_cat_ids = request.form.getlist("category_ids")
            cat_ids = [int(i) for i in raw_cat_ids if i.isdigit()]
            if cat_ids:
                exercise.categories = list(  # type: ignore[assignment]
                    db.session.execute(
                        db.select(ExerciseCategory).where(
                            ExerciseCategory.id.in_(cat_ids)
                        )
                    )
                    .scalars()
                    .all()
                )
            db.session.commit()
            flash("Deine Übung wurde erstellt!", "success")
            return redirect(url_for("main.all_exercises"))
    all_categories = _get_all_categories()
    return render_template(
        "add_exercise.html",
        title="Neue Übung",
        form=form,
        legend="Neue Übung",
        all_categories=all_categories,
        selected_category_ids=[],
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
    selected_categories = request.args.getlist("category", type=int)
    user_filter = request.args.get("user", "all")  # "mine" or "all"

    query = (
        db.select(ExerciseDefinition)
        .filter_by(archived=False)
        .order_by(ExerciseDefinition.title.asc())  # type: ignore[union-attr]
    )
    if user_filter == "mine":
        query = query.filter(ExerciseDefinition.user_id == current_user.id)
    for cat_id in selected_categories:
        query = query.filter(
            ExerciseDefinition.categories.any(ExerciseCategory.id == cat_id)
        )

    exercises = db.paginate(
        query,
        page=page,
        per_page=current_app.config["WORKOUTS_PER_PAGE"],
        error_out=False,
    )
    all_categories = _get_all_categories()
    next_url = (
        url_for(
            "main.all_exercises",
            page=exercises.next_num,
            user=user_filter,
            category=selected_categories,
        )
        if exercises.has_next
        else None
    )
    prev_url = (
        url_for(
            "main.all_exercises",
            page=exercises.prev_num,
            user=user_filter,
            category=selected_categories,
        )
        if exercises.has_prev
        else None
    )
    return render_template(
        "exercises.html",
        title="Alle Übungen",
        exercises=exercises.items,
        all_categories=all_categories,
        selected_categories=selected_categories,
        user_filter=user_filter,
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
        existing = (
            db.session.execute(
                db.select(ExerciseDefinition).filter_by(
                    title=form.title.data, user_id=current_user.id
                )
            )
            .scalars()
            .first()
        )
        if existing and existing.id != exercise.id:
            flash("Du hast bereits eine Übung mit diesem Namen", "warning")
        else:
            exercise.title = form.title.data
            exercise.description = form.description.data or None
            exercise.counting_type = form.counting_type.data
            db.session.execute(
                db.delete(ProgressionLevel).where(
                    ProgressionLevel.exercise_definition_id == exercise.id
                )
            )
            raw_levels = request.form.get("progressions", "")
            levels = [line.strip() for line in raw_levels.splitlines() if line.strip()]
            for i, name in enumerate(levels, start=1):
                db.session.add(
                    ProgressionLevel(
                        exercise_definition_id=exercise.id,
                        name=name,
                        level_order=i,
                    )
                )
            # Replace category assignments
            raw_cat_ids = request.form.getlist("category_ids")
            cat_ids = [int(i) for i in raw_cat_ids if i.isdigit()]
            exercise.categories = (
                list(  # type: ignore[assignment]
                    db.session.execute(
                        db.select(ExerciseCategory).where(
                            ExerciseCategory.id.in_(cat_ids)
                        )
                    )
                    .scalars()
                    .all()
                )
                if cat_ids
                else []
            )
            db.session.commit()
            flash("Deine Übung wurde geändert", "success")
            return redirect(url_for("main.exercise", exercises_id=exercise.id))
    elif request.method == "GET":
        form.title.data = exercise.title
        form.description.data = exercise.description
        form.counting_type.data = exercise.counting_type
    existing_progressions = "\n".join(
        pl.name for pl in exercise.progression_levels.all()
    )
    all_categories = _get_all_categories()
    selected_category_ids = [c.id for c in exercise.categories]  # type: ignore[attr-defined]
    return render_template(
        "add_exercise.html",
        title="Ändere Übung",
        form=form,
        legend="Ändere Übung",
        existing_progressions=existing_progressions,
        all_categories=all_categories,
        selected_category_ids=selected_category_ids,
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


@bp.route("/categories/add", methods=["POST"])
@login_required
@check_confirmed
def add_category() -> ResponseReturnValue:
    """Create a new global exercise category or return the existing one."""
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    if not name:
        return jsonify({"error": "Name darf nicht leer sein."}), 400
    existing = (
        db.session.execute(db.select(ExerciseCategory).filter_by(name=name))
        .scalars()
        .first()
    )
    if existing:
        return jsonify({"id": existing.id, "name": existing.name}), 200
    cat = ExerciseCategory(name=name)
    db.session.add(cat)
    db.session.commit()
    return jsonify({"id": cat.id, "name": cat.name}), 201


@bp.route("/categories", methods=["GET", "POST"])
@login_required
@check_confirmed
def manage_categories() -> ResponseReturnValue:
    """GET: list all categories with usage counts.  POST: create a new one."""
    form = ManageCategoriesForm()
    if request.method == "POST" and form.validate_on_submit():
        name = request.form.get("name", "").strip()
        if not name:
            flash("Name darf nicht leer sein.", "warning")
        else:
            existing = (
                db.session.execute(db.select(ExerciseCategory).filter_by(name=name))
                .scalars()
                .first()
            )
            if existing:
                flash(f'Kategorie "{name}" existiert bereits.', "warning")
            else:
                db.session.add(ExerciseCategory(name=name))
                db.session.commit()
                flash(f'Kategorie "{name}" erstellt.', "success")
        return redirect(url_for("main.manage_categories"))

    categories = _get_all_categories()
    counts: dict[int, int] = {
        cat.id: cat.exercise_definitions.count()  # type: ignore[attr-defined]
        for cat in categories
    }
    return render_template(
        "manage_categories.html",
        title="Kategorien verwalten",
        categories=categories,
        exercise_counts=counts,
        form=form,
    )


@bp.route("/categories/<int:cat_id>/rename", methods=["POST"])
@login_required
@check_confirmed
def rename_category(cat_id: int) -> ResponseReturnValue:
    """AJAX: rename a category by ID."""
    cat = db.session.get(ExerciseCategory, cat_id)
    if not cat:
        return jsonify({"error": "Nicht gefunden."}), 404
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    if not name:
        return jsonify({"error": "Name darf nicht leer sein."}), 400
    duplicate = (
        db.session.execute(db.select(ExerciseCategory).filter_by(name=name))
        .scalars()
        .first()
    )
    if duplicate and duplicate.id != cat_id:
        return jsonify({"error": f'"{name}" existiert bereits.'}), 409
    cat.name = name
    db.session.commit()
    return jsonify({"id": cat.id, "name": cat.name}), 200


@bp.route("/categories/<int:cat_id>/delete", methods=["POST"])
@login_required
@check_confirmed
def delete_category(cat_id: int) -> ResponseReturnValue:
    """Form POST: delete a category only if no exercises use it."""
    cat = db.session.get(ExerciseCategory, cat_id)
    if not cat:
        flash("Kategorie nicht gefunden.", "warning")
        return redirect(url_for("main.manage_categories"))
    count = cat.exercise_definitions.count()  # type: ignore[attr-defined]
    if count > 0:
        flash(
            f'Kategorie "{cat.name}" wird von {count} Übung(en) verwendet '
            f"und kann nicht gelöscht werden.",
            "danger",
        )
        return redirect(url_for("main.manage_categories"))
    db.session.delete(cat)
    db.session.commit()
    flash("Kategorie gelöscht.", "success")
    return redirect(url_for("main.manage_categories"))


@bp.route("/explore")
@login_required
@check_confirmed
def explore() -> ResponseReturnValue:
    page = request.args.get("page", 1, type=int)
    workouts = db.paginate(
        db.select(Workout)
        .filter(
            Workout.user_id != current_user.id,
            Workout.is_template == False,  # noqa: E712
        )
        .order_by(Workout.timestamp.desc()),  # type: ignore[union-attr]
        page=page,
        per_page=current_app.config["WORKOUTS_PER_PAGE"],
        error_out=False,
    )

    next_url = (
        url_for("main.explore", page=workouts.next_num) if workouts.has_next else None
    )
    prev_url = (
        url_for("main.explore", page=workouts.prev_num) if workouts.has_prev else None
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
    user = (
        db.session.execute(db.select(User).filter_by(username=username))
        .scalars()
        .first()
    )
    if user is None:
        abort(404)
    page = request.args.get("page", 1, type=int)
    workouts = user.workouts.order_by(Workout.timestamp.desc()).paginate(  # type: ignore[union-attr]
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
    user = (
        db.session.execute(db.select(User).filter_by(username=username))
        .scalars()
        .first()
    )
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
    user = (
        db.session.execute(db.select(User).filter_by(username=username))
        .scalars()
        .first()
    )
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
        Message.timestamp.desc()  # type: ignore[union-attr]
    ).paginate(
        page=page, per_page=current_app.config["WORKOUTS_PER_PAGE"], error_out=False
    )
    next_url = (
        url_for("main.messages", page=messages.next_num) if messages.has_next else None
    )
    prev_url = (
        url_for("main.messages", page=messages.prev_num) if messages.has_prev else None
    )
    return render_template(
        "messages.html", messages=messages.items, next_url=next_url, prev_url=prev_url
    )


@bp.route("/send_message/<recipient>", methods=["GET", "POST"])
@login_required
@check_confirmed
def send_message(recipient: str) -> ResponseReturnValue:
    user = (
        db.session.execute(db.select(User).filter_by(username=recipient))
        .scalars()
        .first()
    )
    if user is None:
        abort(404)
    form = MessageForm()
    if form.validate_on_submit():
        msg = Message(
            sender_id=current_user.id, recipient_id=user.id, body=form.message.data
        )
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
    ).order_by(
        Notification.timestamp.asc()
    )  # type: ignore[arg-type]

    return jsonify(
        [
            {"name": n.name, "data": n.get_data(), "timestamp": n.timestamp}
            for n in notifications
        ]
    )
