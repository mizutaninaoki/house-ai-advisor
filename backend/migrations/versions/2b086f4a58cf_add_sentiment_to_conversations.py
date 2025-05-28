"""add_sentiment_to_conversations

Revision ID: 2b086f4a58cf
Revises: 353f51564609
Create Date: 2025-05-20 22:48:05.074128

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2b086f4a58cf'
down_revision: Union[str, None] = '353f51564609'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('conversations', sa.Column('sentiment', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('conversations', 'sentiment')
