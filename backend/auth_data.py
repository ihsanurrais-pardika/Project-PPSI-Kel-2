"""
Data Pengguna Resmi SIPRAMA FTI UNAND
Digunakan untuk autentikasi backend login multi-role
"""

USERS_DB = [
    {
        "id": "usr-wadek1",
        "email": "Wadek1@it.unand.ac.id",
        "nipOrNim": "19750312 200212 1 002",
        "password": "wadek1ftiunand",
        "name": "Dr. Eng. Rahmadi, M.T.",
        "role": "wadek1",
        "roleLabel": "Wakil Dekan I (Bidang Akademik)",
        "department": "Fakultas Teknologi Informasi",
        "defaultDashboard": "approval_wadek",
    },
    {
        "id": "usr-kadep-si",
        "email": "kadepsi@it.unand.ac.id",
        "nipOrNim": "19840915 200812 1 002",
        "password": "kadepsiftiunand",
        "name": "Ricky Akbar, M.Kom.",
        "role": "departemen_si",
        "roleLabel": "Ketua Departemen Sistem Informasi",
        "department": "Departemen Sistem Informasi",
        "defaultDashboard": "kebutuhan_departemen",
    },
    {
        "id": "usr-kadep-if",
        "email": "kadepif@it.unand.ac.id",
        "nipOrNim": "19760724 200212 1 001",
        "password": "kadepifftiunand",
        "name": "Dr. Ir. Wahyudi, S.T., M.T.",
        "role": "departemen_if",
        "roleLabel": "Ketua Departemen Informatika",
        "department": "Departemen Informatika",
        "defaultDashboard": "kebutuhan_departemen",
    },
    {
        "id": "usr-kadep-tekkom",
        "email": "kadeptekkom@it.unand.ac.id",
        "nipOrNim": "19790412 200604 2 001",
        "password": "kadeptekkomftiunand",
        "name": "Dr. Eng. Tati Erlina, M.IT.",
        "role": "departemen_tk",
        "roleLabel": "Ketua Departemen Teknik Komputer",
        "department": "Departemen Teknik Komputer",
        "defaultDashboard": "kebutuhan_departemen",
    },
    {
        "id": "usr-dosen",
        "email": "dosen@it.unand.ac.id",
        "nipOrNim": "19820412 200812 1 003",
        "password": "dosenftiunand",
        "name": "Dr. Eng. Rahmad, M.T.",
        "role": "dosen",
        "roleLabel": "Dosen Pengampu",
        "department": "Departemen Sistem Informasi",
        "defaultDashboard": "portal_akademik",
    },
    {
        "id": "usr-mahasiswa",
        "email": "ihsan@gmail.com",
        "nipOrNim": "2211522001",
        "password": "ihsan123",
        "name": "Ihsan",
        "role": "mahasiswa",
        "roleLabel": "Mahasiswa Aktif",
        "department": "Sistem Informasi (BP 22)",
        "defaultDashboard": "portal_akademik",
    },
    # Admin fallback untuk kebutuhan pemeliharaan sistem
    {
        "id": "usr-admin",
        "email": "admin@it.unand.ac.id",
        "nipOrNim": "12345678",
        "password": "adminftiunand",
        "name": "Admin",
        "role": "admin",
        "roleLabel": "Administrator Sistem",
        "department": "Konsol Operasional Akademik FTI",
        "defaultDashboard": "dashboard_admin",
    },
    {
        "id": "usr-alghifari",
        "email": "alghifari@it.unand.ac.id",
        "nipOrNim": "19850123 201012 1 001",
        "password": "SecretKey2024!",
        "name": "Dr. Eng. Ir. Administrator",
        "role": "admin",
        "roleLabel": "Administrator Sistem",
        "department": "Konsol Operasional Akademik FTI",
        "defaultDashboard": "dashboard_admin",
    },
]


def authenticate_user(identifier: str, password: str):
    """
    Mencocokkan kredensial login berdasarkan Email atau NIP/NIM (case-insensitive).
    Mengembalikan data user jika valid, atau None jika tidak cocok.
    """
    clean_id = (identifier or "").strip().lower()
    clean_pw = (password or "").strip()

    for user in USERS_DB:
        email_match = user["email"].lower() == clean_id
        nip_match = user["nipOrNim"].replace(" ", "").lower() == clean_id.replace(" ", "")
        
        if (email_match or nip_match) and user["password"] == clean_pw:
            # Kembalikan salinan tanpa password
            user_data = dict(user)
            del user_data["password"]
            return user_data

    return None
