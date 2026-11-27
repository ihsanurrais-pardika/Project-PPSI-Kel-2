"""
Routes Validasi & Penyelesaian Konflik Jadwal (UC-08 / Auto-Fix).
"""

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.db.mysql_store import mysql_store
from app.dependencies import get_store
from app.schemas.requests import AutoFixValidationRequest, ResolveValidationIssueRequest

router = APIRouter(tags=["Validation & Conflicts"])


@router.get("/api/schedule/validation")
@router.post("/api/schedule/validation/scan")
def get_or_scan_validation(version_id: Optional[int] = None, store=Depends(get_store)):
    if not hasattr(store, "get_validation_report"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fitur validasi konflik belum tersedia.")
    try:
        return store.get_validation_report(version_id=version_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post("/api/schedule/validation/{conflict_id}/resolve")
def resolve_validation_issue(conflict_id: str, req: ResolveValidationIssueRequest, store=Depends(get_store)):
    if not hasattr(store, "resolve_validation_issue"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fitur validasi konflik belum tersedia.")
    parsed_id: Any = int(conflict_id) if (store is mysql_store and conflict_id.isdigit()) else conflict_id
    try:
        return store.resolve_validation_issue(
            conflict_id=parsed_id,
            decision=req.decision,
            actor_role=req.actor_role,
            actor_email=req.actor_email,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/api/schedule/validation/auto-fix")
def auto_fix_validation_conflicts(
    req: AutoFixValidationRequest = AutoFixValidationRequest(),
    store=Depends(get_store),
):
    if not hasattr(store, "auto_fix_conflicts"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fitur auto-fix belum tersedia.")
    try:
        return store.auto_fix_conflicts(
            version_id=req.version_id,
            actor_role=req.actor_role,
            actor_email=req.actor_email,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
