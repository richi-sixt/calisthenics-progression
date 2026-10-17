"""exercises.is_catalog (admin-curated app library)

Revision ID: f3c6d0e4a875
Revises: e2b5c9d3f764
Create Date: 2026-10-17 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f3c6d0e4a875'
down_revision = 'e2b5c9d3f764'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('exercises', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('is_catalog', sa.Boolean(), nullable=False, server_default=sa.false())
        )


def downgrade():
    with op.batch_alter_table('exercises', schema=None) as batch_op:
        batch_op.drop_column('is_catalog')
