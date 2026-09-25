"""API routes for exercise progression and workout frequency statistics.

Bucketing is done in Python rather than in SQL (e.g. no ``strftime``/
``date_trunc``) so the aggregation behaves identically on SQLite (dev) and
PostgreSQL (prod) -- a raw-SQL date function that only exists on one dialect
would silently break in the other.
"""

from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from flask import g, jsonify, request
from flask.typing import ResponseReturnValue

from project import db
from project.api import bp
from project.api.auth_utils import api_check_confirmed, api_login_required
from project.models import (Exercise, ExerciseCategory, ExerciseDefinition,
                            Set, Workout)

GRANULARITY_VALUES = ("week", "month")
DEFAULT_RANGE_DAYS = 365


def _parse_granularity(value: str | None) -> tuple[str, str | None]:
    """Validate the granularity query param. Returns (granularity, error)."""
    granularity = value or "month"
    if granularity not in GRANULARITY_VALUES:
        return granularity, "granularity must be 'week' or 'month'."
    return granularity, None


def _parse_date_range(args: Any) -> tuple[datetime | None, datetime | None, str | None]:
    """Parse from/to query params into a [from_dt, to_dt) UTC datetime range.

    `to` defaults to today and `from` defaults to `DEFAULT_RANGE_DAYS` before
    it. The upper bound is exclusive (one day past `to`) so same-day workouts
    aren't dropped by a `timestamp < to` comparison.
    """
    to_str = args.get("to")
    if to_str:
        try:
            to_date = date.fromisoformat(to_str)
        except ValueError:
            return None, None, "Invalid 'to'. Use YYYY-MM-DD."
    else:
        to_date = date.today()

    from_str = args.get("from")
    if from_str:
        try:
            from_date = date.fromisoformat(from_str)
        except ValueError:
            return None, None, "Invalid 'from'. Use YYYY-MM-DD."
    else:
        from_date = to_date - timedelta(days=DEFAULT_RANGE_DAYS)

    from_dt = datetime.combine(from_date, time.min, tzinfo=timezone.utc)
    to_dt = datetime.combine(to_date + timedelta(days=1), time.min, tzinfo=timezone.utc)
    return from_dt, to_dt, None


def _bucket_key(dt: datetime, granularity: str) -> str:
    """The period label a timestamp falls into: 'YYYY-Www' or 'YYYY-MM'."""
    if granularity == "week":
        iso_year, iso_week, _ = dt.isocalendar()
        return f"{iso_year}-W{iso_week:02d}"
    return f"{dt.year}-{dt.month:02d}"


def _period_range(
    from_dt: datetime, to_dt_exclusive: datetime, granularity: str
) -> list[str]:
    """Ordered, gap-free list of period keys covering [from_dt, to_dt_exclusive).

    Pre-seeding every period (not just the ones with data) lets a period with
    zero logged sets render as 0 on a line chart instead of a silent gap.
    """
    periods: list[str] = []
    seen: set[str] = set()
    current = from_dt.date()
    end = to_dt_exclusive.date()
    while current < end:
        key = _bucket_key(datetime.combine(current, time.min), granularity)
        if key not in seen:
            seen.add(key)
            periods.append(key)
        current += timedelta(days=1)
    return periods


@bp.route("/exercises/<int:exercise_id>/stats", methods=["GET"])
@api_login_required
@api_check_confirmed
def api_exercise_stats(exercise_id: int) -> ResponseReturnValue:
    """Per-period reps/duration progression for one exercise, current user only."""
    exercise_def = db.session.get(ExerciseDefinition, exercise_id)
    if exercise_def is None or not exercise_def.is_visible_to(g.current_api_user):
        return jsonify({"error": "Exercise not found."}), 404

    granularity, err = _parse_granularity(request.args.get("granularity"))
    if err:
        return jsonify({"error": err}), 400
    from_dt, to_dt, err = _parse_date_range(request.args)
    if err or from_dt is None or to_dt is None:
        return jsonify({"error": err}), 400

    progression = request.args.get("progression") or None

    periods = _period_range(from_dt, to_dt, granularity)
    buckets: dict[str, dict[str, Any]] = {
        period: {"best": 0, "total": 0, "sessions": set()} for period in periods
    }

    # Stats are scoped to the current user's own logged sets, regardless of
    # who owns the exercise definition -- visibility only gates whether the
    # exercise itself can be seen, not another user's private workout data.
    query = (
        db.select(Set.reps, Set.duration, Exercise.workout_id, Workout.timestamp)
        .join(Exercise, Set.exercise_id == Exercise.id)
        .join(Workout, Exercise.workout_id == Workout.id)
        .filter(
            Exercise.exercise_definition_id == exercise_id,
            Workout.user_id == g.current_api_user.id,
            Workout.is_template == False,  # noqa: E712
            Workout.timestamp >= from_dt,
            Workout.timestamp < to_dt,
        )
    )
    if progression:
        query = query.filter(Set.progression == progression)
    rows = db.session.execute(query).all()

    value_field = "duration" if exercise_def.counting_type == "duration" else "reps"
    for reps, duration, workout_id, timestamp in rows:
        value = duration if value_field == "duration" else reps
        if value is None:
            continue
        bucket = buckets[_bucket_key(timestamp, granularity)]
        bucket["best"] = max(bucket["best"], value)
        bucket["total"] += value
        bucket["sessions"].add(workout_id)

    return jsonify(
        {
            "data": {
                "exercise_id": exercise_def.id,
                "counting_type": exercise_def.counting_type,
                "granularity": granularity,
                "progression": progression,
                "buckets": [
                    {
                        "period": period,
                        "best": buckets[period]["best"],
                        "total": buckets[period]["total"],
                        "session_count": len(buckets[period]["sessions"]),
                    }
                    for period in periods
                ],
            }
        }
    )


@bp.route("/workouts/stats", methods=["GET"])
@api_login_required
@api_check_confirmed
def api_workout_stats() -> ResponseReturnValue:
    """Per-period workout frequency and volume, current user only."""
    granularity, err = _parse_granularity(request.args.get("granularity"))
    if err:
        return jsonify({"error": err}), 400
    from_dt, to_dt, err = _parse_date_range(request.args)
    if err or from_dt is None or to_dt is None:
        return jsonify({"error": err}), 400

    category_id = request.args.get("category", type=int)

    periods = _period_range(from_dt, to_dt, granularity)
    buckets: dict[str, dict[str, int]] = {
        period: {
            "workout_count": 0,
            "total_sets": 0,
            "total_reps": 0,
            "total_duration": 0,
        }
        for period in periods
    }

    if category_id is None:
        # Queried separately from the volume sums below: a workout with
        # exercises but no sets logged yet would be silently dropped by the
        # Set join. Not possible to count this way when filtering by
        # category, since a workout only "belongs" to a category through a
        # set on one of its exercises -- see the session-id fallback below.
        workout_timestamps = (
            db.session.execute(
                db.select(Workout.timestamp).filter(
                    Workout.user_id == g.current_api_user.id,
                    Workout.is_template == False,  # noqa: E712
                    Workout.timestamp >= from_dt,
                    Workout.timestamp < to_dt,
                )
            )
            .scalars()
            .all()
        )
        for timestamp in workout_timestamps:
            buckets[_bucket_key(timestamp, granularity)]["workout_count"] += 1

    set_query = (
        db.select(Set.reps, Set.duration, Exercise.workout_id, Workout.timestamp)
        .join(Exercise, Set.exercise_id == Exercise.id)
        .join(Workout, Exercise.workout_id == Workout.id)
        .filter(
            Workout.user_id == g.current_api_user.id,
            Workout.is_template == False,  # noqa: E712
            Workout.timestamp >= from_dt,
            Workout.timestamp < to_dt,
        )
    )
    if category_id is not None:
        set_query = set_query.join(
            ExerciseDefinition, Exercise.exercise_definition_id == ExerciseDefinition.id
        ).filter(ExerciseDefinition.categories.any(ExerciseCategory.id == category_id))

    workout_ids_per_bucket: dict[str, set[int]] = {period: set() for period in periods}
    for reps, duration, workout_id, timestamp in db.session.execute(set_query).all():
        key = _bucket_key(timestamp, granularity)
        bucket = buckets[key]
        bucket["total_sets"] += 1
        if reps is not None:
            bucket["total_reps"] += reps
        if duration is not None:
            bucket["total_duration"] += duration
        workout_ids_per_bucket[key].add(workout_id)

    if category_id is not None:
        for period in periods:
            buckets[period]["workout_count"] = len(workout_ids_per_bucket[period])

    return jsonify(
        {
            "data": {
                "granularity": granularity,
                "category_id": category_id,
                "buckets": [
                    {"period": period, **buckets[period]} for period in periods
                ],
            }
        }
    )
