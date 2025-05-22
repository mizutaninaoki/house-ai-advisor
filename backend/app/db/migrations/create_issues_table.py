import sqlalchemy as sa
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from alembic import op

# 論点タイプと合意レベルの列挙型のテキスト表現
issue_types = ['positive', 'negative', 'neutral', 'requirement']
agreement_levels = ['high', 'medium', 'low']

# Upgradeの処理
def upgrade():
    # 論点テーブルの作成
    op.create_table(
        'issues',
        Column('id', Integer, primary_key=True, index=True),
        Column('project_id', Integer, ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        Column('content', Text, nullable=False),
        Column('type', Enum(*issue_types, name='issuetype'), nullable=False),
        Column('agreement_level', Enum(*agreement_levels, name='agreementlevel'), nullable=True),
        Column('created_at', DateTime(timezone=True), server_default=func.now()),
        Column('updated_at', DateTime(timezone=True), onupdate=func.now()),
    )
    
    # インデックス作成
    op.create_index('ix_issues_project_id', 'issues', ['project_id'])
    op.create_index('ix_issues_type', 'issues', ['type'])

# Downgradeの処理
def downgrade():
    # テーブルの削除
    op.drop_table('issues')
    # Enumタイプの削除
    op.execute('DROP TYPE issuetype')
    op.execute('DROP TYPE agreementlevel') 
