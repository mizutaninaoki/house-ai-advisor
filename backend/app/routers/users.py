from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db import crud, schemas
from app.db.session import get_db

router = APIRouter()

@router.post("/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """新しいユーザーを作成する"""
    # 既存ユーザーをメールアドレスで検索
    db_user = crud.get_user_by_email(db, email=user.email)
    
    # Firebase UIDがある場合はFirebase認証からの登録と判断
    if user.firebase_uid and db_user:
        # 既存ユーザーにFirebase UIDを関連付ける
        if not db_user.firebase_uid:
            db_user.firebase_uid = user.firebase_uid
            db.commit()
            db.refresh(db_user)
        return db_user
    elif db_user:
        # Firebase認証以外で、既存のメールアドレスの場合はエラー
        raise HTTPException(status_code=400, detail="このメールアドレスは既に登録されています")
    
    # 新規ユーザー作成
    return crud.create_user(db=db, user=user)

@router.get("/", response_model=List[schemas.User])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """ユーザー一覧を取得する"""
    users = crud.get_users(db, skip=skip, limit=limit)
    return users

@router.get("/email/{email}", response_model=schemas.User)
def read_user_by_email(email: str, db: Session = Depends(get_db)):
    """メールアドレスでユーザーを検索する"""
    db_user = crud.get_user_by_email(db, email=email)
    if db_user is None:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    return db_user

@router.get("/firebase/{firebase_uid}", response_model=schemas.User)
def read_user_by_firebase_uid(firebase_uid: str, db: Session = Depends(get_db)):
    """Firebase UIDでユーザーを検索する"""
    db_user = crud.get_user_by_firebase_uid(db, firebase_uid=firebase_uid)
    if db_user is None:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    return db_user

@router.get("/{user_id}", response_model=schemas.User)
def read_user(user_id: int, db: Session = Depends(get_db)):
    """特定のユーザー情報を取得する"""
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    return db_user

@router.delete("/{user_id}", response_model=bool)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """ユーザーを削除する"""
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    db.delete(db_user)
    db.commit()
    return True 
