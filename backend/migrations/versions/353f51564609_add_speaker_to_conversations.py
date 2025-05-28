"""add_speaker_to_conversations

Revision ID: 353f51564609
Revises: b38d43968e28
Create Date: 2025-05-20 22:20:56.937427

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '353f51564609'
down_revision: Union[str, None] = 'b38d43968e28'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('conversations', sa.Column('speaker', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('conversations', 'speaker')
