"""
Konfigurasi Terpusat Backend SIPRAMA FTI UNAND.
Menyediakan path proyek (ROOT_DIR, BACKEND_DIR) serta membaca variabel .env dan konfigurasi MySQL.
"""

import os
import re
from pathlib import Path

# backend/app/core/config.py -> parents[2] = backend/, parents[3] = root proyek
BACKEND_DIR: Path = Path(__file__).resolve().parents[2]
ROOT_DIR: Path = Path(__file__).resolve().parents[3]
DEFAULT_CSV_FILENAME: str = "classes_fti_ganjil_2026-v2.csv"


def load_root_env() -> None:
    """Memuat variabel dari file .env di root proyek jika belum ada di environment."""
    env_path = ROOT_DIR / ".env"
    if not env_path.exists():
        return
    try:
        with env_path.open("r", encoding="utf-8") as f:
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


load_root_env()

DB_HOST: str = os.environ.get("DB_HOST", "127.0.0.1")
DB_PORT: int = int(os.environ.get("DB_PORT", 3306))
DB_USER: str = os.environ.get("DB_USER", "root")
DB_PASSWORD: str = os.environ.get("DB_PASSWORD", "")
DB_NAME: str = os.environ.get("DB_NAME", "siprama_db")

DATABASE_URL: str = os.environ.get("DATABASE_URL", "")
if DATABASE_URL and "mysql://" in DATABASE_URL:
    try:
        pattern = r"mysql://([^:]*)(?::([^@]*))?@([^:/]+)(?::(\d+))?/([^?]+)"
        match = re.match(pattern, DATABASE_URL)
        if match:
            DB_USER = match.group(1) or "root"
            DB_PASSWORD = match.group(2) or ""
            DB_HOST = match.group(3) or "127.0.0.1"
            DB_PORT = int(match.group(4) or 3306)
            DB_NAME = match.group(5) or "siprama_db"
    except Exception as exc:
        print(f"[DB-CONFIG] Gagal parsing DATABASE_URL, menggunakan default: {exc}")
