from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

# ベースモデル
class BaseSchema(BaseModel):
    class Config:
        from_attributes = True

# ユーザースキーマ
class UserBase(BaseSchema):
    email: str
    name: str
    firebase_uid: Optional[str] = None

class UserCreate(UserBase):
    hashed_password: Optional[str] = None

# 追加: relation と role を持つ UserCreate
class UserWithRelationCreate(UserBase):
    relation: Optional[str] = None
    role: Optional[str] = "member"

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
    user_id: Optional[int] = None
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
    user_id: Optional[int] = None

class Message(MessageBase):
    id: int
    user_id: Optional[int] = None
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
    user_id: Optional[int] = None

class Proposal(ProposalBase):
    id: int
    user_id: Optional[int] = None
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
    user_id: Optional[int] = None

class Issue(IssueBase):
    id: int
    project_id: int
    user_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
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
    signed_at: Optional[datetime] = None  # 署名日時（created_atと同じ値）
    status: Optional[str] = "signed"      # 署名ステータス
    user_name: Optional[str] = None       # ユーザー名（JOINで取得）

    class Config:
        from_attributes = True

# プロジェクトメンバースキーマ
class ProjectMemberBase(BaseSchema):
    project_id: int
    user_id: int
    role: str = "member"
    relation: Optional[str] = None  # 続柄
    name: Optional[str] = None  # 氏名
    email: Optional[str] = None  # メールアドレス

class ProjectMemberCreate(ProjectMemberBase):
    pass

class ProjectMember(ProjectMemberBase):
    id: int
    class Config:
        from_attributes = True

# 循環参照を解決するための更新
ProjectDetail.update_forward_refs()
ConversationDetail.update_forward_refs()

class EstateBase(BaseSchema):
    project_id: int
    name: str
    address: str
    property_tax_value: Optional[float] = None
    type: Optional[str] = None  # str型で必須ではなく任意

class EstateCreate(EstateBase):
    pass

class Estate(EstateBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True 

# プロジェクト招待スキーマ
class ProjectInvitationBase(BaseSchema):
    project_id: int
    email: str
    name: str
    relation: str
    role: str = "member"

class ProjectInvitationCreate(ProjectInvitationBase):
    expires_hours: int = 72

class ProjectInvitation(ProjectInvitationBase):
    id: int
    token: str
    is_used: bool
    expires_at: datetime
    used_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class InvitationAcceptResponse(BaseSchema):
    project_id: int
    project_title: str
    invitee_email: str
    invitee_name: str
    relation: str
    token: str 

# AI相談員チャット用スキーマ
class AiChatRequest(BaseSchema):
    messages: list[dict]
    user_message: str
    project_id: int | None = None
    user_id: int | None = None

class AiChatResponse(BaseSchema):
    reply: str
    project_id: int | None = None
    user_id: int | None = None 
