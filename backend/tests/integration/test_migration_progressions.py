"""Data conversion of progression levels into child exercises (migration)."""

import importlib.util
from pathlib import Path

import pytest

from project import db
from project.models import (
    Exercise,
    ExerciseCategory,
    ExerciseDefinition,
    ExerciseProgression,
    ProgressionLevel,
    Set,
    Workout,
)

MIGRATION = (
    Path(__file__).resolve().parents[2]
    / "migrations"
    / "versions"
    / "a7d1e5c9f432_progression_levels_to_child_exercises.py"
)


@pytest.fixture
def migrate():
    spec = importlib.util.spec_from_file_location("mig_progressions", MIGRATION)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    def run():
        db.session.commit()
        module.migrate_levels(db.session.connection())
        db.session.commit()
        db.session.expire_all()

    return run


def _exercise(user, title, counting_type="reps", **kw):
    ex = ExerciseDefinition(
        title=title, user_id=user.id, counting_type=counting_type, **kw
    )
    db.session.add(ex)
    db.session.flush()
    return ex


def _levels(parent, *names):
    for order, name in enumerate(names, start=1):
        db.session.add(ProgressionLevel(parent.id, name, order))
    db.session.flush()


def _workout_with(user, definition, set_specs, notes=None, title="W"):
    """Workout with one instance of `definition`; set_specs = [(progression, reps)]."""
    workout = Workout(title=title, user_id=user.id)
    db.session.add(workout)
    db.session.flush()
    inst = Exercise(
        exercise_order=1,
        workout_id=workout.id,
        exercise_definition_id=definition.id,
        notes=notes,
    )
    db.session.add(inst)
    db.session.flush()
    for order, (prog, reps) in enumerate(set_specs, start=1):
        db.session.add(Set(order, inst.id, progression=prog, reps=reps))
    db.session.flush()
    return workout, inst


def _steps(parent_id):
    links = db.session.scalars(
        db.select(ExerciseProgression)
        .where(ExerciseProgression.parent_id == parent_id)
        .order_by(ExerciseProgression.step_order)
    ).all()
    return [(link.child.title, link.step_order) for link in links]


def _instances(workout_id):
    return db.session.scalars(
        db.select(Exercise)
        .where(Exercise.workout_id == workout_id)
        .order_by(Exercise.exercise_order)
    ).all()


def test_levels_become_ordered_children(app, user, migrate):
    cat = ExerciseCategory(name="Pull")
    db.session.add(cat)
    parent = _exercise(user, "Pull-ups", visibility="public")
    parent.categories = [cat]
    _levels(parent, "Scapular Pull-ups", "Band-assisted Pull-ups", "Negative Pull-ups")

    migrate()

    assert _steps(parent.id) == [
        ("Scapular Pull-ups", 1),
        ("Band-assisted Pull-ups", 2),
        ("Negative Pull-ups", 3),
    ]
    child = db.session.scalars(
        db.select(ExerciseDefinition).filter_by(title="Negative Pull-ups")
    ).one()
    assert child.user_id == user.id
    assert child.counting_type == "reps"
    assert child.visibility == "public"
    assert child.archived is False
    assert [c.name for c in child.categories] == ["Pull"]
    # legacy rows are left alone
    assert db.session.scalars(db.select(ProgressionLevel)).all().__len__() == 3


def test_instance_with_single_level_is_repointed(app, user, migrate):
    parent = _exercise(user, "Pull-ups")
    _levels(parent, "Negative")
    workout, inst = _workout_with(user, parent, [("Negative", 5), ("Negative", 4)])

    migrate()

    child = db.session.scalars(
        db.select(ExerciseDefinition).filter_by(title="Negative")
    ).one()
    [only] = _instances(workout.id)
    assert only.id == inst.id
    assert only.exercise_definition_id == child.id


def test_mixed_instance_is_split_and_renumbered(app, user, migrate):
    parent = _exercise(user, "Pull-ups")
    other = _exercise(user, "Dips")
    _levels(parent, "Scap", "Band")
    workout, inst = _workout_with(
        user,
        parent,
        [("Scap", 10), (None, 8), ("Band", 6), ("Scap", 9), ("Band", 5)],
        notes="felt good",
    )
    # a second exercise after it in the same workout must keep its relative order
    after = Exercise(2, workout.id, other.id)
    db.session.add(after)

    migrate()

    scap = db.session.scalars(
        db.select(ExerciseDefinition).filter_by(title="Scap")
    ).one()
    band = db.session.scalars(
        db.select(ExerciseDefinition).filter_by(title="Band")
    ).one()
    instances = _instances(workout.id)
    assert [i.exercise_order for i in instances] == [1, 2, 3, 4]
    assert [i.exercise_definition_id for i in instances] == [
        parent.id,
        scap.id,
        band.id,
        other.id,
    ]
    original = instances[0]
    assert original.id == inst.id and original.notes == "felt good"
    assert instances[1].notes is None
    reps = {
        i.exercise_definition_id: [s.reps for s in i.sets.order_by(Set.set_order)]
        for i in instances
    }
    assert reps[parent.id] == [8]
    assert reps[scap.id] == [10, 9]
    assert reps[band.id] == [6, 5]
    for i in instances[:3]:
        assert [s.set_order for s in i.sets.order_by(Set.set_order)] == list(
            range(1, i.sets.count() + 1)
        )


def test_instance_with_all_levels_keeps_notes_on_first_child(app, user, migrate):
    parent = _exercise(user, "Pull-ups")
    _levels(parent, "A", "B")
    workout, inst = _workout_with(user, parent, [("B", 1), ("A", 2)], notes="n")

    migrate()

    a = db.session.scalars(db.select(ExerciseDefinition).filter_by(title="A")).one()
    b = db.session.scalars(db.select(ExerciseDefinition).filter_by(title="B")).one()
    first, second = _instances(workout.id)
    assert (first.id, first.exercise_definition_id, first.notes) == (inst.id, b.id, "n")
    assert (second.exercise_definition_id, second.notes) == (a.id, None)


def test_unmatched_progression_stays_on_parent(app, user, migrate):
    parent = _exercise(user, "Pull-ups")
    _levels(parent, "Scap")
    workout, inst = _workout_with(user, parent, [("Standard", 10), (None, 8)])

    migrate()

    [only] = _instances(workout.id)
    assert only.exercise_definition_id == parent.id
    assert only.sets.count() == 2


def test_existing_exercise_with_same_title_is_reused(app, user, migrate):
    parent = _exercise(user, "Pull-ups")
    existing = _exercise(user, "Negative Pull-ups")
    _levels(parent, "Negative Pull-ups")

    migrate()

    assert _steps(parent.id) == [("Negative Pull-ups", 1)]
    link = db.session.scalars(db.select(ExerciseProgression)).one()
    assert link.child_id == existing.id
    assert db.session.scalar(db.select(db.func.count(ExerciseDefinition.id))) == 2


def test_title_clash_with_other_counting_type_gets_parent_suffix(app, user, migrate):
    parent = _exercise(user, "Pull-ups")
    _exercise(user, "Hang", counting_type="duration")
    _levels(parent, "Hang")

    migrate()

    assert _steps(parent.id) == [("Hang (Pull-ups)", 1)]


def test_generic_level_names_are_not_shared_between_parents(app, user, migrate):
    pull = _exercise(user, "Pull-ups")
    push = _exercise(user, "Push-ups")
    _levels(pull, "Standard")
    _levels(push, "Standard")

    migrate()

    [(pull_child, _)] = _steps(pull.id)
    [(push_child, _)] = _steps(push.id)
    assert {pull_child, push_child} == {"Standard", "Standard (Push-ups)"}


def test_reuse_that_would_form_a_cycle_creates_new_exercise(app, user, migrate):
    a = _exercise(user, "A")
    b = _exercise(user, "B")
    _levels(a, "B")
    _levels(b, "A")

    migrate()

    # A -> B was linked first; B's level "A" must not link back to A.
    assert _steps(a.id) == [("B", 1)]
    [(title, _)] = _steps(b.id)
    assert title == "A (B)"


def test_archived_parent_children_are_archived(app, user, migrate):
    parent = _exercise(user, "Old", archived=True)
    _levels(parent, "Step")

    migrate()

    child = db.session.scalars(
        db.select(ExerciseDefinition).filter_by(title="Step")
    ).one()
    assert child.archived is True


def test_blank_and_duplicate_levels_are_skipped(app, user, migrate):
    parent = _exercise(user, "P")
    _levels(parent, "  ", "One", "One", "Two")

    migrate()

    assert _steps(parent.id) == [("One", 1), ("Two", 2)]


def test_noop_without_levels(app, user, migrate):
    _exercise(user, "Plain")
    migrate()
    assert db.session.scalars(db.select(ExerciseProgression)).all() == []
