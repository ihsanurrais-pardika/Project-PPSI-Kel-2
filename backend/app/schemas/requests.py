"""
Schema Pydantic Request Payload untuk seluruh endpoint API FastAPI SIPRAMA FTI UNAND.
"""

from typing import List, Optional
from pydantic import BaseModel


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


class PenggantiPayload(BaseModel):
    email: str
    id_jadwal: int
    pertemuan_ke: int
    tanggal: str
    jam_mulai: str
    jam_selesai: str
    id_ruang: int
    keterangan: Optional[str] = None
