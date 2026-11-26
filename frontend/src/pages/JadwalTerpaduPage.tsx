import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { PenyesuaianSksModal } from '../components/PenyesuaianSksModal';
import {
  resolveDepartment,
  getDepartmentLabel,
  getDepartmentBadgeStyle,
  DepartmentCode,
  CAMPUS_SESSION_SLOTS,
  STANDARD_SESSION_STARTS,
  calculateEndTime,
  formatTimeRange,
  getSessionDefaultStartTime,
  getSksBadgeStyle,
} from '../utils/departmentHelper';
import {
  Calendar,
  Table as TableIcon,
  Search,
  Printer,
  Download,
  CheckCircle2,
  Clock,
  Building,
  Users,
  Compass,
  User,
  GraduationCap,
  ArrowRight,
  Sparkles,
  Layers,
  Check,
  X,
  AlertCircle,
  BookOpen,
  MapPin,
  RefreshCw,
  ChevronRight,
  Info,
  Filter,
  Sliders,
  Settings,
  ArrowLeftRight,
  FileSpreadsheet,
  ArrowUpDown,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface PersonalCourseItem {
  id: string;
  courseCode: string;
  courseName: string;
  classLabel: string;
  shortClass?: string;
  semester?: number;
  sks: number;
  day: 'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT';
  sessionIndex: number;
  timeStart: string; // e.g. "07:30"
  timeEnd: string;   // e.g. "09:10"
  timeLabel: string; // e.g. "07:30 - 09:10"
  roomCode: string;  // e.g. "G-203"
  roomName: string;
  building: string;
  floor: number;
  capacity: number;
  lecturerName: string;
  allLecturers?: string;
  lecturerNip?: string;
  studentCount?: number;
  department: 'SI' | 'IF' | 'TK' | 'GKB';
  attendanceStatus?: string;
  type: 'Teori' | 'Praktikum' | 'Seminar';
}

// ─── Room availability data (mirrors HeatmapRuangPage MASTER_ROOMS) ──────────
interface AvailableRoom {
  code: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
  type: 'Teori' | 'Lab' | 'Seminar';
  dept: 'SI' | 'IF' | 'TK' | 'GKB';
  facilities: string[];
  isAccessible: boolean;
  // Map: day -> occupied session indices
  occupiedSlots: { [day: string]: number[] };
}

const ALL_ROOMS: AvailableRoom[] = [
  {
    code: 'G-101', name: 'G-101 (Teori SI)', building: 'Gedung FTI', floor: 1,
    capacity: 60, type: 'Teori', dept: 'SI', isAccessible: true,
    facilities: ['Proyektor Smart HDMI', '2 AC', 'Sound System', 'Akses Disabilitas'],
    occupiedSlots: { SENIN: [1, 2, 4], SELASA: [1, 3], RABU: [2, 4], KAMIS: [1], JUMAT: [1] },
  },
  {
    code: 'G-203', name: 'G-203 (Teori Multimedia SI)', building: 'Gedung FTI', floor: 2,
    capacity: 50, type: 'Teori', dept: 'SI', isAccessible: false,
    facilities: ['Smart TV 75"', '2 AC', 'Sound System', 'Whiteboard Magnetic'],
    occupiedSlots: { SENIN: [1, 2, 3, 4], SELASA: [2], RABU: [1, 3], KAMIS: [3], JUMAT: [1] },
  },
  {
    code: 'G-204', name: 'G-204 (Teori Standar SI)', building: 'Gedung FTI', floor: 2,
    capacity: 55, type: 'Teori', dept: 'SI', isAccessible: false,
    facilities: ['Proyektor HD', '2 AC', 'Whiteboard Magnetic', 'Sound System'],
    occupiedSlots: { SENIN: [4, 5], SELASA: [1, 2], RABU: [4], KAMIS: [2], JUMAT: [] },
  },
  {
    code: 'LAB-SI-01', name: 'Lab SI-01 (Basis Data & Web)', building: 'Gedung FTI', floor: 2,
    capacity: 40, type: 'Lab', dept: 'SI', isAccessible: false,
    facilities: ['40 PC i7/16GB', 'AC Sentral', 'Server DB Oracle/PostgreSQL', 'LAN Gigabit'],
    occupiedSlots: { SENIN: [2, 3], SELASA: [3, 4], RABU: [], KAMIS: [4], JUMAT: [] },
  },
  {
    code: 'GKB-101', name: 'GKB-101 (Teori Bersama)', building: 'GKB', floor: 1,
    capacity: 80, type: 'Teori', dept: 'GKB', isAccessible: true,
    facilities: ['3 AC', 'Dual Proyektor', 'Microphone Wireless', 'Ramah Disabilitas'],
    occupiedSlots: { SENIN: [2, 4], SELASA: [1], RABU: [], KAMIS: [3], JUMAT: [] },
  },
  {
    code: 'GKB-204', name: 'GKB-204 (Teori Bersama)', building: 'GKB', floor: 2,
    capacity: 75, type: 'Teori', dept: 'GKB', isAccessible: true,
    facilities: ['2 AC', 'Proyektor HD', 'Sound System', 'Wi-Fi Eduroam'],
    occupiedSlots: { SENIN: [3], SELASA: [], RABU: [2], KAMIS: [], JUMAT: [] },
  },
  {
    code: 'GKB-302', name: 'GKB-302 (Teori Bersama)', building: 'GKB', floor: 3,
    capacity: 65, type: 'Teori', dept: 'GKB', isAccessible: false,
    facilities: ['2 AC', 'Proyektor', 'Whiteboard Magnetic'],
    occupiedSlots: { SENIN: [], SELASA: [4], RABU: [], KAMIS: [], JUMAT: [] },
  },
  {
    code: 'G-102', name: 'G-102 (Teori Besar FTI)', building: 'Gedung FTI', floor: 1,
    capacity: 70, type: 'Teori', dept: 'GKB', isAccessible: true,
    facilities: ['3 AC', 'Dual Smart Proyektor', 'Sound System', 'Tiered Amphitheater'],
    occupiedSlots: { SENIN: [2, 4, 5], SELASA: [], RABU: [1], KAMIS: [], JUMAT: [] },
  },
  {
    code: 'SEM-FTI', name: 'Ruang Seminar FTI (Dekanat)', building: 'Gedung FTI', floor: 2,
    capacity: 100, type: 'Seminar', dept: 'GKB', isAccessible: true,
    facilities: ['Hybrid Teleconference', 'Ceiling Microphone Array', '3 Smart Display 85"', 'Izin Dekanat'],
    occupiedSlots: { SENIN: [], SELASA: [], RABU: [], KAMIS: [], JUMAT: [] },
  },
];

// ─── Session time map ─────────────────────────────────────────────────────────
const SESSION_MAP: { index: number; start: string; end: string; label: string }[] = [
  { index: 1, start: '07:30', end: '09:10', label: 'Sesi 1 (07:30 – 09:10)' },
  { index: 2, start: '09:20', end: '11:00', label: 'Sesi 2 (09:20 – 11:00)' },
  { index: 3, start: '11:10', end: '12:50', label: 'Sesi 3 (11:10 – 12:50)' },
  { index: 4, start: '13:30', end: '15:10', label: 'Sesi 4 (13:30 – 15:10)' },
  { index: 5, start: '15:30', end: '17:10', label: 'Sesi 5 (15:30 – 17:10)' },
];

// ─── Dosen schedule data ──────────────────────────────────────────────────────
const DOSEN_PERSONAL_SCHEDULE: PersonalCourseItem[] = [
  {
    id: 'ds-1', courseCode: 'SI-2114', courseName: 'Basis Data Terdistribusi',
    classLabel: 'Kelas A', sks: 3,
    day: 'SENIN', sessionIndex: 1, timeStart: '07:30', timeEnd: '09:10',
    timeLabel: '07:30 – 09:10',
    roomCode: 'G-203', roomName: 'Ruang G-203 (Teori Multimedia)', building: 'Gedung FTI', floor: 2, capacity: 50,
    lecturerName: 'Dr. Eng. Rahmad, M.T.', lecturerNip: '19820412 200812 1 003',
    studentCount: 42, department: 'SI', attendanceStatus: 'Pertemuan Ke-8 (Evaluasi)', type: 'Teori',
  },
  {
    id: 'ds-2', courseCode: 'IF-2101', courseName: 'Algoritma & Struktur Data Lanjutan',
    classLabel: 'Kelas B', sks: 3,
    day: 'RABU', sessionIndex: 2, timeStart: '09:20', timeEnd: '11:00',
    timeLabel: '09:20 – 11:00',
    roomCode: 'G-101', roomName: 'Ruang G-101 (Teori)', building: 'Gedung FTI', floor: 1, capacity: 60,
    lecturerName: 'Dr. Eng. Rahmad, M.T.', lecturerNip: '19820412 200812 1 003',
    studentCount: 48, department: 'SI', attendanceStatus: 'Pertemuan Ke-7 (Normal)', type: 'Teori',
  },
  {
    id: 'ds-3', courseCode: 'SI-3105', courseName: 'Analisis Proses Bisnis',
    classLabel: 'Kelas C', sks: 3,
    day: 'JUMAT', sessionIndex: 1, timeStart: '07:30', timeEnd: '09:10',
    timeLabel: '07:30 – 09:10',
    roomCode: 'G-203', roomName: 'Ruang G-203 (Teori Multimedia)', building: 'Gedung FTI', floor: 2, capacity: 50,
    lecturerName: 'Dr. Eng. Rahmad, M.T.', lecturerNip: '19820412 200812 1 003',
    studentCount: 46, department: 'SI', attendanceStatus: 'Pertemuan Ke-8 (Diskusi Kelompok)', type: 'Teori',
  },
  {
    id: 'ds-4', courseCode: 'SI-4001', courseName: 'Bimbingan Tugas Akhir & Skripsi',
    classLabel: 'Sesi Konsultasi', sks: 2,
    day: 'KAMIS', sessionIndex: 3, timeStart: '11:10', timeEnd: '12:50',
    timeLabel: '11:10 – 12:50',
    roomCode: 'SEM-FTI', roomName: 'Ruang Dosen SI Lt. 2', building: 'Gedung FTI', floor: 2, capacity: 20,
    lecturerName: 'Dr. Eng. Rahmad, M.T.', lecturerNip: '19820412 200812 1 003',
    studentCount: 8, department: 'SI', attendanceStatus: 'Review Bab IV & V', type: 'Seminar',
  },
];

// ─── Mahasiswa schedule data ──────────────────────────────────────────────────
const MAHASISWA_PERSONAL_SCHEDULE: PersonalCourseItem[] = [
  {
    id: 'mhs-1', courseCode: 'SI-2114', courseName: 'Basis Data Terdistribusi',
    classLabel: 'Kelas A', sks: 3,
    day: 'SENIN', sessionIndex: 1, timeStart: '07:30', timeEnd: '09:10',
    timeLabel: '07:30 – 09:10',
    roomCode: 'G-203', roomName: 'Ruang G-203 (Teori Multimedia)', building: 'Gedung FTI', floor: 2, capacity: 50,
    lecturerName: 'Dr. Eng. Rahmad, M.T.', lecturerNip: '19820412 200812 1 003',
    studentCount: 42, department: 'SI', type: 'Teori',
  },
  {
    id: 'mhs-2', courseCode: 'SI-3105', courseName: 'Analisis Proses Bisnis',
    classLabel: 'Kelas A', sks: 3,
    day: 'SENIN', sessionIndex: 2, timeStart: '09:20', timeEnd: '11:00',
    timeLabel: '09:20 – 11:00',
    roomCode: 'G-101', roomName: 'Ruang G-101 (Teori)', building: 'Gedung FTI', floor: 1, capacity: 60,
    lecturerName: 'Husnil Kamil, M.T.', lecturerNip: '19810815 200501 1 002',
    studentCount: 49, department: 'SI', type: 'Teori',
  },
  {
    id: 'mhs-3', courseCode: 'SI-2102', courseName: 'Rekayasa Web Terintegrasi',
    classLabel: 'Kelas C', sks: 3,
    day: 'SELASA', sessionIndex: 2, timeStart: '09:20', timeEnd: '11:00',
    timeLabel: '09:20 – 11:00',
    roomCode: 'G-102', roomName: 'Ruang G-102 (Teori Besar FTI)', building: 'Gedung FTI', floor: 1, capacity: 70,
    lecturerName: 'Fikri, M.Kom', lecturerNip: '19890214 201404 1 001',
    studentCount: 45, department: 'SI', type: 'Teori',
  },
  {
    id: 'mhs-4', courseCode: 'PRAK-SI201', courseName: 'Praktikum Basis Data Terdistribusi',
    classLabel: 'Shift 1', sks: 1,
    day: 'SELASA', sessionIndex: 4, timeStart: '13:30', timeEnd: '15:10',
    timeLabel: '13:30 – 15:10',
    roomCode: 'LAB-SI-01', roomName: 'LAB-SI-01 (Lab Software)', building: 'Gedung FTI', floor: 2, capacity: 40,
    lecturerName: 'Asisten Lab SI & Dr. Surya',
    studentCount: 38, department: 'SI', attendanceStatus: 'Modul Ke-5', type: 'Praktikum',
  },
  {
    id: 'mhs-5', courseCode: 'SI-3208', courseName: 'Audit Sistem Informasi & Tata Kelola',
    classLabel: 'Kelas A', sks: 3,
    day: 'RABU', sessionIndex: 4, timeStart: '13:30', timeEnd: '15:10',
    timeLabel: '13:30 – 15:10',
    roomCode: 'G-204', roomName: 'Ruang G-204 (Teori Standar)', building: 'Gedung FTI', floor: 2, capacity: 55,
    lecturerName: 'Dr. Rahmi, M.Kom', lecturerNip: '19860611 201012 2 004',
    studentCount: 48, department: 'SI', type: 'Teori',
  },
  {
    id: 'mhs-6', courseCode: 'UNAND-101', courseName: 'Pendidikan Pancasila & Kewarganegaraan',
    classLabel: 'Kelas FTI Bersama', sks: 2,
    day: 'KAMIS', sessionIndex: 3, timeStart: '11:10', timeEnd: '12:50',
    timeLabel: '11:10 – 12:50',
    roomCode: 'GKB-101', roomName: 'GKB-101 (Teori Bersama)', building: 'GKB', floor: 1, capacity: 80,
    lecturerName: 'Tim Dosen MKU UNAND',
    studentCount: 76, department: 'GKB', type: 'Teori',
  },
  {
    id: 'mhs-7', courseCode: 'SI-3205', courseName: 'Etika Profesi & Hukum Siber',
    classLabel: 'Kelas A', sks: 2,
    day: 'JUMAT', sessionIndex: 1, timeStart: '07:30', timeEnd: '09:10',
    timeLabel: '07:30 – 09:10',
    roomCode: 'G-101', roomName: 'Ruang G-101 (Teori)', building: 'Gedung FTI', floor: 1, capacity: 60,
    lecturerName: 'Dr. Rahmi, M.Kom', lecturerNip: '19860611 201012 2 004',
    studentCount: 48, department: 'SI', type: 'Teori',
  },
];

// ─── Helper: parse time string to minutes ────────────────────────────────────
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// ─── Helper: get overlapping sessions given start-end time ───────────────────
function getOverlappingSessions(startTime: string, endTime: string): number[] {
  const reqStart = timeToMinutes(startTime);
  const reqEnd = timeToMinutes(endTime);
  return SESSION_MAP.filter((s) => {
    const sStart = timeToMinutes(s.start);
    const sEnd = timeToMinutes(s.end);
    // overlaps if requested window overlaps with session window
    return reqStart < sEnd && reqEnd > sStart;
  }).map((s) => s.index);
}

// ─── Cari Ruang Kosong Modal ─────────────────────────────────────────────────
interface CariRuangModalProps {
  course: PersonalCourseItem;
  userRole: string;
  userProdi: 'SI' | 'IF' | 'TK';
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const CariRuangKosongModal: React.FC<CariRuangModalProps> = ({
  course, userRole, userProdi, onClose, showToast,
}) => {
  // Step: 'form' | 'results' | 'confirm'
  const [step, setStep] = useState<'form' | 'results' | 'confirm'>('form');

  // Form fields
  const DAY_DATE_MAP: Record<string, string> = {
    SENIN: '2024-11-25', SELASA: '2024-11-26', RABU: '2024-11-27',
    KAMIS: '2024-11-28', JUMAT: '2024-11-29',
  };
  const [formDate, setFormDate] = useState<string>(DAY_DATE_MAP[course.day] || '2024-11-25');
  const [formDay, setFormDay] = useState(course.day);
  const [formTimeStart, setFormTimeStart] = useState(course.timeStart);
  const [formTimeEnd, setFormTimeEnd] = useState(course.timeEnd);
  const [formMinCapacity, setFormMinCapacity] = useState(course.studentCount || 30);
  const [formBuilding, setFormBuilding] = useState<'Semua' | 'Gedung FTI' | 'GKB'>('Semua');
  const [formAccessibility, setFormAccessibility] = useState(false);

  // Validation error
  const [validationError, setValidationError] = useState<string | null>(null);

  // Selected room
  const [selectedRoom, setSelectedRoom] = useState<AvailableRoom | null>(null);

  // Computed available rooms
  const availableRooms = useMemo(() => {
    if (step !== 'results') return [];

    const reqStart = timeToMinutes(formTimeStart);
    const reqEnd = timeToMinutes(formTimeEnd);
    const overlappingSessions = getOverlappingSessions(formTimeStart, formTimeEnd);

    return ALL_ROOMS.filter((room) => {
      // 1. Prodi + GKB access rule
      const isOwnProdi = room.dept === userProdi;
      const isGKB = room.dept === 'GKB';
      if (!isOwnProdi && !isGKB) return false;

      // 2. Building filter
      if (formBuilding !== 'Semua' && room.building !== formBuilding) return false;

      // 3. Accessibility
      if (formAccessibility && !room.isAccessible) return false;

      // 4. Capacity
      if (room.capacity < formMinCapacity) return false;

      // 5. Not occupied on any overlapping session on that day
      const occupied = room.occupiedSlots[formDay] || [];
      const hasConflict = overlappingSessions.some((si) => occupied.includes(si));
      if (hasConflict) return false;

      // 6. Skip the current room (the one being replaced)
      if (room.code === course.roomCode && formDay === course.day) return false;

      return true;
    }).sort((a, b) => {
      // Sort: GKB last, then by capacity (closest match first)
      const aScore = Math.abs(a.capacity - (course.studentCount || 40));
      const bScore = Math.abs(b.capacity - (course.studentCount || 40));
      return aScore - bScore;
    });
  }, [step, formDay, formTimeStart, formTimeEnd, formMinCapacity, formBuilding, formAccessibility, userProdi, course]);

  const handleSearch = () => {
    // Validation (E1 flow)
    if (!formDate) {
      setValidationError('Tanggal pelaksanaan wajib diisi.');
      return;
    }
    if (!formTimeStart || !formTimeEnd) {
      setValidationError('Jam mulai dan jam selesai wajib diisi.');
      return;
    }
    const start = timeToMinutes(formTimeStart);
    const end = timeToMinutes(formTimeEnd);
    if (end <= start) {
      setValidationError('Jam selesai harus lebih akhir dari jam mulai.');
      return;
    }
    if (end - start < 30) {
      setValidationError('Durasi minimal pencarian ruang adalah 30 menit.');
      return;
    }
    setValidationError(null);
    setStep('results');
  };

  const handleSelectRoom = (room: AvailableRoom) => {
    setSelectedRoom(room);
    setStep('confirm');
  };

  const handleConfirm = () => {
    if (!selectedRoom) return;
    const formattedDate = formDate
      ? new Date(formDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : formDay;
    showToast(
      `Berhasil! Penyesuaian jadwal ${course.courseName} (${course.classLabel}) ke ruang ${selectedRoom.code} pada tanggal ${formattedDate} (${formTimeStart}–${formTimeEnd}) telah diajukan untuk keseluruhan semester.`,
      'success'
    );
    onClose();
  };

  const getDeptBadgeColor = (dept: string) => {
    if (dept === 'SI') return 'bg-sky-100 text-sky-800 border-sky-200';
    if (dept === 'IF') return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    if (dept === 'TK') return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-amber-100 text-amber-800 border-amber-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Modal Header ── */}
        <div className="bg-[#082c78] text-white px-6 py-4 flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold mb-1">
              <Search className="w-3.5 h-3.5" />
              <span>Cari Ruang Kosong untuk Kelas Pengganti</span>
            </div>
            <h2 className="text-base font-black leading-snug">
              {course.courseName}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-blue-200">
              <span className="font-mono font-bold bg-blue-900/50 px-2 py-0.5 rounded">{course.courseCode}</span>
              <span>•</span>
              <span>{course.classLabel}</span>
              <span>•</span>
              <span>{course.sks} SKS</span>
              <span>•</span>
              <span>{course.type}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Jadwal Asli Info Card ── */}
        <div className="bg-blue-50 border-b border-blue-100 px-6 py-3 shrink-0">
          <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-2">
            Informasi Jadwal yang Akan Digantikan
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Hari & Waktu</div>
              <div className="font-bold text-slate-900 mt-0.5">{course.day}</div>
              <div className="text-slate-600">{course.timeLabel}</div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Ruang Semula</div>
              <div className="font-bold text-slate-900 mt-0.5">{course.roomCode}</div>
              <div className="text-slate-600">Lt. {course.floor} • {course.building}</div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">
                {userRole === 'dosen' ? 'Jumlah Mahasiswa' : 'Dosen Pengampu'}
              </div>
              <div className="font-bold text-slate-900 mt-0.5">
                {userRole === 'dosen' ? `${course.studentCount} Mhs` : course.lecturerName}
              </div>
              <div className="text-slate-600">
                {userRole === 'dosen' ? `Kapasitas ruang: ${course.capacity}` : course.lecturerNip ? `NIP: ${course.lecturerNip}` : ''}
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Status Kehadiran</div>
              <div className="font-bold text-emerald-700 mt-0.5">{course.attendanceStatus || '-'}</div>
              <div className="text-slate-600">Sesi ke-{course.sessionIndex}</div>
            </div>
          </div>
        </div>

        {/* ── Step Indicator ── */}
        <div className="px-6 pt-4 pb-2 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            {(['form', 'results', 'confirm'] as const).map((s, i) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1.5 ${step === s ? 'text-blue-700 font-bold' : step > s ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${step === s ? 'bg-blue-700 text-white' :
                    (step === 'results' && s === 'form') || (step === 'confirm' && (s === 'form' || s === 'results')) ? 'bg-emerald-500 text-white' :
                      'bg-slate-200 text-slate-500'
                    }`}>
                    {(step === 'results' && s === 'form') || (step === 'confirm' && (s === 'form' || s === 'results'))
                      ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  <span className="hidden sm:inline">
                    {s === 'form' ? 'Kriteria Pencarian' : s === 'results' ? 'Pilih Ruang' : 'Konfirmasi'}
                  </span>
                </div>
                {i < 2 && <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* ── STEP 1: FORM ── */}
          {step === 'form' && (
            <div className="space-y-4">
              {/* Validation error (E1) */}
              {validationError && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <div>
                    <div className="font-bold">Masukan Tidak Valid</div>
                    <div className="mt-0.5">{validationError} Silakan perbaiki dan coba lagi.</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tanggal Pelaksanaan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tanggal Pelaksanaan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormDate(val);
                      if (val) {
                        const d = new Date(val).getDay();
                        const dayNames = ['', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'];
                        if (d >= 1 && d <= 5) setFormDay(dayNames[d] as any);
                      }
                      setValidationError(null);
                    }}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 font-bold"
                  />
                </div>

                {/* Gedung */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Gedung (Opsional)</label>
                  <select
                    value={formBuilding}
                    onChange={(e) => setFormBuilding(e.target.value as any)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                  >
                    <option value="Semua">Semua Gedung</option>
                    <option value="Gedung FTI">Gedung FTI</option>
                    <option value="GKB">GKB (Gedung Kuliah Bersama)</option>
                  </select>
                </div>

                {/* Jam Mulai */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Jam Mulai <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formTimeStart}
                    onChange={(e) => { setFormTimeStart(e.target.value); setValidationError(null); }}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                  />
                </div>

                {/* Jam Selesai */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Jam Selesai <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formTimeEnd}
                    onChange={(e) => { setFormTimeEnd(e.target.value); setValidationError(null); }}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                  />
                </div>

                {/* Kapasitas minimum */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Kapasitas Minimum (Opsional)
                  </label>
                  <div className="relative">
                    <Users className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      min={1}
                      max={150}
                      value={formMinCapacity}
                      onChange={(e) => setFormMinCapacity(Number(e.target.value))}
                      className="w-full pl-9 pr-3 text-xs border border-slate-200 rounded-xl py-2.5 text-slate-800 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                      placeholder="Min. mahasiswa"
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Jumlah mahasiswa kelas ini: {course.studentCount || '-'}
                  </div>
                </div>

                {/* Aksesibilitas */}
                <div className="flex flex-col justify-center">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Aksesibilitas (Opsional)</label>
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <div
                      onClick={() => setFormAccessibility(!formAccessibility)}
                      className={`w-9 h-5 rounded-full transition-colors relative ${formAccessibility ? 'bg-blue-700' : 'bg-slate-200'}`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-all shadow-xs ${formAccessibility ? 'left-4.5' : 'left-0.75'}`} />
                    </div>
                    <span className="text-xs text-slate-700 group-hover:text-slate-900">
                      Ramah Disabilitas (Akses Kursi Roda)
                    </span>
                  </label>
                </div>
              </div>

              {/* Info: scope filter */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2 text-xs text-blue-700">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Pencarian otomatis dibatasi pada ruangan <strong>Prodi {userProdi} (Sistem Informasi)</strong> dan <strong>GKB Bersama</strong> sesuai hak akses Anda.
                </span>
              </div>
            </div>
          )}

          {/* ── STEP 2: RESULTS ── */}
          {step === 'results' && (
            <div className="space-y-3">
              {/* Applied filters summary */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-slate-600">Filter aktif:</span>
                {formDate && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold border border-blue-200">
                    {new Date(formDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold border border-blue-200">{formTimeStart} – {formTimeEnd}</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold border border-blue-200">Min. {formMinCapacity} kursi</span>
                {formBuilding !== 'Semua' && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold border border-blue-200">{formBuilding}</span>
                )}
                {formAccessibility && (
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">Ramah Disabilitas</span>
                )}
                <button
                  onClick={() => setStep('form')}
                  className="ml-auto flex items-center gap-1 text-slate-500 hover:text-blue-700 font-semibold"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Ubah Kriteria</span>
                </button>
              </div>

              {availableRooms.length === 0 ? (
                /* A1: No available rooms */
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">Tidak Ada Ruang Kosong</div>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Tidak ditemukan ruang yang tersedia pada <strong>{formDay.charAt(0) + formDay.slice(1).toLowerCase()}, {formTimeStart}–{formTimeEnd}</strong> dengan kapasitas minimal {formMinCapacity} kursi.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs">
                    <span className="text-slate-500">Saran:</span>
                    <button
                      onClick={() => { setFormDay('SELASA'); setStep('form'); }}
                      className="text-blue-700 hover:underline font-semibold"
                    >Coba hari Selasa</button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={() => { setFormMinCapacity(Math.max(1, formMinCapacity - 10)); setStep('form'); }}
                      className="text-blue-700 hover:underline font-semibold"
                    >Kurangi kapasitas minimum</button>
                    <span className="text-slate-300">|</span>
                    <button onClick={() => setStep('form')} className="text-blue-700 hover:underline font-semibold">
                      Ubah jam
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Ditemukan <strong className="text-slate-800">{availableRooms.length} ruang kosong</strong> yang sesuai</span>
                    <span className="text-[10px]">Diurutkan berdasarkan kesesuaian kapasitas</span>
                  </div>
                  <div className="space-y-2.5">
                    {availableRooms.map((room) => (
                      <div
                        key={room.code}
                        className="border border-slate-200 rounded-xl p-3.5 hover:border-blue-400 hover:bg-blue-50/30 transition-all group cursor-pointer"
                        onClick={() => handleSelectRoom(room)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-sm text-slate-900 font-mono">{room.code}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getDeptBadgeColor(room.dept)}`}>
                                {room.dept === 'GKB' ? 'GKB Bersama' : `Prodi ${room.dept}`}
                              </span>
                              {room.isAccessible && (
                                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                                  ♿ Aksesibel
                                </span>
                              )}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${room.type === 'Lab' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                room.type === 'Seminar' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                                  'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}>
                                {room.type}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 mt-0.5">{room.name}</div>
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Building className="w-3 h-3 text-slate-400" />
                                <span>{room.building}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>Lantai {room.floor}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-slate-400" />
                                <span className={`font-semibold ${room.capacity >= (course.studentCount || 0) ? 'text-emerald-700' : 'text-amber-600'}`}>
                                  {room.capacity} Kursi
                                </span>
                                {room.capacity >= (course.studentCount || 0) && (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                )}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {room.facilities.slice(0, 3).map((f) => (
                                <span key={f} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{f}</span>
                              ))}
                              {room.facilities.length > 3 && (
                                <span className="text-[10px] text-slate-400">+{room.facilities.length - 3} lainnya</span>
                              )}
                            </div>
                          </div>
                          <button className="shrink-0 mt-1 px-3 py-1.5 text-xs font-bold text-white bg-[#082c78] group-hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap">
                            Pilih Ruang →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── STEP 3: CONFIRM ── */}
          {step === 'confirm' && selectedRoom && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center space-y-1">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <div className="font-bold text-slate-900">Konfirmasi Pemilihan Ruang</div>
                <p className="text-xs text-slate-500">Periksa detail di bawah sebelum mengajukan permintaan penggantian ruang.</p>
              </div>

              {/* Summary card */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <div className="bg-slate-50 px-4 py-2.5 font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                  Detail Pengajuan {userRole === 'dosen' ? 'Kelas Pengganti' : 'Reservasi Ruang'}
                </div>
                <div className="divide-y divide-slate-100">
                  <div className="grid grid-cols-2 gap-x-4 px-4 py-3">
                    <div>
                      <div className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Mata Kuliah</div>
                      <div className="font-bold text-slate-900 mt-0.5">{course.courseName}</div>
                      <div className="text-slate-500 font-mono">{course.courseCode} • {course.classLabel}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Jumlah Peserta</div>
                      <div className="font-bold text-slate-900 mt-0.5">{course.studentCount} Mahasiswa</div>
                      <div className={`font-semibold ${selectedRoom.capacity >= (course.studentCount || 0) ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {selectedRoom.capacity >= (course.studentCount || 0) ? '✓ Muat dalam kapasitas ruang' : '⚠ Kapasitas ruang lebih kecil dari jumlah peserta'}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 px-4 py-3">
                    <div>
                      <div className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Ruang Semula</div>
                      <div className="font-bold text-slate-500 mt-0.5 line-through">{course.roomCode}</div>
                      <div className="text-slate-400">Lt. {course.floor} • {course.building}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Ruang Pengganti</div>
                      <div className="font-bold text-emerald-700 mt-0.5">{selectedRoom.code}</div>
                      <div className="text-slate-600">Lt. {selectedRoom.floor} • {selectedRoom.building}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 px-4 py-3">
                    <div>
                      <div className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Waktu Semula</div>
                      <div className="font-bold text-slate-500 mt-0.5">{course.day.charAt(0) + course.day.slice(1).toLowerCase()}, {course.timeLabel}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Waktu Pelaksanaan Baru</div>
                      <div className="font-bold text-blue-700 mt-0.5">
                        {formDate && new Date(formDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}, {formTimeStart} – {formTimeEnd}
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <div className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5">Fasilitas Ruang Pengganti</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedRoom.facilities.map((f) => (
                        <span key={f} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">{f}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep('results')}
                className="text-xs text-slate-500 hover:text-blue-700 hover:underline flex items-center gap-1"
              >
                ← Kembali pilih ruang lain
              </button>
            </div>
          )}
        </div>

        {/* ── Modal Footer ── */}
        <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3 shrink-0 bg-slate-50">
          <button onClick={onClose} className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors">
            Batal
          </button>
          <div className="flex items-center gap-2">
            {step === 'form' && (
              <button
                onClick={handleSearch}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#082c78] hover:bg-blue-800 rounded-xl transition-colors shadow-xs"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Cari Ruang Kosong</span>
              </button>
            )}
            {step === 'results' && availableRooms.length === 0 && (
              <button
                onClick={() => setStep('form')}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Ubah Kriteria Pencarian</span>
              </button>
            )}
            {step === 'confirm' && (
              <button
                onClick={handleConfirm}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{userRole === 'dosen' ? 'Ajukan Ruang Pengganti' : 'Konfirmasi Reservasi'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper used inside modal — reuse outside too
function getDeptBadgeColor(dept: string): string {
  if (dept === 'SI') return 'bg-sky-100 text-sky-800 border-sky-200';
  if (dept === 'IF') return 'bg-indigo-100 text-indigo-800 border-indigo-200';
  if (dept === 'TK') return 'bg-purple-100 text-purple-800 border-purple-200';
  return 'bg-amber-100 text-amber-800 border-amber-200';
}

// ─── Main Page Component ─────────────────────────────────────────────────────
export const JadwalTerpaduPage: React.FC = () => {
  const {
    currentRole,
    currentUser,
    schedule: masterSchedule,
    setSelectedRoomForNav,
    setIsRoomNavModalOpen,
    showToast,
    rooms,
    conflicts,
    validationReport,
    scheduleApprovalStatus,
    setActivePage,
    updateScheduleClassSksAndTime,
    swapScheduleItems,
    pendingManualEditScheduleId,
    setPendingManualEditScheduleId,
  } = useApp();

  const [rosterView, setRosterView] = useState<'dosen' | 'mahasiswa' | 'master'>(
    currentRole === 'dosen' ? 'dosen' : currentRole === 'mahasiswa' ? 'mahasiswa' : 'master'
  );

  useEffect(() => {
    if (currentRole === 'dosen') {
      setRosterView('dosen');
    } else if (currentRole === 'mahasiswa') {
      setRosterView('mahasiswa');
    } else if (currentRole !== 'admin') {
      setRosterView('master');
    }
  }, [currentRole]);

  const isAdmin = currentRole === 'admin';
  const canAdminEditMaster = isAdmin && rosterView === 'master';
  const isDosen = (currentRole === 'dosen' || (currentRole === 'admin' && rosterView === 'dosen')) && rosterView !== 'mahasiswa';

  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
  const [excelSort, setExcelSort] = useState<{
    key: 'no' | 'courseCode' | 'courseName' | 'sks' | 'lecturer' | 'semester' | 'day';
    dir: 'asc' | 'desc';
  }>({ key: 'no', dir: 'asc' });
  const [selectedDept, setSelectedDept] = useState<'SI' | 'IF' | 'TK'>('SI');
  const [selectedSemester, setSelectedSemester] = useState<'Semua' | number>('Semua');
  const [selectedSks, setSelectedSks] = useState<'Semua' | 1 | 2 | 3 | 4>('Semua');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDay, setFilterDay] = useState('Semua');

  // Cari Ruang Modal state
  const [cariRuangTarget, setCariRuangTarget] = useState<PersonalCourseItem | null>(null);

  // Penyesuaian & Tukar Jadwal Manual (khusus Admin)
  const [isAdjustSksModalOpen, setIsAdjustSksModalOpen] = useState(false);
  const [adjustTargetId, setAdjustTargetId] = useState<string | null>(null);
  const [pickedOpponentId, setPickedOpponentId] = useState<string | null>(null);
  const [previewOpponentId, setPreviewOpponentId] = useState<string | null>(null);
  const [isPickingFromGrid, setIsPickingFromGrid] = useState(false);

  useEffect(() => {
    if (!canAdminEditMaster && isAdjustSksModalOpen) {
      setIsAdjustSksModalOpen(false);
      setIsPickingFromGrid(false);
      setPickedOpponentId(null);
      setPreviewOpponentId(null);
    }
  }, [canAdminEditMaster, isAdjustSksModalOpen]);

  // Buka panel edit/tukar otomatis jika Admin melompat dari halaman Validasi & Konflik
  useEffect(() => {
    if (!pendingManualEditScheduleId || !isAdmin) return;
    setRosterView('master');
    const targetItem = masterSchedule.find(
      (item, idx) => (item.id || `sch-${idx}`) === pendingManualEditScheduleId
    );
    if (targetItem) {
      const targetDept = resolveDepartment(targetItem.department, targetItem.courseCode);
      setSelectedDept(targetDept);
    }
    setSelectedSemester('Semua');
    setSelectedSks('Semua');
    setFilterDay('Semua');
    setSearchTerm('');
    setAdjustTargetId(pendingManualEditScheduleId);
    setPickedOpponentId(null);
    setPreviewOpponentId(null);
    setIsPickingFromGrid(false);
    setIsAdjustSksModalOpen(true);
    setPendingManualEditScheduleId(null);
  }, [pendingManualEditScheduleId, isAdmin, masterSchedule, setPendingManualEditScheduleId]);

  const days: Array<'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT'> = [
    'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT',
  ];

  // Kolom sesi fleksibel menyesuaikan SKS yang dipilih (50 menit/SKS)
  // Jam mulai standar kampus FTI: 07:30, 09:10, 10:00, 11:10, 13:30, 16:00
  const sessionColumns = useMemo(() => {
    return CAMPUS_SESSION_SLOTS.map((slot) => {
      let timeDesc = slot.startTime;
      if (selectedSks !== 'Semua') {
        const endTime = calculateEndTime(slot.startTime, selectedSks);
        timeDesc = `${slot.startTime} – ${endTime} • ${selectedSks} SKS (${selectedSks * 50}m)`;
      } else {
        timeDesc = `${slot.startTime} • Fleksibel SKS`;
      }
      return {
        id: slot.id,
        label: `${slot.name} (${timeDesc})`,
        startTime: slot.startTime,
      };
    });
  }, [selectedSks]);

  // Determine user's prodi for the room search filter
  const userProdi = useMemo<'SI' | 'IF' | 'TK'>(() => {
    const dept = (currentUser.department || '').toLowerCase();
    if (dept.includes('informatika') || dept.includes('if')) return 'IF';
    if (dept.includes('komputer') || dept.includes('tk')) return 'TK';
    return 'SI';
  }, [currentUser]);

  const currentItems: PersonalCourseItem[] = useMemo(() => {
    if (rosterView === 'dosen') return DOSEN_PERSONAL_SCHEDULE;
    if (rosterView === 'mahasiswa') return MAHASISWA_PERSONAL_SCHEDULE;
    return masterSchedule.map((s, idx) => {
      const sksVal = s.sks || 2;
      const parts = (s.timeLabel || s.time || '').split(' - ').map((x) => x.trim()).filter(Boolean);
      const rawStart = parts[0] || getSessionDefaultStartTime(s.sessionIndex || 1);
      const computedEnd = parts[1] || calculateEndTime(rawStart, sksVal);
      const formattedLabel = `${rawStart} - ${computedEnd}`;

      return {
        id: s.id || `sch-${idx}`,
        courseCode: s.courseCode,
        courseName: s.courseName,
        classLabel: s.classLabel || `Kelas ${s.className || 'A'}`,
        shortClass: s.className || (s.classLabel || '').replace(/^Kelas\s+/i, '').trim() || 'A',
        semester: s.semester,
        sks: sksVal,
        day: ((s.day || 'SENIN').toUpperCase()) as 'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT',
        sessionIndex: s.sessionIndex || 1,
        timeStart: rawStart,
        timeEnd: computedEnd,
        timeLabel: formattedLabel,
        roomCode: (s.roomName || '').split('(')[0].trim() || 'R-101',
        roomName: s.roomName,
        building: s.building || 'Gedung FTI',
        floor: s.floor || 1,
        capacity: (s as any).capacity || 60,
        lecturerName: s.primaryLecturer || s.lecturerName || 'Dosen Pengampu',
        allLecturers:
          s.lecturerName ||
          (s.lecturerNames && s.lecturerNames.length > 0 ? s.lecturerNames.join(' / ') : '') ||
          s.primaryLecturer ||
          'Dosen Pengampu',
        studentCount: s.studentCount,
        department: resolveDepartment(s.department, s.courseCode),
        type: 'Teori' as const,
      };
    });
  }, [rosterView, masterSchedule]);

  const deptCounts = useMemo(() => {
    return {
      SI: currentItems.filter((i) => i.department === 'SI').length,
      IF: currentItems.filter((i) => i.department === 'IF').length,
      TK: currentItems.filter((i) => i.department === 'TK').length,
    };
  }, [currentItems]);

  const deptScopedItems = useMemo(() => {
    if (rosterView !== 'master') return currentItems;
    return currentItems.filter((item) => item.department === selectedDept);
  }, [currentItems, rosterView, selectedDept]);

  const { semesterOptions, semesterCounts } = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const item of deptScopedItems) {
      if (typeof item.semester === 'number' && item.semester > 0) {
        counts[item.semester] = (counts[item.semester] || 0) + 1;
      }
    }
    const opts = Object.keys(counts)
      .map(Number)
      .sort((a, b) => a - b);
    return { semesterOptions: opts, semesterCounts: counts };
  }, [deptScopedItems]);

  const handleSelectDept = (dept: 'SI' | 'IF' | 'TK') => {
    setSelectedDept(dept);
    if (selectedSemester !== 'Semua') {
      const hasSemesterInNextDept = currentItems.some(
        (i) => i.department === dept && i.semester === selectedSemester
      );
      if (!hasSemesterInNextDept) {
        setSelectedSemester('Semua');
      }
    }
  };

  const sksCounts = useMemo(() => {
    const scoped = deptScopedItems.filter(
      (item) =>
        rosterView !== 'master' ||
        selectedSemester === 'Semua' ||
        item.semester === selectedSemester
    );
    return {
      Semua: scoped.length,
      1: scoped.filter((i) => i.sks === 1).length,
      2: scoped.filter((i) => i.sks === 2).length,
      3: scoped.filter((i) => i.sks === 3).length,
      4: scoped.filter((i) => i.sks === 4).length,
    };
  }, [deptScopedItems, rosterView, selectedSemester]);

  const filteredSchedule = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return deptScopedItems.filter((item) => {
      const matchesSemester =
        rosterView !== 'master' ||
        selectedSemester === 'Semua' ||
        item.semester === selectedSemester;
      const matchesSks = selectedSks === 'Semua' || item.sks === selectedSks;
      const matchesSearch =
        !q ||
        item.courseCode.toLowerCase().includes(q) ||
        item.courseName.toLowerCase().includes(q) ||
        item.lecturerName.toLowerCase().includes(q) ||
        (item.allLecturers || '').toLowerCase().includes(q) ||
        item.roomName.toLowerCase().includes(q);
      const matchesDay = filterDay === 'Semua' || item.day === filterDay;
      return matchesSemester && matchesSks && matchesSearch && matchesDay;
    });
  }, [deptScopedItems, rosterView, selectedSemester, selectedSks, searchTerm, filterDay]);

  const excelSortedSchedule = useMemo(() => {
    const dayRank: Record<string, number> = {
      SENIN: 1,
      SELASA: 2,
      RABU: 3,
      KAMIS: 4,
      JUMAT: 5,
    };
    const list = [...filteredSchedule];
    list.sort((a, b) => {
      let cmp = 0;
      switch (excelSort.key) {
        case 'courseCode':
          cmp = a.courseCode.localeCompare(b.courseCode);
          break;
        case 'courseName':
          cmp = a.courseName.localeCompare(b.courseName);
          break;
        case 'sks':
          cmp = a.sks - b.sks;
          break;
        case 'lecturer':
          cmp = (a.allLecturers || a.lecturerName).localeCompare(b.allLecturers || b.lecturerName);
          break;
        case 'semester':
          cmp = (a.semester || 99) - (b.semester || 99);
          break;
        case 'day':
          cmp = (dayRank[a.day] || 9) - (dayRank[b.day] || 9) || a.sessionIndex - b.sessionIndex;
          break;
        case 'no':
        default:
          cmp = (a.semester || 99) - (b.semester || 99) || a.courseCode.localeCompare(b.courseCode);
          break;
      }
      if (cmp === 0) {
        cmp = (a.shortClass || a.classLabel).localeCompare(b.shortClass || b.classLabel);
      }
      return excelSort.dir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredSchedule, excelSort]);

  const toggleExcelSort = (
    key: 'no' | 'courseCode' | 'courseName' | 'sks' | 'lecturer' | 'semester' | 'day'
  ) => {
    setExcelSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  };

  const handleExportExcelCsv = () => {
    const escapeCsv = (val: string | number | undefined) => {
      const str = String(val ?? '');
      return `"${str.replace(/"/g, '""')}"`;
    };
    const headers = [
      'NO',
      'KODE MATKUL',
      'NAMA MATKUL',
      'SKS',
      'NAMA DOSEN PENGAMPU',
      'KELAS',
      'SEMESTER',
      'HARI',
      'WAKTU',
      'RUANG',
      'JUMLAH MHS',
    ];
    const rows = excelSortedSchedule.map((item, idx) => [
      idx + 1,
      item.courseCode,
      item.courseName,
      item.sks,
      item.allLecturers || item.lecturerName,
      item.shortClass || item.classLabel,
      item.semester ? `Semester ${item.semester}` : '-',
      item.day.charAt(0) + item.day.slice(1).toLowerCase(),
      item.timeLabel,
      item.roomCode || item.roomName,
      item.studentCount ?? '',
    ]);
    const csvContent =
      '\uFEFF' + [headers, ...rows].map((r) => r.map(escapeCsv).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const semPart = selectedSemester === 'Semua' ? 'Semua-Sem' : `Sem-${selectedSemester}`;
    link.download = `Master-Jadwal-${selectedDept}-${semPart}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`File Excel (.CSV) jadwal ${selectedDept} berhasil diunduh.`, 'success');
  };

  const masterMetrics = useMemo(() => {
    const hardCount = validationReport
      ? validationReport.summary.hard_conflicts_count
      : conflicts.filter((c) => !c.isResolved && c.severity === 'hard').length;
    const softCount = validationReport
      ? validationReport.summary.soft_warnings_count
      : conflicts.filter((c) => !c.isResolved && c.severity === 'soft').length;
    const totalMaster = masterSchedule.length;
    const compliancePct = validationReport
      ? validationReport.summary.compliance_pct
      : totalMaster > 0
        ? Math.max(0, Math.round(((totalMaster - hardCount) / totalMaster) * 1000) / 10)
        : 100;
    const activeRooms = rooms.filter(
      (r) => r.status !== 'Pemeliharaan' && r.status !== 'Pemeliharaan Berkala'
    ).length;
    const totalSlots = Math.max(1, activeRooms) * 5 * CAMPUS_SESSION_SLOTS.length;
    const occupancyPct = Math.min(100, Math.round((totalMaster / totalSlots) * 1000) / 10);

    let authTitle = 'Menunggu Persetujuan';
    let authSub = validationReport?.version_number
      ? `Draft Versi #${validationReport.version_number}`
      : 'Siap Divalidasi Admin';
    let authTone = 'text-amber-700';

    if (scheduleApprovalStatus === 'Resmi') {
      authTitle = 'Resmi Diterbitkan';
      authSub = 'Roster Resmi Berlaku';
      authTone = 'text-emerald-700';
    } else if (scheduleApprovalStatus === 'Disetujui') {
      authTitle = 'Disetujui Wadek I';
      authSub = 'Siap Dipublikasikan';
      authTone = 'text-emerald-700';
    } else if (scheduleApprovalStatus === 'Revisi') {
      authTitle = 'Perlu Revisi';
      authSub = 'Catatan dari Wadek I';
      authTone = 'text-rose-700';
    }

    return {
      hardCount,
      softCount,
      compliancePct,
      activeRooms,
      totalMaster,
      occupancyPct,
      authTitle,
      authSub,
      authTone,
    };
  }, [validationReport, conflicts, masterSchedule.length, rooms, scheduleApprovalStatus]);

  const totalSks = currentItems.reduce((acc, curr) => acc + curr.sks, 0);
  const totalCourses = currentItems.length;

  const handleOpenAdjustSksModal = (item?: PersonalCourseItem | null) => {
    if (!canAdminEditMaster) {
      showToast('Hanya Admin yang diizinkan mengubah atau menukar jadwal secara manual.', 'error');
      return;
    }
    const target = item || (filteredSchedule.length > 0 ? filteredSchedule[0] : currentItems[0]) || null;
    if (isAdjustSksModalOpen && isPickingFromGrid && target && adjustTargetId && target.id !== adjustTargetId) {
      setPickedOpponentId(target.id);
      setPreviewOpponentId(target.id);
      setIsPickingFromGrid(false);
      return;
    }
    setAdjustTargetId(target ? target.id : null);
    setPickedOpponentId(null);
    setPreviewOpponentId(null);
    setIsPickingFromGrid(false);
    setIsAdjustSksModalOpen(true);
  };

  const handleCloseAdjustDrawer = () => {
    setIsAdjustSksModalOpen(false);
    setIsPickingFromGrid(false);
    setPickedOpponentId(null);
    setPreviewOpponentId(null);
  };

  const handleSaveAdjustSks = async (
    scheduleId: string,
    params: {
      sks: number;
      day: string;
      sessionIndex: number;
      startTime: string;
      endTime: string;
      roomId?: string;
      roomName?: string;
      reason?: string;
    }
  ): Promise<boolean> => {
    return updateScheduleClassSksAndTime(scheduleId, params);
  };

  const handleSwapScheduleItems = async (
    scheduleIdA: string,
    scheduleIdB: string,
    params?: { aSks?: number; reason?: string }
  ): Promise<boolean> => {
    return swapScheduleItems(scheduleIdA, scheduleIdB, params);
  };

  const handleOpenNavForRoom = (roomName: string) => {
    const foundRoom =
      rooms.find(
        (r) =>
          r.name.toLowerCase().includes(roomName.toLowerCase()) ||
          r.code.toLowerCase().includes(roomName.toLowerCase())
      ) || rooms[0];
    setSelectedRoomForNav(foundRoom);
    setIsRoomNavModalOpen(true);
  };

  const handlePrint = () => {
    const docTitle =
      rosterView === 'dosen'
        ? 'Jadwal Mengajar Pribadi Dosen FTI'
        : rosterView === 'mahasiswa'
          ? 'Kartu Rencana Studi & Jadwal Kuliah Mahasiswa'
          : 'Master Jadwal Perkuliahan Terpadu FTI';
    showToast(`Menyiapkan format cetak: ${docTitle}...`, 'info');
    window.print();
  };

  const handleExport = () => {
    showToast('Mengekspor jadwal perkuliahan ke format PDF...', 'success');
  };

  // Render the action button column in both views
  const renderCourseActions = (item: PersonalCourseItem) => {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Navigate to room */}
        <button
          onClick={() => handleOpenNavForRoom(item.roomName)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          title="Panduan arah & denah ruang"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Rute</span>
        </button>

        {/* Edit / Tukar Jadwal Manual – HANYA ADMIN */}
        {canAdminEditMaster && (
          <button
            onClick={() => handleOpenAdjustSksModal(item)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
            title="Ubah jadwal manual atau tukar posisi dengan kelas lain"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>
              {isAdjustSksModalOpen && isPickingFromGrid && item.id !== adjustTargetId
                ? 'Pilih Lawan'
                : 'Ubah / Tukar'}
            </span>
          </button>
        )}

        {/* PRIMARY: Ganti Jadwal Semester – HANYA UNTUK DOSEN */}
        {isDosen && (
          <button
            onClick={() => setCariRuangTarget(item)}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-[#082c78] hover:bg-blue-800 rounded-lg transition-colors shadow-xs"
            title="Ganti jadwal keseluruhan pertemuan semester (setelah diskusi dengan mahasiswa)"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Ganti Jadwal Semester</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">

      {/* ── Cari Ruang Kosong Modal ── */}
      {cariRuangTarget && isDosen && (
        <CariRuangKosongModal
          course={cariRuangTarget}
          userRole={rosterView}
          userProdi={userProdi}
          onClose={() => setCariRuangTarget(null)}
          showToast={showToast}
        />
      )}

      {/* ── Panel Edit & Tukar Jadwal Manual (Khusus Admin) ── */}
      <PenyesuaianSksModal
        isOpen={isAdjustSksModalOpen && canAdminEditMaster}
        onClose={handleCloseAdjustDrawer}
        isAdmin={isAdmin}
        targetCourseId={adjustTargetId}
        schedule={masterSchedule}
        rooms={rooms}
        pickedOpponentId={pickedOpponentId}
        isPickingFromGrid={isPickingFromGrid}
        onTogglePickFromGrid={(active) => setIsPickingFromGrid(active)}
        onTargetCourseChange={(id) => {
          setAdjustTargetId(id);
          setPickedOpponentId(null);
          setPreviewOpponentId(null);
        }}
        onPreviewOpponentChange={(id) => setPreviewOpponentId(id)}
        onSave={handleSaveAdjustSks}
        onSwap={handleSwapScheduleItems}
      />

      {/* ── Top Header ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
            <span className="bg-blue-100 px-2 py-0.5 rounded font-mono">
              {rosterView === 'dosen'
                ? 'JADWAL MENGAJAR PRIBADI'
                : rosterView === 'mahasiswa'
                  ? 'KARTU RENCANA STUDI (KRS)'
                  : 'MASTER ROSTER TERPUSAT'}
            </span>
            <span>•</span>
            <span className="text-slate-500">Semester Ganjil 2024/2025</span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {rosterView === 'dosen'
              ? `Jadwal Mengajar — ${currentUser.name || 'Dr. Eng. Rahmad, M.T.'}`
              : rosterView === 'mahasiswa'
                ? `Jadwal Kuliah Pribadi — ${currentUser.name || 'Faris Alfath'}`
                : 'Jadwal Perkuliahan Terpadu FTI'}
          </h1>

          <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
            {rosterView === 'dosen'
              ? 'Roster resmi pengajaran dosen terverifikasi. Dosen dapat mengajukan perubahan jadwal keseluruhan semester setelah berdiskusi dan bersepakat dengan mahasiswa rombel.'
              : rosterView === 'mahasiswa'
                ? 'Jadwal KRS aktif Semester Ganjil 2024/2025 (Hanya Lihat). Mahasiswa yang ingin mencari ruang kelas pengganti per pertemuan dapat membukanya melalui menu Ketersediaan Ruang (Heatmap).'
                : 'Master jadwal perkuliahan terintegrasi seluruh departemen FTI.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Cetak {rosterView === 'mahasiswa' ? 'KRS' : 'Jadwal'}</span>
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#082c78] hover:bg-blue-900 rounded-xl shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Unduh PDF</span>
          </button>
        </div>
      </div>

      {/* ── Mode Switcher Bar ── */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-200">
        <div className="flex items-center gap-1.5 text-xs">
          {currentRole === 'admin' ? (
            <>
              <span className="font-bold text-slate-600 px-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Simulasi Tampilan Peran:</span>
              </span>
              <div className="flex items-center bg-white p-1 rounded-xl shadow-2xs border border-slate-200">
                <button
                  onClick={() => setRosterView('dosen')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${rosterView === 'dosen' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Dosen Pribadi</span>
                </button>
                <button
                  onClick={() => setRosterView('mahasiswa')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${rosterView === 'mahasiswa' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Mahasiswa (KRS)</span>
                </button>
                <button
                  onClick={() => setRosterView('master')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${rosterView === 'master' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Master FTI</span>
                </button>
              </div>
            </>
          ) : currentRole === 'mahasiswa' ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-600 px-2 flex items-center gap-1">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>Mode Tampilan:</span>
              </span>
              <span className="bg-white px-3 py-1.5 rounded-xl shadow-2xs border border-slate-200 font-bold text-blue-700 text-xs flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Kartu Rencana Studi (KRS Mahasiswa) — Hanya Lihat</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-600 px-2 flex items-center gap-1">
                {rosterView === 'dosen' ? <User className="w-4 h-4 text-blue-600" /> : <Layers className="w-4 h-4 text-blue-600" />}
                <span>Mode Tampilan:</span>
              </span>
              <span className="bg-white px-3 py-1.5 rounded-xl shadow-2xs border border-slate-200 font-bold text-blue-700 text-xs flex items-center gap-1.5">
                {rosterView === 'dosen' ? <User className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                <span>{rosterView === 'dosen' ? 'Jadwal Mengajar Pribadi Dosen' : 'Master Jadwal FTI — Hanya Lihat'}</span>
              </span>
            </div>
          )}
        </div>

        {/* Quick note about the button */}
        {canAdminEditMaster ? (
          <div className="text-xs text-slate-600 flex items-center gap-1.5 px-2">
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>
              Admin dapat memindahkan atau menukar posisi jadwal melalui tombol <strong className="text-blue-800">Ubah / Tukar</strong>. Perubahan hanya tersimpan jika bebas bentrok.
            </span>
          </div>
        ) : isDosen ? (
          <div className="text-xs text-slate-500 flex items-center gap-1.5 px-2">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>Dosen dapat mengganti jadwal keseluruhan pertemuan setelah diskusi dengan mahasiswa melalui tombol <strong className="text-blue-700">Ganti Jadwal Semester</strong>.</span>
          </div>
        ) : (
          <div className="text-xs text-slate-500 flex items-center gap-1.5 px-2">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Tampilan jadwal bersifat hanya lihat (read-only). Hanya Admin yang memiliki hak ubah dan tukar jadwal master.</span>
          </div>
        )}
      </div>

      {/* ── 4 Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {rosterView === 'dosen' ? (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Beban BKD Mengajar</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{totalSks} SKS</div>
              <div className="text-xs text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Memenuhi BKD (Max 12 SKS)</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kelas Diampu</div>
              <div className="text-2xl font-black text-blue-700 mt-1">{totalCourses} Kelas</div>
              <div className="text-xs text-slate-500 mt-0.5">3 Kuliah Teori • 1 Bimbingan TA</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mahasiswa Terdaftar</div>
              <div className="text-2xl font-black text-indigo-700 mt-1">144 Mhs</div>
              <div className="text-xs text-slate-500 mt-0.5">Total peserta rombel aktif</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hari Mengajar</div>
              <div className="text-2xl font-black text-slate-900 mt-1">4 Hari</div>
              <div className="text-xs text-slate-500 mt-0.5">Senin, Rabu, Kamis & Jumat</div>
            </div>
          </>
        ) : rosterView === 'mahasiswa' ? (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total SKS Diambil</div>
              <div className="text-2xl font-black text-blue-700 mt-1">{totalSks} SKS</div>
              <div className="text-xs text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                <span>KRS Disetujui Dosen PA</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mata Kuliah Aktif</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{totalCourses} MK</div>
              <div className="text-xs text-slate-500 mt-0.5">6 Teori • 1 Praktikum Lab</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dosen PA</div>
              <div className="text-sm font-black text-slate-800 mt-1 truncate">Prof. Surya Afnarius</div>
              <div className="text-xs text-slate-500 mt-0.5">Status Akademik: Lancar</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hari Perkuliahan</div>
              <div className="text-2xl font-black text-slate-900 mt-1">5 Hari</div>
              <div className="text-xs text-slate-500 mt-0.5">Senin s.d. Jumat</div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Seksi Terjadwal ({selectedDept})
                {selectedSemester !== 'Semua' ? ` · Sem ${selectedSemester}` : ''}
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
                {filteredSchedule.length} Kelas
              </div>
              <div className="text-xs text-slate-500 mt-0.5 truncate">
                {getDepartmentLabel(selectedDept)}
                {selectedSks !== 'Semua' ? ` · ${selectedSks} SKS` : ''}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kepatuhan Jadwal</div>
              <div
                className={`text-2xl font-black mt-1 tabular-nums ${
                  masterMetrics.hardCount === 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {masterMetrics.compliancePct}% Bebas Bentrok
              </div>
              <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                {masterMetrics.hardCount} Bentrok Wajib · {masterMetrics.softCount} Peringatan
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Okupansi Ruang FTI</div>
              <div className="text-2xl font-black text-blue-700 mt-1 tabular-nums">
                {masterMetrics.occupancyPct}%
              </div>
              <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                {masterMetrics.totalMaster} kelas di {masterMetrics.activeRooms} ruang aktif
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Otorisasi</div>
              <div className={`text-sm font-black mt-1 ${masterMetrics.authTone}`}>
                {masterMetrics.authTitle}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{masterMetrics.authSub}</div>
            </div>
          </>
        )}
      </div>

      {/* ── Jurusan Tabs + Filter Toolbar ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {rosterView === 'master' ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['SI', 'IF', 'TK'] as const).map((dept) => {
                const isSelected = selectedDept === dept;
                return (
                  <button
                    key={dept}
                    onClick={() => handleSelectDept(dept)}
                    className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-2 ${
                      isSelected
                        ? 'bg-[#082c78] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>
                      {dept === 'SI'
                        ? 'Sistem Informasi'
                        : dept === 'IF'
                          ? 'Informatika'
                          : 'Teknik Komputer'}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-white text-slate-700'
                      }`}
                    >
                      {deptCounts[dept]}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Tampilan Roster Pribadi</span>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <div
              className="flex items-center bg-slate-100 p-1 rounded-xl w-fit"
              role="tablist"
              aria-label="Pilih Versi Tampilan Jadwal"
            >
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'calendar'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{canAdminEditMaster ? 'Versi Kalender' : 'Kalender'}</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'table'
                    ? canAdminEditMaster
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {canAdminEditMaster ? (
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                ) : (
                  <TableIcon className="w-3.5 h-3.5" />
                )}
                <span>{canAdminEditMaster ? 'Versi Tabel Excel' : 'Tabel'}</span>
              </button>
            </div>

            {canAdminEditMaster && (
              <button
                onClick={() => handleOpenAdjustSksModal(null)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#082c78] hover:bg-blue-900 rounded-xl transition-all shadow-xs shrink-0"
                title="Ubah jadwal secara manual atau tukar jadwal antar kelas tanpa bentrok"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Ubah / Tukar Jadwal</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Row 2: Semester Pills + Pencarian, SKS, & Hari ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
          {rosterView === 'master' && semesterOptions.length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-500 mr-1 font-medium">Semester:</span>
              <button
                onClick={() => setSelectedSemester('Semua')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 ${
                  selectedSemester === 'Semua'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>Semua</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums ${
                    selectedSemester === 'Semua' ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {deptCounts[selectedDept]}
                </span>
              </button>
              {semesterOptions.map((sem) => {
                const isSelected = selectedSemester === sem;
                return (
                  <button
                    key={sem}
                    onClick={() => setSelectedSemester(sem)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>Sem {sem}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums ${
                        isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {semesterCounts[sem]}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Filter Cepat Jadwal</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 flex-1 lg:justify-end">
            <div className="relative flex-1 min-w-[200px] lg:max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari mata kuliah, ruang, atau dosen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
              />
            </div>

            <select
              value={String(selectedSks)}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedSks(val === 'Semua' ? 'Semua' : (Number(val) as 1 | 2 | 3 | 4));
              }}
              aria-label="Filter Bobot SKS"
              className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:border-blue-500"
            >
              <option value="Semua">Semua SKS ({sksCounts.Semua})</option>
              {([1, 2, 3, 4] as const).map((sksVal) => (
                <option key={sksVal} value={String(sksVal)}>
                  {sksVal} SKS · {sksVal * 50}m ({sksCounts[sksVal]})
                </option>
              ))}
            </select>

            <select
              value={filterDay}
              onChange={(e) => setFilterDay(e.target.value)}
              aria-label="Filter Hari"
              className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:border-blue-500"
            >
              <option value="Semua">Semua Hari</option>
              {['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'].map((d) => (
                <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Main View ── */}
      {viewMode === 'calendar' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 text-left">
                  <th className="p-3 w-32 border-r border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>HARI / SESI</span>
                    </div>
                  </th>
                  {sessionColumns.map((col) => (
                    <th key={col.id} className="p-3 border-r border-slate-200 min-w-[220px]">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {days.map((day) => {
                  const dayItems = filteredSchedule.filter((item) => item.day === day);
                  return (
                    <tr key={day} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 border-r border-slate-200 bg-slate-50/70 align-top">
                        <div className="font-extrabold text-sm text-slate-800">{day}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{dayItems.length} Sesi Terjadwal</div>
                        <span className="inline-block mt-3 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {day === 'JUMAT' ? 'Hari Pendek' : 'Hari Kuliah'}
                        </span>
                      </td>
                      {sessionColumns.map((session) => {
                        const classesInSlot = dayItems.filter((item) => item.sessionIndex === session.id);
                        const isFridayBreak = day === 'JUMAT' && session.id === 2;

                        return (
                          <td key={session.id} className="p-2 border-r border-slate-200 align-top min-h-[110px]">
                            {isFridayBreak && classesInSlot.length === 0 ? (
                              <div className="h-full min-h-[95px] rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-center p-2">
                                <span className="text-[11px] text-slate-400 italic">Persiapan Jumat</span>
                              </div>
                            ) : classesInSlot.length > 0 ? (
                              <div className="space-y-2">
                                {classesInSlot.map((classInSlot) => {
                                  const isEditingTarget = isAdjustSksModalOpen && adjustTargetId === classInSlot.id;
                                  const isSwapCandidate = isAdjustSksModalOpen && previewOpponentId === classInSlot.id;
                                  const canPickClick = canAdminEditMaster && isAdjustSksModalOpen && isPickingFromGrid && !isEditingTarget;
                                  return (
                                  <div
                                    key={classInSlot.id}
                                    onClick={canPickClick ? () => handleOpenAdjustSksModal(classInSlot) : undefined}
                                    className={`p-2.5 rounded-xl border bg-white shadow-2xs space-y-2 transition-all ${
                                      isEditingTarget
                                        ? 'ring-2 ring-blue-600 border-blue-500 bg-blue-50/30'
                                        : isSwapCandidate
                                          ? 'ring-2 ring-amber-500 border-amber-400 bg-amber-50/40'
                                          : canPickClick
                                            ? 'border-amber-300 cursor-pointer hover:ring-2 hover:ring-amber-400 hover:bg-amber-50/30'
                                            : 'border-slate-200 hover:border-blue-300'
                                    }`}
                                  >
                                    {(isEditingTarget || isSwapCandidate) && (
                                      <div className="flex justify-end">
                                        <span
                                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            isEditingTarget
                                              ? 'bg-blue-700 text-white'
                                              : 'bg-amber-500 text-white'
                                          }`}
                                        >
                                          {isEditingTarget ? 'Sedang Diatur' : 'Target Tukar'}
                                        </span>
                                      </div>
                                    )}
                                    {/* Course header */}
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-mono text-[11px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                        {classInSlot.courseCode}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <span
                                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${classInSlot.department === 'SI'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : classInSlot.department === 'IF'
                                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                                              : 'bg-purple-50 text-purple-700 border-purple-200'
                                            }`}
                                        >
                                          {classInSlot.department}
                                        </span>
                                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                          {classInSlot.sks} SKS
                                        </span>
                                      </div>
                                    </div>

                                    {/* Course name */}
                                    <div className="font-bold text-slate-900 text-xs leading-snug">
                                      {classInSlot.courseName}
                                    </div>

                                    {/* Jam & Durasi Menit */}
                                    <div className="text-[10px] font-semibold text-slate-600 flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                      <Clock className="w-3 h-3 text-blue-600 shrink-0" />
                                      <span className="font-mono">{classInSlot.timeLabel}</span>
                                      <span className="text-slate-400 font-normal">({classInSlot.sks * 50}m)</span>
                                    </div>

                                    {/* Class & count */}
                                    <div className="text-[11px] text-slate-500">
                                      {classInSlot.classLabel}
                                      {classInSlot.semester ? ` · Sem ${classInSlot.semester}` : ''}
                                      {classInSlot.studentCount ? ` • ${classInSlot.studentCount} Mhs` : ''}
                                    </div>

                                    {/* Room info */}
                                    <div className="flex items-center justify-between gap-1 text-[11px]">
                                      <div className="flex items-center gap-1">
                                        <Building className="w-3 h-3 text-slate-400 shrink-0" />
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenNavForRoom(classInSlot.roomName);
                                          }}
                                          className="font-semibold text-blue-700 hover:underline truncate max-w-[105px]"
                                          title="Klik untuk navigasi ruang"
                                        >
                                          {classInSlot.roomCode || classInSlot.roomName.split('(')[0].trim()}
                                        </button>
                                      </div>
                                      {canAdminEditMaster && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenAdjustSksModal(classInSlot);
                                          }}
                                          className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-800 hover:text-blue-950 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200 transition-colors"
                                        >
                                          <ArrowLeftRight className="w-2.5 h-2.5" />
                                          <span>{canPickClick ? 'Pilih Lawan' : 'Ubah / Tukar'}</span>
                                        </button>
                                      )}
                                    </div>

                                    {/* Dosen (for mahasiswa view) */}
                                    {rosterView === 'mahasiswa' && (
                                      <div className="text-[10px] text-slate-500 truncate">
                                        {classInSlot.lecturerName}
                                      </div>
                                    )}

                                    {/* Status badge */}
                                    {classInSlot.attendanceStatus && (
                                      <div className="text-[10px] font-semibold text-slate-500 bg-slate-50 rounded px-1.5 py-0.5 inline-block">
                                        {classInSlot.attendanceStatus}
                                      </div>
                                    )}

                                    {/* CTA: Ganti Jadwal – HANYA Dosen (keseluruhan pertemuan semester setelah diskusi) */}
                                    {isDosen && (
                                      <div className="pt-1.5 border-t border-slate-100">
                                        <button
                                          onClick={() => setCariRuangTarget(classInSlot)}
                                          className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-bold text-white bg-[#082c78] hover:bg-blue-800 rounded-lg transition-colors"
                                        >
                                          <Search className="w-3 h-3" />
                                          <span>Ganti Jadwal Semester</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="h-full min-h-[95px] rounded-xl border border-dashed border-slate-100 flex items-center justify-center">
                                <span className="text-[11px] text-slate-300 italic">Bebas Kuliah</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : canAdminEditMaster ? (
        /* Admin Microsoft Excel-Style Roster View */
        <div className="bg-white rounded-2xl border border-slate-300 shadow-xs overflow-hidden">
          {/* Excel Top Workbook Bar */}
          <div className="bg-[#185c37] text-white px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileSpreadsheet className="w-4 h-4 text-emerald-200 shrink-0" />
              <span className="text-xs font-bold truncate">
                Master_Jadwal_{selectedDept}_Ganjil_2026.xlsx —{' '}
                {selectedDept === 'SI'
                  ? 'Sistem Informasi'
                  : selectedDept === 'IF'
                    ? 'Informatika'
                    : 'Teknik Komputer'}
              </span>
              <span className="text-[11px] bg-white/15 px-2 py-0.5 rounded font-medium shrink-0 tabular-nums">
                {excelSortedSchedule.length} baris
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setExcelSort({ key: 'no', dir: 'asc' })}
                className="text-[11px] font-semibold bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-colors"
                title="Kembalikan urutan default (Semester & Kode MK)"
              >
                Urut Default
              </button>
              <button
                type="button"
                onClick={handleExportExcelCsv}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-white text-[#185c37] hover:bg-emerald-50 px-3 py-1 rounded-lg transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Excel (.CSV)</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs text-slate-800">
              <thead>
                {/* Referensi Kolom ala Excel (A - L) */}
                <tr className="bg-slate-100 text-[10px] font-mono text-slate-400 text-center">
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map((colLetter) => (
                    <th
                      key={colLetter}
                      className="border border-slate-300 py-1 px-2 font-medium select-none"
                    >
                      {colLetter}
                    </th>
                  ))}
                </tr>

                {/* Header Kolom Utama — diawali NO, Kode Matkul, Nama Matkul, SKS, Nama Dosen Pengampu */}
                <tr className="bg-slate-200/75 text-[11px] font-extrabold text-slate-800 uppercase tracking-wide">
                  <th className="border border-slate-300 px-2.5 py-2 text-center w-11">NO</th>
                  <th className="border border-slate-300 px-2.5 py-2 text-left whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleExcelSort('courseCode')}
                      className="inline-flex items-center gap-1 hover:text-[#185c37]"
                    >
                      <span>KODE MATKUL</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </button>
                  </th>
                  <th className="border border-slate-300 px-2.5 py-2 text-left min-w-[200px]">
                    <button
                      type="button"
                      onClick={() => toggleExcelSort('courseName')}
                      className="inline-flex items-center gap-1 hover:text-[#185c37]"
                    >
                      <span>NAMA MATKUL</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </button>
                  </th>
                  <th className="border border-slate-300 px-2.5 py-2 text-center whitespace-nowrap w-16">
                    <button
                      type="button"
                      onClick={() => toggleExcelSort('sks')}
                      className="inline-flex items-center gap-1 hover:text-[#185c37]"
                    >
                      <span>SKS</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </button>
                  </th>
                  <th className="border border-slate-300 px-2.5 py-2 text-left min-w-[210px]">
                    <button
                      type="button"
                      onClick={() => toggleExcelSort('lecturer')}
                      className="inline-flex items-center gap-1 hover:text-[#185c37]"
                    >
                      <span>NAMA DOSEN PENGAMPU</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </button>
                  </th>
                  <th className="border border-slate-300 px-2.5 py-2 text-center whitespace-nowrap w-16">
                    KELAS
                  </th>
                  <th className="border border-slate-300 px-2.5 py-2 text-center whitespace-nowrap w-16">
                    <button
                      type="button"
                      onClick={() => toggleExcelSort('semester')}
                      className="inline-flex items-center gap-1 hover:text-[#185c37]"
                    >
                      <span>SEM</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </button>
                  </th>
                  <th className="border border-slate-300 px-2.5 py-2 text-left whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleExcelSort('day')}
                      className="inline-flex items-center gap-1 hover:text-[#185c37]"
                    >
                      <span>HARI</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </button>
                  </th>
                  <th className="border border-slate-300 px-2.5 py-2 text-left whitespace-nowrap">
                    WAKTU
                  </th>
                  <th className="border border-slate-300 px-2.5 py-2 text-left whitespace-nowrap">
                    RUANG
                  </th>
                  <th className="border border-slate-300 px-2.5 py-2 text-center whitespace-nowrap w-16">
                    MHS
                  </th>
                  <th className="border border-slate-300 px-2.5 py-2 text-center whitespace-nowrap">
                    AKSI
                  </th>
                </tr>
              </thead>

              <tbody>
                {excelSortedSchedule.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="border border-slate-300 p-10 text-center text-xs text-slate-500 bg-white"
                    >
                      Tidak ada baris jadwal yang cocok dengan filter jurusan, semester, atau pencarian saat ini.
                    </td>
                  </tr>
                ) : (
                  excelSortedSchedule.map((item, idx) => {
                    const isEditingTarget = isAdjustSksModalOpen && adjustTargetId === item.id;
                    const isSwapCandidate = isAdjustSksModalOpen && previewOpponentId === item.id;
                    const isPickOpponent =
                      isAdjustSksModalOpen && isPickingFromGrid && item.id !== adjustTargetId;
                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isEditingTarget
                            ? 'bg-blue-50'
                            : isSwapCandidate
                              ? 'bg-amber-50'
                              : idx % 2 === 0
                                ? 'bg-white hover:bg-emerald-50/45'
                                : 'bg-slate-50/70 hover:bg-emerald-50/45'
                        }`}
                      >
                        <td className="border border-slate-300 px-2.5 py-2 text-center font-mono text-[11px] font-semibold text-slate-500 bg-slate-100/70 tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-300 px-2.5 py-2 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {item.courseCode}
                        </td>
                        <td className="border border-slate-300 px-2.5 py-2 font-semibold text-slate-900">
                          {item.courseName}
                        </td>
                        <td className="border border-slate-300 px-2.5 py-2 text-center font-bold text-slate-800 tabular-nums">
                          {item.sks}
                        </td>
                        <td className="border border-slate-300 px-2.5 py-2 text-slate-700 leading-snug">
                          {item.allLecturers || item.lecturerName}
                        </td>
                        <td className="border border-slate-300 px-2.5 py-2 text-center font-semibold text-slate-800 whitespace-nowrap">
                          {item.shortClass || item.classLabel}
                        </td>
                        <td className="border border-slate-300 px-2.5 py-2 text-center text-slate-700 tabular-nums whitespace-nowrap">
                          {item.semester ?? '-'}
                        </td>
                        <td className="border border-slate-300 px-2.5 py-2 font-medium text-slate-800 whitespace-nowrap">
                          {item.day.charAt(0) + item.day.slice(1).toLowerCase()}
                        </td>
                        <td className="border border-slate-300 px-2.5 py-2 font-mono text-[11px] text-slate-700 whitespace-nowrap tabular-nums">
                          {item.timeLabel}
                        </td>
                        <td className="border border-slate-300 px-2.5 py-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenNavForRoom(item.roomName)}
                            className="font-mono font-semibold text-blue-700 hover:underline"
                            title="Lihat denah & detail ruang"
                          >
                            {item.roomCode || item.roomName.split('(')[0].trim()}
                          </button>
                        </td>
                        <td className="border border-slate-300 px-2.5 py-2 text-center text-slate-700 tabular-nums whitespace-nowrap">
                          {item.studentCount ?? '-'}
                        </td>
                        <td className="border border-slate-300 px-2 py-1.5 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenAdjustSksModal(item)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md border transition-colors ${
                              isPickOpponent
                                ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                            }`}
                          >
                            <ArrowLeftRight className="w-3 h-3" />
                            <span>{isPickOpponent ? 'Pilih Lawan' : 'Ubah / Tukar'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Excel Bottom Sheet Tabs + Status Bar */}
          <div className="bg-slate-100 border-t border-slate-300 px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-slate-500 font-semibold mr-1.5">Sheet:</span>
              {(['SI', 'IF', 'TK'] as const).map((dept) => {
                const active = selectedDept === dept;
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => handleSelectDept(dept)}
                    className={`px-3 py-1 rounded-md font-bold border transition-colors ${
                      active
                        ? 'bg-white text-[#185c37] border-slate-300 shadow-2xs'
                        : 'bg-slate-200/70 text-slate-600 border-transparent hover:bg-slate-200'
                    }`}
                  >
                    {dept === 'SI' ? 'SI' : dept === 'IF' ? 'IF' : 'TK'} ({deptCounts[dept]})
                  </button>
                );
              })}
            </div>

            <div className="text-slate-600 font-medium tabular-nums">
              Total Tampil: <strong className="text-slate-900">{excelSortedSchedule.length} Kelas</strong> ·{' '}
              <strong className="text-slate-900">
                {excelSortedSchedule.reduce((sum, r) => sum + r.sks, 0)} SKS
              </strong>
            </div>
          </div>
        </div>
      ) : (
        /* Table Detail View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5">Hari & Jam</th>
                  <th className="p-3.5">Kode MK</th>
                  <th className="p-3.5">Mata Kuliah</th>
                  <th className="p-3.5">Kelas & SKS</th>
                  <th className="p-3.5">Ruang Kuliah</th>
                  <th className="p-3.5">{rosterView === 'dosen' ? 'Peserta' : 'Dosen Pengampu'}</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSchedule.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-xs text-slate-500">
                      Tidak ada kelas yang cocok dengan filter jurusan, semester, atau pencarian saat ini.
                    </td>
                  </tr>
                ) : (
                  filteredSchedule.map((item) => {
                  const isEditingTarget = isAdjustSksModalOpen && adjustTargetId === item.id;
                  const isSwapCandidate = isAdjustSksModalOpen && previewOpponentId === item.id;
                  return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isEditingTarget
                        ? 'bg-blue-50/70'
                        : isSwapCandidate
                          ? 'bg-amber-50/70'
                          : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="p-3.5 font-bold text-slate-800">
                      <div>{item.day.charAt(0) + item.day.slice(1).toLowerCase()}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{item.timeLabel}</div>
                      <div className="text-[10px] text-blue-600 font-semibold mt-0.5">Sesi {item.sessionIndex}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-blue-700">{item.courseCode}</div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border inline-block mt-0.5 ${item.department === 'SI'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.department === 'IF'
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                      >
                        {item.department === 'SI' ? 'SI' : item.department === 'IF' ? 'IF' : 'TK'}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-900">
                      <div>{item.courseName}</div>
                      <span className={`text-[10px] font-normal px-1.5 py-0.5 rounded mt-0.5 inline-block ${item.type === 'Praktikum' ? 'bg-purple-50 text-purple-700' :
                        item.type === 'Seminar' ? 'bg-orange-50 text-orange-700' :
                          'bg-sky-50 text-sky-700'
                        }`}>{item.type}</span>
                    </td>
                    <td className="p-3.5 text-slate-700">
                      <div className="font-semibold">
                        {item.classLabel}
                        {item.semester ? ` · Sem ${item.semester}` : ''}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {item.sks} SKS
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          ({item.sks * 50} Menit)
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <button
                        onClick={() => handleOpenNavForRoom(item.roomName)}
                        className="text-blue-700 hover:underline font-semibold flex items-center gap-1"
                      >
                        <Building className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-mono">{item.roomCode || item.roomName.split('(')[0].trim()}</span>
                      </button>
                      <div className="text-[10px] text-slate-400 mt-0.5">Lt. {item.floor} • {item.building}</div>
                      <div className="text-[10px] text-slate-400">Kapasitas: {item.capacity}</div>
                    </td>
                    <td className="p-3.5 text-slate-700">
                      {rosterView === 'dosen' ? (
                        <div>
                          <div className="font-semibold">{item.studentCount} Mahasiswa</div>
                          <div className="text-[10px] text-slate-400">dari {item.capacity} kapasitas</div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-semibold text-slate-900 text-xs">{item.lecturerName}</div>
                          {item.lecturerNip && <div className="text-[10px] text-slate-400">NIP: {item.lecturerNip}</div>}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      {item.attendanceStatus && (
                        <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                          {item.attendanceStatus}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">{renderCourseActions(item)}</td>
                  </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Bottom Banner ── */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          {rosterView === 'master' && masterMetrics.hardCount > 0 ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>
            {rosterView === 'dosen'
              ? 'Jadwal mengajar telah tersinkronisasi otomatis dengan BKD FTI Unand. Dosen dapat mengganti jadwal keseluruhan pertemuan semester setelah diskusi dengan mahasiswa.'
              : rosterView === 'mahasiswa'
                ? 'Jadwal kuliah diambil dari KRS aktif (Hanya Lihat). Untuk kelas pengganti per pertemuan, gunakan fitur Cari Kelas Pengganti di menu Heatmap.'
                : masterMetrics.hardCount === 0
                  ? 'Master jadwal FTI telah tervalidasi 0 bentrok wajib dan siap diajukan ke Wakil Dekan I.'
                  : `Terdapat ${masterMetrics.hardCount} bentrok wajib dan ${masterMetrics.softCount} peringatan yang perlu diselesaikan di menu Validasi & Konflik.`}
          </span>
        </div>
        <button onClick={handlePrint} className="font-bold text-blue-700 hover:underline flex items-center gap-1 shrink-0">
          <Printer className="w-3.5 h-3.5" />
          <span>Cetak Salinan Resmi</span>
        </button>
      </div>
    </div>
  );
};
