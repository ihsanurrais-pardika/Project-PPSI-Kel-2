"""
Unit & Integration Tests untuk Batasan Keras (Hard Constraints 4.1 - 4.7).
Sesuai Dokumen task.md Bagian 4.
"""

import pytest
from typing import List, Dict

from app.engine.domain_models import (
    Day,
    RoomType,
    TimeSlot,
    Room,
    Lecturer,
    StudentGroup,
    CourseClass,
    SolverConfig,
)
from app.engine.scheduler import CPSATSchedulerService


def create_slots(days: List[str] = None, slots_per_day: int = 4) -> List[TimeSlot]:
    if days is None:
        days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]
    slots = []
    idx = 0
    time_labels = ["08:00-09:40", "10:00-11:40", "13:30-15:10", "15:30-17:10", "17:15-18:55"]
    for day in days:
        for d_idx in range(slots_per_day):
            label = time_labels[d_idx] if d_idx < len(time_labels) else f"Slot-{d_idx+1}"
            slots.append(
                TimeSlot(
                    id=f"slot_{day[:3].lower()}_{d_idx+1}",
                    index=idx,
                    day=day,
                    daily_index=d_idx,
                    time_label=label,
                )
            )
            idx += 1
    return slots


class TestHardConstraints:
    def test_single_assignment_and_duration_4_1(self):
        """
        Batasan 4.1: Setiap kelas c harus terjadwal persis 1 kali
        dengan durasi kontigu k_c.
        """
        slots = create_slots(["Senin", "Selasa"], slots_per_day=3)  # 6 slots
        rooms = [
            Room(id="r1", name="R101", capacity=50, room_type=RoomType.TEORI.value),
            Room(id="r2", name="R102", capacity=50, room_type=RoomType.TEORI.value),
        ]
        lecturers = [Lecturer(id="d1", name="Dr. A", department="SI")]
        groups = [StudentGroup(id="g1", name="SI-1", department="SI", semester=3)]
        courses = [
            CourseClass(
                id="c1",
                code="SI101",
                name="Basis Data",
                class_label="A",
                department="SI",
                semester=3,
                size=40,
                duration=2,  # 2 slots
                lecturer_ids=["d1"],
                group_ids=["g1"],
            )
        ]

        service = CPSATSchedulerService(config=SolverConfig(max_time_in_seconds=10.0))
        result = service.solve(courses, rooms, slots, lecturers, groups)

        assert result.status in ("OPTIMAL", "FEASIBLE")
        assert len(result.schedule) == 1
        scheduled = result.schedule[0]
        assert scheduled.class_id == "c1"
        assert scheduled.duration == 2
        assert len(scheduled.slot_ids) == 2
        # Slot index harus berturut-turut
        assert scheduled.end_slot_index == scheduled.start_slot_index + 1

    def test_no_room_overlap_4_2(self):
        """
        Batasan 4.2: Satu ruangan tidak boleh digunakan lebih dari 1 kelas pada slot yang sama.
        """
        slots = create_slots(["Senin"], slots_per_day=4)  # 4 slots
        rooms = [Room(id="r1", name="R101", capacity=50, room_type=RoomType.TEORI.value)]
        lecturers = [
            Lecturer(id="d1", name="Dr. A", department="SI"),
            Lecturer(id="d2", name="Dr. B", department="IF"),
        ]
        groups = [
            StudentGroup(id="g1", name="SI-1", department="SI", semester=3),
            StudentGroup(id="g2", name="IF-1", department="IF", semester=3),
        ]
        # 2 kelas masing-masing butuh 2 slots di 1 ruangan yang sama total 4 slot
        courses = [
            CourseClass(
                id="c1",
                code="SI101",
                name="Matkul 1",
                class_label="A",
                department="SI",
                semester=3,
                size=40,
                duration=2,
                lecturer_ids=["d1"],
                group_ids=["g1"],
            ),
            CourseClass(
                id="c2",
                code="IF101",
                name="Matkul 2",
                class_label="A",
                department="IF",
                semester=3,
                size=40,
                duration=2,
                lecturer_ids=["d2"],
                group_ids=["g2"],
            ),
        ]

        service = CPSATSchedulerService(config=SolverConfig(max_time_in_seconds=10.0))
        result = service.solve(courses, rooms, slots, lecturers, groups)

        assert result.status in ("OPTIMAL", "FEASIBLE")
        assert len(result.schedule) == 2

        # Verifikasi tidak ada slot yang tumpang tindih di ruangan r1
        slots_used_by_c1 = set(result.schedule[0].slot_ids)
        slots_used_by_c2 = set(result.schedule[1].slot_ids)
        assert slots_used_by_c1.isdisjoint(slots_used_by_c2)

    def test_no_lecturer_conflict_including_tandem_4_3(self):
        """
        Batasan 4.3: Dosen tidak boleh bentrok, termasuk dosen pengampu bersama (team teaching / tandem).
        """
        slots = create_slots(["Senin"], slots_per_day=3)
        rooms = [
            Room(id="r1", name="R101", capacity=50),
            Room(id="r2", name="R102", capacity=50),
        ]
        # Dosen d1 mengampu c1 sendiri dan c2 tandem bersama d2
        lecturers = [
            Lecturer(id="d1", name="Dr. A", department="SI"),
            Lecturer(id="d2", name="Dr. B", department="SI"),
        ]
        groups = [
            StudentGroup(id="g1", name="SI-1", department="SI", semester=3),
            StudentGroup(id="g2", name="SI-2", department="SI", semester=3),
        ]
        courses = [
            CourseClass(
                id="c1",
                code="SI101",
                name="Kelas Mandiri Dr. A",
                class_label="A",
                department="SI",
                semester=3,
                size=30,
                duration=1,
                lecturer_ids=["d1"],
                group_ids=["g1"],
            ),
            CourseClass(
                id="c2",
                code="SI102",
                name="Kelas Tandem Dr. A & Dr. B",
                class_label="B",
                department="SI",
                semester=3,
                size=30,
                duration=2,
                lecturer_ids=["d1", "d2"],
                group_ids=["g2"],
            ),
        ]

        service = CPSATSchedulerService(config=SolverConfig(max_time_in_seconds=10.0))
        result = service.solve(courses, rooms, slots, lecturers, groups)

        assert result.status in ("OPTIMAL", "FEASIBLE")
        schedules_by_id = {s.class_id: s for s in result.schedule}
        slots_c1 = set(schedules_by_id["c1"].slot_ids)
        slots_c2 = set(schedules_by_id["c2"].slot_ids)
        # Dr. A ada di kedua kelas, maka tidak boleh ada slot yang sama
        assert slots_c1.isdisjoint(slots_c2)

    def test_no_student_group_conflict_4_4(self):
        """
        Batasan 4.4: Satu rombel / angkatan mahasiswa tidak boleh bentrok.
        """
        slots = create_slots(["Senin"], slots_per_day=3)
        rooms = [
            Room(id="r1", name="R101", capacity=50),
            Room(id="r2", name="R102", capacity=50),
        ]
        lecturers = [
            Lecturer(id="d1", name="Dr. A", department="SI"),
            Lecturer(id="d2", name="Dr. B", department="SI"),
        ]
        groups = [StudentGroup(id="g1", name="SI-2023", department="SI", semester=3)]
        courses = [
            CourseClass(
                id="c1",
                code="SI201",
                name="Jaringan Komputer",
                class_label="A",
                department="SI",
                semester=3,
                size=35,
                duration=1,
                lecturer_ids=["d1"],
                group_ids=["g1"],
            ),
            CourseClass(
                id="c2",
                code="SI202",
                name="Sistem Operasi",
                class_label="A",
                department="SI",
                semester=3,
                size=35,
                duration=2,
                lecturer_ids=["d2"],
                group_ids=["g1"],
            ),
        ]

        service = CPSATSchedulerService(config=SolverConfig(max_time_in_seconds=10.0))
        result = service.solve(courses, rooms, slots, lecturers, groups)

        assert result.status in ("OPTIMAL", "FEASIBLE")
        schedules = {s.class_id: s for s in result.schedule}
        assert set(schedules["c1"].slot_ids).isdisjoint(set(schedules["c2"].slot_ids))

    def test_room_capacity_and_type_matching_4_5(self):
        """
        Batasan 4.5:
        1. Kapasitas ruang Cap_r >= Size_c.
        2. Kelas praktikum hanya di Lab, kelas teori hanya di Teori.
        """
        slots = create_slots(["Senin"], slots_per_day=4)
        rooms = [
            Room(id="r_small", name="R_Kecil", capacity=25, room_type=RoomType.TEORI.value),
            Room(id="r_big", name="R_Besar", capacity=60, room_type=RoomType.TEORI.value),
            Room(id="r_lab", name="Lab_Komputer", capacity=40, room_type=RoomType.LAB.value),
        ]
        lecturers = [
            Lecturer(id="d1", name="Dr. A", department="SI"),
            Lecturer(id="d2", name="Dr. B", department="IF"),
        ]
        groups = [StudentGroup(id="g1", name="SI-1", department="SI", semester=1)]

        courses = [
            CourseClass(
                id="c_big_theory",
                code="SI101",
                name="Pengantar SI",
                class_label="A",
                department="SI",
                semester=1,
                size=50,  # Tidak muat di r_small (cap 25), harus di r_big
                duration=1,
                lecturer_ids=["d1"],
                group_ids=["g1"],
                room_type=RoomType.TEORI.value,
            ),
            CourseClass(
                id="c_practicum",
                code="IF102",
                name="Praktikum Pemrograman",
                class_label="A",
                department="IF",
                semester=1,
                size=30,
                duration=2,
                lecturer_ids=["d2"],
                group_ids=["g1"],
                room_type=RoomType.LAB.value,  # Wajib di Lab
            ),
        ]

        service = CPSATSchedulerService(config=SolverConfig(max_time_in_seconds=10.0))
        result = service.solve(courses, rooms, slots, lecturers, groups)

        assert result.status in ("OPTIMAL", "FEASIBLE")
        schedules = {s.class_id: s for s in result.schedule}

        # c_big_theory harus di r_big
        assert schedules["c_big_theory"].room_id == "r_big"
        assert schedules["c_big_theory"].room_capacity >= 50

        # c_practicum harus di r_lab
        assert schedules["c_practicum"].room_id == "r_lab"
        assert schedules["c_practicum"].room_type == RoomType.LAB.value

    def test_room_umum_accepts_teori_and_lab(self):
        """Ruang umum ('Umum') mendukung kelas Teori maupun Lab selama kapasitas mencukupi."""
        slots = create_slots(["Senin"], slots_per_day=3)
        rooms = [Room(id="r_umum", name="H-1.7", capacity=50, room_type="Umum")]
        lecturers = [
            Lecturer(id="d1", name="Dr. A", department="SI"),
            Lecturer(id="d2", name="Dr. B", department="IF"),
        ]
        groups = [
            StudentGroup(id="g1", name="SI-1", department="SI", semester=1),
            StudentGroup(id="g2", name="IF-1", department="IF", semester=1),
        ]
        courses = [
            CourseClass(
                id="c_teori", code="DSI101", name="Konsep SI", class_label="A",
                department="SI", semester=1, size=40, duration=1,
                lecturer_ids=["d1"], group_ids=["g1"], room_type=RoomType.TEORI.value,
            ),
            CourseClass(
                id="c_lab", code="DIF105", name="Praktikum", class_label="Shift 1",
                department="IF", semester=1, size=30, duration=1,
                lecturer_ids=["d2"], group_ids=["g2"], room_type=RoomType.LAB.value,
            ),
        ]
        result = CPSATSchedulerService(config=SolverConfig(max_time_in_seconds=5.0)).solve(
            courses, rooms, slots, lecturers, groups
        )
        assert result.status in ("OPTIMAL", "FEASIBLE")
        assert result.scheduled_classes == 2

    def test_day_boundary_constraint_4_6(self):
        """
        Batasan 4.6: Kelas berdurasi > 1 slot tidak boleh terpotong melewati batas hari.
        Jika slot terakhir hari Senin adalah slot ke-3, kelas durasi 2 tidak boleh mulai di slot ke-3.
        """
        slots = create_slots(["Senin", "Selasa"], slots_per_day=3)  # Senin: 0,1,2. Selasa: 3,4,5.
        rooms = [Room(id="r1", name="R101", capacity=50)]
        lecturers = [Lecturer(id="d1", name="Dr. A", department="SI")]
        groups = [StudentGroup(id="g1", name="SI-1", department="SI", semester=1)]

        # Kelas butuh durasi 2
        courses = [
            CourseClass(
                id="c1",
                code="SI101",
                name="Algoritma",
                class_label="A",
                department="SI",
                semester=1,
                size=30,
                duration=2,
                lecturer_ids=["d1"],
                group_ids=["g1"],
            )
        ]

        service = CPSATSchedulerService(config=SolverConfig(max_time_in_seconds=10.0))
        result = service.solve(courses, rooms, slots, lecturers, groups)

        assert result.status in ("OPTIMAL", "FEASIBLE")
        scheduled = result.schedule[0]
        # Start slot index tidak boleh 2 (karena 2 adalah slot terakhir Senin, index 3 adalah Selasa)
        assert scheduled.start_slot_index != 2
        # Hari mulai harus sama dengan hari berakhir
        slot_map = {s.index: s for s in slots}
        start_day = slot_map[scheduled.start_slot_index].day
        end_day = slot_map[scheduled.end_slot_index].day
        assert start_day == end_day

    def test_lecturer_unavailability_4_7(self):
        """
        Batasan 4.7: Dosen tidak boleh dijadwalkan pada slot unavailable miliknya.
        """
        slots = create_slots(["Senin"], slots_per_day=3)  # slot_sen_1, slot_sen_2, slot_sen_3
        rooms = [Room(id="r1", name="R101", capacity=50)]
        # Dr. A berhalangan di slot_sen_1 dan slot_sen_2
        lecturers = [
            Lecturer(
                id="d1",
                name="Dr. A",
                department="SI",
                unavailable_slot_ids=["slot_sen_1", "slot_sen_2"],
            )
        ]
        groups = [StudentGroup(id="g1", name="SI-1", department="SI", semester=1)]
        courses = [
            CourseClass(
                id="c1",
                code="SI101",
                name="Matematika Diskrit",
                class_label="A",
                department="SI",
                semester=1,
                size=30,
                duration=1,
                lecturer_ids=["d1"],
                group_ids=["g1"],
            )
        ]

        service = CPSATSchedulerService(config=SolverConfig(max_time_in_seconds=10.0))
        result = service.solve(courses, rooms, slots, lecturers, groups)

        assert result.status in ("OPTIMAL", "FEASIBLE")
        scheduled = result.schedule[0]
        # Pastikan kelas ditempatkan di slot_sen_3
        assert scheduled.slot_ids == ["slot_sen_3"]
