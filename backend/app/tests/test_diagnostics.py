"""
Unit & Integration Tests untuk Pre-Flight Diagnostics (task.md Bagian 7).
"""

import pytest
from app.engine.domain_models import (
    TimeSlot,
    Room,
    Lecturer,
    StudentGroup,
    CourseClass,
    RoomType,
    SolverConfig,
)
from app.engine.diagnostics import ScheduleDiagnostics
from app.engine.scheduler import CPSATSchedulerService
from app.tests.test_hard_constraints import create_slots


class TestDiagnostics:
    def test_overcapacity_detection(self):
        """
        Diagnostik 7.2: Total beban jam melebihi total slot-ruangan yang tersedia.
        """
        slots = create_slots(["Senin"], slots_per_day=2)  # Total 2 slot
        rooms = [Room(id="r1", name="R101", capacity=50)]  # 1 ruang * 2 slot = 2 slot-jam
        lecturers = [Lecturer(id="d1", name="Dr. A", department="SI")]
        groups = [StudentGroup(id="g1", name="SI-1", department="SI", semester=1)]

        # Butuh 3 slot padahal cuma ada 2 slot-jam
        courses = [
            CourseClass(
                id="c1",
                code="SI101",
                name="Matkul Panjang",
                class_label="A",
                department="SI",
                semester=1,
                size=30,
                duration=3,  # 3 > 2
                lecturer_ids=["d1"],
                group_ids=["g1"],
            )
        ]

        diag = ScheduleDiagnostics.run_preflight_checks(
            courses, rooms, slots, lecturers, groups
        )

        assert not diag.is_capacity_sufficient
        assert diag.total_demand_slot_hours == 3
        assert diag.total_room_slot_hours == 2
        assert any("[CRITICAL]" in note for note in diag.conflict_notes)

    def test_room_size_bottleneck_detection(self):
        """
        Diagnostik: Kelas dengan jumlah mahasiswa melebihi kapasitas seluruh ruangan yang ada.
        """
        slots = create_slots(["Senin"], slots_per_day=4)
        rooms = [Room(id="r1", name="R101", capacity=30)]  # Kapasitas maks 30
        lecturers = [Lecturer(id="d1", name="Dr. A", department="SI")]
        groups = [StudentGroup(id="g1", name="SI-1", department="SI", semester=1)]

        # Kelas berukuran 55 mahasiswa
        courses = [
            CourseClass(
                id="c_huge",
                code="SI101",
                name="Kuliah Akbar",
                class_label="A",
                department="SI",
                semester=1,
                size=55,
                duration=1,
                lecturer_ids=["d1"],
                group_ids=["g1"],
            )
        ]

        diag = ScheduleDiagnostics.run_preflight_checks(
            courses, rooms, slots, lecturers, groups
        )

        assert "c_huge" in diag.unassigned_classes
        assert any("[ROOM_OVERLOAD]" in note for note in diag.conflict_notes)

    def test_infeasible_problem_handled_gracefully(self):
        """
        Memastikan jika solver menerima kasus INFEASIBLE, service mengembalikan status INFEASIBLE
        dan memuat diagnostik lengkap tanpa melempar exception tak tertangani.
        """
        slots = create_slots(["Senin"], slots_per_day=2)  # Hanya 2 slot
        rooms = [Room(id="r1", name="R101", capacity=50)]
        lecturers = [Lecturer(id="d1", name="Dr. A", department="SI")]
        groups = [StudentGroup(id="g1", name="SI-1", department="SI", semester=1)]

        # 2 kelas masing-masing butuh 2 slots di 1 ruangan yang hanya punya 2 slots total (butuh 4, supply 2)
        courses = [
            CourseClass(
                id="c1",
                code="SI101",
                name="Kelas 1",
                class_label="A",
                department="SI",
                semester=1,
                size=30,
                duration=2,
                lecturer_ids=["d1"],
                group_ids=["g1"],
            ),
            CourseClass(
                id="c2",
                code="SI102",
                name="Kelas 2",
                class_label="A",
                department="SI",
                semester=1,
                size=30,
                duration=2,
                lecturer_ids=["d1"],
                group_ids=["g1"],
            ),
        ]

        service = CPSATSchedulerService(config=SolverConfig(max_time_in_seconds=5.0))
        result = service.solve(courses, rooms, slots, lecturers, groups)

        assert result.status == "INFEASIBLE"
        assert result.scheduled_classes == 0
        assert len(result.schedule) == 0
        assert result.diagnostics is not None
        assert not result.diagnostics.is_capacity_sufficient
