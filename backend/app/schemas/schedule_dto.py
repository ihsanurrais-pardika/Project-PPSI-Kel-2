"""
Data Transfer Objects (DTO) untuk I/O Solver CP-SAT.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ScheduledClassOutput(BaseModel):
    class_id: str
    course_code: str
    course_name: str
    class_label: str
    department: str
    semester: int
    size: int
    duration: int
    sks: int = 2
    room_id: str
    room_name: str
    room_capacity: int
    room_type: str
    floor: int
    building: Optional[str] = None
    day: str
    start_slot_index: int
    end_slot_index: int
    start_time: str
    end_time: str
    slot_ids: List[str]
    lecturer_names: List[str]
    group_names: List[str]
    jadwal_id: Optional[int] = None
    db_kelas_id: Optional[int] = None
    db_ruang_id: Optional[int] = None


class PenaltyBreakdown(BaseModel):
    gap_penalty: int = 0
    pref_penalty: int = 0
    spread_penalty: int = 0
    waste_penalty: int = 0
    total_weighted_penalty: int = 0


class DiagnosticsOutput(BaseModel):
    total_demand_slot_hours: int
    total_room_slot_hours: int
    utilization_percentage: float
    is_capacity_sufficient: bool
    peak_lecturer_load_per_slot: Dict[str, int] = Field(default_factory=dict)
    unassigned_classes: List[str] = Field(default_factory=list)
    conflict_notes: List[str] = Field(default_factory=list)


class SolverResultOutput(BaseModel):
    status: str
    wall_time_seconds: float
    total_classes: int
    scheduled_classes: int
    penalty_breakdown: PenaltyBreakdown
    schedule: List[ScheduledClassOutput]
    diagnostics: Optional[DiagnosticsOutput] = None
    version_id: Optional[int] = None
    version_number: Optional[int] = None
    tahap: Optional[str] = None
    status_versi: Optional[str] = None
    approval_status: Optional[str] = None
    revision_note: Optional[str] = None
    semester_label: Optional[str] = None
