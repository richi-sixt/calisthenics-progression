"""add user_block, report tables and user.terms_accepted_at

Revision ID: d4a8e2f1b9c3
Revises: c1c659752107
Create Date: 2026-10-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd4a8e2f1b9c3'
down_revision = 'c1c659752107'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('user_block',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('blocker_id', sa.Integer(), nullable=False),
    sa.Column('blocked_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['blocked_id'], ['user.id'], ),
    sa.ForeignKeyConstraint(['blocker_id'], ['user.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('blocker_id', 'blocked_id', name='uq_user_block_pair')
    )
    with op.batch_alter_table('user_block', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_user_block_blocker_id'), ['blocker_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_user_block_blocked_id'), ['blocked_id'], unique=False)

    op.create_table('report',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('reporter_id', sa.Integer(), nullable=False),
    sa.Column('reported_user_id', sa.Integer(), nullable=False),
    sa.Column('target_type', sa.String(length=16), nullable=False),
    sa.Column('target_id', sa.Integer(), nullable=True),
    sa.Column('reason', sa.String(length=16), nullable=False),
    sa.Column('details', sa.String(length=500), nullable=True),
    sa.Column('status', sa.String(length=16), server_default='open', nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['reported_user_id'], ['user.id'], ),
    sa.ForeignKeyConstraint(['reporter_id'], ['user.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('report', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_report_reporter_id'), ['reporter_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_report_reported_user_id'), ['reported_user_id'], unique=False)

    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('terms_accepted_at', sa.DateTime(), nullable=True))


def downgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('terms_accepted_at')

    with op.batch_alter_table('report', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_report_reported_user_id'))
        batch_op.drop_index(batch_op.f('ix_report_reporter_id'))

    op.drop_table('report')
    with op.batch_alter_table('user_block', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_user_block_blocked_id'))
        batch_op.drop_index(batch_op.f('ix_user_block_blocker_id'))

    op.drop_table('user_block')
