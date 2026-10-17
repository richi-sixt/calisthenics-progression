"""exercises.copied_from_id (copy-on-save, import)

Marks an exercise as a copy of another user's exercise so that saving a
workout again reuses the existing copy instead of creating a duplicate.

Revision ID: d1a4b8c2e653
Revises: c9f3a1b7d452
Create Date: 2026-10-16 14:00:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "d1a4b8c2e653"
down_revision = "c9f3a1b7d452"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("exercises", schema=None) as batch_op:
        batch_op.add_column(sa.Column("copied_from_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_exercises_copied_from_id",
            "exercises",
            ["copied_from_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_index(
            "ix_exercises_copied_from_id", ["copied_from_id"], unique=False
        )


def downgrade():
    with op.batch_alter_table("exercises", schema=None) as batch_op:
        batch_op.drop_index("ix_exercises_copied_from_id")
        batch_op.drop_constraint("fk_exercises_copied_from_id", type_="foreignkey")
        batch_op.drop_column("copied_from_id")
