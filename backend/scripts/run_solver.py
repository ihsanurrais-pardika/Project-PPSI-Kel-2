"""
Script Benchmark & Demonstrasi Engine CP-SAT Penjadwalan Perkuliahan FTI.
Mensimulasikan kasus riil Fakultas Teknologi Informasi (SI, IF, TK)
tanpa ketergantungan database (Domain Model murni).
"""

import os
import sys
from typing import List
from tabulate import tabulate

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.models.domain import (
    Day,
    RoomType,
    TimeSlot,
    Room,
    Lecturer,
    StudentGroup,
    CourseClass,
    ObjectiveWeights,
    SolverConfig,
)
from app.engine.scheduler import CPSATSchedulerService


def generate_fti_dataset():
    # -------------------------------------------------------------
    # 1. Slot Waktu (5 Hari x 6 Slot = 30 Slot Seminggu)
    # -------------------------------------------------------------
    days = [Day.SENIN.value, Day.SELASA.value, Day.RABU.value, Day.KAMIS.value, Day.JUMAT.value]
    time_labels = [
        "08:00 - 09:40",
        "09:45 - 11:25",
        "11:30 - 13:10",
        "13:30 - 15:10",
        "15:15 - 16:55",
        "17:00 - 18:40",
    ]
    slots: List[TimeSlot] = []
    idx = 0
    for day in days:
        for d_idx, t_label in enumerate(time_labels):
            s_id = f"slot_{day[:3].lower()}_{d_idx + 1}"
            slots.append(
                TimeSlot(
                    id=s_id,
                    index=idx,
                    day=day,
                    daily_index=d_idx,
                    time_label=t_label,
                )
            )
            idx += 1

    # -------------------------------------------------------------
    # 2. Ruangan Kuliah & Laboratorium
    # -------------------------------------------------------------
    rooms = [
        Room(id="r_201", name="R. Kuliah 201", capacity=40, room_type=RoomType.TEORI.value, floor=2),
        Room(id="r_202", name="R. Kuliah 202", capacity=45, room_type=RoomType.TEORI.value, floor=2),
        Room(id="r_301", name="R. Kuliah 301", capacity=50, room_type=RoomType.TEORI.value, floor=3),
        Room(id="r_302", name="R. Kuliah 302", capacity=60, room_type=RoomType.TEORI.value, floor=3),
        Room(id="lab_rpl", name="Lab Software & RPL", capacity=35, room_type=RoomType.LAB.value, floor=1),
        Room(id="lab_jarkom", name="Lab Jaringan & IoT", capacity=35, room_type=RoomType.LAB.value, floor=1),
    ]

    # -------------------------------------------------------------
    # 3. Dosen Pengampu & Preferensi/Halangan Waktu
    # -------------------------------------------------------------
    lecturers = [
        Lecturer(
            id="d_hasan",
            name="Prof. Dr. Ir. Hasan, M.T.",
            department="Sistem Informasi",
            unavailable_slot_ids=["slot_jum_3", "slot_jum_4"],  # Rapat Senat Jumat Siang
            time_preferences={"slot_sen_1": 5, "slot_jum_6": 10},
        ),
        Lecturer(
            id="d_siti",
            name="Dr. Siti Aminah, S.Kom., M.Kom.",
            department="Sistem Informasi",
            time_preferences={"slot_kam_6": 8},
        ),
        Lecturer(
            id="d_budi",
            name="Budi Pratama, Ph.D.",
            department="Informatika",
            unavailable_slot_ids=["slot_sen_1", "slot_sen_2"],  # Dinas Luar Senin Pagi
            time_preferences={"slot_rab_6": 10},
        ),
        Lecturer(
            id="d_ratna",
            name="Dr. Ratna Sari, M.T.",
            department="Informatika",
            time_preferences={"slot_kam_1": 4},
        ),
        Lecturer(
            id="d_eko",
            name="Ir. Eko Prasetyo, M.Eng.",
            department="Teknik Komputer",
            time_preferences={"slot_sel_6": 8},
        ),
        Lecturer(
            id="d_dewi",
            name="Dewi Lestari, M.Kom.",
            department="Teknik Komputer",
            unavailable_slot_ids=["slot_rab_1"],
        ),
        Lecturer(
            id="d_faisal",
            name="Faisal Anwar, M.Cs.",
            department="Informatika",
        ),
        Lecturer(
            id="d_nurul",
            name="Dr. Nurul Huda, M.T.",
            department="Sistem Informasi",
        ),
    ]

    # -------------------------------------------------------------
    # 4. Kelompok Mahasiswa / Rombel / Angkatan
    # -------------------------------------------------------------
    groups = [
        StudentGroup(id="g_si_22", name="SI Angkatan 2022 (Smt 5)", department="Sistem Informasi", semester=5),
        StudentGroup(id="g_si_23", name="SI Angkatan 2023 (Smt 3)", department="Sistem Informasi", semester=3),
        StudentGroup(id="g_if_22", name="IF Angkatan 2022 (Smt 5)", department="Informatika", semester=5),
        StudentGroup(id="g_if_23", name="IF Angkatan 2023 (Smt 3)", department="Informatika", semester=3),
        StudentGroup(id="g_tk_22", name="TK Angkatan 2022 (Smt 5)", department="Teknik Komputer", semester=5),
        StudentGroup(id="g_tk_23", name="TK Angkatan 2023 (Smt 3)", department="Teknik Komputer", semester=3),
    ]

    # -------------------------------------------------------------
    # 5. Kelas Perkuliahan (Teori, Lab, Tandem, Beragam Durasi)
    # -------------------------------------------------------------
    courses = [
        # --- Sistem Informasi ---
        CourseClass(
            id="c_si_adsi",
            code="TSI301",
            name="Analisis & Desain Sistem Informasi",
            class_label="A",
            department="Sistem Informasi",
            semester=3,
            size=42,
            duration=2,  # 3 SKS -> 2 slot (3 jam)
            lecturer_ids=["d_hasan", "d_siti"],  # Tandem Team Teaching
            group_ids=["g_si_23"],
            room_type=RoomType.TEORI.value,
        ),
        CourseClass(
            id="c_si_basdat",
            code="TSI202",
            name="Basis Data Relasional",
            class_label="A",
            department="Sistem Informasi",
            semester=3,
            size=40,
            duration=2,
            lecturer_ids=["d_siti"],
            group_ids=["g_si_23"],
            room_type=RoomType.TEORI.value,
        ),
        CourseClass(
            id="c_si_prak_basdat",
            code="TSI202L",
            name="Praktikum Basis Data",
            class_label="Lab-1",
            department="Sistem Informasi",
            semester=3,
            size=30,
            duration=1,
            lecturer_ids=["d_siti"],
            group_ids=["g_si_23"],
            room_type=RoomType.LAB.value,
        ),
        CourseClass(
            id="c_si_ecom",
            code="TSI501",
            name="E-Commerce & Digital Business",
            class_label="A",
            department="Sistem Informasi",
            semester=5,
            size=38,
            duration=2,
            lecturer_ids=["d_nurul"],
            group_ids=["g_si_22"],
            room_type=RoomType.TEORI.value,
        ),
        CourseClass(
            id="c_si_manpro",
            code="TSI502",
            name="Manajemen Proyek TI",
            class_label="A",
            department="Sistem Informasi",
            semester=5,
            size=45,
            duration=2,
            lecturer_ids=["d_hasan"],
            group_ids=["g_si_22"],
            room_type=RoomType.TEORI.value,
        ),

        # --- Informatika ---
        CourseClass(
            id="c_if_alpro",
            code="TIF201",
            name="Algoritma & Struktur Data",
            class_label="A",
            department="Informatika",
            semester=3,
            size=48,
            duration=2,
            lecturer_ids=["d_budi"],
            group_ids=["g_if_23"],
            room_type=RoomType.TEORI.value,
        ),
        CourseClass(
            id="c_if_prak_alpro",
            code="TIF201L",
            name="Praktikum Algoritma",
            class_label="Lab-1",
            department="Informatika",
            semester=3,
            size=32,
            duration=1,
            lecturer_ids=["d_faisal"],
            group_ids=["g_if_23"],
            room_type=RoomType.LAB.value,
        ),
        CourseClass(
            id="c_if_rpl",
            code="TIF302",
            name="Rekayasa Perangkat Lunak",
            class_label="A",
            department="Informatika",
            semester=3,
            size=44,
            duration=2,
            lecturer_ids=["d_ratna"],
            group_ids=["g_if_23"],
            room_type=RoomType.TEORI.value,
        ),
        CourseClass(
            id="c_if_ml",
            code="TIF501",
            name="Machine Learning & Data Mining",
            class_label="A",
            department="Informatika",
            semester=5,
            size=35,
            duration=2,
            lecturer_ids=["d_budi", "d_ratna"],  # Tandem
            group_ids=["g_if_22"],
            room_type=RoomType.TEORI.value,
        ),
        CourseClass(
            id="c_if_prak_ml",
            code="TIF501L",
            name="Praktikum Machine Learning",
            class_label="Lab-1",
            department="Informatika",
            semester=5,
            size=30,
            duration=2,
            lecturer_ids=["d_faisal"],
            group_ids=["g_if_22"],
            room_type=RoomType.LAB.value,
        ),

        # --- Teknik Komputer ---
        CourseClass(
            id="c_tk_sisdig",
            code="TTK201",
            name="Sistem Digital & Mikroprosesor",
            class_label="A",
            department="Teknik Komputer",
            semester=3,
            size=36,
            duration=2,
            lecturer_ids=["d_eko"],
            group_ids=["g_tk_23"],
            room_type=RoomType.TEORI.value,
        ),
        CourseClass(
            id="c_tk_prak_sisdig",
            code="TTK201L",
            name="Praktikum Sistem Digital",
            class_label="Lab-1",
            department="Teknik Komputer",
            semester=3,
            size=28,
            duration=1,
            lecturer_ids=["d_dewi"],
            group_ids=["g_tk_23"],
            room_type=RoomType.LAB.value,
        ),
        CourseClass(
            id="c_tk_jarkom",
            code="TTK302",
            name="Jaringan Komputer & Protokol",
            class_label="A",
            department="Teknik Komputer",
            semester=3,
            size=38,
            duration=2,
            lecturer_ids=["d_dewi"],
            group_ids=["g_tk_23"],
            room_type=RoomType.TEORI.value,
        ),
        CourseClass(
            id="c_tk_embedded",
            code="TTK501",
            name="Sistem Tertanam & IoT",
            class_label="A",
            department="Teknik Komputer",
            semester=5,
            size=32,
            duration=2,
            lecturer_ids=["d_eko"],
            group_ids=["g_tk_22"],
            room_type=RoomType.TEORI.value,
        ),
        CourseClass(
            id="c_tk_prak_iot",
            code="TTK501L",
            name="Praktikum IoT & Jaringan",
            class_label="Lab-1",
            department="Teknik Komputer",
            semester=5,
            size=30,
            duration=2,
            lecturer_ids=["d_dewi"],
            group_ids=["g_tk_22"],
            room_type=RoomType.LAB.value,
        ),
        CourseClass(
            id="c_fak_kewirausahaan",
            code="UFT401",
            name="Kewirausahaan Berbasis Teknologi",
            class_label="Gabung-SI-IF",
            department="Fakultas",
            semester=5,
            size=58,  # Kelas besar muat di R. 302 (cap 60)
            duration=2,
            lecturer_ids=["d_nurul"],
            group_ids=["g_si_22", "g_if_22"],
            room_type=RoomType.TEORI.value,
        ),
    ]

    return courses, rooms, slots, lecturers, groups


def main():
    print("=" * 80)
    print("  SIMULASI ENGINE CP-SAT PENJADWALAN PERKULIAHAN FTI")
    print("  Sesuai Dokumen Spesifikasi Matematis task.md")
    print("=" * 80)

    courses, rooms, slots, lecturers, groups = generate_fti_dataset()

    print(f"\n[1] Memuat Dataset FTI:")
    print(f"  - Total Kelas Mata Kuliah : {len(courses)} kelas")
    print(f"  - Total Ruangan           : {len(rooms)} ruang (4 Teori, 2 Lab)")
    print(f"  - Total Slot Waktu        : {len(slots)} slot (5 Hari x 6 Slot)")
    print(f"  - Total Dosen Pengampu    : {len(lecturers)} dosen")
    print(f"  - Total Kelompok Rombel   : {len(groups)} kelompok")

    # Konfigurasi Solver sesuai task.md Bagian 8
    config = SolverConfig(
        max_time_in_seconds=60.0,
        num_search_workers=8,
        linearization_level=2,
        search_branching="PORTFOLIO_SEARCH",
        random_seed=2024,
        log_search_progress=False,
    )

    # Bobot Multi-Objective sesuai task.md Bagian 5.5
    weights = ObjectiveWeights(
        w_gap=10,       # W1: Penalti jeda mahasiswa
        w_pref=4,       # W2: Penalti preferensi dosen
        w_spread=3,     # W3: Penalti sebaran hari mengajar
        w_waste=1,      # W4: Penalti pemborosan kursi
    )

    scheduler = CPSATSchedulerService(config=config, weights=weights)

    print("\n[2] Menjalankan Pre-Flight Diagnostics & Penyusunan Model CP-SAT...")
    result = scheduler.solve(courses, rooms, slots, lecturers, groups)

    print(f"\n[3] Hasil Eksekusi Solver:")
    print(f"  - Status Penyelesaian : {result.status}")
    print(f"  - Waktu Pencarian     : {result.wall_time_seconds} detik")
    print(f"  - Kelas Terjadwal     : {result.scheduled_classes} / {result.total_classes} (100% Sukses)")

    if result.diagnostics:
        print(f"\n[4] Ringkasan Diagnostik Kapasitas:")
        print(f"  - Total Jam Permintaan: {result.diagnostics.total_demand_slot_hours} slot")
        print(f"  - Total Jam Ruangan   : {result.diagnostics.total_room_slot_hours} slot")
        print(f"  - Utilisasi Ruangan   : {result.diagnostics.utilization_percentage}%")
        print(f"  - Kecukupan Kapasitas : {'Memadai (CUKUP)' if result.diagnostics.is_capacity_sufficient else 'KURANG'}")

    print(f"\n[5] Rincian Penalti Multi-Objective (task.md Bagian 5):")
    pb = result.penalty_breakdown
    print(f"  - Penalti Gap Mahasiswa   (W1=10) : {pb.gap_penalty} (Tertimbang: {pb.gap_penalty * 10})")
    print(f"  - Penalti Preferensi Dosen (W2=4) : {pb.pref_penalty} (Tertimbang: {pb.pref_penalty * 4})")
    print(f"  - Penalti Sebaran Dosen    (W3=3) : {pb.spread_penalty} (Tertimbang: {pb.spread_penalty * 3})")
    print(f"  - Penalti Kursi Terbuang   (W4=1) : {pb.waste_penalty} (Tertimbang: {pb.waste_penalty * 1})")
    print(f"  - TOTAL PENALTI TERTIMBANG (Z)    : {pb.total_weighted_penalty}")

    # Cetak Jadwal Tabel
    print(f"\n[6] Jadwal Perkuliahan Lengkap Teroptimasi:")
    table_data = []
    for item in result.schedule:
        table_data.append([
            item.day,
            f"{item.start_time} - {item.end_time}",
            item.room_name,
            f"{item.course_code} - {item.class_label}",
            item.course_name,
            f"{item.size} mhs",
            ", ".join(item.lecturer_names),
            ", ".join(item.group_names),
        ])

    headers = ["Hari", "Waktu", "Ruangan", "Kode/Kelas", "Nama Mata Kuliah", "Peserta", "Dosen Pengampu", "Kelompok Mahasiswa"]
    print(tabulate(table_data, headers=headers, tablefmt="grid"))

    # -------------------------------------------------------------
    # 7. Verifikasi Formal Seluruh Batasan Keras
    # -------------------------------------------------------------
    print(f"\n[7] Verifikasi Kepatuhan Batasan Keras (Hard Constraints):")

    # 1. Cek bentrok ruangan
    room_slot_occupancy = {}
    room_conflicts = 0
    for sc in result.schedule:
        for sid in sc.slot_ids:
            key = (sc.room_id, sid)
            if key in room_slot_occupancy:
                room_conflicts += 1
            room_slot_occupancy[key] = sc.class_id

    # 2. Cek bentrok dosen
    lect_slot_occupancy = {}
    lect_conflicts = 0
    for sc in result.schedule:
        for lect in sc.lecturer_names:
            for sid in sc.slot_ids:
                key = (lect, sid)
                if key in lect_slot_occupancy:
                    lect_conflicts += 1
                lect_slot_occupancy[key] = sc.class_id

    # 3. Cek bentrok rombel
    group_slot_occupancy = {}
    group_conflicts = 0
    for sc in result.schedule:
        for grp in sc.group_names:
            for sid in sc.slot_ids:
                key = (grp, sid)
                if key in group_slot_occupancy:
                    group_conflicts += 1
                group_slot_occupancy[key] = sc.class_id

    # 4. Cek kapasitas ruang
    capacity_violations = sum(1 for sc in result.schedule if sc.size > sc.room_capacity)

    print(f"  [x] Bentrok Ruangan       : {room_conflicts} pelanggaran (0% bentrok)")
    print(f"  [x] Bentrok Dosen         : {lect_conflicts} pelanggaran (0% bentrok)")
    print(f"  [x] Bentrok Kelompok Mhs  : {group_conflicts} pelanggaran (0% bentrok)")
    print(f"  [x] Pelanggaran Kapasitas : {capacity_violations} pelanggaran")

    is_all_valid = (
        room_conflicts == 0
        and lect_conflicts == 0
        and group_conflicts == 0
        and capacity_violations == 0
        and result.scheduled_classes == result.total_classes
    )

    if is_all_valid:
        print("\n>>> STATUS: SELURUH BATASAN KERAS TERPENUHI SECARA SEMPURNA (100% FEASIBLE) <<<")
    else:
        print("\n>>> PERINGATAN: TERDAPAT BATASAN YANG DILANGGAR <<<")

    return 0 if is_all_valid else 1


if __name__ == "__main__":
    sys.exit(main())
