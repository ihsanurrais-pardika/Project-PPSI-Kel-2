"""
Test Suite untuk API FastAPI Backend SIPRAMA FTI UNAND.
Memverifikasi kestabilan seluruh endpoint RESTful untuk akses browser.
"""

import sys
import os
import pytest
from fastapi.testclient import TestClient

# Pastikan backend ada di path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app
from app.engine.memory_store import data_store

client = TestClient(app)


class TestSchedulingAPI:
    def setup_method(self):
        # Reset memory store ke state CSV asli sebelum setiap test
        data_store.reset_to_csv()

    def test_health_check(self):
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["engine"] == "CP-SAT"
        assert data["total_classes"] == 196
        assert data["total_rooms"] == 16
        assert data["total_slots"] == 30

    def test_list_classes_and_filtering(self):
        # 1. Ambil semua kelas
        response = client.get("/api/classes")
        assert response.status_code == 200
        classes = response.json()
        assert len(classes) == 196

        # 2. Filter per Prodi TK
        res_tk = client.get("/api/classes?department=TK")
        assert res_tk.status_code == 200
        tk_classes = res_tk.json()
        assert len(tk_classes) > 0
        assert all(c["department"] == "TK" for c in tk_classes)

        # 3. Filter per Semester
        res_sem1 = client.get("/api/classes?semester=1")
        assert res_sem1.status_code == 200
        assert all(c["semester"] == 1 for c in res_sem1.json())

        # 4. Search query
        res_search = client.get("/api/classes?search=Fisika")
        assert res_search.status_code == 200
        assert any("Fisika" in c["name"] for c in res_search.json())

    def test_adjust_class_prd_f14_f15(self):
        # Ambil salah satu kelas
        target_id = "SCE61101-A"
        res_before = client.get(f"/api/classes/{target_id}")
        assert res_before.status_code == 200
        orig = res_before.json()

        # Lakukan penyesuaian (F-14): ubah kapasitas dari 50 ke 35 dan ubah tipe ruang
        adjust_payload = {
            "enrolled_count": 35,
            "sks": 3,
            "room_type_needed": "Lab",
        }
        res_adjust = client.put(f"/api/classes/{target_id}", json=adjust_payload)
        assert res_adjust.status_code == 200
        updated = res_adjust.json()
        assert updated["enrolled_count"] == 35
        assert updated["sks"] == 3
        assert updated["room_type_needed"] == "Lab"

        # Verifikasi kembali via GET
        res_verify = client.get(f"/api/classes/{target_id}")
        assert res_verify.json()["enrolled_count"] == 35

    def test_delete_and_reset_classes(self):
        target_id = "SCE61101-A"
        # Hapus kelas
        res_del = client.delete(f"/api/classes/{target_id}")
        assert res_del.status_code == 200

        # Verifikasi sudah terhapus
        res_get = client.get(f"/api/classes/{target_id}")
        assert res_get.status_code == 404

        # Reset dari CSV
        res_reset = client.post("/api/classes/reset-csv")
        assert res_reset.status_code == 200
        assert res_reset.json()["total_classes"] == 196

        # Verifikasi kelas kembali ada
        res_back = client.get(f"/api/classes/{target_id}")
        assert res_back.status_code == 200

    def test_rooms_and_slots_endpoints(self):
        res_rooms = client.get("/api/rooms")
        assert res_rooms.status_code == 200
        rooms = res_rooms.json()
        assert len(rooms) == 16
        assert any("r-101" == r["id"] for r in rooms)

        res_slots = client.get("/api/slots")
        assert res_slots.status_code == 200
        slots = res_slots.json()
        assert len(slots) == 30

    def test_schedule_generation_cpsat(self):
        # Jalankan CP-SAT untuk batch 15 kelas
        payload = {
            "max_classes": 15,
            "max_time_seconds": 10.0,
            "w_gap": 10,
            "w_pref": 4,
            "w_spread": 3,
            "w_waste": 1,
        }
        res_gen = client.post("/api/schedule/generate", json=payload)
        assert res_gen.status_code == 200
        result = res_gen.json()

        assert result["status"] in ("OPTIMAL", "FEASIBLE")
        assert result["scheduled_classes"] == 15
        assert len(result["schedule"]) == 15
        assert result["wall_time_seconds"] > 0
        assert result["penalty_breakdown"] is not None

        # Verifikasi GET /api/schedule/latest
        res_latest = client.get("/api/schedule/latest")
        assert res_latest.status_code == 200
        latest = res_latest.json()
        assert latest["status"] in ("OPTIMAL", "FEASIBLE")
        assert latest["scheduled_classes"] == 15

    def test_export_classes_csv(self):
        # 1. Export all
        res_all = client.get("/api/classes/export-csv")
        assert res_all.status_code == 200
        assert "text/csv" in res_all.headers["content-type"]
        assert "classes_fti_all_2026.csv" in res_all.headers["content-disposition"]
        lines = res_all.text.strip().split("\n")
        assert len(lines) == 197  # Header + 196 rows

        # 2. Export per Prodi TK
        res_tk = client.get("/api/classes/export-csv?department=TK")
        assert res_tk.status_code == 200
        tk_lines = res_tk.text.strip().split("\n")
        assert len(tk_lines) == 69  # Header + 68 rows

        # 3. Export pure only (CCE/ECS/SCE)
        res_tk_pure = client.get("/api/classes/export-csv?department=TK&pure_only=true")
        assert res_tk_pure.status_code == 200
        pure_lines = res_tk_pure.text.strip().split("\n")
        assert len(pure_lines) == 62  # Header + 61 rows
