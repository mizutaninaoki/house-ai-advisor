"""add relation to project_members

Revision ID: 63694f32c2cb
Revises: e4b411aad92f
Create Date: 2025-05-25 16:50:19.968482

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '63694f32c2cb'
down_revision: Union[str, None] = 'e4b411aad92f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('project_members', sa.Column('relation', sa.String(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('project_members', 'relation')
    # ### end Alembic commands ###
