"""Copying exercises between users (explicit copy, copy-on-save, import)."""

from project import db
from project.models import ExerciseDefinition, ExerciseProgression, User

TITLE_MAX = 80
MAX_COPIED_PROGRESSIONS = 30


def _title_with_owner(base: str, owner_name: str, taken: set[str]) -> str:
    """`base (owner)`, then `base (owner 2)`, ... never over TITLE_MAX chars."""
    counter = 1
    while True:
        suffix = f" ({owner_name})" if counter == 1 else f" ({owner_name} {counter})"
        candidate = base[: TITLE_MAX - len(suffix)] + suffix
        if candidate not in taken:
            return candidate
        counter += 1


def _own_titles(user_id: int) -> set[str]:
    return set(
        db.session.scalars(
            db.select(ExerciseDefinition.title).where(
                ExerciseDefinition.user_id == user_id
            )
        )
    )


def existing_copy(source: ExerciseDefinition, user: User) -> ExerciseDefinition | None:
    """The user's non-archived copy of `source`, if they already have one."""
    result: ExerciseDefinition | None = db.session.scalar(
        db.select(ExerciseDefinition)
        .where(
            ExerciseDefinition.user_id == user.id,
            ExerciseDefinition.copied_from_id == source.id,
            ExerciseDefinition.archived.is_(False),
        )
        .order_by(ExerciseDefinition.id.asc())
        .limit(1)
    )
    return result


def copy_exercise_for_user(
    source: ExerciseDefinition,
    user: User,
    *,
    owner_suffix: bool = True,
    _copies: dict[int, ExerciseDefinition] | None = None,
) -> tuple[ExerciseDefinition, bool]:
    """Copy `source` (and visible progression steps) into `user`'s exercises.

    Returns (exercise, created). If the user already has a copy it is reused
    and `created` is False. The title gets the source owner's username as a
    suffix, e.g. "Tuck Planche (max)". Categories are not copied (they are
    per user).
    """
    copies = _copies if _copies is not None else {}
    if source.id in copies:
        return copies[source.id], False

    reused = existing_copy(source, user)
    if reused is not None:
        copies[source.id] = reused
        return reused, False

    taken = _own_titles(user.id)
    owner = db.session.get(User, source.user_id)
    owner_name = owner.username if owner else "copy"
    title = (
        _title_with_owner(source.title or "", owner_name, taken)
        if owner_suffix or source.title in taken
        else source.title
    )
    copied = ExerciseDefinition(
        title=title,
        description=source.description,
        user_id=user.id,
        counting_type=source.counting_type,
    )
    copied.thumbnail = source.thumbnail
    copied.copied_from_id = source.id
    db.session.add(copied)
    db.session.flush()
    copies[source.id] = copied

    for link in source.progression_links.all():
        child = link.child
        if (
            child.archived
            or not child.is_visible_to(user)
            or len(copies) >= MAX_COPIED_PROGRESSIONS
        ):
            continue
        copied_child, _ = copy_exercise_for_user(
            child, user, owner_suffix=owner_suffix, _copies=copies
        )
        db.session.add(ExerciseProgression(copied.id, copied_child.id, link.step_order))
    return copied, True
