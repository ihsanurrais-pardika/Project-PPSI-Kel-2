"""
Script Seeding Database SIPRAMA FTI UNAND
Memasukkan Data Master Program Studi dan Pengguna Resmi ke MySQL Laragon (siprama_db)
"""

import pymysql
import bcrypt
from database import get_db_connection

PROGRAM_STUDI_DATA = [
    {"kode": "FTI", "nama": "Fakultas Teknologi Informasi", "departemen": "Fakultas Teknologi Informasi"},
    {"kode": "SI", "nama": "Sistem Informasi", "departemen": "Departemen Sistem Informasi"},
    {"kode": "IF", "nama": "Informatika", "departemen": "Departemen Informatika"},
    {"kode": "TK", "nama": "Teknik Komputer", "departemen": "Departemen Teknik Komputer"},
]

USERS_SEED_DATA = [
    {
        "kode_prodi": "FTI",
        "username": "wadek1",
        "email": "Wadek1@it.unand.ac.id",
        "password": "wadek1ftiunand",
        "nama": "Dr. Eng. Rahmadi, M.T.",
        "peran": "WADEK1",
        "nip_nidn": "19750312 200212 1 002",
        "jabatan": "Wakil Dekan I (Bidang Akademik)",
    },
    {
        "kode_prodi": "SI",
        "username": "kadepsi",
        "email": "kadepsi@it.unand.ac.id",
        "password": "kadepsiftiunand",
        "nama": "Ricky Akbar, M.Kom.",
        "peran": "KADEP_SI",
        "nip_nidn": "19840915 200812 1 002",
        "jabatan": "Ketua Departemen Sistem Informasi",
    },
    {
        "kode_prodi": "IF",
        "username": "kadepif",
        "email": "kadepif@it.unand.ac.id",
        "password": "kadepifftiunand",
        "nama": "Dr. Ir. Wahyudi, S.T., M.T.",
        "peran": "KADEP_IF",
        "nip_nidn": "19760724 200212 1 001",
        "jabatan": "Ketua Departemen Informatika",
    },
    {
        "kode_prodi": "TK",
        "username": "kadeptekkom",
        "email": "kadeptekkom@it.unand.ac.id",
        "password": "kadeptekkomftiunand",
        "nama": "Dr. Eng. Tati Erlina, M.IT.",
        "peran": "KADEP_TK",
        "nip_nidn": "19790412 200604 2 001",
        "jabatan": "Ketua Departemen Teknik Komputer",
    },
    {
        "kode_prodi": "SI",
        "username": "dosen",
        "email": "dosen@it.unand.ac.id",
        "password": "dosenftiunand",
        "nama": "Dr. Eng. Rahmad, M.T.",
        "peran": "DOSEN",
        "nip_nidn": "19820412 200812 1 003",
        "jabatan": "Dosen Pengampu",
    },
    {
        "kode_prodi": "SI",
        "username": "ihsan",
        "email": "ihsan@gmail.com",
        "password": "ihsan123",
        "nama": "Ihsan",
        "peran": "MAHASISWA",
        "nim": "2211522001",
        "tahun_masuk": 2022,
    },
    {
        "kode_prodi": "FTI",
        "username": "admin",
        "email": "admin@it.unand.ac.id",
        "password": "adminftiunand",
        "nama": "Dr. Eng. Ir. Administrator",
        "peran": "SUPERADMIN",
        "nip_nidn": "19850123 201012 1 001",
        "jabatan": "Administrator Sistem FTI",
    },
]


def seed_database():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            print("🌱 Memulai proses Seeding Data ke MySQL siprama_db...")

            # 1. Seed Program Studi
            prodi_map = {}
            for p in PROGRAM_STUDI_DATA:
                cursor.execute(
                    """
                    INSERT INTO program_studi (kode_prodi, nama_prodi, nama_departemen)
                    VALUES (%s, %s, %s)
                    ON DUPLICATE KEY UPDATE 
                        nama_prodi = VALUES(nama_prodi),
                        nama_departemen = VALUES(nama_departemen);
                    """,
                    (p["kode"], p["nama"], p["departemen"]),
                )
                cursor.execute("SELECT id_prodi FROM program_studi WHERE kode_prodi = %s;", (p["kode"],))
                prodi_map[p["kode"]] = cursor.fetchone()["id_prodi"]
                print(f"  ✓ Program Studi terdaftar: {p['nama']} (ID: {prodi_map[p['kode']]})")

            # 2. Seed Pengguna
            for u in USERS_SEED_DATA:
                prodi_id = prodi_map.get(u["kode_prodi"], 1)
                pw_hash = bcrypt.hashpw(u["password"].encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

                cursor.execute(
                    """
                    INSERT INTO pengguna (id_prodi, username, password_hash, nama_lengkap, email, peran, status_aktif)
                    VALUES (%s, %s, %s, %s, %s, %s, 1)
                    ON DUPLICATE KEY UPDATE
                        id_prodi = VALUES(id_prodi),
                        password_hash = VALUES(password_hash),
                        nama_lengkap = VALUES(nama_lengkap),
                        peran = VALUES(peran),
                        status_aktif = 1;
                    """,
                    (prodi_id, u["username"], pw_hash, u["nama"], u["email"], u["peran"]),
                )

                cursor.execute("SELECT id_pengguna FROM pengguna WHERE email = %s;", (u["email"],))
                user_id = cursor.fetchone()["id_pengguna"]

                # Jika dosen, daftarkan di tabel dosen
                if "nip_nidn" in u:
                    cursor.execute(
                        """
                        INSERT INTO dosen (id_pengguna, id_prodi, nidn, jabatan_struktural, maks_sks_harian)
                        VALUES (%s, %s, %s, %s, 12)
                        ON DUPLICATE KEY UPDATE
                            nidn = VALUES(nidn),
                            jabatan_struktural = VALUES(jabatan_struktural);
                        """,
                        (user_id, prodi_id, u["nip_nidn"], u.get("jabatan")),
                    )

                # Jika mahasiswa, daftarkan di tabel mahasiswa
                if "nim" in u:
                    cursor.execute(
                        """
                        INSERT INTO mahasiswa (id_pengguna, id_prodi, nim, tahun_masuk)
                        VALUES (%s, %s, %s, %s)
                        ON DUPLICATE KEY UPDATE
                            nim = VALUES(nim),
                            tahun_masuk = VALUES(tahun_masuk);
                        """,
                        (user_id, prodi_id, u["nim"], u.get("tahun_masuk", 2022)),
                    )

                print(f"  ✓ User terdaftar di database: {u['email']} -> {u['peran']} (PW: {u['password']})")

            conn.commit()
            print("✅ Seeding selesai! Seluruh akun pengguna telah tersimpan di database MySQL Laragon.")

    except Exception as e:
        conn.rollback()
        print(f"❌ Terjadi kesalahan saat seeding: {e}")
        raise e
    finally:
        conn.close()


if __name__ == "__main__":
    seed_database()
