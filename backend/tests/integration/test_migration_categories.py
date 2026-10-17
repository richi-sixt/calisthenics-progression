"""Tests for the per-user categories data migration."""

import importlib.util
from pathlib import Path

import pytest
import sqlalchemy as sa

from project import db
from project.models import (
    CategoryGroup,
    ExerciseCategory,
    ExerciseDefinition,
    exercise_categories,
)

MIGRATION = (
    Path(__file__).resolve().parents[2]
    / "migrations"
    / "versions"
    / "c9f3a1b7d452_per_user_categories_and_groups.py"
)


@pytest.fixture
def migrate():
    spec = importlib.util.spec_from_file_location("mig_categories", MIGRATION)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    def run():
        db.session.commit()
        module.migrate_categories(db.session.connection())
        db.session.commit()
        db.session.expire_all()

    return run


@pytest.fixture(autouse=True)
def legacy_schema(app):
    """Make exercise_category.user_id nullable, as it is when the migration runs."""
    db.session.rollback()
    exercise_categories.drop(db.engine)
    ExerciseCategory.__table__.drop(db.engine)
    md = sa.MetaData()
    sa.Table(
        "exercise_category",
        md,
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("user_id", sa.Integer, nullable=True),
        sa.Column("group_id", sa.Integer, nullable=True),
    )
    md.create_all(db.engine)
    exercise_categories.create(db.engine)


def _global_category(name):
    """Insert a legacy global category row (no owner)."""
    result = db.session.execute(
        sa.insert(ExerciseCategory.__table__).values(name=name, user_id=None)
    )
    return result.inserted_primary_key[0]


def test_global_category_is_cloned_per_user(app, user, second_user, migrate):
    cat_id = _global_category("Core")
    unused_id = _global_category("Unused")
    a = ExerciseDefinition(title="A", user_id=user.id)
    b = ExerciseDefinition(title="B", user_id=second_user.id)
    db.session.add_all([a, b])
    db.session.flush()
    for ex in (a, b):
        db.session.execute(
            exercise_categories.insert().values(
                exercise_definition_id=ex.id, category_id=cat_id
            )
        )

    migrate()

    cats = db.session.scalars(db.select(ExerciseCategory)).all()
    assert {(c.name, c.user_id) for c in cats} == {
        ("Core", user.id),
        ("Core", second_user.id),
    }
    assert db.session.get(ExerciseCategory, unused_id) is None
    for ex_id, owner in ((a.id, user.id), (b.id, second_user.id)):
        ex = db.session.get(ExerciseDefinition, ex_id)
        assert [c.user_id for c in ex.categories] == [owner]


def test_default_groups_assigned(app, user, migrate):
    cat_id = _global_category("Cardio")
    other_id = _global_category("Planche")
    ex = ExerciseDefinition(title="A", user_id=user.id)
    db.session.add(ex)
    db.session.flush()
    for cid in (cat_id, other_id):
        db.session.execute(
            exercise_categories.insert().values(
                exercise_definition_id=ex.id, category_id=cid
            )
        )

    migrate()

    groups = {g.name: g.id for g in db.session.scalars(db.select(CategoryGroup))}
    assert set(groups) == {"Workout-Art", "Körperteile"}
    by_name = {c.name: c for c in db.session.scalars(db.select(ExerciseCategory))}
    assert by_name["Cardio"].group_id == groups["Workout-Art"]
    assert by_name["Planche"].group_id is None
