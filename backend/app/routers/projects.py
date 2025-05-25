from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from app.db import crud, schemas
from app.db.session import get_db

router = APIRouter()

# 会話メッセージの保存用スキーマ
class ConversationMessageCreate(BaseModel):
    project_id: int
    content: str
    speaker: str
    sentiment: Optional[str] = "neutral"

@router.post("/", response_model=schemas.Project)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    """新しいプロジェクトを作成する（メンバーも同時登録）"""
    # プロジェクト本体を作成
    db_project = crud.create_project(db=db, project=project)
    # メンバーが指定されていればUser＋ProjectMemberを作成
    if project.members:
        for member in project.members:
            db_user = crud.get_user_by_email(db, member.email)
            if not db_user:
                # relationを除外してUserCreateを作成
                user_data = schemas.UserCreate(
                    email=member.email,
                    name=member.name,
                    firebase_uid=getattr(member, "firebase_uid", None)
                )
                db_user = crud.create_user(db, user_data)
            crud.create_project_member(db, schemas.ProjectMemberCreate(
                project_id=db_project.id,
                user_id=db_user.id,
                role="member",
                relation=member.relation,
                name=member.name
            ))
    return db_project

@router.get("/", response_model=List[schemas.Project])
def read_projects(user_id: Optional[int] = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """プロジェクト一覧を取得する（ユーザーIDによるフィルタリング可能）"""
    projects = crud.get_projects(db, user_id=user_id, skip=skip, limit=limit)
    return projects

@router.get("/{project_id}", response_model=schemas.ProjectDetail)
def read_project(project_id: int, db: Session = Depends(get_db)):
    """特定のプロジェクトの詳細情報を取得する"""
    db_project = crud.get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    return db_project

@router.put("/{project_id}", response_model=schemas.Project)
def update_project(project_id: int, project: schemas.ProjectBase, db: Session = Depends(get_db)):
    """プロジェクト情報を更新する"""
    db_project = crud.update_project(db, project_id=project_id, project_data=project)
    if db_project is None:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    return db_project

@router.delete("/{project_id}", response_model=bool)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    """プロジェクトを削除する"""
    success = crud.delete_project(db, project_id=project_id)
    if not success:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    return success

# 会話関連のエンドポイント
@router.get("/{project_id}/conversations", response_model=List[Dict[str, Any]])
def read_project_conversations(project_id: int, db: Session = Depends(get_db)):
    """特定のプロジェクトの会話履歴を取得する"""
    db_project = crud.get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    
    # 会話データを取得 - タイムスタンプでソート済みのデータを取得
    conversations = crud.get_conversations_ordered_by_timestamp(db, project_id=project_id)
    
    # フロントエンド用に会話データをフォーマット
    result = []
    for conv in conversations:
        # speakerがデータベースに保存されている場合はそれを使用し、なければデフォルト値を設定
        speaker = conv.speaker if conv.speaker else "不明なユーザー"
        # sentimentがデータベースに保存されている場合はそれを使用し、なければデフォルト値を設定
        sentiment = conv.sentiment if conv.sentiment else "neutral"
        
        result.append({
            "id": conv.id,
            "content": conv.content,
            "speaker": speaker,
            "timestamp": conv.created_at.isoformat(),
            "sentiment": sentiment
        })
    
    return result

@router.post("/{project_id}/conversations", response_model=Dict[str, Any])
def create_project_conversation(
    project_id: int, 
    message: ConversationMessageCreate, 
    db: Session = Depends(get_db)
):
    """プロジェクトに会話メッセージを追加する"""
    # プロジェクトの存在確認
    db_project = crud.get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    
    # 会話データを保存
    conversation_data = schemas.ConversationCreate(
        project_id=project_id,
        content=message.content,
        speaker=message.speaker,  # 話者情報を保存
        sentiment=message.sentiment  # 感情分析結果を保存
    )
    
    conversation = crud.create_conversation(db, conversation_data)
    
    # フロントエンド用に整形
    return {
        "id": conversation.id,
        "content": conversation.content,
        "speaker": message.speaker,
        "timestamp": conversation.created_at.isoformat(),
        "sentiment": message.sentiment
    }

@router.get("/{project_id}/members", response_model=List[schemas.ProjectMember])
def get_project_members(project_id: int, db: Session = Depends(get_db)):
    """プロジェクト参加メンバー一覧を取得"""
    return crud.get_project_members(db, project_id) 
