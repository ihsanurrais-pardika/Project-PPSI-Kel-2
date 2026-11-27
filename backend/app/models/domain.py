"""
Definisi Domain Models, Sets, dan Indeks untuk Solver CP-SAT.
Sesuai Dokumen task.md Bagian 2 (Sets & Indices) dan Bagian 3 (Decision Variables).
"""

from dataclasses import dataclass, field
from typing import List, Dict
from enum import Enum


class Day(str, Enum):
    SENIN = "Senin"
    SELASA = "Selasa"
    RABU = "Rabu"
    KAMIS = "Kamis"
    JUMAT = "Jumat"


class RoomType(str, Enum):
    TEORI = "Teori"
    LAB = "Lab"


@dataclass(frozen=True)
class TimeSlot:
    """
    Slot Waktu Diskrit (s in S).
    index: indeks global sekuensial (0, 1, ..., |S|-1)
    daily_index: slot ke-berapa dalam hari tersebut (0, 1, ..., slots_per_day-1)
    """
    id: str
    index: int
    day: str
    daily_index: int
    time_label: str


@dataclass
class Room:
    """
    Ruang Kuliah / Laboratorium (r in R).
    Cap_r: Kapasitas daya tampung
    """
    id: str
    name: str
    capacity: int
    room_type: str = RoomType.TEORI.value  # "Teori" atau "Lab"
    building: str = "FTI Utama"
    floor: int = 1
    features: List[str] = field(default_factory=list)


@dataclass
class Lecturer:
    """
    Dosen Pengampu (d in D).
    unavailable_slot_ids: himpunan slot waktu halangan (S_d^Unavailable)
    time_preferences: bobot ketidaksukaan w_d,s^pref >= 0 untuk slot s
    """
    id: str
    name: str
    department: str
    unavailable_slot_ids: List[str] = field(default_factory=list)
    time_preferences: Dict[str, int] = field(default_factory=dict)


@dataclass
class StudentGroup:
    """
    Kelompok Mahasiswa / Rombel / Angkatan (g in G).
    Digunakan untuk mencegah jadwal bertabrakan pada mahasiswa yang sama.
    """
    id: str
    name: str
    department: str
    semester: int


@dataclass
class CourseClass:
    """
    Kelas Mata Kuliah (c in C).
    size: Size_c (jumlah mahasiswa terdaftar)
    duration: k_c (kebutuhan slot waktu berturut-turut / SKS durasi)
    lecturer_ids: himpunan dosen C_d (mendukung dosen tunggal maupun tim tandem)
    group_ids: himpunan rombel/angkatan C_g yang mengikuti kelas ini
    """
    id: str
    code: str
    name: str
    class_label: str
    department: str
    semester: int
    size: int
    duration: int
    lecturer_ids: List[str]
    group_ids: List[str]
    sks: int = 2
    room_type: str = RoomType.TEORI.value
    is_mandatory: bool = True


@dataclass
class ObjectiveWeights:
    """
    Bobot Penalti Multi-Objective (task.md Bagian 5.5).
    min Z = W1*P_Gap + W2*P_Pref + W3*P_Spread + W4*P_RoomWaste
    """
    w_gap: int = 10        # W1: Penalti jam kosong mahasiswa
    w_pref: int = 4        # W2: Penalti preferensi waktu dosen
    w_spread: int = 3      # W3: Penalti sebaran hari mengajar dosen
    w_waste: int = 1       # W4: Penalti pemborosan kursi ruangan


@dataclass
class SolverConfig:
    """
    Konfigurasi Parameter Solver CP-SAT (task.md Bagian 8).
    """
    max_time_in_seconds: float = 300.0
    num_search_workers: int = 8
    linearization_level: int = 2
    search_branching: str = "PORTFOLIO_SEARCH"
    random_seed: int = 2024
    log_search_progress: bool = False
