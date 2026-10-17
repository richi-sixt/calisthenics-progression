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
from project.models import (
    ExerciseDefinition,
    Skill,
    SkillExercise,
    User,
    serialize_exercise_definitions,
)


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


def _catalog_skill(skill_id: int) -> Skill | None:
    skill = db.session.get(Skill, skill_id)
    if skill is None or not skill.is_catalog:
        return None
    return skill


@bp.route("/catalog/skills", methods=["GET"])
@api_login_required
@api_check_confirmed
def api_list_catalog_skills() -> ResponseReturnValue:
    """App-library skills. Progress is personal, so only the plan is returned."""
    search = request.args.get("q", "").strip()
    query = (
        db.select(Skill).where(Skill.is_catalog.is_(True)).order_by(Skill.title.asc())
    )
    if search:
        escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        query = query.filter(Skill.title.ilike(f"%{escaped}%", escape="\\"))
    skills = db.session.scalars(query).all()

    imported: dict[int, int] = {}
    if skills:
        for source_id, own_id in db.session.execute(
            db.select(Skill.copied_from_id, Skill.id).where(
                Skill.user_id == g.current_api_user.id,
                Skill.copied_from_id.in_([s.id for s in skills]),
            )
        ):
            imported.setdefault(source_id, own_id)

    return jsonify(
        {
            "data": [
                {
                    "id": skill.id,
                    "title": skill.title,
                    "description": skill.description,
                    "user_id": skill.user_id,
                    "imported_skill_id": imported.get(skill.id),
                    "exercises": [
                        {
                            "exercise_id": link.exercise_id,
                            "title": link.exercise.title,
                            "counting_type": link.exercise.counting_type,
                            "thumbnail_url": link.exercise.thumbnail_url,
                            "step_order": link.step_order,
                            "target_value": link.target_value,
                        }
                        for link in skill.exercise_links  # type: ignore[attr-defined]
                        if not link.exercise.archived
                    ],
                }
                for skill in skills
            ]
        }
    )


@bp.route("/catalog/skills/<int:skill_id>/import", methods=["POST"])
@api_login_required
@api_check_confirmed
def api_import_catalog_skill(skill_id: int) -> ResponseReturnValue:
    """Copy a library skill and its exercises into the user's own skills."""
    source = _catalog_skill(skill_id)
    if source is None:
        return jsonify({"error": "Skill not found."}), 404
    me = g.current_api_user
    if source.user_id == me.id:
        return jsonify({"error": "Cannot import your own skill."}), 400

    existing = db.session.scalar(
        db.select(Skill).where(
            Skill.user_id == me.id, Skill.copied_from_id == source.id
        )
    )
    if existing is not None:
        return jsonify({"data": {"id": existing.id, "title": existing.title}}), 200

    taken = set(
        db.session.scalars(db.select(Skill.title).where(Skill.user_id == me.id))
    )
    title = source.title
    if title in taken:
        owner = db.session.get(User, source.user_id)
        base = f"{source.title} ({owner.username if owner else 'copy'})"
        title, counter = base, 2
        while title in taken:
            title = f"{base[:-1]} {counter})"
            counter += 1

    skill = Skill(title=title, user_id=me.id, description=source.description)
    skill.copied_from_id = source.id
    db.session.add(skill)
    db.session.flush()

    copies: dict[int, ExerciseDefinition] = {}
    order = 0
    for link in source.exercise_links:  # type: ignore[attr-defined]
        if link.exercise.archived:
            continue
        copied, _ = copy_exercise_for_user(
            link.exercise, me, owner_suffix=False, _copies=copies
        )
        order += 1
        skill.exercise_links.append(  # type: ignore[attr-defined]
            SkillExercise(skill.id, copied.id, order, link.target_value)
        )
    db.session.commit()
    return jsonify({"data": {"id": skill.id, "title": skill.title}}), 201
