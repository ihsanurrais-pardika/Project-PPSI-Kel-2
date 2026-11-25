# Backend Generator Penjadwalan SIPRAMA FTI UNAND
**Engine: Google OR-Tools CP-SAT (Constraint Programming - Satisfiability)**  
*Sesuai Spesifikasi PRD FTI Unand Fitur F-05 (UC-05) & Bab 5.1 Hard Constraints*

---

## 1. Struktur Modul

```
backend/
├── models.py          # Definisi Data Model (Room, Lecturer, CourseClass, TimeSlot, ScheduleConstraint)
├── generator.py       # Mesin Generator CP-SAT & Dynamic Constraint Solver
├── run_demo.py        # Skrip Eksekusi Simulasi Terminal
├── requirements.txt   # Daftar dependensi Python (ortools, fastapi, dll)
└── README.md          # Dokumentasi Teknis
```

---

## 2. Instalasi Dependensi

Sebelum menjalankan skrip backend, pastikan library **Google OR-Tools** telah terinstal di Python:

```powershell
pip install -r backend/requirements.txt
```

Atau instal `ortools` langsung:

```powershell
pip install ortools
```

---

## 3. Hard Constraints yang Diterapkan

1. **Penugasan Tunggal (*Exact Assignment*):** Setiap kelas terjadwal tepat 1 kali pada 1 ruang dan 1 slot waktu.
2. **Anti-Bentrok Ruangan:** 1 ruangan pada 1 slot waktu hanya boleh diisi maksimal 1 kelas.
3. **Anti-Bentrok Dosen & Tim Tandem:** Dosen tunggal maupun tim pengajar tandem dilarang terjadwal di 2 kelas pada waktu yang sama.
4. **Anti-Bentrok Rombel Wajib Se-Angkatan:** Kelas wajib pada semester & departemen yang sama tidak boleh bertabrakan jadwalnya.
5. **Kapasitas Fisik:** Kapasitas ruang $\ge$ jumlah mahasiswa peserta.
6. **Aksesibilitas Disabilitas:** Kelas yang memiliki catatan kebutuhan khusus (*needs_ground_floor*) dijamin 100% ditempatkan di Lantai 1 / ruangan aksesibel.

---

## 4. Cara Menjalankan Simulasi di Terminal

Jalankan perintah berikut di root proyek:

```powershell
python backend/run_demo.py
```

Atau dari dalam folder `backend`:

```powershell
cd backend
python run_demo.py
```
