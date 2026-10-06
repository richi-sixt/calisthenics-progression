"""add distance_km to exercise_sets (km counting type)

Revision ID: e5b9c3a7d210
Revises: d4a8e2f1b9c3
Create Date: 2026-10-05 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e5b9c3a7d210'
down_revision = 'd4a8e2f1b9c3'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('exercise_sets', schema=None) as batch_op:
        batch_op.add_column(sa.Column('distance_km', sa.Float(), nullable=True))


def downgrade():
    with op.batch_alter_table('exercise_sets', schema=None) as batch_op:
        batch_op.drop_column('distance_km')
