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
