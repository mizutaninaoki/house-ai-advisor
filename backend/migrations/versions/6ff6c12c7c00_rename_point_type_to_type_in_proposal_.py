"""rename point_type to type in proposal_points

Revision ID: 6ff6c12c7c00
Revises: 8672f5a24148
Create Date: 2025-05-25 11:26:04.349832

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6ff6c12c7c00'
down_revision: Union[str, None] = '8672f5a24148'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('proposal_points', 'point_type', new_column_name='type')


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('proposal_points', 'type', new_column_name='point_type')
