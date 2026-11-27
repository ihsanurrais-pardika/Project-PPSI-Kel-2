"""
In-Memory Store untuk Pengelolaan Kelas Perkuliahan FTI Tanpa Database.
Membaca dataset resmi classes_fti_ganjil_2026-v2.csv dan memfasilitasi penyesuaian kelas (CRUD),
manajemen ruangan FTI, dan penjadwalan terpadu dengan engine CP-SAT.
"""

import os
import csv
from datetime import datetime
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

from app.engine.domain_models import (
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
        self.kuota_minimum_kelas: int = 15
        self.need_logs: List[Dict[str, Any]] = []
        self.dept_submissions: Dict[str, Dict[str, Any]] = {}

        self._init_rooms()
        self._init_slots()
        self.load_from_csv()

    def _find_csv_path(self) -> Optional[str]:
        # Coba beberapa lokasi potensial
        candidates = [
            os.path.join(os.getcwd(), self.csv_filename),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), self.csv_filename),
            os.path.join("D:\\Project-PPSI-Kel-2", self.csv_filename),
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
        self.need_logs.clear()
        self.dept_submissions.clear()

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
                    sks_teori=max(0, int(row.get("sks", 2)) - (1 if "lab" in row.get("room_type_needed", "").lower() else 0)),
                    sks_praktik=1 if "lab" in row.get("room_type_needed", "").lower() else 0,
                    below_min_quota=(
                        (row.get("requires_room", "true").lower() == "true")
                        and int(row.get("enrolled_count", 40)) < self.kuota_minimum_kelas
                    ),
                )
                self.classes[c_id] = item

        return len(self.classes)

    def get_classes(
        self,
        department: Optional[str] = None,
        semester: Optional[int] = None,
        search: Optional[str] = None,
        room_type: Optional[str] = None,
        include_cancelled: bool = False,
    ) -> List[ClassItem]:
        result = list(self.classes.values())
        if not include_cancelled:
            result = [c for c in result if c.status_kelas != "DIBATALKAN"]

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
        # Saring kelas yang membutuhkan ruangan dan tidak dibatalkan
        filtered_classes = [
            c for c in self.classes.values()
            if c.requires_room and c.status_kelas != "DIBATALKAN"
        ]

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

    # -----------------------------------------------------------------
    # Modul 4: Kebutuhan Departemen (Lecturers, Offerings, Quota, Logs)
    # -----------------------------------------------------------------
    def _log_need_change(
        self,
        dept: str,
        kode_mk: str,
        kode_kelas: Optional[str],
        jenis_aksi: str,
        nilai_lama: Optional[str] = None,
        nilai_baru: Optional[str] = None,
        alasan: Optional[str] = None,
        actor_email: Optional[str] = None,
    ) -> None:
        self.need_logs.insert(
            0,
            {
                "id_perubahan": len(self.need_logs) + 1,
                "kode_prodi": dept,
                "kode_mk": kode_mk,
                "kode_kelas": kode_kelas,
                "jenis_aksi": jenis_aksi,
                "nilai_lama": nilai_lama,
                "nilai_baru": nilai_baru,
                "alasan": alasan,
                "actor_name": actor_email or "System",
                "waktu_perubahan": datetime.now().isoformat(timespec="seconds"),
            },
        )

    def get_lecturers_raw(self, department: Optional[str] = None) -> List[Dict[str, Any]]:
        rows = []
        for idx, lec in enumerate(self.lecturers.values(), start=1):
            if department and lec.department.upper() != department.strip().upper():
                continue
            rows.append(
                {
                    "id": lec.id,
                    "id_dosen": idx,
                    "nidn": lec.id,
                    "name": lec.name,
                    "email": "",
                    "department": lec.department,
                    "jabatan_struktural": "Dosen Pengampu",
                    "maks_sks_harian": getattr(lec, "max_daily_sks", 12),
                }
            )
        rows.sort(key=lambda r: (r["department"], r["name"]))
        return rows

    def create_offering(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        code = (payload.get("course_code") or "").strip().upper()
        name = (payload.get("name") or "").strip()
        dept = (payload.get("department") or "SI").strip().upper()
        sks = int(payload.get("sks") or 2)
        sks_teori = int(payload.get("sks_teori") if payload.get("sks_teori") is not None else sks)
        sks_praktik = int(payload.get("sks_praktik") if payload.get("sks_praktik") is not None else 0)
        semester = int(payload.get("semester") or 1)
        is_mandatory = bool(payload.get("is_mandatory", True))
        rombels = payload.get("classes") or []
        primary_name = (payload.get("primary_lecturer_name") or "").strip()
        tandem_names = [x.strip() for x in (payload.get("tandem_lecturer_names") or []) if x.strip()]

        if not code or not name:
            raise ValueError("Kode Mata Kuliah dan Nama Mata Kuliah wajib diisi.")
        if sks < 1 or sks > 6:
            raise ValueError("Total SKS harus antara 1 sampai 6.")
        if sks_teori < 0 or sks_praktik < 0 or (sks_teori + sks_praktik != sks):
            raise ValueError("Jumlah SKS Teori + SKS Praktik harus sama dengan Total SKS.")
        if not rombels:
            raise ValueError("Minimal harus ada 1 rombel kelas.")
        if not primary_name:
            raise ValueError("Dosen Pengampu Utama wajib diisi.")

        lecturer_names = [primary_name] + [t for t in tandem_names if t != primary_name]
        room_type = "Lab" if sks_praktik > 0 else (payload.get("room_type_needed") or "Teori")
        status_kelas = "DRAFT" if payload.get("as_draft") else "TERBUKA"
        update_existing = bool(payload.get("update_existing", False))

        created: List[ClassItem] = []
        warnings: List[str] = []
        seen_labels: set[str] = set()
        pending_items: List[ClassItem] = []
        for r in rombels:
            lbl = (r.get("class_label") or "").strip()
            cnt = int(r.get("enrolled_count") or 0)
            if not lbl:
                raise ValueError("Label rombel tidak boleh kosong.")
            if lbl.upper() in seen_labels:
                raise ValueError(f"Label kelas {lbl} terduplikasi dalam pengajuan yang sama.")
            seen_labels.add(lbl.upper())
            if cnt <= 0:
                raise ValueError(f"Estimasi mahasiswa untuk kelas {lbl} harus lebih dari 0.")

            cid = f"{code}-{lbl}"
            if cid in self.classes and self.classes[cid].status_kelas != "DIBATALKAN" and not update_existing:
                raise ValueError(f"Kelas {cid} sudah terdaftar aktif.")

            item = ClassItem(
                id=cid,
                course_code=code,
                department=dept,
                semester=semester,
                name=name,
                class_label=lbl,
                sks=sks,
                sks_teori=sks_teori,
                sks_praktik=sks_praktik,
                enrolled_count=cnt,
                enrolled_is_estimated=True,
                room_type_needed=room_type,
                is_mandatory=is_mandatory,
                is_elective=not is_mandatory,
                rombel_key=f"{dept}-S{semester}-{lbl}",
                requires_room=bool(payload.get("requires_room", True)),
                lecturer_names=lecturer_names,
                status_kelas=status_kelas,
                preferensi_hari=list(payload.get("preferred_days") or []),
                preferensi_waktu=payload.get("preferred_time_slot"),
                catatan_khusus=payload.get("special_note"),
                below_min_quota=bool(payload.get("requires_room", True)) and cnt < self.kuota_minimum_kelas,
            )
            pending_items.append(item)

        for item in pending_items:
            self.classes[item.id] = item
            created.append(item)
            if item.below_min_quota:
                warnings.append(f"Kelas {item.id} ({item.enrolled_count} mhs) di bawah kuota minimum ({self.kuota_minimum_kelas} mhs).")

        self._log_need_change(
            dept=dept,
            kode_mk=code,
            kode_kelas=",".join([c.class_label for c in created]),
            jenis_aksi="TAMBAH_USULAN",
            nilai_baru=f"{len(created)} kelas | Pengampu: {', '.join(lecturer_names)}",
            actor_email=payload.get("actor_email"),
        )
        return {
            "message": f"Berhasil menyimpan {len(created)} rombel untuk [{code}] {name}.",
            "course_code": code,
            "created_classes": created,
            "warnings": warnings,
        }

    def get_below_quota_classes(self, department: Optional[str] = None) -> Dict[str, Any]:
        active = self.get_classes(department=department, include_cancelled=False)
        below = [c for c in active if c.requires_room and c.enrolled_count < self.kuota_minimum_kelas]
        return {
            "kuota_minimum_kelas": self.kuota_minimum_kelas,
            "total_below_quota": len(below),
            "classes": below,
        }

    def cancel_class(self, class_id: str, reason: str, actor_email: Optional[str] = None) -> ClassItem:
        clean_reason = (reason or "").strip()
        if len(clean_reason) < 3:
            raise ValueError("Alasan pembatalan kelas wajib diisi minimal 3 karakter.")
        item = self.classes.get(class_id)
        if not item:
            raise LookupError(f"Kelas {class_id} tidak ditemukan.")
        old_status = item.status_kelas
        updated = item.model_copy(
            update={"status_kelas": "DIBATALKAN", "alasan_pembatalan": clean_reason}
        )
        self.classes[class_id] = updated
        self._log_need_change(
            dept=item.department,
            kode_mk=item.course_code,
            kode_kelas=item.class_label,
            jenis_aksi="BATALKAN_KELAS",
            nilai_lama=f"{old_status} ({item.enrolled_count} mhs)",
            nilai_baru="DIBATALKAN",
            alasan=clean_reason,
            actor_email=actor_email,
        )
        return updated

    def restore_class(self, class_id: str, actor_email: Optional[str] = None) -> ClassItem:
        item = self.classes.get(class_id)
        if not item:
            raise LookupError(f"Kelas {class_id} tidak ditemukan.")
        updated = item.model_copy(
            update={"status_kelas": "TERBUKA", "alasan_pembatalan": None}
        )
        self.classes[class_id] = updated
        self._log_need_change(
            dept=item.department,
            kode_mk=item.course_code,
            kode_kelas=item.class_label,
            jenis_aksi="PULIHKAN_KELAS",
            nilai_lama="DIBATALKAN",
            nilai_baru="TERBUKA",
            actor_email=actor_email,
        )
        return updated

    def adjust_rombels(
        self,
        course_code: str,
        target_count: int,
        default_capacity: int = 40,
        reason: str = "Penyesuaian jumlah rombel departemen",
        actor_email: Optional[str] = None,
    ) -> Dict[str, Any]:
        if target_count < 1 or target_count > 10:
            raise ValueError("Jumlah rombel target harus antara 1 sampai 10.")
        code = course_code.strip().upper()
        active = sorted(
            [c for c in self.classes.values() if c.course_code == code and c.status_kelas != "DIBATALKAN"],
            key=lambda x: x.class_label,
        )
        if not active:
            raise LookupError(f"Mata kuliah {code} belum memiliki kelas aktif.")

        template = active[0]
        old_count = len(active)
        if target_count > old_count:
            existing_labels = {c.class_label.upper() for c in active}
            next_ord = 65
            while len(active) < target_count:
                lbl = chr(next_ord)
                next_ord += 1
                if lbl in existing_labels:
                    continue
                cid = f"{code}-{lbl}"
                new_item = template.model_copy(
                    update={
                        "id": cid,
                        "class_label": lbl,
                        "enrolled_count": default_capacity,
                        "rombel_key": f"{template.department}-S{template.semester}-{lbl}",
                        "status_kelas": "TERBUKA",
                        "alasan_pembatalan": None,
                        "below_min_quota": template.requires_room and default_capacity < self.kuota_minimum_kelas,
                    }
                )
                self.classes[cid] = new_item
                active.append(new_item)
                existing_labels.add(lbl)
        elif target_count < old_count:
            to_cancel = active[target_count:]
            for c in to_cancel:
                self.cancel_class(c.id, reason=reason, actor_email=actor_email)
            active = active[:target_count]

        self._log_need_change(
            dept=template.department,
            kode_mk=code,
            kode_kelas=None,
            jenis_aksi="SESUAIKAN_ROMBEL",
            nilai_lama=f"{old_count} rombel",
            nilai_baru=f"{len(active)} rombel",
            alasan=reason,
            actor_email=actor_email,
        )
        return {
            "message": f"Jumlah rombel {code} disesuaikan dari {old_count} menjadi {len(active)}.",
            "course_code": code,
            "classes": active,
        }

    def get_departemen_logs(self, department: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        rows = self.need_logs
        if department:
            d = department.strip().upper()
            rows = [r for r in rows if r["kode_prodi"].upper() == d]
        return rows[:limit]

    def get_departemen_status(self, department: str) -> Dict[str, Any]:
        d = department.strip().upper()
        active = self.get_classes(department=d, include_cancelled=False)
        below = [c for c in active if c.requires_room and c.enrolled_count < self.kuota_minimum_kelas]
        sub = self.dept_submissions.get(d, {})
        return {
            "department": d,
            "status_pengajuan": sub.get("status_pengajuan", "DRAFT"),
            "waktu_pengajuan": sub.get("waktu_pengajuan"),
            "catatan": sub.get("catatan"),
            "kuota_minimum_kelas": self.kuota_minimum_kelas,
            "total_active_classes": len(active),
            "below_quota_count": len(below),
        }

    def submit_departemen(self, department: str, actor_email: Optional[str] = None, catatan: Optional[str] = None) -> Dict[str, Any]:
        d = department.strip().upper()
        now_iso = datetime.now().isoformat(timespec="seconds")
        for cid, c in list(self.classes.items()):
            if c.department.upper() == d and c.status_kelas == "DRAFT":
                self.classes[cid] = c.model_copy(update={"status_kelas": "TERBUKA"})
        self.dept_submissions[d] = {
            "status_pengajuan": "DIAJUKAN",
            "waktu_pengajuan": now_iso,
            "catatan": catatan,
        }
        self._log_need_change(
            dept=d,
            kode_mk="-",
            kode_kelas=None,
            jenis_aksi="AJUKAN_FAKULTAS",
            nilai_baru="DIAJUKAN",
            alasan=catatan,
            actor_email=actor_email,
        )
        return self.get_departemen_status(d)


# Singleton instance
data_store = InMemoryDataStore()
