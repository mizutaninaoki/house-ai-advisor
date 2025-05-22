"""
transcriptフィールドをcontentに変更するマイグレーション
"""

from alembic import op
import sqlalchemy as sa

# Upgradeの処理
def upgrade():
    # transcriptカラムをcontentにリネーム
    op.alter_column(
        'conversations', 
        'transcript', 
        new_column_name='content',
        existing_type=sa.Text(),
        nullable=False
    )

# Downgradeの処理
def downgrade():
    # contentカラムをtranscriptに戻す
    op.alter_column(
        'conversations', 
        'content', 
        new_column_name='transcript',
        existing_type=sa.Text(),
        nullable=False
    ) 
