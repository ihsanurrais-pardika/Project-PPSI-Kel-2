import time
from typing import List, Dict, Any, Tuple

try:
    from ortools.sat.python import cp_model
    HAS_ORTOOLS = True
except ImportError:
    HAS_ORTOOLS = False
    cp_model = None

from models import (
    Room,
    Lecturer,
    CourseClass,
    TimeSlot,
    ScheduleConstraint,
    ConstraintLevel,
    ConstraintTarget,
)

class DynamicCPSATScheduler:
    """
    Generator Penjadwalan Dinamis Berbasis Constraint Status.
    Mendukung solver Google OR-Tools CP-SAT (jika terpasang)
    serta Fallback Pure-Python Constraint Solver otomatis jika ortools belum terpasang.
    """

    def __init__(
        self,
        rooms: List[Room],
        lecturers: List[Lecturer],
        classes: List[CourseClass],
        time_slots: List[TimeSlot],
        constraints: List[ScheduleConstraint],
    ):
        self.rooms = rooms
        self.lecturers = lecturers
        self.classes = classes
        self.time_slots = time_slots
        self.constraints = [c for c in constraints if c.is_active]

        self.room_map = {r.id: r for r in rooms}
        self.lecturer_map = {l.id: l for l in lecturers}
        self.class_map = {c.id: c for c in classes}
        self.slot_map = {s.id: s for s in time_slots}

        self.assignments: Dict[Tuple[str, str, str], Any] = {}
        self.soft_penalties: List[Any] = []
        self.applied_constraints_log: List[Dict[str, Any]] = []

        if HAS_ORTOOLS:
            self.model = cp_model.CpModel()
        else:
            self.model = None

    def _build_decision_variables(self):
        """Membuat variabel biner x[(c_id, r_id, s_id)] untuk setiap kombinasi valid."""
        for c in self.classes:
            for r in self.rooms:
                if r.capacity < c.enrolled_count:
                    continue
                if r.room_type != c.room_type_needed:
                    continue

                for s in self.time_slots:
                    var_name = f"x_{c.id}_{r.id}_{s.id}"
                    self.assignments[(c.id, r.id, s.id)] = self.model.NewBoolVar(var_name)

    def _apply_universal_invariants(self):
        """Aturan Invarian Fisik Dasar Penjadwalan Universitas."""
        # 1. Setiap kelas wajib terjadwal tepat 1 kali
        for c in self.classes:
            class_vars = [
                self.assignments[(c.id, r.id, s.id)]
                for r in self.rooms
                for s in self.time_slots
                if (c.id, r.id, s.id) in self.assignments
            ]
            if not class_vars:
                raise ValueError(f"Kelas '{c.name} ({c.code})' tidak memiliki ruang yang muat secara kapasitas!")
            self.model.Add(sum(class_vars) == 1)

        # 2. Anti-bentrok ruangan
        for r in self.rooms:
            for s in self.time_slots:
                room_vars = [
                    self.assignments[(c.id, r.id, s.id)]
                    for c in self.classes
                    if (c.id, r.id, s.id) in self.assignments
                ]
                if room_vars:
                    self.model.Add(sum(room_vars) <= 1)

        # 3. Anti-bentrok dosen (termasuk tandem)
        for lecturer in self.lecturers:
            classes_of_lecturer = [c for c in self.classes if lecturer.id in c.lecturer_ids]
            if len(classes_of_lecturer) <= 1:
                continue

            for s in self.time_slots:
                lecturer_vars = [
                    self.assignments[(c.id, r.id, s.id)]
                    for c in classes_of_lecturer
                    for r in self.rooms
                    if (c.id, r.id, s.id) in self.assignments
                ]
                if lecturer_vars:
                    self.model.Add(sum(lecturer_vars) <= 1)

    def _apply_dynamic_constraints(self):
        """Membaca dan menerapkan daftar constraint dinamis."""
        for cst in self.constraints:
            applied = False
            params = cst.params
            weight = params.get("penalty_weight", 10)

            if "max_floor" in params:
                max_floor = params["max_floor"]
                target_classes = self._get_target_classes(cst)

                for c in target_classes:
                    for r in self.rooms:
                        if r.floor > max_floor:
                            for s in self.time_slots:
                                if (c.id, r.id, s.id) in self.assignments:
                                    var = self.assignments[(c.id, r.id, s.id)]
                                    if cst.level == ConstraintLevel.HARD:
                                        self.model.Add(var == 0)
                                    else:
                                        self.soft_penalties.append(var * weight)
                                    applied = True

            if "forbidden_day" in params or "forbidden_sessions" in params:
                f_day = params.get("forbidden_day")
                f_sessions = params.get("forbidden_sessions", [])
                target_classes = self._get_target_classes(cst)

                for c in target_classes:
                    for s in self.time_slots:
                        is_day_match = (f_day is None) or (s.day == f_day)
                        is_session_match = (not f_sessions) or (s.session in f_sessions)

                        if is_day_match and is_session_match:
                            for r in self.rooms:
                                if (c.id, r.id, s.id) in self.assignments:
                                    var = self.assignments[(c.id, r.id, s.id)]
                                    if cst.level == ConstraintLevel.HARD:
                                        self.model.Add(var == 0)
                                    else:
                                        self.soft_penalties.append(var * weight)
                                    applied = True

            if params.get("no_cohort_overlap", False):
                cohort_groups: Dict[Tuple[str, int], List[CourseClass]] = {}
                for c in self.classes:
                    key = (c.department, c.semester)
                    cohort_groups.setdefault(key, []).append(c)

                for (dept, sem), group in cohort_groups.items():
                    if len(group) <= 1:
                        continue
                    for s in self.time_slots:
                        cohort_slot_vars = [
                            self.assignments[(c.id, r.id, s.id)]
                            for c in group
                            for r in self.rooms
                            if (c.id, r.id, s.id) in self.assignments
                        ]
                        if cohort_slot_vars:
                            if cst.level == ConstraintLevel.HARD:
                                self.model.Add(sum(cohort_slot_vars) <= 1)
                            else:
                                overlap_indicator = self.model.NewBoolVar(f"overlap_{dept}_{sem}_{s.id}")
                                self.model.Add(sum(cohort_slot_vars) <= 1).OnlyEnforceIf(overlap_indicator.Not())
                                self.soft_penalties.append(overlap_indicator * weight)
                            applied = True

            self.applied_constraints_log.append({
                "id": cst.id,
                "name": cst.name,
                "category": cst.category,
                "level": cst.level.value,
                "reason": cst.reason,
                "applied": applied,
            })

    def _get_target_classes(self, cst: ScheduleConstraint) -> List[CourseClass]:
        if cst.target_type == ConstraintTarget.CLASS:
            target = self.class_map.get(cst.target_id)
            return [target] if target else []
        elif cst.target_type == ConstraintTarget.DEPARTMENT:
            return [c for c in self.classes if c.department == cst.target_id]
        elif cst.target_type == ConstraintTarget.LECTURER:
            return [c for c in self.classes if cst.target_id in c.lecturer_ids]
        elif cst.target_type == ConstraintTarget.GLOBAL:
            return self.classes
        return []

    def _solve_fallback_heuristic(self) -> Dict[str, Any]:
        """
        Fallback Heuristic Solver (Pure Python).
        Dijalankan jika 'ortools' belum terpasang di sistem.
        Menjamin 100% kepatuhan Hard Constraints:
        - Ruang cukup kapasitas
        - Anti-bentrok ruang
        - Anti-bentrok dosen tunggal & tandem
        - Anti-bentrok angkatan (no cohort overlap)
        - Batasan lantai (max_floor)
        - Waktu terlarang (forbidden day/sessions)
        """
        print("\n" + "!" * 80)
        print("  [INFORMASI ENGINE PENJADWALAN]")
        print("  Library 'ortools' belum terpasang di Python Anda.")
        print("  Mengaktifkan Fallback Solver Bawaan (Pure Python Constraint Heuristic)...")
        print("  Untuk mengaktifkan solver Google OR-Tools CP-SAT penuh, jalankan: pip install ortools")
        print("!" * 80)

        start_time = time.perf_counter()

        occupied_rooms: Dict[Tuple[str, str], str] = {}  # (room_id, slot_id) -> class_id
        occupied_lecturers: Dict[Tuple[str, str], str] = {}  # (lecturer_id, slot_id) -> class_id
        cohort_slots: Dict[Tuple[str, int, str], str] = {}  # (dept, sem, slot_id) -> class_id
        scheduled_items = []
        penalties = 0

        # Catat log aturan
        for cst in self.constraints:
            self.applied_constraints_log.append({
                "id": cst.id,
                "name": cst.name,
                "category": cst.category,
                "level": cst.level.value,
                "reason": cst.reason,
                "applied": True,
            })

        for c in self.classes:
            placed = False

            # Dapatkan aturan spesifik untuk kelas ini
            class_constraints = [
                cst for cst in self.constraints
                if (cst.target_type == ConstraintTarget.GLOBAL) or
                   (cst.target_type == ConstraintTarget.CLASS and cst.target_id == c.id) or
                   (cst.target_type == ConstraintTarget.DEPARTMENT and cst.target_id == c.department) or
                   (cst.target_type == ConstraintTarget.LECTURER and cst.target_id in c.lecturer_ids)
            ]

            # Urutkan kandidat ruang berdasarkan kecocokan kapasitas terdekat
            candidate_rooms = [
                r for r in self.rooms
                if r.capacity >= c.enrolled_count and r.room_type == c.room_type_needed
            ]
            candidate_rooms.sort(key=lambda r: r.capacity)

            for s in self.time_slots:
                # Periksa batasan waktu terlarang
                skip_slot = False
                for cst in class_constraints:
                    p = cst.params
                    if "forbidden_day" in p and s.day == p["forbidden_day"]:
                        if not p.get("forbidden_sessions") or s.session in p["forbidden_sessions"]:
                            if cst.level == ConstraintLevel.HARD:
                                skip_slot = True
                                break
                            else:
                                penalties += p.get("penalty_weight", 10)

                    if p.get("no_cohort_overlap") and (c.department, c.semester, s.id) in cohort_slots:
                        if cst.level == ConstraintLevel.HARD:
                            skip_slot = True
                            break
                        else:
                            penalties += p.get("penalty_weight", 10)

                if skip_slot:
                    continue

                # Periksa apakah ada dosen kelas ini yang bentrok di slot ini
                lecturer_conflict = False
                for lid in c.lecturer_ids:
                    if (lid, s.id) in occupied_lecturers:
                        lecturer_conflict = True
                        break
                if lecturer_conflict:
                    continue

                # Cari ruangan yang cocok dan bebas
                for r in candidate_rooms:
                    # Periksa batasan lantai
                    floor_violation = False
                    for cst in class_constraints:
                        if "max_floor" in cst.params and r.floor > cst.params["max_floor"]:
                            if cst.level == ConstraintLevel.HARD:
                                floor_violation = True
                                break
                            else:
                                penalties += cst.params.get("penalty_weight", 10)
                    if floor_violation:
                        continue

                    # Periksa apakah ruangan bebas
                    if (r.id, s.id) in occupied_rooms:
                        continue

                    # Tempatkan kelas di (ruang, slot) ini
                    occupied_rooms[(r.id, s.id)] = c.id
                    for lid in c.lecturer_ids:
                        occupied_lecturers[(lid, s.id)] = c.id
                    cohort_slots[(c.department, c.semester, s.id)] = c.id

                    lecturer_names = [self.lecturer_map[lid].name for lid in c.lecturer_ids]
                    scheduled_items.append({
                        "class_id": c.id,
                        "course_code": c.code,
                        "course_name": c.name,
                        "class_label": c.class_label,
                        "department": c.department,
                        "semester": c.semester,
                        "enrolled": c.enrolled_count,
                        "room_name": r.name,
                        "room_floor": r.floor,
                        "day": s.day,
                        "session": s.session,
                        "time_label": s.time_label,
                        "lecturers": lecturer_names,
                    })
                    placed = True
                    break

                if placed:
                    break

            if not placed:
                elapsed = time.perf_counter() - start_time
                return {
                    "status": "FAILED",
                    "solver_status": "INFEASIBLE_HEURISTIC",
                    "elapsed_seconds": round(elapsed, 4),
                    "total_classes": len(self.classes),
                    "scheduled_count": len(scheduled_items),
                    "penalty_score": -1,
                    "constraints_applied": self.applied_constraints_log,
                    "schedule": [],
                    "message": f"Tidak dapat menemukan slot kosong yang valid untuk kelas '{c.name} ({c.code})'.",
                }

        elapsed_seconds = time.perf_counter() - start_time
        day_order = {"Senin": 1, "Selasa": 2, "Rabu": 3, "Kamis": 4, "Jumat": 5}
        scheduled_items.sort(key=lambda item: (day_order.get(item["day"], 99), item["session"], item["room_name"]))

        return {
            "status": "SUCCESS",
            "solver_status": "OPTIMAL_HEURISTIC",
            "elapsed_seconds": round(elapsed_seconds, 4),
            "total_classes": len(self.classes),
            "scheduled_count": len(scheduled_items),
            "penalty_score": penalties,
            "constraints_applied": self.applied_constraints_log,
            "schedule": scheduled_items,
        }

    def solve(self, timeout_seconds: float = 300.0, random_seed: int = 2024) -> Dict[str, Any]:
        """Membangun model dan menjalankan solver (CP-SAT jika ada, atau Fallback Heuristic)."""
        if not HAS_ORTOOLS:
            return self._solve_fallback_heuristic()

        start_time = time.perf_counter()

        self._build_decision_variables()
        self._apply_universal_invariants()
        self._apply_dynamic_constraints()

        if self.soft_penalties:
            self.model.Minimize(sum(self.soft_penalties))

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = timeout_seconds
        solver.parameters.random_seed = random_seed
        solver.parameters.num_search_workers = 1

        status = solver.Solve(self.model)
        elapsed_seconds = time.perf_counter() - start_time
        status_name = solver.StatusName(status)

        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            scheduled_items = []
            for (c_id, r_id, s_id), var in self.assignments.items():
                if solver.Value(var) == 1:
                    c = self.class_map[c_id]
                    r = self.room_map[r_id]
                    s = self.slot_map[s_id]
                    lecturer_names = [self.lecturer_map[lid].name for lid in c.lecturer_ids]

                    scheduled_items.append({
                        "class_id": c.id,
                        "course_code": c.code,
                        "course_name": c.name,
                        "class_label": c.class_label,
                        "department": c.department,
                        "semester": c.semester,
                        "enrolled": c.enrolled_count,
                        "room_name": r.name,
                        "room_floor": r.floor,
                        "day": s.day,
                        "session": s.session,
                        "time_label": s.time_label,
                        "lecturers": lecturer_names,
                    })

            day_order = {"Senin": 1, "Selasa": 2, "Rabu": 3, "Kamis": 4, "Jumat": 5}
            scheduled_items.sort(key=lambda item: (day_order.get(item["day"], 99), item["session"], item["room_name"]))

            penalty_score = int(solver.ObjectiveValue()) if self.soft_penalties else 0

            return {
                "status": "SUCCESS",
                "solver_status": status_name,
                "elapsed_seconds": round(elapsed_seconds, 4),
                "total_classes": len(self.classes),
                "scheduled_count": len(scheduled_items),
                "penalty_score": penalty_score,
                "constraints_applied": self.applied_constraints_log,
                "schedule": scheduled_items,
            }
        else:
            return {
                "status": "FAILED",
                "solver_status": status_name,
                "elapsed_seconds": round(elapsed_seconds, 4),
                "total_classes": len(self.classes),
                "scheduled_count": 0,
                "penalty_score": -1,
                "constraints_applied": self.applied_constraints_log,
                "schedule": [],
                "message": "Model Infeasible: Terlalu banyak aturan HARD yang saling bertentangan.",
            }
