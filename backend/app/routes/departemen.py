"""
Routes Pengajuan Kebutuhan Perkuliahan Departemen (Modul 4).
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.dependencies import get_store
from app.schemas.requests import (
    AdjustRombelsRequest,
    CreateOfferingRequest,
    SubmitDepartemenRequest,
)

router = APIRouter(tags=["Departemen"])


@router.post("/api/departemen/offerings", status_code=status.HTTP_201_CREATED)
def create_departemen_offering(req: CreateOfferingRequest, store=Depends(get_store)):
    try:
        return store.create_offering(req.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/api/departemen/offerings/{course_code}/adjust-rombels")
def adjust_course_rombels(course_code: str, req: AdjustRombelsRequest, store=Depends(get_store)):
    try:
        return store.adjust_rombels(
            course_code=course_code,
            target_count=req.target_count,
            default_capacity=req.default_capacity,
            reason=req.reason,
            actor_email=req.actor_email,
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/api/departemen/logs")
def list_departemen_logs(
    department: Optional[str] = Query(None, description="Filter prodi: SI, IF, TK"),
    limit: int = Query(50, ge=1, le=200),
    store=Depends(get_store),
):
    return store.get_departemen_logs(department=department, limit=limit)


@router.get("/api/departemen/status")
def get_departemen_submission_status(
    department: str = Query("SI", description="Kode prodi: SI, IF, TK"),
    store=Depends(get_store),
):
    return store.get_departemen_status(department=department)


@router.post("/api/departemen/submit")
def submit_departemen_needs(req: SubmitDepartemenRequest, store=Depends(get_store)):
    try:
        return store.submit_departemen(
            department=req.department,
            actor_email=req.actor_email,
            catatan=req.catatan,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
