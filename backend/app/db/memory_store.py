"""
In-Memory Store untuk Pengelolaan Kelas Perkuliahan FTI Tanpa Database.
Membaca dataset resmi classes_fti_ganjil_2026-v2.csv dan memfasilitasi penyesuaian kelas (CRUD),
manajemen ruangan FTI, dan penjadwalan terpadu dengan engine CP-SAT.
"""

import os
import csv
from typing import List, Dict, Optional, Any

from app.core.config import ROOT_DIR
from app.models.domain import (
    CourseClass,
    Room,
    TimeSlot,
    Lecturer,
    StudentGroup,
    ObjectiveWeights,
    SolverConfig,
    RoomType,
)
from app.engine.scheduler import CPSATSchedulerService
from app.schemas.class_dto import ClassItem
from app.schemas.schedule_dto import SolverResultOutput
from app.engine.manual_schedule import (
    ScheduleConflictException,
    evaluate_move_conflicts,
    evaluate_swap_conflicts,
    minutes_to_hhmm,
    normalize_day_name,
    parse_time_to_minutes,
    plan_autofix_moves,
    scan_schedule_issues,
)


class InMemoryDataStore:
    def __init__(self, csv_filename: str = "classes_fti_ganjil_2026-v2.csv"):
        self.csv_filename = csv_filename
        self.classes: Dict[str, ClassItem] = {}
        self.rooms: List[Room] = []
        self.slots: List[TimeSlot] = []
        self.lecturers: Dict[str, Lecturer] = {}
        self.groups: Dict[str, StudentGroup] = {}
        self.latest_schedule_result: Optional[SolverResultOutput] = None
        self.accepted_soft_keys: set[str] = set()

        self._init_rooms()
        self._init_slots()
        self.load_from_csv()

    def _find_csv_path(self) -> Optional[str]:
        candidates = [
            os.path.join(str(ROOT_DIR), self.csv_filename),
            os.path.join(os.getcwd(), self.csv_filename),
        ]
        for p in candidates:
            if os.path.exists(p):
                return p
        return None

    def _init_rooms(self):
        """Inisialisasi inventaris ruangan resmi FTI."""
        self.rooms = [
            # Lantai 1 (Aksesibel / Ramah Disabilitas)
            Room(id="r-101", name="G-101 (Teori)", capacity=60, room_type=RoomType.TEORI.value, floor=1, features=["AC", "Proyektor", "Akses Datar"]),
            Room(id="r-102", name="G-102 (Teori Besar)", capacity=70, room_type=RoomType.TEORI.value, floor=1, features=["Dual Proyektor", "AC", "Akses Datar"]),
            Room(id="r-lab-soft-1", name="Lab Software 1 (Lab Terpadu)", capacity=50, room_type=RoomType.LAB.value, floor=1, features=["50 PC Workstation", "LAN Gigabit", "AC"]),
            Room(id="r-lab-soft-2", name="Lab Software 2", capacity=50, room_type=RoomType.LAB.value, floor=1, features=["50 PC Workstation", "AC"]),
            Room(id="r-lab-dasar", name="Lab Komputer Dasar FTI", capacity=60, room_type=RoomType.LAB.value, floor=1, features=["60 PC Workstation", "AC", "Dual Proyektor"]),

            # Lantai 2
            Room(id="r-201", name="G-201 (Teori)", capacity=60, room_type=RoomType.TEORI.value, floor=2, features=["AC", "Proyektor"]),
            Room(id="r-202", name="G-202 (Teori)", capacity=55, room_type=RoomType.TEORI.value, floor=2, features=["AC", "Proyektor"]),
            Room(id="r-203", name="G-203 (Teori Multimedia)", capacity=50, room_type=RoomType.TEORI.value, floor=2, features=["Smart TV", "AC"]),
            Room(id="r-204", name="G-204 (Teori Standar)", capacity=55, room_type=RoomType.TEORI.value, floor=2, features=["AC", "Proyektor"]),
            Room(id="r-205", name="G-205 (Teori)", capacity=45, room_type=RoomType.TEORI.value, floor=2, features=["AC", "Proyektor"]),
            Room(id="r-sem-fti", name="Seminar FTI", capacity=100, room_type=RoomType.TEORI.value, floor=2, features=["Hybrid Conference", "AC Sentral"]),

            # Lantai 3
            Room(id="r-301", name="G-301 (Ruang Teater)", capacity=75, room_type=RoomType.TEORI.value, floor=3, features=["Sound System", "AC"]),
            Room(id="r-302", name="G-302 (Teori)", capacity=60, room_type=RoomType.TEORI.value, floor=3, features=["AC", "Proyektor"]),
            Room(id="r-303", name="G-303 (Teori)", capacity=50, room_type=RoomType.TEORI.value, floor=3, features=["AC", "Proyektor"]),
            Room(id="r-lab-hard-1", name="Lab Hardware & IoT", capacity=50, room_type=RoomType.LAB.value, floor=3, features=["Workbench", "Kit IoT", "Oscilloscope"]),
            Room(id="r-lab-jarkom", name="Lab Jaringan & Cloud", capacity=50, room_type=RoomType.LAB.value, floor=3, features=["Router Cisco", "Server Rack", "AC"]),
        ]

    def _init_slots(self):
        """Inisialisasi 30 slot waktu diskrit (5 Hari x 6 Slot)."""
        days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]
        time_labels = [
            "07:30 - 09:10",
            "09:10 - 10:50",
            "10:00 - 11:40",
            "11:10 - 12:50",
            "13:30 - 15:10",
            "16:00 - 17:40",
        ]
        self.slots = []
        idx = 0
        for day in days:
            for d_idx, label in enumerate(time_labels):
                self.slots.append(
                    TimeSlot(
                        id=f"slot_{day[:3].lower()}_{d_idx+1}",
                        index=idx,
                        day=day,
                        daily_index=d_idx,
                        time_label=label,
                    )
                )
                idx += 1

    def load_from_csv(self) -> int:
        """Membaca file CSV dan memuat seluruh kelas ke memory."""
        csv_path = self._find_csv_path()
        if not csv_path:
            return 0

        self.classes.clear()
        self.lecturers.clear()
        self.groups.clear()

        with open(csv_path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                c_id = row.get("id", "").strip()
                if not c_id:
                    continue

                l_ids = [x.strip() for x in row.get("lecturer_ids", "").split(";") if x.strip()]
                l_names = [x.strip() for x in row.get("lecturer_names", "").split("/") if x.strip()]
                if not l_names and row.get("lecturer_names"):
                    l_names = [row["lecturer_names"].strip()]

                # Catat Dosen
                for lid, lname in zip(l_ids, l_names):
                    if lid not in self.lecturers:
                        self.lecturers[lid] = Lecturer(
                            id=lid,
                            name=lname,
                            department=row.get("department", "FTI"),
                        )
                # Sisanya jika l_ids lebih banyak
                for lid in l_ids:
                    if lid not in self.lecturers:
                        self.lecturers[lid] = Lecturer(
                            id=lid,
                            name=lid,
                            department=row.get("department", "FTI"),
                        )

                # Catat Rombel
                r_key = row.get("rombel_key", "").strip()
                if r_key and r_key not in self.groups:
                    self.groups[r_key] = StudentGroup(
                        id=r_key,
                        name=f"Rombel {r_key}",
                        department=row.get("department", "FTI"),
                        semester=int(row.get("semester", 1)),
                    )

                item = ClassItem(
                    id=c_id,
                    course_code=row.get("course_code", "").strip(),
                    department=row.get("department", "").strip(),
                    semester=int(row.get("semester", 1)),
                    name=row.get("name", "").strip(),
                    class_label=row.get("class_label", "").strip(),
                    sks=int(row.get("sks", 2)),
                    enrolled_count=int(row.get("enrolled_count", 40)),
                    enrolled_is_estimated=row.get("enrolled_is_estimated", "").lower() == "true",
                    room_type_needed=row.get("room_type_needed", "Teori").strip(),
                    is_mandatory=row.get("is_mandatory", "").lower() == "true",
                    is_elective=row.get("is_elective", "").lower() == "true",
                    rombel_key=r_key,
                    requires_room=row.get("requires_room", "true").lower() == "true",
                    requires_accessibility=row.get("requires_accessibility", "").lower() == "true",
                    is_transition_course=row.get("is_transition_course", "").lower() == "true",
                    lecturer_ids=l_ids,
                    lecturer_names=l_names,
                )
                self.classes[c_id] = item

        return len(self.classes)

    def get_classes(
        self,
        department: Optional[str] = None,
        semester: Optional[int] = None,
        search: Optional[str] = None,
        room_type: Optional[str] = None,
    ) -> List[ClassItem]:
        result = list(self.classes.values())

        if department:
            dept_upper = department.upper()
            dept_map = {
                "SISTEM INFORMASI": "SI",
                "TEKNIK INFORMATIKA": "IF",
                "INFORMATIKA": "IF",
                "TEKNIK KOMPUTER": "TK",
                "SI": "SI",
                "IF": "IF",
                "TK": "TK",
            }
            target_code = dept_map.get(dept_upper, dept_upper)
            result = [c for c in result if c.department.upper() == target_code]

        if semester:
            result = [c for c in result if c.semester == semester]

        if room_type:
            result = [c for c in result if c.room_type_needed.lower() == room_type.lower()]

        if search:
            q = search.lower()
            result = [
                c for c in result
                if q in c.course_code.lower()
                or q in c.name.lower()
                or q in c.class_label.lower()
                or any(q in l.lower() for l in c.lecturer_names)
            ]

        # Urutkan berdasarkan prodi, semester, kode MK, kelas
        result.sort(key=lambda x: (x.department, x.semester, x.course_code, x.class_label))
        return result

    def get_class(self, class_id: str) -> Optional[ClassItem]:
        return self.classes.get(class_id)

    def add_class(self, item: ClassItem) -> ClassItem:
        self.classes[item.id] = item
        return item

    def update_class(self, class_id: str, updates: Dict[str, Any]) -> Optional[ClassItem]:
        """Menyesuaikan data kelas (F-14 / F-15)."""
        item = self.classes.get(class_id)
        if not item:
            return None

        data = item.model_dump()
        for k, v in updates.items():
            if k in data and v is not None:
                data[k] = v

        updated_item = ClassItem(**data)
        self.classes[class_id] = updated_item
        return updated_item

    def delete_class(self, class_id: str) -> bool:
        if class_id in self.classes:
            del self.classes[class_id]
            return True
        return False

    def reset_to_csv(self) -> int:
        return self.load_from_csv()

    def get_rooms(self) -> List[Room]:
        return self.rooms

    def get_slots(self) -> List[TimeSlot]:
        return self.slots

    def get_lecturers(self) -> List[Lecturer]:
        return list(self.lecturers.values())

    def get_groups(self) -> List[StudentGroup]:
        return list(self.groups.values())

    def solve_cpsat(
        self,
        department: Optional[str] = None,
        max_classes: Optional[int] = None,
        weights: Optional[ObjectiveWeights] = None,
        config: Optional[SolverConfig] = None,
    ) -> SolverResultOutput:
        """
        Menjalankan engine CP-SAT langsung dari data in-memory.
        100% CP-SAT murni, TANPA Database, TANPA Algoritma Genetika.
        """
        # Saring kelas yang membutuhkan ruangan
        filtered_classes = [c for c in self.classes.values() if c.requires_room]

        if department:
            dept_map = {
                "SISTEM INFORMASI": "SI",
                "TEKNIK INFORMATIKA": "IF",
                "INFORMATIKA": "IF",
                "TEKNIK KOMPUTER": "TK",
                "SI": "SI",
                "IF": "IF",
                "TK": "TK",
            }
            dept_code = dept_map.get(department.upper(), department.upper())
            filtered_classes = [c for c in filtered_classes if c.department.upper() == dept_code]

        if max_classes and len(filtered_classes) > max_classes:
            filtered_classes = filtered_classes[:max_classes]

        # Konversi ke CourseClass domain models
        course_classes: List[CourseClass] = []
        for c in filtered_classes:
            # Durasi: Di FTI, 1 SKS lab = 1 slot (100m) atau 2 SKS teori = 1-2 slot
            # Untuk menjaga keterjadwalan yang pas, SKS 1-2 = 1 slot; SKS 3-4 = 2 slot
            slot_duration = 2 if c.sks >= 3 else 1

            r_type = RoomType.LAB.value if "lab" in c.room_type_needed.lower() else RoomType.TEORI.value

            course_classes.append(
                CourseClass(
                    id=c.id,
                    code=c.course_code,
                    name=c.name,
                    class_label=c.class_label,
                    department=c.department,
                    semester=c.semester,
                    size=c.enrolled_count,
                    duration=slot_duration,
                    lecturer_ids=c.lecturer_ids if c.lecturer_ids else [f"lect_{c.id}"],
                    group_ids=[c.rombel_key] if c.rombel_key else [f"group_{c.department}_{c.semester}"],
                    sks=c.sks,
                    room_type=r_type,
                    is_mandatory=c.is_mandatory,
                )
            )

        # Siapkan service CP-SAT
        cfg = config or SolverConfig(
            max_time_in_seconds=30.0,
            num_search_workers=8,
            linearization_level=0,
            search_branching="PORTFOLIO_SEARCH",
        )
        wt = weights or ObjectiveWeights(w_gap=10, w_pref=4, w_spread=3, w_waste=1)

        # Lengkapi lecturer dan group records untuk kelas-kelas ini
        needed_lecturers: Dict[str, Lecturer] = {}
        needed_groups: Dict[str, StudentGroup] = {}

        for cc in course_classes:
            for lid in cc.lecturer_ids:
                if lid in self.lecturers:
                    needed_lecturers[lid] = self.lecturers[lid]
                else:
                    needed_lecturers[lid] = Lecturer(id=lid, name=lid, department=cc.department)
            for gid in cc.group_ids:
                if gid in self.groups:
                    needed_groups[gid] = self.groups[gid]
                else:
                    needed_groups[gid] = StudentGroup(id=gid, name=gid, department=cc.department, semester=cc.semester)

        scheduler = CPSATSchedulerService(config=cfg, weights=wt)
        result = scheduler.solve(
            courses=course_classes,
            rooms=self.rooms,
            slots=self.slots,
            lecturers=list(needed_lecturers.values()),
            groups=list(needed_groups.values()),
        )

        self.latest_schedule_result = result
        return result

    def _build_schedule_snapshot(self) -> List[Dict[str, Any]]:
        if not self.latest_schedule_result or not self.latest_schedule_result.schedule:
            return []
        snapshot: List[Dict[str, Any]] = []
        for idx, sc in enumerate(self.latest_schedule_result.schedule):
            cls = self.classes.get(sc.class_id)
            snapshot.append(
                {
                    "item_id": sc.class_id,
                    "jadwal_id": sc.jadwal_id if sc.jadwal_id is not None else idx + 1,
                    "course_code": sc.course_code,
                    "course_name": sc.course_name,
                    "class_label": sc.class_label,
                    "student_count": sc.size,
                    "room_id": str(sc.room_id),
                    "room_name": sc.room_name,
                    "room_capacity": int(sc.room_capacity),
                    "day": normalize_day_name(sc.day),
                    "start_min": parse_time_to_minutes(sc.start_time),
                    "end_min": parse_time_to_minutes(sc.end_time),
                    "lecturer_names": list(sc.lecturer_names or []),
                    "rombel_key": (sc.group_names[0] if sc.group_names else (cls.rombel_key if cls else "")),
                    "is_mandatory": (cls.is_mandatory if cls else True),
                    "sks": int(sc.sks or 2),
                }
            )
        return snapshot

    def _find_schedule_entry(self, item_key: str):
        if not self.latest_schedule_result:
            return None
        key_str = str(item_key)
        for idx, sc in enumerate(self.latest_schedule_result.schedule):
            jid = str(sc.jadwal_id) if sc.jadwal_id is not None else str(idx + 1)
            if sc.class_id == key_str or jid == key_str:
                return sc
        return None

    def update_schedule_item(
        self,
        jadwal_id: str,
        day: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        room_id: Optional[str] = None,
        sks: Optional[int] = None,
        reason: Optional[str] = None,
        actor_role: Optional[str] = "admin",
        actor_email: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        if actor_role and actor_role.strip().lower() not in ("admin", "superadmin"):
            raise PermissionError("Hanya Admin yang diizinkan mengubah jadwal secara manual.")
        sc = self._find_schedule_entry(str(jadwal_id))
        if not sc:
            return None

        snapshot = self._build_schedule_snapshot()
        target = next((it for it in snapshot if it["item_id"] == sc.class_id), None)
        if not target:
            return None

        new_day = normalize_day_name(day or target["day"])
        new_start_min = parse_time_to_minutes(start_time) if start_time else int(target["start_min"])
        if end_time:
            new_end_min = parse_time_to_minutes(end_time)
        elif sks is not None:
            new_end_min = new_start_min + max(1, int(sks)) * 50
        else:
            new_end_min = new_start_min + max(50, int(target["end_min"]) - int(target["start_min"]))

        room_obj = next((r for r in self.rooms if str(r.id) == str(room_id or sc.room_id) or r.name == str(room_id)), None)
        if not room_obj:
            raise ValueError(f"Ruangan dengan ID {room_id} tidak ditemukan.")

        conflicts = evaluate_move_conflicts(
            target=target,
            target_day=new_day,
            target_start_min=new_start_min,
            target_end_min=new_end_min,
            target_room_id=room_obj.id,
            target_room_name=room_obj.name,
            target_room_capacity=room_obj.capacity,
            items=snapshot,
            ignore_ids={sc.class_id},
        )
        if conflicts:
            raise ScheduleConflictException(conflicts[0]["reason"], conflicts)

        sc.day = new_day
        sc.start_time = minutes_to_hhmm(new_start_min)
        sc.end_time = minutes_to_hhmm(new_end_min)
        sc.room_id = room_obj.id
        sc.room_name = room_obj.name
        sc.room_capacity = room_obj.capacity
        sc.floor = room_obj.floor
        if sks is not None:
            sc.sks = int(sks)

        return {
            "message": "Jadwal kelas berhasil diperbarui tanpa bentrok.",
            "jadwal_id": sc.class_id,
            "day": sc.day,
            "start_time": sc.start_time,
            "end_time": sc.end_time,
            "room_id": sc.room_id,
            "room_name": sc.room_name,
        }

    def swap_schedule_items(
        self,
        jadwal_id_a: str,
        jadwal_id_b: str,
        a_sks: Optional[int] = None,
        reason: Optional[str] = None,
        actor_role: Optional[str] = "admin",
        actor_email: Optional[str] = None,
    ) -> Dict[str, Any]:
        if actor_role and actor_role.strip().lower() not in ("admin", "superadmin"):
            raise PermissionError("Hanya Admin yang diizinkan melakukan pertukaran jadwal.")
        sc_a = self._find_schedule_entry(str(jadwal_id_a))
        sc_b = self._find_schedule_entry(str(jadwal_id_b))
        if not sc_a or not sc_b:
            raise LookupError("Salah satu jadwal yang akan ditukar tidak ditemukan.")
        if sc_a.class_id == sc_b.class_id:
            raise ValueError("Pilih dua kelas berbeda untuk ditukar jadwalnya.")

        snapshot = self._build_schedule_snapshot()
        item_a = next((it for it in snapshot if it["item_id"] == sc_a.class_id), None)
        item_b = next((it for it in snapshot if it["item_id"] == sc_b.class_id), None)
        assert item_a is not None and item_b is not None

        swap_eval = evaluate_swap_conflicts(item_a, item_b, snapshot, a_sks_override=a_sks)
        if not swap_eval["is_safe"]:
            raise ScheduleConflictException(swap_eval["all_conflicts"][0]["reason"], swap_eval["all_conflicts"])

        a_new = swap_eval["a_new"]
        b_new = swap_eval["b_new"]
        orig_room_a = (sc_a.room_id, sc_a.room_name, sc_a.room_capacity, sc_a.floor)
        orig_room_b = (sc_b.room_id, sc_b.room_name, sc_b.room_capacity, sc_b.floor)

        sc_a.day = a_new["day"]
        sc_a.start_time = a_new["start_time"]
        sc_a.end_time = a_new["end_time"]
        sc_a.room_id, sc_a.room_name, sc_a.room_capacity, sc_a.floor = orig_room_b
        if a_sks is not None:
            sc_a.sks = int(a_sks)

        sc_b.day = b_new["day"]
        sc_b.start_time = b_new["start_time"]
        sc_b.end_time = b_new["end_time"]
        sc_b.room_id, sc_b.room_name, sc_b.room_capacity, sc_b.floor = orig_room_a

        return {
            "message": (
                f"Pertukaran jadwal {sc_a.course_name} ({sc_a.class_label}) "
                f"dan {sc_b.course_name} ({sc_b.class_label}) berhasil disimpan."
            ),
            "a": a_new,
            "b": b_new,
        }

    def get_validation_report(self, version_id: Optional[int] = None) -> Dict[str, Any]:
        snapshot = self._build_schedule_snapshot()
        for sc, it in zip(self.latest_schedule_result.schedule if self.latest_schedule_result else [], snapshot):
            it["building"] = sc.building or f"Gedung Lt.{sc.floor}"
            it["department"] = sc.department
        room_rows = [
            {
                "id": r.id,
                "name": r.name,
                "capacity": r.capacity,
                "building": f"Gedung Lt.{r.floor}",
            }
            for r in self.rooms
        ]
        scanned = scan_schedule_issues(snapshot, room_rows, include_suggestions=True)
        formatted_issues: List[Dict[str, Any]] = []
        for idx, iss in enumerate(scanned):
            soft_key = f"{iss['jenis_bentrok']}:{iss['id_1']}:{iss['id_2']}"
            is_ignored = iss["severity"] == "soft" and soft_key in self.accepted_soft_keys
            formatted_issues.append(
                {
                    "id": soft_key,
                    "conflict_id": idx + 1,
                    "jenis_bentrok": iss["jenis_bentrok"],
                    "type_label": iss["type_label"],
                    "severity": iss["severity"],
                    "title": iss["title"],
                    "description": iss["description"],
                    "recommendation": iss["recommendation"],
                    "status_bentrok": "TOLERANSI_DITERIMA" if is_ignored else "TERDETEKSI",
                    "is_resolved": is_ignored,
                    "can_ignore": iss["severity"] == "soft",
                    "item_1": iss["item_1"],
                    "item_2": iss["item_2"],
                    "suggestions": [] if is_ignored else iss["suggestions"],
                }
            )
        hard_cnt = sum(1 for x in formatted_issues if x["severity"] == "hard" and not x["is_resolved"])
        soft_cnt = sum(1 for x in formatted_issues if x["severity"] == "soft" and not x["is_resolved"])
        resolved_cnt = sum(1 for x in formatted_issues if x["is_resolved"])
        sched_cnt = len(snapshot)
        total_active = len([c for c in self.classes.values() if c.requires_room]) or sched_cnt
        res = self.latest_schedule_result
        return {
            "version_id": res.version_id if res else None,
            "version_number": res.version_number if res else 1,
            "tahap": res.tahap if res else "DRAFT_ADMIN",
            "status_versi": res.status_versi if res else "DRAFT",
            "approval_status": res.approval_status if res else "Menunggu Persetujuan",
            "semester_label": res.semester_label if res else "2026/2027 Ganjil",
            "summary": {
                "total_active_classes": total_active,
                "scheduled_classes": sched_cnt,
                "unassigned_count": max(0, total_active - sched_cnt) if sched_cnt > 0 else 0,
                "hard_conflicts_count": hard_cnt,
                "soft_warnings_count": soft_cnt,
                "unresolved_total": hard_cnt + soft_cnt,
                "resolved_count": resolved_cnt,
                "total_penalty": res.penalty_breakdown.total_weighted_penalty if res else 0,
                "compliance_pct": round(((sched_cnt - hard_cnt) / max(1, sched_cnt)) * 100.0, 1) if sched_cnt else 100.0,
            },
            "issues": formatted_issues,
        }

    def resolve_validation_issue(
        self,
        conflict_id: str | int,
        decision: str = "TOLERANSI_DITERIMA",
        actor_role: Optional[str] = "admin",
        actor_email: Optional[str] = None,
    ) -> Dict[str, Any]:
        if actor_role and actor_role.strip().lower() not in ("admin", "superadmin"):
            raise PermissionError("Hanya Admin yang dapat menindaklanjuti validasi konflik.")
        report = self.get_validation_report()
        target = next(
            (x for x in report["issues"] if str(x["conflict_id"]) == str(conflict_id) or str(x["id"]) == str(conflict_id)),
            None,
        )
        if not target:
            raise LookupError("Catatan konflik tidak ditemukan.")
        if target["severity"] == "hard":
            raise ValueError("Bentrok mutlak tidak dapat diabaikan. Pindahkan atau tukar salah satu jadwal.")
        self.accepted_soft_keys.add(str(target["id"]))
        refreshed = self.get_validation_report()
        refreshed["message"] = "Peringatan ringan berhasil ditandai sudah ditinjau."
        return refreshed

    def auto_fix_conflicts(
        self,
        version_id: Optional[int] = None,
        actor_role: Optional[str] = "admin",
        actor_email: Optional[str] = None,
    ) -> Dict[str, Any]:
        if actor_role and actor_role.strip().lower() not in ("admin", "superadmin"):
            raise PermissionError("Hanya Admin yang dapat menjalankan perbaikan otomatis.")
        snapshot = self._build_schedule_snapshot()
        room_rows = [{"id": r.id, "name": r.name, "capacity": r.capacity, "building": f"Gedung Lt.{r.floor}"} for r in self.rooms]
        planned = plan_autofix_moves(snapshot, room_rows)
        for mv in planned:
            sc = self._find_schedule_entry(str(mv["item_id"]))
            rm = next((r for r in self.rooms if str(r.id) == str(mv["room_id"])), None)
            if sc and rm:
                sc.day = mv["day"]
                sc.start_time = mv["start_time"]
                sc.end_time = mv["end_time"]
                sc.room_id = rm.id
                sc.room_name = rm.name
                sc.room_capacity = rm.capacity
                sc.floor = rm.floor
        report = self.get_validation_report()
        report["fixed_count"] = len(planned)
        report["message"] = f"Berhasil memperbaiki {len(planned)} bentrok secara otomatis."
        return report


# Singleton instance
data_store = InMemoryDataStore()
