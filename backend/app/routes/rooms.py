"""
Routes Manajemen Ruang Fisik & Slot Waktu Perkuliahan.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_store
from app.schemas.requests import RoomPayload

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
