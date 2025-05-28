"""add_proposal_points_table

Revision ID: 8672f5a24148
Revises: 876981a9cefc
Create Date: 2025-05-25 10:24:43.065553

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8672f5a24148'
down_revision: Union[str, None] = '876981a9cefc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'proposal_points',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('proposal_id', sa.Integer(), sa.ForeignKey('proposals.id', ondelete='CASCADE'), nullable=False),
        sa.Column('point_type', sa.String(), nullable=False),  # 'merit', 'demerit', 'cost', 'effort' など
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()'), nullable=True),
    )
    op.create_index(op.f('ix_proposal_points_id'), 'proposal_points', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_proposal_points_id'), table_name='proposal_points')
    op.drop_table('proposal_points')
