"""
Routes Manajemen Ruang Fisik, Slot Waktu, & Statistik Utilisasi Ruang.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.dependencies import get_store
from app.schemas.requests import RoomPayload
from app.schemas.schedule_dto import RoomUtilizationResponse

router = APIRouter(tags=["Rooms & Slots"])


@router.get("/api/rooms")
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


@router.post("/api/rooms", status_code=status.HTTP_201_CREATED)
def create_room(req: RoomPayload, store=Depends(get_store)):
    if not hasattr(store, "add_room"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CRUD ruang hanya aktif di mode database.",
        )
    try:
        return store.add_room(req.model_dump(exclude_none=True))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.put("/api/rooms/{room_id}")
def update_room(room_id: str, req: RoomPayload, store=Depends(get_store)):
    if not hasattr(store, "update_room"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CRUD ruang hanya aktif di mode database.",
        )
    updated = store.update_room(room_id, req.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ruang {room_id} tidak ditemukan.",
        )
    return updated


@router.delete("/api/rooms/{room_id}")
def delete_room(room_id: str, store=Depends(get_store)):
    if not hasattr(store, "delete_room"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CRUD ruang hanya aktif di mode database.",
        )
    ok = store.delete_room(room_id)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ruang {room_id} tidak ditemukan.",
        )
    return {"message": f"Ruang {room_id} berhasil dihapus.", "room_id": room_id}


@router.get("/api/slots")
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


@router.get("/api/rooms/utilization", response_model=RoomUtilizationResponse)
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
            detail="Metode get_room_utilization_stats tidak tersedia pada store saat ini.",
        )
    return store.get_room_utilization_stats(
        version_id=version_id,
        day=day,
        building=building,
        department=department,
    )


@router.get("/api/rooms/statistics")
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
            detail="Metode get_room_utilization_stats tidak tersedia pada store saat ini.",
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
    }
