"""
Test Suite untuk Modul 3 Issue #64:
Backend Perhitungan Utilisasi dan Statistik Pemakaian Ruang.

Memverifikasi endpoint GET /api/rooms/utilization dan GET /api/rooms/statistics
menggunakan InMemoryDataStore (tanpa koneksi MySQL).
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

# Override dependency agar pakai InMemoryDataStore (bukan MySQL)
app.dependency_overrides[get_store] = lambda: data_store
client = TestClient(app)


class TestRoomUtilizationEndpoint:
    """Test GET /api/rooms/utilization"""

    def setup_method(self):
        data_store.reset_to_csv()

    def test_utilization_returns_200(self):
        """Endpoint harus mengembalikan status 200."""
        response = client.get("/api/rooms/utilization")
        assert response.status_code == 200

    def test_utilization_has_required_fields(self):
        """Response harus memiliki summary, buildings, peak_hours, dan rooms."""
        response = client.get("/api/rooms/utilization")
        data = response.json()
        assert "summary" in data
        assert "buildings" in data
        assert "peak_hours" in data
        assert "rooms" in data

    def test_utilization_summary_structure(self):
        """Summary harus memiliki semua field statistik yang dibutuhkan."""
        response = client.get("/api/rooms/utilization")
        summary = response.json()["summary"]

        required_keys = [
            "total_rooms",
            "total_capacity",
            "total_slots_available",
            "total_occupied_slots",
            "total_free_slots",
            "average_utilization_percentage",
            "overload_classes_count",
            "seat_fill_rate_percentage",
            "busiest_day",
            "busiest_time",
            "quietest_day",
            "quietest_time",
        ]
        for key in required_keys:
            assert key in summary, f"Missing key: {key}"

    def test_utilization_rooms_not_empty(self):
        """Harus ada room data meskipun belum ada jadwal."""
        response = client.get("/api/rooms/utilization")
        rooms = response.json()["rooms"]
        assert len(rooms) > 0, "Rooms list should not be empty (CSV has 16 rooms)"

    def test_utilization_room_item_structure(self):
        """Setiap room item harus memiliki field yang sesuai RoomUtilizationItem."""
        response = client.get("/api/rooms/utilization")
        rooms = response.json()["rooms"]
        room = rooms[0]

        required_keys = [
            "room_id", "room_code", "room_name", "room_type",
            "building", "floor", "capacity",
            "total_slots_available", "occupied_slots_count",
            "free_slots_count", "utilization_percentage",
            "is_overload", "slots",
        ]
        for key in required_keys:
            assert key in room, f"Missing key in room item: {key}"

    def test_utilization_zero_when_no_schedule(self):
        """Tanpa jadwal aktif, utilisasi harus 0%."""
        response = client.get("/api/rooms/utilization")
        summary = response.json()["summary"]
        assert summary["average_utilization_percentage"] == 0.0
        assert summary["total_occupied_slots"] == 0
        assert summary["overload_classes_count"] == 0

    def test_utilization_free_equals_total_when_no_schedule(self):
        """Tanpa jadwal, total free slots harus sama dengan total available."""
        response = client.get("/api/rooms/utilization")
        summary = response.json()["summary"]
        assert summary["total_free_slots"] == summary["total_slots_available"]

    def test_utilization_filter_by_day(self):
        """Filter hari Senin harus mengurangi total_slots_available (hanya 1 hari)."""
        resp_all = client.get("/api/rooms/utilization")
        resp_senin = client.get("/api/rooms/utilization?day=Senin")

        all_slots = resp_all.json()["summary"]["total_slots_available"]
        senin_slots = resp_senin.json()["summary"]["total_slots_available"]

        # 1 hari (Senin) punya lebih sedikit slot daripada semua 5 hari
        assert senin_slots < all_slots
        # 1 hari = total_rooms * 6 slots
        total_rooms = resp_senin.json()["summary"]["total_rooms"]
        assert senin_slots == total_rooms * 6

    def test_utilization_filter_by_building(self):
        """Filter gedung H harus hanya mengembalikan ruang di gedung H."""
        response = client.get("/api/rooms/utilization?building=H")
        rooms = response.json()["rooms"]

        for r in rooms:
            # Building bisa 'Gedung H' atau 'H'
            assert "H" in r["building"].upper(), f"Room {r['room_code']} has building {r['building']}"

    def test_utilization_slots_per_room(self):
        """Setiap room harus memiliki slots sesuai jumlah hari * 6 slot."""
        response = client.get("/api/rooms/utilization")
        rooms = response.json()["rooms"]
        for r in rooms:
            # Default: 5 hari * 6 slot = 30 slots
            assert len(r["slots"]) == 30, f"Room {r['room_code']} has {len(r['slots'])} slots, expected 30"

    def test_utilization_slots_per_room_filtered_day(self):
        """Dengan filter 1 hari, setiap room harus punya 6 slots."""
        response = client.get("/api/rooms/utilization?day=Rabu")
        rooms = response.json()["rooms"]
        for r in rooms:
            assert len(r["slots"]) == 6, f"Room {r['room_code']} has {len(r['slots'])} slots for single day"


class TestRoomStatisticsEndpoint:
    """Test GET /api/rooms/statistics"""

    def setup_method(self):
        data_store.reset_to_csv()

    def test_statistics_returns_200(self):
        """Endpoint harus mengembalikan status 200."""
        response = client.get("/api/rooms/statistics")
        assert response.status_code == 200

    def test_statistics_has_summary_buildings_peakhours(self):
        """Response harus memiliki summary, buildings, dan peak_hours."""
        response = client.get("/api/rooms/statistics")
        data = response.json()
        assert "summary" in data
        assert "buildings" in data
        assert "peak_hours" in data

    def test_statistics_no_rooms_field(self):
        """Endpoint /statistics tidak mengembalikan detail rooms (ringkas saja)."""
        response = client.get("/api/rooms/statistics")
        data = response.json()
        assert "rooms" not in data

    def test_statistics_buildings_structure(self):
        """Buildings harus berisi daftar statistik per gedung."""
        response = client.get("/api/rooms/statistics")
        buildings = response.json()["buildings"]
        assert isinstance(buildings, list)
        if len(buildings) > 0:
            b = buildings[0]
            assert "building" in b
            assert "total_rooms" in b
            assert "average_utilization_percentage" in b

    def test_statistics_filter_day(self):
        """Filter hari Jumat harus berhasil di endpoint statistics."""
        response = client.get("/api/rooms/statistics?day=Jumat")
        assert response.status_code == 200
        summary = response.json()["summary"]
        assert summary["total_rooms"] > 0


class TestRoomUtilizationWithSchedule:
    """Test utilisasi setelah solver menghasilkan jadwal (jika tersedia)."""

    def setup_method(self):
        data_store.reset_to_csv()

    def test_utilization_increases_after_generate(self):
        """Jika ada jadwal aktif di store, utilisasi, overload, dan peak hour terhitung akurat."""
        from app.schemas.schedule_dto import SolverResultOutput, ScheduledClassOutput, PenaltyBreakdown

        data_store.latest_schedule_result = SolverResultOutput(
            status="OPTIMAL",
            wall_time_seconds=0.5,
            total_classes=2,
            scheduled_classes=2,
            penalty_breakdown=PenaltyBreakdown(),
            schedule=[
                ScheduledClassOutput(
                    class_id="c-1",
                    course_code="SI-101",
                    course_name="Dasar Sistem Informasi",
                    class_label="A",
                    department="SI",
                    semester=1,
                    size=45,
                    duration=1,
                    sks=2,
                    room_id="r-101",
                    room_name="G-101 (Teori)",
                    room_capacity=60,
                    room_type="Teori",
                    floor=1,
                    building="FTI Utama",
                    day="Senin",
                    start_slot_index=0,
                    end_slot_index=0,
                    start_time="07:30",
                    end_time="09:10",
                    slot_ids=["slot_sen_1"],
                    lecturer_names=["Dosen A"],
                    group_names=["SI-1A"],
                ),
                ScheduledClassOutput(
                    class_id="c-2",
                    course_code="SI-305",
                    course_name="Analisis Proses",
                    class_label="A",
                    department="SI",
                    semester=5,
                    size=55,  # Overload: 55 > 50 (kapasitas r-203)
                    duration=1,
                    sks=2,
                    room_id="r-203",
                    room_name="G-203 (Teori Multimedia)",
                    room_capacity=50,
                    room_type="Teori",
                    floor=2,
                    building="FTI Utama",
                    day="Senin",
                    start_slot_index=4,
                    end_slot_index=4,
                    start_time="13:30",
                    end_time="15:10",
                    slot_ids=["slot_sen_5"],
                    lecturer_names=["Dosen B"],
                    group_names=["SI-5A"],
                ),
            ],
        )

        resp_util = client.get("/api/rooms/utilization")
        assert resp_util.status_code == 200
        summary = resp_util.json()["summary"]
        assert summary["average_utilization_percentage"] > 0
        assert summary["total_occupied_slots"] == 2
        assert summary["overload_classes_count"] == 1
        assert summary["busiest_day"] == "Senin"

        rooms = {r["room_id"]: r for r in resp_util.json()["rooms"]}
        assert rooms["r-101"]["occupied_slots_count"] == 1
        assert rooms["r-101"]["is_overload"] is False
        assert rooms["r-203"]["occupied_slots_count"] == 1
        assert rooms["r-203"]["is_overload"] is True

    def test_consistency_summary_and_rooms(self):
        """Summary total_occupied_slots harus sesuai dengan jumlah occupied slots di rooms."""
        response = client.get("/api/rooms/utilization")
        data = response.json()
        summary = data["summary"]
        rooms = data["rooms"]

        # Hitung occupied dari per-room data
        occupied_from_rooms = sum(r["occupied_slots_count"] for r in rooms)
        assert summary["total_occupied_slots"] == occupied_from_rooms

    def test_consistency_free_plus_occupied_equals_total(self):
        """free_slots + occupied_slots harus = total_slots_available."""
        response = client.get("/api/rooms/utilization")
        summary = response.json()["summary"]
        assert summary["total_free_slots"] + summary["total_occupied_slots"] == summary["total_slots_available"]
