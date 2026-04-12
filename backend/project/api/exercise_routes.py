"""API routes for exercise definitions."""

from flask import current_app, g, jsonify, request
from flask.typing import ResponseReturnValue
from project import db
from project.api import bp
from project.api.auth_utils import api_check_confirmed, api_login_required
from project.models import (ExerciseCategory, ExerciseDefinition,
                            ProgressionLevel)


@bp.route("/exercises", methods=["GET"])
@api_login_required
@api_check_confirmed
def api_list_exercises() -> ResponseReturnValue:
    page = request.args.get("page", 1, type=int)
    user_filter = request.args.get("user", "mine")
    selected_categories = request.args.getlist("category", type=int)

    query = (
        db.select(ExerciseDefinition)
        .filter_by(archived=False)
        .order_by(ExerciseDefinition.title.asc())
    )
    if user_filter == "mine":
        query = query.filter(ExerciseDefinition.user_id == g.current_api_user.id)

    for cat_id in selected_categories:
        query = query.filter(
            ExerciseDefinition.categories.any(ExerciseCategory.id == cat_id)
        )

    pagination = db.paginate(
        query,
        page=page,
        per_page=current_app.config["WORKOUTS_PER_PAGE"],
        error_out=False,
    )
    return jsonify(
        {
            "data": [e.to_dict() for e in pagination.items],
            "meta": {
                "page": pagination.page,
                "per_page": pagination.per_page,
                "total": pagination.total,
                "has_next": pagination.has_next,
                "has_prev": pagination.has_prev,
            },
        }
    )


@bp.route("/exercises", methods=["POST"])
@api_login_required
@api_check_confirmed
def api_create_exercise() -> ResponseReturnValue:
    data = request.get_json(silent=True) or {}
    title = data.get("title", "").strip()
    description = data.get("description")
    counting_type = data.get("counting_type", "reps")

    if not title:
        return jsonify({"error": "Title is required."}), 400
    if counting_type not in ("reps", "duration"):
        return jsonify({"error": "counting_type must be 'reps' or 'duration'."}), 400

    # Check for duplicate title per user
    existing = (
        db.session.execute(
            db.select(ExerciseDefinition).filter_by(
                title=title, user_id=g.current_api_user.id
            )
        )
        .scalars()
        .first()
    )
    if existing:
        return jsonify({"error": "You already have an exercise with this title."}), 409

    exercise = ExerciseDefinition(
        title=title,
        description=description,
        user_id=g.current_api_user.id,
        counting_type=counting_type,
    )
    db.session.add(exercise)
    db.session.flush()

    # Add progression levels
    progression_levels = data.get("progression_levels", [])
    for i, name in enumerate(progression_levels, start=1):
        if isinstance(name, str) and name.strip():
            db.session.add(
                ProgressionLevel(
                    exercise_definition_id=exercise.id,
                    name=name.strip(),
                    level_order=i,
                )
            )

    # Add category assignments
    category_ids = data.get("category_ids", [])
    if category_ids:
        cats = list(
            db.session.execute(
                db.select(ExerciseCategory).where(ExerciseCategory.id.in_(category_ids))
            )
            .scalars()
            .all()
        )
        exercise.categories = cats  # type: ignore[assignment]

    db.session.commit()
    return jsonify({"data": exercise.to_dict()}), 201


@bp.route("/exercises/<int:exercise_id>", methods=["GET"])
@api_login_required
@api_check_confirmed
def api_get_exercise(exercise_id: int) -> ResponseReturnValue:
    exercise = db.session.get(ExerciseDefinition, exercise_id)
    if exercise is None:
        return jsonify({"error": "Exercise not found."}), 404
    return jsonify({"data": exercise.to_dict()})


@bp.route("/exercises/<int:exercise_id>", methods=["PUT"])
@api_login_required
@api_check_confirmed
def api_update_exercise(exercise_id: int) -> ResponseReturnValue:
    exercise = db.session.get(ExerciseDefinition, exercise_id)
    if exercise is None:
        return jsonify({"error": "Exercise not found."}), 404
    if exercise.user_id != g.current_api_user.id:
        return jsonify({"error": "Forbidden."}), 403

    data = request.get_json(silent=True) or {}

    if "title" in data:
        new_title = data["title"].strip()
        if new_title != exercise.title:
            existing = (
                db.session.execute(
                    db.select(ExerciseDefinition).filter_by(
                        title=new_title, user_id=g.current_api_user.id
                    )
                )
                .scalars()
                .first()
            )
            if existing and existing.id != exercise.id:
                return (
                    jsonify({"error": "You already have an exercise with this title."}),
                    409,
                )
            exercise.title = new_title

    if "description" in data:
        exercise.description = data["description"]

    if "counting_type" in data:
        if data["counting_type"] not in ("reps", "duration"):
            return (
                jsonify({"error": "counting_type must be 'reps' or 'duration'."}),
                400,
            )
        exercise.counting_type = data["counting_type"]

    if "progression_levels" in data:
        # Replace all progression levels
        db.session.execute(
            db.delete(ProgressionLevel).where(
                ProgressionLevel.exercise_definition_id == exercise.id
            )
        )
        for i, name in enumerate(data["progression_levels"], start=1):
            if isinstance(name, str) and name.strip():
                db.session.add(
                    ProgressionLevel(
                        exercise_definition_id=exercise.id,
                        name=name.strip(),
                        level_order=i,
                    )
                )

    if "category_ids" in data:
        cat_ids = data["category_ids"]
        exercise.categories = (
            list(  # type: ignore[assignment]
                db.session.execute(
                    db.select(ExerciseCategory).where(ExerciseCategory.id.in_(cat_ids))
                )
                .scalars()
                .all()
            )
            if cat_ids
            else []
        )

    db.session.commit()
    return jsonify({"data": exercise.to_dict()})


@bp.route("/exercises/<int:exercise_id>", methods=["DELETE"])
@api_login_required
@api_check_confirmed
def api_delete_exercise(exercise_id: int) -> ResponseReturnValue:
    """Archive (soft-delete) an exercise definition."""
    exercise = db.session.get(ExerciseDefinition, exercise_id)
    if exercise is None:
        return jsonify({"error": "Exercise not found."}), 404
    if exercise.user_id != g.current_api_user.id:
        return jsonify({"error": "Forbidden."}), 403
    exercise.archived = True
    db.session.commit()
    return jsonify({"data": {"message": "Exercise archived."}}), 200


@bp.route("/exercises/<int:exercise_id>/copy", methods=["POST"])
@api_login_required
@api_check_confirmed
def api_copy_exercise(exercise_id: int) -> ResponseReturnValue:
    """Copy another user's exercise definition to the current user."""
    original = db.session.get(ExerciseDefinition, exercise_id)
    if original is None:
        return jsonify({"error": "Exercise not found."}), 404
    if original.user_id == g.current_api_user.id:
        return jsonify({"error": "Cannot copy your own exercise."}), 400

    # Generate unique title
    base_title = original.title
    new_title = f"{base_title} (Kopie)"
    counter = 2
    while (
        db.session.execute(
            db.select(ExerciseDefinition).filter_by(
                title=new_title, user_id=g.current_api_user.id
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
        user_id=g.current_api_user.id,
        counting_type=original.counting_type,
    )
    db.session.add(copied)
    db.session.flush()

    for pl in original.progression_levels.all():
        db.session.add(
            ProgressionLevel(
                exercise_definition_id=copied.id,
                name=pl.name,
                level_order=pl.level_order,
            )
        )

    db.session.commit()
    return jsonify({"data": copied.to_dict()}), 201
