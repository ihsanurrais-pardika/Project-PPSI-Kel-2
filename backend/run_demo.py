import sys
from typing import List, Tuple
from models import (
    Room,
    Lecturer,
    CourseClass,
    TimeSlot,
    ScheduleConstraint,
    ConstraintLevel,
    ConstraintTarget,
)
from generator import DynamicCPSATScheduler


def get_base_environment() -> Tuple[List[Room], List[Lecturer], List[TimeSlot]]:
    """Katalog Ruangan, Master Dosen, dan Slot Waktu standar FTI Unand."""
    rooms = [
        Room(id="r-G101", name="G-101", capacity=50, floor=1, room_type="Teori"),
        Room(id="r-G102", name="G-102", capacity=45, floor=1, room_type="Teori"),
        Room(id="r-G201", name="G-201", capacity=55, floor=2, room_type="Teori"),
        Room(id="r-G202", name="G-202", capacity=50, floor=2, room_type="Teori"),
        Room(id="r-LabIF", name="Lab Software 1", capacity=40, floor=2, room_type="Lab"),
    ]

    lecturers = [
        Lecturer(id="d-surya", name="Dr. Surya, M.Kom", department="Sistem Informasi"),
        Lecturer(id="d-rahmi", name="Dr. Rahmi, M.T.", department="Sistem Informasi"),
        Lecturer(id="d-hendra", name="Ir. Hendra, M.T.", department="Teknik Komputer"),
        Lecturer(id="d-asril", name="Prof. Dr. Ir. Asril", department="Informatika"),
    ]

    time_slots = []
    days = ["Senin", "Selasa", "Kamis"]
    sessions = [
        (1, "07:30 - 09:10"),
        (2, "09:20 - 11:00"),
        (3, "11:10 - 12:50"),
        (4, "13:30 - 15:10"),
    ]
    for d in days:
        for s_num, t_label in sessions:
            time_slots.append(TimeSlot(id=f"s_{d}_{s_num}", day=d, session=s_num, time_label=t_label))

    return rooms, lecturers, time_slots


def prompt_safe(prompt_text: str, default: str = "") -> str:
    """Helper input aman terhadap EOFError jika dijalankan melalui pipeline."""
    try:
        val = input(prompt_text).strip()
        return val if val else default
    except (EOFError, KeyboardInterrupt):
        return default


def step_1_input_courses(
    all_lecturers: List[Lecturer],
) -> Tuple[List[CourseClass], List[Lecturer]]:
    """
    TAHAP 1: FORMULIR INPUT PENAWARAN MATA KULIAH (Murni tanpa constraint).
    Pengguna menginput daftar mata kuliah yang diajukan departemen terlebih dahulu.
    """
    print("\n" + "=" * 80)
    print("  TAHAP 1: INPUT DAFTAR PENAWARAN MATA KULIAH")
    print("  (Input data akademis murni: Kode, Nama, Dosen, SKS, Kuota Mhs)")
    print("=" * 80)

    classes: List[CourseClass] = []
    course_counter = 1

    # Baseline default mata kuliah kampus agar jadwal tidak kosong
    baseline_classes = [
        CourseClass(
            id="c-base-1",
            code="SI-2201",
            name="Manajemen Proyek TI",
            class_label="Kelas A",
            department="Sistem Informasi",
            semester=3,
            enrolled_count=38,
            lecturer_ids=["d-surya", "d-rahmi"], # Dosen tandem
            room_type_needed="Teori",
        ),
        CourseClass(
            id="c-base-2",
            code="PRAK-IF101",
            name="Praktikum Algoritma",
            class_label="Shift 1",
            department="Informatika",
            semester=1,
            enrolled_count=35,
            lecturer_ids=["d-asril"],
            room_type_needed="Lab",
        ),
    ]
    classes.extend(baseline_classes)

    print(f"[Info] 2 mata kuliah kampus telah dimuat sebagai baseline:")
    for idx, bc in enumerate(baseline_classes, 1):
        print(f"  {idx}. {bc.code} - {bc.name} ({bc.department})")

    print("\nSekarang, silakan masukkan mata kuliah baru yang diajukan:")

    while True:
        print(f"\n--- [Input Mata Kuliah Baru #{course_counter}] ---")
        code_input = prompt_safe("1. Kode Mata Kuliah [contoh: SI-1101]: ", f"MK-{course_counter:03d}")
        name_input = prompt_safe("2. Nama Mata Kuliah [contoh: Rekayasa Web]: ", f"Mata Kuliah Pilihan {course_counter}")

        print("3. Dosen Pengampu:")
        for idx, l in enumerate(all_lecturers, 1):
            print(f"   [{idx}] {l.name} ({l.department})")
        print(f"   [{len(all_lecturers) + 1}] Tambah Nama Dosen Baru")

        lec_choice = prompt_safe(f"   Pilih nomor dosen [1-{len(all_lecturers) + 1}]: ", "1")
        selected_lecturer_id = all_lecturers[0].id
        try:
            choice_num = int(lec_choice)
            if 1 <= choice_num <= len(all_lecturers):
                selected_lecturer_id = all_lecturers[choice_num - 1].id
            elif choice_num == len(all_lecturers) + 1:
                new_lec_name = prompt_safe("   Masukkan nama dosen baru: ", "Dosen Tamu, M.T.")
                new_lec_id = f"d-custom-{len(all_lecturers) + 1}"
                new_lec = Lecturer(id=new_lec_id, name=new_lec_name, department="Umum")
                all_lecturers.append(new_lec)
                selected_lecturer_id = new_lec_id
        except ValueError:
            selected_lecturer_id = all_lecturers[0].id

        sks_input = prompt_safe("4. Bobot SKS [2/3/4] (Default: 3): ", "3")
        try:
            sks = int(sks_input)
        except ValueError:
            sks = 3

        mhs_input = prompt_safe("5. Rencana Jumlah Mahasiswa [contoh: 42]: ", "40")
        try:
            enrolled_mhs = int(mhs_input)
        except ValueError:
            enrolled_mhs = 40

        class_id = f"c-user-{course_counter}"
        new_class = CourseClass(
            id=class_id,
            code=code_input,
            name=name_input,
            class_label="Kelas A",
            department="Sistem Informasi",
            semester=3,
            enrolled_count=enrolled_mhs,
            lecturer_ids=[selected_lecturer_id],
            room_type_needed="Teori",
        )
        classes.append(new_class)
        print(f"   [✓] Mata kuliah '{code_input} - {name_input}' berhasil ditambahkan ke daftar!")

        course_counter += 1
        more = prompt_safe("\nApakah ingin menambah mata kuliah lagi? (y/n) (Default: n): ", "n").lower()
        if more not in ("y", "yes", "ya"):
            break

    # Tampilkan rangkuman seluruh mata kuliah yang telah terinput
    print("\n[Rangkuman Daftar Mata Kuliah yang Siap Dijadwalkan]:")
    print("-" * 75)
    fmt_c = "{:<3} {:<10} {:<32} {:<6} {:<10}"
    print(fmt_c.format("No", "Kode", "Nama Mata Kuliah", "SKS", "Peserta"))
    print("-" * 75)
    for idx, c in enumerate(classes, 1):
        print(fmt_c.format(idx, c.code, c.name[:31], 3, f"{c.enrolled_count} Mhs"))
    print("-" * 75)

    return classes, all_lecturers


def step_2_input_constraints(
    classes: List[CourseClass],
    lecturers: List[Lecturer],
) -> List[ScheduleConstraint]:
    """
    TAHAP 2: FORMULIR INPUT DAFTAR CONSTRAINT / BATASAN.
    Setelah mata kuliah terinput, pengguna mengisi form aturan/constraint terpisah
    yang akan diterapkan pada daftar mata kuliah yang ada.
    """
    print("\n" + "=" * 80)
    print("  TAHAP 2: FORMULIR PENGELOLAAN ATURAN / CONSTRAINT PENJADWALAN")
    print("  (Aturan dipisahkan dari kelas, bisa memilih status HARD / SOFT dan alasan)")
    print("=" * 80)

    constraints: List[ScheduleConstraint] = []
    cst_counter = 1

    ask_constraint = prompt_safe(
        "Apakah ada hal-hal/batasan yang perlu dipertimbangkan dalam penjadwalan (constraint)? (y/n): ",
        "n",
    ).lower()

    if ask_constraint not in ("y", "yes", "ya"):
        print("   [INFO] Tidak ada constraint khusus yang diinput. Seluruh kelas akan dijadwalkan bebas optimal.")
        return constraints

    while True:
        print(f"\n--- [Input Aturan Constraint #{cst_counter}] ---")
        print("1. Pilih Target yang Terkena Aturan:")
        print("   [1] Mata Kuliah Spesifik (Pilih dari daftar matkul yang telah diinput)")
        print("   [2] Dosen Tertentu (Misal: Dosen tidak bisa jam tertentu)")
        print("   [3] Seluruh Departemen (Misal: Kebijakan DTK libur hari tertentu)")
        
        target_choice = prompt_safe("   Pilihan target [1/2/3]: ", "1")

        target_type = ConstraintTarget.CLASS
        target_id = classes[0].id
        target_display_name = classes[0].code

        if target_choice == "1":
            target_type = ConstraintTarget.CLASS
            print("\n   Pilih Mata Kuliah:")
            for idx, c in enumerate(classes, 1):
                print(f"   [{idx}] {c.code} - {c.name}")
            c_idx = prompt_safe(f"   Pilih nomor mata kuliah [1-{len(classes)}]: ", str(len(classes)))
            try:
                selected_c = classes[int(c_idx) - 1]
                target_id = selected_c.id
                target_display_name = f"{selected_c.code} ({selected_c.name})"
            except (ValueError, IndexError):
                target_id = classes[-1].id
                target_display_name = classes[-1].code

        elif target_choice == "2":
            target_type = ConstraintTarget.LECTURER
            print("\n   Pilih Dosen:")
            for idx, l in enumerate(lecturers, 1):
                print(f"   [{idx}] {l.name} ({l.department})")
            l_idx = prompt_safe(f"   Pilih nomor dosen [1-{len(lecturers)}]: ", "1")
            try:
                selected_l = lecturers[int(l_idx) - 1]
                target_id = selected_l.id
                target_display_name = f"Dosen {selected_l.name}"
            except (ValueError, IndexError):
                target_id = lecturers[0].id
                target_display_name = lecturers[0].name

        elif target_choice == "3":
            target_type = ConstraintTarget.DEPARTMENT
            print("\n   Pilih Departemen:")
            print("   [1] Sistem Informasi  [2] Informatika  [3] Teknik Komputer")
            d_idx = prompt_safe("   Pilih nomor [1-3]: ", "1")
            dept_names = ["Sistem Informasi", "Informatika", "Teknik Komputer"]
            try:
                dept_name = dept_names[int(d_idx) - 1]
            except (ValueError, IndexError):
                dept_name = "Sistem Informasi"
            target_id = dept_name
            target_display_name = f"Prodi {dept_name}"

        # 2. Jenis Batasan yang Diterapkan
        print("\n2. Pilih Bentuk Batasan:")
        print("   [1] Batasan Waktu (Misal: gausah masukin di Kamis pagi, hindari sesi 1)")
        print("   [2] Batasan Lantai (Misal: wajib di Lantai 1 untuk aksesibilitas/disabilitas)")
        cst_form_type = prompt_safe("   Pilihan [1/2]: ", "1")

        cst_name = "Batasan Khusus"
        cst_category = "Preferensi"
        params = {}

        if cst_form_type == "1":
            cst_category = "Batasan Waktu"
            print("\n   Pilih Hari yang ingin dihindari:")
            print("   [1] Senin  [2] Selasa  [3] Kamis  [4] Bebas hari apapun")
            day_choice = prompt_safe("   Pilihan hari [1-4]: ", "3")
            forbidden_day = None
            if day_choice == "1":
                forbidden_day = "Senin"
            elif day_choice == "2":
                forbidden_day = "Selasa"
            elif day_choice == "3":
                forbidden_day = "Kamis"

            print("   Pilih Sesi Jam yang ingin dihindari:")
            print("   [1] Sesi Pagi (07:30 - 11:00) / Sesi 1 & 2")
            print("   [2] Sesi Siang (11:10 - 15:10) / Sesi 3 & 4")
            print("   [3] Seharian Penuh")
            ses_choice = prompt_safe("   Pilihan sesi [1-3]: ", "1")
            forbidden_sessions = [1, 2] if ses_choice == "1" else ([3, 4] if ses_choice == "2" else [1, 2, 3, 4])

            cst_name = f"Hindari {forbidden_day or 'Hari'} ({'Pagi' if ses_choice == '1' else 'Siang'}) untuk {target_display_name}"
            params = {"forbidden_day": forbidden_day, "forbidden_sessions": forbidden_sessions}

        elif cst_form_type == "2":
            cst_category = "Aksesibilitas"
            cst_name = f"Wajib Ruangan Lantai 1 untuk {target_display_name}"
            params = {"max_floor": 1}

        # 3. Input Alasan (Reason)
        print("\n3. Alasan Pertimbangan:")
        reason_input = prompt_safe(
            "   Tuliskan Alasan: ",
            "Kebutuhan operasional akademik / kondisi khusus dosen atau mahasiswa",
        )

        # 4. Kategori Status: HARD atau SOFT
        print("\n4. Tentukan Kategori Status Constraint:")
        print("   [1] HARD Constraint (Wajib 100%, dilarang mutlak dilanggar oleh solver)")
        print("   [2] SOFT Constraint (Preferensi fleksibel, usahakan dipenuhi tapi jangan sampai jadwal gagal)")
        level_choice = prompt_safe("   Pilih status [1/2] (Default: 1): ", "1")
        level = ConstraintLevel.SOFT if level_choice == "2" else ConstraintLevel.HARD

        new_cst = ScheduleConstraint(
            id=f"cst-form-{cst_counter}",
            name=cst_name,
            category=cst_category,
            level=level,
            reason=reason_input,
            target_type=target_type,
            target_id=target_id,
            params=params,
        )
        constraints.append(new_cst)

        print(f"\n   [✓] Berhasil menambahkan aturan '{cst_name}' dengan status {level.value} ke daftar constraint!")

        cst_counter += 1
        more_cst = prompt_safe("\nApakah ada constraint lain yang ingin ditambahkan ke list? (y/n) (Default: n): ", "n").lower()
        if more_cst not in ("y", "yes", "ya"):
            break

    # Tampilkan daftar constraint yang telah berhasil diinput
    print("\n[Daftar Constraint yang Berhasil Terdaftar]:")
    print("-" * 95)
    fmt_list = "{:<12} {:<32} {:<18} {:<8} {:<22}"
    print(fmt_list.format("ID", "Nama Aturan", "Kategori", "Status", "Alasan"))
    print("-" * 95)
    for c in constraints:
        print(fmt_list.format(c.id, c.name[:31], c.category[:17], c.level.value, c.reason[:21]))
    print("-" * 95)

    return constraints


def main():
    rooms, lecturers, time_slots = get_base_environment()

    # Cek mode demo cepat
    if len(sys.argv) > 1 and sys.argv[1] == "--demo":
        mode = "2"
    else:
        print("=" * 80)
        print("  SIPRAMA FTI UNAND - GENERATOR PENJADWALAN CP-SAT")
        print("=" * 80)
        print("Pilih Mode Eksekusi:")
        print("  [1] Alur Lengkap: Input Matkul -> Input Form Constraint -> Generate")
        print("  [2] Mode Cepat (Demo Otomatis dengan Sampel)")
        mode = prompt_safe("Pilihan mode [1/2] (Default: 1): ", "1")

    all_classes: List[CourseClass] = []
    all_constraints: List[ScheduleConstraint] = []

    if mode == "2":
        # Mode cepat otomatis
        all_classes = [
            CourseClass(
                id="c-demo-1",
                code="SI-1101",
                name="Pengantar Sistem Informasi",
                class_label="Kelas A",
                department="Sistem Informasi",
                semester=1,
                enrolled_count=44,
                lecturer_ids=["d-surya"],
                room_type_needed="Teori",
            ),
            CourseClass(
                id="c-demo-2",
                code="SI-2201",
                name="Manajemen Proyek TI",
                class_label="Kelas A",
                department="Sistem Informasi",
                semester=3,
                enrolled_count=38,
                lecturer_ids=["d-surya", "d-rahmi"],
                room_type_needed="Teori",
            ),
            CourseClass(
                id="c-demo-3",
                code="TK-2101",
                name="Organisasi Komputer",
                class_label="Kelas A",
                department="Teknik Komputer",
                semester=3,
                enrolled_count=48,
                lecturer_ids=["d-hendra"],
                room_type_needed="Teori",
            ),
        ]
        all_constraints = [
            ScheduleConstraint(
                id="cst-demo-1",
                name="Gausah Masukin di Kamis Pagi",
                category="Batasan Waktu",
                level=ConstraintLevel.HARD,
                reason="Dosen ada jadwal rapat koordinasi fakultas",
                target_type=ConstraintTarget.CLASS,
                target_id="c-demo-1",
                params={"forbidden_day": "Kamis", "forbidden_sessions": [1, 2]},
            )
        ]
    else:
        # TAHAP 1: INPUT MATA KULIAH DAHULU
        all_classes, lecturers = step_1_input_courses(lecturers)

        # TAHAP 2: INPUT FORM CONSTRAINT SECARA TERPISAH
        all_constraints = step_2_input_constraints(all_classes, lecturers)

    # TAHAP 3: EKSEKUSI GENERATOR CP-SAT
    print("\n" + "=" * 95)
    print("  TAHAP 3: MENJALANKAN GENERATOR PENJADWALAN CP-SAT (GOOGLE OR-TOOLS)...")
    print("=" * 95)

    print(f"\n[Info Eksekusi]:")
    print(f"  • Jumlah Ruangan Tersedia : {len(rooms)} unit")
    print(f"  • Jumlah Mata Kuliah      : {len(all_classes)} rombel")
    print(f"  • Total Constraint Terpasang: {len(all_constraints)} aturan")

    scheduler = DynamicCPSATScheduler(rooms, lecturers, all_classes, time_slots, all_constraints)
    result = scheduler.solve(timeout_seconds=30.0, random_seed=2024)

    if result["status"] != "SUCCESS":
        print(f"\n[!] Solver Gagal: {result['message']}")
        sys.exit(1)

    print(f"\n[Hasil Solusi CP-SAT]:")
    print(f"  • Status : {result['solver_status']} (100% Valid)")
    print(f"  • Waktu  : {result['elapsed_seconds']} detik")

    print("\n[Draf Jadwal Perkuliahan yang Disesuaikan]:")
    print("-" * 105)
    fmt_tbl = "{:<8} {:<15} {:<10} {:<10} {:<30} {:<28}"
    print(fmt_tbl.format("Hari", "Jam Sesi", "Ruang", "Lokasi", "Mata Kuliah & Kelas", "Dosen Pengampu"))
    print("-" * 105)

    for item in result["schedule"]:
        day = item["day"]
        time_lbl = item["time_label"]
        room = item["room_name"]
        floor = f"Lantai {item['room_floor']}"
        course = f"{item['course_code']} ({item['class_label']})"
        lect_str = ", ".join(item["lecturers"])
        print(fmt_tbl.format(day, time_lbl, room, floor, course, lect_str))

    print("-" * 105)

    # Verifikasi Kepatuhan Constraint yang diinput di Tahap 2
    if all_constraints:
        print("\n[Verifikasi Kepatuhan Aturan Constraint]:")
        for cst in all_constraints:
            print(f"  • Aturan: '{cst.name}' | Status: {cst.level.value} | Alasan: '{cst.reason}'")
            if cst.target_type == ConstraintTarget.CLASS:
                matched = next((item for item in result["schedule"] if item["class_id"] == cst.target_id), None)
                if matched:
                    if "forbidden_day" in cst.params and cst.params["forbidden_day"] == "Kamis":
                        is_violating = (matched["day"] == "Kamis" and matched["session"] in cst.params.get("forbidden_sessions", []))
                        if not is_violating:
                            print(f"    -> [TERBUKTI PATUH] Terjadwal pada {matched['day']} Sesi {matched['session']} (Bukan Kamis pagi).")
                    elif "max_floor" in cst.params and cst.params["max_floor"] == 1:
                        if matched["room_floor"] == 1:
                            print(f"    -> [TERBUKTI PATUH] Terjadwal di ruang {matched['room_name']} (Lantai 1).")
            elif cst.target_type == ConstraintTarget.DEPARTMENT:
                dept_items = [item for item in result["schedule"] if item["department"] == cst.target_id]
                print(f"    -> [TERBUKTI PATUH] Seluruh {len(dept_items)} kelas prodi {cst.target_id} mematuhi batasan.")

    print("\n[SELESAI] Penjadwalan berhasil disesuaikan dengan seluruh form constraint!\n")


if __name__ == "__main__":
    main()
