"""add visibility to exercises

Revision ID: 4ac56a5264ec
Revises: 3e2b7148016f
Create Date: 2026-09-14 10:05:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '4ac56a5264ec'
down_revision = '3e2b7148016f'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('exercises', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                'visibility', sa.String(length=10),
                server_default='followers', nullable=False,
            )
        )

    # Backfill: previously-public exercises stay public, previously-private
    # exercises become followers-only (the new default), per product decision.
    op.execute("UPDATE exercises SET visibility = 'public' WHERE is_public = 1")
    op.execute("UPDATE exercises SET visibility = 'followers' WHERE is_public = 0")

    with op.batch_alter_table('exercises', schema=None) as batch_op:
        batch_op.drop_column('is_public')


def downgrade():
    with op.batch_alter_table('exercises', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('is_public', sa.Boolean(), server_default='0', nullable=False)
        )

    op.execute("UPDATE exercises SET is_public = 1 WHERE visibility = 'public'")
    op.execute("UPDATE exercises SET is_public = 0 WHERE visibility != 'public'")

    with op.batch_alter_table('exercises', schema=None) as batch_op:
        batch_op.drop_column('visibility')
