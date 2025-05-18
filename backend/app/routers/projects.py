from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db import crud, schemas
from app.db.session import get_db

router = APIRouter()

@router.post("/", response_model=schemas.Project)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    """新しいプロジェクトを作成する"""
    return crud.create_project(db=db, project=project)

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
