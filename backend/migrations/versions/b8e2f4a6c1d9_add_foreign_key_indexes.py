"""add indexes on foreign keys

Postgres does not index foreign key columns automatically; these back the
hot list queries (workouts per user, exercises per workout, sets per exercise).

Revision ID: b8e2f4a6c1d9
Revises: a7d1e5c9f432
Create Date: 2026-10-09 16:00:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'b8e2f4a6c1d9'
down_revision = 'a7d1e5c9f432'
branch_labels = None
depends_on = None

INDEXES = [
    ('ix_workout_user_id', 'workout', 'user_id'),
    ('ix_exercises_user_id', 'exercises', 'user_id'),
    ('ix_exercise_workout_id', 'exercise', 'workout_id'),
    ('ix_exercise_exercise_definition_id', 'exercise', 'exercise_definition_id'),
    ('ix_exercise_sets_exercise_id', 'exercise_sets', 'exercise_id'),
]


def upgrade():
    for name, table, column in INDEXES:
        op.create_index(name, table, [column], unique=False)


def downgrade():
    for name, table, _ in reversed(INDEXES):
        op.drop_index(name, table_name=table)
