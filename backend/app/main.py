"""
FastAPI Backend Application untuk Penjadwalan Perkuliahan FTI (CP-SAT Solver Engine).
Terintegrasi dengan Database MySQL (siprama_db) untuk:
- Autentikasi Pengguna Berbasis Role
- Manajemen & Penyesuaian Kelas, Mata Kuliah, dan Ruang (CRUD)
- Generator Jadwal Otomatis Google OR-Tools CP-SAT + Simpan Versi (`jadwal_versi`, `jadwal_kuliah`)
- Alur Pengajuan, Review/Revisi, Persetujuan Wakil Dekan I, dan Publikasi Resmi
"""

import sys
import os
import csv
import io
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Depends, status
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Pastikan direktori backend ada dalam path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database import authenticate_from_database
from app.engine.memory_store import ClassItem, data_store
from app.db_store import mysql_store
from app.engine.domain_models import ObjectiveWeights, SolverConfig
from app.schemas.schedule_dto import SolverResultOutput, DiagnosticsOutput, RoomUtilizationResponse
from app.engine.diagnostics import ScheduleDiagnostics
from app.engine.manual_schedule import ScheduleConflictException
from app.modul4_exports import build_offerings_excel, build_offerings_pdf

app = FastAPI(
    title="SIPRAMA FTI UNAND - Unified API & CP-SAT Engine",
    description="Backend API Terpadu SIPRAMA FTI UNAND (MySQL + Google OR-Tools CP-SAT)",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_store():
    """Dependency default ke MySQLDataStore (dapat di-override di unit test)."""
    return mysql_store


# -------------------------------------------------------------
# Request Schemas
# -------------------------------------------------------------
class LoginRequest(BaseModel):
    identifier: str
    password: str


class AdjustClassRequest(BaseModel):
    name: Optional[str] = None
    class_label: Optional[str] = None
    sks: Optional[int] = None
    enrolled_count: Optional[int] = None
    room_type_needed: Optional[str] = None
    rombel_key: Optional[str] = None
    requires_room: Optional[bool] = None
    lecturer_names: Optional[List[str]] = None
    lecturer_ids: Optional[List[str]] = None
    reason: Optional[str] = None
    actor_email: Optional[str] = None


class OfferingRombelPayload(BaseModel):
    class_label: str
    enrolled_count: int


class CreateOfferingRequest(BaseModel):
    course_code: str
    name: str
    department: str = "SI"
    semester: int = 1
    sks: int = 3
    sks_teori: Optional[int] = None
    sks_praktik: Optional[int] = None
    is_mandatory: bool = True
    requires_room: bool = True
    room_type_needed: Optional[str] = None
    primary_lecturer_name: str
    tandem_lecturer_names: List[str] = []
    classes: List[OfferingRombelPayload]
    preferred_days: List[str] = []
    preferred_time_slot: Optional[str] = None
    avoid_friday: bool = False
    special_note: Optional[str] = None
    as_draft: bool = False
    update_existing: bool = False
    actor_email: Optional[str] = None


class CancelClassRequest(BaseModel):
    reason: str
    actor_email: Optional[str] = None


class RestoreClassRequest(BaseModel):
    actor_email: Optional[str] = None


class AdjustRombelsRequest(BaseModel):
    target_count: int
    default_capacity: int = 40
    reason: str = "Penyesuaian jumlah rombel departemen"
    actor_email: Optional[str] = None


class SubmitDepartemenRequest(BaseModel):
    department: str
    catatan: Optional[str] = None
    actor_email: Optional[str] = None


class RoomPayload(BaseModel):
    code: Optional[str] = None
    kode_ruang: Optional[str] = None
    name: Optional[str] = None
    nama_ruang: Optional[str] = None
    building: Optional[str] = None
    gedung: Optional[str] = None
    floor: Optional[int] = None
    lantai: Optional[int] = None
    capacity: Optional[int] = None
    kapasitas: Optional[int] = None
    kode_prodi: Optional[str] = None


class GenerateScheduleRequest(BaseModel):
    department: Optional[str] = None
    max_classes: Optional[int] = None
    w_gap: int = 10
    w_pref: int = 4
    w_spread: int = 3
    w_waste: int = 1
    max_time_seconds: float = 60.0
    num_workers: int = 8


class VersionActionRequest(BaseModel):
    version_id: Optional[int] = None


class WadekDecisionRequest(BaseModel):
    approved: bool
    note: str = ""
    version_id: Optional[int] = None


class UpdateScheduleItemRequest(BaseModel):
    day: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    room_id: Optional[str | int] = None
    sks: Optional[int] = None
    reason: Optional[str] = None
    actor_role: Optional[str] = "admin"
    actor_email: Optional[str] = None


class SwapScheduleItemsRequest(BaseModel):
    jadwal_id_a: str | int
    jadwal_id_b: str | int
    a_sks: Optional[int] = None
    reason: Optional[str] = None
    actor_role: Optional[str] = "admin"
    actor_email: Optional[str] = None


class ResolveValidationIssueRequest(BaseModel):
    decision: str = "TOLERANSI_DITERIMA"
    actor_role: Optional[str] = "admin"
    actor_email: Optional[str] = None


class AutoFixValidationRequest(BaseModel):
    version_id: Optional[int] = None
    actor_role: Optional[str] = "admin"
    actor_email: Optional[str] = None


# -------------------------------------------------------------
# 1. Health & Autentikasi MySQL
# -------------------------------------------------------------
@app.get("/")
def get_root(store=Depends(get_store)):
    is_mysql = store is mysql_store
    return {
        "message": "SIPRAMA FTI UNAND Scheduling API is Running",
        "engine": "Google OR-Tools CP-SAT",
        "database": "MySQL (siprama_db)" if is_mysql else "In-Memory (Test Mode)",
        "docs_url": "/docs",
    }


@app.get("/api/health")
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


@app.post("/api/auth/login")
@app.post("/api/login")
def login(req: LoginRequest):
    auth_res = authenticate_from_database(req.identifier, req.password)
    if not auth_res["success"]:
        raise HTTPException(
            status_code=auth_res.get("status_code", status.HTTP_401_UNAUTHORIZED),
            detail=auth_res.get("detail", "Sandi atau NIP/NIM/Email Anda salah."),
        )
    return auth_res


# -------------------------------------------------------------
# 2. Master Mata Kuliah & CRUD Kelas (MySQL)
# -------------------------------------------------------------
@app.get("/api/courses")
def list_courses(store=Depends(get_store)):
    if hasattr(store, "get_courses"):
        return store.get_courses()
    return []


@app.get("/api/semester/active")
def get_active_semester(store=Depends(get_store)):
    if hasattr(store, "get_active_semester_info"):
        return store.get_active_semester_info()
    return {
        "id_semester": 1,
        "tahun_ajaran": "2026/2027",
        "jenis_semester": "Ganjil",
        "semester_label": "2026/2027 Ganjil",
        "kuota_minimum_kelas": getattr(store, "kuota_minimum_kelas", 15),
    }


@app.get("/api/lecturers")
def list_lecturers(
    department: Optional[str] = Query(None, description="Filter prodi: SI, IF, TK"),
    store=Depends(get_store),
):
    if hasattr(store, "get_lecturers_raw"):
        return store.get_lecturers_raw(department=department)
    return []


@app.get("/api/classes", response_model=List[ClassItem])
def list_classes(
    department: Optional[str] = Query(None, description="Filter prodi: SI, IF, TK"),
    semester: Optional[int] = Query(None, description="Filter semester: 1, 3, 5, 7"),
    search: Optional[str] = Query(None, description="Pencarian kode/nama/dosen"),
    room_type: Optional[str] = Query(None, description="Filter tipe ruang: Teori atau Lab"),
    include_cancelled: bool = Query(False, description="Sertakan kelas yang dibatalkan"),
    store=Depends(get_store),
):
    return store.get_classes(
        department=department,
        semester=semester,
        search=search,
        room_type=room_type,
        include_cancelled=include_cancelled,
    )


@app.get("/api/classes/below-quota")
def list_classes_below_quota(
    department: Optional[str] = Query(None, description="Filter prodi: SI, IF, TK"),
    store=Depends(get_store),
):
    return store.get_below_quota_classes(department=department)


@app.get("/api/classes/export-excel")
def export_classes_excel(
    department: Optional[str] = Query(None, description="Filter prodi: SI, IF, TK"),
    semester: Optional[int] = Query(None, description="Filter semester"),
    include_cancelled: bool = Query(False, description="Sertakan kelas dibatalkan"),
    store=Depends(get_store),
):
    classes = store.get_classes(
        department=department,
        semester=semester,
        include_cancelled=include_cancelled,
    )
    sem_info = (
        store.get_active_semester_info()
        if hasattr(store, "get_active_semester_info")
        else {"semester_label": "2026/2027 Ganjil", "kuota_minimum_kelas": 15}
    )
    xlsx_bytes = build_offerings_excel(
        classes=classes,
        department=department,
        semester_label=sem_info["semester_label"],
        kuota_minimum=sem_info["kuota_minimum_kelas"],
    )
    dept_suffix = f"_{department.lower()}" if department else "_all"
    filename = f"kebutuhan_perkuliahan{dept_suffix}.xlsx"
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/classes/export-pdf")
def export_classes_pdf(
    department: Optional[str] = Query(None, description="Filter prodi: SI, IF, TK"),
    semester: Optional[int] = Query(None, description="Filter semester"),
    include_cancelled: bool = Query(False, description="Sertakan kelas dibatalkan"),
    store=Depends(get_store),
):
    classes = store.get_classes(
        department=department,
        semester=semester,
        include_cancelled=include_cancelled,
    )
    sem_info = (
        store.get_active_semester_info()
        if hasattr(store, "get_active_semester_info")
        else {"semester_label": "2026/2027 Ganjil", "kuota_minimum_kelas": 15}
    )
    pdf_bytes = build_offerings_pdf(
        classes=classes,
        department=department,
        semester_label=sem_info["semester_label"],
        kuota_minimum=sem_info["kuota_minimum_kelas"],
    )
    dept_suffix = f"_{department.lower()}" if department else "_all"
    filename = f"surat_usulan_kebutuhan{dept_suffix}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/classes/export-csv")
def export_classes_csv(
    department: Optional[str] = Query(None, description="Filter prodi: SI, IF, TK"),
    pure_only: bool = Query(False, description="Hanya kode prodi murni tanpa MWU/AND"),
    store=Depends(get_store),
):
    classes = store.get_classes(department=department)
    if pure_only:
        allowed_prefixes = {
            "TK": ("CCE", "ECS", "SCE", "SSC"),
            "SI": ("DSI", "PSI", "TSI"),
            "IF": ("DIF", "TIF"),
        }
        if department and department.upper() in allowed_prefixes:
            target_prefixes = allowed_prefixes[department.upper()]
            classes = [c for c in classes if c.course_code.upper().startswith(target_prefixes)]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id", "course_code", "department", "semester", "name", "class_label",
        "sks", "enrolled_count", "enrolled_is_estimated", "room_type_needed",
        "is_mandatory", "is_elective", "rombel_key", "requires_room",
        "requires_accessibility", "is_transition_course", "lecturer_ids", "lecturer_names"
    ])
    for c in classes:
        writer.writerow([
            c.id, c.course_code, c.department, c.semester, c.name, c.class_label,
            c.sks, c.enrolled_count, c.enrolled_is_estimated, c.room_type_needed,
            c.is_mandatory, c.is_elective, c.rombel_key, c.requires_room,
            c.requires_accessibility, c.is_transition_course,
            ";".join(c.lecturer_ids), "/".join(c.lecturer_names)
        ])
    dept_suffix = f"_{department.lower()}" if department else "_all"
    pure_suffix = "_pure" if pure_only else ""
    filename = f"classes_fti{dept_suffix}{pure_suffix}_2026.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@app.get("/api/classes/{class_id}", response_model=ClassItem)
def get_class_detail(class_id: str, store=Depends(get_store)):
    item = store.get_class(class_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Kelas dengan ID {class_id} tidak ditemukan",
        )
    return item


@app.post("/api/classes", response_model=ClassItem, status_code=status.HTTP_201_CREATED)
def create_class(item: ClassItem, store=Depends(get_store)):
    if hasattr(store, "get_class") and store is data_store:
        existing = store.get_class(item.id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Kelas dengan ID {item.id} sudah ada",
            )
    try:
        return store.add_class(item)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@app.put("/api/classes/{class_id}", response_model=ClassItem)
def adjust_class(class_id: str, req: AdjustClassRequest, store=Depends(get_store)):
    try:
        updated = store.update_class(class_id, req.model_dump(exclude_unset=True))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Kelas dengan ID {class_id} tidak ditemukan untuk disesuaikan",
        )
    return updated


@app.post("/api/classes/{class_id}/cancel", response_model=ClassItem)
def cancel_class_soft(class_id: str, req: CancelClassRequest, store=Depends(get_store)):
    try:
        return store.cancel_class(class_id, reason=req.reason, actor_email=req.actor_email)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@app.post("/api/classes/{class_id}/restore", response_model=ClassItem)
def restore_cancelled_class(
    class_id: str, req: RestoreClassRequest = RestoreClassRequest(), store=Depends(get_store)
):
    try:
        return store.restore_class(class_id, actor_email=req.actor_email)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@app.delete("/api/classes/{class_id}")
def cancel_or_delete_class(class_id: str, store=Depends(get_store)):
    success = store.delete_class(class_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Kelas dengan ID {class_id} tidak ditemukan untuk dihapus",
        )
    return {"message": f"Kelas {class_id} berhasil dibatalkan/dihapus", "class_id": class_id}


@app.post("/api/classes/reset-csv")
def reset_classes_to_csv(store=Depends(get_store)):
    count = store.reset_to_csv()
    return {
        "message": "Data kelas berhasil disinkronkan kembali dari CSV.",
        "total_classes": count,
    }


@app.post("/api/departemen/offerings", status_code=status.HTTP_201_CREATED)
def create_departemen_offering(req: CreateOfferingRequest, store=Depends(get_store)):
    try:
        return store.create_offering(req.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@app.post("/api/departemen/offerings/{course_code}/adjust-rombels")
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


@app.get("/api/departemen/logs")
def list_departemen_logs(
    department: Optional[str] = Query(None, description="Filter prodi: SI, IF, TK"),
    limit: int = Query(50, ge=1, le=200),
    store=Depends(get_store),
):
    return store.get_departemen_logs(department=department, limit=limit)


@app.get("/api/departemen/status")
def get_departemen_submission_status(
    department: str = Query("SI", description="Kode prodi: SI, IF, TK"),
    store=Depends(get_store),
):
    return store.get_departemen_status(department=department)


@app.post("/api/departemen/submit")
def submit_departemen_needs(req: SubmitDepartemenRequest, store=Depends(get_store)):
    try:
        return store.submit_departemen(
            department=req.department,
            actor_email=req.actor_email,
            catatan=req.catatan,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


# -------------------------------------------------------------
# 3. Manajemen Ruang Fisik (CRUD MySQL) & Slot Waktu
# -------------------------------------------------------------
@app.get("/api/rooms")
def list_rooms(store=Depends(get_store)):
    if hasattr(store, "get_rooms_raw"):
        return store.get_rooms_raw()
    return [
        {
            "id": r.id,
            "name": r.name,
            "capacity": r.capacity,
            "room_type": r.room_type,
            "floor": r.floor,
            "features": r.features,
        }
        for r in store.get_rooms()
    ]


@app.post("/api/rooms", status_code=status.HTTP_201_CREATED)
def create_room(req: RoomPayload, store=Depends(get_store)):
    if not hasattr(store, "add_room"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CRUD ruang hanya aktif di mode database.")
    try:
        return store.add_room(req.model_dump(exclude_none=True))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@app.put("/api/rooms/{room_id}")
def update_room(room_id: str, req: RoomPayload, store=Depends(get_store)):
    if not hasattr(store, "update_room"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CRUD ruang hanya aktif di mode database.")
    updated = store.update_room(room_id, req.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Ruang {room_id} tidak ditemukan.")
    return updated


@app.delete("/api/rooms/{room_id}")
def delete_room(room_id: str, store=Depends(get_store)):
    if not hasattr(store, "delete_room"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CRUD ruang hanya aktif di mode database.")
    ok = store.delete_room(room_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Ruang {room_id} tidak ditemukan.")
    return {"message": f"Ruang {room_id} berhasil dihapus.", "room_id": room_id}


@app.get("/api/slots")
def list_slots(store=Depends(get_store)):
    return [
        {
            "id": s.id,
            "index": s.index,
            "day": s.day,
            "daily_index": s.daily_index,
            "time_label": s.time_label,
        }
        for s in store.get_slots()
    ]


@app.get("/api/rooms/utilization", response_model=RoomUtilizationResponse)
def get_room_utilization(
    version_id: Optional[int] = Query(None, description="ID Versi Jadwal (default: jadwal aktif terbaru)"),
    day: Optional[str] = Query(None, description="Filter Hari (Senin - Jumat)"),
    building: Optional[str] = Query(None, description="Filter Gedung (misal: Gedung H, Gedung G)"),
    department: Optional[str] = Query(None, description="Filter Departemen/Prodi"),
    store=Depends(get_store),
):
    """
    Menghitung persentase utilisasi dan statistik pemakaian ruang fisik dari data jadwal terkini.
    Digunakan untuk evaluasi efisiensi ruangan Wakil Dekan I, audit kapasitas, dan visualisasi heatmap.
    """
    if not hasattr(store, "get_room_utilization_stats"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Metode get_room_utilization_stats tidak tersedia pada store saat ini."
        )
    return store.get_room_utilization_stats(
        version_id=version_id,
        day=day,
        building=building,
        department=department,
    )


@app.get("/api/rooms/statistics")
def get_room_statistics(
    version_id: Optional[int] = Query(None, description="ID Versi Jadwal"),
    day: Optional[str] = Query(None, description="Filter Hari"),
    building: Optional[str] = Query(None, description="Filter Gedung"),
    department: Optional[str] = Query(None, description="Filter Departemen"),
    store=Depends(get_store),
):
    """
    Endpoint ringkas untuk mendapatkan ringkasan statistik utilisasi dan analisis jam sibuk.
    """
    if not hasattr(store, "get_room_utilization_stats"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Metode get_room_utilization_stats tidak tersedia pada store saat ini."
        )
    data = store.get_room_utilization_stats(
        version_id=version_id,
        day=day,
        building=building,
        department=department,
    )
    return {
        "summary": data.get("summary", {}),
        "buildings": data.get("buildings", []),
        "peak_hours": data.get("peak_hours", []),
        "semester_label": data.get("semester_label"),
        "approval_status": data.get("approval_status"),
    }



# -------------------------------------------------------------
# 4. Diagnostik Pre-Flight
# -------------------------------------------------------------
@app.get("/api/diagnostics/preflight", response_model=DiagnosticsOutput)
def run_preflight_diagnostics(department: Optional[str] = None, store=Depends(get_store)):
    if hasattr(store, "run_preflight"):
        return store.run_preflight(department=department)

    classes = store.get_classes(department=department)
    req_classes = [c for c in classes if c.requires_room]

    from app.engine.domain_models import CourseClass, RoomType
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


# -------------------------------------------------------------
# 5. Solver CP-SAT + Alur Approval Wadek I (MySQL Persisten)
# -------------------------------------------------------------
@app.post("/api/schedule/generate", response_model=SolverResultOutput)
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


@app.get("/api/schedule/latest", response_model=Optional[SolverResultOutput])
def get_latest_schedule(store=Depends(get_store)):
    if hasattr(store, "get_latest_schedule"):
        return store.get_latest_schedule()
    return store.latest_schedule_result


@app.post("/api/schedule/submit-wadek")
def submit_schedule_to_wadek(req: VersionActionRequest = VersionActionRequest(), store=Depends(get_store)):
    if not hasattr(store, "submit_to_wadek"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fitur ini hanya tersedia di mode database.")
    try:
        return store.submit_to_wadek(version_id=req.version_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@app.post("/api/schedule/wadek-decision")
def wadek_decision(req: WadekDecisionRequest, store=Depends(get_store)):
    if not hasattr(store, "wadek_decision"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fitur ini hanya tersedia di mode database.")
    try:
        return store.wadek_decision(approved=req.approved, note=req.note, version_id=req.version_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@app.post("/api/schedule/publish")
def publish_schedule(req: VersionActionRequest = VersionActionRequest(), store=Depends(get_store)):
    if not hasattr(store, "publish_schedule"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fitur ini hanya tersedia di mode database.")
    try:
        return store.publish_schedule(version_id=req.version_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@app.put("/api/schedule/items/{jadwal_id}")
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


@app.post("/api/schedule/swap")
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


@app.get("/api/schedule/validation")
@app.post("/api/schedule/validation/scan")
def get_or_scan_validation(version_id: Optional[int] = None, store=Depends(get_store)):
    if not hasattr(store, "get_validation_report"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fitur validasi konflik belum tersedia.")
    try:
        return store.get_validation_report(version_id=version_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@app.post("/api/schedule/validation/{conflict_id}/resolve")
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


@app.post("/api/schedule/validation/auto-fix")
def auto_fix_validation_conflicts(req: AutoFixValidationRequest = AutoFixValidationRequest(), store=Depends(get_store)):
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
