from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

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
    hashed_password: Optional[str] = None

# 追加: relation を持つ UserCreate
class UserWithRelationCreate(UserBase):
    relation: Optional[str] = None

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
    status: Optional[str] = None

class ProjectCreate(ProjectBase):
    user_id: int
    members: List[UserWithRelationCreate] | None = None

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
    issues: List["Issue"] = []
    members: List["ProjectMember"] = []

# 会話スキーマ
class ConversationBase(BaseSchema):
    project_id: int
    content: Optional[str] = None
    speaker: Optional[str] = None
    sentiment: Optional[str] = None  # 感情分析結果（positive, neutral, negative）

class ConversationCreate(ConversationBase):
    pass

class Conversation(ConversationBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ConversationDetail(Conversation):
    analysis: Optional["Analysis"] = None

# 会話メッセージ用のスキーマ
class MessageBase(BaseSchema):
    content: str
    speaker: str
    sentiment: Optional[str] = "neutral"

class MessageCreate(MessageBase):
    project_id: int
    
class Message(MessageBase):
    id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True

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
    is_favorite: bool = False
    support_rate: float = 0.0

class ProposalCreate(ProposalBase):
    pass

class Proposal(ProposalBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# 論点のスキーマ
class IssueType(str, Enum):
    positive = "positive"
    negative = "negative"
    neutral = "neutral"
    requirement = "requirement"

class AgreementLevel(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"

class IssueClassification(str, Enum):
    agreed = "agreed"         # 合意済み（緑）
    discussing = "discussing" # 協議中（黄）
    disagreed = "disagreed"   # 意見相違（赤）

class IssueBase(BaseModel):
    topic: Optional[str] = None  # 論点の見出し
    content: str
    type: IssueType
    agreement_level: Optional[AgreementLevel] = None
    classification: IssueClassification = IssueClassification.discussing

class IssueCreate(IssueBase):
    project_id: int

class Issue(IssueBase):
    id: int
    project_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
        from_attributes = True

# 提案ポイント（メリット・デメリット等）スキーマ
class ProposalPointBase(BaseSchema):
    proposal_id: int
    type: str  # 'merit', 'demerit', 'cost', 'effort' など
    content: str

class ProposalPointCreate(ProposalPointBase):
    pass

class ProposalPoint(ProposalPointBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# 協議書（Agreement）スキーマ
class AgreementBase(BaseSchema):
    project_id: int
    proposal_id: int | None = None
    title: Optional[str] = None
    content: str
    status: str = "draft"
    is_signed: bool = False

class AgreementCreate(AgreementBase):
    pass

class AgreementUpdate(BaseSchema):
    title: Optional[str] = None
    content: str | None = None
    status: str | None = None
    is_signed: bool | None = None

class Agreement(AgreementBase):
    id: int
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True

# 署名（Signature）スキーマ
class SignatureBase(BaseSchema):
    agreement_id: int
    user_id: int
    method: str  # 'pin' or 'text'
    value: str

class SignatureCreate(SignatureBase):
    pass

class Signature(SignatureBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# プロジェクトメンバースキーマ
class ProjectMemberBase(BaseSchema):
    project_id: int
    user_id: int
    role: str = "member"
    relation: Optional[str] = None  # 続柄
    name: Optional[str] = None  # 氏名

class ProjectMemberCreate(ProjectMemberBase):
    pass

class ProjectMember(ProjectMemberBase):
    id: int
    class Config:
        from_attributes = True

# 循環参照を解決するための更新
ProjectDetail.update_forward_refs()
ConversationDetail.update_forward_refs() 
