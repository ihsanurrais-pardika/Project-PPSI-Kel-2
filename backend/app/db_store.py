"""
MySQL Database Store untuk Penjadwalan Perkuliahan SIPRAMA FTI UNAND.
Menghubungkan endpoint API FastAPI (CRUD Kelas, Ruang, Mata Kuliah, Generator CP-SAT,
dan Alur Approval Wakil Dekan I) langsung ke tabel MySQL (siprama_db) yang dikelola Prisma.
"""

import os
import csv
import subprocess
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any, Tuple

from database import get_db_connection
from app.engine.memory_store import ClassItem
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
from app.engine.diagnostics import ScheduleDiagnostics
from app.schemas.schedule_dto import (
    SolverResultOutput,
    ScheduledClassOutput,
    PenaltyBreakdown,
    DiagnosticsOutput,
)
from app.engine.manual_schedule import (
    ScheduleConflictException,
    evaluate_move_conflicts,
    evaluate_swap_conflicts,
    minutes_to_hhmm,
    normalize_day_name,
    parse_time_to_minutes,
)

SLOT_TIMES = [
    ("07:30", "09:10"),
    ("09:10", "10:50"),
    ("10:00", "11:40"),
    ("11:10", "12:50"),
    ("13:30", "15:10"),
    ("16:00", "17:40"),
]
DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]

DEPT_ALIAS = {
    "SISTEM INFORMASI": "SI",
    "TEKNIK INFORMATIKA": "IF",
    "INFORMATIKA": "IF",
    "TEKNIK KOMPUTER": "TK",
    "SI": "SI",
    "IF": "IF",
    "TK": "TK",
}


def normalize_dept(dept: Optional[str], course_code: Optional[str] = None) -> str:
    d = (dept or "").strip().upper()
    if d in DEPT_ALIAS:
        return DEPT_ALIAS[d]
    c = (course_code or "").strip().upper()
    if c.startswith(("CCE", "SCE", "ECS", "SSC", "TK")):
        return "TK"
    if c.startswith(("DSI", "PSI", "TSI", "SI")):
        return "SI"
    if c.startswith(("DIF", "TIF", "IF")):
        return "IF"
    return "SI"


def map_status_versi_to_ui(status_versi: Optional[str], tahap: Optional[str]) -> str:
    sv = (status_versi or "").upper()
    th = (tahap or "").upper()
    if sv == "RESMI" or th == "PUBLIKASI":
        return "Resmi"
    if sv == "DISETUJUI" or th == "DISETUJUI_WD1":
        return "Disetujui"
    if sv == "REVISI" or th == "REVISI_ADMIN":
        return "Revisi"
    return "Menunggu Persetujuan"


def format_db_time(val: Any) -> str:
    if isinstance(val, timedelta):
        total_sec = int(val.total_seconds())
        h = (total_sec // 3600) % 24
        m = (total_sec % 3600) // 60
        return f"{h:02d}:{m:02d}"
    s = str(val or "07:30")
    parts = s.split(":")
    if len(parts) >= 2:
        return f"{int(parts[0]):02d}:{int(parts[1]):02d}"
    return "07:30"


class MySQLDataStore:
    def __init__(self, csv_filename: str = "classes_fti_ganjil_2026-v2.csv"):
        self.csv_filename = csv_filename
        self.slots: List[TimeSlot] = self._build_slots()
        self._csv_meta_by_id: Dict[str, Dict[str, Any]] = {}
        self._csv_meta_by_key: Dict[Tuple[str, str, int, str], Dict[str, Any]] = {}
        self._load_csv_enrichment()

    def _root_dir(self) -> str:
        return os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    def _find_csv_path(self) -> Optional[str]:
        candidates = [
            os.path.join(self._root_dir(), self.csv_filename),
            os.path.join(os.getcwd(), self.csv_filename),
        ]
        for p in candidates:
            if os.path.exists(p):
                return p
        return None

    def _load_csv_enrichment(self) -> None:
        """Muat daftar dosen & rombel dari CSV sebagai fallback bila pengampu_kelas belum diisi."""
        self._csv_meta_by_id.clear()
        self._csv_meta_by_key.clear()
        csv_path = self._find_csv_path()
        if not csv_path:
            return
        with open(csv_path, mode="r", encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                cid = (row.get("id") or "").strip()
                if not cid:
                    continue
                l_ids = [x.strip() for x in (row.get("lecturer_ids") or "").split(";") if x.strip()]
                raw_names = (row.get("lecturer_names") or "").strip()
                if "/" in raw_names and not raw_names.startswith("Dosen MKWU"):
                    l_names = [x.strip() for x in raw_names.split("/") if x.strip()]
                else:
                    l_names = [raw_names] if raw_names else []
                meta = {
                    "lecturer_ids": l_ids,
                    "lecturer_names": l_names,
                    "rombel_key": (row.get("rombel_key") or "").strip(),
                    "class_label": (row.get("class_label") or "").strip(),
                }
                self._csv_meta_by_id[cid] = meta
                key = (
                    (row.get("course_code") or "").strip(),
                    (row.get("department") or "").strip().upper(),
                    int(row.get("semester") or 1),
                    meta["class_label"],
                )
                self._csv_meta_by_key[key] = meta

    def _build_slots(self) -> List[TimeSlot]:
        slots: List[TimeSlot] = []
        idx = 0
        for day in DAYS:
            for d_idx, (st, en) in enumerate(SLOT_TIMES):
                slots.append(
                    TimeSlot(
                        id=f"slot_{day[:3].lower()}_{d_idx+1}",
                        index=idx,
                        day=day,
                        daily_index=d_idx,
                        time_label=f"{st} - {en}",
                    )
                )
                idx += 1
        return slots

    def get_slots(self) -> List[TimeSlot]:
        return self.slots

    def _get_active_semester(self, cursor) -> Dict[str, Any]:
        cursor.execute(
            "SELECT * FROM semester_akademik ORDER BY id_semester DESC LIMIT 1;"
        )
        sem = cursor.fetchone()
        if sem:
            return sem
        cursor.execute(
            """
            INSERT INTO semester_akademik (tahun_ajaran, jenis_semester, tgl_mulai, tgl_selesai, kuota_minimum_kelas)
            VALUES ('2026/2027', 'Ganjil', '2026-08-17', '2026-12-18', 15);
            """
        )
        cursor.execute("SELECT * FROM semester_akademik ORDER BY id_semester DESC LIMIT 1;")
        return cursor.fetchone()

    def _get_prodi_map(self, cursor) -> Dict[str, int]:
        cursor.execute("SELECT id_prodi, kode_prodi FROM program_studi;")
        return {row["kode_prodi"].upper(): int(row["id_prodi"]) for row in cursor.fetchall()}

    def _resolve_actor_user(self, cursor, roles: Tuple[str, ...]) -> Optional[int]:
        placeholders = ",".join(["%s"] * len(roles))
        cursor.execute(
            f"SELECT id_pengguna FROM pengguna WHERE UPPER(peran) IN ({placeholders}) ORDER BY id_pengguna ASC LIMIT 1;",
            roles,
        )
        row = cursor.fetchone()
        if row:
            return int(row["id_pengguna"])
        cursor.execute("SELECT id_pengguna FROM pengguna ORDER BY id_pengguna ASC LIMIT 1;")
        fallback = cursor.fetchone()
        return int(fallback["id_pengguna"]) if fallback else None

    def _resolve_pengaju_for_dept(self, cursor, dept: str) -> int:
        role_map = {
            "SI": ("KADEP_SI", "SUPERADMIN"),
            "IF": ("KADEP_IF", "SUPERADMIN"),
            "TK": ("KADEP_TK", "SUPERADMIN"),
        }
        roles = role_map.get(dept.upper(), ("SUPERADMIN",))
        uid = self._resolve_actor_user(cursor, roles)
        if uid is None:
            raise RuntimeError("Tabel pengguna kosong. Jalankan seed terlebih dahulu.")
        return uid

    def _derive_semester(self, tahun_ajaran: str, jenis_semester: str, target_angkatan: int, fallback_sem: int) -> int:
        try:
            year_start = int(str(tahun_ajaran).split("/")[0])
            diff = max(0, year_start - int(target_angkatan))
            offset = 1 if "ganjil" in str(jenis_semester).lower() else 2
            sem = diff * 2 + offset
            if 1 <= sem <= 8:
                return sem
        except Exception:
            pass
        return int(fallback_sem or 1)

    def _row_to_class_item(self, row: Dict[str, Any], db_lecturers: Dict[int, List[Tuple[str, str]]]) -> ClassItem:
        kode_mk = row["kode_mk"]
        kode_kelas = row["kode_kelas"]
        composite_id = f"{kode_mk}-{kode_kelas}"

        dept = normalize_dept(row.get("pengaju_prodi") or row.get("mk_prodi"), kode_mk)
        semester = self._derive_semester(
            row.get("tahun_ajaran", "2026/2027"),
            row.get("jenis_semester", "Ganjil"),
            row["target_angkatan"],
            row["semester_paket"],
        )

        jenis_mk = row.get("jenis_mk") or "Wajib Prodi"
        status_kelas = row.get("status_kelas") or "TERBUKA"
        is_lab = "praktikum" in jenis_mk.lower() or "lab" in jenis_mk.lower()
        is_elective = "pilihan" in jenis_mk.lower()
        is_transition = status_kelas == "TRANSISI_TERBUKA" or "transisi" in jenis_mk.lower()
        is_mandatory = not is_elective and not is_transition
        requires_room = status_kelas != "NON_RUANG" and "non-ruang" not in jenis_mk.lower()

        enrolled_peserta = int(row.get("jumlah_peserta") or 0)
        enrolled_est = int(row.get("estimasi_mahasiswa") or 40)
        enrolled_count = enrolled_peserta if enrolled_peserta > 0 else enrolled_est
        enrolled_is_estimated = enrolled_peserta == 0

        csv_meta = (
            self._csv_meta_by_id.get(composite_id)
            or self._csv_meta_by_key.get((kode_mk, dept, semester, kode_kelas))
            or {}
        )
        class_label = csv_meta.get("class_label") or kode_kelas

        id_kelas = int(row["id_kelas"])
        if id_kelas in db_lecturers and db_lecturers[id_kelas]:
            lecturer_ids = [x[0] for x in db_lecturers[id_kelas]]
            lecturer_names = [x[1] for x in db_lecturers[id_kelas]]
        elif csv_meta:
            lecturer_ids = list(csv_meta.get("lecturer_ids") or [])
            lecturer_names = list(csv_meta.get("lecturer_names") or [])
        else:
            lecturer_ids = []
            lecturer_names = []

        if not lecturer_ids:
            lecturer_ids = [f"DOSEN-{dept}-{kode_mk}"]
        if not lecturer_names:
            lecturer_names = [f"Dosen Pengampu {dept}"]

        rombel_key = csv_meta.get("rombel_key", "")
        if not rombel_key and is_mandatory and not is_elective and requires_room:
            short_lbl = class_label.split("-")[-1] if "-" in class_label else class_label
            rombel_key = f"{dept}-S{semester}-{short_lbl}"

        return ClassItem(
            id=composite_id,
            course_code=kode_mk,
            department=dept,
            semester=semester,
            name=row["nama_mk"],
            class_label=class_label,
            sks=int(row["sks"]),
            enrolled_count=enrolled_count,
            enrolled_is_estimated=enrolled_is_estimated,
            room_type_needed="Lab" if is_lab else "Teori",
            is_mandatory=is_mandatory,
            is_elective=is_elective,
            rombel_key=rombel_key,
            requires_room=requires_room,
            requires_accessibility=bool(row.get("butuh_aksesibilitas")),
            is_transition_course=is_transition,
            lecturer_ids=lecturer_ids,
            lecturer_names=lecturer_names,
        )

    def _fetch_class_rows(self, cursor, where_clause: str = "", params: Tuple = ()) -> Tuple[List[Dict[str, Any]], Dict[int, List[Tuple[str, str]]]]:
        query = f"""
            SELECT
                k.id_kelas, k.id_semester, k.id_mk, k.id_pengaju, k.kode_kelas,
                k.target_angkatan, k.estimasi_mahasiswa, k.jumlah_peserta,
                k.butuh_aksesibilitas, k.status_kelas,
                mk.kode_mk, mk.nama_mk, mk.sks, mk.semester_paket, mk.jenis_mk, mk.lintas_prodi,
                pr_mk.kode_prodi AS mk_prodi,
                pr_pengaju.kode_prodi AS pengaju_prodi,
                sa.tahun_ajaran, sa.jenis_semester
            FROM kelas k
            JOIN mata_kuliah mk ON k.id_mk = mk.id_mk
            JOIN program_studi pr_mk ON mk.id_prodi = pr_mk.id_prodi
            JOIN pengguna u ON k.id_pengaju = u.id_pengguna
            JOIN program_studi pr_pengaju ON u.id_prodi = pr_pengaju.id_prodi
            JOIN semester_akademik sa ON k.id_semester = sa.id_semester
            {where_clause}
            ORDER BY pr_pengaju.kode_prodi ASC, k.target_angkatan DESC, mk.kode_mk ASC, k.kode_kelas ASC;
        """
        cursor.execute(query, params)
        rows = cursor.fetchall()

        cursor.execute(
            """
            SELECT pk.id_kelas, d.nidn, u.nama_lengkap
            FROM pengampu_kelas pk
            JOIN dosen d ON pk.id_dosen = d.id_dosen
            JOIN pengguna u ON d.id_pengguna = u.id_pengguna;
            """
        )
        db_lecturers: Dict[int, List[Tuple[str, str]]] = {}
        for lr in cursor.fetchall():
            db_lecturers.setdefault(int(lr["id_kelas"]), []).append((lr["nidn"], lr["nama_lengkap"]))

        return rows, db_lecturers

    def _find_db_kelas_row(self, cursor, class_id: str) -> Optional[Dict[str, Any]]:
        if class_id.isdigit():
            cursor.execute("SELECT k.*, mk.kode_mk FROM kelas k JOIN mata_kuliah mk ON k.id_mk = mk.id_mk WHERE k.id_kelas = %s LIMIT 1;", (int(class_id),))
            return cursor.fetchone()
        cursor.execute(
            """
            SELECT k.*, mk.kode_mk
            FROM kelas k
            JOIN mata_kuliah mk ON k.id_mk = mk.id_mk
            WHERE CONCAT(mk.kode_mk, '-', k.kode_kelas) = %s
            LIMIT 1;
            """,
            (class_id,),
        )
        return cursor.fetchone()

    def get_courses(self) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT mk.id_mk, mk.kode_mk, mk.nama_mk, mk.sks, mk.semester_paket,
                           mk.jenis_mk, mk.lintas_prodi, ps.kode_prodi, ps.nama_prodi
                    FROM mata_kuliah mk
                    JOIN program_studi ps ON mk.id_prodi = ps.id_prodi
                    ORDER BY ps.kode_prodi ASC, mk.semester_paket ASC, mk.kode_mk ASC;
                    """
                )
                return cursor.fetchall()
        finally:
            conn.close()

    def get_classes(
        self,
        department: Optional[str] = None,
        semester: Optional[int] = None,
        search: Optional[str] = None,
        room_type: Optional[str] = None,
    ) -> List[ClassItem]:
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                rows, db_lecturers = self._fetch_class_rows(cursor)
        finally:
            conn.close()

        items = [self._row_to_class_item(r, db_lecturers) for r in rows]

        if department:
            target = normalize_dept(department)
            items = [c for c in items if c.department.upper() == target]
        if semester:
            items = [c for c in items if c.semester == semester]
        if room_type:
            items = [c for c in items if c.room_type_needed.lower() == room_type.lower()]
        if search:
            q = search.lower()
            items = [
                c for c in items
                if q in c.course_code.lower()
                or q in c.name.lower()
                or q in c.class_label.lower()
                or any(q in l.lower() for l in c.lecturer_names)
            ]

        items.sort(key=lambda x: (x.department, x.semester, x.course_code, x.class_label))
        return items

    def get_class(self, class_id: str) -> Optional[ClassItem]:
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                found = self._find_db_kelas_row(cursor, class_id)
                if not found:
                    return None
                rows, db_lecturers = self._fetch_class_rows(cursor, "WHERE k.id_kelas = %s", (found["id_kelas"],))
                return self._row_to_class_item(rows[0], db_lecturers) if rows else None
        finally:
            conn.close()

    def add_class(self, item: ClassItem) -> ClassItem:
        dept = normalize_dept(item.department, item.course_code)
        kode_mk = item.course_code.strip().upper()
        kode_kelas = item.class_label.strip() or "A"

        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                sem = self._get_active_semester(cursor)
                prodi_map = self._get_prodi_map(cursor)
                id_prodi = prodi_map.get(dept, next(iter(prodi_map.values())))
                id_pengaju = self._resolve_pengaju_for_dept(cursor, dept)

                cursor.execute("SELECT id_mk FROM mata_kuliah WHERE kode_mk = %s LIMIT 1;", (kode_mk,))
                mk_row = cursor.fetchone()
                if mk_row:
                    id_mk = int(mk_row["id_mk"])
                else:
                    if not item.requires_room:
                        jenis_mk = "Wajib Prodi (Non-Ruang)"
                    elif "lab" in item.room_type_needed.lower():
                        jenis_mk = "Praktikum"
                    elif item.is_elective:
                        jenis_mk = "Pilihan"
                    else:
                        jenis_mk = "Wajib Prodi"
                    cursor.execute(
                        """
                        INSERT INTO mata_kuliah (id_prodi, kode_mk, nama_mk, sks, semester_paket, jenis_mk, lintas_prodi)
                        VALUES (%s, %s, %s, %s, %s, %s, %s);
                        """,
                        (id_prodi, kode_mk, item.name.strip(), item.sks, item.semester, jenis_mk, False),
                    )
                    id_mk = int(cursor.lastrowid)

                cursor.execute(
                    "SELECT id_kelas FROM kelas WHERE id_semester = %s AND id_mk = %s AND kode_kelas = %s LIMIT 1;",
                    (sem["id_semester"], id_mk, kode_kelas),
                )
                if cursor.fetchone():
                    raise ValueError(f"Kelas {kode_mk}-{kode_kelas} sudah ada di semester ini.")

                year_start = int(str(sem["tahun_ajaran"]).split("/")[0])
                target_angkatan = year_start - max(0, (int(item.semester) - 1) // 2)
                status_kelas = "NON_RUANG" if not item.requires_room else ("TRANSISI_TERBUKA" if item.is_transition_course else "TERBUKA")
                peserta = 0 if item.enrolled_is_estimated else int(item.enrolled_count)

                cursor.execute(
                    """
                    INSERT INTO kelas (
                        id_semester, id_mk, id_pengaju, kode_kelas,
                        target_angkatan, estimasi_mahasiswa, jumlah_peserta,
                        butuh_aksesibilitas, status_kelas
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                    """,
                    (
                        sem["id_semester"],
                        id_mk,
                        id_pengaju,
                        kode_kelas,
                        target_angkatan,
                        int(item.enrolled_count),
                        peserta,
                        bool(item.requires_accessibility),
                        status_kelas,
                    ),
                )
                new_id_kelas = int(cursor.lastrowid)
            conn.commit()
        finally:
            conn.close()

        return self.get_class(str(new_id_kelas)) or item

    def update_class(self, class_id: str, updates: Dict[str, Any]) -> Optional[ClassItem]:
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                existing = self._find_db_kelas_row(cursor, class_id)
                if not existing:
                    return None
                id_kelas = int(existing["id_kelas"])
                id_mk = int(existing["id_mk"])

                kelas_sets: List[str] = []
                kelas_vals: List[Any] = []

                if "class_label" in updates and updates["class_label"]:
                    kelas_sets.append("kode_kelas = %s")
                    kelas_vals.append(updates["class_label"].strip()[:20])
                if "enrolled_count" in updates and updates["enrolled_count"] is not None:
                    cnt = int(updates["enrolled_count"])
                    kelas_sets.append("estimasi_mahasiswa = %s")
                    kelas_vals.append(cnt)
                    kelas_sets.append("jumlah_peserta = %s")
                    kelas_vals.append(cnt)
                if "requires_room" in updates and updates["requires_room"] is not None:
                    new_status = "TERBUKA" if updates["requires_room"] else "NON_RUANG"
                    kelas_sets.append("status_kelas = %s")
                    kelas_vals.append(new_status)

                if kelas_sets:
                    kelas_vals.append(id_kelas)
                    cursor.execute(
                        f"UPDATE kelas SET {', '.join(kelas_sets)} WHERE id_kelas = %s;",
                        tuple(kelas_vals),
                    )

                mk_sets: List[str] = []
                mk_vals: List[Any] = []
                if "name" in updates and updates["name"]:
                    mk_sets.append("nama_mk = %s")
                    mk_vals.append(updates["name"].strip()[:200])
                if "sks" in updates and updates["sks"] is not None:
                    mk_sets.append("sks = %s")
                    mk_vals.append(int(updates["sks"]))
                if "room_type_needed" in updates and updates["room_type_needed"]:
                    rt = updates["room_type_needed"].strip().lower()
                    mk_sets.append("jenis_mk = %s")
                    mk_vals.append("Praktikum" if "lab" in rt else "Wajib Prodi")

                if mk_sets:
                    mk_vals.append(id_mk)
                    cursor.execute(
                        f"UPDATE mata_kuliah SET {', '.join(mk_sets)} WHERE id_mk = %s;",
                        tuple(mk_vals),
                    )
            conn.commit()
        finally:
            conn.close()

        return self.get_class(str(id_kelas))

    def delete_class(self, class_id: str) -> bool:
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                existing = self._find_db_kelas_row(cursor, class_id)
                if not existing:
                    return False
                id_kelas = int(existing["id_kelas"])

                cursor.execute("SELECT id_jadwal FROM jadwal_kuliah WHERE id_kelas = %s;", (id_kelas,))
                jadwal_ids = [int(r["id_jadwal"]) for r in cursor.fetchall()]
                if jadwal_ids:
                    ph = ",".join(["%s"] * len(jadwal_ids))
                    cursor.execute(f"DELETE FROM deteksi_bentrok WHERE id_jadwal_1 IN ({ph}) OR id_jadwal_2 IN ({ph});", tuple(jadwal_ids + jadwal_ids))
                    cursor.execute(f"DELETE FROM perubahan_jadwal WHERE id_jadwal IN ({ph});", tuple(jadwal_ids))
                    cursor.execute(f"DELETE FROM pertemuan_kuliah WHERE id_jadwal IN ({ph});", tuple(jadwal_ids))
                    cursor.execute(f"DELETE FROM jadwal_kuliah WHERE id_jadwal IN ({ph});", tuple(jadwal_ids))

                cursor.execute("DELETE FROM pengampu_kelas WHERE id_kelas = %s;", (id_kelas,))
                cursor.execute("DELETE FROM kelas WHERE id_kelas = %s;", (id_kelas,))
            conn.commit()
            return True
        finally:
            conn.close()

    def reset_to_csv(self) -> int:
        seed_script = os.path.join(self._root_dir(), "prisma", "seed.js")
        if os.path.exists(seed_script):
            subprocess.run(["node", seed_script], cwd=self._root_dir(), check=True)
        return len(self.get_classes())

    # -----------------------------------------------------------------
    # Manajemen Ruang Fisik (MySQL tabel `ruang`)
    # -----------------------------------------------------------------
    def get_rooms_raw(self) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT r.id_ruang, r.id_prodi_pengelola, r.kode_ruang, r.nama_ruang,
                           r.gedung, r.lantai, r.kapasitas, ps.kode_prodi
                    FROM ruang r
                    LEFT JOIN program_studi ps ON r.id_prodi_pengelola = ps.id_prodi
                    ORDER BY r.gedung ASC, r.lantai ASC, r.kode_ruang ASC;
                    """
                )
                rows = cursor.fetchall()
        finally:
            conn.close()

        return [
            {
                "id": str(r["id_ruang"]),
                "db_ruang_id": int(r["id_ruang"]),
                "code": r["kode_ruang"],
                "name": f"Ruang {r['gedung']} {r['nama_ruang']}",
                "raw_name": r["nama_ruang"],
                "building": f"Gedung {r['gedung']}" if len(r["gedung"]) <= 2 else r["gedung"],
                "gedung_code": r["gedung"],
                "floor": int(r["lantai"]),
                "capacity": int(r["kapasitas"]),
                "room_type": "Umum",
                "department": r["kode_prodi"] or "FTI",
                "features": [f"Gedung {r['gedung']}", f"Lantai {r['lantai']}", f"Kapasitas {r['kapasitas']} Kursi"],
            }
            for r in rows
        ]

    def get_rooms(self) -> List[Room]:
        return [
            Room(
                id=str(r["db_ruang_id"]),
                name=r["code"],
                capacity=r["capacity"],
                floor=r["floor"],
                building=r["building"],
                room_type="Umum",
                features=r["features"],
            )
            for r in self.get_rooms_raw()
        ]

    def add_room(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        kode = (payload.get("kode_ruang") or payload.get("code") or "").strip()
        nama = (payload.get("nama_ruang") or payload.get("name") or kode).strip()
        gedung = (payload.get("gedung") or payload.get("building") or "H").strip()
        if gedung.lower().startswith("gedung "):
            gedung = gedung[7:].strip()
        lantai = int(payload.get("lantai") or payload.get("floor") or 1)
        kapasitas = int(payload.get("kapasitas") or payload.get("capacity") or 45)
        kode_prodi = (payload.get("kode_prodi") or "").strip().upper()

        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id_ruang FROM ruang WHERE kode_ruang = %s LIMIT 1;", (kode,))
                if cursor.fetchone():
                    raise ValueError(f"Kode ruang {kode} sudah terdaftar.")
                id_prodi = None
                if kode_prodi in ("SI", "IF", "TK"):
                    id_prodi = self._get_prodi_map(cursor).get(kode_prodi)
                cursor.execute(
                    """
                    INSERT INTO ruang (id_prodi_pengelola, kode_ruang, nama_ruang, gedung, lantai, kapasitas)
                    VALUES (%s, %s, %s, %s, %s, %s);
                    """,
                    (id_prodi, kode, nama, gedung, lantai, kapasitas),
                )
                new_id = int(cursor.lastrowid)
            conn.commit()
        finally:
            conn.close()

        for rm in self.get_rooms_raw():
            if rm["db_ruang_id"] == new_id:
                return rm
        raise RuntimeError("Ruang baru gagal dimuat ulang.")

    def update_room(self, room_id: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                if room_id.isdigit():
                    cursor.execute("SELECT * FROM ruang WHERE id_ruang = %s LIMIT 1;", (int(room_id),))
                else:
                    cursor.execute("SELECT * FROM ruang WHERE kode_ruang = %s LIMIT 1;", (room_id,))
                existing = cursor.fetchone()
                if not existing:
                    return None
                db_id = int(existing["id_ruang"])

                sets: List[str] = []
                vals: List[Any] = []
                if payload.get("kode_ruang") or payload.get("code"):
                    sets.append("kode_ruang = %s")
                    vals.append((payload.get("kode_ruang") or payload.get("code")).strip())
                if payload.get("nama_ruang") or payload.get("name"):
                    sets.append("nama_ruang = %s")
                    vals.append((payload.get("nama_ruang") or payload.get("name")).strip())
                if payload.get("gedung") or payload.get("building"):
                    g = (payload.get("gedung") or payload.get("building")).strip()
                    if g.lower().startswith("gedung "):
                        g = g[7:].strip()
                    sets.append("gedung = %s")
                    vals.append(g)
                if payload.get("lantai") is not None or payload.get("floor") is not None:
                    sets.append("lantai = %s")
                    vals.append(int(payload.get("lantai") if payload.get("lantai") is not None else payload.get("floor")))
                if payload.get("kapasitas") is not None or payload.get("capacity") is not None:
                    sets.append("kapasitas = %s")
                    vals.append(int(payload.get("kapasitas") if payload.get("kapasitas") is not None else payload.get("capacity")))

                if sets:
                    vals.append(db_id)
                    cursor.execute(f"UPDATE ruang SET {', '.join(sets)} WHERE id_ruang = %s;", tuple(vals))
            conn.commit()
        finally:
            conn.close()

        for rm in self.get_rooms_raw():
            if rm["db_ruang_id"] == db_id:
                return rm
        return None

    def delete_room(self, room_id: str) -> bool:
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                if room_id.isdigit():
                    cursor.execute("SELECT id_ruang FROM ruang WHERE id_ruang = %s LIMIT 1;", (int(room_id),))
                else:
                    cursor.execute("SELECT id_ruang FROM ruang WHERE kode_ruang = %s LIMIT 1;", (room_id,))
                existing = cursor.fetchone()
                if not existing:
                    return False
                db_id = int(existing["id_ruang"])

                cursor.execute("SELECT id_jadwal FROM jadwal_kuliah WHERE id_ruang = %s;", (db_id,))
                jadwal_ids = [int(r["id_jadwal"]) for r in cursor.fetchall()]
                if jadwal_ids:
                    ph = ",".join(["%s"] * len(jadwal_ids))
                    cursor.execute(f"DELETE FROM deteksi_bentrok WHERE id_jadwal_1 IN ({ph}) OR id_jadwal_2 IN ({ph});", tuple(jadwal_ids + jadwal_ids))
                    cursor.execute(f"DELETE FROM perubahan_jadwal WHERE id_jadwal IN ({ph});", tuple(jadwal_ids))
                    cursor.execute(f"DELETE FROM pertemuan_kuliah WHERE id_jadwal IN ({ph});", tuple(jadwal_ids))
                    cursor.execute(f"DELETE FROM jadwal_kuliah WHERE id_jadwal IN ({ph});", tuple(jadwal_ids))

                cursor.execute("DELETE FROM perubahan_jadwal WHERE id_ruang_lama = %s OR id_ruang_baru = %s;", (db_id, db_id))
                cursor.execute("DELETE FROM pertemuan_kuliah WHERE id_ruang_aktual = %s;", (db_id,))
                cursor.execute("DELETE FROM ruang WHERE id_ruang = %s;", (db_id,))
            conn.commit()
            return True
        finally:
            conn.close()

    # -----------------------------------------------------------------
    # Generator Jadwal CP-SAT + Penyimpanan ke `jadwal_versi` & `jadwal_kuliah`
    # -----------------------------------------------------------------
    def _build_course_inputs(
        self, department: Optional[str] = None, max_classes: Optional[int] = None
    ) -> Tuple[List[CourseClass], Dict[str, int], List[Lecturer], List[StudentGroup]]:
        all_classes = self.get_classes(department=department)
        req_classes = [c for c in all_classes if c.requires_room]
        if max_classes and len(req_classes) > max_classes:
            req_classes = req_classes[:max_classes]

        conn = get_db_connection()
        id_map: Dict[str, int] = {}
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT k.id_kelas, CONCAT(mk.kode_mk, '-', k.kode_kelas) AS cid FROM kelas k JOIN mata_kuliah mk ON k.id_mk = mk.id_mk;"
                )
                id_map = {r["cid"]: int(r["id_kelas"]) for r in cursor.fetchall()}
        finally:
            conn.close()

        course_classes: List[CourseClass] = []
        lecturers_map: Dict[str, Lecturer] = {}
        groups_map: Dict[str, StudentGroup] = {}

        for c in req_classes:
            slot_duration = 2 if c.sks >= 3 else 1
            r_type = RoomType.LAB.value if "lab" in c.room_type_needed.lower() else RoomType.TEORI.value
            group_ids = [c.rombel_key] if c.rombel_key else [f"group_{c.id}"]

            cc = CourseClass(
                id=c.id,
                code=c.course_code,
                name=c.name,
                class_label=c.class_label,
                department=c.department,
                semester=c.semester,
                size=c.enrolled_count,
                duration=slot_duration,
                lecturer_ids=c.lecturer_ids,
                group_ids=group_ids,
                sks=c.sks,
                room_type=r_type,
                is_mandatory=c.is_mandatory,
            )
            course_classes.append(cc)

            for idx_l, lid in enumerate(c.lecturer_ids):
                if lid not in lecturers_map:
                    lname = c.lecturer_names[idx_l] if idx_l < len(c.lecturer_names) else lid
                    lecturers_map[lid] = Lecturer(id=lid, name=lname, department=c.department)
            for gid in group_ids:
                if gid not in groups_map:
                    groups_map[gid] = StudentGroup(id=gid, name=gid, department=c.department, semester=c.semester)

        return course_classes, id_map, list(lecturers_map.values()), list(groups_map.values())

    def run_preflight(self, department: Optional[str] = None) -> DiagnosticsOutput:
        courses, _, lecturers, groups = self._build_course_inputs(department=department)
        return ScheduleDiagnostics.run_preflight_checks(
            courses=courses,
            rooms=self.get_rooms(),
            slots=self.slots,
            lecturers=lecturers,
            groups=groups,
        )

    def solve_cpsat(
        self,
        department: Optional[str] = None,
        max_classes: Optional[int] = None,
        weights: Optional[ObjectiveWeights] = None,
        config: Optional[SolverConfig] = None,
    ) -> SolverResultOutput:
        courses, db_kelas_map, lecturers, groups = self._build_course_inputs(
            department=department, max_classes=max_classes
        )
        rooms = self.get_rooms()

        cfg = config or SolverConfig(
            max_time_in_seconds=60.0,
            num_search_workers=8,
            linearization_level=0,
            search_branching="PORTFOLIO_SEARCH",
        )
        wt = weights or ObjectiveWeights(w_gap=10, w_pref=4, w_spread=3, w_waste=1)

        scheduler = CPSATSchedulerService(config=cfg, weights=wt)
        result = scheduler.solve(
            courses=courses,
            rooms=rooms,
            slots=self.slots,
            lecturers=lecturers,
            groups=groups,
        )

        if result.status not in ("OPTIMAL", "FEASIBLE"):
            return result

        # Simpan ke MySQL (jadwal_versi + jadwal_kuliah + proses_optimasi)
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                sem = self._get_active_semester(cursor)
                id_semester = int(sem["id_semester"])
                admin_id = self._resolve_actor_user(cursor, ("SUPERADMIN", "ADMIN"))
                if admin_id is None:
                    raise RuntimeError("Akun Admin tidak ditemukan di tabel pengguna.")

                cursor.execute(
                    "SELECT COALESCE(MAX(nomor_versi), 0) AS max_ver FROM jadwal_versi WHERE id_semester = %s;",
                    (id_semester,),
                )
                next_ver = int(cursor.fetchone()["max_ver"]) + 1

                cursor.execute(
                    """
                    INSERT INTO jadwal_versi (id_semester, nomor_versi, tahap, status_versi, dibuat_oleh)
                    VALUES (%s, %s, 'DRAFT_ADMIN', 'DRAFT', %s);
                    """,
                    (id_semester, next_ver, admin_id),
                )
                id_versi = int(cursor.lastrowid)

                room_lookup = {r["db_ruang_id"]: r for r in self.get_rooms_raw()}
                for sc in result.schedule:
                    db_kelas_id = db_kelas_map.get(sc.class_id)
                    db_ruang_id = int(sc.room_id)
                    if not db_kelas_id:
                        continue
                    cursor.execute(
                        """
                        INSERT INTO jadwal_kuliah (id_versi, id_kelas, id_ruang, hari, jam_mulai, jam_selesai)
                        VALUES (%s, %s, %s, %s, %s, %s);
                        """,
                        (
                            id_versi,
                            db_kelas_id,
                            db_ruang_id,
                            sc.day,
                            f"{sc.start_time}:00",
                            f"{sc.end_time}:00",
                        ),
                    )
                    sc.jadwal_id = int(cursor.lastrowid)
                    sc.db_kelas_id = db_kelas_id
                    sc.db_ruang_id = db_ruang_id
                    if db_ruang_id in room_lookup:
                        sc.building = room_lookup[db_ruang_id]["building"]

                # Catat ke konfigurasi_algoritma & proses_optimasi
                cfg_name = f"CP-SAT #{next_ver}"
                cursor.execute(
                    """
                    INSERT INTO konfigurasi_algoritma (
                        id_pembuat, nama_konfigurasi, ukuran_populasi,
                        peluang_crossover, peluang_mutasi, maks_generasi,
                        bobot_preferensi_hari, bobot_kondisi_pribadi,
                        bobot_beban_harian, bobot_pemerataan
                    ) VALUES (%s, %s, %s, 0, 0, %s, %s, %s, %s, %s);
                    """,
                    (
                        admin_id,
                        cfg_name,
                        int(cfg.num_search_workers),
                        int(cfg.max_time_in_seconds),
                        float(wt.w_pref),
                        float(wt.w_gap),
                        float(wt.w_waste),
                        float(wt.w_spread),
                    ),
                )
                id_konfig = int(cursor.lastrowid)
                now_dt = datetime.now()
                cursor.execute(
                    """
                    INSERT INTO proses_optimasi (
                        id_konfigurasi, id_versi_awal, id_versi_hasil, id_pemicu,
                        algoritma, waktu_mulai, waktu_selesai, status_proses,
                        generasi_tercapai, penalti_sebelum, penalti_sesudah
                    ) VALUES (%s, %s, %s, %s, 'CP-SAT', %s, %s, %s, %s, 0, %s);
                    """,
                    (
                        id_konfig,
                        id_versi,
                        id_versi,
                        admin_id,
                        now_dt,
                        now_dt,
                        result.status,
                        int(result.scheduled_classes),
                        float(result.penalty_breakdown.total_weighted_penalty),
                    ),
                )

                result.version_id = id_versi
                result.version_number = next_ver
                result.tahap = "DRAFT_ADMIN"
                result.status_versi = "DRAFT"
                result.approval_status = "Menunggu Persetujuan"
                result.semester_label = f"{sem['tahun_ajaran']} {sem['jenis_semester']}"
            conn.commit()
        finally:
            conn.close()

        return result

    def _slot_index_for(self, day: str, start_time: str, duration: int) -> Tuple[int, int, List[str]]:
        day_base = DAYS.index(day) * len(SLOT_TIMES) if day in DAYS else 0
        start_daily = 0
        for idx, (st, _) in enumerate(SLOT_TIMES):
            if st == start_time:
                start_daily = idx
                break
        else:
            # Pilih slot terdekat berdasarkan jam mulai
            try:
                hh, mm = [int(x) for x in start_time.split(":")[:2]]
                req_min = hh * 60 + mm
                best_i = 0
                best_diff = 9999
                for idx, (st, _) in enumerate(SLOT_TIMES):
                    sh, sm = [int(x) for x in st.split(":")]
                    diff = abs(req_min - (sh * 60 + sm))
                    if diff < best_diff:
                        best_diff = diff
                        best_i = idx
                start_daily = best_i
            except Exception:
                start_daily = 0

        start_idx = day_base + start_daily
        end_idx = min(day_base + len(SLOT_TIMES) - 1, start_idx + max(1, duration) - 1)
        slot_ids = [
            f"slot_{day[:3].lower()}_{start_daily + offset + 1}"
            for offset in range(max(1, end_idx - start_idx + 1))
        ]
        return start_idx, end_idx, slot_ids

    def get_latest_schedule(self) -> Optional[SolverResultOutput]:
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT jv.*, sa.tahun_ajaran, sa.jenis_semester
                    FROM jadwal_versi jv
                    JOIN semester_akademik sa ON jv.id_semester = sa.id_semester
                    ORDER BY jv.id_versi DESC
                    LIMIT 1;
                    """
                )
                ver = cursor.fetchone()
                if not ver:
                    return None

                id_versi = int(ver["id_versi"])
                cursor.execute(
                    """
                    SELECT
                        jk.id_jadwal, jk.id_kelas, jk.id_ruang, jk.hari, jk.jam_mulai, jk.jam_selesai,
                        k.kode_kelas, k.target_angkatan, k.estimasi_mahasiswa, k.jumlah_peserta,
                        mk.kode_mk, mk.nama_mk, mk.sks, mk.semester_paket, mk.jenis_mk,
                        pr_pengaju.kode_prodi AS dept_code,
                        r.kode_ruang, r.nama_ruang, r.gedung, r.lantai, r.kapasitas
                    FROM jadwal_kuliah jk
                    JOIN kelas k ON jk.id_kelas = k.id_kelas
                    JOIN mata_kuliah mk ON k.id_mk = mk.id_mk
                    JOIN pengguna u ON k.id_pengaju = u.id_pengguna
                    JOIN program_studi pr_pengaju ON u.id_prodi = pr_pengaju.id_prodi
                    JOIN ruang r ON jk.id_ruang = r.id_ruang
                    WHERE jk.id_versi = %s
                    ORDER BY FIELD(jk.hari, 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'), jk.jam_mulai ASC, r.kode_ruang ASC;
                    """,
                    (id_versi,),
                )
                jrows = cursor.fetchall()

                cursor.execute(
                    """
                    SELECT po.status_proses, po.penalti_sesudah,
                           ka.bobot_preferensi_hari, ka.bobot_kondisi_pribadi,
                           ka.bobot_beban_harian, ka.bobot_pemerataan
                    FROM proses_optimasi po
                    JOIN konfigurasi_algoritma ka ON po.id_konfigurasi = ka.id_konfigurasi
                    WHERE po.id_versi_hasil = %s
                    ORDER BY po.id_proses DESC LIMIT 1;
                    """,
                    (id_versi,),
                )
                proc = cursor.fetchone()

                cursor.execute(
                    """
                    SELECT db.deskripsi
                    FROM deteksi_bentrok db
                    JOIN jadwal_kuliah jk ON db.id_jadwal_1 = jk.id_jadwal
                    WHERE jk.id_versi = %s AND db.jenis_bentrok = 'CATATAN_WADEK1'
                    ORDER BY db.id_bentrok DESC LIMIT 1;
                    """,
                    (id_versi,),
                )
                rev_row = cursor.fetchone()

                cursor.execute("SELECT COUNT(*) AS total FROM kelas WHERE status_kelas <> 'NON_RUANG';")
                total_active = int(cursor.fetchone()["total"])

                cursor.execute(
                    """
                    SELECT pk.id_kelas, u.nama_lengkap
                    FROM pengampu_kelas pk
                    JOIN dosen d ON pk.id_dosen = d.id_dosen
                    JOIN pengguna u ON d.id_pengguna = u.id_pengguna;
                    """
                )
                db_lecturers: Dict[int, List[str]] = {}
                for lr in cursor.fetchall():
                    db_lecturers.setdefault(int(lr["id_kelas"]), []).append(lr["nama_lengkap"])
        finally:
            conn.close()

        scheduled_list: List[ScheduledClassOutput] = []
        for jr in jrows:
            cid = f"{jr['kode_mk']}-{jr['kode_kelas']}"
            dept = normalize_dept(jr.get("dept_code"), jr["kode_mk"])
            sem_num = self._derive_semester(
                ver["tahun_ajaran"], ver["jenis_semester"], jr["target_angkatan"], jr["semester_paket"]
            )
            sks_val = int(jr["sks"])
            duration = 2 if sks_val >= 3 else 1
            start_t = format_db_time(jr["jam_mulai"])
            end_t = format_db_time(jr["jam_selesai"])
            s_idx, e_idx, s_ids = self._slot_index_for(jr["hari"], start_t, duration)
            size = int(jr["jumlah_peserta"] or 0) or int(jr["estimasi_mahasiswa"] or 40)

            csv_meta = (
                self._csv_meta_by_id.get(cid)
                or self._csv_meta_by_key.get((jr["kode_mk"], dept, sem_num, jr["kode_kelas"]))
                or {}
            )
            id_kelas = int(jr["id_kelas"])
            if id_kelas in db_lecturers and db_lecturers[id_kelas]:
                lec_names = list(db_lecturers[id_kelas])
            else:
                lec_names = list(csv_meta.get("lecturer_names") or [f"Dosen Pengampu {dept}"])
            rkey = csv_meta.get("rombel_key") or f"{dept}-S{sem_num}-{jr['kode_kelas']}"

            scheduled_list.append(
                ScheduledClassOutput(
                    class_id=cid,
                    course_code=jr["kode_mk"],
                    course_name=jr["nama_mk"],
                    class_label=csv_meta.get("class_label") or jr["kode_kelas"],
                    department=dept,
                    semester=sem_num,
                    size=size,
                    duration=duration,
                    sks=sks_val,
                    room_id=str(jr["id_ruang"]),
                    room_name=jr["kode_ruang"],
                    room_capacity=int(jr["kapasitas"]),
                    room_type="Lab" if "praktikum" in (jr["jenis_mk"] or "").lower() else "Teori",
                    floor=int(jr["lantai"]),
                    building=f"Gedung {jr['gedung']}" if len(jr["gedung"]) <= 2 else jr["gedung"],
                    day=jr["hari"],
                    start_slot_index=s_idx,
                    end_slot_index=e_idx,
                    start_time=start_t,
                    end_time=end_t,
                    slot_ids=s_ids,
                    lecturer_names=lec_names,
                    group_names=[rkey],
                    jadwal_id=int(jr["id_jadwal"]),
                    db_kelas_id=int(jr["id_kelas"]),
                    db_ruang_id=int(jr["id_ruang"]),
                )
            )

        total_pen = int(float(proc["penalti_sesudah"])) if proc and proc.get("penalti_sesudah") is not None else 0
        return SolverResultOutput(
            status=(proc.get("status_proses") if proc else None) or "OPTIMAL",
            wall_time_seconds=0.5,
            total_classes=total_active or len(scheduled_list),
            scheduled_classes=len(scheduled_list),
            penalty_breakdown=PenaltyBreakdown(total_weighted_penalty=total_pen),
            schedule=scheduled_list,
            version_id=id_versi,
            version_number=int(ver["nomor_versi"]),
            tahap=ver["tahap"],
            status_versi=ver["status_versi"],
            approval_status=map_status_versi_to_ui(ver["status_versi"], ver["tahap"]),
            revision_note=rev_row["deskripsi"] if rev_row else "",
            semester_label=f"{ver['tahun_ajaran']} {ver['jenis_semester']}",
        )

    # -----------------------------------------------------------------
    # Workflow Persetujuan Wakil Dekan I & Publikasi Resmi
    # -----------------------------------------------------------------
    def _get_target_versi_id(self, cursor, version_id: Optional[int] = None) -> int:
        if version_id is not None:
            return int(version_id)
        cursor.execute("SELECT id_versi FROM jadwal_versi ORDER BY id_versi DESC LIMIT 1;")
        row = cursor.fetchone()
        if not row:
            raise ValueError("Belum ada versi jadwal yang digenerate. Jalankan CP-SAT terlebih dahulu.")
        return int(row["id_versi"])

    def submit_to_wadek(self, version_id: Optional[int] = None) -> Dict[str, Any]:
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                vid = self._get_target_versi_id(cursor, version_id)
                cursor.execute(
                    """
                    UPDATE jadwal_versi
                    SET tahap = 'REVIEW_WADEK1', status_versi = 'MENUNGGU_PERSETUJUAN'
                    WHERE id_versi = %s;
                    """,
                    (vid,),
                )
                cursor.execute("SELECT * FROM jadwal_versi WHERE id_versi = %s;", (vid,))
                ver = cursor.fetchone()
            conn.commit()
        finally:
            conn.close()

        return {
            "message": "Draf jadwal berhasil dikirim ke Wakil Dekan I untuk review.",
            "version_id": int(ver["id_versi"]),
            "version_number": int(ver["nomor_versi"]),
            "tahap": ver["tahap"],
            "status_versi": ver["status_versi"],
            "approval_status": map_status_versi_to_ui(ver["status_versi"], ver["tahap"]),
        }

    def wadek_decision(self, approved: bool, note: str = "", version_id: Optional[int] = None) -> Dict[str, Any]:
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                vid = self._get_target_versi_id(cursor, version_id)
                cursor.execute(
                    """
                    SELECT d.id_dosen, d.id_pengguna
                    FROM dosen d
                    JOIN pengguna p ON d.id_pengguna = p.id_pengguna
                    WHERE UPPER(p.peran) = 'WADEK1'
                    ORDER BY d.id_dosen ASC LIMIT 1;
                    """
                )
                wd1 = cursor.fetchone()
                wd1_dosen_id = int(wd1["id_dosen"]) if wd1 else None
                wd1_user_id = int(wd1["id_pengguna"]) if wd1 else self._resolve_actor_user(cursor, ("WADEK1", "SUPERADMIN"))

                if approved:
                    cursor.execute(
                        """
                        UPDATE jadwal_versi
                        SET tahap = 'DISETUJUI_WD1',
                            status_versi = 'DISETUJUI',
                            id_wd1_penyetuju = %s,
                            tgl_persetujuan = NOW()
                        WHERE id_versi = %s;
                        """,
                        (wd1_dosen_id, vid),
                    )
                else:
                    if not note.strip():
                        raise ValueError("Catatan revisi wajib diisi saat mengembalikan draf ke Admin.")
                    cursor.execute(
                        """
                        UPDATE jadwal_versi
                        SET tahap = 'REVISI_ADMIN',
                            status_versi = 'REVISI'
                        WHERE id_versi = %s;
                        """,
                        (vid,),
                    )
                    # Bersihkan catatan revisi lama pada versi ini lalu simpan yang terbaru ke deteksi_bentrok
                    cursor.execute(
                        """
                        DELETE db FROM deteksi_bentrok db
                        JOIN jadwal_kuliah jk ON db.id_jadwal_1 = jk.id_jadwal
                        WHERE jk.id_versi = %s AND db.jenis_bentrok = 'CATATAN_WADEK1';
                        """,
                        (vid,),
                    )
                    cursor.execute(
                        "SELECT id_jadwal FROM jadwal_kuliah WHERE id_versi = %s ORDER BY id_jadwal ASC LIMIT 1;",
                        (vid,),
                    )
                    first_j = cursor.fetchone()
                    if first_j:
                        jid = int(first_j["id_jadwal"])
                        cursor.execute(
                            """
                            INSERT INTO deteksi_bentrok (id_jadwal_1, id_jadwal_2, id_penindak, jenis_bentrok, deskripsi, status_bentrok)
                            VALUES (%s, %s, %s, 'CATATAN_WADEK1', %s, 'REVISI');
                            """,
                            (jid, jid, wd1_user_id, note.strip()),
                        )

                cursor.execute("SELECT * FROM jadwal_versi WHERE id_versi = %s;", (vid,))
                ver = cursor.fetchone()
            conn.commit()
        finally:
            conn.close()

        return {
            "message": "Jadwal disetujui oleh Wakil Dekan I." if approved else "Catatan revisi Wadek I disimpan.",
            "version_id": int(ver["id_versi"]),
            "version_number": int(ver["nomor_versi"]),
            "tahap": ver["tahap"],
            "status_versi": ver["status_versi"],
            "approval_status": map_status_versi_to_ui(ver["status_versi"], ver["tahap"]),
            "revision_note": "" if approved else note.strip(),
        }

    def publish_schedule(self, version_id: Optional[int] = None) -> Dict[str, Any]:
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                vid = self._get_target_versi_id(cursor, version_id)
                cursor.execute("SELECT * FROM jadwal_versi WHERE id_versi = %s;", (vid,))
                ver = cursor.fetchone()
                if ver["status_versi"] not in ("DISETUJUI", "RESMI"):
                    raise ValueError("Jadwal hanya dapat diterbitkan setelah disetujui Wakil Dekan I.")
                admin_id = self._resolve_actor_user(cursor, ("SUPERADMIN", "ADMIN"))
                cursor.execute(
                    """
                    UPDATE jadwal_versi
                    SET tahap = 'PUBLIKASI',
                        status_versi = 'RESMI',
                        id_penerbit = %s,
                        tgl_publikasi = NOW()
                    WHERE id_versi = %s;
                    """,
                    (admin_id, vid),
                )
                cursor.execute("SELECT * FROM jadwal_versi WHERE id_versi = %s;", (vid,))
                ver = cursor.fetchone()
            conn.commit()
        finally:
            conn.close()

        return {
            "message": "Jadwal perkuliahan resmi berhasil dipublikasikan.",
            "version_id": int(ver["id_versi"]),
            "version_number": int(ver["nomor_versi"]),
            "tahap": ver["tahap"],
            "status_versi": ver["status_versi"],
            "approval_status": map_status_versi_to_ui(ver["status_versi"], ver["tahap"]),
        }

    def _resolve_admin_actor_id(self, cursor, actor_email: Optional[str] = None) -> Optional[int]:
        if actor_email:
            cursor.execute(
                "SELECT id_pengguna FROM pengguna WHERE LOWER(email) = LOWER(%s) AND UPPER(peran) IN ('SUPERADMIN', 'ADMIN') LIMIT 1;",
                (actor_email.strip(),),
            )
            row = cursor.fetchone()
            if row:
                return int(row["id_pengguna"])
        return self._resolve_actor_user(cursor, ("SUPERADMIN", "ADMIN"))

    def _build_version_snapshot(self, cursor, id_versi: int) -> List[Dict[str, Any]]:
        cursor.execute(
            """
            SELECT
                jk.id_jadwal, jk.id_versi, jk.id_kelas, jk.id_ruang, jk.hari, jk.jam_mulai, jk.jam_selesai,
                k.kode_kelas, k.target_angkatan, k.estimasi_mahasiswa, k.jumlah_peserta, k.status_kelas,
                mk.kode_mk, mk.nama_mk, mk.sks, mk.semester_paket, mk.jenis_mk,
                pr_pengaju.kode_prodi AS dept_code,
                r.kode_ruang, r.kapasitas,
                sa.tahun_ajaran, sa.jenis_semester
            FROM jadwal_kuliah jk
            JOIN jadwal_versi jv ON jk.id_versi = jv.id_versi
            JOIN semester_akademik sa ON jv.id_semester = sa.id_semester
            JOIN kelas k ON jk.id_kelas = k.id_kelas
            JOIN mata_kuliah mk ON k.id_mk = mk.id_mk
            JOIN pengguna u ON k.id_pengaju = u.id_pengguna
            JOIN program_studi pr_pengaju ON u.id_prodi = pr_pengaju.id_prodi
            JOIN ruang r ON jk.id_ruang = r.id_ruang
            WHERE jk.id_versi = %s;
            """,
            (id_versi,),
        )
        jrows = cursor.fetchall()

        cursor.execute(
            """
            SELECT pk.id_kelas, u.nama_lengkap
            FROM pengampu_kelas pk
            JOIN dosen d ON pk.id_dosen = d.id_dosen
            JOIN pengguna u ON d.id_pengguna = u.id_pengguna;
            """
        )
        db_lecturers: Dict[int, List[str]] = {}
        for lr in cursor.fetchall():
            db_lecturers.setdefault(int(lr["id_kelas"]), []).append(lr["nama_lengkap"])

        snapshot: List[Dict[str, Any]] = []
        for jr in jrows:
            cid = f"{jr['kode_mk']}-{jr['kode_kelas']}"
            dept = normalize_dept(jr.get("dept_code"), jr["kode_mk"])
            sem_num = self._derive_semester(
                jr["tahun_ajaran"], jr["jenis_semester"], jr["target_angkatan"], jr["semester_paket"]
            )
            csv_meta = (
                self._csv_meta_by_id.get(cid)
                or self._csv_meta_by_key.get((jr["kode_mk"], dept, sem_num, jr["kode_kelas"]))
                or {}
            )
            id_kelas = int(jr["id_kelas"])
            lec_names = list(db_lecturers.get(id_kelas) or csv_meta.get("lecturer_names") or [])
            jenis_mk = (jr.get("jenis_mk") or "").lower()
            status_kelas = (jr.get("status_kelas") or "TERBUKA").upper()
            is_mandatory = "pilihan" not in jenis_mk and status_kelas != "TRANSISI_TERBUKA" and "transisi" not in jenis_mk
            rkey = csv_meta.get("rombel_key") or (f"{dept}-S{sem_num}-{jr['kode_kelas']}" if is_mandatory else "")
            start_t = format_db_time(jr["jam_mulai"])
            end_t = format_db_time(jr["jam_selesai"])

            snapshot.append(
                {
                    "item_id": int(jr["id_jadwal"]),
                    "jadwal_id": int(jr["id_jadwal"]),
                    "id_versi": int(jr["id_versi"]),
                    "course_code": jr["kode_mk"],
                    "course_name": jr["nama_mk"],
                    "class_label": csv_meta.get("class_label") or jr["kode_kelas"],
                    "student_count": int(jr["jumlah_peserta"] or 0) or int(jr["estimasi_mahasiswa"] or 40),
                    "room_id": str(jr["id_ruang"]),
                    "room_name": jr["kode_ruang"],
                    "room_capacity": int(jr["kapasitas"]),
                    "day": normalize_day_name(jr["hari"]),
                    "start_min": parse_time_to_minutes(start_t),
                    "end_min": parse_time_to_minutes(end_t),
                    "lecturer_names": lec_names,
                    "rombel_key": rkey,
                    "is_mandatory": is_mandatory,
                    "sks": int(jr["sks"]),
                }
            )
        return snapshot

    def update_schedule_item(
        self,
        jadwal_id: int,
        day: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        room_id: Optional[int] = None,
        sks: Optional[int] = None,
        reason: Optional[str] = None,
        actor_role: Optional[str] = "admin",
        actor_email: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        if actor_role and actor_role.strip().lower() not in ("admin", "superadmin"):
            raise PermissionError("Hanya Admin yang diizinkan mengubah jadwal secara manual.")

        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM jadwal_kuliah WHERE id_jadwal = %s LIMIT 1;", (jadwal_id,))
                current_row = cursor.fetchone()
                if not current_row:
                    return None

                id_versi = int(current_row["id_versi"])
                snapshot = self._build_version_snapshot(cursor, id_versi)
                target = next((it for it in snapshot if it["item_id"] == int(jadwal_id)), None)
                if not target:
                    return None

                new_day = normalize_day_name(day or target["day"])
                new_start_min = parse_time_to_minutes(start_time) if start_time else int(target["start_min"])
                if end_time:
                    new_end_min = parse_time_to_minutes(end_time)
                elif sks is not None:
                    new_end_min = new_start_min + max(1, int(sks)) * 50
                else:
                    existing_dur = max(50, int(target["end_min"]) - int(target["start_min"]))
                    new_end_min = new_start_min + existing_dur

                target_room_db_id = int(room_id) if room_id is not None else int(current_row["id_ruang"])
                cursor.execute("SELECT id_ruang, kode_ruang, kapasitas FROM ruang WHERE id_ruang = %s LIMIT 1;", (target_room_db_id,))
                room_row = cursor.fetchone()
                if not room_row:
                    raise ValueError(f"Ruangan dengan ID {target_room_db_id} tidak ditemukan.")

                conflicts = evaluate_move_conflicts(
                    target=target,
                    target_day=new_day,
                    target_start_min=new_start_min,
                    target_end_min=new_end_min,
                    target_room_id=str(room_row["id_ruang"]),
                    target_room_name=room_row["kode_ruang"],
                    target_room_capacity=int(room_row["kapasitas"]),
                    items=snapshot,
                    ignore_ids={int(jadwal_id)},
                )
                if conflicts:
                    raise ScheduleConflictException(
                        conflicts[0]["reason"],
                        conflicts,
                    )

                new_start_str = minutes_to_hhmm(new_start_min)
                new_end_str = minutes_to_hhmm(new_end_min)
                cursor.execute(
                    """
                    UPDATE jadwal_kuliah
                    SET hari = %s, jam_mulai = %s, jam_selesai = %s, id_ruang = %s
                    WHERE id_jadwal = %s;
                    """,
                    (
                        new_day,
                        f"{new_start_str}:00",
                        f"{new_end_str}:00",
                        target_room_db_id,
                        int(jadwal_id),
                    ),
                )

                admin_id = self._resolve_admin_actor_id(cursor, actor_email)
                if admin_id is not None:
                    old_start_str = format_db_time(current_row["jam_mulai"])
                    cursor.execute(
                        """
                        INSERT INTO perubahan_jadwal (
                            id_jadwal, id_pengguna, hari_lama, jam_mulai_lama,
                            hari_baru, jam_mulai_baru, id_ruang_lama, id_ruang_baru, alasan
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                        """,
                        (
                            int(jadwal_id),
                            admin_id,
                            current_row["hari"],
                            f"{old_start_str}:00",
                            new_day,
                            f"{new_start_str}:00",
                            int(current_row["id_ruang"]),
                            target_room_db_id,
                            (reason or "Penyesuaian jadwal manual oleh Admin").strip(),
                        ),
                    )
            conn.commit()
            return {
                "message": "Jadwal kelas berhasil diperbarui tanpa bentrok.",
                "jadwal_id": int(jadwal_id),
                "day": new_day,
                "start_time": new_start_str,
                "end_time": new_end_str,
                "room_id": target_room_db_id,
                "room_name": room_row["kode_ruang"],
            }
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def swap_schedule_items(
        self,
        jadwal_id_a: int,
        jadwal_id_b: int,
        a_sks: Optional[int] = None,
        reason: Optional[str] = None,
        actor_role: Optional[str] = "admin",
        actor_email: Optional[str] = None,
    ) -> Dict[str, Any]:
        if actor_role and actor_role.strip().lower() not in ("admin", "superadmin"):
            raise PermissionError("Hanya Admin yang diizinkan melakukan pertukaran jadwal.")
        if int(jadwal_id_a) == int(jadwal_id_b):
            raise ValueError("Pilih dua kelas berbeda untuk ditukar jadwalnya.")

        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM jadwal_kuliah WHERE id_jadwal = %s LIMIT 1;", (int(jadwal_id_a),))
                row_a = cursor.fetchone()
                cursor.execute("SELECT * FROM jadwal_kuliah WHERE id_jadwal = %s LIMIT 1;", (int(jadwal_id_b),))
                row_b = cursor.fetchone()
                if not row_a or not row_b:
                    raise LookupError("Salah satu jadwal yang akan ditukar tidak ditemukan di database.")
                if int(row_a["id_versi"]) != int(row_b["id_versi"]):
                    raise ValueError("Kedua kelas harus berada pada versi jadwal yang sama.")

                id_versi = int(row_a["id_versi"])
                snapshot = self._build_version_snapshot(cursor, id_versi)
                item_a = next((it for it in snapshot if it["item_id"] == int(jadwal_id_a)), None)
                item_b = next((it for it in snapshot if it["item_id"] == int(jadwal_id_b)), None)
                if not item_a or not item_b:
                    raise LookupError("Data lengkap jadwal untuk pertukaran tidak ditemukan.")

                swap_eval = evaluate_swap_conflicts(item_a, item_b, snapshot, a_sks_override=a_sks)
                if not swap_eval["is_safe"]:
                    raise ScheduleConflictException(
                        swap_eval["all_conflicts"][0]["reason"],
                        swap_eval["all_conflicts"],
                    )

                a_new = swap_eval["a_new"]
                b_new = swap_eval["b_new"]
                cursor.execute(
                    """
                    UPDATE jadwal_kuliah
                    SET hari = %s, jam_mulai = %s, jam_selesai = %s, id_ruang = %s
                    WHERE id_jadwal = %s;
                    """,
                    (
                        a_new["day"],
                        f"{a_new['start_time']}:00",
                        f"{a_new['end_time']}:00",
                        int(a_new["room_id"]),
                        int(jadwal_id_a),
                    ),
                )
                cursor.execute(
                    """
                    UPDATE jadwal_kuliah
                    SET hari = %s, jam_mulai = %s, jam_selesai = %s, id_ruang = %s
                    WHERE id_jadwal = %s;
                    """,
                    (
                        b_new["day"],
                        f"{b_new['start_time']}:00",
                        f"{b_new['end_time']}:00",
                        int(b_new["room_id"]),
                        int(jadwal_id_b),
                    ),
                )

                admin_id = self._resolve_admin_actor_id(cursor, actor_email)
                if admin_id is not None:
                    base_reason = (reason or "").strip()
                    reason_a = base_reason or f"Tukar jadwal dengan {item_b['course_name']} ({item_b['class_label']})"
                    reason_b = base_reason or f"Tukar jadwal dengan {item_a['course_name']} ({item_a['class_label']})"
                    for old_row, new_info, note in (
                        (row_a, a_new, reason_a),
                        (row_b, b_new, reason_b),
                    ):
                        old_start_str = format_db_time(old_row["jam_mulai"])
                        cursor.execute(
                            """
                            INSERT INTO perubahan_jadwal (
                                id_jadwal, id_pengguna, hari_lama, jam_mulai_lama,
                                hari_baru, jam_mulai_baru, id_ruang_lama, id_ruang_baru, alasan
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                            """,
                            (
                                int(old_row["id_jadwal"]),
                                admin_id,
                                old_row["hari"],
                                f"{old_start_str}:00",
                                new_info["day"],
                                f"{new_info['start_time']}:00",
                                int(old_row["id_ruang"]),
                                int(new_info["room_id"]),
                                note,
                            ),
                        )
            conn.commit()
            return {
                "message": (
                    f"Pertukaran jadwal {item_a['course_name']} ({item_a['class_label']}) "
                    f"dan {item_b['course_name']} ({item_b['class_label']}) berhasil disimpan."
                ),
                "a": a_new,
                "b": b_new,
            }
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()


mysql_store = MySQLDataStore()
