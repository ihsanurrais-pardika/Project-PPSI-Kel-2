import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
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
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface PersonalCourseItem {
  id: string;
  courseCode: string;
  courseName: string;
  classLabel: string;
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
    studentCount: 42, department: 'SI',  type: 'Teori',
  },
  {
    id: 'mhs-2', courseCode: 'SI-3105', courseName: 'Analisis Proses Bisnis',
    classLabel: 'Kelas A', sks: 3,
    day: 'SENIN', sessionIndex: 2, timeStart: '09:20', timeEnd: '11:00',
    timeLabel: '09:20 – 11:00',
    roomCode: 'G-101', roomName: 'Ruang G-101 (Teori)', building: 'Gedung FTI', floor: 1, capacity: 60,
    lecturerName: 'Husnil Kamil, M.T.', lecturerNip: '19810815 200501 1 002',
    studentCount: 49, department: 'SI',  type: 'Teori',
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
    studentCount: 48, department: 'SI',  type: 'Teori',
  },
  {
    id: 'mhs-6', courseCode: 'UNAND-101', courseName: 'Pendidikan Pancasila & Kewarganegaraan',
    classLabel: 'Kelas FTI Bersama', sks: 2,
    day: 'KAMIS', sessionIndex: 3, timeStart: '11:10', timeEnd: '12:50',
    timeLabel: '11:10 – 12:50',
    roomCode: 'GKB-101', roomName: 'GKB-101 (Teori Bersama)', building: 'GKB', floor: 1, capacity: 80,
    lecturerName: 'Tim Dosen MKU UNAND',
    studentCount: 76, department: 'GKB',  type: 'Teori',
  },
  {
    id: 'mhs-7', courseCode: 'SI-3205', courseName: 'Etika Profesi & Hukum Siber',
    classLabel: 'Kelas A', sks: 2,
    day: 'JUMAT', sessionIndex: 1, timeStart: '07:30', timeEnd: '09:10',
    timeLabel: '07:30 – 09:10',
    roomCode: 'G-101', roomName: 'Ruang G-101 (Teori)', building: 'Gedung FTI', floor: 1, capacity: 60,
    lecturerName: 'Dr. Rahmi, M.Kom', lecturerNip: '19860611 201012 2 004',
    studentCount: 48, department: 'SI',  type: 'Teori',
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
  showToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning' | any) => void;
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
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                    step === s ? 'bg-blue-700 text-white' :
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
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                room.type === 'Lab' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
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
    setActivePage,
  } = useApp();

  const [rosterView, setRosterView] = useState<'dosen' | 'mahasiswa' | 'master'>(
    currentRole === 'dosen' ? 'dosen' : currentRole === 'mahasiswa' ? 'mahasiswa' : 'master'
  );

  useEffect(() => {
    if (currentRole === 'dosen') {
      setRosterView('dosen');
    } else if (currentRole === 'mahasiswa') {
      setRosterView('mahasiswa');
    }
  }, [currentRole]);

  const isDosen = (currentRole === 'dosen' || (currentRole === 'admin' && rosterView === 'dosen')) && rosterView !== 'mahasiswa';

  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
  const [selectedDept, setSelectedDept] = useState<'Semua' | 'SI' | 'IF' | 'TK'>('Semua');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDay, setFilterDay] = useState('Semua');

  // Cari Ruang Modal state
  const [cariRuangTarget, setCariRuangTarget] = useState<PersonalCourseItem | null>(null);

  const days: Array<'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT'> = [
    'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT',
  ];

  const sessionColumns = [
    { id: 1, label: 'SESI 1 (07:30 – 09:10)' },
    { id: 2, label: 'SESI 2 (09:20 – 11:00)' },
    { id: 3, label: 'SESI 3 (11:10 – 12:50)' },
    { id: 4, label: 'SESI 4 (13:30 – 15:10)' },
    { id: 5, label: 'SESI 5 (15:30 – 17:10)' },
  ];

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
    return masterSchedule.map((s, idx) => ({
      id: s.id || `sch-${idx}`,
      courseCode: s.courseCode,
      courseName: s.courseName,
      classLabel: s.classLabel || `Kelas ${s.className || 'A'}`,
      sks: s.sks || 3,
      day: ((s.day || 'SENIN').toUpperCase()) as 'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT',
      sessionIndex: s.sessionIndex,
      timeStart: (s.timeLabel || s.time || '07:30').split(' - ')[0] || '07:30',
      timeEnd: (s.timeLabel || s.time || '09:10').split(' - ')[1] || '09:10',
      timeLabel: s.timeLabel || s.time || '07:30 - 09:10',
      roomCode: (s.roomName || '').split(' ')[0] || 'R-101',
      roomName: s.roomName,
      building: s.building || 'Gedung FTI',
      floor: s.floor || 1,
      capacity: (s as any).capacity || 60,
      lecturerName: s.primaryLecturer || s.lecturerName || 'Dosen Pengampu',
      studentCount: s.studentCount,
      department: (s.department === 'Informatika' ? 'IF' : s.department === 'Teknik Komputer' ? 'TK' : 'SI') as 'SI' | 'IF' | 'TK',
      type: 'Teori' as const,
    }));
  }, [rosterView, masterSchedule]);

  const filteredSchedule = useMemo(() => {
    return currentItems.filter((item) => {
      const matchesDept = selectedDept === 'Semua' || item.department === selectedDept;
      const matchesSearch =
        item.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.lecturerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.roomName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDay = filterDay === 'Semua' || item.day === filterDay;
      return matchesDept && matchesSearch && matchesDay;
    });
  }, [currentItems, selectedDept, searchTerm, filterDay]);

  const totalSks = currentItems.reduce((acc, curr) => acc + curr.sks, 0);
  const totalCourses = currentItems.length;

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
    // Mahasiswa HANYA melihat rute navigasi ruang (tidak dapat mengubah jadwal semester di sini)
    // Penggantian ruang per pertemuan dilakukan di Heatmap Ruangan
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    rosterView === 'dosen' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Dosen Pribadi</span>
                </button>
                <button
                  onClick={() => setRosterView('mahasiswa')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    rosterView === 'mahasiswa' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Mahasiswa (KRS)</span>
                </button>
                <button
                  onClick={() => setRosterView('master')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    rosterView === 'master' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
                <User className="w-4 h-4 text-blue-600" />
                <span>Mode Tampilan:</span>
              </span>
              <span className="bg-white px-3 py-1.5 rounded-xl shadow-2xs border border-slate-200 font-bold text-blue-700 text-xs flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Jadwal Mengajar Pribadi Dosen</span>
              </span>
            </div>
          )}
        </div>

        {/* Quick note about the button */}
        {isDosen ? (
          <div className="text-xs text-slate-500 flex items-center gap-1.5 px-2">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>Dosen dapat mengganti jadwal keseluruhan pertemuan setelah diskusi dengan mahasiswa melalui tombol <strong className="text-blue-700">Ganti Jadwal Semester</strong>.</span>
          </div>
        ) : (
          <div className="text-xs text-slate-500 flex items-center gap-1.5 px-2">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Mahasiswa hanya dapat melihat jadwal (Hanya Lihat). Pencarian ruang kelas pengganti per pertemuan dilakukan via menu <strong>Heatmap Ruang</strong>.</span>
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
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Seksi Terjadwal</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{currentItems.length} Kelas</div>
              <div className="text-xs text-slate-500 mt-0.5">Seluruh FTI (SI, IF, TK)</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kepatuhan Jadwal</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">100% Feasible</div>
              <div className="text-xs text-slate-500 mt-0.5">0 Konflik Ruang & Dosen</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Okupansi Ruang FTI</div>
              <div className="text-2xl font-black text-blue-700 mt-1">87.4%</div>
              <div className="text-xs text-slate-500 mt-0.5">Rata-rata penggunaan ruang</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Otorisasi</div>
              <div className="text-sm font-black text-emerald-700 mt-1">Disetujui Wadek I</div>
              <div className="text-xs text-slate-500 mt-0.5">Roster Resmi Berlaku</div>
            </div>
          </>
        )}
      </div>

      {/* ── View + Filter Toolbar ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'calendar' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Kalender Mingguan</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabel Detail</span>
            </button>
          </div>

          {rosterView === 'master' && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500 mr-2 font-medium">Departemen:</span>
              {(['Semua', 'SI', 'IF', 'TK'] as const).map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    selectedDept === dept ? 'bg-blue-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {dept === 'Semua' ? 'Semua' : dept === 'SI' ? 'Sistem Informasi' : dept === 'IF' ? 'Informatika' : 'Teknik Komputer'}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari mata kuliah, ruang, atau dosen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 bg-white"
            />
          </div>
          <select
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="Semua">Semua Hari</option>
            {['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'].map((d) => (
              <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>
            ))}
          </select>
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
                        const classInSlot = dayItems.find((item) => item.sessionIndex === session.id);
                        const isFridayBreak = day === 'JUMAT' && session.id === 2;

                        return (
                          <td key={session.id} className="p-2 border-r border-slate-200 align-top min-h-[110px]">
                            {isFridayBreak ? (
                              <div className="h-full min-h-[95px] rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-center p-2">
                                <span className="text-[11px] text-slate-400 italic">Persiapan Jumat</span>
                              </div>
                            ) : classInSlot ? (
                              <div className="p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2 hover:border-blue-300 transition-all">
                                {/* Course header */}
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-mono text-[11px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                    {classInSlot.courseCode}
                                  </span>
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    {classInSlot.sks} SKS
                                  </span>
                                </div>

                                {/* Course name */}
                                <div className="font-bold text-slate-900 text-xs leading-snug">{classInSlot.courseName}</div>

                                {/* Class & count */}
                                <div className="text-[11px] text-slate-500">
                                  {classInSlot.classLabel}
                                  {classInSlot.studentCount ? ` • ${classInSlot.studentCount} Mhs` : ''}
                                </div>

                                {/* Room info */}
                                <div className="flex items-center gap-1 text-[11px]">
                                  <Building className="w-3 h-3 text-slate-400 shrink-0" />
                                  <button
                                    onClick={() => handleOpenNavForRoom(classInSlot.roomName)}
                                    className="font-semibold text-blue-700 hover:underline truncate max-w-[130px]"
                                    title="Klik untuk navigasi ruang"
                                  >
                                    {classInSlot.roomCode || classInSlot.roomName.split('(')[0].trim()}
                                  </button>
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
                {filteredSchedule.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-bold text-slate-800">
                      <div>{item.day.charAt(0) + item.day.slice(1).toLowerCase()}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{item.timeLabel}</div>
                      <div className="text-[10px] text-blue-600 font-semibold mt-0.5">Sesi {item.sessionIndex}</div>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-blue-700">{item.courseCode}</td>
                    <td className="p-3.5 font-semibold text-slate-900">
                      <div>{item.courseName}</div>
                      <span className={`text-[10px] font-normal px-1.5 py-0.5 rounded mt-0.5 inline-block ${
                        item.type === 'Praktikum' ? 'bg-purple-50 text-purple-700' :
                        item.type === 'Seminar' ? 'bg-orange-50 text-orange-700' :
                        'bg-sky-50 text-sky-700'
                      }`}>{item.type}</span>
                    </td>
                    <td className="p-3.5 text-slate-700">
                      <div className="font-semibold">{item.classLabel}</div>
                      <div className="text-[10px] text-slate-500">{item.sks} SKS</div>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Bottom Banner ── */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {rosterView === 'dosen'
              ? 'Jadwal mengajar telah tersinkronisasi otomatis dengan BKD FTI Unand. Dosen dapat mengganti jadwal keseluruhan pertemuan semester setelah diskusi dengan mahasiswa.'
              : rosterView === 'mahasiswa'
              ? 'Jadwal kuliah diambil dari KRS aktif (Hanya Lihat). Untuk kelas pengganti per pertemuan, gunakan fitur Cari Kelas Pengganti di menu Heatmap.'
              : 'Master jadwal FTI telah divalidasi 100% bebas bentrok oleh Solver CP-SAT.'}
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
