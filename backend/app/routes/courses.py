"""
Routes Master Mata Kuliah & Manajemen Kelas Penawaran (CRUD + Ekspor Excel/PDF/CSV).
"""

import csv
import io
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response

from app.db.memory_store import data_store
from app.dependencies import get_store
from app.modul4_exports import build_offerings_excel, build_offerings_pdf
from app.schemas.class_dto import ClassItem
from app.schemas.requests import (
    AdjustClassRequest,
    CancelClassRequest,
    RestoreClassRequest,
)

router = APIRouter(tags=["Courses & Classes"])


@router.get("/api/courses")
def list_courses(store=Depends(get_store)):
    if hasattr(store, "get_courses"):
        return store.get_courses()
    return []


@router.get("/api/semester/active")
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


@router.get("/api/lecturers")
def list_lecturers(
    department: Optional[str] = Query(None, description="Filter prodi: SI, IF, TK"),
    store=Depends(get_store),
):
    if hasattr(store, "get_lecturers_raw"):
        return store.get_lecturers_raw(department=department)
    return []


@router.get("/api/classes", response_model=List[ClassItem])
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


@router.get("/api/classes/below-quota")
def list_classes_below_quota(
    department: Optional[str] = Query(None, description="Filter prodi: SI, IF, TK"),
    store=Depends(get_store),
):
    return store.get_below_quota_classes(department=department)


@router.get("/api/classes/export-excel")
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


@router.get("/api/classes/export-pdf")
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


@router.get("/api/classes/export-csv")
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
        "requires_accessibility", "is_transition_course", "lecturer_ids", "lecturer_names",
    ])
    for c in classes:
        writer.writerow([
            c.id, c.course_code, c.department, c.semester, c.name, c.class_label,
            c.sks, c.enrolled_count, c.enrolled_is_estimated, c.room_type_needed,
            c.is_mandatory, c.is_elective, c.rombel_key, c.requires_room,
            c.requires_accessibility, c.is_transition_course,
            ";".join(c.lecturer_ids), "/".join(c.lecturer_names),
        ])
    dept_suffix = f"_{department.lower()}" if department else "_all"
    pure_suffix = "_pure" if pure_only else ""
    filename = f"classes_fti{dept_suffix}{pure_suffix}_2026.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/api/classes/{class_id}", response_model=ClassItem)
def get_class_detail(class_id: str, store=Depends(get_store)):
    item = store.get_class(class_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Kelas dengan ID {class_id} tidak ditemukan",
        )
    return item


@router.post("/api/classes", response_model=ClassItem, status_code=status.HTTP_201_CREATED)
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


@router.put("/api/classes/{class_id}", response_model=ClassItem)
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


@router.post("/api/classes/{class_id}/cancel", response_model=ClassItem)
def cancel_class_soft(class_id: str, req: CancelClassRequest, store=Depends(get_store)):
    try:
        return store.cancel_class(class_id, reason=req.reason, actor_email=req.actor_email)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/api/classes/{class_id}/restore", response_model=ClassItem)
def restore_cancelled_class(
    class_id: str, req: RestoreClassRequest = RestoreClassRequest(), store=Depends(get_store)
):
    try:
        return store.restore_class(class_id, actor_email=req.actor_email)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.delete("/api/classes/{class_id}")
def cancel_or_delete_class(class_id: str, store=Depends(get_store)):
    success = store.delete_class(class_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Kelas dengan ID {class_id} tidak ditemukan untuk dihapus",
        )
    return {"message": f"Kelas {class_id} berhasil dibatalkan/dihapus", "class_id": class_id}


@router.post("/api/classes/reset-csv")
def reset_classes_to_csv(store=Depends(get_store)):
    count = store.reset_to_csv()
    return {
        "message": "Data kelas berhasil disinkronkan kembali dari CSV.",
        "total_classes": count,
    }
