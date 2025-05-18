from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# ベースモデル
class BaseSchema(BaseModel):
    class Config:
        orm_mode = True

# ユーザースキーマ
class UserBase(BaseSchema):
    email: str
    name: str
    firebase_uid: Optional[str] = None

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# プロジェクトスキーマ
class ProjectBase(BaseSchema):
    title: str
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    user_id: int

class Project(ProjectBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ProjectDetail(Project):
    conversations: List["Conversation"] = []
    proposals: List["Proposal"] = []

# 会話スキーマ
class ConversationBase(BaseSchema):
    project_id: int
    audio_url: Optional[str] = None
    transcript: Optional[str] = None

class ConversationCreate(ConversationBase):
    pass

class Conversation(ConversationBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ConversationDetail(Conversation):
    analysis: Optional["Analysis"] = None

# 分析スキーマ
class AnalysisBase(BaseSchema):
    conversation_id: int
    emotion: Optional[str] = None
    keywords: Optional[str] = None
    main_points: Optional[str] = None

class AnalysisCreate(AnalysisBase):
    pass

class Analysis(AnalysisBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# 提案スキーマ
class ProposalBase(BaseSchema):
    project_id: int
    title: str
    content: str
    image_url: Optional[str] = None
    is_favorite: bool = False

class ProposalCreate(ProposalBase):
    pass

class Proposal(ProposalBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# 循環参照を解決するための更新
ProjectDetail.update_forward_refs()
ConversationDetail.update_forward_refs() 
