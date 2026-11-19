import time
from typing import List, Dict, Any, Tuple
from ortools.sat.python import cp_model
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
    Tidak ada aturan khusus yang di-hardcode ke dalam kelas/ruang.
    Solver membaca daftar ScheduleConstraint dan menerapkan aturan secara dinamis
    berdasarkan levelnya (HARD = wajib 100%, SOFT = minimasi penalti).
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

        self.model = cp_model.CpModel()
        self.assignments: Dict[Tuple[str, str, str], cp_model.IntVar] = {}
        self.soft_penalties: List[cp_model.LinearExpr] = []
        self.applied_constraints_log: List[Dict[str, Any]] = []

    def _build_decision_variables(self):
        """Membuat variabel biner x[(c_id, r_id, s_id)] untuk setiap kombinasi valid."""
        for c in self.classes:
            for r in self.rooms:
                # Filter dasar fisik: ruang harus mencukupi kapasitas kelas
                if r.capacity < c.enrolled_count:
                    continue
                # Filter tipe ruang: teori vs lab
                if r.room_type != c.room_type_needed:
                    continue

                for s in self.time_slots:
                    var_name = f"x_{c.id}_{r.id}_{s.id}"
                    self.assignments[(c.id, r.id, s.id)] = self.model.NewBoolVar(var_name)

    def _apply_universal_invariants(self):
        """
        Aturan Invarian Fisik Dasar Penjadwalan Universitas:
        1. Setiap kelas tepat terjadwal 1 kali
        2. Satu ruangan pada satu waktu maksimal 1 kelas
        3. Seorang dosen (utama/tandem) maksimal mengajar 1 kelas pada satu waktu
        """
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

        # 2. Anti-bentrok ruangan (1 ruang hanya bisa diisi 1 kelas di slot yang sama)
        for r in self.rooms:
            for s in self.time_slots:
                room_vars = [
                    self.assignments[(c.id, r.id, s.id)]
                    for c in self.classes
                    if (c.id, r.id, s.id) in self.assignments
                ]
                if room_vars:
                    self.model.Add(sum(room_vars) <= 1)

        # 3. Anti-bentrok dosen (termasuk dosen tandem/tim pengajar)
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
        """
        Membaca dan menerapkan daftar constraint dinamis berdasarkan status:
        - Jika HARD: Menambahkan aturan model.Add() yang mutlak wajib terpenuhi.
        - Jika SOFT: Menambahkan variabel penalti ke fungsi objektif minimasi penalti.
        """
        for cst in self.constraints:
            applied = False
            params = cst.params
            weight = params.get("penalty_weight", 10)  # Bobot default penalti jika status SOFT

            # ── JENIS 1: Batasan Lantai / Aksesibilitas Ruangan (max_floor) ────
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
                                        # HARD: Kunci mati ke 0
                                        self.model.Add(var == 0)
                                    else:
                                        # SOFT: Tambah penalti jika terpaksa di lantai atas
                                        self.soft_penalties.append(var * weight)
                                    applied = True

            # ── JENIS 2: Waktu Terlarang (forbidden_day / forbidden_sessions) ─
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

            # ── JENIS 3: Anti-Bentrok Angkatan / Cohort ───────────────────────
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
                                # Jika soft: penalti jika lebih dari 1 kelas angkatan di jam sama
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
        """Menentukan kelas mana saja yang terkena aturan berdasarkan target_type."""
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

    def solve(self, timeout_seconds: float = 300.0, random_seed: int = 2024) -> Dict[str, Any]:
        """Membangun model dan menjalankan solver."""
        start_time = time.perf_counter()

        # 1. Bangun variabel dan pasang aturan
        self._build_decision_variables()
        self._apply_universal_invariants()
        self._apply_dynamic_constraints()

        # 2. Pasang fungsi objektif: Minimalkan penalti dari soft constraints
        if self.soft_penalties:
            self.model.Minimize(sum(self.soft_penalties))

        # 3. Konfigurasi Solver CP-SAT
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = timeout_seconds
        solver.parameters.random_seed = random_seed
        solver.parameters.num_search_workers = 1  # Deterministik

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
