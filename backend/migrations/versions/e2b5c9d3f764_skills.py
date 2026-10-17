"""skills and skill exercises

Revision ID: e2b5c9d3f764
Revises: d1a4b8c2e653
Create Date: 2026-10-17 09:00:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "e2b5c9d3f764"
down_revision = "d1a4b8c2e653"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "skill",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=80), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("date_created", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "title", name="uq_skill_user_title"),
    )
    op.create_index("ix_skill_user_id", "skill", ["user_id"], unique=False)

    op.create_table(
        "skill_exercise",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("skill_id", sa.Integer(), nullable=False),
        sa.Column("exercise_id", sa.Integer(), nullable=False),
        sa.Column("step_order", sa.Integer(), nullable=False),
        sa.Column("target_value", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["skill_id"], ["skill.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("skill_id", "exercise_id", name="uq_skill_exercise"),
    )
    op.create_index(
        "ix_skill_exercise_skill_id", "skill_exercise", ["skill_id"], unique=False
    )
    op.create_index(
        "ix_skill_exercise_exercise_id", "skill_exercise", ["exercise_id"], unique=False
    )


def downgrade():
    op.drop_index("ix_skill_exercise_exercise_id", table_name="skill_exercise")
    op.drop_index("ix_skill_exercise_skill_id", table_name="skill_exercise")
    op.drop_table("skill_exercise")
    op.drop_index("ix_skill_user_id", table_name="skill")
    op.drop_table("skill")
