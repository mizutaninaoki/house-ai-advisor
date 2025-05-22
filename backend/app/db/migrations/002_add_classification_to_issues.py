from alembic import op
import sqlalchemy as sa

# Enum定義
issue_classification_enum = sa.Enum('agreed', 'discussing', 'disagreed', name='issueclassification')

def upgrade():
    # Enum型を作成
    issue_classification_enum.create(op.get_bind(), checkfirst=True)
    # カラム追加（デフォルトは 'discussing'）
    op.add_column('issues', sa.Column('classification', issue_classification_enum, nullable=False, server_default='discussing'))

def downgrade():
    op.drop_column('issues', 'classification')
    issue_classification_enum.drop(op.get_bind(), checkfirst=True) 
