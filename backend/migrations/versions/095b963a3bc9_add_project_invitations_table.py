"""add_project_invitations_table

Revision ID: 095b963a3bc9
Revises: f59c7cc35778
Create Date: 2025-06-20 20:50:32.305592

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '095b963a3bc9'
down_revision: Union[str, None] = 'f59c7cc35778'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('project_invitations',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('project_id', sa.Integer(), nullable=True),
    sa.Column('email', sa.String(), nullable=False),
    sa.Column('token', sa.String(), nullable=False),
    sa.Column('name', sa.String(), nullable=True),
    sa.Column('relation', sa.String(), nullable=True),
    sa.Column('role', sa.String(), nullable=True),
    sa.Column('is_used', sa.Boolean(), nullable=True),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_project_invitations_id'), 'project_invitations', ['id'], unique=False)
    op.create_index(op.f('ix_project_invitations_token'), 'project_invitations', ['token'], unique=True)
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_project_invitations_token'), table_name='project_invitations')
    op.drop_index(op.f('ix_project_invitations_id'), table_name='project_invitations')
    op.drop_table('project_invitations')
    # ### end Alembic commands ###
