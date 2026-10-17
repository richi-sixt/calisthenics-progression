"""API routes for the app library (admin-curated exercise catalog).

Catalog exercises are normal exercise definitions flagged `is_catalog`, owned
by an admin. Admins create and edit them through the regular exercise
endpoints (`is_catalog: true`); everyone else browses them here and imports
the ones they want, which copies them into their own exercises.
"""

from flask import current_app, g, jsonify, request
from flask.typing import ResponseReturnValue

from project import db
from project.api import bp
from project.api.auth_utils import api_check_confirmed, api_login_required
from project.api.exercise_copy import copy_exercise_for_user, existing_copy
from project.models import ExerciseDefinition, serialize_exercise_definitions


def _catalog_exercise(exercise_id: int) -> ExerciseDefinition | None:
    exercise = db.session.get(ExerciseDefinition, exercise_id)
    if exercise is None or not exercise.is_catalog or exercise.archived:
        return None
    return exercise


@bp.route("/catalog/exercises", methods=["GET"])
@api_login_required
@api_check_confirmed
def api_list_catalog_exercises() -> ResponseReturnValue:
    page = request.args.get("page", 1, type=int)
    search = request.args.get("q", "").strip()

    query = (
        db.select(ExerciseDefinition)
        .filter_by(archived=False, is_catalog=True)
        .order_by(ExerciseDefinition.title.asc())
    )
    if search:
        escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        query = query.filter(
            ExerciseDefinition.title.ilike(f"%{escaped}%", escape="\\")
        )

    pagination = db.paginate(
        query,
        page=page,
        per_page=current_app.config["WORKOUTS_PER_PAGE"],
        error_out=False,
    )
    items = pagination.items
    serialized = serialize_exercise_definitions(items, viewer=g.current_api_user)

    # Which entries the user already imported (and as which of their exercises)
    imported: dict[int, int] = {}
    ids = [e.id for e in items]
    if ids:
        for source_id, own_id in db.session.execute(
            db.select(ExerciseDefinition.copied_from_id, ExerciseDefinition.id).where(
                ExerciseDefinition.user_id == g.current_api_user.id,
                ExerciseDefinition.archived.is_(False),
                ExerciseDefinition.copied_from_id.in_(ids),
            )
        ):
            imported.setdefault(source_id, own_id)

    for entry in serialized:
        # The owner's private categories mean nothing to other users.
        entry["category_ids"] = []
        entry["imported_exercise_id"] = imported.get(entry["id"])

    return jsonify(
        {
            "data": serialized,
            "meta": {
                "page": pagination.page,
                "per_page": pagination.per_page,
                "total": pagination.total,
                "has_next": pagination.has_next,
                "has_prev": pagination.has_prev,
            },
        }
    )


@bp.route("/catalog/exercises/<int:exercise_id>/import", methods=["POST"])
@api_login_required
@api_check_confirmed
def api_import_catalog_exercise(exercise_id: int) -> ResponseReturnValue:
    source = _catalog_exercise(exercise_id)
    if source is None:
        return jsonify({"error": "Exercise not found."}), 404
    if source.user_id == g.current_api_user.id:
        return jsonify({"error": "Cannot import your own exercise."}), 400

    already = existing_copy(source, g.current_api_user)
    copied, created = copy_exercise_for_user(
        source, g.current_api_user, owner_suffix=False
    )
    db.session.commit()
    return (
        jsonify({"data": copied.to_dict(viewer=g.current_api_user)}),
        201 if created and already is None else 200,
    )
