"""
Modul Diagnostik & Analisis Kelayakan Pra-Jadwal (Pre-Flight Diagnostics).
Sesuai Dokumen task.md Bagian 7 (Penanganan Diagnosis Model).
"""

from typing import List, Dict, Tuple, Set
from collections import defaultdict

from app.models.domain import (
    CourseClass,
    Room,
    TimeSlot,
    Lecturer,
    StudentGroup,
    RoomType,
)
from app.schemas.schedule_dto import DiagnosticsOutput


class ScheduleDiagnostics:
    """
    Menyediakan analisis analitis untuk memeriksa kelayakan jadwal (feasibility check)
    dan mengisolasi potensi sumber konflik (unsatisfiable core / bottlenecks).
    """

    @staticmethod
    def run_preflight_checks(
        courses: List[CourseClass],
        rooms: List[Room],
        slots: List[TimeSlot],
        lecturers: List[Lecturer],
        groups: List[StudentGroup],
    ) -> DiagnosticsOutput:
        conflict_notes: List[str] = []
        unassigned_candidates: List[str] = []

        total_demand_slot_hours = sum(c.duration for c in courses)
        total_room_slot_hours = len(rooms) * len(slots)

        # -------------------------------------------------------------
        # 1. Analisis Kapasitas Total vs Beban Jam Total (task.md 7.2)
        # -------------------------------------------------------------
        utilization_pct = (
            (total_demand_slot_hours / total_room_slot_hours * 100.0)
            if total_room_slot_hours > 0
            else 0.0
        )
        is_capacity_sufficient = total_demand_slot_hours <= total_room_slot_hours

        if not is_capacity_sufficient:
            conflict_notes.append(
                f"[CRITICAL] Total beban kelas ({total_demand_slot_hours} slot-jam) melebihi "
                f"total daya tampung ruangan ({total_room_slot_hours} slot-jam)."
            )

        # Cek per Tipe Ruang (Teori vs Lab, termasuk ruang 'Umum' yang fleksibel)
        theory_courses = [c for c in courses if c.room_type == RoomType.TEORI.value]
        lab_courses = [c for c in courses if c.room_type == RoomType.LAB.value]
        theory_rooms = [r for r in rooms if r.room_type in (RoomType.TEORI.value, "Umum")]
        lab_rooms = [r for r in rooms if r.room_type in (RoomType.LAB.value, "Umum")]

        theory_demand = sum(c.duration for c in theory_courses)
        theory_supply = len(theory_rooms) * len(slots)
        if theory_demand > theory_supply:
            conflict_notes.append(
                f"[CRITICAL] Permintaan Ruang Teori ({theory_demand} slot) melebihi kapasitas Teori ({theory_supply} slot)."
            )

        lab_demand = sum(c.duration for c in lab_courses)
        lab_supply = len(lab_rooms) * len(slots)
        if lab_demand > lab_supply:
            conflict_notes.append(
                f"[CRITICAL] Permintaan Laboratorium ({lab_demand} slot) melebihi kapasitas Lab ({lab_supply} slot)."
            )

        # -------------------------------------------------------------
        # 2. Pemeriksaan Kesesuaian Kelas Individu (Room Eligibility)
        # -------------------------------------------------------------
        for c in courses:
            eligible_rooms = [
                r
                for r in rooms
                if (r.room_type == c.room_type or r.room_type == "Umum") and r.capacity >= c.size
            ]
            if not eligible_rooms:
                msg = (
                    f"Kelas {c.code} ({c.name} - {c.class_label}, ukuran {c.size}, tipe {c.room_type}) "
                    f"tidak memiliki ruangan yang memenuhi kriteria kapasitas & tipe!"
                )
                conflict_notes.append(f"[ROOM_OVERLOAD] {msg}")
                unassigned_candidates.append(c.id)

        # -------------------------------------------------------------
        # 3. Pemeriksaan Batas Durasi Harian (Day Boundary Feasibility)
        # -------------------------------------------------------------
        slots_by_day: Dict[str, List[TimeSlot]] = defaultdict(list)
        for s in slots:
            slots_by_day[s.day].append(s)

        max_daily_slots = max((len(s_list) for s_list in slots_by_day.values()), default=0)
        for c in courses:
            if c.duration > max_daily_slots:
                msg = (
                    f"Kelas {c.code} memiliki durasi {c.duration} slot, melebihi kapasitas slot "
                    f"harian tertinggi ({max_daily_slots} slot)."
                )
                conflict_notes.append(f"[DURATION_OVERFLOW] {msg}")
                if c.id not in unassigned_candidates:
                    unassigned_candidates.append(c.id)

        # -------------------------------------------------------------
        # 4. Beban Mengajar Dosen vs Ketersediaan (task.md 7.3)
        # -------------------------------------------------------------
        lecturers_map = {d.id: d for d in lecturers}
        lecturer_teaching_demand: Dict[str, int] = defaultdict(int)
        for c in courses:
            for d_id in c.lecturer_ids:
                lecturer_teaching_demand[d_id] += c.duration

        total_slots_count = len(slots)
        for d_id, demand in lecturer_teaching_demand.items():
            lecturer = lecturers_map.get(d_id)
            if not lecturer:
                continue
            available_slots = total_slots_count - len(lecturer.unavailable_slot_ids)
            if demand > available_slots:
                conflict_notes.append(
                    f"[LECTURER_OVERLOAD] Dosen {lecturer.name} memiliki beban {demand} slot, "
                    f"namun hanya memiliki {available_slots} slot waktu tersedia."
                )

        # -------------------------------------------------------------
        # 5. Beban Kelompok Mahasiswa / Rombel (Group Conflict Bottleneck)
        # -------------------------------------------------------------
        group_demand: Dict[str, int] = defaultdict(int)
        for c in courses:
            for g_id in c.group_ids:
                group_demand[g_id] += c.duration

        groups_map = {g.id: g for g in groups}
        for g_id, demand in group_demand.items():
            if demand > total_slots_count:
                grp = groups_map.get(g_id)
                grp_name = grp.name if grp else g_id
                conflict_notes.append(
                    f"[GROUP_OVERLOAD] Kelompok mahasiswa {grp_name} memiliki total beban {demand} slot, "
                    f"melebihi seluruh slot waktu dalam seminggu ({total_slots_count} slot)."
                )

        # Estimasi estimasi peak lecturer load per slot
        peak_lecturer_load_per_slot: Dict[str, int] = {}
        for s in slots:
            # Hitung dosen yang available di slot s
            available_lect_count = sum(
                1 for d in lecturers if s.id not in d.unavailable_slot_ids
            )
            peak_lecturer_load_per_slot[s.id] = available_lect_count

        return DiagnosticsOutput(
            total_demand_slot_hours=total_demand_slot_hours,
            total_room_slot_hours=total_room_slot_hours,
            utilization_percentage=round(utilization_pct, 2),
            is_capacity_sufficient=is_capacity_sufficient,
            peak_lecturer_load_per_slot=peak_lecturer_load_per_slot,
            unassigned_classes=unassigned_candidates,
            conflict_notes=conflict_notes,
        )
