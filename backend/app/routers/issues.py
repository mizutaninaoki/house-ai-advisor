from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from app.db import crud, schemas
from app.db.session import get_db
from app.services.ai_service import extract_issues_from_conversations

router = APIRouter()

# 論点の一括作成用スキーマ
class IssuesBatchCreate(BaseModel):
    project_id: int
    issues: List[schemas.IssueBase]

# 論点抽出用リクエストスキーマ
class ExtractIssuesRequest(BaseModel):
    project_id: int

@router.get("/", response_model=List[schemas.Issue])
def read_issues(
    project_id: Optional[int] = None, 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """論点一覧を取得する（プロジェクトIDによるフィルタリング可能）"""
    issues = crud.get_issues(db, project_id=project_id, skip=skip, limit=limit)
    return issues

@router.get("/{issue_id}", response_model=schemas.Issue)
def read_issue(issue_id: int, db: Session = Depends(get_db)):
    """特定の論点を取得する"""
    db_issue = crud.get_issue(db, issue_id=issue_id)
    if db_issue is None:
        raise HTTPException(status_code=404, detail="論点が見つかりません")
    return db_issue

@router.post("/", response_model=schemas.Issue)
def create_issue(issue: schemas.IssueCreate, db: Session = Depends(get_db)):
    """新しい論点を作成する"""
    return crud.create_issue(db=db, issue=issue)

@router.post("/batch", response_model=List[schemas.Issue])
def create_issues_batch(issues_data: IssuesBatchCreate, db: Session = Depends(get_db)):
    """複数の論点を一括で作成する"""
    # プロジェクトの存在確認
    db_project = crud.get_project(db, project_id=issues_data.project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    
    # 論点を作成
    created_issues = []
    for issue_base in issues_data.issues:
        issue_create = schemas.IssueCreate(
            project_id=issues_data.project_id,
            content=issue_base.content,
            type=issue_base.type,
            agreement_level=issue_base.agreement_level
        )
        created_issue = crud.create_issue(db=db, issue=issue_create)
        created_issues.append(created_issue)
    
    return created_issues

@router.post("/extract", response_model=Dict[str, Any])
async def extract_issues(request: ExtractIssuesRequest, db: Session = Depends(get_db)):
    """会話から論点を抽出して保存する"""
    # プロジェクトの存在確認
    db_project = crud.get_project(db, project_id=request.project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    
    # 既存の論点を削除（新しく抽出したものに置き換える）
    crud.delete_project_issues(db, project_id=request.project_id)
    
    # 会話データを取得
    conversations = crud.get_conversations_ordered_by_timestamp(db, project_id=request.project_id)
    
    # 会話データがない場合
    if not conversations:
        return {"message": "会話データがありません", "issues": []}
    
    # 会話から論点を抽出（AIサービスを使用）
    extracted_issues = await extract_issues_from_conversations(conversations)
    
    # 抽出された論点をDBに保存
    saved_issues = []
    for issue in extracted_issues:
        issue_create = schemas.IssueCreate(
            project_id=request.project_id,
            content=issue["content"],
            type=issue["type"],
            agreement_level=issue.get("agreement_level")
        )
        db_issue = crud.create_issue(db=db, issue=issue_create)
        # モデルオブジェクトをスキーマに変換
        issue_schema = schemas.Issue(
            id=db_issue.id,
            project_id=db_issue.project_id,
            content=db_issue.content,
            type=db_issue.type,
            agreement_level=db_issue.agreement_level,
            created_at=db_issue.created_at,
            updated_at=db_issue.updated_at
        )
        saved_issues.append(issue_schema)
    
    return {
        "message": f"{len(saved_issues)}件の論点を抽出しました",
        "issues": saved_issues
    }

@router.put("/{issue_id}", response_model=schemas.Issue)
def update_issue(
    issue_id: int, 
    issue: schemas.IssueBase, 
    db: Session = Depends(get_db)
):
    """論点を更新する"""
    db_issue = crud.get_issue(db, issue_id=issue_id)
    if db_issue is None:
        raise HTTPException(status_code=404, detail="論点が見つかりません")
    
    updated_issue = crud.update_issue(db, issue_id=issue_id, issue_data=issue)
    return updated_issue

@router.delete("/{issue_id}", response_model=bool)
def delete_issue(issue_id: int, db: Session = Depends(get_db)):
    """論点を削除する"""
    success = crud.delete_issue(db, issue_id=issue_id)
    if not success:
        raise HTTPException(status_code=404, detail="論点が見つかりません")
    return success 
