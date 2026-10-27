"""add counting_type override to workout exercise

Revision ID: e7a3c1d9b5f2
Revises: a5e8f2c6d197
Create Date: 2026-10-24 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e7a3c1d9b5f2'
down_revision = 'a5e8f2c6d197'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('exercise', schema=None) as batch_op:
        batch_op.add_column(sa.Column('counting_type', sa.String(length=10), nullable=True))


def downgrade():
    with op.batch_alter_table('exercise', schema=None) as batch_op:
        batch_op.drop_column('counting_type')
