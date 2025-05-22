from sqlalchemy.orm import Session
from app.db import models, schemas
from typing import List, Optional

# ユーザー関連CRUD
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_firebase_uid(db: Session, firebase_uid: str):
    return db.query(models.User).filter(models.User.firebase_uid == firebase_uid).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate):
    db_user = models.User(**user.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# プロジェクト関連CRUD
def get_project(db: Session, project_id: int):
    return db.query(models.Project).filter(models.Project.id == project_id).first()

def get_projects(db: Session, user_id: Optional[int] = None, skip: int = 0, limit: int = 100):
    query = db.query(models.Project)
    if user_id:
        query = query.filter(models.Project.user_id == user_id)
    return query.offset(skip).limit(limit).all()

def create_project(db: Session, project: schemas.ProjectCreate):
    db_project = models.Project(**project.dict())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def update_project(db: Session, project_id: int, project_data: schemas.ProjectBase):
    db_project = get_project(db, project_id)
    if db_project:
        for key, value in project_data.dict().items():
            setattr(db_project, key, value)
        db.commit()
        db.refresh(db_project)
    return db_project

def delete_project(db: Session, project_id: int):
    db_project = get_project(db, project_id)
    if db_project:
        db.delete(db_project)
        db.commit()
        return True
    return False

# 会話関連CRUD
def get_conversation(db: Session, conversation_id: int):
    return db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()

def get_conversations(db: Session, project_id: Optional[int] = None, skip: int = 0, limit: int = 100):
    query = db.query(models.Conversation)
    if project_id:
        query = query.filter(models.Conversation.project_id == project_id)
    return query.offset(skip).limit(limit).all()

def get_conversations_ordered_by_timestamp(db: Session, project_id: Optional[int] = None, skip: int = 0, limit: int = 100):
    query = db.query(models.Conversation)
    if project_id:
        query = query.filter(models.Conversation.project_id == project_id)
    # タイムスタンプ（created_at）の昇順でソート
    return query.order_by(models.Conversation.created_at).offset(skip).limit(limit).all()

def create_conversation(db: Session, conversation: schemas.ConversationCreate):
    db_conversation = models.Conversation(**conversation.dict())
    db.add(db_conversation)
    db.commit()
    db.refresh(db_conversation)
    return db_conversation

# 分析結果関連CRUD
def get_analysis(db: Session, analysis_id: int):
    return db.query(models.Analysis).filter(models.Analysis.id == analysis_id).first()

def get_analysis_by_conversation(db: Session, conversation_id: int):
    return db.query(models.Analysis).filter(models.Analysis.conversation_id == conversation_id).first()

def create_analysis(db: Session, analysis: schemas.AnalysisCreate):
    db_analysis = models.Analysis(**analysis.dict())
    db.add(db_analysis)
    db.commit()
    db.refresh(db_analysis)
    return db_analysis

def update_analysis(db: Session, analysis_id: int, analysis_data: schemas.AnalysisBase):
    db_analysis = get_analysis(db, analysis_id)
    if db_analysis:
        for key, value in analysis_data.dict().items():
            setattr(db_analysis, key, value)
        db.commit()
        db.refresh(db_analysis)
    return db_analysis

# 提案関連CRUD
def get_proposal(db: Session, proposal_id: int):
    return db.query(models.Proposal).filter(models.Proposal.id == proposal_id).first()

def get_proposals(db: Session, project_id: Optional[int] = None, skip: int = 0, limit: int = 100):
    query = db.query(models.Proposal)
    if project_id:
        query = query.filter(models.Proposal.project_id == project_id)
    return query.offset(skip).limit(limit).all()

def create_proposal(db: Session, proposal: schemas.ProposalCreate):
    db_proposal = models.Proposal(**proposal.dict())
    db.add(db_proposal)
    db.commit()
    db.refresh(db_proposal)
    return db_proposal

def update_proposal(db: Session, proposal_id: int, proposal_data: dict):
    db_proposal = get_proposal(db, proposal_id)
    if db_proposal:
        for key, value in proposal_data.items():
            setattr(db_proposal, key, value)
        db.commit()
        db.refresh(db_proposal)
    return db_proposal

def delete_proposal(db: Session, proposal_id: int):
    db_proposal = get_proposal(db, proposal_id)
    if db_proposal:
        db.delete(db_proposal)
        db.commit()
        return True
    return False

# 論点関連CRUD
def get_issue(db: Session, issue_id: int):
    return db.query(models.Issue).filter(models.Issue.id == issue_id).first()

def get_issues(db: Session, project_id: Optional[int] = None, skip: int = 0, limit: int = 100):
    query = db.query(models.Issue)
    if project_id:
        query = query.filter(models.Issue.project_id == project_id)
    return query.offset(skip).limit(limit).all()

def create_issue(db: Session, issue: schemas.IssueCreate):
    db_issue = models.Issue(
        project_id=issue.project_id,
        topic=getattr(issue, 'topic', None),
        content=issue.content,
        type=issue.type,
        agreement_level=issue.agreement_level,
        classification=issue.classification
    )
    db.add(db_issue)
    db.commit()
    db.refresh(db_issue)
    return db_issue

def create_issues_batch(db: Session, issues: List[schemas.IssueCreate]):
    """複数の論点を一括で作成"""
    db_issues = []
    for issue in issues:
        db_issue = models.Issue(
            project_id=issue.project_id,
            topic=getattr(issue, 'topic', None),
            content=issue.content,
            type=issue.type,
            agreement_level=issue.agreement_level,
            classification=issue.classification
        )
        db.add(db_issue)
        db_issues.append(db_issue)
    db.commit()
    for issue in db_issues:
        db.refresh(issue)
    return db_issues

def update_issue(db: Session, issue_id: int, issue_data: schemas.IssueBase):
    db_issue = get_issue(db, issue_id)
    if db_issue:
        for key, value in issue_data.dict().items():
            setattr(db_issue, key, value)
        db.commit()
        db.refresh(db_issue)
    return db_issue

def delete_issue(db: Session, issue_id: int):
    db_issue = get_issue(db, issue_id)
    if db_issue:
        db.delete(db_issue)
        db.commit()
        return True
    return False

def delete_project_issues(db: Session, project_id: int):
    """プロジェクトに関連するすべての論点を削除"""
    issues = get_issues(db, project_id=project_id)
    for issue in issues:
        db.delete(issue)
    db.commit()
    return True 
