"""
In-Memory Store untuk Pengelolaan Kelas Perkuliahan FTI Tanpa Database.
Membaca dataset resmi classes_fti_ganjil_2026-v2.csv dan memfasilitasi penyesuaian kelas (CRUD),
manajemen ruangan FTI, dan penjadwalan terpadu dengan engine CP-SAT.
"""

import os
import csv
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


class InMemoryDataStore:
    def __init__(self, csv_filename: str = "classes_fti_ganjil_2026-v2.csv"):
        self.csv_filename = csv_filename
        self.classes: Dict[str, ClassItem] = {}
        self.rooms: List[Room] = []
        self.slots: List[TimeSlot] = []
        self.lecturers: Dict[str, Lecturer] = {}
        self.groups: Dict[str, StudentGroup] = {}
        self.latest_schedule_result: Optional[SolverResultOutput] = None

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


# Singleton instance
data_store = InMemoryDataStore()
