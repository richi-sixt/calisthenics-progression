"""add visibility to workout

Revision ID: 3e2b7148016f
Revises: f23d9ab2f9ed
Create Date: 2026-09-14 10:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '3e2b7148016f'
down_revision = 'f23d9ab2f9ed'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('workout', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                'visibility', sa.String(length=10),
                server_default='followers', nullable=False,
            )
        )

    # Backfill: previously-public workouts stay public, previously-private
    # workouts become followers-only (the new default), per product decision.
    op.execute("UPDATE workout SET visibility = 'public' WHERE is_public = true")
    op.execute("UPDATE workout SET visibility = 'followers' WHERE is_public = false")

    with op.batch_alter_table('workout', schema=None) as batch_op:
        batch_op.drop_column('is_public')


def downgrade():
    with op.batch_alter_table('workout', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('is_public', sa.Boolean(), server_default='0', nullable=False)
        )

    op.execute("UPDATE workout SET is_public = true WHERE visibility = 'public'")
    op.execute("UPDATE workout SET is_public = false WHERE visibility != 'public'")

    with op.batch_alter_table('workout', schema=None) as batch_op:
        batch_op.drop_column('visibility')
