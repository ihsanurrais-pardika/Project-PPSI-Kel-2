# Backend Generator Penjadwalan SIPRAMA FTI UNAND
**Engine: Google OR-Tools CP-SAT (Constraint Programming - Satisfiability)**  
*Sesuai Spesifikasi PRD FTI Unand Fitur F-05 (UC-05) & Bab 5.1 Hard Constraints*

---

## 1. Struktur Modul

```
backend/
├── models.py       # Definisi Data Model (Room, Lecturer, CourseClass, TimeSlot)
├── generator.py    # Mesin Generator CP-SAT & Formulasi 6 Hard Constraints
├── run_demo.py     # Skrip Eksekusi Simulasi Terminal
└── README.md       # Dokumentasi Teknis
```

---

## 2. Hard Constraints yang Diterapkan

1. **Penugasan Tunggal (*Exact Assignment*):** Setiap kelas terjadwal tepat 1 kali pada 1 ruang dan 1 slot waktu.
2. **Anti-Bentrok Ruangan:** 1 ruangan pada 1 slot waktu hanya boleh diisi maksimal 1 kelas.
3. **Anti-Bentrok Dosen & Tim Tandem:** Dosen tunggal maupun tim pengajar tandem dilarang terjadwal di 2 kelas pada waktu yang sama.
4. **Anti-Bentrok Rombel Wajib Se-Angkatan:** Kelas wajib pada semester & departemen yang sama tidak boleh bertabrakan jadwalnya.
5. **Kapasitas Fisik:** Kapasitas ruang $\ge$ jumlah mahasiswa peserta.
6. **Aksesibilitas Disabilitas:** Kelas yang memiliki catatan kebutuhan khusus (*needs_ground_floor*) dijamin 100% ditempatkan di Lantai 1 / ruangan aksesibel.

---

## 3. Cara Menjalankan di Terminal

Jalankan perintah berikut di root proyek:

```powershell
python backend/run_demo.py
```
