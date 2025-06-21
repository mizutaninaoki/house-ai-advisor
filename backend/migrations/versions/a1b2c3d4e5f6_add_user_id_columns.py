"""add_user_id_columns

Revision ID: add_user_id_columns
Revises: 095b963a3bc9
Create Date: 2025-06-21 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '095b963a3bc9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # issues に user_id カラム追加
    op.add_column('issues', sa.Column('user_id', sa.Integer(), nullable=True))
    op.create_foreign_key(None, 'issues', 'users', ['user_id'], ['id'], ondelete='CASCADE')
    # proposals に user_id カラム追加
    op.add_column('proposals', sa.Column('user_id', sa.Integer(), nullable=True))
    op.create_foreign_key(None, 'proposals', 'users', ['user_id'], ['id'], ondelete='CASCADE')
    # conversations に user_id カラム追加
    op.add_column('conversations', sa.Column('user_id', sa.Integer(), nullable=True))
    op.create_foreign_key(None, 'conversations', 'users', ['user_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    # conversations から user_id カラム削除
    op.drop_constraint(None, 'conversations', type_='foreignkey')  # type: ignore[arg-type]
    op.drop_column('conversations', 'user_id')
    # proposals から user_id カラム削除
    op.drop_constraint(None, 'proposals', type_='foreignkey')  # type: ignore[arg-type]
    op.drop_column('proposals', 'user_id')
    # issues から user_id カラム削除
    op.drop_constraint(None, 'issues', type_='foreignkey')  # type: ignore[arg-type]
    op.drop_column('issues', 'user_id') 
