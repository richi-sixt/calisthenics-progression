"""API routes for workouts and workout templates."""

from datetime import datetime, timezone

from flask import current_app, g, jsonify, request
from flask.typing import ResponseReturnValue
from project import db
from project.api import bp
from project.api.auth_utils import api_check_confirmed, api_login_required
from project.models import Exercise, ExerciseDefinition, Set, Workout


def _save_exercises_from_json(workout: Workout, exercises_data: list) -> str | None:
    """Parse JSON exercise list and create Exercise+Set records.

    Returns an error message string on failure, or None on success.
    """
    for order, ex_data in enumerate(exercises_data, start=1):
        ex_def_id = ex_data.get("exercise_definition_id")
        if not ex_def_id:
            return "Missing exercise_definition_id."

        ex_def = db.session.get(ExerciseDefinition, ex_def_id)
        if ex_def is None:
            return f"Exercise definition {ex_def_id} not found."

        exercise = Exercise(
            exercise_order=order,
            exercise_definition_id=ex_def_id,
            workout_id=workout.id,
        )
        db.session.add(exercise)
        db.session.flush()

        sets_data = ex_data.get("sets", [])
        for set_order, set_data in enumerate(sets_data, start=1):
            work_set = Set(
                set_order=set_order,
                exercise_id=exercise.id,
                progression=set_data.get("progression"),
                reps=set_data.get("reps"),
                duration=set_data.get("duration"),
            )
            db.session.add(work_set)

    return None


# --- Workout CRUD ---


@bp.route("/workouts", methods=["GET"])
@api_login_required
@api_check_confirmed
def api_list_workouts() -> ResponseReturnValue:
    page = request.args.get("page", 1, type=int)
    hide_done = request.args.get("hide_done", 0, type=int)

    query = db.select(Workout).filter(
        Workout.user_id == g.current_api_user.id,
        Workout.is_template == False,  # noqa: E712
    )
    if hide_done:
        query = query.filter(Workout.is_done == False)  # noqa: E712

    pagination = db.paginate(
        query.order_by(Workout.timestamp.desc()),
        page=page,
        per_page=current_app.config["WORKOUTS_PER_PAGE"],
        error_out=False,
    )
    return jsonify(
        {
            "data": [w.to_dict(include_exercises=True) for w in pagination.items],
            "meta": {
                "page": pagination.page,
                "per_page": pagination.per_page,
                "total": pagination.total,
                "has_next": pagination.has_next,
                "has_prev": pagination.has_prev,
            },
        }
    )


@bp.route("/workouts", methods=["POST"])
@api_login_required
@api_check_confirmed
def api_create_workout() -> ResponseReturnValue:
    data = request.get_json(silent=True) or {}
    title = data.get("title", "").strip()
    exercises_data = data.get("exercises", [])

    if not title:
        return jsonify({"error": "Title is required."}), 400
    if not exercises_data:
        return jsonify({"error": "At least one exercise is required."}), 400

    workout = Workout(
        title=title,
        user_id=g.current_api_user.id,
        timestamp=datetime.now(timezone.utc),
    )
    db.session.add(workout)
    db.session.flush()

    err = _save_exercises_from_json(workout, exercises_data)
    if err:
        db.session.rollback()
        return jsonify({"error": err}), 400

    db.session.commit()
    return jsonify({"data": workout.to_dict(include_exercises=True)}), 201


@bp.route("/workouts/<int:workout_id>", methods=["GET"])
@api_login_required
@api_check_confirmed
def api_get_workout(workout_id: int) -> ResponseReturnValue:
    workout = db.session.get(Workout, workout_id)
    if workout is None:
        return jsonify({"error": "Workout not found."}), 404
    if workout.user_id != g.current_api_user.id:
        return jsonify({"error": "Forbidden."}), 403
    return jsonify({"data": workout.to_dict(include_exercises=True)})


@bp.route("/workouts/<int:workout_id>", methods=["PUT"])
@api_login_required
@api_check_confirmed
def api_update_workout(workout_id: int) -> ResponseReturnValue:
    workout = db.session.get(Workout, workout_id)
    if workout is None:
        return jsonify({"error": "Workout not found."}), 404
    if workout.user_id != g.current_api_user.id:
        return jsonify({"error": "Forbidden."}), 403

    data = request.get_json(silent=True) or {}

    if "title" in data:
        workout.title = data["title"].strip()

    if "exercises" in data:
        exercises_data = data["exercises"]
        if not exercises_data:
            return jsonify({"error": "At least one exercise is required."}), 400

        # Remove existing exercises (cascades to sets)
        for ex in workout.exercises.all():
            db.session.delete(ex)
        db.session.flush()

        err = _save_exercises_from_json(workout, exercises_data)
        if err:
            db.session.rollback()
            return jsonify({"error": err}), 400

    db.session.commit()
    return jsonify({"data": workout.to_dict(include_exercises=True)})


@bp.route("/workouts/<int:workout_id>", methods=["DELETE"])
@api_login_required
@api_check_confirmed
def api_delete_workout(workout_id: int) -> ResponseReturnValue:
    workout = db.session.get(Workout, workout_id)
    if workout is None:
        return jsonify({"error": "Workout not found."}), 404
    if workout.user_id != g.current_api_user.id:
        return jsonify({"error": "Forbidden."}), 403
    db.session.delete(workout)
    db.session.commit()
    return jsonify({"data": {"message": "Workout deleted."}}), 200


@bp.route("/workouts/<int:workout_id>/toggle-done", methods=["POST"])
@api_login_required
@api_check_confirmed
def api_toggle_done(workout_id: int) -> ResponseReturnValue:
    workout = db.session.get(Workout, workout_id)
    if workout is None:
        return jsonify({"error": "Workout not found."}), 404
    if workout.user_id != g.current_api_user.id:
        return jsonify({"error": "Forbidden."}), 403
    workout.is_done = not workout.is_done
    db.session.commit()
    return jsonify({"data": workout.to_dict()})


# --- Template CRUD ---


@bp.route("/templates", methods=["GET"])
@api_login_required
@api_check_confirmed
def api_list_templates() -> ResponseReturnValue:
    templates = (
        db.session.execute(
            db.select(Workout)
            .filter_by(user_id=g.current_api_user.id, is_template=True)
            .order_by(Workout.title.asc())
        )
        .scalars()
        .all()
    )
    return jsonify({"data": [t.to_dict(include_exercises=True) for t in templates]})


@bp.route("/templates", methods=["POST"])
@api_login_required
@api_check_confirmed
def api_create_template() -> ResponseReturnValue:
    data = request.get_json(silent=True) or {}
    title = data.get("title", "").strip()
    exercises_data = data.get("exercises", [])

    if not title:
        return jsonify({"error": "Title is required."}), 400
    if not exercises_data:
        return jsonify({"error": "At least one exercise is required."}), 400

    template = Workout(
        title=title,
        user_id=g.current_api_user.id,
        is_template=True,
    )
    db.session.add(template)
    db.session.flush()

    err = _save_exercises_from_json(template, exercises_data)
    if err:
        db.session.rollback()
        return jsonify({"error": err}), 400

    db.session.commit()
    return jsonify({"data": template.to_dict(include_exercises=True)}), 201


@bp.route("/templates/<int:template_id>", methods=["PUT"])
@api_login_required
@api_check_confirmed
def api_update_template(template_id: int) -> ResponseReturnValue:
    template = db.session.get(Workout, template_id)
    if template is None:
        return jsonify({"error": "Template not found."}), 404
    if template.user_id != g.current_api_user.id or not template.is_template:
        return jsonify({"error": "Forbidden."}), 403

    data = request.get_json(silent=True) or {}

    if "title" in data:
        template.title = data["title"].strip()

    if "exercises" in data:
        exercises_data = data["exercises"]
        if not exercises_data:
            return jsonify({"error": "At least one exercise is required."}), 400

        for ex in template.exercises.all():
            db.session.delete(ex)
        db.session.flush()

        err = _save_exercises_from_json(template, exercises_data)
        if err:
            db.session.rollback()
            return jsonify({"error": err}), 400

    db.session.commit()
    return jsonify({"data": template.to_dict(include_exercises=True)})


@bp.route("/templates/<int:template_id>", methods=["DELETE"])
@api_login_required
@api_check_confirmed
def api_delete_template(template_id: int) -> ResponseReturnValue:
    template = db.session.get(Workout, template_id)
    if template is None:
        return jsonify({"error": "Template not found."}), 404
    if template.user_id != g.current_api_user.id or not template.is_template:
        return jsonify({"error": "Forbidden."}), 403
    db.session.delete(template)
    db.session.commit()
    return jsonify({"data": {"message": "Template deleted."}}), 200


@bp.route("/templates/<int:template_id>/use", methods=["POST"])
@api_login_required
@api_check_confirmed
def api_use_template(template_id: int) -> ResponseReturnValue:
    """Create a new workout from a template."""
    template = db.session.get(Workout, template_id)
    if template is None:
        return jsonify({"error": "Template not found."}), 404
    if template.user_id != g.current_api_user.id or not template.is_template:
        return jsonify({"error": "Forbidden."}), 403

    workout = Workout(
        title=template.title,
        user_id=g.current_api_user.id,
        timestamp=datetime.now(timezone.utc),
    )
    db.session.add(workout)
    db.session.flush()

    for ex in template.exercises.order_by(Exercise.exercise_order).all():  # type: ignore[union-attr]
        new_ex = Exercise(
            exercise_order=ex.exercise_order,
            exercise_definition_id=ex.exercise_definition_id,
            workout_id=workout.id,
        )
        db.session.add(new_ex)
        db.session.flush()

        for s in ex.sets.order_by(Set.set_order).all():
            new_set = Set(
                set_order=s.set_order,
                exercise_id=new_ex.id,
                progression=s.progression,
                reps=s.reps,
                duration=s.duration,
            )
            db.session.add(new_set)

    db.session.commit()
    return jsonify({"data": workout.to_dict(include_exercises=True)}), 201
