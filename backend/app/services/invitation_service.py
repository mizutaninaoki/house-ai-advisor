import secrets
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.db import models, schemas  # type: ignore[import]

class InvitationService:
    @staticmethod
    def generate_invitation_token() -> str:
        """安全な招待トークンを生成"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def create_invitation(
        db: Session, 
        project_id: int, 
        email: str, 
        name: str, 
        relation: str,
        role: str = "member",
        expires_hours: int = 168  # 7日間有効
    ) -> str:
        """招待レコードを作成してトークンを返す"""
        token = InvitationService.generate_invitation_token()
        expires_at = datetime.utcnow() + timedelta(hours=expires_hours)
        
        invitation = models.ProjectInvitation(
            project_id=project_id,
            email=email,
            token=token,
            name=name,
            relation=relation,
            role=role,
            expires_at=expires_at
        )
        
        db.add(invitation)
        db.commit()
        db.refresh(invitation)
        
        return token
    
    @staticmethod
    def verify_invitation_token(db: Session, token: str) -> Optional[models.ProjectInvitation]:
        """トークンを検証して有効な招待を返す"""
        invitation = db.query(models.ProjectInvitation).filter(
            models.ProjectInvitation.token == token,
            models.ProjectInvitation.is_used == False,
            models.ProjectInvitation.expires_at > datetime.utcnow()
        ).first()
        
        return invitation
    
    @staticmethod
    def mark_invitation_as_used(db: Session, invitation: models.ProjectInvitation) -> None:
        """招待を使用済みとしてマークする"""
        invitation.is_used = True
        invitation.used_at = datetime.utcnow()
        db.commit() 
