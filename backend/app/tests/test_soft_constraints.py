"""
Unit & Integration Tests untuk Batasan Lunak (Soft Constraints 5.1 - 5.5).
Sesuai Dokumen task.md Bagian 5.
"""

import pytest
from app.engine.domain_models import (
    TimeSlot,
    Room,
    Lecturer,
    StudentGroup,
    CourseClass,
    ObjectiveWeights,
    SolverConfig,
)
from app.engine.scheduler import CPSATSchedulerService
from app.tests.test_hard_constraints import create_slots


class TestSoftConstraints:
    def test_room_waste_minimization_5_4(self):
        """
        Batasan 5.4: P_RoomWaste = sum (Cap_r - Size_c) * y.
        Solver harus memilih ruangan yang paling pas dengan kapasitas kelas.
        """
        slots = create_slots(["Senin"], slots_per_day=2)
        # r_fit: kapasitas 35 (waste = 5), r_huge: kapasitas 100 (waste = 70)
        rooms = [
            Room(id="r_huge", name="Aula Besar", capacity=100),
            Room(id="r_fit", name="Ruang Pas", capacity=35),
        ]
        lecturers = [Lecturer(id="d1", name="Dr. A", department="SI")]
        groups = [StudentGroup(id="g1", name="SI-1", department="SI", semester=1)]
        courses = [
            CourseClass(
                id="c1",
                code="SI101",
                name="Algoritma",
                class_label="A",
                department="SI",
                semester=1,
                size=30,
                duration=1,
                lecturer_ids=["d1"],
                group_ids=["g1"],
            )
        ]

        # Prioritaskan bobot waste
        weights = ObjectiveWeights(w_gap=0, w_pref=0, w_spread=0, w_waste=10)
        service = CPSATSchedulerService(
            config=SolverConfig(max_time_in_seconds=10.0), weights=weights
        )
        result = service.solve(courses, rooms, slots, lecturers, groups)

        assert result.status in ("OPTIMAL", "FEASIBLE")
        scheduled = result.schedule[0]
        assert scheduled.room_id == "r_fit"
        assert result.penalty_breakdown.waste_penalty == (35 - 30)

    def test_lecturer_preference_minimization_5_2(self):
        """
        Batasan 5.2: P_Pref = sum w_pref * x.
        Solver harus menghindari slot yang memiliki bobot ketidaksukaan tinggi.
        """
        slots = create_slots(["Senin"], slots_per_day=3)  # slot_sen_1, slot_sen_2, slot_sen_3
        rooms = [Room(id="r1", name="R101", capacity=50)]
        # Dr. A sangat tidak menyukai slot_sen_1 (dislike = 100)
        lecturers = [
            Lecturer(
                id="d1",
                name="Dr. A",
                department="SI",
                time_preferences={"slot_sen_1": 100, "slot_sen_2": 0, "slot_sen_3": 0},
            )
        ]
        groups = [StudentGroup(id="g1", name="SI-1", department="SI", semester=1)]
        courses = [
            CourseClass(
                id="c1",
                code="SI101",
                name="Basis Data",
                class_label="A",
                department="SI",
                semester=1,
                size=30,
                duration=1,
                lecturer_ids=["d1"],
                group_ids=["g1"],
            )
        ]

        weights = ObjectiveWeights(w_gap=0, w_pref=10, w_spread=0, w_waste=0)
        service = CPSATSchedulerService(
            config=SolverConfig(max_time_in_seconds=10.0), weights=weights
        )
        result = service.solve(courses, rooms, slots, lecturers, groups)

        assert result.status in ("OPTIMAL", "FEASIBLE")
        scheduled = result.schedule[0]
        # Tidak boleh di slot_sen_1
        assert scheduled.slot_ids != ["slot_sen_1"]
        assert result.penalty_breakdown.pref_penalty == 0

    def test_lecturer_teaching_days_spread_5_3(self):
        """
        Batasan 5.3: P_Spread = sum u_d,h.
        Solver mengumpulkan jam mengajar dosen pada hari yang sama jika memungkinkan
        agar dosen tidak perlu datang berkali-kali hanya untuk 1 sesi singkat.
        """
        slots = create_slots(["Senin", "Selasa"], slots_per_day=2)  # 4 slots
        rooms = [Room(id="r1", name="R101", capacity=50)]
        lecturers = [Lecturer(id="d1", name="Dr. A", department="SI")]
        groups = [
            StudentGroup(id="g1", name="SI-1", department="SI", semester=1),
            StudentGroup(id="g2", name="SI-2", department="SI", semester=1),
        ]
        # Dua kelas berbeda untuk dosen yang sama, durasi masing-masing 1 slot
        courses = [
            CourseClass(
                id="c1",
                code="SI101",
                name="Kelas 1",
                class_label="A",
                department="SI",
                semester=1,
                size=30,
                duration=1,
                lecturer_ids=["d1"],
                group_ids=["g1"],
            ),
            CourseClass(
                id="c2",
                code="SI102",
                name="Kelas 2",
                class_label="B",
                department="SI",
                semester=1,
                size=30,
                duration=1,
                lecturer_ids=["d1"],
                group_ids=["g2"],
            ),
        ]

        # Prioritaskan w_spread tinggi
        weights = ObjectiveWeights(w_gap=0, w_pref=0, w_spread=50, w_waste=0)
        service = CPSATSchedulerService(
            config=SolverConfig(max_time_in_seconds=10.0), weights=weights
        )
        result = service.solve(courses, rooms, slots, lecturers, groups)

        assert result.status in ("OPTIMAL", "FEASIBLE")
        assert len(result.schedule) == 2
        day_c1 = result.schedule[0].day
        day_c2 = result.schedule[1].day
        # Kedua kelas Dr. A harus dijadwalkan pada hari yang sama (misal keduanya di Senin)
        assert day_c1 == day_c2
        assert result.penalty_breakdown.spread_penalty == 1  # Hanya 1 hari mengajar

    def test_student_gap_minimization_5_1(self):
        """
        Batasan 5.1: P_Gap = sum gap_g,s.
        Solver menghindari jadwal bolong/jeda kosong mahasiswa pada hari yang sama.
        """
        # 1 hari dengan 3 slot (pagi, siang, sore)
        slots = create_slots(["Senin"], slots_per_day=3)
        rooms = [
            Room(id="r1", name="R101", capacity=50),
            Room(id="r2", name="R102", capacity=50),
        ]
        lecturers = [
            Lecturer(id="d1", name="Dr. A", department="SI"),
            Lecturer(id="d2", name="Dr. B", department="SI"),
        ]
        groups = [StudentGroup(id="g1", name="SI-1", department="SI", semester=1)]
        courses = [
            CourseClass(
                id="c1",
                code="SI101",
                name="Kelas 1",
                class_label="A",
                department="SI",
                semester=1,
                size=30,
                duration=1,
                lecturer_ids=["d1"],
                group_ids=["g1"],
            ),
            CourseClass(
                id="c2",
                code="SI102",
                name="Kelas 2",
                class_label="B",
                department="SI",
                semester=1,
                size=30,
                duration=1,
                lecturer_ids=["d2"],
                group_ids=["g1"],
            ),
        ]

        weights = ObjectiveWeights(w_gap=50, w_pref=0, w_spread=0, w_waste=0)
        service = CPSATSchedulerService(
            config=SolverConfig(max_time_in_seconds=10.0), weights=weights
        )
        result = service.solve(courses, rooms, slots, lecturers, groups)

        assert result.status in ("OPTIMAL", "FEASIBLE")
        schedules = sorted(result.schedule, key=lambda s: s.start_slot_index)
        # Slot index kedua kelas harus berurutan (0 dan 1, atau 1 dan 2) sehingga gap = 0
        diff = schedules[1].start_slot_index - schedules[0].start_slot_index
        assert diff == 1
        assert result.penalty_breakdown.gap_penalty == 0
