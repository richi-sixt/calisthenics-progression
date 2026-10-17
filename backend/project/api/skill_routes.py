"""API routes for skills (ordered exercises with targets, private to the owner)."""

from typing import Any

from flask import g, jsonify, request
from flask.typing import ResponseReturnValue

from project import db
from project.api import bp
from project.api.auth_utils import api_check_confirmed, api_login_required
from project.models import (
    Exercise,
    ExerciseDefinition,
    Set,
    Skill,
    SkillExercise,
    Workout,
)

MAX_SKILL_EXERCISES = 30
MAX_TARGET_VALUE = 36000  # seconds or repetitions
SKILL_COUNTING_TYPES = ("reps", "duration")
TITLE_MAX = 80


def _own_skill(skill_id: int) -> Skill | None:
    skill = db.session.get(Skill, skill_id)
    if skill is None or skill.user_id != g.current_api_user.id:
        return None
    return skill


def _progress(exercise_ids: list[int]) -> dict[int, dict[str, Any]]:
    """Best result and last done date per exercise, from the user's own logs.

    Only sets of done, non-template workouts count. "Best" is the highest
    duration (seconds) or repetitions depending on the exercise's counting type.
    """
    if not exercise_ids:
        return {}
    rows = db.session.execute(
        db.select(
            Exercise.exercise_definition_id,
            db.func.max(Set.reps),
            db.func.max(Set.duration),
            db.func.max(Workout.planned_date),
        )
        .join(Exercise, Set.exercise_id == Exercise.id)
        .join(Workout, Exercise.workout_id == Workout.id)
        .where(
            Exercise.exercise_definition_id.in_(exercise_ids),
            Workout.user_id == g.current_api_user.id,
            Workout.is_template.is_(False),
            Workout.is_done.is_(True),
        )
        .group_by(Exercise.exercise_definition_id)
    ).all()
    return {
        exercise_id: {"reps": reps, "duration": duration, "last_done": last_done}
        for exercise_id, reps, duration, last_done in rows
    }


def _exercise_entry(
    link: SkillExercise, progress: dict[int, dict[str, Any]]
) -> dict[str, Any]:
    exercise = link.exercise
    entry = progress.get(link.exercise_id)
    best = 0
    last_done = None
    if entry is not None:
        key = "duration" if exercise.counting_type == "duration" else "reps"
        best = entry[key] or 0
        last_done = entry["last_done"].isoformat() if entry["last_done"] else None
    return {
        "exercise_id": link.exercise_id,
        "title": exercise.title,
        "counting_type": exercise.counting_type,
        "thumbnail_url": exercise.thumbnail_url,
        "archived": exercise.archived,
        "step_order": link.step_order,
        "target_value": link.target_value,
        "best": best,
        "reached": best >= link.target_value,
        "last_done_date": last_done,
    }


def _exercise_ids(skill: Skill) -> list[int]:
    return [link.exercise_id for link in skill.exercise_links]  # type: ignore[attr-defined]


def _skill_dict(skill: Skill, progress: dict[int, dict[str, Any]]) -> dict[str, Any]:
    entries = [_exercise_entry(link, progress) for link in skill.exercise_links]  # type: ignore[attr-defined]
    next_exercise = next((e for e in entries if not e["reached"]), None)
    return {
        "id": skill.id,
        "title": skill.title,
        "description": skill.description,
        "is_catalog": skill.is_catalog,
        "exercises": entries,
        "exercise_count": len(entries),
        "reached_count": sum(1 for e in entries if e["reached"]),
        "next_exercise_id": next_exercise["exercise_id"] if next_exercise else None,
    }


def _parse_exercises(
    raw: object, current_skill_id: int | None, catalog: bool = False
) -> tuple[list[tuple[int, int]] | None, str | None]:
    """Validate [{exercise_id, target_value}]; returns ([(id, target)], error)."""
    if not isinstance(raw, list) or len(raw) > MAX_SKILL_EXERCISES:
        return None, f"exercises must be a list of at most {MAX_SKILL_EXERCISES} items."
    parsed: list[tuple[int, int]] = []
    for item in raw:
        if not isinstance(item, dict):
            return None, "Each exercise needs exercise_id and target_value."
        exercise_id = item.get("exercise_id")
        target = item.get("target_value")
        if isinstance(exercise_id, bool) or not isinstance(exercise_id, int):
            return None, "exercise_id must be an integer."
        if (
            isinstance(target, bool)
            or not isinstance(target, int)
            or not 1 <= target <= MAX_TARGET_VALUE
        ):
            return None, f"target_value must be between 1 and {MAX_TARGET_VALUE}."
        if any(exercise_id == e for e, _ in parsed):
            return None, "Duplicate exercise."
        exercise = db.session.get(ExerciseDefinition, exercise_id)
        if (
            exercise is None
            or exercise.user_id != g.current_api_user.id
            or exercise.counting_type not in SKILL_COUNTING_TYPES
            # App-library skills hold library exercises, personal skills never do.
            or exercise.is_catalog != catalog
        ):
            return None, f"Exercise {exercise_id} cannot be used in a skill."
        # Archived exercises stay in existing skills but can't be newly added.
        if exercise.archived and not _already_linked(current_skill_id, exercise_id):
            return None, f"Exercise {exercise_id} cannot be used in a skill."
        parsed.append((exercise_id, target))
    return parsed, None


def _already_linked(skill_id: int | None, exercise_id: int) -> bool:
    if skill_id is None:
        return False
    return (
        db.session.scalar(
            db.select(SkillExercise.id).where(
                SkillExercise.skill_id == skill_id,
                SkillExercise.exercise_id == exercise_id,
            )
        )
        is not None
    )


def _parse_title(data: dict[str, Any]) -> tuple[str | None, str | None]:
    title = str(data.get("title", "")).strip()
    if not title:
        return None, "Title is required."
    if len(title) > TITLE_MAX:
        return None, f"Title must be at most {TITLE_MAX} characters."
    return title, None


def _title_taken(title: str, ignore_id: int | None = None) -> bool:
    existing = db.session.scalar(
        db.select(Skill.id).where(
            Skill.user_id == g.current_api_user.id, Skill.title == title
        )
    )
    return existing is not None and existing != ignore_id


def _replace_exercises(skill: Skill, parsed: list[tuple[int, int]]) -> None:
    skill.exercise_links.clear()
    db.session.flush()
    for order, (exercise_id, target) in enumerate(parsed, start=1):
        skill.exercise_links.append(SkillExercise(skill.id, exercise_id, order, target))


@bp.route("/skills", methods=["GET"])
@api_login_required
@api_check_confirmed
def api_list_skills() -> ResponseReturnValue:
    skills = db.session.scalars(
        db.select(Skill)
        .where(Skill.user_id == g.current_api_user.id, Skill.is_catalog.is_(False))
        .order_by(Skill.title.asc())
    ).all()
    exercise_ids = [link.exercise_id for s in skills for link in s.exercise_links]  # type: ignore[attr-defined]
    progress = _progress(exercise_ids)
    return jsonify({"data": [_skill_dict(s, progress) for s in skills]})


@bp.route("/skills", methods=["POST"])
@api_login_required
@api_check_confirmed
def api_create_skill() -> ResponseReturnValue:
    data = request.get_json(silent=True) or {}
    title, err = _parse_title(data)
    if err or title is None:
        return jsonify({"error": err}), 400
    if _title_taken(title):
        return jsonify({"error": f'"{title}" already exists.'}), 409
    is_catalog = data.get("is_catalog", False)
    if not isinstance(is_catalog, bool):
        return jsonify({"error": "Invalid is_catalog."}), 400
    if is_catalog and not g.current_api_user.admin:
        return jsonify({"error": "Forbidden."}), 403
    parsed, err = _parse_exercises(data.get("exercises", []), None, is_catalog)
    if err or parsed is None:
        return jsonify({"error": err}), 400

    description = str(data.get("description") or "").strip() or None
    skill = Skill(title=title, user_id=g.current_api_user.id, description=description)
    skill.is_catalog = is_catalog
    db.session.add(skill)
    db.session.flush()
    _replace_exercises(skill, parsed)
    db.session.commit()
    return (
        jsonify({"data": _skill_dict(skill, _progress([e for e, _ in parsed]))}),
        201,
    )


@bp.route("/skills/<int:skill_id>", methods=["GET"])
@api_login_required
@api_check_confirmed
def api_get_skill(skill_id: int) -> ResponseReturnValue:
    skill = _own_skill(skill_id)
    if skill is None:
        return jsonify({"error": "Skill not found."}), 404
    progress = _progress(_exercise_ids(skill))
    return jsonify({"data": _skill_dict(skill, progress)})


@bp.route("/skills/<int:skill_id>", methods=["PUT"])
@api_login_required
@api_check_confirmed
def api_update_skill(skill_id: int) -> ResponseReturnValue:
    skill = _own_skill(skill_id)
    if skill is None:
        return jsonify({"error": "Skill not found."}), 404
    data = request.get_json(silent=True) or {}

    if "title" in data:
        title, err = _parse_title(data)
        if err or title is None:
            return jsonify({"error": err}), 400
        if _title_taken(title, ignore_id=skill.id):
            return jsonify({"error": f'"{title}" already exists.'}), 409
        skill.title = title
    if "description" in data:
        skill.description = str(data["description"] or "").strip() or None
    if "exercises" in data:
        parsed, err = _parse_exercises(data["exercises"], skill.id, skill.is_catalog)
        if err or parsed is None:
            db.session.rollback()
            return jsonify({"error": err}), 400
        _replace_exercises(skill, parsed)

    db.session.commit()
    progress = _progress(_exercise_ids(skill))
    return jsonify({"data": _skill_dict(skill, progress)})


@bp.route("/skills/<int:skill_id>", methods=["DELETE"])
@api_login_required
@api_check_confirmed
def api_delete_skill(skill_id: int) -> ResponseReturnValue:
    skill = _own_skill(skill_id)
    if skill is None:
        return jsonify({"error": "Skill not found."}), 404
    db.session.delete(skill)
    db.session.commit()
    return jsonify({"data": {"message": "Skill deleted."}}), 200
