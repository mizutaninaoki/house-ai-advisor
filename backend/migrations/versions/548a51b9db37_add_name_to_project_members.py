"""add name to project_members

Revision ID: 548a51b9db37
Revises: 92cca29726a9
Create Date: 2025-05-25 20:41:38.170445

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '548a51b9db37'
down_revision: Union[str, None] = '92cca29726a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('project_members', sa.Column('name', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('project_members', 'name')
