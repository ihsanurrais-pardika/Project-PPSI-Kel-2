"""
Modul Koneksi dan Autentikasi Database SIPRAMA FTI UNAND
Membaca langsung dari database MySQL Laragon (siprama_db).
Hanya mengizinkan login jika data pengguna ada di database.
Jika tabel pengguna di database kosong, login DITOLAK.
"""

import os
import re
import pymysql
import pymysql.cursors
import bcrypt


def _load_root_env():
    """Memuat variabel dari file .env di root project jika belum ada di environment."""
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if not os.path.exists(env_path):
        return
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for raw_line in f:
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = val
    except Exception:
        pass


_load_root_env()

# Konfigurasi Database (Mendukung .env atau default Laragon/XAMPP MySQL)
DB_HOST = os.environ.get("DB_HOST", "127.0.0.1")
DB_PORT = int(os.environ.get("DB_PORT", 3306))
DB_USER = os.environ.get("DB_USER", "root")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")
DB_NAME = os.environ.get("DB_NAME", "siprama_db")

# Parse dari DATABASE_URL jika tersedia di .env
DATABASE_URL = os.environ.get("DATABASE_URL", "")
if DATABASE_URL and "mysql://" in DATABASE_URL:
    try:
        # Format: mysql://user:password@host:port/database
        pattern = r"mysql://([^:]*)(?::([^@]*))?@([^:/]+)(?::(\d+))?/([^?]+)"
        match = re.match(pattern, DATABASE_URL)
        if match:
            DB_USER = match.group(1) or "root"
            DB_PASSWORD = match.group(2) or ""
            DB_HOST = match.group(3) or "127.0.0.1"
            DB_PORT = int(match.group(4) or 3306)
            DB_NAME = match.group(5) or "siprama_db"
    except Exception as e:
        print(f"[DB-CONFIG] Gagal parsing DATABASE_URL, menggunakan default: {e}")


def get_db_connection():
    """Membuka koneksi ke database MySQL Laragon."""
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=5,
    )


def count_users_in_db() -> int:
    """Menghitung total baris pada tabel pengguna di database."""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) AS total FROM pengguna;")
            result = cursor.fetchone()
            return int(result["total"]) if result else 0
    except Exception as e:
        print(f"[DB-ERROR] Gagal menghitung tabel pengguna: {e}")
        raise e
    finally:
        if conn:
            conn.close()


def verify_password(plain_password: str, stored_hash: str) -> bool:
    """
    Memverifikasi kecocokan password:
    1. Menguji via bcrypt hash ($2b$ / $2a$ / $2y$)
    2. Mendukung perbandingan plain text jika stored_hash belum dibcrypt
    """
    if not plain_password or not stored_hash:
        return False

    # 1. Coba verifikasi bcrypt
    if stored_hash.startswith(("$2b$", "$2a$", "$2y$")):
        try:
            return bcrypt.checkpw(
                plain_password.encode("utf-8"),
                stored_hash.encode("utf-8")
            )
        except Exception:
            pass

    # 2. Coba perbandingan langsung
    return plain_password == stored_hash


def normalize_role(peran_db: str) -> str:
    """Mengonversi nama peran dari database ke format role frontend SIPRAMA."""
    p = (peran_db or "").strip().lower()
    if "wadek" in p:
        return "wadek1"
    if "mhs" in p or "mahasiswa" in p:
        return "mahasiswa"
    if "dosen" in p:
        return "dosen"
    if "kadep_si" in p or p == "si" or "departemen_si" in p or "sistem_informasi" in p or "prodi_si" in p:
        return "departemen_si"
    if "kadep_if" in p or p == "if" or "departemen_if" in p or "informatika" in p:
        return "departemen_if"
    if "kadep_tk" in p or p == "tk" or "departemen_tk" in p or "tekkom" in p or "komputer" in p:
        return "departemen_tk"
    if "admin" in p or "superadmin" in p:
        return "admin"
    return "admin"


def authenticate_from_database(identifier: str, password: str):
    """
    Mengeksekusi autentikasi dengan membaca langsung data di MySQL database.
    Aturan:
    - Jika database kosong (0 data pengguna), login GAGAL.
    - Jika email/NIP/NIM tidak terdaftar di database, login GAGAL.
    - Jika kata sandi salah, login GAGAL.
    - Hanya jika data pengguna valid di database dan sandi cocok, login BERHASIL.
    """
    clean_id = (identifier or "").strip().lower()
    clean_id_nospace = clean_id.replace(" ", "")
    clean_pw = (password or "").strip()

    if not clean_id or not clean_pw:
        return {
            "success": False,
            "status_code": 400,
            "detail": "Sandi atau NIP/NIM/Email Anda salah.",
        }

    conn = None
    try:
        # 1. Cek apakah database memiliki data pengguna
        total_users = count_users_in_db()
        if total_users == 0:
            print("[AUTH-DB] Tabel pengguna di database KOSONG (0 data). Login ditolak.")
            return {
                "success": False,
                "status_code": 401,
                "detail": "Sandi atau NIP/NIM/Email Anda salah.",
                "reason": "DATABASE_EMPTY",
            }

        # 2. Query data pengguna berdasarkan email, username, NIP/NIDN dosen, atau NIM mahasiswa
        conn = get_db_connection()
        query = """
            SELECT 
                p.id_pengguna,
                p.id_prodi,
                p.username,
                p.password_hash,
                p.nama_lengkap,
                p.email,
                p.peran,
                p.status_aktif,
                pr.kode_prodi,
                pr.nama_prodi,
                pr.nama_departemen,
                d.nidn AS dosen_nidn,
                d.jabatan_struktural,
                m.nim AS mahasiswa_nim
            FROM pengguna p
            LEFT JOIN program_studi pr ON p.id_prodi = pr.id_prodi
            LEFT JOIN dosen d ON p.id_pengguna = d.id_pengguna
            LEFT JOIN mahasiswa m ON p.id_pengguna = m.id_pengguna
            WHERE LOWER(p.email) = %s 
               OR LOWER(p.username) = %s
               OR REPLACE(LOWER(IFNULL(d.nidn, '')), ' ', '') = %s
               OR REPLACE(LOWER(IFNULL(m.nim, '')), ' ', '') = %s;
        """

        with conn.cursor() as cursor:
            cursor.execute(query, (clean_id, clean_id, clean_id_nospace, clean_id_nospace))
            user_row = cursor.fetchone()

        # 3. Jika pengguna tidak ditemukan di database
        if not user_row:
            print(f"[AUTH-DB] Pengguna '{clean_id}' tidak ditemukan di tabel database.")
            return {
                "success": False,
                "status_code": 401,
                "detail": "Sandi atau NIP/NIM/Email Anda salah.",
                "reason": "USER_NOT_FOUND",
            }

        # 4. Cek status aktif
        if not user_row.get("status_aktif", True):
            print(f"[AUTH-DB] Akun '{clean_id}' berstatus non-aktif.")
            return {
                "success": False,
                "status_code": 401,
                "detail": "Sandi atau NIP/NIM/Email Anda salah.",
                "reason": "INACTIVE_USER",
            }

        # 5. Verifikasi Password terhadap password_hash di database
        is_pw_valid = verify_password(clean_pw, user_row["password_hash"])
        if not is_pw_valid:
            print(f"[AUTH-DB] Password untuk '{clean_id}' tidak cocok dengan hash database.")
            return {
                "success": False,
                "status_code": 401,
                "detail": "Sandi atau NIP/NIM/Email Anda salah.",
                "reason": "INVALID_PASSWORD",
            }

        # 6. Susun data profil pengguna dari database untuk frontend
        role = normalize_role(user_row["peran"])
        nip_or_nim = user_row.get("dosen_nidn") or user_row.get("mahasiswa_nim") or user_row["username"]
        dept_name = user_row.get("nama_departemen") or user_row.get("nama_prodi") or "Fakultas Teknologi Informasi"

        role_labels = {
            "wadek1": "Wakil Dekan I (Bidang Akademik)",
            "departemen_si": "Ketua Departemen Sistem Informasi",
            "departemen_if": "Ketua Departemen Informatika",
            "departemen_tk": "Ketua Departemen Teknik Komputer",
            "dosen": "Dosen Pengampu",
            "mahasiswa": "Mahasiswa Aktif",
            "admin": "Administrator Sistem FTI",
        }

        default_dashboards = {
            "wadek1": "approval_wadek",
            "departemen_si": "kebutuhan_departemen",
            "departemen_if": "kebutuhan_departemen",
            "departemen_tk": "kebutuhan_departemen",
            "dosen": "portal_akademik",
            "mahasiswa": "portal_akademik",
            "admin": "dashboard_admin",
        }

        user_data = {
            "id": f"usr-{user_row['id_pengguna']}",
            "name": user_row["nama_lengkap"],
            "email": user_row["email"],
            "nipOrNim": nip_or_nim,
            "role": role,
            "roleLabel": role_labels.get(role, user_row["peran"]),
            "department": dept_name,
            "defaultDashboard": default_dashboards.get(role, "dashboard_admin"),
        }

        print(f"[AUTH-DB] Autentikasi BERHASIL dari database MySQL: {user_data['name']} ({role})")
        return {
            "success": True,
            "status_code": 200,
            "message": f"Login berhasil sebagai {user_data['roleLabel']}",
            "role": role,
            "defaultDashboard": user_data["defaultDashboard"],
            "user": user_data,
            "token": f"siprama-token-{role}-{user_row['id_pengguna']}",
        }

    except pymysql.MySQLError as err:
        print(f"[AUTH-DB-ERROR] Kesalahan koneksi MySQL Laragon: {err}")
        return {
            "success": False,
            "status_code": 503,
            "detail": "Koneksi database MySQL gagal. Pastikan Laragon MySQL aktif di port 3306.",
            "reason": "DB_CONNECTION_ERROR",
        }
    finally:
        if conn:
            conn.close()
