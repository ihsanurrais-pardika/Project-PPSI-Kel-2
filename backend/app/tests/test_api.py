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

from app.main import app, get_store
from app.engine.memory_store import data_store

app.dependency_overrides[get_store] = lambda: data_store
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

    def test_manual_edit_conflict_rejection_and_atomic_swap(self):
        # Generate small valid schedule first
        res_gen = client.post(
            "/api/schedule/generate",
            json={"max_classes": 12, "max_time_seconds": 10.0},
        )
        assert res_gen.status_code == 200
        sched = res_gen.json()["schedule"]
        assert len(sched) >= 2
        item_a = sched[0]
        item_b = next(
            (
                s
                for s in sched[1:]
                if s["class_id"] != item_a["class_id"]
                and (s["day"], s["start_time"], s["room_id"]) != (item_a["day"], item_a["start_time"], item_a["room_id"])
            ),
            sched[1],
        )

        # 1. Non-admin actor must be blocked (403)
        res_forbidden = client.put(
            f"/api/schedule/items/{item_a['class_id']}",
            json={
                "day": item_b["day"],
                "start_time": item_b["start_time"],
                "end_time": item_a["end_time"],
                "room_id": item_b["room_id"],
                "actor_role": "dosen",
            },
        )
        assert res_forbidden.status_code == 403

        # 2. Moving item_a directly onto item_b's occupied room+slot must be rejected (409)
        res_conflict = client.put(
            f"/api/schedule/items/{item_a['class_id']}",
            json={
                "day": item_b["day"],
                "start_time": item_b["start_time"],
                "room_id": item_b["room_id"],
                "actor_role": "admin",
            },
        )
        assert res_conflict.status_code == 409
        detail = res_conflict.json()["detail"]
        assert "conflicts" in detail and len(detail["conflicts"]) >= 1

        # 3. Moving to a room whose capacity is smaller than enrolled students must fail (409)
        oversized = next((s for s in sched if s["size"] > 45), None)
        small_room = next((r for r in client.get("/api/rooms").json() if r["capacity"] == 45), None)
        if oversized and small_room:
            res_cap = client.put(
                f"/api/schedule/items/{oversized['class_id']}",
                json={
                    "day": "Jumat",
                    "start_time": "16:00",
                    "room_id": small_room["id"],
                    "actor_role": "admin",
                },
            )
            assert res_cap.status_code == 409

        # 4. Atomic swap endpoint: non-admin rejected (403)
        res_swap_forb = client.post(
            "/api/schedule/swap",
            json={
                "jadwal_id_a": item_a["class_id"],
                "jadwal_id_b": item_b["class_id"],
                "actor_role": "mahasiswa",
            },
        )
        assert res_swap_forb.status_code == 403

        # 5. Find a conflict-free swappable pair among scheduled classes (same duration, safe rooms)
        swapped_ok = False
        for i, cand_a in enumerate(sched):
            for cand_b in sched[i + 1 :]:
                if cand_a["duration"] != cand_b["duration"]:
                    continue
                if cand_a["size"] > cand_b["room_capacity"] or cand_b["size"] > cand_a["room_capacity"]:
                    continue
                res_swap = client.post(
                    "/api/schedule/swap",
                    json={
                        "jadwal_id_a": cand_a["class_id"],
                        "jadwal_id_b": cand_b["class_id"],
                        "reason": "Penyesuaian ruang uji API",
                        "actor_role": "admin",
                    },
                )
                if res_swap.status_code == 200:
                    payload = res_swap.json()
                    assert payload["a"]["room_id"] == cand_b["room_id"]
                    assert payload["b"]["room_id"] == cand_a["room_id"]
                    assert payload["a"]["day"] == cand_b["day"]
                    assert payload["b"]["day"] == cand_a["day"]
                    swapped_ok = True
                    break
            if swapped_ok:
                break
        assert swapped_ok is True

    def test_validation_scan_resolve_and_autofix(self):
        # Generate small schedule in memory store
        res_gen = client.post(
            "/api/schedule/generate",
            json={"max_classes": 12, "max_time_seconds": 10.0},
        )
        assert res_gen.status_code == 200

        # 1. Scan initial validation report
        res_val = client.get("/api/schedule/validation")
        assert res_val.status_code == 200
        report = res_val.json()
        assert "summary" in report and "issues" in report
        assert report["summary"]["scheduled_classes"] == 12

        # 2. Simulate an actual overlap conflict on the in-memory schedule to verify detection & auto-fix
        sched_items = data_store.latest_schedule_result.schedule
        sched_items[0].day = "Senin"
        sched_items[0].start_time = "10:00"
        sched_items[0].end_time = "11:40"
        sched_items[1].day = "Senin"
        sched_items[1].start_time = "11:10"
        sched_items[1].end_time = "12:50"
        sched_items[1].room_id = sched_items[0].room_id
        sched_items[1].room_name = sched_items[0].room_name

        res_scan = client.post("/api/schedule/validation/scan")
        assert res_scan.status_code == 200
        scan_data = res_scan.json()
        assert scan_data["summary"]["hard_conflicts_count"] >= 1
        hard_issue = next((i for i in scan_data["issues"] if i["severity"] == "hard"), None)
        assert hard_issue is not None
        assert len(hard_issue["suggestions"]) >= 1

        # 3. Attempting to ignore a hard conflict must return 400
        res_ignore_hard = client.post(
            f"/api/schedule/validation/{hard_issue['conflict_id']}/resolve",
            json={"decision": "TOLERANSI_DITERIMA", "actor_role": "admin"},
        )
        assert res_ignore_hard.status_code == 400

        # 4. Non-admin auto-fix must be blocked (403)
        res_forb = client.post(
            "/api/schedule/validation/auto-fix",
            json={"actor_role": "dosen"},
        )
        assert res_forb.status_code == 403

        # 5. Admin auto-fix must eliminate hard conflict and drop count to 0
        res_fix = client.post(
            "/api/schedule/validation/auto-fix",
            json={"actor_role": "admin"},
        )
        assert res_fix.status_code == 200
        fixed_report = res_fix.json()
        assert fixed_report["fixed_count"] >= 1
        assert fixed_report["summary"]["hard_conflicts_count"] == 0
