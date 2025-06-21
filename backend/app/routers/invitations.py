from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.db import crud, schemas, models
from app.db.session import get_db
from app.services.invitation_service import InvitationService

router = APIRouter()

@router.get("/accept/{token}", response_model=schemas.InvitationAcceptResponse)
def accept_invitation(token: str, db: Session = Depends(get_db)):
    """招待トークンを使ってプロジェクト情報を取得"""
    invitation = InvitationService.verify_invitation_token(db, token)
    
    if not invitation:
        raise HTTPException(
            status_code=400, 
            detail="招待リンクが無効または期限切れです"
        )
    
    # プロジェクト情報を取得
    project = crud.get_project(db, invitation.project_id)
    if not project:
        raise HTTPException(
            status_code=404,
            detail="プロジェクトが見つかりません"
        )
    
    return schemas.InvitationAcceptResponse(
        project_id=invitation.project_id,
        project_title=project.title,
        invitee_email=invitation.email,
        invitee_name=invitation.name,
        relation=invitation.relation,
        token=token
    )

@router.post("/complete/{token}")
def complete_invitation(
    token: str, 
    user_data: schemas.UserCreate,
    db: Session = Depends(get_db)
):
    """招待を完了してプロジェクトメンバーに追加"""
    invitation = InvitationService.verify_invitation_token(db, token)
    
    if not invitation:
        raise HTTPException(
            status_code=400,
            detail="招待リンクが無効または期限切れです"
        )
    
    # ユーザーを作成またはログイン
    db_user = crud.get_user_by_email(db, invitation.email)
    if not db_user:
        # 新規ユーザー作成
        db_user = crud.create_user(db, user_data)
    
    # プロジェクトメンバーとして追加
    member_data = schemas.ProjectMemberCreate(
        project_id=invitation.project_id,
        user_id=db_user.id,
        role=invitation.role,
        relation=invitation.relation,
        name=invitation.name,
        email=invitation.email
    )
    crud.create_project_member(db, member_data)
    
    # 招待を使用済みにマーク
    InvitationService.mark_invitation_as_used(db, invitation)
    
    return {
        "message": "プロジェクトに参加しました",
        "project_id": invitation.project_id,
        "user_id": db_user.id
    } 
