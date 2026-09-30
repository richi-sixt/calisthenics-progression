"""API routes for exercise categories."""

from flask import jsonify, request
from flask.typing import ResponseReturnValue

from project import db
from project.api import bp
from project.api.auth_utils import api_check_confirmed, api_login_required
from project.models import ExerciseCategory


@bp.route("/categories", methods=["GET"])
@api_login_required
@api_check_confirmed
def api_list_categories() -> ResponseReturnValue:
    categories = (
        db.session.execute(
            db.select(ExerciseCategory).order_by(ExerciseCategory.name.asc())
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

    existing = (
        db.session.execute(db.select(ExerciseCategory).filter_by(name=name))
        .scalars()
        .first()
    )
    if existing:
        return jsonify({"data": existing.to_dict()}), 200

    cat = ExerciseCategory(name=name)
    db.session.add(cat)
    db.session.commit()
    return jsonify({"data": cat.to_dict()}), 201


@bp.route("/categories/<int:cat_id>", methods=["PUT"])
@api_login_required
@api_check_confirmed
def api_rename_category(cat_id: int) -> ResponseReturnValue:
    cat = db.session.get(ExerciseCategory, cat_id)
    if cat is None:
        return jsonify({"error": "Category not found."}), 404

    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()

    if not name:
        return jsonify({"error": "Name is required."}), 400

    duplicate = (
        db.session.execute(db.select(ExerciseCategory).filter_by(name=name))
        .scalars()
        .first()
    )
    if duplicate and duplicate.id != cat_id:
        return jsonify({"error": f'"{name}" already exists.'}), 409

    cat.name = name
    db.session.commit()
    return jsonify({"data": cat.to_dict()})


@bp.route("/categories/<int:cat_id>", methods=["DELETE"])
@api_login_required
@api_check_confirmed
def api_delete_category(cat_id: int) -> ResponseReturnValue:
    cat = db.session.get(ExerciseCategory, cat_id)
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
