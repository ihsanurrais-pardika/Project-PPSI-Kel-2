from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from enum import Enum

class ConstraintLevel(str, Enum):
    """Tingkat ketegasan aturan."""
    HARD = "HARD"  # Mutlak wajib terpenuhi 100% (CP-SAT Constraint)
    SOFT = "SOFT"  # Preferensi / fleksibel (Dioptimalkan dengan penalti minimal)

class ConstraintTarget(str, Enum):
    """Target berlakunya aturan."""
    GLOBAL = "GLOBAL"          # Berlaku ke semua kelas/ruang
    CLASS = "CLASS"            # Berlaku ke kelas spesifik
    LECTURER = "LECTURER"      # Berlaku ke dosen spesifik
    DEPARTMENT = "DEPARTMENT"  # Berlaku ke semua kelas di satu prodi
    ROOM = "ROOM"              # Berlaku ke ruangan spesifik

@dataclass
class ScheduleConstraint:
    """
    Aturan/Constraint Dinamis Sistem.
    Pengguna dapat menentukan apakah aturan ini HARD atau SOFT, menyertakan alasan,
    serta parameter yang fleksibel tanpa mengubah kode model kelas/ruangan.
    """
    id: str
    name: str                              # Nama aturan, contoh: "Bebas Kamis Pagi", "Lantai Dasar"
    category: str                          # Kategori: "Aksesibilitas", "Preferensi Dosen", "Kebijakan Prodi", "Fasilitas"
    level: ConstraintLevel                 # HARD atau SOFT
    reason: str                            # Alasan aturan (contoh: "Mahasiswa disabilitas kursi roda", "Surat DTK")
    target_type: ConstraintTarget          # GLOBAL / CLASS / LECTURER / DEPARTMENT / ROOM
    target_id: Optional[str] = None        # ID target (misal: ID kelas "c-SI101" atau prodi "Teknik Komputer")
    params: Dict[str, Any] = field(default_factory=dict)
    is_active: bool = True

@dataclass
class Room:
    """Master Data Ruangan."""
    id: str
    name: str
    capacity: int
    floor: int
    room_type: str = "Teori"              # "Teori", "Lab", "Seminar"
    features: List[str] = field(default_factory=list) # Contoh: ["lantai_1", "lift", "proyektor"]

@dataclass
class Lecturer:
    """Master Data Dosen."""
    id: str
    name: str
    department: str

@dataclass
class CourseClass:
    """
    Data Kelas Kuliah (Bersih & Standar).
    Tidak ada hardcoded flag disabilitas atau kondisi khusus di sini.
    Seluruh kondisi disesuaikan secara dinamis melalui objek ScheduleConstraint.
    """
    id: str
    code: str
    name: str
    class_label: str
    department: str
    semester: int
    enrolled_count: int
    lecturer_ids: List[str]               # ID dosen pengampu (bisa single maupun tandem)
    room_type_needed: str = "Teori"

@dataclass
class TimeSlot:
    """Master Data Slot Waktu."""
    id: str
    day: str                              # "Senin", "Selasa", dll.
    session: int                          # 1..5
    time_label: str                       # "07:30 - 09:10"
