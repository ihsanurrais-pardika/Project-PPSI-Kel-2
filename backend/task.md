# Dokumentasi Rinci Pembangunan Model CP-SAT Penjadwalan Perkuliahan

Dokumen ini berisi spesifikasi teknis dan formulasi matematis komprehensif untuk pembangunan model **CP-SAT (Constraint Programming - Satisfiability)** menggunakan Google OR-Tools. Model ini dirancang khusus untuk menangani kompleksitas sistem penjadwalan perkuliahan (Course Timetabling Problem) pada Fakultas Teknologi Informasi (FTI).

---

## 1. Pendahuluan & Filosofi Pendekatan CP-SAT

CP-SAT adalah solver canggih berbasis *Constraint Programming* yang menggunakan teknologi *SAT (Satisfiability)* di belakang layar. Berbeda dengan pendekatan *Mixed Integer Linear Programming (MILP)* murni, CP-SAT sangat efisien dalam menangani batasan logika diskrit, kondisi implikasi, serta pencarian ruang solusi (*search space*) yang sangat besar dengan menggunakan teknik *conflict-driven clause learning (CDCL)* dan *presolve*.

---

## 2. Definisi Himpunan & Indeks (Sets & Indices)

Untuk merumuskan persoalan secara formal, didefinisikan himpunan-himpunan dasar berikut:

| Simbol | Deskripsi Himpunan | Kasus Spesifik FTI |
| :--- | :--- | :--- |
| $C$ | Himpunan seluruh kelas mata kuliah | $c \in C=\{1, 2, \dots, |C|\}$ |
| $R$ | Himpunan seluruh ruang kelas / laboratorium | $r \in R=\{1, 2, \dots, |R|\}$ |
| $S$ | Himpunan seluruh slot waktu dalam seminggu | $s \in S=\{1, 2, \dots, |S|\}$ |
| $D$ | Himpunan dosen pengampu | $d \in D=\{1, 2, \dots, |D|\}$ |
| $G$ | Himpunan kelompok mahasiswa / angkatan / prodi | $g \in G=\{1, 2, \dots, |G|\}$ |
| $H$ | Himpunan hari kuliah | $h \in H=\{\text{Senin}, \text{Selasa}, \text{Rabu}, \text{Kamis}, \text{Jumat}\}$ |

### Pemetaan Relasi & Sub-himpunan:
- $S_h \subset S$: Himpunan slot waktu pada hari $h$.
- $C_d \subset C$: Himpunan kelas yang diampu oleh dosen $d$.
- $C_g \subset C$: Himpunan kelas yang diikuti oleh kelompok mahasiswa $g$.
- $R^{\text{Lab}} \subset R$: Himpunan ruang berbasis laboratorium.
- $R^{\text{Teori}} \subset R$: Himpunan ruang kelas teori reguler.
- $k_c$: Kebutuhan durasi/SKS (jumlah slot waktu berturut-turut) untuk kelas $c$.
- $Cap_r$: Kapasitas daya tampung ruangan $r$.
- $Size_c$: Jumlah mahasiswa terdaftar pada kelas $c$.

---

## 3. Variabel Keputusan (Decision Variables)

 Model CP-SAT memanfaatkan dua tingkatan variabel keputusan: **Variabel Utama** dan **Variabel Pembantu (Auxiliary Variables)**.

### 3.1 Variabel Keputusan Utama
Variabel biner $x_{c, r, s} \in \{0, 1\}$ didefinisikan sebagai:
$$x_{c, r, s} = \begin{cases} 1, & \text{jika kelas } c \text{ mulai atau menempati ruang } r \text{ pada slot waktu } s \\ 0, & \text{lainnya} \end{cases}$$

### 3.2 Variabel Waktu Mulai (Interval / Start-Slot Variables)
Untuk mempermudah penanganan SKS berdurasi lebih dari 1 slot, didefinisikan variabel biner penanda awal sesi $y_{c, r, s} \in \{0, 1\}$:
$$y_{c, r, s} = \begin{cases} 1, & \text{jika kelas } c \text{ BERMULA di ruang } r \text{ pada slot } s \\ 0, & \text{lainnya} \end{cases}$$

Variabel interval bawaan OR-Tools `NewIntervalVar(start, size, end, name)` digunakan untuk mengikat jadwal perkuliahan secara blok waktu kontigu:
$$\text{Start}_c \in S, \quad \text{End}_c = \text{Start}_c + k_c$$

---

## 4. Batasan Keras (Hard Constraints)

Batasan keras adalah aturan mutlak yang **wajib dipenuhi 100%**. Jika salah satu batasan ini dilanggar, maka solusi dianggap tidak valid (*infeasible*).

### 4.1 Pemenuhan Durasi & Alokasi Tunggal Kelas
Setiap kelas $c$ harus dijadwalkan persis satu kali dengan durasi $k_c$ slot waktu berturut-turut pada satu ruangan $r$:
$$\sum_{r \in R} \sum_{s \in S} y_{c, r, s} = 1 \quad \forall c \in C$$

Jika kelas $c$ dimulai pada slot $s$ di ruang $r$, maka kelas tersebut harus menempati slot $s, s+1, \dots, s+k_c-1$ di ruang $r$ yang sama:
$$x_{c, r, s + t} \ge y_{c, r, s} \quad \forall t \in \{0, 1, \dots, k_c - 1\}, \, \forall c \in C, \, \forall r \in R, \, \forall s \in S$$

### 4.2 Larangan Tumpang Tindih Ruang (No Room Overlap)
Satu ruangan $r$ pada slot waktu $s$ hanya boleh digunakan oleh paling banyak satu kelas:
$$\sum_{c \in C} x_{c, r, s} \le 1 \quad \forall r \in R, \, \forall s \in S$$

### 4.3 Larangan Bentrok Jadwal Dosen (No Lecturer Conflict)
Seorang dosen $d$ tidak boleh mengajar lebih dari satu kelas pada slot waktu $s$ yang sama:
$$\sum_{c \in C_d} \sum_{r \in R} x_{c, r, s} \le 1 \quad \forall d \in D, \, \forall s \in S$$

### 4.4 Larangan Bentrok Jadwal Mahasiswa (No Student Group Conflict)
Satu kelompok mahasiswa/angkatan $g$ tidak boleh memiliki lebih dari satu kelas pada slot waktu $s$ yang sama:
$$\sum_{c \in C_g} \sum_{r \in R} x_{c, r, s} \le 1 \quad \forall g \in G, \, \forall s \in S$$

### 4.5 Ketersediaan Ruangan & Kapasitas (Capacity & Room Eligibility)
1. **Daya Tampung**: Kelas $c$ hanya boleh dialokasikan ke ruang $r$ jika kapasitas ruang mencukupi:
   $$x_{c, r, s} = 0 \quad \forall s \in S, \, \forall r \in R \text{ di mana } Cap_r < Size_c$$
2. **Kesesuaian Tipe Ruang**: Kelas praktikum wajib dialokasikan di Laboratorium, sedangkan kelas teori di ruang Teori:
   $$x_{c, r, s} = 0 \quad \forall s \in S, \, \forall c \in C_{\text{Praktikum}}, \, \forall r \notin R^{\text{Lab}}$$
   $$x_{c, r, s} = 0 \quad \forall s \in S, \, \forall c \in C_{\text{Teori}}, \, \forall r \notin R^{\text{Teori}}$$

### 4.6 Batasan Batas Hari (Day Boundary Constraint)
Blok perkuliahan berdurasi $k_c$ tidak boleh terpotong atau melompati batas hari (misalnya dimulai di akhir hari Senin dan berlanjut ke hari Selasa):
$$y_{c, r, s} = 0 \quad \forall c \in C, \, \forall r \in R, \, \forall s \text{ di mana } \text{Day}(s) \neq \text{Day}(s + k_c - 1)$$

### 4.7 Ketersediaan Waktu Dosen (Lecturer Unavailability)
Jika dosen $d$ memiliki halangan mengajar pada set slot waktu tertentu $S^{\text{Unavailable}}_d \subset S$:
$$\sum_{r \in R} x_{c, r, s} = 0 \quad \forall c \in C_d, \, \forall s \in S^{\text{Unavailable}}_d$$

---

## 5. Batasan Lunak & Fungsi Tujuan (Soft Constraints & Objective Function)

Batasan lunak diperbolehkan untuk dilanggar, namun pelanggaran tersebut akan dikenakan **penalti**. Goal dari CP-SAT Solver adalah **meminimalkan total penalti**.

### 5.1 Penalitisasi Jam Kosong Mahasiswa (Student Gap / Idle Time Penalty)
Mahasiswa dihindari memiliki jeda/gap jam kosong yang terlalu banyak antar sesi dalam satu hari.

Didefinisikan variabel indikator keberadaan perkuliahan kelompok $g$ pada slot $s$:
$$z_{g, s} = \sum_{c \in C_g} \sum_{r \in R} x_{c, r, s} \in \{0, 1\}$$

Variabel gap $gap_{g, s} \in \{0, 1\}$ bernilai 1 jika slot $s$ kosong tetapi terdapat perkuliahan sebelum slot $s$ dan setelah slot $s$ pada hari yang sama:
$$gap_{g, s} \ge \left( \sum_{s' \in S_h, s' < s} z_{g, s'} \right) + \left( \sum_{s'' \in S_h, s'' > s} z_{g, s''} \right) - 1 - z_{g, s}$$

Total Penalti Gap Mahasiswa:
$$P_{\text{Gap}} = \sum_{g \in G} \sum_{s \in S} gap_{g, s}$$

### 5.2 Preferensi Waktu Dosen (Lecturer Time Preference)
Menghitung penalti jika dosen $d$ dijadwalkan pada slot waktu yang kurang disukai (misalnya slot paling malam atau slot pagi sekali):
$$P_{\text{Pref}} = \sum_{d \in D} \sum_{c \in C_d} \sum_{r \in R} \sum_{s \in S} w^{\text{pref}}_{d, s} \cdot x_{c, r, s}$$
di mana $w^{\text{pref}}_{d, s} \ge 0$ adalah bobot ketidaksukaan dosen $d$ terhadap slot $s$.

### 5.3 Distribusi Hari Mengajar Dosen (Compactness / Spread)
Mencegah dosen harus datang ke kampus hanya untuk mengajar 1 SKS/ slot singkat dalam sehari jika memungkinkan.

Didefinisikan $u_{d, h} \in \{0, 1\}$ sebagai indikator apakah dosen $d$ mengajar pada hari $h$:
$$u_{d, h} \ge \sum_{c \in C_d} \sum_{r \in R} x_{c, r, s} \quad \forall s \in S_h$$

Penalti Beban Mengajar Terlalu Tersebar:
$$P_{\text{Spread}} = \sum_{d \in D} \sum_{h \in H} u_{d, h}$$

### 5.4 Penyeimbangan Efisiensi Penggunaan Ruang (Room Utilization Penalty)
Menghindari pemborosan ruangan berkapasitas besar untuk kelas berporsi kecil:
$$P_{\text{RoomWaste}} = \sum_{c \in C} \sum_{r \in R} \sum_{s \in S} (Cap_r - Size_c) \cdot y_{c, r, s}$$

### 5.5 Formulasi Fungsi Tujuan Utama (Objective Minimization)
Fungsi tujuan menggabungkan seluruh komponen penalti menggunakan *Weighted Sum Approach*:

$$\min Z = W_1 \cdot P_{\text{Gap}} + W_2 \cdot P_{\text{Pref}} + W_3 \cdot P_{\text{Spread}} + W_4 \cdot P_{\text{RoomWaste}}$$

Di mana bobot $W_1, W_2, W_3, W_4$ dikonfigurasi berdasarkan prioritas kebijakan Fakultas.

---

## 6. Arsitektur Teknis Implementasi Python (Google OR-Tools)

Berikut adalah struktur kode acuan dalam mengimplementasikan formulasi di atas menggunakan pustaka `ortools.sat.python.cp_model`:

```python
from ortools.sat.python import cp_model

def build_and_solve_cpsat_schedule(courses, rooms, slots, lecturers, groups, preferences):
    # 1. Inisialisasi Model
    model = cp_model.CpModel()
    
    # 2. Inisialisasi Variabel Keputusan Utama
    # x[c, r, s] = 1 jika kelas c dimulai di ruang r pada slot s
    x = {}
    for c in courses:
        for r in rooms:
            if r.capacity >= c.size and r.type == c.type:
                for s in slots:
                    if isValidSlotForDuration(s, c.duration):
                        x[c.id, r.id, s.id] = model.NewBoolVar(f"x_{c.id}_{r.id}_{s.id}")
    
    # 3. Batasan Keras 1: Setiap kelas harus terjadwal persis 1 kali
    for c in courses:
        model.Add(
            sum(x[c.id, r.id, s.id] for r in rooms for s in slots if (c.id, r.id, s.id) in x) == 1
        )
        
    # 4. Batasan Keras 2: Tidak ada bentrok Ruangan (Interval Constraint)
    # Membuat Optional Interval Var untuk setiap kemungkinan alokasi
    for r in rooms:
        room_intervals = []
        for c in courses:
            for s in slots:
                if (c.id, r.id, s.id) in x:
                    # Interval berlangsung dari s.index sebanyak c.duration
                    interval = model.NewOptionalIntervalVar(
                        s.index, c.duration, s.index + c.duration,
                        x[c.id, r.id, s.id],
                        f"interval_{c.id}_{r.id}_{s.id}"
                    )
                    room_intervals.append(interval)
        model.AddNoOverlap(room_intervals)
        
    # 5. Batasan Keras 3: Tidak ada bentrok Dosen
    for d in lecturers:
        lecturer_intervals = []
        for c in d.courses:
            for r in rooms:
                for s in slots:
                    if (c.id, r.id, s.id) in x:
                        interval = model.NewOptionalIntervalVar(
                            s.index, c.duration, s.index + c.duration,
                            x[c.id, r.id, s.id],
                            f"lect_interval_{c.id}_{r.id}_{s.id}"
                        )
                        lecturer_intervals.append(interval)
        model.AddNoOverlap(lecturer_intervals)

    # 6. Batasan Keras 4: Tidak ada bentrok Kelompok Mahasiswa
    for g in groups:
        group_intervals = []
        for c in g.courses:
            for r in rooms:
                for s in slots:
                    if (c.id, r.id, s.id) in x:
                        interval = model.NewOptionalIntervalVar(
                            s.index, c.duration, s.index + c.duration,
                            x[c.id, r.id, s.id],
                            f"group_interval_{c.id}_{r.id}_{s.id}"
                        )
                        group_intervals.append(interval)
        model.AddNoOverlap(group_intervals)

    # 7. Penambahan Soft Constraints & Penalties
    penalties = []
    
    # Contoh Penalti Efisiensi Ruang
    for (c_id, r_id, s_id), var in x.items():
        room_obj = get_room(r_id)
        course_obj = get_course(c_id)
        wasted_seats = room_obj.capacity - course_obj.size
        penalties.append(var * wasted_seats)

    # Minimasikan Total Penalti
    model.Minimize(sum(penalties))

    # 8. Konfigurasi Solver & Eksekusi
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 300.0  # Time limit 5 menit
    solver.parameters.num_search_workers = 8      # Multi-threading
    solver.parameters.log_search_progress = True

    status = solver.Solve(model)
    
    return status, solver, x
```

---

## 7. Penanganan Diagnosis Model (Debugging & Troubleshooting)

Apabila Solver menghasilkan status `INFEASIBLE` (tidak ada solusi yang memenuhi seluruh batasan keras), langkah-langkah diagnostic berikut diterapkan:

1. **Conflict Refutation / Assumption Tracking**: Memasang variabel asumsi pada setiap batasan keras untuk mengisolasi batasan yang saling bertabrakan (*Unsatisfiable Core*).
2. **Kapasitas Total vs Beban Jam Total**: Verifikasi ketersediaan ruang-jam total:
   $$\text{Total Capacity Hours} = |R| \times |S| \ge \sum_{c \in C} k_c$$
3. **Pemeriksaan Kemacetan Peak Hour Dosen**: Memastikan bahwa jumlah dosen yang mengajar tidak melebihi jumlah ruangan yang tersedia pada setiap slot waktu.

---

## 8. Ringkasan Parameter Optimalisasi

| Parameter CP-SAT Solver | Nilai Rekomendasi | Keterangan |
| :--- | :--- | :--- |
| `max_time_in_seconds` | `300.0` - `600.0` | Memberikan waktu pencarian optimalitas cukup |
| `num_search_workers` | `8` atau `16` | Memaksimalkan paralelisme CPU multi-core |
| `linearization_level` | `2` | Memperkuat pemotongan linear (*cuts*) |
| `search_branching` | `PORTFOLIO_SEARCH` | Mengeksekusi variasi strategi pencarian bersamaan |
