"""per-user exercise categories and category groups

Categories used to be global (shared and editable by everyone). Each category
now belongs to one user and can be assigned to one of that user's category
groups.

Data migration:

* every global category is cloned once per user whose exercises use it; the
  exercise <-> category links are re-pointed to the clone, then the global
  rows are deleted (unused global categories simply disappear)
* every user that ends up with categories gets the default groups
  "Workout-Art" and "Körperteile"; well-known seed names are assigned to them,
  everything else stays without a group

Only plain SQLAlchemy Core is used so the same code runs on SQLite and
PostgreSQL. The downgrade merges per-user categories with the same name back
into global ones (group information is dropped).

Revision ID: c9f3a1b7d452
Revises: b8e2f4a6c1d9
Create Date: 2026-10-16 10:00:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "c9f3a1b7d452"
down_revision = "b8e2f4a6c1d9"
branch_labels = None
depends_on = None

WORKOUT_TYPE = "Workout-Art"
BODY_PART = "Körperteile"
GROUP_FOR_NAME = {
    "Cardio": WORKOUT_TYPE,
    "Flexibility": WORKOUT_TYPE,
    "Mobility": WORKOUT_TYPE,
    "Warm-Up": WORKOUT_TYPE,
    "Workout": WORKOUT_TYPE,
    "Core": BODY_PART,
    "Legs": BODY_PART,
    "Lower Body": BODY_PART,
    "Upper Body": BODY_PART,
    "Back": BODY_PART,
    "Chest": BODY_PART,
    "Shoulders": BODY_PART,
    "Arms": BODY_PART,
}


def upgrade():
    op.create_table(
        "category_group",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "name", name="uq_category_group_user_name"),
    )

    with op.batch_alter_table("exercise_category", schema=None) as batch_op:
        batch_op.drop_index("ix_exercise_category_name")
        batch_op.add_column(sa.Column("user_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("group_id", sa.Integer(), nullable=True))

    migrate_categories(op.get_bind())

    with op.batch_alter_table("exercise_category", schema=None) as batch_op:
        batch_op.alter_column("user_id", existing_type=sa.Integer(), nullable=False)
        batch_op.create_foreign_key(
            "fk_exercise_category_user_id",
            "user",
            ["user_id"],
            ["id"],
            ondelete="CASCADE",
        )
        batch_op.create_foreign_key(
            "fk_exercise_category_group_id",
            "category_group",
            ["group_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_index(
            "ix_exercise_category_group_id", ["group_id"], unique=False
        )
        batch_op.create_unique_constraint(
            "uq_exercise_category_user_name", ["user_id", "name"]
        )


def downgrade():
    bind = op.get_bind()
    md = sa.MetaData()
    categories = sa.Table("exercise_category", md, autoload_with=bind)
    links = sa.Table("exercise_categories", md, autoload_with=bind)

    # Merge categories with the same name into the one with the lowest id
    keep = {}
    for row in bind.execute(
        sa.select(categories.c.id, categories.c.name).order_by(categories.c.id)
    ):
        cat_id = keep.setdefault(row.name, row.id)
        if cat_id != row.id:
            _move_links(bind, links, row.id, cat_id)
            bind.execute(sa.delete(categories).where(categories.c.id == row.id))

    with op.batch_alter_table("exercise_category", schema=None) as batch_op:
        batch_op.drop_constraint("uq_exercise_category_user_name", type_="unique")
        batch_op.drop_index("ix_exercise_category_group_id")
        batch_op.drop_constraint("fk_exercise_category_group_id", type_="foreignkey")
        batch_op.drop_constraint("fk_exercise_category_user_id", type_="foreignkey")
        batch_op.drop_column("group_id")
        batch_op.drop_column("user_id")
        batch_op.create_index("ix_exercise_category_name", ["name"], unique=True)

    op.drop_table("category_group")


def _move_links(bind, links, from_id, to_id):
    """Re-point exercise links from one category to another (skipping dupes)."""
    already = set(
        bind.execute(
            sa.select(links.c.exercise_definition_id).where(
                links.c.category_id == to_id
            )
        )
        .scalars()
        .all()
    )
    for exercise_id in (
        bind.execute(
            sa.select(links.c.exercise_definition_id).where(
                links.c.category_id == from_id
            )
        )
        .scalars()
        .all()
    ):
        if exercise_id in already:
            bind.execute(
                sa.delete(links).where(
                    (links.c.category_id == from_id)
                    & (links.c.exercise_definition_id == exercise_id)
                )
            )
        else:
            bind.execute(
                sa.update(links)
                .where(
                    (links.c.category_id == from_id)
                    & (links.c.exercise_definition_id == exercise_id)
                )
                .values(category_id=to_id)
            )


def migrate_categories(bind):
    """Clone global categories per user, re-link exercises, create groups."""
    md = sa.MetaData()
    categories = sa.Table("exercise_category", md, autoload_with=bind)
    links = sa.Table("exercise_categories", md, autoload_with=bind)
    exercises = sa.Table("exercises", md, autoload_with=bind)
    groups = sa.Table("category_group", md, autoload_with=bind)

    global_cats = bind.execute(
        sa.select(categories.c.id, categories.c.name).where(
            categories.c.user_id.is_(None)
        )
    ).all()

    for cat in global_cats:
        # (exercise id, owner id) for every exercise using this category
        usage = bind.execute(
            sa.select(links.c.exercise_definition_id, exercises.c.user_id)
            .join(exercises, exercises.c.id == links.c.exercise_definition_id)
            .where(links.c.category_id == cat.id)
        ).all()
        clone_for_owner = {}
        for exercise_id, owner_id in usage:
            if owner_id not in clone_for_owner:
                result = bind.execute(
                    sa.insert(categories).values(name=cat.name, user_id=owner_id)
                )
                clone_for_owner[owner_id] = result.inserted_primary_key[0]
            bind.execute(
                sa.update(links)
                .where(
                    (links.c.category_id == cat.id)
                    & (links.c.exercise_definition_id == exercise_id)
                )
                .values(category_id=clone_for_owner[owner_id])
            )
        bind.execute(sa.delete(links).where(links.c.category_id == cat.id))
        bind.execute(sa.delete(categories).where(categories.c.id == cat.id))

    # Default groups for every user that owns categories
    owner_ids = (
        bind.execute(
            sa.select(categories.c.user_id).distinct().order_by(categories.c.user_id)
        )
        .scalars()
        .all()
    )
    for owner_id in owner_ids:
        group_ids = {}
        for order, name in enumerate((WORKOUT_TYPE, BODY_PART)):
            result = bind.execute(
                sa.insert(groups).values(user_id=owner_id, name=name, sort_order=order)
            )
            group_ids[name] = result.inserted_primary_key[0]
        for name, group_name in GROUP_FOR_NAME.items():
            bind.execute(
                sa.update(categories)
                .where((categories.c.user_id == owner_id) & (categories.c.name == name))
                .values(group_id=group_ids[group_name])
            )
