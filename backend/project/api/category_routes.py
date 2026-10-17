"""API routes for exercise categories and category groups (per user)."""

from typing import Any

from flask import g, jsonify, request
from flask.typing import ResponseReturnValue

from project import db
from project.api import bp
from project.api.auth_utils import api_check_confirmed, api_login_required
from project.models import CategoryGroup, ExerciseCategory, ensure_default_groups


def _own_category(cat_id: int) -> ExerciseCategory | None:
    cat = db.session.get(ExerciseCategory, cat_id)
    if cat is None or cat.user_id != g.current_api_user.id:
        return None
    return cat


def _own_group(group_id: int) -> CategoryGroup | None:
    group = db.session.get(CategoryGroup, group_id)
    if group is None or group.user_id != g.current_api_user.id:
        return None
    return group


def _parse_group_id(
    data: dict[str, Any],
) -> tuple[bool, int | None, ResponseReturnValue | None]:
    """Return (present, group_id, error_response) for an optional group_id."""
    if "group_id" not in data:
        return False, None, None
    raw = data["group_id"]
    if raw is None:
        return True, None, None
    if isinstance(raw, bool) or not isinstance(raw, int):
        return True, None, (jsonify({"error": "Invalid group."}), 400)
    if _own_group(raw) is None:
        return True, None, (jsonify({"error": "Group not found."}), 404)
    return True, raw, None


@bp.route("/categories", methods=["GET"])
@api_login_required
@api_check_confirmed
def api_list_categories() -> ResponseReturnValue:
    ensure_default_groups(g.current_api_user.id)
    categories = (
        db.session.execute(
            db.select(ExerciseCategory)
            .where(ExerciseCategory.user_id == g.current_api_user.id)
            .order_by(ExerciseCategory.name.asc())
        )
        .scalars()
        .all()
    )
    return jsonify({"data": [c.to_dict() for c in categories]})


@bp.route("/categories", methods=["POST"])
@api_login_required
@api_check_confirmed
def api_create_category() -> ResponseReturnValue:
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()

    if not name:
        return jsonify({"error": "Name is required."}), 400

    existing = db.session.scalar(
        db.select(ExerciseCategory).filter_by(name=name, user_id=g.current_api_user.id)
    )
    if existing:
        return jsonify({"data": existing.to_dict()}), 200

    _, group_id, err = _parse_group_id(data)
    if err is not None:
        return err

    cat = ExerciseCategory(name=name, user_id=g.current_api_user.id, group_id=group_id)
    db.session.add(cat)
    db.session.commit()
    return jsonify({"data": cat.to_dict()}), 201


@bp.route("/categories/<int:cat_id>", methods=["PUT"])
@api_login_required
@api_check_confirmed
def api_update_category(cat_id: int) -> ResponseReturnValue:
    cat = _own_category(cat_id)
    if cat is None:
        return jsonify({"error": "Category not found."}), 404

    data = request.get_json(silent=True) or {}

    if "name" in data or "group_id" not in data:
        name = str(data.get("name", "")).strip()
        if not name:
            return jsonify({"error": "Name is required."}), 400
        duplicate = db.session.scalar(
            db.select(ExerciseCategory).filter_by(
                name=name, user_id=g.current_api_user.id
            )
        )
        if duplicate and duplicate.id != cat_id:
            return jsonify({"error": f'"{name}" already exists.'}), 409
        cat.name = name

    present, group_id, err = _parse_group_id(data)
    if err is not None:
        return err
    if present:
        cat.group_id = group_id

    db.session.commit()
    return jsonify({"data": cat.to_dict()})


@bp.route("/categories/<int:cat_id>", methods=["DELETE"])
@api_login_required
@api_check_confirmed
def api_delete_category(cat_id: int) -> ResponseReturnValue:
    cat = _own_category(cat_id)
    if cat is None:
        return jsonify({"error": "Category not found."}), 404

    count = cat.exercise_definitions.count()  # type: ignore[attr-defined]
    if count > 0:
        return (
            jsonify(
                {
                    "error": f'Category "{cat.name}" is used by {count} exercise(s) and cannot be deleted.'
                }
            ),
            409,
        )

    db.session.delete(cat)
    db.session.commit()
    return jsonify({"data": {"message": "Category deleted."}}), 200


@bp.route("/category-groups", methods=["GET"])
@api_login_required
@api_check_confirmed
def api_list_category_groups() -> ResponseReturnValue:
    ensure_default_groups(g.current_api_user.id)
    groups = db.session.scalars(
        db.select(CategoryGroup)
        .where(CategoryGroup.user_id == g.current_api_user.id)
        .order_by(CategoryGroup.sort_order.asc(), CategoryGroup.id.asc())
    ).all()
    return jsonify({"data": [grp.to_dict() for grp in groups]})


@bp.route("/category-groups", methods=["POST"])
@api_login_required
@api_check_confirmed
def api_create_category_group() -> ResponseReturnValue:
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    if not name:
        return jsonify({"error": "Name is required."}), 400

    existing = db.session.scalar(
        db.select(CategoryGroup).filter_by(name=name, user_id=g.current_api_user.id)
    )
    if existing:
        return jsonify({"data": existing.to_dict()}), 200

    max_order = db.session.scalar(
        db.select(db.func.max(CategoryGroup.sort_order)).where(
            CategoryGroup.user_id == g.current_api_user.id
        )
    )
    group = CategoryGroup(
        name=name,
        user_id=g.current_api_user.id,
        sort_order=0 if max_order is None else max_order + 1,
    )
    db.session.add(group)
    db.session.commit()
    return jsonify({"data": group.to_dict()}), 201


@bp.route("/category-groups/<int:group_id>", methods=["PUT"])
@api_login_required
@api_check_confirmed
def api_rename_category_group(group_id: int) -> ResponseReturnValue:
    group = _own_group(group_id)
    if group is None:
        return jsonify({"error": "Group not found."}), 404

    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    if not name:
        return jsonify({"error": "Name is required."}), 400

    duplicate = db.session.scalar(
        db.select(CategoryGroup).filter_by(name=name, user_id=g.current_api_user.id)
    )
    if duplicate and duplicate.id != group_id:
        return jsonify({"error": f'"{name}" already exists.'}), 409

    group.name = name
    db.session.commit()
    return jsonify({"data": group.to_dict()})


@bp.route("/category-groups/<int:group_id>", methods=["DELETE"])
@api_login_required
@api_check_confirmed
def api_delete_category_group(group_id: int) -> ResponseReturnValue:
    group = _own_group(group_id)
    if group is None:
        return jsonify({"error": "Group not found."}), 404

    # Categories survive without a group (works on SQLite without FK enforcement)
    db.session.execute(
        db.update(ExerciseCategory)
        .where(ExerciseCategory.group_id == group_id)
        .values(group_id=None)
    )
    db.session.delete(group)
    db.session.commit()
    return jsonify({"data": {"message": "Group deleted."}}), 200
