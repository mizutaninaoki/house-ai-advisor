from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import models, schemas, crud
from ..db.session import get_db
from typing import List
from ..services import ai_service

router = APIRouter(prefix="/api/agreements", tags=["Agreements"])

@router.post("/ai/generate", response_model=schemas.Agreement)
def generate_agreement_ai(
    project_id: int,
    proposal_id: int,
    db: Session = Depends(get_db)
):
    proposal = db.query(models.Proposal).filter(models.Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    # Gemini LLMで協議書タイトルと本文を生成
    agreement_result = ai_service.generate_agreement_content_with_llm(
        project_title=proposal.title,
        proposal_content=proposal.content
    )
    agreement_in = schemas.AgreementCreate(
        project_id=project_id,
        proposal_id=proposal_id,
        title=agreement_result["title"],
        content=agreement_result["content"],
        status="draft",
        is_signed=False
    )
    agreement = crud.create_agreement(db, agreement_in)
    return agreement

@router.get("/", response_model=schemas.Agreement)
def get_agreement(project_id: int, db: Session = Depends(get_db)):
    agreement = crud.get_agreement_by_project(db, project_id)
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
    return agreement

@router.put("/{agreement_id}", response_model=schemas.Agreement)
def update_agreement(agreement_id: int, agreement_update: schemas.AgreementUpdate, db: Session = Depends(get_db)):
    agreement = crud.update_agreement(db, agreement_id, agreement_update)
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
    return agreement

@router.get("/by_project", response_model=schemas.Agreement | None)
def get_agreement_by_project(project_id: int, db: Session = Depends(get_db)):
    agreement = crud.get_agreement_by_project(db, project_id)
    if not agreement:
        return None
    return agreement 
