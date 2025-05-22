from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Enum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from .session import Base

# 論点タイプの列挙型
class IssueType(str, enum.Enum):
    positive = "positive"
    negative = "negative"
    neutral = "neutral"
    requirement = "requirement"

# 合意レベルの列挙型
class AgreementLevel(str, enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"

# 論点分類の列挙型
class IssueClassification(str, enum.Enum):
    agreed = "agreed"         # 合意済み（緑）
    discussing = "discussing" # 協議中（黄）
    disagreed = "disagreed"   # 意見相違（赤）

# ユーザーモデル
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    firebase_uid = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=True)
    name = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # リレーションシップ
    projects = relationship("Project", back_populates="user")

# プロジェクトモデル
class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    user_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # リレーションシップ
    user = relationship("User", back_populates="projects")
    conversations = relationship("Conversation", back_populates="project")
    proposals = relationship("Proposal", back_populates="project")
    issues = relationship("Issue", back_populates="project", cascade="all, delete-orphan")

# 会話モデル
class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    content = Column(Text, nullable=False)
    speaker = Column(String, nullable=True)  # 話者情報（ユーザー or AI）
    sentiment = Column(String, nullable=True)  # 感情分析結果
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # リレーションシップ
    project = relationship("Project", back_populates="conversations")
    analysis = relationship("Analysis", back_populates="conversation", uselist=False)

# 分析結果モデル
class Analysis(Base):
    __tablename__ = "analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"))
    analysis_type = Column(String, index=True)  # 分析タイプ（感情分析、キーワード抽出など）
    result = Column(Text)  # JSON形式で保存
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # リレーションシップ
    conversation = relationship("Conversation", back_populates="analysis")

# 提案モデル
class Proposal(Base):
    __tablename__ = "proposals"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    title = Column(String)
    content = Column(Text)
    support_rate = Column(Float, default=0.0)  # 支持率
    is_selected = Column(Boolean, default=False)  # 選択されたかどうか
    is_favorite = Column(Boolean, default=False)  # お気に入りかどうか
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # リレーションシップ
    project = relationship("Project", back_populates="proposals")

# 論点（Issue）モデル
class Issue(Base):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    topic = Column(String, nullable=True)  # 論点の見出し
    content = Column(Text, nullable=False)
    type = Column(Enum(IssueType), nullable=False)  # type: ignore
    agreement_level = Column(Enum(AgreementLevel), nullable=True)  # type: ignore
    classification = Column(Enum(IssueClassification), nullable=False, default=IssueClassification.discussing)  # type: ignore
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # リレーションシップ
    project = relationship("Project", back_populates="issues")
    
    # 関連メッセージIDは別テーブルで管理するか、JSON形式で保存することも検討できます
