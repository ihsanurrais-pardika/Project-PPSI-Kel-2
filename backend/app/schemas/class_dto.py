"""
Schema Pydantic untuk representasi entitas Kelas Mata Kuliah.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class ClassItem(BaseModel):
    id: str
    course_code: str
    department: str  # 'TK', 'SI', 'IF'
    semester: int
    name: str
    class_label: str
    sks: int
    enrolled_count: int
    enrolled_is_estimated: bool = False
    room_type_needed: str = "Teori"
    is_mandatory: bool = True
    is_elective: bool = False
    rombel_key: str = ""
    requires_room: bool = True
    requires_accessibility: bool = False
    is_transition_course: bool = False
    lecturer_ids: List[str] = Field(default_factory=list)
    lecturer_names: List[str] = Field(default_factory=list)
    status_kelas: str = "TERBUKA"
    sks_teori: int = 2
    sks_praktik: int = 0
    alasan_pembatalan: Optional[str] = None
    preferensi_hari: List[str] = Field(default_factory=list)
    preferensi_waktu: Optional[str] = None
    catatan_khusus: Optional[str] = None
    below_min_quota: bool = False
