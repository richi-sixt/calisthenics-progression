"""API routes for exercise definitions."""

from flask import current_app, g, jsonify, request
from flask.typing import ResponseReturnValue
from sqlalchemy import func, or_

from project import db
from project.api import bp
from project.api.auth_utils import api_check_confirmed, api_login_required
from project.models import (
    EXERCISE_IMAGE_FILENAME,
    VISIBILITY_VALUES,
    Exercise,
    ExerciseCategory,
    ExerciseDefinition,
    ExerciseProgression,
    UploadedImage,
    Workout,
    blocked_user_ids,
)

COUNTING_TYPES = ("reps", "duration", "km")
COUNTING_TYPE_ERROR = "counting_type must be 'reps', 'duration' or 'km'."


def _parse_category_ids() -> list[int] | None:
    """Read ?category= filters as repeated params and/or comma-separated lists.

    Both `?category=1&category=3` and `?category=1,3` yield [1, 3].
    Returns None if any value is not an integer.
    """
    ids: list[int] = []
    for raw in request.args.getlist("category"):
        for part in raw.split(","):
            part = part.strip()
            if not part:
                continue
            try:
                ids.append(int(part))
            except ValueError:
                return None
    return ids


def _parse_thumbnail(
    value: object, current: str | None = None
) -> tuple[str | None, str | None]:
    """Validate a thumbnail filename; returns (value, error).

    Must be one of the caller's own uploads. Keeping the already-stored value
    is always allowed (a copied exercise points at the original owner's upload).
    """
    if value is None or value == "":
        return None, None
    if not isinstance(value, str) or not EXERCISE_IMAGE_FILENAME.fullmatch(value):
        return None, "Invalid thumbnail."
    if value == current:
        return value, None
    owned = db.session.scalar(
        db.select(UploadedImage.id).where(
            UploadedImage.filename == value,
            UploadedImage.user_id == g.current_api_user.id,
        )
    )
    if owned is None:
        return None, "Thumbnail must be one of your own uploaded images."
    return value, None


MAX_PROGRESSIONS = 30


def _descendant_ids(root_ids: list[int]) -> set[int]:
    """All exercise ids reachable from `root_ids` through progression links."""
    seen: set[int] = set()
    frontier = set(root_ids)
    while frontier:
        rows = db.session.scalars(
            db.select(ExerciseProgression.child_id).where(
                ExerciseProgression.parent_id.in_(frontier)
            )
        ).all()
        frontier = set(rows) - seen
        seen |= frontier
    return seen


def _set_progressions(
    exercise: ExerciseDefinition, raw: object
) -> tuple[bool, str | None]:
    """Replace `exercise`'s ordered progression children; returns (ok, error)."""
    if not isinstance(raw, list) or len(raw) > MAX_PROGRESSIONS:
        return False, f"progressions must be a list of at most {MAX_PROGRESSIONS} ids."
    child_ids: list[int] = []
    for item in raw:
        child_id = item.get("id") if isinstance(item, dict) else item
        if isinstance(child_id, bool) or not isinstance(child_id, int):
            return False, "progressions must contain exercise ids."
        if child_id in child_ids:
            return False, "Duplicate progression exercise."
        child_ids.append(child_id)

    for child_id in child_ids:
        child = db.session.get(ExerciseDefinition, child_id)
        if (
            child is None
            or child.archived
            or child.user_id != g.current_api_user.id
            or child.id == exercise.id
        ):
            return False, f"Exercise {child_id} cannot be used as a progression."
    # A child that (transitively) leads back to this exercise would form a cycle.
    if exercise.id in _descendant_ids(child_ids):
        return False, "Progressions must not form a cycle."

    db.session.execute(
        db.delete(ExerciseProgression).where(
            ExerciseProgression.parent_id == exercise.id
        )
    )
    db.session.flush()
    for order, child_id in enumerate(child_ids, start=1):
        db.session.add(ExerciseProgression(exercise.id, child_id, order))
    return True, None


def _usage_counts(user_id: int, exercise_ids: list[int]) -> dict[int, int]:
    """Number of the user's own non-template workouts using each exercise."""
    if not exercise_ids:
        return {}
    rows = db.session.execute(
        db.select(
            Exercise.exercise_definition_id,
            func.count(func.distinct(Exercise.workout_id)),
        )
        .join(Workout, Workout.id == Exercise.workout_id)
        .where(
            Exercise.exercise_definition_id.in_(exercise_ids),
            Workout.user_id == user_id,
            Workout.is_template.is_(False),
        )
        .group_by(Exercise.exercise_definition_id)
    ).all()
    return {row[0]: row[1] for row in rows}


@bp.route("/exercises", methods=["GET"])
@api_login_required
@api_check_confirmed
def api_list_exercises() -> ResponseReturnValue:
    page = request.args.get("page", 1, type=int)
    user_filter = request.args.get("user", "mine")
    selected_categories = _parse_category_ids()
    if selected_categories is None:
        return jsonify({"error": "Invalid category filter."}), 400

    query = (
        db.select(ExerciseDefinition)
        .filter_by(archived=False)
        .order_by(ExerciseDefinition.title.asc())
    )
    if user_filter == "mine":
        query = query.filter(ExerciseDefinition.user_id == g.current_api_user.id)
    else:
        followed_ids = {u.id for u in g.current_api_user.followed}
        query = query.filter(
            ExerciseDefinition.user_id.not_in(blocked_user_ids(g.current_api_user.id))
        )
        query = query.filter(
            or_(
                ExerciseDefinition.user_id == g.current_api_user.id,
                ExerciseDefinition.visibility == "public",
                db.and_(
                    ExerciseDefinition.visibility == "followers",
                    ExerciseDefinition.user_id.in_(followed_ids),
                ),
            )
        )

    # AND semantics: an exercise must belong to every selected category.
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
    usage = _usage_counts(g.current_api_user.id, [e.id for e in pagination.items])
    return jsonify(
        {
            "data": [
                {
                    **e.to_dict(viewer=g.current_api_user),
                    "used_count": usage.get(e.id, 0),
                }
                for e in pagination.items
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


@bp.route("/exercises", methods=["POST"])
@api_login_required
@api_check_confirmed
def api_create_exercise() -> ResponseReturnValue:
    data = request.get_json(silent=True) or {}
    title = data.get("title", "").strip()
    description = data.get("description")
    counting_type = data.get("counting_type", "reps")
    visibility = data.get("visibility", "followers")

    if not title:
        return jsonify({"error": "Title is required."}), 400
    if counting_type not in COUNTING_TYPES:
        return jsonify({"error": COUNTING_TYPE_ERROR}), 400
    if visibility not in VISIBILITY_VALUES:
        return jsonify({"error": "Invalid visibility."}), 400
    thumbnail, err = _parse_thumbnail(data.get("thumbnail"))
    if err:
        return jsonify({"error": err}), 400

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
        visibility=visibility,
    )
    exercise.thumbnail = thumbnail
    db.session.add(exercise)
    db.session.flush()

    # Add progression steps (legacy `progression_levels` names are ignored)
    if data.get("progressions"):
        ok, err = _set_progressions(exercise, data["progressions"])
        if not ok:
            db.session.rollback()
            return jsonify({"error": err}), 400

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
    return jsonify({"data": exercise.to_dict(viewer=g.current_api_user)}), 201


@bp.route("/exercises/<int:exercise_id>", methods=["GET"])
@api_login_required
@api_check_confirmed
def api_get_exercise(exercise_id: int) -> ResponseReturnValue:
    exercise = db.session.get(ExerciseDefinition, exercise_id)
    if exercise is None or not exercise.is_visible_to(g.current_api_user):
        return jsonify({"error": "Exercise not found."}), 404
    usage = _usage_counts(g.current_api_user.id, [exercise.id])
    return jsonify(
        {
            "data": {
                **exercise.to_dict(viewer=g.current_api_user),
                "used_count": usage.get(exercise.id, 0),
            }
        }
    )


@bp.route("/exercises/<int:exercise_id>/workouts", methods=["GET"])
@api_login_required
@api_check_confirmed
def api_exercise_workouts(exercise_id: int) -> ResponseReturnValue:
    """The current user's most recent workouts that used this exercise."""
    exercise = db.session.get(ExerciseDefinition, exercise_id)
    if exercise is None or not exercise.is_visible_to(g.current_api_user):
        return jsonify({"error": "Exercise not found."}), 404
    limit = min(max(request.args.get("limit", 10, type=int), 1), 50)
    workouts = (
        db.session.execute(
            db.select(Workout)
            .where(
                Workout.user_id == g.current_api_user.id,
                Workout.is_template.is_(False),
                Workout.id.in_(
                    db.select(Exercise.workout_id).where(
                        Exercise.exercise_definition_id == exercise_id
                    )
                ),
            )
            .order_by(
                func.coalesce(
                    Workout.planned_date, func.date(Workout.timestamp)
                ).desc(),
                Workout.id.desc(),
            )
            .limit(limit)
        )
        .scalars()
        .all()
    )
    return jsonify(
        {
            "data": [
                {
                    "id": w.id,
                    "title": w.title,
                    "planned_date": (
                        w.planned_date.isoformat() if w.planned_date else None
                    ),
                    "is_done": w.is_done,
                }
                for w in workouts
            ]
        }
    )


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

    if "visibility" in data:
        if data["visibility"] not in VISIBILITY_VALUES:
            return jsonify({"error": "Invalid visibility."}), 400
        exercise.visibility = data["visibility"]

    if "thumbnail" in data:
        thumbnail, err = _parse_thumbnail(data["thumbnail"], exercise.thumbnail)
        if err:
            return jsonify({"error": err}), 400
        exercise.thumbnail = thumbnail

    if "counting_type" in data:
        if data["counting_type"] not in COUNTING_TYPES:
            return (
                jsonify({"error": COUNTING_TYPE_ERROR}),
                400,
            )
        exercise.counting_type = data["counting_type"]

    if "progressions" in data:
        ok, err = _set_progressions(exercise, data["progressions"])
        if not ok:
            db.session.rollback()
            return jsonify({"error": err}), 400

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
    return jsonify({"data": exercise.to_dict(viewer=g.current_api_user)})


@bp.route("/exercises/<int:exercise_id>/progressions", methods=["PUT"])
@api_login_required
@api_check_confirmed
def api_set_exercise_progressions(exercise_id: int) -> ResponseReturnValue:
    """Replace the ordered progression steps (child exercises) of an exercise."""
    exercise = db.session.get(ExerciseDefinition, exercise_id)
    if exercise is None:
        return jsonify({"error": "Exercise not found."}), 404
    if exercise.user_id != g.current_api_user.id:
        return jsonify({"error": "Forbidden."}), 403
    data = request.get_json(silent=True) or {}
    ok, err = _set_progressions(exercise, data.get("progressions"))
    if not ok:
        db.session.rollback()
        return jsonify({"error": err}), 400
    db.session.commit()
    return jsonify({"data": exercise.to_dict(viewer=g.current_api_user)})


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


def _unique_title(base_title: str, copy_suffix: bool) -> str:
    """A title the current user doesn't have yet (optionally "<base> (Kopie)")."""
    new_title = f"{base_title} (Kopie)" if copy_suffix else base_title
    counter = 2
    while (
        db.session.execute(
            db.select(ExerciseDefinition.id).filter_by(
                title=new_title, user_id=g.current_api_user.id
            )
        ).first()
        is not None
    ):
        new_title = f"{base_title} (Kopie {counter})"
        counter += 1
    return new_title


def _copy_with_progressions(
    original: ExerciseDefinition,
    copies: dict[int, ExerciseDefinition],
    root: bool = False,
) -> ExerciseDefinition:
    """Copy an exercise and, recursively, the progression steps visible to us.

    `copies` maps original ids to their copies so shared steps are copied once
    (and a malformed cycle can't recurse forever).
    """
    if original.id in copies:
        return copies[original.id]
    copied = ExerciseDefinition(
        title=_unique_title(original.title, copy_suffix=root),
        description=original.description,
        user_id=g.current_api_user.id,
        counting_type=original.counting_type,
    )
    copied.thumbnail = original.thumbnail
    db.session.add(copied)
    db.session.flush()
    copies[original.id] = copied

    for link in original.progression_links.all():
        child = link.child
        if (
            child.archived
            or not child.is_visible_to(g.current_api_user)
            or len(copies) >= MAX_PROGRESSIONS
        ):
            continue
        copied_child = _copy_with_progressions(child, copies)
        db.session.add(ExerciseProgression(copied.id, copied_child.id, link.step_order))
    return copied


@bp.route("/exercises/<int:exercise_id>/copy", methods=["POST"])
@api_login_required
@api_check_confirmed
def api_copy_exercise(exercise_id: int) -> ResponseReturnValue:
    """Copy another user's exercise definition to the current user."""
    original = db.session.get(ExerciseDefinition, exercise_id)
    if original is None or not original.is_visible_to(g.current_api_user):
        return jsonify({"error": "Exercise not found."}), 404
    if original.user_id == g.current_api_user.id:
        return jsonify({"error": "Cannot copy your own exercise."}), 400

    copies: dict[int, ExerciseDefinition] = {}
    copied = _copy_with_progressions(original, copies, root=True)
    db.session.commit()
    return jsonify({"data": copied.to_dict(viewer=g.current_api_user)}), 201
