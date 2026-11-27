"""
Layanan jadwal per pertemuan (tabel `pertemuan_kuliah`).

- Jadwal pribadi dosen   : kelas dari `pengampu_kelas` (dosen.id_pengguna = akun login).
- Jadwal pribadi mahasiswa: rombel angkatan, yaitu kelas pada prodi mahasiswa dengan
  `kelas.target_angkatan = mahasiswa.tahun_masuk`.
- Nomor & tanggal pertemuan dihitung dari `semester_akademik.tgl_mulai` dan hari jadwal,
  sehingga dosen dan mahasiswa pada kelas yang sama melihat pertemuan yang sama.
- Jadwal pengganti disimpan per pertemuan di `pertemuan_kuliah`
  (unik per `id_jadwal` + `pertemuan_ke`).
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from app.db.connection import get_db_connection
from app.db.mysql_store import mysql_store
from app.engine.manual_schedule import normalize_day_name, parse_time_to_minutes

MAX_PERTEMUAN = 16
HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
STATUS_PENGGANTI = "Pengganti"


class PertemuanError(ValueError):
    """Kesalahan validasi yang ditampilkan ke pengguna."""


# ── Helper ───────────────────────────────────────────────────────────────────
def _to_date(v: Any) -> date:
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    return datetime.strptime(str(v)[:10], "%Y-%m-%d").date()


def _hhmm(v: Any) -> str:
    """TIME dari MySQL bisa berupa timedelta; ubah ke 'HH:MM'."""
    if isinstance(v, timedelta):
        total = int(v.total_seconds()) // 60
        return f"{total // 60:02d}:{total % 60:02d}"
    s = str(v or "")
    return s[:5]


def _overlap(s1: str, e1: str, s2: str, e2: str) -> bool:
    return parse_time_to_minutes(s1) < parse_time_to_minutes(e2) and parse_time_to_minutes(e1) > parse_time_to_minutes(s2)


def _meeting_dates(hari: str, tgl_mulai: date, tgl_selesai: date) -> List[date]:
    """Tanggal pertemuan mingguan untuk hari tertentu sepanjang semester (maks. 16)."""
    hari_norm = normalize_day_name(hari)
    if hari_norm not in HARI:
        return []
    wd = HARI.index(hari_norm)
    first = tgl_mulai + timedelta(days=(wd - tgl_mulai.weekday()) % 7)
    out: List[date] = []
    d = first
    while d <= tgl_selesai and len(out) < MAX_PERTEMUAN:
        out.append(d)
        d += timedelta(days=7)
    return out


def _active_version(cursor) -> Optional[Dict[str, Any]]:
    cursor.execute(
        """
        SELECT jv.id_versi, jv.id_semester, sa.tahun_ajaran, sa.jenis_semester, sa.tgl_mulai, sa.tgl_selesai
        FROM jadwal_versi jv
        JOIN semester_akademik sa ON sa.id_semester = jv.id_semester
        ORDER BY jv.id_versi DESC LIMIT 1;
        """
    )
    return cursor.fetchone()


def _get_user(cursor, email: str) -> Dict[str, Any]:
    cursor.execute(
        "SELECT id_pengguna, email, nama_lengkap, peran FROM pengguna WHERE LOWER(email) = LOWER(%s) LIMIT 1;",
        (email.strip(),),
    )
    user = cursor.fetchone()
    if not user:
        raise PertemuanError("Akun tidak ditemukan di database.")
    return user


def _kelas_ids_for_user(cursor, user: Dict[str, Any]) -> Tuple[str, List[int]]:
    """Kembalikan (peran, daftar id_kelas) milik pengguna."""
    uid = int(user["id_pengguna"])
    cursor.execute("SELECT id_mahasiswa, id_prodi, tahun_masuk FROM mahasiswa WHERE id_pengguna = %s LIMIT 1;", (uid,))
    mhs = cursor.fetchone()
    if mhs:
        # Rombel angkatan: satu kelas per mata kuliah (kelas paralel pertama yang terjadwal)
        cursor.execute(
            """
            SELECT k.id_kelas, k.id_mk, k.kode_kelas,
                   EXISTS(
                       SELECT 1 FROM jadwal_kuliah jk
                       WHERE jk.id_kelas = k.id_kelas
                         AND jk.id_versi = (SELECT MAX(id_versi) FROM jadwal_versi)
                   ) AS terjadwal
            FROM kelas k
            JOIN mata_kuliah mk ON mk.id_mk = k.id_mk
            WHERE mk.id_prodi = %s AND k.target_angkatan = %s
            ORDER BY k.id_mk, terjadwal DESC, k.kode_kelas ASC;
            """,
            (int(mhs["id_prodi"]), int(mhs["tahun_masuk"])),
        )
        chosen: Dict[int, int] = {}
        for r in cursor.fetchall():
            chosen.setdefault(int(r["id_mk"]), int(r["id_kelas"]))
        return "mahasiswa", list(chosen.values())

    cursor.execute("SELECT id_dosen FROM dosen WHERE id_pengguna = %s LIMIT 1;", (uid,))
    dsn = cursor.fetchone()
    if dsn:
        cursor.execute("SELECT id_kelas FROM pengampu_kelas WHERE id_dosen = %s;", (int(dsn["id_dosen"]),))
        return "dosen", [int(r["id_kelas"]) for r in cursor.fetchall()]

    return "lainnya", []


def _lecturers_for(cursor, kelas_ids: List[int]) -> Dict[int, List[str]]:
    out: Dict[int, List[str]] = {}
    if not kelas_ids:
        return out
    ph = ",".join(["%s"] * len(kelas_ids))
    cursor.execute(
        f"""
        SELECT pk.id_kelas, u.nama_lengkap, pk.peran_pengampu
        FROM pengampu_kelas pk
        JOIN dosen d ON d.id_dosen = pk.id_dosen
        JOIN pengguna u ON u.id_pengguna = d.id_pengguna
        WHERE pk.id_kelas IN ({ph})
        ORDER BY pk.id_kelas, (pk.peran_pengampu = 'PJMK') DESC;
        """,
        tuple(kelas_ids),
    )
    for r in cursor.fetchall():
        out.setdefault(int(r["id_kelas"]), []).append(r["nama_lengkap"])
    return out


# ── Jadwal pribadi + daftar pertemuan ────────────────────────────────────────
def get_jadwal_saya(email: str, today: Optional[date] = None) -> Dict[str, Any]:
    today = today or date.today()
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            user = _get_user(cursor, email)
            peran, kelas_ids = _kelas_ids_for_user(cursor, user)
            ver = _active_version(cursor)
            if not ver:
                return {"role": peran, "user_name": user["nama_lengkap"], "semester": None, "classes": []}

            tgl_mulai, tgl_selesai = _to_date(ver["tgl_mulai"]), _to_date(ver["tgl_selesai"])
            semester = {
                "label": f"{ver['tahun_ajaran']} {ver['jenis_semester']}",
                "tgl_mulai": tgl_mulai.isoformat(),
                "tgl_selesai": tgl_selesai.isoformat(),
            }
            if not kelas_ids:
                return {"role": peran, "user_name": user["nama_lengkap"], "semester": semester, "today": today.isoformat(), "classes": []}

            ph = ",".join(["%s"] * len(kelas_ids))
            cursor.execute(
                f"""
                SELECT jk.id_jadwal, jk.id_kelas, jk.hari,
                       TIME_FORMAT(jk.jam_mulai, '%%H:%%i') AS jam_mulai,
                       TIME_FORMAT(jk.jam_selesai, '%%H:%%i') AS jam_selesai,
                       k.kode_kelas, COALESCE(NULLIF(k.jumlah_peserta, 0), k.estimasi_mahasiswa) AS peserta,
                       mk.kode_mk, mk.nama_mk, mk.sks, mk.semester_paket,
                       ps.kode_prodi,
                       r.id_ruang, r.kode_ruang, r.gedung, r.lantai, r.kapasitas
                FROM jadwal_kuliah jk
                JOIN kelas k ON k.id_kelas = jk.id_kelas
                JOIN mata_kuliah mk ON mk.id_mk = k.id_mk
                LEFT JOIN program_studi ps ON ps.id_prodi = mk.id_prodi
                JOIN ruang r ON r.id_ruang = jk.id_ruang
                WHERE jk.id_versi = %s AND jk.id_kelas IN ({ph})
                ORDER BY FIELD(jk.hari, 'Senin','Selasa','Rabu','Kamis','Jumat'), jk.jam_mulai;
                """,
                (int(ver["id_versi"]), *kelas_ids),
            )
            rows = cursor.fetchall()
            lect_map = _lecturers_for(cursor, kelas_ids)

            jadwal_ids = [int(r["id_jadwal"]) for r in rows]
            replacements: Dict[Tuple[int, int], Dict[str, Any]] = {}
            if jadwal_ids:
                ph2 = ",".join(["%s"] * len(jadwal_ids))
                cursor.execute(
                    f"""
                    SELECT pk.*, r.kode_ruang, r.gedung, r.lantai
                    FROM pertemuan_kuliah pk
                    JOIN ruang r ON r.id_ruang = pk.id_ruang_aktual
                    WHERE pk.id_jadwal IN ({ph2});
                    """,
                    tuple(jadwal_ids),
                )
                for p in cursor.fetchall():
                    replacements[(int(p["id_jadwal"]), int(p["pertemuan_ke"]))] = p
    finally:
        conn.close()

    classes: List[Dict[str, Any]] = []
    for r in rows:
        id_jadwal = int(r["id_jadwal"])
        dates = _meeting_dates(r["hari"], tgl_mulai, tgl_selesai)
        lecturers = lect_map.get(int(r["id_kelas"])) or []
        if not lecturers:
            meta = mysql_store._csv_meta_by_key.get((
                (r["kode_mk"] or "").strip(),
                (r["kode_prodi"] or "").strip().upper(),
                int(r["semester_paket"] or 1),
                (r["kode_kelas"] or "").strip(),
            ))
            if meta and meta.get("lecturer_names"):
                lecturers = list(meta["lecturer_names"])

        meetings: List[Dict[str, Any]] = []
        for idx, d in enumerate(dates, start=1):
            rep = replacements.get((id_jadwal, idx))
            if rep:
                eff_date = _to_date(rep["tanggal_pertemuan"])
                meetings.append({
                    "pertemuan_ke": idx,
                    "tanggal_asli": d.isoformat(),
                    "tanggal": eff_date.isoformat(),
                    "hari": HARI[eff_date.weekday()],
                    "jam_mulai": _hhmm(rep["jam_mulai_aktual"]),
                    "jam_selesai": _hhmm(rep["jam_selesai_aktual"]),
                    "id_ruang": int(rep["id_ruang_aktual"]),
                    "kode_ruang": rep["kode_ruang"],
                    "status": rep["status_pertemuan"],
                    "is_pengganti": True,
                    "keterangan": rep.get("keterangan"),
                })
            else:
                meetings.append({
                    "pertemuan_ke": idx,
                    "tanggal_asli": d.isoformat(),
                    "tanggal": d.isoformat(),
                    "hari": HARI[d.weekday()],
                    "jam_mulai": r["jam_mulai"],
                    "jam_selesai": r["jam_selesai"],
                    "id_ruang": int(r["id_ruang"]),
                    "kode_ruang": r["kode_ruang"],
                    "status": "Selesai" if d < today else ("Hari Ini" if d == today else "Terjadwal"),
                    "is_pengganti": False,
                    "keterangan": None,
                })

        # Pertemuan berjalan = pertemuan pertama yang tanggalnya >= hari ini
        upcoming = [m for m in meetings if _to_date(m["tanggal"]) >= today]
        current = upcoming[0]["pertemuan_ke"] if upcoming else (len(meetings) or 1)

        gedung = (r["gedung"] or "").strip()
        classes.append({
            "id_jadwal": id_jadwal,
            "id_kelas": int(r["id_kelas"]),
            "course_code": r["kode_mk"],
            "course_name": r["nama_mk"],
            "class_label": r["kode_kelas"],
            "sks": int(r["sks"] or 2),
            "semester": int(r["semester_paket"] or 1),
            "department": (r["kode_prodi"] or "SI").upper(),
            "day": normalize_day_name(r["hari"]),
            "start_time": r["jam_mulai"],
            "end_time": r["jam_selesai"],
            "room_id": int(r["id_ruang"]),
            "room_code": r["kode_ruang"],
            "building": f"Gedung {gedung}" if len(gedung) <= 2 else gedung,
            "floor": int(r["lantai"] or 1),
            "capacity": int(r["kapasitas"] or 0),
            "enrolled": int(r["peserta"] or 0),
            "lecturers": lecturers,
            "current_meeting": current,
            "total_meetings": len(meetings),
            "meetings": meetings,
        })

    return {
        "role": peran,
        "user_name": user["nama_lengkap"],
        "semester": semester,
        "today": today.isoformat(),
        "classes": classes,
    }


# ── Ketersediaan ruang pada tanggal tertentu ─────────────────────────────────
def _busy_room_ids(
    cursor,
    tanggal: date,
    jam_mulai: str,
    jam_selesai: str,
    ver: Dict[str, Any],
    exclude: Optional[Tuple[int, int]] = None,
) -> set:
    """Ruang yang terpakai pada tanggal & jam tersebut (jadwal rutin + pertemuan pengganti)."""
    busy: set = set()
    tgl_mulai, tgl_selesai = _to_date(ver["tgl_mulai"]), _to_date(ver["tgl_selesai"])
    hari = HARI[tanggal.weekday()]

    # Pertemuan yang dipindahkan / diganti
    cursor.execute(
        """
        SELECT id_jadwal, pertemuan_ke, id_ruang_aktual, tanggal_pertemuan,
               TIME_FORMAT(jam_mulai_aktual, '%H:%i') AS jm, TIME_FORMAT(jam_selesai_aktual, '%H:%i') AS js
        FROM pertemuan_kuliah;
        """
    )
    moved: set = set()
    for p in cursor.fetchall():
        key = (int(p["id_jadwal"]), int(p["pertemuan_ke"]))
        if exclude and key == exclude:
            continue
        moved.add(key)
        if _to_date(p["tanggal_pertemuan"]) == tanggal and _overlap(p["jm"], p["js"], jam_mulai, jam_selesai):
            busy.add(int(p["id_ruang_aktual"]))

    # Jadwal rutin mingguan pada hari tersebut (kecuali pertemuannya sudah dipindahkan)
    if tgl_mulai <= tanggal <= tgl_selesai and hari in HARI[:5]:
        cursor.execute(
            """
            SELECT id_jadwal, id_ruang, hari,
                   TIME_FORMAT(jam_mulai, '%%H:%%i') AS jm, TIME_FORMAT(jam_selesai, '%%H:%%i') AS js
            FROM jadwal_kuliah WHERE id_versi = %s;
            """,
            (int(ver["id_versi"]),),
        )
        for j in cursor.fetchall():
            if normalize_day_name(j["hari"]) != hari or not _overlap(j["jm"], j["js"], jam_mulai, jam_selesai):
                continue
            dates = _meeting_dates(j["hari"], tgl_mulai, tgl_selesai)
            if tanggal not in dates:
                continue
            k = dates.index(tanggal) + 1
            if (int(j["id_jadwal"]), k) in moved:
                continue  # pertemuan rutin ini sudah dipindahkan, ruang kosong
            busy.add(int(j["id_ruang"]))
    return busy


def _validate_window(tanggal: str, jam_mulai: str, jam_selesai: str) -> date:
    try:
        tgl = _to_date(tanggal)
    except Exception:
        raise PertemuanError("Format tanggal tidak valid (YYYY-MM-DD).")
    if tgl.weekday() > 4:
        raise PertemuanError("Jadwal pengganti hanya bisa pada hari Senin–Jumat.")
    if parse_time_to_minutes(jam_selesai) <= parse_time_to_minutes(jam_mulai):
        raise PertemuanError("Jam selesai harus lebih akhir dari jam mulai.")
    return tgl


def get_ruang_tersedia(
    tanggal: str,
    jam_mulai: str,
    jam_selesai: str,
    min_kapasitas: int = 0,
    id_jadwal: Optional[int] = None,
    pertemuan_ke: Optional[int] = None,
) -> Dict[str, Any]:
    tgl = _validate_window(tanggal, jam_mulai, jam_selesai)
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            ver = _active_version(cursor)
            if not ver:
                raise PertemuanError("Belum ada versi jadwal aktif.")
            exclude = (int(id_jadwal), int(pertemuan_ke)) if id_jadwal and pertemuan_ke else None
            busy = _busy_room_ids(cursor, tgl, jam_mulai, jam_selesai, ver, exclude)
            cursor.execute("SELECT id_ruang, kode_ruang, gedung, lantai, kapasitas FROM ruang ORDER BY kode_ruang;")
            rooms = cursor.fetchall()
    finally:
        conn.close()

    out = []
    for r in rooms:
        if int(r["id_ruang"]) in busy or int(r["kapasitas"] or 0) < int(min_kapasitas or 0):
            continue
        gedung = (r["gedung"] or "").strip()
        out.append({
            "id_ruang": int(r["id_ruang"]),
            "kode_ruang": r["kode_ruang"],
            "gedung": f"Gedung {gedung}" if len(gedung) <= 2 else gedung,
            "lantai": int(r["lantai"] or 1),
            "kapasitas": int(r["kapasitas"] or 0),
        })
    return {"tanggal": tgl.isoformat(), "hari": HARI[tgl.weekday()], "jam_mulai": jam_mulai, "jam_selesai": jam_selesai, "rooms": out}


# ── Simpan jadwal pengganti ke pertemuan_kuliah ──────────────────────────────
def simpan_pengganti(payload: Dict[str, Any]) -> Dict[str, Any]:
    email = (payload.get("email") or "").strip()
    id_jadwal = int(payload["id_jadwal"])
    pertemuan_ke = int(payload["pertemuan_ke"])
    jam_mulai = str(payload["jam_mulai"])[:5]
    jam_selesai = str(payload["jam_selesai"])[:5]
    id_ruang = int(payload["id_ruang"])
    tgl = _validate_window(str(payload["tanggal"]), jam_mulai, jam_selesai)
    catatan = (payload.get("keterangan") or "").strip()

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            user = _get_user(cursor, email)
            peran, kelas_ids = _kelas_ids_for_user(cursor, user)
            # Jadwal pengganti hanya dapat diubah oleh dosen pengampu (tanpa persetujuan)
            if peran != "dosen":
                raise PertemuanError("Hanya dosen pengampu yang dapat mengubah jadwal pengganti.")
            ver = _active_version(cursor)
            if not ver:
                raise PertemuanError("Belum ada versi jadwal aktif.")

            cursor.execute(
                """
                SELECT jk.id_jadwal, jk.id_kelas, jk.hari, r.kode_ruang,
                       TIME_FORMAT(jk.jam_mulai, '%%H:%%i') AS jm, TIME_FORMAT(jk.jam_selesai, '%%H:%%i') AS js
                FROM jadwal_kuliah jk JOIN ruang r ON r.id_ruang = jk.id_ruang
                WHERE jk.id_jadwal = %s AND jk.id_versi = %s LIMIT 1;
                """,
                (id_jadwal, int(ver["id_versi"])),
            )
            jad = cursor.fetchone()
            if not jad:
                raise PertemuanError("Jadwal kelas tidak ditemukan pada versi jadwal aktif.")
            if int(jad["id_kelas"]) not in kelas_ids:
                raise PertemuanError("Anda bukan dosen pengampu kelas ini.")

            tgl_mulai, tgl_selesai = _to_date(ver["tgl_mulai"]), _to_date(ver["tgl_selesai"])
            dates = _meeting_dates(jad["hari"], tgl_mulai, tgl_selesai)
            if not (1 <= pertemuan_ke <= len(dates)):
                raise PertemuanError(f"Pertemuan ke-{pertemuan_ke} tidak ada (total {len(dates)} pertemuan).")
            if not (tgl_mulai <= tgl <= tgl_selesai):
                raise PertemuanError("Tanggal pengganti harus berada dalam masa semester aktif.")

            busy = _busy_room_ids(cursor, tgl, jam_mulai, jam_selesai, ver, exclude=(id_jadwal, pertemuan_ke))
            if id_ruang in busy:
                raise PertemuanError("Ruang sudah terpakai pada tanggal dan jam tersebut. Pilih ruang atau waktu lain.")

            cursor.execute("SELECT kode_ruang FROM ruang WHERE id_ruang = %s;", (id_ruang,))
            ruang_baru = cursor.fetchone()
            if not ruang_baru:
                raise PertemuanError("Ruang tidak ditemukan.")

            asli = dates[pertemuan_ke - 1]
            keterangan = (
                f"Pengganti pertemuan ke-{pertemuan_ke} (semula {normalize_day_name(jad['hari'])}, "
                f"{asli.strftime('%d-%m-%Y')} {jad['jm']}-{jad['js']} di {jad['kode_ruang']})"
            )
            if catatan:
                keterangan += f". Catatan: {catatan}"

            cursor.execute(
                """
                INSERT INTO pertemuan_kuliah
                    (id_jadwal, id_ruang_aktual, id_pemohon_pengganti, pertemuan_ke, tanggal_pertemuan,
                     jam_mulai_aktual, jam_selesai_aktual, status_pertemuan, keterangan)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    id_ruang_aktual = VALUES(id_ruang_aktual),
                    id_pemohon_pengganti = VALUES(id_pemohon_pengganti),
                    tanggal_pertemuan = VALUES(tanggal_pertemuan),
                    jam_mulai_aktual = VALUES(jam_mulai_aktual),
                    jam_selesai_aktual = VALUES(jam_selesai_aktual),
                    status_pertemuan = VALUES(status_pertemuan),
                    keterangan = VALUES(keterangan);
                """,
                (id_jadwal, id_ruang, int(user["id_pengguna"]), pertemuan_ke, tgl.isoformat(),
                 jam_mulai, jam_selesai, STATUS_PENGGANTI, keterangan),
            )
        conn.commit()
    finally:
        conn.close()

    return {
        "message": f"Jadwal pengganti pertemuan ke-{pertemuan_ke} disimpan di ruang {ruang_baru['kode_ruang']} "
                   f"pada {HARI[tgl.weekday()]}, {tgl.strftime('%d-%m-%Y')} {jam_mulai}-{jam_selesai}.",
        "id_jadwal": id_jadwal,
        "pertemuan_ke": pertemuan_ke,
        "tanggal": tgl.isoformat(),
        "kode_ruang": ruang_baru["kode_ruang"],
    }


# ── Okupansi ruang per tanggal (jadwal rutin + pertemuan pengganti) ─────────
def get_okupansi_tanggal(tanggal: str) -> Dict[str, Any]:
    """Daftar kelas yang menempati ruang pada tanggal tertentu.

    Jadwal rutin pada hari tersebut ditampilkan dengan nomor pertemuannya, kecuali
    pertemuan itu sudah dipindahkan; pertemuan pengganti pada tanggal tersebut ikut ditampilkan.
    """
    try:
        tgl = _to_date(tanggal)
    except Exception:
        raise PertemuanError("Format tanggal tidak valid (YYYY-MM-DD).")

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            ver = _active_version(cursor)
            if not ver:
                return {"tanggal": tgl.isoformat(), "hari": HARI[tgl.weekday()], "items": []}
            tgl_mulai, tgl_selesai = _to_date(ver["tgl_mulai"]), _to_date(ver["tgl_selesai"])

            cursor.execute(
                """
                SELECT jk.id_jadwal, jk.id_kelas, jk.hari, jk.id_ruang,
                       TIME_FORMAT(jk.jam_mulai, '%%H:%%i') AS jm, TIME_FORMAT(jk.jam_selesai, '%%H:%%i') AS js,
                       k.kode_kelas, COALESCE(NULLIF(k.jumlah_peserta, 0), k.estimasi_mahasiswa) AS peserta,
                       mk.kode_mk, mk.nama_mk, mk.semester_paket, ps.kode_prodi, r.kode_ruang, r.kapasitas
                FROM jadwal_kuliah jk
                JOIN kelas k ON k.id_kelas = jk.id_kelas
                JOIN mata_kuliah mk ON mk.id_mk = k.id_mk
                LEFT JOIN program_studi ps ON ps.id_prodi = mk.id_prodi
                JOIN ruang r ON r.id_ruang = jk.id_ruang
                WHERE jk.id_versi = %s;
                """,
                (int(ver["id_versi"]),),
            )
            jadwal = {int(j["id_jadwal"]): j for j in cursor.fetchall()}

            cursor.execute(
                """
                SELECT pk.id_jadwal, pk.pertemuan_ke, pk.id_ruang_aktual, pk.tanggal_pertemuan,
                       TIME_FORMAT(pk.jam_mulai_aktual, '%H:%i') AS jm, TIME_FORMAT(pk.jam_selesai_aktual, '%H:%i') AS js,
                       r.kode_ruang
                FROM pertemuan_kuliah pk JOIN ruang r ON r.id_ruang = pk.id_ruang_aktual;
                """
            )
            pengganti = cursor.fetchall()
            lect_map = _lecturers_for(cursor, list({int(j["id_kelas"]) for j in jadwal.values()}))
    finally:
        conn.close()

    moved = {(int(p["id_jadwal"]), int(p["pertemuan_ke"])) for p in pengganti}

    def lecturers_of(j: Dict[str, Any]) -> List[str]:
        names = lect_map.get(int(j["id_kelas"])) or []
        if names:
            return names
        meta = mysql_store._csv_meta_by_key.get((
            (j["kode_mk"] or "").strip(),
            (j["kode_prodi"] or "").strip().upper(),
            int(j["semester_paket"] or 1),
            (j["kode_kelas"] or "").strip(),
        ))
        return list(meta.get("lecturer_names") or []) if meta else []

    def item(j: Dict[str, Any], k: int, id_ruang: int, kode_ruang: str, jm: str, js: str, is_pengganti: bool, asli: date) -> Dict[str, Any]:
        return {
            "id_jadwal": int(j["id_jadwal"]),
            "pertemuan_ke": k,
            "tanggal_asli": asli.isoformat(),
            "is_pengganti": is_pengganti,
            "id_ruang": id_ruang,
            "kode_ruang": kode_ruang,
            "jam_mulai": jm,
            "jam_selesai": js,
            "course_code": j["kode_mk"],
            "course_name": j["nama_mk"],
            "class_label": j["kode_kelas"],
            "department": (j["kode_prodi"] or "SI").upper(),
            "enrolled": int(j["peserta"] or 0),
            "lecturers": lecturers_of(j),
        }

    items: List[Dict[str, Any]] = []
    hari = HARI[tgl.weekday()]
    if tgl_mulai <= tgl <= tgl_selesai and hari in HARI[:5]:
        for j in jadwal.values():
            if normalize_day_name(j["hari"]) != hari:
                continue
            dates = _meeting_dates(j["hari"], tgl_mulai, tgl_selesai)
            if tgl not in dates:
                continue
            k = dates.index(tgl) + 1
            if (int(j["id_jadwal"]), k) in moved:
                continue
            items.append(item(j, k, int(j["id_ruang"]), j["kode_ruang"], j["jm"], j["js"], False, tgl))

    for p in pengganti:
        if _to_date(p["tanggal_pertemuan"]) != tgl:
            continue
        j = jadwal.get(int(p["id_jadwal"]))
        if not j:
            continue
        dates = _meeting_dates(j["hari"], tgl_mulai, tgl_selesai)
        k = int(p["pertemuan_ke"])
        asli = dates[k - 1] if 1 <= k <= len(dates) else tgl
        items.append(item(j, k, int(p["id_ruang_aktual"]), p["kode_ruang"], p["jm"], p["js"], True, asli))

    return {"tanggal": tgl.isoformat(), "hari": hari, "items": items}
