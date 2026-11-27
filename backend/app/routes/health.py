"""
Routes Health Check & Informasi Status API.
"""

from fastapi import APIRouter, Depends

from app.db.mysql_store import mysql_store
from app.dependencies import get_store

router = APIRouter(tags=["Health"])


@router.get("/")
def get_root(store=Depends(get_store)):
    is_mysql = store is mysql_store
    return {
        "message": "SIPRAMA FTI UNAND Scheduling API is Running",
        "engine": "Google OR-Tools CP-SAT",
        "database": "MySQL (siprama_db)" if is_mysql else "In-Memory (Test Mode)",
        "docs_url": "/docs",
    }


@router.get("/api/health")
def get_health(store=Depends(get_store)):
    classes = store.get_classes()
    rooms = store.get_rooms()
    slots = store.get_slots()
    return {
        "status": "healthy",
        "engine": "CP-SAT",
        "database": "MySQL" if store is mysql_store else "In-Memory",
        "total_classes": len(classes),
        "total_rooms": len(rooms),
        "total_slots": len(slots),
        "total_lecturers": len(getattr(store, "lecturers", {})),
    }
