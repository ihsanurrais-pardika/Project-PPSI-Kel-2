"""
Routes Diagnostik Pra-Jadwal, Generator CP-SAT, Approval Wadek I, & Penyesuaian Jadwal Manual.
"""

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.db.mysql_store import mysql_store
from app.dependencies import get_store
from app.engine.diagnostics import ScheduleDiagnostics
from app.engine.manual_schedule import ScheduleConflictException
from app.models.domain import CourseClass, ObjectiveWeights, RoomType, SolverConfig
from app.schemas.requests import (
    GenerateScheduleRequest,
    SwapScheduleItemsRequest,
    UpdateScheduleItemRequest,
    VersionActionRequest,
    WadekDecisionRequest,
)
from app.schemas.schedule_dto import DiagnosticsOutput, SolverResultOutput

router = APIRouter(tags=["Schedule & Diagnostics"])


@router.get("/api/diagnostics/preflight", response_model=DiagnosticsOutput)
def run_preflight_diagnostics(department: Optional[str] = None, store=Depends(get_store)):
    if hasattr(store, "run_preflight"):
        return store.run_preflight(department=department)

    classes = store.get_classes(department=department)
    req_classes = [c for c in classes if c.requires_room]

    course_models = [
        CourseClass(
            id=c.id,
            code=c.course_code,
            name=c.name,
            class_label=c.class_label,
            department=c.department,
            semester=c.semester,
            size=c.enrolled_count,
            duration=2 if c.sks >= 3 else 1,
            lecturer_ids=c.lecturer_ids,
            group_ids=[c.rombel_key] if c.rombel_key else [f"g_{c.department}_{c.semester}"],
            room_type=RoomType.LAB.value if "lab" in c.room_type_needed.lower() else RoomType.TEORI.value,
        )
        for c in req_classes
    ]

    return ScheduleDiagnostics.run_preflight_checks(
        courses=course_models,
        rooms=store.get_rooms(),
        slots=store.get_slots(),
        lecturers=store.get_lecturers(),
        groups=store.get_groups(),
    )


@router.post("/api/schedule/generate", response_model=SolverResultOutput)
def generate_schedule_cpsat(req: GenerateScheduleRequest, store=Depends(get_store)):
    weights = ObjectiveWeights(
        w_gap=req.w_gap,
        w_pref=req.w_pref,
        w_spread=req.w_spread,
        w_waste=req.w_waste,
    )
    config = SolverConfig(
        max_time_in_seconds=req.max_time_seconds,
        num_search_workers=req.num_workers,
        linearization_level=0,
        search_branching="PORTFOLIO_SEARCH",
    )

    return store.solve_cpsat(
        department=req.department,
        max_classes=req.max_classes,
        weights=weights,
        config=config,
    )


@router.get("/api/schedule/latest", response_model=Optional[SolverResultOutput])
def get_latest_schedule(store=Depends(get_store)):
    if hasattr(store, "get_latest_schedule"):
        return store.get_latest_schedule()
    return store.latest_schedule_result


@router.post("/api/schedule/submit-wadek")
def submit_schedule_to_wadek(req: VersionActionRequest = VersionActionRequest(), store=Depends(get_store)):
    if not hasattr(store, "submit_to_wadek"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fitur ini hanya tersedia di mode database.")
    try:
        return store.submit_to_wadek(version_id=req.version_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/api/schedule/wadek-decision")
def wadek_decision(req: WadekDecisionRequest, store=Depends(get_store)):
    if not hasattr(store, "wadek_decision"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fitur ini hanya tersedia di mode database.")
    try:
        return store.wadek_decision(approved=req.approved, note=req.note, version_id=req.version_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/api/schedule/publish")
def publish_schedule(req: VersionActionRequest = VersionActionRequest(), store=Depends(get_store)):
    if not hasattr(store, "publish_schedule"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fitur ini hanya tersedia di mode database.")
    try:
        return store.publish_schedule(version_id=req.version_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.put("/api/schedule/items/{jadwal_id}")
def update_schedule_item(jadwal_id: str, req: UpdateScheduleItemRequest, store=Depends(get_store)):
    if not hasattr(store, "update_schedule_item"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fitur ini hanya tersedia di mode database.")
    parsed_id: Any = int(jadwal_id) if (store is mysql_store and jadwal_id.isdigit()) else jadwal_id
    parsed_room: Any = (
        int(req.room_id)
        if (store is mysql_store and req.room_id is not None and str(req.room_id).isdigit())
        else req.room_id
    )
    try:
        res = store.update_schedule_item(
            jadwal_id=parsed_id,
            day=req.day,
            start_time=req.start_time,
            end_time=req.end_time,
            room_id=parsed_room,
            sks=req.sks,
            reason=req.reason,
            actor_role=req.actor_role,
            actor_email=req.actor_email,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except ScheduleConflictException as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"message": exc.message, "conflicts": exc.conflicts},
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    if not res:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Item jadwal {jadwal_id} tidak ditemukan.")
    if isinstance(res, dict):
        return res
    return {"message": "Jadwal kelas berhasil diperbarui di database.", "jadwal_id": jadwal_id}


@router.post("/api/schedule/swap")
def swap_schedule_items(req: SwapScheduleItemsRequest, store=Depends(get_store)):
    if not hasattr(store, "swap_schedule_items"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fitur tukar jadwal belum tersedia.")
    id_a: Any = int(req.jadwal_id_a) if (store is mysql_store and str(req.jadwal_id_a).isdigit()) else str(req.jadwal_id_a)
    id_b: Any = int(req.jadwal_id_b) if (store is mysql_store and str(req.jadwal_id_b).isdigit()) else str(req.jadwal_id_b)
    try:
        return store.swap_schedule_items(
            jadwal_id_a=id_a,
            jadwal_id_b=id_b,
            a_sks=req.a_sks,
            reason=req.reason,
            actor_role=req.actor_role,
            actor_email=req.actor_email,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ScheduleConflictException as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"message": exc.message, "conflicts": exc.conflicts},
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
