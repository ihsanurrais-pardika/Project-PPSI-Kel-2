"""
Routes Jadwal per Pertemuan & Jadwal Pengganti (tabel pertemuan_kuliah).
"""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status

from app import pertemuan_service
from app.schemas.requests import PenggantiPayload

router = APIRouter(tags=["Pertemuan"])


@router.get("/api/pertemuan/jadwal-saya")
def get_jadwal_saya(email: str = Query(..., description="Email akun dosen/mahasiswa")):
    try:
        return pertemuan_service.get_jadwal_saya(email)
    except pertemuan_service.PertemuanError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/api/pertemuan/ruang-tersedia")
def get_ruang_tersedia(
    tanggal: str,
    jam_mulai: str,
    jam_selesai: str,
    min_kapasitas: int = 0,
    id_jadwal: Optional[int] = None,
    pertemuan_ke: Optional[int] = None,
):
    try:
        return pertemuan_service.get_ruang_tersedia(
            tanggal, jam_mulai, jam_selesai, min_kapasitas, id_jadwal, pertemuan_ke
        )
    except pertemuan_service.PertemuanError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/api/pertemuan/pengganti")
def simpan_jadwal_pengganti(req: PenggantiPayload):
    try:
        return pertemuan_service.simpan_pengganti(req.model_dump())
    except pertemuan_service.PertemuanError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/api/pertemuan/okupansi")
def get_okupansi_tanggal(tanggal: str):
    try:
        return pertemuan_service.get_okupansi_tanggal(tanggal)
    except pertemuan_service.PertemuanError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
