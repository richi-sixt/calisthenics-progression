"""add thumbnail to exercises

Revision ID: f6c0d4b8e321
Revises: e5b9c3a7d210
Create Date: 2026-10-05 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f6c0d4b8e321'
down_revision = 'e5b9c3a7d210'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('exercises', schema=None) as batch_op:
        batch_op.add_column(sa.Column('thumbnail', sa.String(length=64), nullable=True))


def downgrade():
    with op.batch_alter_table('exercises', schema=None) as batch_op:
        batch_op.drop_column('thumbnail')
