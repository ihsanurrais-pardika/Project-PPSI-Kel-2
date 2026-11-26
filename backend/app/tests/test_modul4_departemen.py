"""
Unit & API Tests untuk Modul 4 (Kebutuhan Departemen: #70, #71, #72) - SIPRAMA FTI UNAND.
Menguji penyimpanan & validasi usulan MK, penyesuaian jumlah kelas & pembatalan kuota minimum,
log perubahan, pengecualian kelas batal di CP-SAT, serta ekspor Excel (.xlsx) dan PDF (.pdf).
"""

import io
import os
import sys
import openpyxl
from fastapi.testclient import TestClient

backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app, get_store
from app.engine.memory_store import data_store

app.dependency_overrides[get_store] = lambda: data_store
client = TestClient(app)


class TestModul4Departemen:
    def setup_method(self):
        data_store.reset_to_csv()

    def test_lecturers_and_active_semester_endpoints(self):
        res_sem = client.get("/api/semester/active")
        assert res_sem.status_code == 200
        sem = res_sem.json()
        assert sem["kuota_minimum_kelas"] == 15
        assert "semester_label" in sem

        res_lec = client.get("/api/lecturers?department=SI")
        assert res_lec.status_code == 200
        lecs = res_lec.json()
        assert len(lecs) > 0
        assert all(l["department"] == "SI" for l in lecs)

    def test_create_offering_validation_and_multi_rombel(self):
        # 1. Validasi SKS teori + praktik tidak cocok -> 400
        bad_sks = client.post(
            "/api/departemen/offerings",
            json={
                "course_code": "DSI99901",
                "name": "Uji Validasi SKS",
                "department": "SI",
                "semester": 5,
                "sks": 3,
                "sks_teori": 1,
                "sks_praktik": 1,
                "primary_lecturer_name": "Ricky Akbar, M.Kom.",
                "classes": [{"class_label": "A", "enrolled_count": 35}],
            },
        )
        assert bad_sks.status_code == 400

        # 2. Validasi label kelas duplikat -> 400
        bad_dup = client.post(
            "/api/departemen/offerings",
            json={
                "course_code": "DSI99901",
                "name": "Uji Duplikat",
                "department": "SI",
                "semester": 5,
                "sks": 3,
                "sks_teori": 2,
                "sks_praktik": 1,
                "primary_lecturer_name": "Ricky Akbar, M.Kom.",
                "classes": [
                    {"class_label": "A", "enrolled_count": 35},
                    {"class_label": "A", "enrolled_count": 30},
                ],
            },
        )
        assert bad_dup.status_code == 400

        # 3. Simpan usulan valid 2 rombel (1 di bawah kuota minimum 15) + dosen tandem
        ok_res = client.post(
            "/api/departemen/offerings",
            json={
                "course_code": "DSI99901",
                "name": "Analisis Sistem Cerdas",
                "department": "SI",
                "semester": 5,
                "sks": 3,
                "sks_teori": 2,
                "sks_praktik": 1,
                "is_mandatory": False,
                "primary_lecturer_name": "Ricky Akbar, M.Kom.",
                "tandem_lecturer_names": ["Dr. Eng. Rahmad, M.T."],
                "classes": [
                    {"class_label": "A", "enrolled_count": 38},
                    {"class_label": "B", "enrolled_count": 10},
                ],
                "preferred_days": ["Senin", "Rabu"],
                "preferred_time_slot": "Sesi Pagi",
                "avoid_friday": True,
                "actor_email": "kadepsi@it.unand.ac.id",
            },
        )
        assert ok_res.status_code == 201
        body = ok_res.json()
        assert body["course_code"] == "DSI99901"
        assert len(body["created_classes"]) == 2
        assert body["created_classes"][0]["room_type_needed"] == "Lab"
        assert "Dr. Eng. Rahmad, M.T." in body["created_classes"][0]["lecturer_names"]
        assert len(body["warnings"]) == 1  # Kelas B (10 mhs) < 15

        # Pastikan log tercatat
        logs_res = client.get("/api/departemen/logs?department=SI")
        assert logs_res.status_code == 200
        logs = logs_res.json()
        assert any(l["kode_mk"] == "DSI99901" and l["jenis_aksi"] == "TAMBAH_USULAN" for l in logs)

        # 4. Mode update_existing=True (pilih dari kurikulum yang sudah punya A, B lalu update & tambah C)
        upsert_res = client.post(
            "/api/departemen/offerings",
            json={
                "course_code": "DSI99901",
                "name": "Analisis Sistem Cerdas",
                "department": "SI",
                "semester": 5,
                "sks": 3,
                "sks_teori": 2,
                "sks_praktik": 1,
                "primary_lecturer_name": "Ricky Akbar, M.Kom.",
                "classes": [
                    {"class_label": "A", "enrolled_count": 42},
                    {"class_label": "B", "enrolled_count": 25},
                    {"class_label": "C", "enrolled_count": 30},
                ],
                "update_existing": True,
            },
        )
        assert upsert_res.status_code == 201
        assert len(upsert_res.json()["created_classes"]) == 3

    def test_below_quota_cancel_restore_and_adjust_rombels(self):
        # Buat kelas kecil (< 15)
        client.post(
            "/api/departemen/offerings",
            json={
                "course_code": "DIF88801",
                "name": "Topik Khusus AI",
                "department": "IF",
                "semester": 7,
                "sks": 2,
                "sks_teori": 2,
                "sks_praktik": 0,
                "primary_lecturer_name": "Dr. Ir. Wahyudi, S.T., M.T.",
                "classes": [
                    {"class_label": "A", "enrolled_count": 40},
                    {"class_label": "B", "enrolled_count": 9},
                ],
            },
        )

        # Cek daftar di bawah kuota
        res_below = client.get("/api/classes/below-quota?department=IF")
        assert res_below.status_code == 200
        below_data = res_below.json()
        assert below_data["kuota_minimum_kelas"] == 15
        assert any(c["id"] == "DIF88801-B" for c in below_data["classes"])

        # Batalkan tanpa alasan cukup -> 400
        bad_cancel = client.post("/api/classes/DIF88801-B/cancel", json={"reason": ""})
        assert bad_cancel.status_code == 400

        # Batalkan dengan alasan -> 200, hilang dari daftar aktif, tampil jika include_cancelled=true
        ok_cancel = client.post(
            "/api/classes/DIF88801-B/cancel",
            json={"reason": "Peserta kurang dari kuota minimum 15 mahasiswa", "actor_email": "kadepif@it.unand.ac.id"},
        )
        assert ok_cancel.status_code == 200
        assert ok_cancel.json()["status_kelas"] == "DIBATALKAN"

        active_if = client.get("/api/classes?department=IF").json()
        assert not any(c["id"] == "DIF88801-B" for c in active_if)

        all_if = client.get("/api/classes?department=IF&include_cancelled=true").json()
        assert any(c["id"] == "DIF88801-B" and c["status_kelas"] == "DIBATALKAN" for c in all_if)

        # Pulihkan kembali
        ok_restore = client.post("/api/classes/DIF88801-B/restore", json={"actor_email": "kadepif@it.unand.ac.id"})
        assert ok_restore.status_code == 200
        assert ok_restore.json()["status_kelas"] == "TERBUKA"

        # Sesuaikan jumlah rombel menjadi 3 kelas
        res_adj = client.post(
            "/api/departemen/offerings/DIF88801/adjust-rombels",
            json={"target_count": 3, "default_capacity": 35, "reason": "Lonjakan pendaftar"},
        )
        assert res_adj.status_code == 200
        assert len(res_adj.json()["classes"]) == 3

        # Ajukan ke fakultas & cek status
        res_sub = client.post(
            "/api/departemen/submit",
            json={"department": "IF", "actor_email": "kadepif@it.unand.ac.id"},
        )
        assert res_sub.status_code == 200
        assert res_sub.json()["status_pengajuan"] == "DIAJUKAN"

    def test_export_excel_and_pdf_valid_outputs(self):
        # 1. Ekspor Excel (.xlsx)
        res_xlsx = client.get("/api/classes/export-excel?department=SI")
        assert res_xlsx.status_code == 200
        assert "spreadsheetml.sheet" in res_xlsx.headers["content-type"]
        wb = openpyxl.load_workbook(io.BytesIO(res_xlsx.content))
        assert "Rincian Kelas" in wb.sheetnames
        assert "Ringkasan per MK" in wb.sheetnames
        ws = wb["Rincian Kelas"]
        assert ws["A1"].value is not None
        assert ws.max_row > 5

        # 2. Ekspor PDF (.pdf)
        res_pdf = client.get("/api/classes/export-pdf?department=SI")
        assert res_pdf.status_code == 200
        assert res_pdf.headers["content-type"].startswith("application/pdf")
        assert res_pdf.content.startswith(b"%PDF-")
        assert len(res_pdf.content) > 1000
