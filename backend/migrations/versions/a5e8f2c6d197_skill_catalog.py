"""skill.is_catalog and skill.copied_from_id (app-library skills)

Revision ID: a5e8f2c6d197
Revises: f3c6d0e4a875
Create Date: 2026-10-17 15:00:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "a5e8f2c6d197"
down_revision = "f3c6d0e4a875"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("skill", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "is_catalog", sa.Boolean(), nullable=False, server_default=sa.false()
            )
        )
        batch_op.add_column(sa.Column("copied_from_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_skill_copied_from_id",
            "skill",
            ["copied_from_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_index(
            "ix_skill_copied_from_id", ["copied_from_id"], unique=False
        )


def downgrade():
    with op.batch_alter_table("skill", schema=None) as batch_op:
        batch_op.drop_index("ix_skill_copied_from_id")
        batch_op.drop_constraint("fk_skill_copied_from_id", type_="foreignkey")
        batch_op.drop_column("copied_from_id")
        batch_op.drop_column("is_catalog")
