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
    plan_autofix_moves,
    scan_schedule_issues,
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

        kuota_min = int(row.get("kuota_minimum_kelas") or 15)
        pref_hari_raw = row.get("preferensi_hari") or ""
        pref_hari = [x.strip() for x in pref_hari_raw.split(",") if x.strip()]
        sks_val = int(row["sks"])
        sks_teori = int(row.get("sks_teori") if row.get("sks_teori") is not None else (max(0, sks_val - 1) if is_lab else sks_val))
        sks_praktik = int(row.get("sks_praktik") if row.get("sks_praktik") is not None else (1 if is_lab else 0))

        return ClassItem(
            id=composite_id,
            course_code=kode_mk,
            department=dept,
            semester=semester,
            name=row["nama_mk"],
            class_label=class_label,
            sks=sks_val,
            sks_teori=sks_teori,
            sks_praktik=sks_praktik,
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
            status_kelas=status_kelas,
            alasan_pembatalan=row.get("alasan_pembatalan"),
            preferensi_hari=pref_hari,
            preferensi_waktu=row.get("preferensi_waktu"),
            catatan_khusus=row.get("catatan_khusus"),
            below_min_quota=(status_kelas != "DIBATALKAN" and requires_room and enrolled_count < kuota_min),
        )

    def _fetch_class_rows(self, cursor, where_clause: str = "", params: Tuple = ()) -> Tuple[List[Dict[str, Any]], Dict[int, List[Tuple[str, str]]]]:
        query = f"""
            SELECT
                k.id_kelas, k.id_semester, k.id_mk, k.id_pengaju, k.kode_kelas,
                k.target_angkatan, k.estimasi_mahasiswa, k.jumlah_peserta,
                k.butuh_aksesibilitas, k.status_kelas,
                k.alasan_pembatalan, k.preferensi_hari, k.preferensi_waktu, k.catatan_khusus,
                mk.kode_mk, mk.nama_mk, mk.sks, mk.sks_teori, mk.sks_praktik,
                mk.semester_paket, mk.jenis_mk, mk.lintas_prodi,
                pr_mk.kode_prodi AS mk_prodi,
                pr_pengaju.kode_prodi AS pengaju_prodi,
                sa.tahun_ajaran, sa.jenis_semester, sa.kuota_minimum_kelas
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
                    SELECT mk.id_mk, mk.kode_mk, mk.nama_mk, mk.sks, mk.sks_teori, mk.sks_praktik,
                           mk.semester_paket, mk.jenis_mk, mk.lintas_prodi, ps.kode_prodi, ps.nama_prodi
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
        include_cancelled: bool = False,
    ) -> List[ClassItem]:
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                rows, db_lecturers = self._fetch_class_rows(cursor)
        finally:
            conn.close()

        items = [self._row_to_class_item(r, db_lecturers) for r in rows]
        if not include_cancelled:
            items = [c for c in items if c.status_kelas != "DIBATALKAN"]

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

    def _resolve_actor_by_email_or_dept(
        self, cursor, actor_email: Optional[str], dept: Optional[str] = None
    ) -> int:
        if actor_email:
            cursor.execute(
                "SELECT id_pengguna FROM pengguna WHERE LOWER(email) = %s LIMIT 1;",
                (actor_email.strip().lower(),),
            )
            row = cursor.fetchone()
            if row:
                return int(row["id_pengguna"])
        if dept:
            return self._resolve_pengaju_for_dept(cursor, dept)
        uid = self._resolve_actor_user(cursor, ("SUPERADMIN", "ADMIN"))
        if uid is None:
            raise RuntimeError("Tabel pengguna kosong. Jalankan seed terlebih dahulu.")
        return uid

    def _resolve_or_create_dosen(
        self, cursor, name: str, id_prodi: int, nidn: Optional[str] = None
    ) -> Optional[int]:
        clean_name = (name or "").strip()
        if not clean_name:
            return None
        if nidn:
            cursor.execute("SELECT id_dosen FROM dosen WHERE nidn = %s LIMIT 1;", (nidn.strip(),))
            row = cursor.fetchone()
            if row:
                return int(row["id_dosen"])
        cursor.execute(
            """
            SELECT d.id_dosen
            FROM dosen d
            JOIN pengguna u ON d.id_pengguna = u.id_pengguna
            WHERE LOWER(u.nama_lengkap) = %s
            LIMIT 1;
            """,
            (clean_name.lower(),),
        )
        row = cursor.fetchone()
        if row:
            return int(row["id_dosen"])

        # Buat entri dosen baru agar relasi pengampu_kelas tersimpan di database
        import re
        import hashlib

        slug = re.sub(r"[^a-z0-9]+", ".", clean_name.lower()).strip(".")[:40] or "dosen"
        short_hash = hashlib.md5(clean_name.encode("utf-8")).hexdigest()[:6]
        username = f"dsn_{slug[:25]}_{short_hash}"
        email = f"{slug[:30]}.{short_hash}@dosen.unand.ac.id"
        nidn_val = (nidn or f"DSN-{short_hash.upper()}").strip()[:30]

        cursor.execute(
            "SELECT id_pengguna FROM pengguna WHERE username = %s OR email = %s LIMIT 1;",
            (username, email),
        )
        existing_u = cursor.fetchone()
        if existing_u:
            id_pengguna = int(existing_u["id_pengguna"])
        else:
            cursor.execute(
                """
                INSERT INTO pengguna (id_prodi, username, password_hash, nama_lengkap, email, peran, status_aktif)
                VALUES (%s, %s, %s, %s, %s, 'DOSEN', 1);
                """,
                (id_prodi, username, "$2b$10$placeholderdisabledhashforlecturer0000000000000000", clean_name[:150], email),
            )
            id_pengguna = int(cursor.lastrowid)

        cursor.execute("SELECT id_dosen FROM dosen WHERE id_pengguna = %s OR nidn = %s LIMIT 1;", (id_pengguna, nidn_val))
        existing_d = cursor.fetchone()
        if existing_d:
            return int(existing_d["id_dosen"])

        cursor.execute(
            """
            INSERT INTO dosen (id_pengguna, id_prodi, nidn, jabatan_struktural, maks_sks_harian)
            VALUES (%s, %s, %s, 'Dosen Pengampu', 12);
            """,
            (id_pengguna, id_prodi, nidn_val),
        )
        return int(cursor.lastrowid)

    def _sync_pengampu_kelas(
        self,
        cursor,
        id_kelas: int,
        id_prodi: int,
        lecturer_names: List[str],
        lecturer_ids: Optional[List[str]] = None,
    ) -> None:
        clean_names = [n.strip() for n in (lecturer_names or []) if n and n.strip()]
        if not clean_names:
            return
        cursor.execute("DELETE FROM pengampu_kelas WHERE id_kelas = %s;", (id_kelas,))
        seen_dosen: set[int] = set()
        for idx, lname in enumerate(clean_names):
            nidn_hint = lecturer_ids[idx] if (lecturer_ids and idx < len(lecturer_ids)) else None
            id_dosen = self._resolve_or_create_dosen(cursor, lname, id_prodi, nidn=nidn_hint)
            if id_dosen and id_dosen not in seen_dosen:
                seen_dosen.add(id_dosen)
                peran = "PJMK" if idx == 0 else "TANDEM"
                cursor.execute(
                    """
                    INSERT INTO pengampu_kelas (id_kelas, id_dosen, peran_pengampu)
                    VALUES (%s, %s, %s);
                    """,
                    (id_kelas, id_dosen, peran),
                )

    def _insert_perubahan_kebutuhan(
        self,
        cursor,
        id_pengguna: int,
        kode_prodi: str,
        kode_mk: str,
        jenis_aksi: str,
        id_kelas: Optional[int] = None,
        id_mk: Optional[int] = None,
        kode_kelas: Optional[str] = None,
        nilai_lama: Optional[str] = None,
        nilai_baru: Optional[str] = None,
        alasan: Optional[str] = None,
    ) -> None:
        cursor.execute(
            """
            INSERT INTO perubahan_kebutuhan (
                id_kelas, id_mk, id_pengguna, kode_prodi, kode_mk, kode_kelas,
                jenis_aksi, nilai_lama, nilai_baru, alasan
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
            """,
            (
                id_kelas,
                id_mk,
                id_pengguna,
                kode_prodi,
                kode_mk,
                kode_kelas,
                jenis_aksi,
                nilai_lama,
                nilai_baru,
                alasan,
            ),
        )

    def add_class(self, item: ClassItem) -> ClassItem:
        dept = normalize_dept(item.department, item.course_code)
        kode_mk = item.course_code.strip().upper()
        kode_kelas = item.class_label.strip() or "A"
        if not kode_mk or not item.name.strip():
            raise ValueError("Kode MK dan Nama Mata Kuliah wajib diisi.")
        if int(item.sks) < 1 or int(item.sks) > 6:
            raise ValueError("SKS harus bernilai antara 1 sampai 6.")
        if int(item.enrolled_count) < 1:
            raise ValueError("Estimasi jumlah mahasiswa harus minimal 1.")

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
                    sks_teori = int(item.sks_teori if item.sks_teori is not None else item.sks)
                    sks_praktik = int(item.sks_praktik if item.sks_praktik is not None else 0)
                    cursor.execute(
                        """
                        INSERT INTO mata_kuliah (
                            id_prodi, kode_mk, nama_mk, sks, sks_teori, sks_praktik,
                            semester_paket, jenis_mk, lintas_prodi
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                        """,
                        (id_prodi, kode_mk, item.name.strip(), item.sks, sks_teori, sks_praktik, item.semester, jenis_mk, False),
                    )
                    id_mk = int(cursor.lastrowid)

                cursor.execute(
                    "SELECT id_kelas, status_kelas FROM kelas WHERE id_semester = %s AND id_mk = %s AND kode_kelas = %s LIMIT 1;",
                    (sem["id_semester"], id_mk, kode_kelas),
                )
                existing_cls = cursor.fetchone()
                if existing_cls and existing_cls.get("status_kelas") != "DIBATALKAN":
                    raise ValueError(f"Kelas {kode_mk}-{kode_kelas} sudah ada di semester ini.")

                year_start = int(str(sem["tahun_ajaran"]).split("/")[0])
                target_angkatan = year_start - max(0, (int(item.semester) - 1) // 2)
                status_kelas = (
                    item.status_kelas
                    if item.status_kelas in ("DRAFT", "DIAJUKAN", "TERBUKA", "TRANSISI_TERBUKA", "NON_RUANG")
                    else ("NON_RUANG" if not item.requires_room else ("TRANSISI_TERBUKA" if item.is_transition_course else "TERBUKA"))
                )
                peserta = 0 if item.enrolled_is_estimated else int(item.enrolled_count)
                pref_hari_str = ",".join(item.preferensi_hari) if item.preferensi_hari else None

                if existing_cls:
                    new_id_kelas = int(existing_cls["id_kelas"])
                    cursor.execute(
                        """
                        UPDATE kelas
                        SET id_pengaju = %s, target_angkatan = %s, estimasi_mahasiswa = %s,
                            jumlah_peserta = %s, butuh_aksesibilitas = %s, status_kelas = %s,
                            alasan_pembatalan = NULL, preferensi_hari = %s, preferensi_waktu = %s,
                            catatan_khusus = %s
                        WHERE id_kelas = %s;
                        """,
                        (
                            id_pengaju,
                            target_angkatan,
                            int(item.enrolled_count),
                            peserta,
                            bool(item.requires_accessibility),
                            status_kelas,
                            pref_hari_str,
                            item.preferensi_waktu,
                            item.catatan_khusus,
                            new_id_kelas,
                        ),
                    )
                else:
                    cursor.execute(
                        """
                        INSERT INTO kelas (
                            id_semester, id_mk, id_pengaju, kode_kelas,
                            target_angkatan, estimasi_mahasiswa, jumlah_peserta,
                            butuh_aksesibilitas, status_kelas,
                            preferensi_hari, preferensi_waktu, catatan_khusus
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
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
                            pref_hari_str,
                            item.preferensi_waktu,
                            item.catatan_khusus,
                        ),
                    )
                    new_id_kelas = int(cursor.lastrowid)

                self._sync_pengampu_kelas(cursor, new_id_kelas, id_prodi, item.lecturer_names, item.lecturer_ids)
                self._insert_perubahan_kebutuhan(
                    cursor,
                    id_pengguna=id_pengaju,
                    kode_prodi=dept,
                    kode_mk=kode_mk,
                    kode_kelas=kode_kelas,
                    jenis_aksi="TAMBAH_KELAS",
                    id_kelas=new_id_kelas,
                    id_mk=id_mk,
                    nilai_baru=f"{item.sks} SKS, {item.enrolled_count} mhs, status {status_kelas}",
                )
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

                cursor.execute(
                    """
                    SELECT mk.id_prodi, mk.sks, ps.kode_prodi
                    FROM mata_kuliah mk
                    JOIN program_studi ps ON mk.id_prodi = ps.id_prodi
                    WHERE mk.id_mk = %s LIMIT 1;
                    """,
                    (id_mk,),
                )
                mk_meta = cursor.fetchone() or {"id_prodi": 1, "sks": 2, "kode_prodi": "SI"}
                id_prodi = int(mk_meta["id_prodi"])
                dept = mk_meta["kode_prodi"]

                old_summary = (
                    f"Kelas {existing['kode_kelas']}, kuota {existing['estimasi_mahasiswa']} mhs, "
                    f"SKS {mk_meta['sks']}, status {existing['status_kelas']}"
                )

                kelas_sets: List[str] = []
                kelas_vals: List[Any] = []

                if "class_label" in updates and updates["class_label"]:
                    kelas_sets.append("kode_kelas = %s")
                    kelas_vals.append(updates["class_label"].strip()[:20])
                if "enrolled_count" in updates and updates["enrolled_count"] is not None:
                    cnt = int(updates["enrolled_count"])
                    if cnt < 1:
                        raise ValueError("Kuota peserta harus minimal 1 mahasiswa.")
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
                    sks_val = int(updates["sks"])
                    if sks_val < 1 or sks_val > 6:
                        raise ValueError("SKS harus antara 1 sampai 6.")
                    mk_sets.append("sks = %s")
                    mk_vals.append(sks_val)
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

                if "lecturer_names" in updates and updates["lecturer_names"] is not None:
                    self._sync_pengampu_kelas(
                        cursor,
                        id_kelas,
                        id_prodi,
                        updates["lecturer_names"],
                        updates.get("lecturer_ids"),
                    )

                actor_id = self._resolve_actor_by_email_or_dept(cursor, updates.get("actor_email"), dept)
                new_summary = (
                    f"Kelas {updates.get('class_label') or existing['kode_kelas']}, "
                    f"kuota {updates.get('enrolled_count') or existing['estimasi_mahasiswa']} mhs, "
                    f"SKS {updates.get('sks') or mk_meta['sks']}"
                )
                self._insert_perubahan_kebutuhan(
                    cursor,
                    id_pengguna=actor_id,
                    kode_prodi=dept,
                    kode_mk=existing["kode_mk"],
                    kode_kelas=updates.get("class_label") or existing["kode_kelas"],
                    jenis_aksi="SESUAIKAN_KELAS",
                    id_kelas=id_kelas,
                    id_mk=id_mk,
                    nilai_lama=old_summary,
                    nilai_baru=new_summary,
                    alasan=updates.get("reason"),
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
                id_mk = int(existing["id_mk"])
                kode_mk = existing["kode_mk"]
                kode_kelas = existing["kode_kelas"]

                cursor.execute(
                    "SELECT ps.kode_prodi FROM mata_kuliah mk JOIN program_studi ps ON mk.id_prodi = ps.id_prodi WHERE mk.id_mk = %s LIMIT 1;",
                    (id_mk,),
                )
                dept_row = cursor.fetchone()
                dept = dept_row["kode_prodi"] if dept_row else "SI"
                actor_id = self._resolve_actor_by_email_or_dept(cursor, None, dept)

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

                self._insert_perubahan_kebutuhan(
                    cursor,
                    id_pengguna=actor_id,
                    kode_prodi=dept,
                    kode_mk=kode_mk,
                    kode_kelas=kode_kelas,
                    jenis_aksi="HAPUS_KELAS",
                    id_kelas=None,
                    id_mk=id_mk,
                    nilai_lama=f"{kode_mk}-{kode_kelas} ({existing['estimasi_mahasiswa']} mhs)",
                    nilai_baru="DIHAPUS",
                )
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
                r.kode_ruang, r.gedung, r.kapasitas,
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
                    "building": f"Gedung {jr['gedung']}" if len(jr["gedung"]) <= 2 else jr["gedung"],
                    "department": dept,
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

    # -----------------------------------------------------------------
    # Validasi Jadwal & Sinkronisasi Tabel `deteksi_bentrok` (UC-08)
    # -----------------------------------------------------------------
    def _sync_and_build_validation(self, cursor, id_versi: int) -> Dict[str, Any]:
        cursor.execute(
            """
            SELECT jv.*, sa.tahun_ajaran, sa.jenis_semester
            FROM jadwal_versi jv
            JOIN semester_akademik sa ON jv.id_semester = sa.id_semester
            WHERE jv.id_versi = %s LIMIT 1;
            """,
            (id_versi,),
        )
        ver = cursor.fetchone()
        if not ver:
            raise LookupError("Versi jadwal tidak ditemukan.")

        snapshot = self._build_version_snapshot(cursor, id_versi)
        cursor.execute("SELECT id_ruang, kode_ruang, nama_ruang, gedung, lantai, kapasitas FROM ruang ORDER BY kode_ruang ASC;")
        room_rows = [
            {
                "id": str(r["id_ruang"]),
                "name": r["kode_ruang"],
                "capacity": int(r["kapasitas"]),
                "building": f"Gedung {r['gedung']}" if len(r["gedung"]) <= 2 else r["gedung"],
            }
            for r in cursor.fetchall()
        ]

        cursor.execute("SELECT COUNT(*) AS total FROM kelas WHERE status_kelas <> 'NON_RUANG';")
        total_active = int(cursor.fetchone()["total"])

        cursor.execute(
            """
            SELECT po.penalti_sesudah
            FROM proses_optimasi po
            WHERE po.id_versi_hasil = %s
            ORDER BY po.id_proses DESC LIMIT 1;
            """,
            (id_versi,),
        )
        proc_row = cursor.fetchone()
        total_penalty = int(float(proc_row["penalti_sesudah"])) if proc_row and proc_row.get("penalti_sesudah") is not None else 0

        scanned = scan_schedule_issues(snapshot, room_rows, include_suggestions=True)

        cursor.execute(
            """
            SELECT db.*
            FROM deteksi_bentrok db
            JOIN jadwal_kuliah jk1 ON db.id_jadwal_1 = jk1.id_jadwal
            WHERE jk1.id_versi = %s
            ORDER BY db.id_bentrok DESC;
            """,
            (id_versi,),
        )
        db_rows = cursor.fetchall()

        existing_by_key: Dict[Tuple[int, int, str], Dict[str, Any]] = {}
        wadek_notes: List[Dict[str, Any]] = []
        for row in db_rows:
            j1 = int(row["id_jadwal_1"])
            j2 = int(row["id_jadwal_2"])
            jenis = (row["jenis_bentrok"] or "").upper()
            if jenis == "CATATAN_WADEK1":
                wadek_notes.append(row)
                continue
            lo, hi = (j1, j2) if j1 <= j2 else (j2, j1)
            key = (lo, hi, jenis)
            if key not in existing_by_key:
                existing_by_key[key] = row

        active_keys: Set[Tuple[int, int, str]] = set()
        formatted_issues: List[Dict[str, Any]] = []

        for issue in scanned:
            j1 = int(issue["jadwal_id_1"])
            j2 = int(issue["jadwal_id_2"])
            lo, hi = (j1, j2) if j1 <= j2 else (j2, j1)
            jenis = issue["jenis_bentrok"]
            key = (lo, hi, jenis)
            active_keys.add(key)

            existing = existing_by_key.get(key)
            if existing:
                db_id = int(existing["id_bentrok"])
                cur_status = (existing["status_bentrok"] or "TERDETEKSI").upper()
                if cur_status == "TOLERANSI_DITERIMA" and issue["severity"] == "soft":
                    status_bentrok = "TOLERANSI_DITERIMA"
                    is_resolved = True
                else:
                    status_bentrok = "TERDETEKSI"
                    is_resolved = False
                    if cur_status != "TERDETEKSI":
                        cursor.execute(
                            "UPDATE deteksi_bentrok SET status_bentrok = 'TERDETEKSI', deskripsi = %s, selesai_pada = NULL WHERE id_bentrok = %s;",
                            (issue["description"], db_id),
                        )
            else:
                cursor.execute(
                    """
                    INSERT INTO deteksi_bentrok (id_jadwal_1, id_jadwal_2, jenis_bentrok, deskripsi, status_bentrok)
                    VALUES (%s, %s, %s, %s, 'TERDETEKSI');
                    """,
                    (lo, hi, jenis, issue["description"]),
                )
                db_id = int(cursor.lastrowid)
                status_bentrok = "TERDETEKSI"
                is_resolved = False

            formatted_issues.append(
                {
                    "id": f"db-conf-{db_id}",
                    "conflict_id": db_id,
                    "jenis_bentrok": jenis,
                    "type_label": issue["type_label"],
                    "severity": issue["severity"],
                    "title": issue["title"],
                    "description": issue["description"],
                    "recommendation": issue["recommendation"],
                    "status_bentrok": status_bentrok,
                    "is_resolved": is_resolved,
                    "can_ignore": issue["severity"] == "soft",
                    "item_1": issue["item_1"],
                    "item_2": issue["item_2"],
                    "suggestions": [] if is_resolved else issue["suggestions"],
                }
            )

        # Tandai baris deteksi_bentrok lama yang sudah tidak bentrok sebagai TERATASI
        snap_by_id = {int(s["item_id"]): s for s in snapshot}
        resolved_history: List[Dict[str, Any]] = []
        for key, row in existing_by_key.items():
            if key in active_keys:
                continue
            db_id = int(row["id_bentrok"])
            cur_status = (row["status_bentrok"] or "").upper()
            if cur_status in ("TERDETEKSI", "REVISI"):
                cursor.execute(
                    "UPDATE deteksi_bentrok SET status_bentrok = 'TERATASI', selesai_pada = NOW() WHERE id_bentrok = %s;",
                    (db_id,),
                )
            jenis = (row["jenis_bentrok"] or "").upper()
            s1 = snap_by_id.get(int(row["id_jadwal_1"]))
            s2 = snap_by_id.get(int(row["id_jadwal_2"])) if int(row["id_jadwal_2"]) != int(row["id_jadwal_1"]) else None
            if s1 and len(resolved_history) < 25:
                resolved_history.append(
                    {
                        "id": f"db-conf-{db_id}",
                        "conflict_id": db_id,
                        "jenis_bentrok": jenis,
                        "type_label": jenis.replace("_", " ").title(),
                        "severity": "hard" if jenis in ("ROOM", "LECTURER", "ROMBEL", "CAPACITY") else "soft",
                        "title": f"{s1['course_name']} ({s1['class_label']})" + (f" ↔ {s2['course_name']}" if s2 else ""),
                        "description": row.get("deskripsi") or "Bentrok telah diperbaiki.",
                        "recommendation": "Sudah diatasi",
                        "status_bentrok": "TERATASI",
                        "is_resolved": True,
                        "can_ignore": False,
                        "item_1": {
                            "item_id": s1["item_id"],
                            "jadwal_id": s1["jadwal_id"],
                            "course_code": s1["course_code"],
                            "course_name": s1["course_name"],
                            "class_label": s1["class_label"],
                            "department": s1.get("department") or "SI",
                            "day": s1["day"],
                            "start_time": minutes_to_hhmm(s1["start_min"]),
                            "end_time": minutes_to_hhmm(s1["end_min"]),
                            "room_id": s1["room_id"],
                            "room_name": s1["room_name"],
                            "room_capacity": s1["room_capacity"],
                            "building": s1.get("building") or "Gedung FTI",
                            "student_count": s1["student_count"],
                            "lecturer_names": s1["lecturer_names"],
                            "sks": s1["sks"],
                        },
                        "item_2": None,
                        "suggestions": [],
                    }
                )

        # Sertakan catatan revisi aktif dari Wadek I jika ada
        for wn in wadek_notes:
            cur_st = (wn.get("status_bentrok") or "REVISI").upper()
            is_res = cur_st in ("TERATASI", "TOLERANSI_DITERIMA")
            s1 = snap_by_id.get(int(wn["id_jadwal_1"]))
            formatted_issues.append(
                {
                    "id": f"db-conf-{int(wn['id_bentrok'])}",
                    "conflict_id": int(wn["id_bentrok"]),
                    "jenis_bentrok": "CATATAN_WADEK1",
                    "type_label": "Catatan Revisi Wadek I",
                    "severity": "soft",
                    "title": "Catatan Revisi dari Wakil Dekan I",
                    "description": wn.get("deskripsi") or "Harap tinjau ulang jadwal sesuai masukan Wadek I.",
                    "recommendation": "Sesuaikan jadwal yang dimaksud lalu kirim ulang ke Wadek I.",
                    "status_bentrok": cur_st,
                    "is_resolved": is_res,
                    "can_ignore": True,
                    "item_1": {
                        "item_id": s1["item_id"],
                        "jadwal_id": s1["jadwal_id"],
                        "course_code": s1["course_code"],
                        "course_name": s1["course_name"],
                        "class_label": s1["class_label"],
                        "department": s1.get("department") or "SI",
                        "day": s1["day"],
                        "start_time": minutes_to_hhmm(s1["start_min"]),
                        "end_time": minutes_to_hhmm(s1["end_min"]),
                        "room_id": s1["room_id"],
                        "room_name": s1["room_name"],
                        "room_capacity": s1["room_capacity"],
                        "building": s1.get("building") or "Gedung FTI",
                        "student_count": s1["student_count"],
                        "lecturer_names": s1["lecturer_names"],
                        "sks": s1["sks"],
                    } if s1 else None,
                    "item_2": None,
                    "suggestions": [],
                }
            )

        all_items = formatted_issues + resolved_history
        hard_active = sum(1 for x in formatted_issues if x["severity"] == "hard" and not x["is_resolved"])
        soft_active = sum(1 for x in formatted_issues if x["severity"] == "soft" and not x["is_resolved"])
        resolved_cnt = sum(1 for x in all_items if x["is_resolved"])
        unassigned_cnt = max(0, total_active - len(snapshot))
        sched_cnt = len(snapshot)
        compliance = round(max(0.0, ((sched_cnt - hard_active) / max(1, sched_cnt)) * 100.0), 1)

        return {
            "version_id": id_versi,
            "version_number": int(ver["nomor_versi"]),
            "tahap": ver["tahap"],
            "status_versi": ver["status_versi"],
            "approval_status": map_status_versi_to_ui(ver["status_versi"], ver["tahap"]),
            "semester_label": f"{ver['tahun_ajaran']} {ver['jenis_semester']}",
            "summary": {
                "total_active_classes": total_active or sched_cnt,
                "scheduled_classes": sched_cnt,
                "unassigned_count": unassigned_cnt,
                "hard_conflicts_count": hard_active,
                "soft_warnings_count": soft_active,
                "unresolved_total": hard_active + soft_active,
                "resolved_count": resolved_cnt,
                "total_penalty": total_penalty,
                "compliance_pct": compliance,
            },
            "issues": all_items,
        }

    def get_validation_report(self, version_id: Optional[int] = None) -> Dict[str, Any]:
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                try:
                    vid = self._get_target_versi_id(cursor, version_id)
                except ValueError:
                    return {
                        "version_id": None,
                        "version_number": None,
                        "tahap": None,
                        "status_versi": None,
                        "approval_status": "Menunggu Persetujuan",
                        "semester_label": "2026/2027 Ganjil",
                        "summary": {
                            "total_active_classes": 0,
                            "scheduled_classes": 0,
                            "unassigned_count": 0,
                            "hard_conflicts_count": 0,
                            "soft_warnings_count": 0,
                            "unresolved_total": 0,
                            "resolved_count": 0,
                            "total_penalty": 0,
                            "compliance_pct": 100.0,
                        },
                        "issues": [],
                    }
                report = self._sync_and_build_validation(cursor, vid)
            conn.commit()
            return report
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def resolve_validation_issue(
        self,
        conflict_id: int,
        decision: str = "TOLERANSI_DITERIMA",
        actor_role: Optional[str] = "admin",
        actor_email: Optional[str] = None,
    ) -> Dict[str, Any]:
        if actor_role and actor_role.strip().lower() not in ("admin", "superadmin"):
            raise PermissionError("Hanya Admin yang dapat menindaklanjuti validasi konflik.")

        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT db.*, jk.id_versi
                    FROM deteksi_bentrok db
                    JOIN jadwal_kuliah jk ON db.id_jadwal_1 = jk.id_jadwal
                    WHERE db.id_bentrok = %s LIMIT 1;
                    """,
                    (int(conflict_id),),
                )
                row = cursor.fetchone()
                if not row:
                    raise LookupError(f"Catatan konflik {conflict_id} tidak ditemukan.")

                jenis = (row["jenis_bentrok"] or "").upper()
                if jenis in ("ROOM", "LECTURER", "ROMBEL", "CAPACITY"):
                    raise ValueError(
                        "Bentrok mutlak (ruang/dosen/rombel/kapasitas) tidak dapat diabaikan. "
                        "Gunakan pilihan perbaikan slot atau tukar jadwal."
                    )

                admin_id = self._resolve_admin_actor_id(cursor, actor_email)
                target_status = "TERATASI" if decision == "TERATASI" else "TOLERANSI_DITERIMA"
                cursor.execute(
                    """
                    UPDATE deteksi_bentrok
                    SET status_bentrok = %s, id_penindak = %s, selesai_pada = NOW()
                    WHERE id_bentrok = %s;
                    """,
                    (target_status, admin_id, int(conflict_id)),
                )
                report = self._sync_and_build_validation(cursor, int(row["id_versi"]))
            conn.commit()
            report["message"] = "Peringatan berhasil ditandai sudah ditinjau."
            return report
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def auto_fix_conflicts(
        self,
        version_id: Optional[int] = None,
        actor_role: Optional[str] = "admin",
        actor_email: Optional[str] = None,
    ) -> Dict[str, Any]:
        if actor_role and actor_role.strip().lower() not in ("admin", "superadmin"):
            raise PermissionError("Hanya Admin yang dapat menjalankan perbaikan bentrok otomatis.")

        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                vid = self._get_target_versi_id(cursor, version_id)
                snapshot = self._build_version_snapshot(cursor, vid)
                cursor.execute("SELECT id_ruang, kode_ruang, nama_ruang, gedung, lantai, kapasitas FROM ruang ORDER BY kode_ruang ASC;")
                room_rows = [
                    {
                        "id": str(r["id_ruang"]),
                        "name": r["kode_ruang"],
                        "capacity": int(r["kapasitas"]),
                        "building": f"Gedung {r['gedung']}" if len(r["gedung"]) <= 2 else r["gedung"],
                    }
                    for r in cursor.fetchall()
                ]

                planned_moves = plan_autofix_moves(snapshot, room_rows)
                admin_id = self._resolve_admin_actor_id(cursor, actor_email)

                for mv in planned_moves:
                    jid = int(mv["jadwal_id"])
                    cursor.execute(
                        """
                        UPDATE jadwal_kuliah
                        SET hari = %s, jam_mulai = %s, jam_selesai = %s, id_ruang = %s
                        WHERE id_jadwal = %s;
                        """,
                        (
                            mv["day"],
                            f"{mv['start_time']}:00",
                            f"{mv['end_time']}:00",
                            int(mv["room_id"]),
                            jid,
                        ),
                    )
                    if admin_id is not None:
                        cursor.execute(
                            """
                            INSERT INTO perubahan_jadwal (
                                id_jadwal, id_pengguna, hari_lama, jam_mulai_lama,
                                hari_baru, jam_mulai_baru, id_ruang_lama, id_ruang_baru, alasan
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                            """,
                            (
                                jid,
                                admin_id,
                                mv["old_day"],
                                f"{mv['old_start']}:00",
                                mv["day"],
                                f"{mv['start_time']}:00",
                                int(mv["old_room_id"]),
                                int(mv["room_id"]),
                                mv["reason"],
                            ),
                        )

                report = self._sync_and_build_validation(cursor, vid)
            conn.commit()
            report["fixed_count"] = len(planned_moves)
            rem = report["summary"]["hard_conflicts_count"]
            if len(planned_moves) == 0 and rem == 0:
                report["message"] = "Tidak ada bentrok mutlak yang perlu diperbaiki."
            elif rem == 0:
                report["message"] = f"Berhasil memindahkan {len(planned_moves)} jadwal. Seluruh bentrok mutlak telah teratasi."
            else:
                report["message"] = f"Berhasil memperbaiki {len(planned_moves)} jadwal, tersisa {rem} bentrok yang perlu ditukar manual."
            return report
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    # -----------------------------------------------------------------
    # Modul 4: Kebutuhan Departemen (#70, #71, #72)
    # -----------------------------------------------------------------
    def get_active_semester_info(self) -> Dict[str, Any]:
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                sem = self._get_active_semester(cursor)
                return {
                    "id_semester": int(sem["id_semester"]),
                    "tahun_ajaran": sem["tahun_ajaran"],
                    "jenis_semester": sem["jenis_semester"],
                    "semester_label": f"{sem['tahun_ajaran']} {sem['jenis_semester']}",
                    "kuota_minimum_kelas": int(sem["kuota_minimum_kelas"]),
                }
        finally:
            conn.close()

    def get_lecturers_raw(self, department: Optional[str] = None) -> List[Dict[str, Any]]:
        target_dept = normalize_dept(department) if department else None
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT d.id_dosen, d.nidn, d.jabatan_struktural, d.maks_sks_harian,
                           u.nama_lengkap, u.email, ps.kode_prodi
                    FROM dosen d
                    JOIN pengguna u ON d.id_pengguna = u.id_pengguna
                    JOIN program_studi ps ON d.id_prodi = ps.id_prodi
                    ORDER BY ps.kode_prodi ASC, u.nama_lengkap ASC;
                    """
                )
                db_rows = cursor.fetchall()
        finally:
            conn.close()

        result: List[Dict[str, Any]] = []
        seen_names: set[str] = set()
        for r in db_rows:
            dept_code = (r["kode_prodi"] or "SI").upper()
            if target_dept and dept_code != target_dept:
                continue
            name = r["nama_lengkap"]
            seen_names.add(name.lower())
            result.append(
                {
                    "id": r["nidn"],
                    "id_dosen": int(r["id_dosen"]),
                    "nidn": r["nidn"],
                    "name": name,
                    "email": r["email"],
                    "department": dept_code,
                    "jabatan_struktural": r["jabatan_struktural"] or "Dosen Pengampu",
                    "maks_sks_harian": int(r["maks_sks_harian"] or 12),
                }
            )

        # Tambahkan referensi dosen dari CSV bila belum tercatat di tabel dosen
        for key, meta in self._csv_meta_by_key.items():
            _, csv_dept, _, _ = key
            if target_dept and csv_dept != target_dept:
                continue
            for idx, lname in enumerate(meta.get("lecturer_names") or []):
                if not lname or "placeholder" in lname.lower() or lname.lower() in seen_names:
                    continue
                seen_names.add(lname.lower())
                lids = meta.get("lecturer_ids") or []
                nidn = lids[idx] if idx < len(lids) else f"CSV-{len(result)+1}"
                result.append(
                    {
                        "id": nidn,
                        "id_dosen": None,
                        "nidn": nidn,
                        "name": lname,
                        "email": "",
                        "department": csv_dept,
                        "jabatan_struktural": "Dosen Pengampu",
                        "maks_sks_harian": 12,
                    }
                )

        result.sort(key=lambda x: (x["department"], x["name"]))
        return result

    def create_offering(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        code = (payload.get("course_code") or "").strip().upper()[:20]
        name = (payload.get("name") or "").strip()[:200]
        dept = normalize_dept(payload.get("department"), code)
        sks = int(payload.get("sks") or 2)
        sks_teori = int(payload.get("sks_teori") if payload.get("sks_teori") is not None else sks)
        sks_praktik = int(payload.get("sks_praktik") if payload.get("sks_praktik") is not None else 0)
        semester = int(payload.get("semester") or 1)
        is_mandatory = bool(payload.get("is_mandatory", True))
        requires_room = bool(payload.get("requires_room", True))
        rombels = payload.get("classes") or []
        primary_name = (payload.get("primary_lecturer_name") or "").strip()
        tandem_names = [x.strip() for x in (payload.get("tandem_lecturer_names") or []) if x and x.strip()]
        preferred_days = [d.strip() for d in (payload.get("preferred_days") or []) if d and d.strip()]
        preferred_time_slot = (payload.get("preferred_time_slot") or "").strip() or None
        special_note = (payload.get("special_note") or "").strip() or None
        avoid_friday = bool(payload.get("avoid_friday", False))
        as_draft = bool(payload.get("as_draft", False))
        update_existing = bool(payload.get("update_existing", False))
        actor_email = payload.get("actor_email")

        if not code or not name:
            raise ValueError("Kode Mata Kuliah dan Nama Mata Kuliah wajib diisi.")
        if sks < 1 or sks > 6:
            raise ValueError("Total SKS harus antara 1 sampai 6.")
        if semester < 1 or semester > 8:
            raise ValueError("Semester harus antara 1 sampai 8.")
        if sks_teori < 0 or sks_praktik < 0 or (sks_teori + sks_praktik != sks):
            raise ValueError("Jumlah SKS Teori + SKS Praktik harus sama dengan Total SKS.")
        if not rombels:
            raise ValueError("Minimal harus ada 1 rombel kelas.")
        if not primary_name:
            raise ValueError("Dosen Pengampu Utama wajib diisi.")

        seen_labels: set[str] = set()
        for r in rombels:
            lbl = (r.get("class_label") or "").strip()
            cnt = int(r.get("enrolled_count") or 0)
            if not lbl:
                raise ValueError("Label kelas/rombel tidak boleh kosong.")
            if lbl.upper() in seen_labels:
                raise ValueError(f"Label kelas {lbl} terduplikasi.")
            seen_labels.add(lbl.upper())
            if cnt < 1 or cnt > 300:
                raise ValueError(f"Estimasi mahasiswa kelas {lbl} harus antara 1 sampai 300.")

        lecturer_names = [primary_name] + [t for t in tandem_names if t != primary_name]
        if not requires_room:
            jenis_mk = "Wajib Prodi (Non-Ruang)"
        elif sks_praktik > 0 or "lab" in str(payload.get("room_type_needed") or "").lower():
            jenis_mk = "Praktikum"
        elif not is_mandatory:
            jenis_mk = "Pilihan"
        else:
            jenis_mk = "Wajib Prodi"

        status_kelas = "NON_RUANG" if not requires_room else ("DRAFT" if as_draft else "TERBUKA")
        pref_hari_str = ",".join(preferred_days) if preferred_days else None

        created_ids: List[int] = []
        warnings: List[str] = []

        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                sem = self._get_active_semester(cursor)
                id_semester = int(sem["id_semester"])
                kuota_min = int(sem["kuota_minimum_kelas"])
                prodi_map = self._get_prodi_map(cursor)
                id_prodi = prodi_map.get(dept, next(iter(prodi_map.values())))
                actor_id = self._resolve_actor_by_email_or_dept(cursor, actor_email, dept)

                cursor.execute("SELECT id_mk FROM mata_kuliah WHERE kode_mk = %s LIMIT 1;", (code,))
                mk_row = cursor.fetchone()
                if mk_row:
                    id_mk = int(mk_row["id_mk"])
                    cursor.execute(
                        """
                        UPDATE mata_kuliah
                        SET nama_mk = %s, sks = %s, sks_teori = %s, sks_praktik = %s,
                            semester_paket = %s, jenis_mk = %s
                        WHERE id_mk = %s;
                        """,
                        (name, sks, sks_teori, sks_praktik, semester, jenis_mk, id_mk),
                    )
                else:
                    cursor.execute(
                        """
                        INSERT INTO mata_kuliah (
                            id_prodi, kode_mk, nama_mk, sks, sks_teori, sks_praktik,
                            semester_paket, jenis_mk, lintas_prodi
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 0);
                        """,
                        (id_prodi, code, name, sks, sks_teori, sks_praktik, semester, jenis_mk),
                    )
                    id_mk = int(cursor.lastrowid)

                year_start = int(str(sem["tahun_ajaran"]).split("/")[0])
                target_angkatan = year_start - max(0, (semester - 1) // 2)

                for r in rombels:
                    lbl = r.get("class_label").strip()[:20]
                    cnt = int(r.get("enrolled_count"))
                    cursor.execute(
                        "SELECT id_kelas, status_kelas FROM kelas WHERE id_semester = %s AND id_mk = %s AND kode_kelas = %s LIMIT 1;",
                        (id_semester, id_mk, lbl),
                    )
                    ex = cursor.fetchone()
                    if ex and ex.get("status_kelas") != "DIBATALKAN" and not update_existing:
                        raise ValueError(f"Kelas {code}-{lbl} sudah terdaftar aktif di semester ini.")

                    if ex:
                        id_kelas = int(ex["id_kelas"])
                        cursor.execute(
                            """
                            UPDATE kelas
                            SET id_pengaju = %s, target_angkatan = %s, estimasi_mahasiswa = %s,
                                status_kelas = %s, alasan_pembatalan = NULL,
                                preferensi_hari = %s, preferensi_waktu = %s, catatan_khusus = %s
                            WHERE id_kelas = %s;
                            """,
                            (
                                actor_id,
                                target_angkatan,
                                cnt,
                                status_kelas,
                                pref_hari_str,
                                preferred_time_slot,
                                special_note,
                                id_kelas,
                            ),
                        )
                    else:
                        cursor.execute(
                            """
                            INSERT INTO kelas (
                                id_semester, id_mk, id_pengaju, kode_kelas,
                                target_angkatan, estimasi_mahasiswa, jumlah_peserta,
                                butuh_aksesibilitas, status_kelas,
                                preferensi_hari, preferensi_waktu, catatan_khusus
                            ) VALUES (%s, %s, %s, %s, %s, %s, 0, 0, %s, %s, %s, %s);
                            """,
                            (
                                id_semester,
                                id_mk,
                                actor_id,
                                lbl,
                                target_angkatan,
                                cnt,
                                status_kelas,
                                pref_hari_str,
                                preferred_time_slot,
                                special_note,
                            ),
                        )
                        id_kelas = int(cursor.lastrowid)

                    self._sync_pengampu_kelas(cursor, id_kelas, id_prodi, lecturer_names)
                    created_ids.append(id_kelas)
                    if requires_room and cnt < kuota_min:
                        warnings.append(
                            f"Kelas {code}-{lbl} ({cnt} mhs) di bawah kuota minimum ({kuota_min} mhs)."
                        )

                # Simpan preferensi dosen (contoh: hindari Jumat siang) ke preferensi_dosen
                if avoid_friday:
                    primary_dosen_id = self._resolve_or_create_dosen(cursor, primary_name, id_prodi)
                    if primary_dosen_id:
                        cursor.execute(
                            """
                            SELECT id_preferensi FROM preferensi_dosen
                            WHERE id_dosen = %s AND id_semester = %s AND hari = 'Jumat'
                            LIMIT 1;
                            """,
                            (primary_dosen_id, id_semester),
                        )
                        if not cursor.fetchone():
                            cursor.execute(
                                """
                                INSERT INTO preferensi_dosen (
                                    id_dosen, id_semester, hari, jam_mulai_hindari,
                                    jam_selesai_hindari, tingkat, alasan
                                ) VALUES (%s, %s, 'Jumat', '11:30:00', '13:30:00', 'HINDARI', %s);
                                """,
                                (primary_dosen_id, id_semester, special_note or "Hindari jadwal Jumat siang"),
                            )

                self._insert_perubahan_kebutuhan(
                    cursor,
                    id_pengguna=actor_id,
                    kode_prodi=dept,
                    kode_mk=code,
                    kode_kelas=",".join([r["class_label"].strip() for r in rombels]),
                    jenis_aksi="TAMBAH_USULAN",
                    id_kelas=created_ids[0] if created_ids else None,
                    id_mk=id_mk,
                    nilai_baru=f"{len(created_ids)} rombel ({sks} SKS) | Pengampu: {', '.join(lecturer_names)}",
                    alasan=special_note,
                )
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        created_items = [c for cid in created_ids if (c := self.get_class(str(cid))) is not None]
        return {
            "message": f"Berhasil menyimpan {len(created_items)} rombel untuk [{code}] {name}.",
            "course_code": code,
            "created_classes": created_items,
            "warnings": warnings,
        }

    def get_below_quota_classes(self, department: Optional[str] = None) -> Dict[str, Any]:
        sem = self.get_active_semester_info()
        kuota_min = sem["kuota_minimum_kelas"]
        active = self.get_classes(department=department, include_cancelled=False)
        below = [c for c in active if c.requires_room and c.enrolled_count < kuota_min]
        return {
            "kuota_minimum_kelas": kuota_min,
            "total_below_quota": len(below),
            "classes": below,
        }

    def cancel_class(self, class_id: str, reason: str, actor_email: Optional[str] = None) -> ClassItem:
        clean_reason = (reason or "").strip()
        if len(clean_reason) < 3:
            raise ValueError("Alasan pembatalan kelas wajib diisi minimal 3 karakter.")

        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                existing = self._find_db_kelas_row(cursor, class_id)
                if not existing:
                    raise LookupError(f"Kelas {class_id} tidak ditemukan.")
                id_kelas = int(existing["id_kelas"])
                id_mk = int(existing["id_mk"])

                cursor.execute(
                    "SELECT ps.kode_prodi FROM mata_kuliah mk JOIN program_studi ps ON mk.id_prodi = ps.id_prodi WHERE mk.id_mk = %s LIMIT 1;",
                    (id_mk,),
                )
                dept_row = cursor.fetchone()
                dept = dept_row["kode_prodi"] if dept_row else "SI"
                actor_id = self._resolve_actor_by_email_or_dept(cursor, actor_email, dept)

                # Bersihkan item jadwal draf agar kelas batal tidak tersisa di jadwal aktif
                cursor.execute("SELECT id_jadwal FROM jadwal_kuliah WHERE id_kelas = %s;", (id_kelas,))
                jadwal_ids = [int(r["id_jadwal"]) for r in cursor.fetchall()]
                if jadwal_ids:
                    ph = ",".join(["%s"] * len(jadwal_ids))
                    cursor.execute(f"DELETE FROM deteksi_bentrok WHERE id_jadwal_1 IN ({ph}) OR id_jadwal_2 IN ({ph});", tuple(jadwal_ids + jadwal_ids))
                    cursor.execute(f"DELETE FROM perubahan_jadwal WHERE id_jadwal IN ({ph});", tuple(jadwal_ids))
                    cursor.execute(f"DELETE FROM pertemuan_kuliah WHERE id_jadwal IN ({ph});", tuple(jadwal_ids))
                    cursor.execute(f"DELETE FROM jadwal_kuliah WHERE id_jadwal IN ({ph});", tuple(jadwal_ids))

                cursor.execute(
                    "UPDATE kelas SET status_kelas = 'DIBATALKAN', alasan_pembatalan = %s WHERE id_kelas = %s;",
                    (clean_reason[:255], id_kelas),
                )
                self._insert_perubahan_kebutuhan(
                    cursor,
                    id_pengguna=actor_id,
                    kode_prodi=dept,
                    kode_mk=existing["kode_mk"],
                    kode_kelas=existing["kode_kelas"],
                    jenis_aksi="BATALKAN_KELAS",
                    id_kelas=id_kelas,
                    id_mk=id_mk,
                    nilai_lama=f"{existing['status_kelas']} ({existing['estimasi_mahasiswa']} mhs)",
                    nilai_baru="DIBATALKAN",
                    alasan=clean_reason,
                )
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        item = self.get_class(str(id_kelas))
        if not item:
            raise LookupError("Kelas gagal dimuat ulang setelah pembatalan.")
        return item

    def restore_class(self, class_id: str, actor_email: Optional[str] = None) -> ClassItem:
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                existing = self._find_db_kelas_row(cursor, class_id)
                if not existing:
                    raise LookupError(f"Kelas {class_id} tidak ditemukan.")
                id_kelas = int(existing["id_kelas"])
                id_mk = int(existing["id_mk"])

                cursor.execute(
                    "SELECT ps.kode_prodi FROM mata_kuliah mk JOIN program_studi ps ON mk.id_prodi = ps.id_prodi WHERE mk.id_mk = %s LIMIT 1;",
                    (id_mk,),
                )
                dept_row = cursor.fetchone()
                dept = dept_row["kode_prodi"] if dept_row else "SI"
                actor_id = self._resolve_actor_by_email_or_dept(cursor, actor_email, dept)

                cursor.execute(
                    "UPDATE kelas SET status_kelas = 'TERBUKA', alasan_pembatalan = NULL WHERE id_kelas = %s;",
                    (id_kelas,),
                )
                self._insert_perubahan_kebutuhan(
                    cursor,
                    id_pengguna=actor_id,
                    kode_prodi=dept,
                    kode_mk=existing["kode_mk"],
                    kode_kelas=existing["kode_kelas"],
                    jenis_aksi="PULIHKAN_KELAS",
                    id_kelas=id_kelas,
                    id_mk=id_mk,
                    nilai_lama="DIBATALKAN",
                    nilai_baru="TERBUKA",
                )
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        item = self.get_class(str(id_kelas))
        if not item:
            raise LookupError("Kelas gagal dimuat ulang setelah pemulihan.")
        return item

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
            [c for c in self.get_classes(include_cancelled=False) if c.course_code == code],
            key=lambda x: x.class_label,
        )
        if not active:
            raise LookupError(f"Mata kuliah {code} belum memiliki kelas aktif.")

        template = active[0]
        old_count = len(active)
        if target_count > old_count:
            existing_labels = {c.class_label.upper() for c in active}
            next_ord = 65
            needed = target_count - old_count
            while needed > 0:
                lbl = chr(next_ord)
                next_ord += 1
                if lbl in existing_labels:
                    continue
                new_item = template.model_copy(
                    update={
                        "id": f"{code}-{lbl}",
                        "class_label": lbl,
                        "enrolled_count": default_capacity,
                        "rombel_key": f"{template.department}-S{template.semester}-{lbl}",
                        "status_kelas": "TERBUKA",
                        "alasan_pembatalan": None,
                    }
                )
                self.add_class(new_item)
                existing_labels.add(lbl)
                needed -= 1
        elif target_count < old_count:
            for c in active[target_count:]:
                self.cancel_class(c.id, reason=reason, actor_email=actor_email)

        updated_active = sorted(
            [c for c in self.get_classes(include_cancelled=False) if c.course_code == code],
            key=lambda x: x.class_label,
        )
        return {
            "message": f"Jumlah rombel {code} disesuaikan dari {old_count} menjadi {len(updated_active)}.",
            "course_code": code,
            "classes": updated_active,
        }

    def get_departemen_logs(self, department: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        target_dept = normalize_dept(department) if department else None
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                where = "WHERE pk.kode_prodi = %s" if target_dept else ""
                params: Tuple = (target_dept, int(limit)) if target_dept else (int(limit),)
                cursor.execute(
                    f"""
                    SELECT pk.id_perubahan, pk.kode_prodi, pk.kode_mk, pk.kode_kelas,
                           pk.jenis_aksi, pk.nilai_lama, pk.nilai_baru, pk.alasan,
                           pk.waktu_perubahan, u.nama_lengkap AS actor_name, u.email AS actor_email
                    FROM perubahan_kebutuhan pk
                    JOIN pengguna u ON pk.id_pengguna = u.id_pengguna
                    {where}
                    ORDER BY pk.waktu_perubahan DESC, pk.id_perubahan DESC
                    LIMIT %s;
                    """,
                    params,
                )
                rows = cursor.fetchall()
        finally:
            conn.close()

        for r in rows:
            r["id_perubahan"] = int(r["id_perubahan"])
            if r.get("waktu_perubahan"):
                r["waktu_perubahan"] = r["waktu_perubahan"].isoformat(timespec="seconds")
        return rows

    def get_departemen_status(self, department: str) -> Dict[str, Any]:
        dept = normalize_dept(department)
        sem_info = self.get_active_semester_info()
        active = self.get_classes(department=dept, include_cancelled=False)
        below = [c for c in active if c.requires_room and c.enrolled_count < sem_info["kuota_minimum_kelas"]]

        conn = get_db_connection()
        sub = None
        try:
            with conn.cursor() as cursor:
                prodi_map = self._get_prodi_map(cursor)
                id_prodi = prodi_map.get(dept)
                if id_prodi:
                    cursor.execute(
                        """
                        SELECT status_pengajuan, catatan, waktu_pengajuan
                        FROM pengajuan_departemen
                        WHERE id_semester = %s AND id_prodi = %s
                        LIMIT 1;
                        """,
                        (sem_info["id_semester"], id_prodi),
                    )
                    sub = cursor.fetchone()
        finally:
            conn.close()

        waktu = sub["waktu_pengajuan"].isoformat(timespec="seconds") if (sub and sub.get("waktu_pengajuan")) else None
        return {
            "department": dept,
            "status_pengajuan": sub["status_pengajuan"] if sub else "DRAFT",
            "waktu_pengajuan": waktu,
            "catatan": sub.get("catatan") if sub else None,
            "kuota_minimum_kelas": sem_info["kuota_minimum_kelas"],
            "total_active_classes": len(active),
            "below_quota_count": len(below),
        }

    def submit_departemen(
        self, department: str, actor_email: Optional[str] = None, catatan: Optional[str] = None
    ) -> Dict[str, Any]:
        dept = normalize_dept(department)
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                sem = self._get_active_semester(cursor)
                id_semester = int(sem["id_semester"])
                prodi_map = self._get_prodi_map(cursor)
                id_prodi = prodi_map.get(dept, next(iter(prodi_map.values())))
                actor_id = self._resolve_actor_by_email_or_dept(cursor, actor_email, dept)

                # Aktifkan kelas berstatus DRAFT milik departemen menjadi TERBUKA
                cursor.execute(
                    """
                    UPDATE kelas k
                    JOIN mata_kuliah mk ON k.id_mk = mk.id_mk
                    SET k.status_kelas = 'TERBUKA'
                    WHERE k.id_semester = %s AND mk.id_prodi = %s AND k.status_kelas = 'DRAFT';
                    """,
                    (id_semester, id_prodi),
                )

                cursor.execute(
                    """
                    INSERT INTO pengajuan_departemen (id_semester, id_prodi, id_pengaju, status_pengajuan, catatan)
                    VALUES (%s, %s, %s, 'DIAJUKAN', %s)
                    ON DUPLICATE KEY UPDATE
                        id_pengaju = VALUES(id_pengaju),
                        status_pengajuan = 'DIAJUKAN',
                        catatan = VALUES(catatan),
                        waktu_pengajuan = CURRENT_TIMESTAMP(6);
                    """,
                    (id_semester, id_prodi, actor_id, catatan),
                )

                self._insert_perubahan_kebutuhan(
                    cursor,
                    id_pengguna=actor_id,
                    kode_prodi=dept,
                    kode_mk="-",
                    jenis_aksi="AJUKAN_FAKULTAS",
                    nilai_baru="DIAJUKAN",
                    alasan=catatan or f"Pengajuan resmi kebutuhan kelas Departemen {dept}",
                )
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        return self.get_departemen_status(dept)

    def _compute_utilization(
        self,
        rooms: List[Dict[str, Any]],
        scheduled_classes: List[Dict[str, Any]],
        version_id: Optional[int] = None,
        version_number: Optional[int] = None,
        semester_label: Optional[str] = None,
        approval_status: Optional[str] = None,
        filter_day: Optional[str] = None,
        filter_building: Optional[str] = None,
    ) -> Dict[str, Any]:
        def check_slot_overlap(start1: str, end1: str, start2: str, end2: str) -> bool:
            s1, e1 = parse_time_to_minutes(start1), parse_time_to_minutes(end1)
            s2, e2 = parse_time_to_minutes(start2), parse_time_to_minutes(end2)
            return s1 < e2 and e1 > s2

        days_to_eval = [normalize_day_name(filter_day)] if filter_day and filter_day != "Semua" else DAYS
        total_slots_per_room = len(days_to_eval) * len(SLOT_TIMES)

        room_items: List[Dict[str, Any]] = []
        total_students_overall = 0
        total_capacity_occupied_overall = 0
        total_occupied_overall = 0
        overload_classes_count = 0

        # Matrix pemakaian per hari dan sesi untuk analisis jam sibuk
        time_slot_occupancy: Dict[Tuple[str, str], int] = {}
        day_occupancy: Dict[str, int] = {d: 0 for d in days_to_eval}

        for r in rooms:
            rid = str(r.get("id_ruang") or r.get("id") or r.get("db_ruang_id") or "")
            rcode = (r.get("kode_ruang") or r.get("code") or "").strip()
            rname = (r.get("nama_ruang") or r.get("name") or rcode).strip()
            rgedung = (r.get("gedung") or r.get("building") or "H").strip()
            if rgedung.lower().startswith("gedung "):
                rgedung = rgedung[7:].strip()
            building_label = f"Gedung {rgedung}" if len(rgedung) <= 2 else rgedung
            floor = int(r.get("lantai") or r.get("floor") or 1)
            cap = int(r.get("kapasitas") or r.get("capacity") or 45)
            dept = r.get("kode_prodi") or r.get("department") or "FTI"
            raw_rtype = (r.get("jenis_ruang") or r.get("room_type") or "").strip()
            if not raw_rtype:
                name_lower = f"{rcode} {rname}".lower()
                if "hardware" in name_lower or "iot" in name_lower:
                    raw_rtype = "Lab Hardware"
                elif "lab" in name_lower:
                    raw_rtype = "Lab Software"
                else:
                    raw_rtype = "Teori"
            rtype = raw_rtype

            # Ambil semua kelas yang menggunakan ruang ini
            assigned = [
                sc for sc in scheduled_classes
                if (str(sc.get("room_id")) == rid or sc.get("room_code") == rcode)
                and sc.get("day") in days_to_eval
            ]

            room_slots: List[Dict[str, Any]] = []
            occupied_count = 0
            room_students = 0
            room_cap_occupied = 0

            for d in days_to_eval:
                for d_idx, (st, en) in enumerate(SLOT_TIMES):
                    time_lbl = f"{st} - {en}"
                    # Cek bentrok / alokasi pada slot ini
                    slot_cls = next(
                        (
                            sc for sc in assigned
                            if sc.get("day") == d
                            and check_slot_overlap(sc.get("start_time", "07:30"), sc.get("end_time", "09:10"), st, en)
                        ),
                        None,
                    )

                    if slot_cls:
                        enrolled = int(slot_cls.get("enrolled") or slot_cls.get("size") or 40)
                        is_overload = enrolled > cap
                        status = "overload" if is_overload else "occupied"
                        occupied_count += 1
                        room_students += enrolled
                        room_cap_occupied += cap
                        if is_overload:
                            overload_classes_count += 1

                        time_slot_occupancy[(d, time_lbl)] = time_slot_occupancy.get((d, time_lbl), 0) + 1
                        day_occupancy[d] = day_occupancy.get(d, 0) + 1

                        room_slots.append({
                            "slot_id": f"slot_{d[:3].lower()}_{d_idx+1}",
                            "day": d,
                            "daily_index": d_idx,
                            "time_label": time_lbl,
                            "start_time": st,
                            "end_time": en,
                            "status": status,
                            "class_id": slot_cls.get("class_id"),
                            "course_code": slot_cls.get("course_code"),
                            "course_name": slot_cls.get("course_name"),
                            "class_label": slot_cls.get("class_label"),
                            "department": slot_cls.get("department"),
                            "lecturer_name": slot_cls.get("lecturer_name"),
                            "lecturer_names": list(slot_cls.get("lecturer_names") or []),
                            "enrolled_count": enrolled,
                            "capacity": cap,
                        })
                    else:
                        room_slots.append({
                            "slot_id": f"slot_{d[:3].lower()}_{d_idx+1}",
                            "day": d,
                            "daily_index": d_idx,
                            "time_label": time_lbl,
                            "start_time": st,
                            "end_time": en,
                            "status": "free",
                            "class_id": None,
                            "course_code": None,
                            "course_name": None,
                            "class_label": None,
                            "department": None,
                            "lecturer_name": None,
                            "lecturer_names": [],
                            "enrolled_count": None,
                            "capacity": cap,
                        })

            free_count = max(0, total_slots_per_room - occupied_count)
            util_pct = round((occupied_count / total_slots_per_room * 100.0), 1) if total_slots_per_room > 0 else 0.0
            fill_rate = round((room_students / room_cap_occupied * 100.0), 1) if room_cap_occupied > 0 else 0.0

            total_occupied_overall += occupied_count
            total_students_overall += room_students
            total_capacity_occupied_overall += room_cap_occupied

            room_items.append({
                "room_id": rid,
                "room_code": rcode,
                "room_name": rname,
                "room_type": rtype,
                "building": building_label,
                "floor": floor,
                "capacity": cap,
                "department": dept,
                "total_slots_available": total_slots_per_room,
                "occupied_slots_count": occupied_count,
                "free_slots_count": free_count,
                "utilization_percentage": util_pct,
                "total_hours_used": round(occupied_count * 1.67, 1),
                "is_overload": any(s["status"] == "overload" for s in room_slots),
                "schedule_count": len(assigned),
                "seat_fill_rate_percentage": fill_rate,
                "slots": room_slots,
            })

        # Hitung statistik per gedung
        buildings_dict: Dict[str, Dict[str, Any]] = {}
        for itm in room_items:
            bld = itm["building"]
            if bld not in buildings_dict:
                buildings_dict[bld] = {
                    "building": bld,
                    "total_rooms": 0,
                    "total_capacity": 0,
                    "total_slots": 0,
                    "occupied_slots": 0,
                    "util_sum": 0.0,
                }
            buildings_dict[bld]["total_rooms"] += 1
            buildings_dict[bld]["total_capacity"] += itm["capacity"]
            buildings_dict[bld]["total_slots"] += itm["total_slots_available"]
            buildings_dict[bld]["occupied_slots"] += itm["occupied_slots_count"]
            buildings_dict[bld]["util_sum"] += itm["utilization_percentage"]

        buildings_stats: List[Dict[str, Any]] = []
        for bld, data in sorted(buildings_dict.items()):
            cnt = data["total_rooms"]
            buildings_stats.append({
                "building": bld,
                "total_rooms": cnt,
                "total_capacity": data["total_capacity"],
                "total_slots": data["total_slots"],
                "occupied_slots": data["occupied_slots"],
                "average_utilization_percentage": round(data["util_sum"] / cnt, 1) if cnt > 0 else 0.0,
            })

        # Analisis Jam Sibuk (Peak Hours)
        peak_hours_list: List[Dict[str, Any]] = []
        num_rooms = max(1, len(room_items))
        for (d, t_lbl), occ in sorted(time_slot_occupancy.items()):
            occ_pct = round((occ / num_rooms * 100.0), 1)
            peak_hours_list.append({
                "day": d,
                "time_label": t_lbl,
                "occupied_rooms_count": occ,
                "occupancy_percentage": occ_pct,
            })
        peak_hours_list.sort(key=lambda x: x["occupied_rooms_count"], reverse=True)

        # Temukan hari & waktu paling sibuk / lengang
        busiest_day = max(day_occupancy.items(), key=lambda x: x[1])[0] if day_occupancy and max(day_occupancy.values()) > 0 else "-"
        quietest_day = min(day_occupancy.items(), key=lambda x: x[1])[0] if day_occupancy else "-"
        busiest_time = peak_hours_list[0]["time_label"] if peak_hours_list else "-"
        quietest_time = peak_hours_list[-1]["time_label"] if len(peak_hours_list) > 1 else "-"

        total_rooms_count = len(room_items)
        total_slots_overall = total_rooms_count * total_slots_per_room
        avg_util = round(sum(r["utilization_percentage"] for r in room_items) / total_rooms_count, 1) if total_rooms_count > 0 else 0.0
        overall_fill_rate = round(total_students_overall / total_capacity_occupied_overall * 100.0, 1) if total_capacity_occupied_overall > 0 else 0.0

        return {
            "version_id": version_id,
            "version_number": version_number,
            "semester_label": semester_label or "2026/2027 Ganjil",
            "approval_status": approval_status or "DRAFT",
            "summary": {
                "total_rooms": total_rooms_count,
                "total_capacity": sum(r["capacity"] for r in room_items),
                "total_slots_available": total_slots_overall,
                "total_occupied_slots": total_occupied_overall,
                "total_free_slots": max(0, total_slots_overall - total_occupied_overall),
                "average_utilization_percentage": avg_util,
                "overload_classes_count": overload_classes_count,
                "seat_fill_rate_percentage": overall_fill_rate,
                "busiest_day": busiest_day,
                "busiest_time": busiest_time,
                "quietest_day": quietest_day,
                "quietest_time": quietest_time,
            },
            "buildings": buildings_stats,
            "peak_hours": peak_hours_list[:10],
            "rooms": room_items,
        }

    def get_room_utilization_stats(
        self,
        version_id: Optional[int] = None,
        day: Optional[str] = None,
        building: Optional[str] = None,
        department: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Menghitung statistik dan utilisasi ruangan fisik dari jadwal terkini di MySQL (jadwal_kuliah & ruang).
        Mendukung filter berdasarkan versi jadwal, hari, gedung, dan departemen pengelola.
        """
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # 1. Ambil data ruang fisik
                cursor.execute(
                    """
                    SELECT r.id_ruang, r.id_prodi_pengelola, r.kode_ruang, r.nama_ruang,
                           r.gedung, r.lantai, r.kapasitas, ps.kode_prodi
                    FROM ruang r
                    LEFT JOIN program_studi ps ON r.id_prodi_pengelola = ps.id_prodi
                    ORDER BY r.gedung ASC, r.lantai ASC, r.kode_ruang ASC;
                    """
                )
                raw_rooms = cursor.fetchall()

                # Filter ruangan
                filtered_raw_rooms = []
                for r in raw_rooms:
                    r_gedung = (r["gedung"] or "").strip()
                    r_bld = f"Gedung {r_gedung}" if len(r_gedung) <= 2 else r_gedung
                    if building and building != "Semua":
                        b_clean = building.replace("Gedung", "").strip().lower()
                        if r_gedung.lower() != b_clean and r_bld.lower() != building.lower():
                            continue
                    if department and department != "Semua":
                        dept_clean = department.strip().upper()
                        r_dept = (r["kode_prodi"] or "").strip().upper()
                        if r_dept and r_dept != dept_clean:
                            continue
                    filtered_raw_rooms.append(r)

                # 2. Ambil versi jadwal
                if version_id:
                    cursor.execute(
                        """
                        SELECT jv.*, sa.tahun_ajaran, sa.jenis_semester
                        FROM jadwal_versi jv
                        JOIN semester_akademik sa ON jv.id_semester = sa.id_semester
                        WHERE jv.id_versi = %s LIMIT 1;
                        """,
                        (int(version_id),),
                    )
                else:
                    cursor.execute(
                        """
                        SELECT jv.*, sa.tahun_ajaran, sa.jenis_semester
                        FROM jadwal_versi jv
                        JOIN semester_akademik sa ON jv.id_semester = sa.id_semester
                        ORDER BY jv.id_versi DESC LIMIT 1;
                        """
                    )
                ver = cursor.fetchone()

                scheduled_classes: List[Dict[str, Any]] = []
                target_ver_id = int(ver["id_versi"]) if ver else None
                semester_label = f"{ver['tahun_ajaran']} {ver['jenis_semester']}" if ver else "2026/2027 Ganjil"
                approval_status = ver.get("status_persetujuan") if ver else "DRAFT"

                if target_ver_id:
                    cursor.execute(
                        """
                        SELECT
                            jk.id_jadwal, jk.id_kelas, jk.id_ruang, jk.hari,
                            TIME_FORMAT(jk.jam_mulai, '%%H:%%i') AS jam_mulai,
                            TIME_FORMAT(jk.jam_selesai, '%%H:%%i') AS jam_selesai,
                            k.kode_kelas, COALESCE(k.jumlah_peserta, k.estimasi_mahasiswa, 40) AS enrolled,
                            mk.kode_mk, mk.nama_mk, mk.sks, mk.semester_paket,
                            ps.kode_prodi AS dept_code,
                            r.id_ruang, r.kode_ruang, r.nama_ruang, r.gedung, r.kapasitas
                        FROM jadwal_kuliah jk
                        JOIN kelas k ON jk.id_kelas = k.id_kelas
                        JOIN mata_kuliah mk ON k.id_mk = mk.id_mk
                        JOIN ruang r ON jk.id_ruang = r.id_ruang
                        LEFT JOIN program_studi ps ON mk.id_prodi = ps.id_prodi
                        WHERE jk.id_versi = %s;
                        """,
                        (target_ver_id,),
                    )
                    jk_rows = cursor.fetchall()

                    # Ambil nama dosen pengampu
                    k_ids = list({int(r["id_kelas"]) for r in jk_rows if r["id_kelas"]})
                    lect_map: Dict[int, List[str]] = {}
                    if k_ids:
                        ph = ",".join(["%s"] * len(k_ids))
                        cursor.execute(
                            f"""
                            SELECT pk.id_kelas, u.nama_lengkap AS nama_dosen
                            FROM pengampu_kelas pk
                            JOIN dosen d ON pk.id_dosen = d.id_dosen
                            JOIN pengguna u ON d.id_pengguna = u.id_pengguna
                            WHERE pk.id_kelas IN ({ph});
                            """,
                            tuple(k_ids),
                        )
                        for row in cursor.fetchall():
                            lect_map.setdefault(int(row["id_kelas"]), []).append(row["nama_dosen"])

                    for r in jk_rows:
                        kid = int(r["id_kelas"])
                        lects = lect_map.get(kid, [])
                        if not lects:
                            csv_meta = self._csv_meta_by_key.get((
                                (r["kode_mk"] or "").strip(),
                                (r["dept_code"] or "").strip().upper(),
                                int(r["semester_paket"] or 1),
                                (r["kode_kelas"] or "").strip(),
                            ))
                            if csv_meta and csv_meta.get("lecturer_names"):
                                lects = csv_meta["lecturer_names"]
                        scheduled_classes.append({
                            "id_jadwal": int(r["id_jadwal"]),
                            "class_id": f"c-{r['id_kelas']}",
                            "room_id": str(r["id_ruang"]),
                            "room_code": r["kode_ruang"],
                            "day": normalize_day_name(r["hari"]),
                            "start_time": r["jam_mulai"],
                            "end_time": r["jam_selesai"],
                            "course_code": r["kode_mk"],
                            "course_name": r["nama_mk"],
                            "class_label": r["kode_kelas"],
                            "department": r["dept_code"] or "FTI",
                            "lecturer_name": ", ".join(lects) if lects else "Dosen Pengampu",
                            "lecturer_names": list(lects),
                            "enrolled": int(r["enrolled"] or 40),
                            "capacity": int(r["kapasitas"] or 45),
                        })
        finally:
            conn.close()

        return self._compute_utilization(
            rooms=filtered_raw_rooms,
            scheduled_classes=scheduled_classes,
            version_id=target_ver_id,
            version_number=ver.get("nomor_versi", 1) if ver else None,
            semester_label=semester_label,
            approval_status=approval_status,
            filter_day=day,
            filter_building=building,
        )



mysql_store = MySQLDataStore()
