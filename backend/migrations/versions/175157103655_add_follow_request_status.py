"""add follow request status

Revision ID: 175157103655
Revises: 4ac56a5264ec
Create Date: 2026-09-16 09:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '175157103655'
down_revision = '4ac56a5264ec'
branch_labels = None
depends_on = None


def upgrade():
    # SQLite can't add a primary key to an existing table via ALTER, so the
    # plain (follower_id, followed_id) association table is replaced by a
    # proper table with an id/status/created_at, via create-copy-drop-rename.
    op.create_table(
        'followers_new',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('follower_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=False),
        sa.Column('followed_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=False),
        sa.Column('status', sa.String(length=10), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('follower_id', 'followed_id', name='uq_follow_pair'),
    )

    # Existing follow relationships are grandfathered in as accepted, matching
    # today's instant-follow behavior -- nobody's current followers disappear
    # or need re-approval.
    op.execute(
        "INSERT INTO followers_new (follower_id, followed_id, status, created_at) "
        "SELECT follower_id, followed_id, 'accepted', CURRENT_TIMESTAMP FROM followers"
    )

    op.drop_table('followers')
    op.rename_table('followers_new', 'followers')


def downgrade():
    op.create_table(
        'followers_old',
        sa.Column('follower_id', sa.Integer(), sa.ForeignKey('user.id')),
        sa.Column('followed_id', sa.Integer(), sa.ForeignKey('user.id')),
    )
    op.execute(
        "INSERT INTO followers_old (follower_id, followed_id) "
        "SELECT follower_id, followed_id FROM followers"
    )
    op.drop_table('followers')
    op.rename_table('followers_old', 'followers')
