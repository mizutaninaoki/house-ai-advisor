from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import models, schemas, crud
from ..db.session import get_db
from typing import List

router = APIRouter(prefix="/api/signatures", tags=["Signatures"])

@router.post("/", response_model=schemas.Signature)
def create_signature(signature: schemas.SignatureCreate, db: Session = Depends(get_db)):
    return crud.create_signature(db, signature)

@router.get("/by_agreement", response_model=List[schemas.Signature])
def get_signatures_by_agreement(agreement_id: int, db: Session = Depends(get_db)):
    return crud.get_signatures_by_agreement(db, agreement_id) 
