"""
Manajemen Koneksi Database MySQL Laragon/XAMPP (siprama_db) untuk SIPRAMA FTI UNAND.
"""

import pymysql
import pymysql.cursors

from app.core.config import DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME


def get_db_connection():
    """Membuka koneksi PyMySQL ke database siprama_db."""
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
