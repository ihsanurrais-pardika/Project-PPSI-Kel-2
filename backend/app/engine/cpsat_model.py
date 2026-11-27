"""
Engine Model CP-SAT Penjadwalan Perkuliahan FTI.
Mengimplementasikan spesifikasi formal task.md:
- Section 3: Variabel Keputusan (y_c,r,s dan Optional Interval)
- Section 4: Batasan Keras (Hard Constraints 4.1 - 4.7)
- Section 5: Batasan Lunak (Soft Constraints 5.1 - 5.5 & Weighted Sum Objective)
"""

from typing import List, Dict, Tuple, Optional, Set
from collections import defaultdict
from ortools.sat.python import cp_model

from app.models.domain import (
    CourseClass,
    Room,
    TimeSlot,
    Lecturer,
    StudentGroup,
    ObjectiveWeights,
    RoomType,
)
from app.schemas.schedule_dto import (
    ScheduledClassOutput,
    PenaltyBreakdown,
)


class CPSATSchedulerModel:
    def __init__(
        self,
        courses: List[CourseClass],
        rooms: List[Room],
        slots: List[TimeSlot],
        lecturers: List[Lecturer],
        groups: List[StudentGroup],
        weights: Optional[ObjectiveWeights] = None,
    ):
        self.courses = courses
        self.rooms = rooms
        self.slots = slots
        self.lecturers = lecturers
        self.groups = groups
        self.weights = weights or ObjectiveWeights()

        # Inisialisasi lookup maps
        self.courses_map: Dict[str, CourseClass] = {c.id: c for c in courses}
        self.rooms_map: Dict[str, Room] = {r.id: r for r in rooms}
        self.slots_map: Dict[str, TimeSlot] = {s.id: s for s in slots}
        self.slots_by_index: Dict[int, TimeSlot] = {s.index: s for s in slots}
        self.lecturers_map: Dict[str, Lecturer] = {d.id: d for d in lecturers}
        self.groups_map: Dict[str, StudentGroup] = {g.id: g for g in groups}

        # Kelompokkan slot berdasarkan hari secara terurut
        self.slots_by_day: Dict[str, List[TimeSlot]] = defaultdict(list)
        for s in sorted(slots, key=lambda x: x.index):
            self.slots_by_day[s.day].append(s)

        # CP-SAT Model instance
        self.model = cp_model.CpModel()

        # Variabel keputusan
        # y[c_id, r_id, s_id] = 1 jika kelas c mulai di ruang r pada slot s
        self.y: Dict[Tuple[str, str, str], cp_model.IntVar] = {}
        self.class_assignments: Dict[str, List[cp_model.IntVar]] = defaultdict(list)
        self.room_slot_vars: Dict[Tuple[str, int], List[cp_model.IntVar]] = defaultdict(list)
        self.lect_slot_vars: Dict[Tuple[str, int], List[cp_model.IntVar]] = defaultdict(list)
        self.group_slot_vars: Dict[Tuple[str, int], List[cp_model.IntVar]] = defaultdict(list)
        self.lect_day_vars: Dict[Tuple[str, str], List[cp_model.IntVar]] = defaultdict(list)

        # Koleksi term penalti untuk batasan lunak
        self.gap_vars: List[cp_model.IntVar] = []
        self.pref_terms: List[Tuple[int, cp_model.IntVar]] = []
        self.u_spread_vars: List[cp_model.IntVar] = []
        self.waste_terms: List[Tuple[int, cp_model.IntVar]] = []

        self.is_built: bool = False

    def is_valid_start_slot(self, course: CourseClass, slot: TimeSlot) -> bool:
        """
        Batasan 4.6 (Day Boundary Constraint):
        Sesi berdurasi k_c tidak boleh melompati batas hari.
        Semua slot dari s.index hingga s.index + k_c - 1 harus ada dan berada di hari yang sama.
        """
        k = course.duration
        for offset in range(k):
            target_idx = slot.index + offset
            if target_idx not in self.slots_by_index:
                return False
            if self.slots_by_index[target_idx].day != slot.day:
                return False
        return True

    def is_room_eligible(self, course: CourseClass, room: Room) -> bool:
        """
        Batasan 4.5:
        1. Kapasitas: Cap_r >= Size_c
        2. Kesesuaian tipe: Kelas Lab wajib di Lab, Kelas Teori di Teori (ruang 'Umum' mendukung keduanya)
        """
        if room.capacity < course.size:
            return False
        if room.room_type != "Umum" and course.room_type != room.room_type:
            return False
        return True

    def is_lecturer_available(self, course: CourseClass, start_slot: TimeSlot) -> bool:
        """
        Batasan 4.7:
        Jika ada dosen pengampu yang unavailable pada salah satu slot rentang [s, s + k_c - 1],
        maka slot awal ini tidak valid.
        """
        occupied_slot_ids = [
            self.slots_by_index[start_slot.index + offset].id
            for offset in range(course.duration)
        ]
        for lect_id in course.lecturer_ids:
            lecturer = self.lecturers_map.get(lect_id)
            if not lecturer:
                continue
            for occ_slot_id in occupied_slot_ids:
                if occ_slot_id in lecturer.unavailable_slot_ids:
                    return False
        return True

    def build(self) -> None:
        """
        Membangun seluruh variabel keputusan, batasan keras, batasan lunak, dan fungsi objektif.
        Menggunakan formulasi diskrit linear yang efisien untuk kinerja optimal skala riil.
        """
        if self.is_built:
            return

        # -------------------------------------------------------------
        # 1. Inisialisasi Variabel Keputusan y[c, r, s] & Pemetaan Slot
        # -------------------------------------------------------------
        for c in self.courses:
            for r in self.rooms:
                if not self.is_room_eligible(c, r):
                    continue

                for s in self.slots:
                    if not self.is_valid_start_slot(c, s):
                        continue

                    if not self.is_lecturer_available(c, s):
                        continue

                    # Buat variabel biner y[c, r, s]
                    y_var = self.model.NewBoolVar(f"y_{c.id}_{r.id}_{s.id}")
                    self.y[c.id, r.id, s.id] = y_var
                    self.class_assignments[c.id].append(y_var)

                    # Petakan pendudukan slot untuk batasan keras dan indikator rombel
                    for offset in range(c.duration):
                        t_idx = s.index + offset
                        self.room_slot_vars[(r.id, t_idx)].append(y_var)
                        for d_id in c.lecturer_ids:
                            self.lect_slot_vars[(d_id, t_idx)].append(y_var)
                        for g_id in c.group_ids:
                            self.group_slot_vars[(g_id, t_idx)].append(y_var)

                    for d_id in c.lecturer_ids:
                        self.lect_day_vars[(d_id, s.day)].append(y_var)

        # -------------------------------------------------------------
        # 2. Batasan Keras (Hard Constraints)
        # -------------------------------------------------------------
        self._add_hard_constraints()

        # -------------------------------------------------------------
        # 3. Batasan Lunak & Fungsi Tujuan (Soft Constraints & Objective)
        # -------------------------------------------------------------
        self._add_soft_constraints_and_objective()

        self.is_built = True

    def _add_hard_constraints(self) -> None:
        """
        Penerapan Batasan Keras 4.1 - 4.4.
        (4.5, 4.6, 4.7 sudah dipenuhi pada tahap pemangkasan domain variabel).
        """
        # 4.1 Alokasi Tunggal: Setiap kelas c terjadwal persis 1 kali
        for c in self.courses:
            possible = self.class_assignments.get(c.id, [])
            if not possible:
                # Kelas ini tidak memiliki slot/ruang valid sama sekali
                dummy_false = self.model.NewBoolVar(f"impossible_class_{c.id}")
                self.model.Add(dummy_false == 1)
                self.model.Add(dummy_false == 0)
            else:
                self.model.Add(sum(possible) == 1)

        # 4.2 Larangan Tumpang Tindih Ruang (No Room Overlap)
        for r_vars in self.room_slot_vars.values():
            if len(r_vars) > 1:
                self.model.Add(sum(r_vars) <= 1)

        # 4.3 Larangan Bentrok Jadwal Dosen (No Lecturer Conflict)
        for l_vars in self.lect_slot_vars.values():
            if len(l_vars) > 1:
                self.model.Add(sum(l_vars) <= 1)

        # 4.4 Larangan Bentrok Jadwal Mahasiswa (No Student Group Conflict)
        for g_vars in self.group_slot_vars.values():
            if len(g_vars) > 1:
                self.model.Add(sum(g_vars) <= 1)

    def _add_soft_constraints_and_objective(self) -> None:
        """
        Penerapan Batasan Lunak 5.1 - 5.5:
        min Z = W1*P_Gap + W2*P_Pref + W3*P_Spread + W4*P_RoomWaste
        """
        # -------------------------------------------------------------
        # 5.1 Student Gap / Idle Time Penalty (P_Gap)
        # -------------------------------------------------------------
        for g in self.groups:
            for day, day_slots in self.slots_by_day.items():
                m = len(day_slots)
                if m <= 2:
                    continue  # Gap membutuhkan minimal 3 slot dalam sehari untuk terjadi jeda di tengah

                z_vars: List[cp_model.IntVar] = []
                for s in day_slots:
                    occupying_y = self.group_slot_vars.get((g.id, s.index), [])
                    if len(occupying_y) == 1:
                        z_vars.append(occupying_y[0])
                    elif len(occupying_y) > 1:
                        z_var = self.model.NewBoolVar(f"z_{g.id}_{s.id}")
                        self.model.Add(z_var == sum(occupying_y))
                        z_vars.append(z_var)
                    else:
                        z_vars.append(self.model.NewConstant(0))

                # Prefix & Suffix indicators: has_prev[i] dan has_next[i]
                # has_prev[i] = 1 jika ada kuliah di slot < i pada hari tersebut
                has_prev: List[cp_model.IntVar] = [self.model.NewConstant(0)]
                for i in range(1, m):
                    prev_ind = self.model.NewBoolVar(f"has_prev_{g.id}_{day_slots[i].id}")
                    # prev_ind = has_prev[i-1] OR z_vars[i-1]
                    self.model.AddMaxEquality(prev_ind, [has_prev[i - 1], z_vars[i - 1]])
                    has_prev.append(prev_ind)

                # has_next[i] = 1 jika ada kuliah di slot > i pada hari tersebut
                has_next: List[cp_model.IntVar] = [self.model.NewConstant(0)] * m
                for i in range(m - 2, -1, -1):
                    next_ind = self.model.NewBoolVar(f"has_next_{g.id}_{day_slots[i].id}")
                    # next_ind = has_next[i+1] OR z_vars[i+1]
                    self.model.AddMaxEquality(next_ind, [has_next[i + 1], z_vars[i + 1]])
                    has_next[i] = next_ind

                # Variabel gap[i] = 1 jika slot i kosong tapi ada kuliah sebelum dan sesudahnya:
                # gap >= has_prev + has_next - 1 - z
                for i in range(1, m - 1):
                    gap_var = self.model.NewBoolVar(f"gap_{g.id}_{day_slots[i].id}")
                    self.model.Add(gap_var >= has_prev[i] + has_next[i] - 1 - z_vars[i])
                    self.gap_vars.append(gap_var)

        # -------------------------------------------------------------
        # 5.2 Lecturer Time Preference Penalty (P_Pref)
        # -------------------------------------------------------------
        for (c_id, r_id, s_id), y_var in self.y.items():
            course = self.courses_map[c_id]
            start_slot = self.slots_map[s_id]

            total_pref_cost = 0
            for d_id in course.lecturer_ids:
                lect = self.lecturers_map.get(d_id)
                if not lect or not lect.time_preferences:
                    continue
                for offset in range(course.duration):
                    occ_slot = self.slots_by_index[start_slot.index + offset]
                    pref_weight = lect.time_preferences.get(occ_slot.id, 0)
                    total_pref_cost += pref_weight

            if total_pref_cost > 0:
                self.pref_terms.append((total_pref_cost, y_var))

        # -------------------------------------------------------------
        # 5.3 Lecturer Teaching Days Spread Penalty (P_Spread)
        # -------------------------------------------------------------
        # Mencegah dosen mengajar terlalu menyebar di banyak hari: u_d,h = 1 jika dosen d mengajar pada hari h
        for (d_id, day), day_y_vars in self.lect_day_vars.items():
            if day_y_vars:
                u_dh = self.model.NewBoolVar(f"u_{d_id}_{day}")
                self.model.AddMaxEquality(u_dh, day_y_vars)
                self.u_spread_vars.append(u_dh)

        # -------------------------------------------------------------
        # 5.4 Room Utilization / Waste Penalty (P_RoomWaste)
        # -------------------------------------------------------------
        # Menghindari alokasi ruang berkapasitas besar untuk kelas berukuran kecil
        for (c_id, r_id, s_id), y_var in self.y.items():
            course = self.courses_map[c_id]
            room = self.rooms_map[r_id]
            wasted_seats = room.capacity - course.size
            if wasted_seats > 0:
                self.waste_terms.append((wasted_seats, y_var))

        # -------------------------------------------------------------
        # 5.5 Formulasi Fungsi Tujuan Utama (Objective Minimization)
        # min Z = W1*P_Gap + W2*P_Pref + W3*P_Spread + W4*P_RoomWaste
        # -------------------------------------------------------------
        objective_expr = []

        if self.gap_vars and self.weights.w_gap > 0:
            objective_expr.append(self.weights.w_gap * sum(self.gap_vars))

        if self.pref_terms and self.weights.w_pref > 0:
            pref_sum = sum(cost * var for cost, var in self.pref_terms)
            objective_expr.append(self.weights.w_pref * pref_sum)

        if self.u_spread_vars and self.weights.w_spread > 0:
            objective_expr.append(self.weights.w_spread * sum(self.u_spread_vars))

        if self.waste_terms and self.weights.w_waste > 0:
            waste_sum = sum(w * var for w, var in self.waste_terms)
            objective_expr.append(self.weights.w_waste * waste_sum)

        if objective_expr:
            self.model.Minimize(sum(objective_expr))

    def extract_solution(
        self, solver: cp_model.CpSolver
    ) -> Tuple[List[ScheduledClassOutput], PenaltyBreakdown]:
        """
        Mengekstrak hasil pemecahan solver menjadi struktur DTO.
        """
        scheduled_classes: List[ScheduledClassOutput] = []

        for (c_id, r_id, s_id), y_var in self.y.items():
            if solver.Value(y_var) == 1:
                course = self.courses_map[c_id]
                room = self.rooms_map[r_id]
                start_slot = self.slots_map[s_id]

                # Kumpulkan semua slot yang ditempati
                occupied_slots = [
                    self.slots_by_index[start_slot.index + offset]
                    for offset in range(course.duration)
                ]
                end_slot = occupied_slots[-1]

                lect_names = [
                    self.lecturers_map[d_id].name
                    for d_id in course.lecturer_ids
                    if d_id in self.lecturers_map
                ]
                group_names = [
                    self.groups_map[g_id].name
                    for g_id in course.group_ids
                    if g_id in self.groups_map
                ]

                # Ambil format waktu awal & akhir berdasarkan SKS (50 menit/SKS)
                start_time_label = start_slot.time_label.split("-")[0].strip()
                end_time_label = end_slot.time_label.split("-")[-1].strip()
                try:
                    s_parts = start_time_label.split(":")
                    if len(s_parts) == 2:
                        sh, sm = int(s_parts[0]), int(s_parts[1])
                        total_end_min = sh * 60 + sm + (course.sks * 50)
                        end_time_label = f"{total_end_min // 60:02d}:{total_end_min % 60:02d}"
                except Exception:
                    pass

                scheduled_classes.append(
                    ScheduledClassOutput(
                        class_id=course.id,
                        course_code=course.code,
                        course_name=course.name,
                        class_label=course.class_label,
                        department=course.department,
                        semester=course.semester,
                        size=course.size,
                        duration=course.duration,
                        sks=course.sks,
                        room_id=room.id,
                        room_name=room.name,
                        room_capacity=room.capacity,
                        room_type=room.room_type,
                        floor=room.floor,
                        day=start_slot.day,
                        start_slot_index=start_slot.index,
                        end_slot_index=end_slot.index,
                        start_time=start_time_label,
                        end_time=end_time_label,
                        slot_ids=[s.id for s in occupied_slots],
                        lecturer_names=lect_names,
                        group_names=group_names,
                    )
                )

        # Urutkan jadwal berdasarkan hari dan slot index
        day_order = {"Senin": 1, "Selasa": 2, "Rabu": 3, "Kamis": 4, "Jumat": 5}
        scheduled_classes.sort(
            key=lambda item: (day_order.get(item.day, 99), item.start_slot_index, item.room_name)
        )

        # Hitung rincian penalti yang sebenarnya
        gap_val = sum(solver.Value(v) for v in self.gap_vars) if self.gap_vars else 0
        pref_val = (
            sum(cost * solver.Value(var) for cost, var in self.pref_terms)
            if self.pref_terms
            else 0
        )
        spread_val = (
            sum(solver.Value(v) for v in self.u_spread_vars) if self.u_spread_vars else 0
        )
        waste_val = (
            sum(w * solver.Value(var) for w, var in self.waste_terms)
            if self.waste_terms
            else 0
        )

        total_weighted = (
            self.weights.w_gap * gap_val
            + self.weights.w_pref * pref_val
            + self.weights.w_spread * spread_val
            + self.weights.w_waste * waste_val
        )

        breakdown = PenaltyBreakdown(
            gap_penalty=gap_val,
            pref_penalty=pref_val,
            spread_penalty=spread_val,
            waste_penalty=waste_val,
            total_weighted_penalty=total_weighted,
        )

        return scheduled_classes, breakdown
