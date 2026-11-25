"""
FastAPI Backend Application untuk Penjadwalan Perkuliahan FTI (CP-SAT Solver Engine).
Mengimplementasikan API RESTful yang stabil untuk diakses oleh browser/frontend:
- Endpoint Manajemen & Penyesuaian Kelas (PRD F-14 & F-15)
- Endpoint Inventaris Ruangan & Slot Waktu FTI
- Endpoint Solver CP-SAT Terpadu (100% CP-SAT, Tanpa Database, Tanpa Algoritma Genetika)
"""

import sys
import os
import csv
import io
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Pastikan direktori backend ada dalam path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.engine.memory_store import data_store, ClassItem
from app.engine.domain_models import ObjectiveWeights, SolverConfig
from app.schemas.schedule_dto import SolverResultOutput, DiagnosticsOutput
from app.engine.diagnostics import ScheduleDiagnostics

app = FastAPI(
    title="SIPRAMA FTI UNAND - CP-SAT Scheduling API",
    description="Backend API Terpadu untuk Penjadwalan Kuliah FTI Berbasis Google OR-Tools CP-SAT (Tanpa Database & Tanpa GA)",
    version="1.0.0",
)

# Konfigurasi CORS agar API stabil dan siap diakses dari browser frontend manapun
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request schemas
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


class GenerateScheduleRequest(BaseModel):
    department: Optional[str] = None  # None = Semua (SI, IF, TK), atau 'SI'/'IF'/'TK'
    max_classes: Optional[int] = None
    w_gap: int = 10
    w_pref: int = 4
    w_spread: int = 3
    w_waste: int = 1
    max_time_seconds: float = 60.0
    num_workers: int = 8


# -------------------------------------------------------------
# 1. Health & Meta Endpoints
# -------------------------------------------------------------
@app.get("/")
def get_root():
    return {
        "message": "SIPRAMA FTI UNAND Scheduling API is Running",
        "engine": "Google OR-Tools CP-SAT",
        "database": "In-Memory (No DB)",
        "docs_url": "/docs",
    }


@app.get("/api/health")
def get_health():
    return {
        "status": "healthy",
        "engine": "CP-SAT",
        "total_classes": len(data_store.classes),
        "total_rooms": len(data_store.rooms),
        "total_slots": len(data_store.slots),
        "total_lecturers": len(data_store.lecturers),
    }


# -------------------------------------------------------------
# 2. Kelas Perkuliahan (Classes CRUD & Adjustment)
# -------------------------------------------------------------
@app.get("/api/classes", response_model=List[ClassItem])
def list_classes(
    department: Optional[str] = Query(None, description="Filter prodi: SI, IF, TK"),
    semester: Optional[int] = Query(None, description="Filter semester: 1, 3, 5, 7"),
    search: Optional[str] = Query(None, description="Pencarian kode/nama/dosen"),
    room_type: Optional[str] = Query(None, description="Filter tipe ruang: Teori atau Lab"),
):
    return data_store.get_classes(
        department=department,
        semester=semester,
        search=search,
        room_type=room_type,
    )


@app.get("/api/classes/export-csv")
def export_classes_csv(
    department: Optional[str] = Query(None, description="Filter prodi: SI, IF, TK"),
    pure_only: bool = Query(False, description="Hanya kode prodi murni tanpa MWU/AND"),
):
    """Mengekspor data kelas terfilter berdasarkan kode dan prodi ke file CSV."""
    classes = data_store.get_classes(department=department)
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
def get_class_detail(class_id: str):
    item = data_store.get_class(class_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Kelas dengan ID {class_id} tidak ditemukan",
        )
    return item


@app.post("/api/classes", response_model=ClassItem, status_code=status.HTTP_201_CREATED)
def create_class(item: ClassItem):
    existing = data_store.get_class(item.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Kelas dengan ID {item.id} sudah ada",
        )
    return data_store.add_class(item)


@app.put("/api/classes/{class_id}", response_model=ClassItem)
def adjust_class(class_id: str, req: AdjustClassRequest):
    """
    Menyesuaikan data kelas di role Admin (F-14 & F-15):
    - Mengubah kuota peserta (enrolled_count)
    - Mengubah SKS / durasi
    - Mengubah jenis ruangan (Teori vs Lab)
    - Mengubah penugasan dosen
    """
    updated = data_store.update_class(class_id, req.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Kelas dengan ID {class_id} tidak ditemukan untuk disesuaikan",
        )
    return updated


@app.delete("/api/classes/{class_id}")
def cancel_or_delete_class(class_id: str):
    """Membatalkan / menghapus kelas (F-15)."""
    success = data_store.delete_class(class_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Kelas dengan ID {class_id} tidak ditemukan untuk dihapus",
        )
    return {"message": f"Kelas {class_id} berhasil dibatalkan/dihapus", "class_id": class_id}


@app.post("/api/classes/reset-csv")
def reset_classes_to_csv():
    """Mengembalikan data kelas persis seperti file CSV asli."""
    count = data_store.reset_to_csv()
    return {
        "message": f"Data kelas berhasil di-reset kembali dari CSV.",
        "total_classes": count,
    }


# -------------------------------------------------------------
# 3. Ruangan & Slot Waktu
# -------------------------------------------------------------
@app.get("/api/rooms")
def list_rooms():
    return [
        {
            "id": r.id,
            "name": r.name,
            "capacity": r.capacity,
            "room_type": r.room_type,
            "floor": r.floor,
            "features": r.features,
        }
        for r in data_store.get_rooms()
    ]


@app.get("/api/slots")
def list_slots():
    return [
        {
            "id": s.id,
            "index": s.index,
            "day": s.day,
            "daily_index": s.daily_index,
            "time_label": s.time_label,
        }
        for s in data_store.get_slots()
    ]


# -------------------------------------------------------------
# 4. Diagnostik Pre-Flight
# -------------------------------------------------------------
@app.get("/api/diagnostics/preflight", response_model=DiagnosticsOutput)
def run_preflight_diagnostics(department: Optional[str] = None):
    classes = data_store.get_classes(department=department)
    req_classes = [c for c in classes if c.requires_room]

    # Ubah format ke CourseClass
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
        rooms=data_store.get_rooms(),
        slots=data_store.get_slots(),
        lecturers=data_store.get_lecturers(),
        groups=data_store.get_groups(),
    )


# -------------------------------------------------------------
# 5. Solver Generator CP-SAT (100% CP-SAT, Tanpa Database, Tanpa GA)
# -------------------------------------------------------------
@app.post("/api/schedule/generate", response_model=SolverResultOutput)
def generate_schedule_cpsat(req: GenerateScheduleRequest):
    """
    Memicu proses pembuatan jadwal otomatis menggunakan Google OR-Tools CP-SAT.
    Sepenuhnya mematuhi 7 Batasan Keras dan meminimalkan 4 Batasan Lunak.
    """
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

    result = data_store.solve_cpsat(
        department=req.department,
        max_classes=req.max_classes,
        weights=weights,
        config=config,
    )
    return result


@app.get("/api/schedule/latest", response_model=Optional[SolverResultOutput])
def get_latest_schedule():
    """Mengambil hasil pembuatan jadwal CP-SAT yang paling baru disimpan."""
    return data_store.latest_schedule_result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
