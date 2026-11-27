"""
Dependency providers terpusat untuk FastAPI routes.
Memungkinkan override store saat pengujian (pytest) tanpa circular import.
"""

from app.db.mysql_store import mysql_store


def get_store():
    """Dependency default ke MySQLDataStore (dapat di-override di unit test)."""
    return mysql_store
