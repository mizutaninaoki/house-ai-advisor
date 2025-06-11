from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import models, schemas, crud
from ..db.session import get_db
from typing import List

router = APIRouter(prefix="/api/projects/{project_id}/estates", tags=["Estates"])

@router.get("", response_model=List[schemas.Estate])
def get_estates(project_id: int, db: Session = Depends(get_db)):
    estates = crud.get_estates(db, project_id=project_id)
    return estates 

@router.post("", response_model=schemas.Estate)
def create_estate(project_id: int, estate: schemas.EstateCreate, db: Session = Depends(get_db)):
    # project_idを強制的にセット
    estate_data = estate.dict()
    estate_data["project_id"] = project_id
    return crud.create_estate(db, schemas.EstateCreate(**estate_data)) 