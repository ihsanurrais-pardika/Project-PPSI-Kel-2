# Backend API & Solver CP-SAT — SIPRAMA FTI UNAND

**Engine:** FastAPI + PyMySQL (`siprama_db`) + Google OR-Tools CP-SAT  
**Port Default:** `8000` (`http://127.0.0.1:8000`)

---

## 1. Struktur Folder

```text
backend/
├── requirements.txt        # Daftar dependensi Python
├── README.md               # Panduan teknis backend
├── scripts/
│   ├── seed_db.py          # Seeding prodi & akun pengguna MySQL
│   └── run_solver.py       # Simulasi & benchmark CP-SAT via terminal
└── app/
    ├── main.py             # Entry point FastAPI tunggal
    ├── dependencies.py     # Dependency injection (`get_store`)
    ├── core/config.py      # Pembacaan `.env` root & konfigurasi MySQL
    ├── db/                 # Koneksi MySQL (`connection.py`), `mysql_store.py`, & `memory_store.py`
    ├── auth/               # Autentikasi MySQL (`service.py`)
    ├── models/             # Model domain CP-SAT (`domain.py`)
    ├── schemas/            # Pydantic request & DTO schemas
    ├── engine/             # Solver CP-SAT, diagnostik pra-jadwal, & validasi konflik
    ├── routes/             # Endpoint terpisah per domain (`health`, `auth`, `courses`, `rooms`, `schedule`, `validation`)
    └── tests/              # Suite unit & integration test (`pytest`)
```

---

## 2. Instalasi Dependensi

```powershell
pip install -r backend/requirements.txt
```

---

## 3. Menjalankan Server Backend

Masuk ke folder `backend/`, lalu jalankan `uvicorn`:

```powershell
cd backend
uvicorn app.main:app --reload --port 8000
```

Swagger Docs tersedia di `http://127.0.0.1:8000/docs`.

---

## 4. Menjalankan Script CLI & Pengujian

Dari root proyek atau dari dalam `backend/`:

```powershell
# Jalankan unit & API tests
python -m pytest backend/app/tests/ -q

# Seeding akun & prodi awal ke MySQL
python backend/scripts/seed_db.py

# Benchmark / simulasi solver CP-SAT via terminal
python backend/scripts/run_solver.py
```
