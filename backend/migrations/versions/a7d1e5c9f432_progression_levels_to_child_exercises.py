"""progression levels become child exercises (exercise_progression)

Creates the exercise_progression link table and converts every existing
progression level into a real exercise linked to its parent:

* a level whose name matches one of the owner's pre-existing, non-archived
  exercises with the same counting type reuses that exercise (unless this would
  create a cycle); otherwise a new exercise is created (same owner, counting
  type, visibility and categories as the parent). Title clashes get the
  parent's title appended: "Standard (Push-ups)".
* logged workout exercises whose sets name a level (Set.progression) are moved
  to the child exercise, so per-exercise statistics keep working. An exercise
  instance mixing several levels is split into one instance per level.
* progression_levels rows and Set.progression strings are left untouched
  (older app versions still read them); a later migration can drop them.

Only plain SQLAlchemy Core is used so the same code runs on SQLite and
PostgreSQL. The downgrade drops the link table but does not undo the data
conversion.

Revision ID: a7d1e5c9f432
Revises: f6c0d4b8e321
Create Date: 2026-10-06 12:00:00.000000

"""
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a7d1e5c9f432'
down_revision = 'f6c0d4b8e321'
branch_labels = None
depends_on = None

TITLE_MAX = 80


def upgrade():
    op.create_table('exercise_progression',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('parent_id', sa.Integer(), nullable=False),
    sa.Column('child_id', sa.Integer(), nullable=False),
    sa.Column('step_order', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['child_id'], ['exercises.id'], ),
    sa.ForeignKeyConstraint(['parent_id'], ['exercises.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('parent_id', 'child_id', name='uq_exercise_progression')
    )
    with op.batch_alter_table('exercise_progression', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_exercise_progression_parent_id'), ['parent_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_exercise_progression_child_id'), ['child_id'], unique=False)

    migrate_levels(op.get_bind())


def downgrade():
    with op.batch_alter_table('exercise_progression', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_exercise_progression_child_id'))
        batch_op.drop_index(batch_op.f('ix_exercise_progression_parent_id'))
    op.drop_table('exercise_progression')


def _unique_title(wanted, parent_title, taken):
    """`wanted`, else "wanted (parent)", else with a counter; never over 80 chars."""
    def fit(base, suffix=""):
        return base[:TITLE_MAX - len(suffix)] + suffix

    candidates = [fit(wanted), fit(wanted, f" ({parent_title})"[:30])]
    for candidate in candidates:
        if candidate not in taken:
            return candidate
    counter = 2
    while True:
        candidate = fit(wanted, f" ({parent_title}) {counter}"[:34])
        if candidate not in taken:
            return candidate
        counter += 1


def _reaches(bind, links, start_id, target_id):
    """Whether `target_id` is reachable from `start_id` via progression links."""
    seen, frontier = set(), {start_id}
    while frontier:
        if target_id in frontier:
            return True
        rows = bind.execute(
            sa.select(links.c.child_id).where(links.c.parent_id.in_(frontier))
        ).scalars().all()
        frontier = set(rows) - seen
        seen |= frontier
    return False


def migrate_levels(bind):
    """Convert progression_levels rows into child exercises and re-link sets."""
    md = sa.MetaData()
    exercises = sa.Table('exercises', md, autoload_with=bind)
    levels = sa.Table('progression_levels', md, autoload_with=bind)
    links = sa.Table('exercise_progression', md, autoload_with=bind)
    instances = sa.Table('exercise', md, autoload_with=bind)
    sets = sa.Table('exercise_sets', md, autoload_with=bind)
    cats = sa.Table('exercise_categories', md, autoload_with=bind)

    parent_ids = bind.execute(
        sa.select(levels.c.exercise_definition_id).distinct().order_by(
            levels.c.exercise_definition_id
        )
    ).scalars().all()
    if not parent_ids:
        return

    # Only exercises that existed before this migration may be reused as steps;
    # otherwise two parents with a generic level name ("Standard") would end up
    # sharing the child created for the first one.
    preexisting = set(bind.execute(sa.select(exercises.c.id)).scalars().all())
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    touched_workouts = set()

    for parent_id in parent_ids:
        parent = bind.execute(
            sa.select(exercises).where(exercises.c.id == parent_id)
        ).mappings().first()
        if parent is None:
            continue

        owned = bind.execute(
            sa.select(
                exercises.c.id, exercises.c.title,
                exercises.c.counting_type, exercises.c.archived,
            ).where(exercises.c.user_id == parent['user_id'])
        ).all()
        by_title = {row.title: row for row in owned}
        taken = set(by_title)
        parent_categories = bind.execute(
            sa.select(cats.c.category_id).where(
                cats.c.exercise_definition_id == parent_id
            )
        ).scalars().all()

        level_rows = bind.execute(
            sa.select(levels.c.name).where(
                levels.c.exercise_definition_id == parent_id
            ).order_by(levels.c.level_order, levels.c.id)
        ).scalars().all()

        name_to_child = {}
        linked = []
        for raw_name in level_rows:
            name = (raw_name or '').strip()
            if not name:
                continue
            if name in name_to_child:
                continue

            existing = by_title.get(name)
            child_id = None
            if (
                existing is not None
                and existing.id in preexisting
                and existing.id != parent_id
                and not existing.archived
                and existing.counting_type == parent['counting_type']
                and not _reaches(bind, links, existing.id, parent_id)
            ):
                child_id = existing.id
            if child_id is None:
                title = _unique_title(name, parent['title'], taken)
                taken.add(title)
                child_id = bind.execute(
                    sa.insert(exercises).values(
                        title=title,
                        description=None,
                        counting_type=parent['counting_type'],
                        date_created=now,
                        user_id=parent['user_id'],
                        archived=bool(parent['archived']),
                        visibility=parent['visibility'],
                    )
                ).inserted_primary_key[0]
                for category_id in parent_categories:
                    bind.execute(
                        sa.insert(cats).values(
                            exercise_definition_id=child_id, category_id=category_id
                        )
                    )
            name_to_child[name] = child_id
            if child_id not in linked:
                linked.append(child_id)
                bind.execute(
                    sa.insert(links).values(
                        parent_id=parent_id,
                        child_id=child_id,
                        step_order=len(linked),
                    )
                )

        if not name_to_child:
            continue

        # Move logged sets that name a level onto the child exercise.
        parent_instances = bind.execute(
            sa.select(instances.c.id, instances.c.workout_id, instances.c.exercise_order)
            .where(instances.c.exercise_definition_id == parent_id)
            .order_by(instances.c.workout_id, instances.c.exercise_order, instances.c.id)
        ).all()
        for inst in parent_instances:
            set_rows = bind.execute(
                sa.select(sets.c.id, sets.c.progression)
                .where(sets.c.exercise_id == inst.id)
                .order_by(sets.c.set_order, sets.c.id)
            ).all()
            groups = {}
            for set_row in set_rows:
                key = name_to_child.get((set_row.progression or '').strip())
                groups.setdefault(key, []).append(set_row.id)
            child_groups = [k for k in groups if k is not None]
            if not child_groups:
                continue

            stays = None in groups
            moved = list(child_groups)
            if not stays:
                # Every set belongs to a level: the original instance (with its
                # notes) becomes the first child's instance.
                first = moved.pop(0)
                bind.execute(
                    sa.update(instances).where(instances.c.id == inst.id)
                    .values(exercise_definition_id=first)
                )
                _renumber_sets(bind, sets, inst.id, groups[first])
            else:
                _renumber_sets(bind, sets, inst.id, groups[None])
            for child_id in moved:
                new_id = bind.execute(
                    sa.insert(instances).values(
                        exercise_order=inst.exercise_order,
                        workout_id=inst.workout_id,
                        exercise_definition_id=child_id,
                        notes=None,
                    )
                ).inserted_primary_key[0]
                bind.execute(
                    sa.update(sets).where(sets.c.id.in_(groups[child_id]))
                    .values(exercise_id=new_id)
                )
                _renumber_sets(bind, sets, new_id, groups[child_id])
            if moved:
                touched_workouts.add(inst.workout_id)

    # Split instances share their original's exercise_order; make it contiguous
    # again (ties resolve by id, i.e. siblings stay right after the original).
    for workout_id in touched_workouts:
        ids = bind.execute(
            sa.select(instances.c.id).where(instances.c.workout_id == workout_id)
            .order_by(instances.c.exercise_order, instances.c.id)
        ).scalars().all()
        for order, instance_id in enumerate(ids, start=1):
            bind.execute(
                sa.update(instances).where(instances.c.id == instance_id)
                .values(exercise_order=order)
            )


def _renumber_sets(bind, sets, instance_id, ordered_set_ids):
    """Give the sets of one instance contiguous set_order values 1..n."""
    for order, set_id in enumerate(ordered_set_ids, start=1):
        bind.execute(
            sa.update(sets).where(sets.c.id == set_id).values(set_order=order)
        )
