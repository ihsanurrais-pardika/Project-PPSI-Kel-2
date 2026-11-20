import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Grid3X3,
  Info,
  Download,
  CheckCircle2,
  Clock,
  Layers,
  BarChart3,
  Search,
  SlidersHorizontal,
  RefreshCw,
  Building2,
  Monitor,
  AlertTriangle,
  User,
  GraduationCap,
  Calendar,
  Compass,
  BookOpen,
  Users,
  Plus,
  X,
  Check,
  ArrowRight,
  FileText,
  Sparkles,
  ShieldAlert,
  ChevronRight,
  Printer,
} from 'lucide-react';
import { UserRole } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────
type SlotType = 'occupied' | 'free' | 'break' | 'overload' | 'maintenance';

interface SlotData {
  type: SlotType;
  code?: string;
  name?: string;
  classLabel?: string;
  lecturer?: string;
  dept?: 'SI' | 'IF' | 'TK';
  capacity?: number;
  enrolled?: number;
  unit?: string; // 'Mhs' | 'PC' | 'Meja'
}

interface RoomRow {
  id: string;
  name: string;
  fullName: string;
  type: 'Teori' | 'Lab Software' | 'Lab Hardware';
  building: string;
  floor: number;
  capacity: number;
  unit: string;
  utilPct: number;
  accentColor: string;
  isOverload?: boolean;
  slots: SlotData[]; // indices 0-7: 07:30, 08:30, 09:30, 10:30, 11:30, [12:30 BREAK], 13:30, 14:30
}

interface ReplacementRequest {
  id: string;
  courseCode: string;
  courseName: string;
  classLabel: string;
  lecturerName: string;
  targetRoom: string;
  targetDay: string;
  targetSession: string;
  targetDate: string;
  studentsCount: number;
  reason: string;
  status: 'Disetujui Otomatis' | 'Menunggu Verifikasi' | 'Selesai';
  submittedAt: string;
  role: 'dosen' | 'mahasiswa';
}

// ─── Time columns (matches uploaded screenshot header) ────────────────────────
const TIME_COLS = [
  { time: '07:30', label: '07:30' },
  { time: '08:30', label: '08:30' },
  { time: '09:30', label: '09:30' },
  { time: '10:30', label: '10:30' },
  { time: '11:30', label: '11:30' },
  { time: '12:30', label: '12:30', isBreak: true },
  { time: '13:30', label: '13:30' },
  { time: '14:30', label: '14:30' },
];

// ─── Initial mock rooms matching uploaded screenshot ─────────────────────────
const buildInitialRooms = (): RoomRow[] => [
  {
    id: 'g101',
    name: 'G-101',
    fullName: 'G-101 (Teori)',
    type: 'Teori',
    building: 'Gedung Utama FTI',
    floor: 1,
    capacity: 60,
    unit: 'Mhs',
    utilPct: 91,
    accentColor: 'bg-blue-600',
    slots: [
      { type: 'occupied', code: 'IF-2101', name: 'Algoritma', classLabel: 'Kelas A', lecturer: 'Dr. Eng. Rahmad, M.T.', dept: 'IF', capacity: 60, enrolled: 56, unit: 'Mhs' },
      { type: 'occupied', code: 'IF-2101', name: 'Algoritma', classLabel: 'Kelas B', lecturer: 'Dr. Eng. Rahmad, M.T.', dept: 'IF', capacity: 60, enrolled: 54, unit: 'Mhs' },
      { type: 'occupied', code: 'SI-1204', name: 'Basis Data', classLabel: 'Kelas A', lecturer: 'Dr. Surya Afnarius', dept: 'SI', capacity: 60, enrolled: 58, unit: 'Mhs' },
      { type: 'occupied', code: 'SI-1204', name: 'Basis Data', classLabel: 'Kelas B', lecturer: 'Dr. Surya Afnarius', dept: 'SI', capacity: 60, enrolled: 55, unit: 'Mhs' },
      { type: 'free' },
      { type: 'break' },
      { type: 'occupied', code: 'TK-3201', name: 'Mikroprosesor', classLabel: 'Kelas A', lecturer: 'Ir. Hendra, M.T.', dept: 'TK', capacity: 60, enrolled: 48, unit: 'Mhs' },
      { type: 'occupied', code: 'TK-3201', name: 'Mikroprosesor', classLabel: 'Kelas B', lecturer: 'Ir. Hendra, M.T.', dept: 'TK', capacity: 60, enrolled: 46, unit: 'Mhs' },
    ],
  },
  {
    id: 'g102',
    name: 'G-102',
    fullName: 'G-102 (Teori)',
    type: 'Teori',
    building: 'Gedung Utama FTI',
    floor: 1,
    capacity: 50,
    unit: 'Mhs',
    utilPct: 82,
    accentColor: 'bg-blue-500',
    slots: [
      { type: 'free' },
      { type: 'occupied', code: 'SI-2102', name: 'Rekayasa Web', classLabel: 'Kelas A', lecturer: 'Fikri, M.Kom', dept: 'SI', capacity: 50, enrolled: 45, unit: 'Mhs' },
      { type: 'occupied', code: 'SI-2102', name: 'Rekayasa Web', classLabel: 'Kelas B', lecturer: 'Fikri, M.Kom', dept: 'SI', capacity: 50, enrolled: 43, unit: 'Mhs' },
      { type: 'occupied', code: 'SI-2102', name: 'Rekayasa Web', classLabel: 'Kelas C', lecturer: 'Fikri, M.Kom', dept: 'SI', capacity: 50, enrolled: 44, unit: 'Mhs' },
      { type: 'free' },
      { type: 'break' },
      { type: 'occupied', code: 'IF-3301', name: 'Kriptografi', classLabel: 'Kelas A', lecturer: 'Prof. Asril, M.Sc', dept: 'IF', capacity: 50, enrolled: 48, unit: 'Mhs' },
      { type: 'occupied', code: 'IF-3301', name: 'Kriptografi', classLabel: 'Kelas B', lecturer: 'Prof. Asril, M.Sc', dept: 'IF', capacity: 50, enrolled: 46, unit: 'Mhs' },
    ],
  },
  {
    id: 'g201',
    name: 'G-201',
    fullName: 'G-201 (Teori)',
    type: 'Teori',
    building: 'Gedung Utama FTI',
    floor: 2,
    capacity: 60,
    unit: 'Mhs',
    utilPct: 75,
    accentColor: 'bg-indigo-500',
    slots: [
      { type: 'free' },
      { type: 'free' },
      { type: 'occupied', code: 'IF-1102', name: 'Matematika Diskrit', classLabel: 'Kelas A', lecturer: 'Dr. Defri, M.Si', dept: 'IF', capacity: 60, enrolled: 55, unit: 'Mhs' },
      { type: 'occupied', code: 'IF-1102', name: 'Matematika Diskrit', classLabel: 'Kelas B', lecturer: 'Dr. Defri, M.Si', dept: 'IF', capacity: 60, enrolled: 53, unit: 'Mhs' },
      { type: 'occupied', code: 'IF-1102', name: 'Matematika Diskrit', classLabel: 'Kelas C', lecturer: 'Dr. Defri, M.Si', dept: 'IF', capacity: 60, enrolled: 50, unit: 'Mhs' },
      { type: 'break' },
      { type: 'free' },
      { type: 'occupied', code: 'TK-1205', name: 'Elektronika', classLabel: 'Kelas A', lecturer: 'Dwi, M.T.', dept: 'TK', capacity: 60, enrolled: 42, unit: 'Mhs' },
    ],
  },
  {
    id: 'g203',
    name: 'G-203',
    fullName: 'G-203 (Teori)',
    type: 'Teori',
    building: 'Gedung Utama FTI',
    floor: 2,
    capacity: 50,
    unit: 'Mhs',
    utilPct: 100,
    accentColor: 'bg-rose-600',
    isOverload: true,
    slots: [
      { type: 'overload', code: 'SI-3105', name: 'Analisis Proses', classLabel: 'Kelas A', lecturer: 'Husnil Kamil, M.T.', dept: 'SI', capacity: 50, enrolled: 51, unit: 'Mhs' },
      { type: 'overload', code: 'SI-3105', name: 'Analisis Proses', classLabel: 'Kelas B', lecturer: 'Husnil Kamil, M.T.', dept: 'SI', capacity: 50, enrolled: 50, unit: 'Mhs' },
      { type: 'overload', code: 'SI-3105', name: 'Analisis Proses', classLabel: 'Kelas C', lecturer: 'Husnil Kamil, M.T.', dept: 'SI', capacity: 50, enrolled: 50, unit: 'Mhs' },
      { type: 'occupied', code: 'IF-2207', name: 'Struktur Data', classLabel: 'Kelas A', lecturer: 'Dwi, M.T.', dept: 'IF', capacity: 50, enrolled: 48, unit: 'Mhs' },
      { type: 'occupied', code: 'IF-2207', name: 'Struktur Data', classLabel: 'Kelas B', lecturer: 'Dwi, M.T.', dept: 'IF', capacity: 50, enrolled: 47, unit: 'Mhs' },
      { type: 'break' },
      { type: 'occupied', code: 'TK-2104', name: 'Jaringan Komp', classLabel: 'Kelas A', lecturer: 'Eko, Ph.D', dept: 'TK', capacity: 50, enrolled: 44, unit: 'Mhs' },
      { type: 'occupied', code: 'TK-2104', name: 'Jaringan Komp', classLabel: 'Kelas B', lecturer: 'Eko, Ph.D', dept: 'TK', capacity: 50, enrolled: 42, unit: 'Mhs' },
    ],
  },
  {
    id: 'g204',
    name: 'G-204',
    fullName: 'G-204 (Teori)',
    type: 'Teori',
    building: 'Gedung Utama FTI',
    floor: 2,
    capacity: 55,
    unit: 'Mhs',
    utilPct: 54,
    accentColor: 'bg-teal-500',
    slots: [
      { type: 'free' },
      { type: 'free' },
      { type: 'free' },
      { type: 'free' },
      { type: 'occupied', code: 'SI-3208', name: 'Audit SI', classLabel: 'Kelas A', lecturer: 'Dr. Rahmi, M.Kom', dept: 'SI', capacity: 55, enrolled: 48, unit: 'Mhs' },
      { type: 'break' },
      { type: 'occupied', code: 'SI-3208', name: 'Audit SI', classLabel: 'Kelas B', lecturer: 'Dr. Rahmi, M.Kom', dept: 'SI', capacity: 55, enrolled: 46, unit: 'Mhs' },
      { type: 'occupied', code: 'SI-3208', name: 'Audit SI', classLabel: 'Kelas C', lecturer: 'Dr. Rahmi, M.Kom', dept: 'SI', capacity: 55, enrolled: 44, unit: 'Mhs' },
    ],
  },
  {
    id: 'g205',
    name: 'G-205',
    fullName: 'G-205 (Teori)',
    type: 'Teori',
    building: 'Gedung Utama FTI',
    floor: 2,
    capacity: 45,
    unit: 'Mhs',
    utilPct: 64,
    accentColor: 'bg-cyan-500',
    slots: [
      { type: 'occupied', code: 'TI-1002', name: 'Pengantar TI', classLabel: 'Kelas A', lecturer: 'Tim Pengampu TI', dept: 'SI', capacity: 45, enrolled: 42, unit: 'Mhs' },
      { type: 'occupied', code: 'TI-1002', name: 'Pengantar TI', classLabel: 'Kelas B', lecturer: 'Tim Pengampu TI', dept: 'SI', capacity: 45, enrolled: 40, unit: 'Mhs' },
      { type: 'free' },
      { type: 'free' },
      { type: 'free' },
      { type: 'break' },
      { type: 'occupied', code: 'IF-3204', name: 'Teori Bahasa', classLabel: 'Kelas A', lecturer: 'Hasdi, M.Kom', dept: 'IF', capacity: 45, enrolled: 38, unit: 'Mhs' },
      { type: 'occupied', code: 'IF-3204', name: 'Teori Bahasa', classLabel: 'Kelas B', lecturer: 'Hasdi, M.Kom', dept: 'IF', capacity: 45, enrolled: 36, unit: 'Mhs' },
    ],
  },
  {
    id: 'lab-soft',
    name: 'Lab Software 1',
    fullName: 'Lab Software 1',
    type: 'Lab Software',
    building: 'Gedung Lab',
    floor: 2,
    capacity: 40,
    unit: 'PC',
    utilPct: 100,
    accentColor: 'bg-purple-600',
    slots: [
      { type: 'occupied', code: 'PRAK-IF101', name: 'Praktikum Daspro', classLabel: 'Shift 1', lecturer: 'Asisten Lab IF', dept: 'IF', capacity: 40, enrolled: 38, unit: 'PC' },
      { type: 'occupied', code: 'PRAK-IF101', name: 'Praktikum Daspro', classLabel: 'Shift 2', lecturer: 'Asisten Lab IF', dept: 'IF', capacity: 40, enrolled: 40, unit: 'PC' },
      { type: 'occupied', code: 'PRAK-IF101', name: 'Praktikum Daspro', classLabel: 'Shift 3', lecturer: 'Asisten Lab IF', dept: 'IF', capacity: 40, enrolled: 39, unit: 'PC' },
      { type: 'occupied', code: 'PRAK-SI201', name: 'Praktikum PBO', classLabel: 'Shift 1', lecturer: 'Asisten Lab SI', dept: 'SI', capacity: 40, enrolled: 35, unit: 'PC' },
      { type: 'occupied', code: 'PRAK-SI201', name: 'Praktikum PBO', classLabel: 'Shift 2', lecturer: 'Asisten Lab SI', dept: 'SI', capacity: 40, enrolled: 37, unit: 'PC' },
      { type: 'break' },
      { type: 'occupied', code: 'PRAK-IF302', name: 'Praktikum Basis Data', classLabel: 'Shift A', lecturer: 'Lab Terpadu FTI', dept: 'IF', capacity: 40, enrolled: 39, unit: 'PC' },
      { type: 'occupied', code: 'PRAK-IF302', name: 'Praktikum Basis Data', classLabel: 'Shift B', lecturer: 'Lab Terpadu FTI', dept: 'IF', capacity: 40, enrolled: 38, unit: 'PC' },
    ],
  },
  {
    id: 'lab-hard',
    name: 'Lab Hardware',
    fullName: 'Lab Hardware',
    type: 'Lab Hardware',
    building: 'Gedung Lab',
    floor: 3,
    capacity: 35,
    unit: 'Meja',
    utilPct: 56,
    accentColor: 'bg-emerald-600',
    slots: [
      { type: 'free' },
      { type: 'free' },
      { type: 'occupied', code: 'TK-2201', name: 'Sistem Embedded', classLabel: 'Shift A', lecturer: 'Dr. Eng. Firdaus', dept: 'TK', capacity: 35, enrolled: 30, unit: 'Meja' },
      { type: 'occupied', code: 'TK-2201', name: 'Sistem Embedded', classLabel: 'Shift B', lecturer: 'Dr. Eng. Firdaus', dept: 'TK', capacity: 35, enrolled: 29, unit: 'Meja' },
      { type: 'occupied', code: 'TK-2201', name: 'Sistem Embedded', classLabel: 'Shift C', lecturer: 'Dr. Eng. Firdaus', dept: 'TK', capacity: 35, enrolled: 28, unit: 'Meja' },
      { type: 'break' },
      { type: 'free' },
      { type: 'free' },
    ],
  },
];

// Initial mock requests for make-up classes
const initialRequests: ReplacementRequest[] = [
  {
    id: 'REQ-2024-001',
    courseCode: 'SI-1204',
    courseName: 'Basis Data',
    classLabel: 'Kelas B',
    lecturerName: 'Dr. Surya Afnarius',
    targetRoom: 'G-102',
    targetDay: 'Senin',
    targetSession: '07:30 - 09:10',
    targetDate: '2024-11-25',
    studentsCount: 45,
    reason: 'Kuliah pengganti akibat dosen dinas seminar internasional',
    status: 'Disetujui Otomatis',
    submittedAt: '2024-11-20 08:15',
    role: 'dosen',
  },
  {
    id: 'REQ-2024-002',
    courseCode: 'IF-2101',
    courseName: 'Algoritma Pemrograman',
    classLabel: 'Kelas A',
    lecturerName: 'Dr. Eng. Rahmad, M.T.',
    targetRoom: 'G-201',
    targetDay: 'Rabu',
    targetSession: '13:30 - 15:10',
    targetDate: '2024-11-27',
    studentsCount: 52,
    reason: 'Responsi dan penguatan materi modul dynamic programming',
    status: 'Menunggu Verifikasi',
    submittedAt: '2024-11-20 09:00',
    role: 'dosen',
  },
];

export const UtilisasiHeatmapPage: React.FC = () => {
  const {
    currentRole,
    currentUser,
    showToast,
    rooms: systemRooms,
    setSelectedRoomForNav,
    setIsRoomNavModalOpen,
  } = useApp();

  // Role simulation switcher (allows evaluator/user to toggle between dosen & mahasiswa view)
  const [activeRoleView, setActiveRoleView] = useState<'dosen' | 'mahasiswa' | 'admin'>(
    currentRole === 'dosen' ? 'dosen' : currentRole === 'mahasiswa' ? 'mahasiswa' : 'admin'
  );

  const [rooms, setRooms] = useState<RoomRow[]>(buildInitialRooms);
  const [selectedDay, setSelectedDay] = useState<string>('Senin');
  const [filterType, setFilterType] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'heatmap' | 'requests' | 'finder'>('heatmap');

  // Tooltip state on hover
  const [tooltip, setTooltip] = useState<{
    roomName: string;
    col: string;
    slot: SlotData;
    x: number;
    y: number;
  } | null>(null);

  // Selected items for Modals
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState<{
    room: RoomRow;
    colTime: string;
    colIndex: number;
  } | null>(null);

  const [selectedOccupiedSlot, setSelectedOccupiedSlot] = useState<{
    room: RoomRow;
    colTime: string;
    slot: SlotData;
  } | null>(null);

  const [isOverloadModalOpen, setIsOverloadModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Replacement Requests List
  const [requestsList, setRequestsList] = useState<ReplacementRequest[]>(initialRequests);

  // Booking Form State (Dosen)
  const [selectedCourse, setSelectedCourse] = useState('SI-1204 - Basis Data');
  const [selectedClass, setSelectedClass] = useState('Kelas A');
  const [bookingDate, setBookingDate] = useState('2024-11-25');
  const [studentsEst, setStudentsEst] = useState(45);
  const [bookingReason, setBookingReason] = useState('Tugas Dinas / Konferensi Luar Kota');
  const [extraNeeds, setExtraNeeds] = useState({
    projector: true,
    ac: true,
    audioMic: true,
    labPc: false,
  });

  // Student Reservation Form State
  const [studentGroupName, setStudentGroupName] = useState('Kelompok 2 - Tugas Besar Rekayasa Web');
  const [studentPurpose, setStudentPurpose] = useState('Belajar Kelompok & Koding Bersama');
  const [studentHeadcount, setStudentHeadcount] = useState(6);

  // Quick Finder Drawer State
  const [finderDay, setFinderDay] = useState('Senin');
  const [finderSession, setFinderSession] = useState('07:30');
  const [finderMinCap, setFinderMinCap] = useState(40);
  const [finderType, setFinderType] = useState('Semua');

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

  // Filtering
  const filteredRooms = rooms.filter((r) => {
    if (filterType === 'Teori' && r.type !== 'Teori') return false;
    if (filterType === 'Lab' && r.type === 'Teori') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRoom = r.name.toLowerCase().includes(q) || r.fullName.toLowerCase().includes(q);
      const matchSlot = r.slots.some(
        (s) => s.code?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q) || s.lecturer?.toLowerCase().includes(q)
      );
      if (!matchRoom && !matchSlot) return false;
    }
    return true;
  });

  const totalRooms = 28; // Standard FTI total rooms
  const freeSlotsCount = rooms.reduce((acc, r) => acc + r.slots.filter((s) => s.type === 'free').length, 0);
  const overloadCount = rooms.filter((r) => r.isOverload).length;
  const avgUtil = Math.round(rooms.reduce((acc, r) => acc + r.utilPct, 0) / rooms.length);

  // Handle slot click
  const handleSlotClick = (room: RoomRow, slot: SlotData, colIdx: number) => {
    const col = TIME_COLS[colIdx];

    if (slot.type === 'break') {
      showToast('Slot 12:30 merupakan jeda istirahat, shalat, dan buffer pemeliharaan ruangan.', 'info');
      return;
    }

    if (slot.type === 'free') {
      setSelectedSlotForBooking({ room, colTime: col.time, colIndex: colIdx });
      setIsBookingModalOpen(true);
      return;
    }

    if (slot.type === 'overload') {
      setIsOverloadModalOpen(true);
      return;
    }

    // Occupied
    setSelectedOccupiedSlot({ room, colTime: col.time, slot });
    setIsDetailModalOpen(true);
  };

  // Submit Dosen Replacement Booking
  const handleSubmitDosenBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotForBooking) return;

    if (studentsEst > selectedSlotForBooking.room.capacity) {
      showToast(
        `Peringatan: Jumlah mahasiswa (${studentsEst}) melebihi kapasitas fisik ruang ${selectedSlotForBooking.room.name} (${selectedSlotForBooking.room.capacity})!`,
        'warning'
      );
    }

    const newReq: ReplacementRequest = {
      id: `REQ-${Date.now().toString().slice(-4)}`,
      courseCode: selectedCourse.split(' - ')[0],
      courseName: selectedCourse.split(' - ')[1] || selectedCourse,
      classLabel: selectedClass,
      lecturerName: currentUser.name || 'Dr. Eng. Rahmad, M.T.',
      targetRoom: selectedSlotForBooking.room.name,
      targetDay: selectedDay,
      targetSession: `${selectedSlotForBooking.colTime} - Selesai`,
      targetDate: bookingDate,
      studentsCount: studentsEst,
      reason: bookingReason,
      status: 'Disetujui Otomatis',
      submittedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      role: 'dosen',
    };

    setRequestsList([newReq, ...requestsList]);

    // Update room slot to occupied
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === selectedSlotForBooking.room.id) {
          const newSlots = [...r.slots];
          newSlots[selectedSlotForBooking.colIndex] = {
            type: 'occupied',
            code: newReq.courseCode,
            name: `${newReq.courseName} (Pengganti)`,
            classLabel: newReq.classLabel,
            lecturer: newReq.lecturerName,
            capacity: r.capacity,
            enrolled: studentsEst,
            unit: r.unit,
          };
          return { ...r, slots: newSlots };
        }
        return r;
      })
    );

    setIsBookingModalOpen(false);
    showToast(
      `Pengajuan Ruang Pengganti ${selectedSlotForBooking.room.name} (${selectedSlotForBooking.colTime}) berhasil disetujui secara otomatis!`,
      'success'
    );
  };

  // Submit Student Study Reservation
  const handleSubmitStudentBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotForBooking) return;

    const newReq: ReplacementRequest = {
      id: `MHS-${Date.now().toString().slice(-4)}`,
      courseCode: 'DISKUSI',
      courseName: studentPurpose,
      classLabel: studentGroupName,
      lecturerName: currentUser.name || 'Faris Alfath (BP 22)',
      targetRoom: selectedSlotForBooking.room.name,
      targetDay: selectedDay,
      targetSession: `${selectedSlotForBooking.colTime} - Selesai`,
      targetDate: bookingDate,
      studentsCount: studentHeadcount,
      reason: 'Pemanfaatan ruang kosong untuk belajar mandiri / tugas kelompok',
      status: 'Disetujui Otomatis',
      submittedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      role: 'mahasiswa',
    };

    setRequestsList([newReq, ...requestsList]);
    setIsBookingModalOpen(false);
    showToast(
      `Izin penggunaan Ruang ${selectedSlotForBooking.room.name} untuk belajar kelompok berhasil dicatat. Silakan gunakan ruang dengan tertib!`,
      'success'
    );
  };

  // Open Room Navigation for Student/Dosen
  const handleOpenNavForRoom = (roomName: string) => {
    const matched =
      systemRooms.find(
        (rm) =>
          rm.name.toLowerCase().includes(roomName.toLowerCase()) ||
          rm.code.toLowerCase().includes(roomName.toLowerCase())
      ) || systemRooms[0];

    setSelectedRoomForNav(matched);
    setIsRoomNavModalOpen(true);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-8">
      {/* ── Breadcrumb & Role Context Bar ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            FTI
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span>Layanan Perkuliahan</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="text-blue-700 font-bold">Ketersediaan &amp; Ruang Pengganti</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Semester Ganjil 2024/2025 • Sinkronisasi Real-time Solver CP-SAT
            </div>
          </div>
        </div>

        {/* Role Mode View Switcher (Interactive for Demo & Evaluation) */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500 hidden md:inline">Mode Peran:</span>
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveRoleView('dosen')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                activeRoleView === 'dosen'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Dosen</span>
            </button>
            <button
              onClick={() => setActiveRoleView('mahasiswa')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                activeRoleView === 'mahasiswa'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Mahasiswa</span>
            </button>
            <button
              onClick={() => setActiveRoleView('admin')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                activeRoleView === 'admin'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Role Adaptive Action Banner ─────────────────────────────── */}
      {activeRoleView === 'dosen' ? (
        <div className="bg-gradient-to-r from-[#082c78] via-blue-900 to-indigo-900 text-white p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
              <User className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm">Mode Dosen: Pengajuan Ruang Kuliah Pengganti</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Otomatisasi FTI
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5 max-w-2xl leading-relaxed">
                Anda login sebagai <strong>{currentUser.name || 'Dr. Eng. Rahmad, M.T.'}</strong>.
                Klik slot berwarna hijau <strong>(Kosong)</strong> pada tabel untuk langsung mengajukan jadwal kuliah pengganti (*make-up class*) tanpa surat manual.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setSelectedSlotForBooking({ room: rooms[1], colTime: '07:30', colIndex: 0 });
                setIsBookingModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Buat Pengajuan Baru</span>
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl transition-colors border border-white/20"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Riwayat Pengajuan ({requestsList.length})</span>
            </button>
          </div>
        </div>
      ) : activeRoleView === 'mahasiswa' ? (
        <div className="bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 text-white p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
              <GraduationCap className="w-6 h-6 text-sky-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm">Mode Mahasiswa: Pencarian Ruang Kosong &amp; Belajar Mandiri</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  Akses Terbuka
                </span>
              </div>
              <p className="text-xs text-sky-100 mt-0.5 max-w-2xl leading-relaxed">
                Anda login sebagai <strong>{currentUser.name || 'Faris Alfath (BP 22)'}</strong>.
                Gunakan matriks ini untuk mencari ruang kelas yang sedang tidak dipakai kuliah untuk diskusi kelompok, belajar mandiri, atau mengecek posisi kelas dosen.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleOpenNavForRoom('G-102')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Denah &amp; Navigasi Ruang</span>
            </button>
            <button
              onClick={() => setActiveTab('finder')}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl transition-colors border border-white/20"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Pencari Cepat</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Page Header (Identical to Screenshot) ───────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Grid3X3 className="w-4 h-4" />
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Matriks Utilisasi Heatmap Mingguan
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-500">
            Visualisasi okupansi slot perkuliahan per jam kerja FTI Universitas Andalas ({selectedDay}, Semester Ganjil 2024/2025).
          </p>
        </div>

        {/* Legend Exactly As in Image (Top-Right) */}
        <div className="flex items-center gap-4 text-xs font-semibold text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-md bg-emerald-500 flex items-center justify-center">
              <Check className="w-3 h-3 text-white stroke-[3]" />
            </span>
            <span>Tersedia (Free)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-md bg-[#1e3a5f]" />
            <span>Terisi Kuliah (Occupied)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-md bg-[#f59e0b]" />
            <span>Istirahat / Pemeliharaan (Buffer)</span>
          </div>
        </div>
      </div>

      {/* ── 4 Metric Summary Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Ruang</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalRooms}</div>
          <div className="text-xs text-slate-500">Ruang dipantau FTI &amp; GKB</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Rata-rata Utilisasi</span>
            <BarChart3 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-indigo-700">{avgUtil}%</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
              Optimal
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${avgUtil}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Slot Kosong Siap Pakai</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{freeSlotsCount} Slot</div>
          <div className="text-xs text-slate-500">Bebas untuk kuliah pengganti/diskusi</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Ruang Overload / Penuh</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-rose-700">{overloadCount} Ruang</span>
            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
              G-203 Butuh Aksi
            </span>
          </div>
          <div className="text-xs text-slate-500">Kapasitas rombel melampaui kursi</div>
        </div>
      </div>

      {/* ── Filter Bar & Actions ────────────────────────────────────── */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Day Pills */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-0.5">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedDay === day
                  ? 'bg-[#082c78] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Filter Type & Search Input */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-0.5 text-xs font-semibold">
            {['Semua', 'Teori', 'Lab'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterType === t ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ruang / mata kuliah..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-500 w-44 md:w-56"
            />
          </div>

          <button
            onClick={() => setActiveTab(activeTab === 'finder' ? 'heatmap' : 'finder')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors ${
              activeTab === 'finder'
                ? 'bg-blue-700 text-white border-blue-800'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Pencari Cepat</span>
          </button>

          <button
            onClick={() => showToast('Mengunduh matriks heatmap ruang dalam format PDF...', 'info')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Unduh PDF</span>
          </button>
        </div>
      </div>

      {/* ── Subheader Notice & Counter (Matching Image) ──────────────── */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div className="flex items-center gap-1.5">
          <Info className="w-4 h-4 text-blue-600" />
          <span>Arahkan kursor pada slot biru untuk melihat detail matakuliah dan dosen pengampu</span>
        </div>
        <div className="font-semibold text-slate-600">
          Menampilkan {filteredRooms.length} dari {totalRooms} Ruang Terpilih
        </div>
      </div>

      {/* ── Heatmap Matrix Table (Exact Match to Screenshot) ─────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left" style={{ minWidth: 920 }}>
            {/* Table Header */}
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4 w-44 sticky left-0 z-20 bg-slate-50/90 border-r border-slate-200">
                  RUANG &amp; KAPASITAS
                </th>
                {TIME_COLS.map((col) => (
                  <th
                    key={col.time}
                    className={`py-3 px-2 text-center min-w-[95px] border-l border-slate-200 ${
                      col.isBreak ? 'bg-amber-100/60 text-amber-900 font-extrabold' : ''
                    }`}
                  >
                    <div>{col.label}</div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRooms.map((room) => {
                return (
                  <tr key={room.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Left Room Info Cell */}
                    <td className="sticky left-0 z-10 bg-white border-r border-slate-200 p-3 w-44 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 text-xs leading-tight">
                            {room.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">({room.type})</div>
                          <div className="text-[10px] text-slate-400 mt-1 leading-tight">
                            {room.type.startsWith('Lab') ? room.building : `Lt. ${room.floor}`} • {room.capacity} {room.unit}
                          </div>

                          {room.isOverload && (
                            <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-rose-600">
                              <span>Overload</span>
                              <span className="text-rose-500 font-normal">Slot</span>
                            </div>
                          )}
                        </div>

                        {/* Right Badge / Status */}
                        <div>
                          {room.isOverload ? (
                            <button
                              onClick={() => setIsOverloadModalOpen(true)}
                              title="Ruang Overload - Klik untuk solusi relokasi prodi lain"
                              className="flex flex-col items-end cursor-pointer group"
                            >
                              <div className="flex items-center gap-1 text-blue-600 group-hover:rotate-180 transition-transform">
                                <RefreshCw className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[10px] font-bold text-rose-600 mt-0.5">(Penuh)</span>
                            </button>
                          ) : (
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                room.utilPct >= 90
                                  ? 'bg-blue-100 text-blue-800'
                                  : room.utilPct >= 70
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-sky-100 text-sky-800'
                              }`}
                            >
                              {room.utilPct}%
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Slot Cells */}
                    {room.slots.map((slot, ci) => {
                      const col = TIME_COLS[ci];

                      // Break Slot (12:30 Column)
                      if (slot.type === 'break') {
                        return (
                          <td
                            key={ci}
                            className="border-l border-slate-200 bg-amber-400/90 text-center p-1"
                            style={{ minWidth: 95 }}
                          >
                            <div className="h-full min-h-[60px] flex items-center justify-center">
                              <span className="text-[11px] font-black text-amber-950 uppercase tracking-wider">
                                ISTIRAHAT
                              </span>
                            </div>
                          </td>
                        );
                      }

                      // Empty Slot (Green Free)
                      if (slot.type === 'free') {
                        return (
                          <td
                            key={ci}
                            className="border-l border-slate-200 p-1"
                            style={{ minWidth: 95 }}
                          >
                            <button
                              type="button"
                              onClick={() => handleSlotClick(room, slot, ci)}
                              className="w-full h-full min-h-[60px] bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg flex flex-col items-center justify-center gap-1 transition-all shadow-2xs group cursor-pointer"
                              title={`Slot Kosong: ${room.name} (${col.time}) - Klik untuk ${
                                activeRoleView === 'dosen' ? 'ajukan kuliah pengganti' : 'peminjaman belajar'
                              }`}
                            >
                              <Check className="w-4 h-4 stroke-[3] group-hover:scale-110 transition-transform" />
                              <span className="text-[11px] font-bold">Kosong</span>
                            </button>
                          </td>
                        );
                      }

                      // Occupied / Overload Slot (Dark Blue #1e3a5f)
                      return (
                        <td
                          key={ci}
                          className="border-l border-slate-200 p-1 cursor-pointer"
                          style={{ minWidth: 95 }}
                          onClick={() => handleSlotClick(room, slot, ci)}
                          onMouseEnter={(e) => {
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setTooltip({
                              roomName: room.name,
                              col: col.time,
                              slot,
                              x: rect.left,
                              y: rect.bottom,
                            });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          <div
                            className={`w-full min-h-[60px] p-2 rounded-lg text-white leading-tight flex flex-col justify-between transition-opacity hover:opacity-95 ${
                              slot.type === 'overload' ? 'bg-[#1a3458]' : 'bg-[#1e3a5f]'
                            }`}
                          >
                            <div className="font-extrabold text-[11px] text-blue-200 truncate">
                              {slot.code}
                            </div>
                            <div className="text-[10px] text-slate-200 font-medium truncate mt-0.5">
                              {slot.name}
                            </div>
                            <div className="text-[9px] text-slate-300 mt-1 truncate">
                              {slot.classLabel}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Clean Footer Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>
              Klik tombol <strong className="text-emerald-700">Kosong (Hijau)</strong> untuk mem-booking ruang kuliah pengganti (Dosen) atau ruang belajar (Mahasiswa).
            </span>
          </div>
          <span className="font-medium text-slate-600">8 Ruangan Representatif Ditampilkan</span>
        </div>
      </div>

      {/* ── Hover Tooltip (Course Details Floating Box) ─────────────── */}
      {tooltip && tooltip.slot.type !== 'free' && tooltip.slot.type !== 'break' && (
        <div
          className="fixed z-50 bg-slate-900 text-white text-xs rounded-xl shadow-2xl p-3 w-64 pointer-events-none animate-in fade-in duration-100"
          style={{
            top: tooltip.y + 6,
            left: Math.min(tooltip.x, window.innerWidth - 270),
          }}
        >
          <div className="flex items-center justify-between text-blue-300 font-mono text-[11px]">
            <span>{tooltip.slot.code}</span>
            <span className="bg-blue-800/80 px-1.5 py-0.2 rounded text-[10px] text-white">
              {tooltip.slot.classLabel}
            </span>
          </div>
          <div className="font-bold text-white text-sm mt-0.5 leading-snug">
            {tooltip.slot.name}
          </div>
          <div className="text-slate-300 text-[11px] mt-1">
            Dosen: <strong>{tooltip.slot.lecturer || 'Tim Dosen FTI'}</strong>
          </div>
          <div className="text-slate-400 text-[10px] mt-0.5">
            Ruang {tooltip.roomName} • Sesi {tooltip.col}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Keterisian Kursi:</span>
            <span className="font-bold text-emerald-400">
              {tooltip.slot.enrolled} / {tooltip.slot.capacity} Mahasiswa
            </span>
          </div>
        </div>
      )}

      {/* ── Quick Room Finder (Instant Replacement Drawer / Panel) ───── */}
      {activeTab === 'finder' && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-md p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Pencari Ruang Kosong Instan (Quick Finder)</h3>
                <p className="text-xs text-slate-500">
                  Temukan slot kosong yang cocok untuk jadwal kuliah pengganti atau kegiatan mandiri
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('heatmap')}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hari</label>
              <select
                value={finderDay}
                onChange={(e) => setFinderDay(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
              >
                {days.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Jam / Sesi</label>
              <select
                value={finderSession}
                onChange={(e) => setFinderSession(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
              >
                <option value="07:30">07:30 - 09:10 (Sesi 1)</option>
                <option value="09:20">09:20 - 11:00 (Sesi 2)</option>
                <option value="11:10">11:10 - 12:50 (Sesi 3)</option>
                <option value="13:30">13:30 - 15:10 (Sesi 4)</option>
                <option value="15:30">15:30 - 17:10 (Sesi 5)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kapasitas Mahasiswa Minimal</label>
              <input
                type="number"
                value={finderMinCap}
                onChange={(e) => setFinderMinCap(Number(e.target.value))}
                min={10}
                max={100}
                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
              />
            </div>

            <div>
              <button
                onClick={() => {
                  showToast(`Pencarian selesai: Ditemukan 3 ruang kosong yang kompatibel pada ${finderDay}, ${finderSession}!`, 'success');
                }}
                className="w-full py-1.5 px-3 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Filter Ruang Kosong</span>
              </button>
            </div>
          </div>

          {/* Quick Result Suggestions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-slate-900">Ruang G-102 (Teori)</div>
                <div className="text-[11px] text-slate-500">Lantai 1 • Kapasitas 50 Mhs</div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded mt-1 inline-block">
                  Kosong 07:30 - 08:30
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedSlotForBooking({ room: rooms[1], colTime: '07:30', colIndex: 0 });
                  setIsBookingModalOpen(true);
                }}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Pilih
              </button>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-slate-900">Ruang G-201 (Teori)</div>
                <div className="text-[11px] text-slate-500">Lantai 2 • Kapasitas 60 Mhs</div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded mt-1 inline-block">
                  Kosong 07:30 - 09:30
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedSlotForBooking({ room: rooms[2], colTime: '07:30', colIndex: 0 });
                  setIsBookingModalOpen(true);
                }}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Pilih
              </button>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-slate-900">Ruang G-204 (Teori)</div>
                <div className="text-[11px] text-slate-500">Lantai 2 • Kapasitas 55 Mhs</div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded mt-1 inline-block">
                  Kosong 07:30 - 11:30
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedSlotForBooking({ room: rooms[4], colTime: '07:30', colIndex: 0 });
                  setIsBookingModalOpen(true);
                }}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Pilih
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Replacement Requests History Tab / View ─────────────────── */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Riwayat Pengajuan Ruang Kuliah Pengganti &amp; Peminjaman
              </h3>
              <p className="text-xs text-slate-500">
                Daftar permohonan ruang perkuliahan yang telah disetujui sistem akademik FTI
              </p>
            </div>
            <button
              onClick={() => setActiveTab('heatmap')}
              className="text-xs font-bold text-blue-700 hover:underline"
            >
              Kembali ke Matriks
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <th className="p-2.5">ID Pengajuan</th>
                  <th className="p-2.5">Mata Kuliah / Keperluan</th>
                  <th className="p-2.5">Pemohon</th>
                  <th className="p-2.5">Ruang &amp; Sesi</th>
                  <th className="p-2.5">Tanggal</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requestsList.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50">
                    <td className="p-2.5 font-mono text-slate-700 font-bold">{req.id}</td>
                    <td className="p-2.5">
                      <div className="font-bold text-slate-800">{req.courseName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{req.courseCode} • {req.classLabel}</div>
                    </td>
                    <td className="p-2.5 font-medium text-slate-700">{req.lecturerName}</td>
                    <td className="p-2.5">
                      <span className="font-bold text-blue-700">{req.targetRoom}</span> ({req.targetDay}, {req.targetSession})
                    </td>
                    <td className="p-2.5 text-slate-600">{req.targetDate}</td>
                    <td className="p-2.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Check className="w-3 h-3 text-emerald-600" />
                        {req.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        onClick={() => showToast(`Mencetak surat bukti izin ruang ${req.targetRoom} (PDF)...`, 'info')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-2xs"
                      >
                        <Printer className="w-3 h-3 text-slate-500" />
                        <span>Cetak Bukti</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL 1: Form Pengajuan Ruang Pengganti (Khusus Dosen) ───── */}
      {isBookingModalOpen && selectedSlotForBooking && activeRoleView === 'dosen' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Form Pengajuan Kuliah Pengganti
                  </h3>
                  <p className="text-xs text-slate-500">
                    Alokasikan ruang kosong untuk mata kuliah susulan / pengganti
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBookingModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selected Target Room Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                  Ruangan Target Terpilih
                </span>
                <span className="text-sm font-black text-slate-900">
                  {selectedSlotForBooking.room.fullName}
                </span>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  Lantai {selectedSlotForBooking.room.floor} • Kapasitas: {selectedSlotForBooking.room.capacity} {selectedSlotForBooking.room.unit}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">Slot Sesi</span>
                <span className="text-xs font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-200">
                  {selectedDay}, {selectedSlotForBooking.colTime} WIB
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitDosenBooking} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mata Kuliah yang Diampu
                </label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 text-slate-800 bg-white focus:outline-none focus:border-blue-600"
                >
                  <option value="SI-1204 - Basis Data">SI-1204 - Basis Data (3 SKS)</option>
                  <option value="IF-2101 - Algoritma Pemrograman">IF-2101 - Algoritma Pemrograman (3 SKS)</option>
                  <option value="SI-2102 - Rekayasa Web">SI-2102 - Rekayasa Web (3 SKS)</option>
                  <option value="SI-3105 - Analisis Proses Bisnis">SI-3105 - Analisis Proses Bisnis (3 SKS)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kelas / Rombel
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 text-slate-800 bg-white focus:outline-none focus:border-blue-600"
                  >
                    <option value="Kelas A">Kelas A</option>
                    <option value="Kelas B">Kelas B</option>
                    <option value="Kelas C">Kelas C</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Estimasi Mahasiswa Hadir
                  </label>
                  <input
                    type="number"
                    value={studentsEst}
                    onChange={(e) => setStudentsEst(Number(e.target.value))}
                    min={1}
                    max={100}
                    className="w-full border border-slate-200 rounded-lg p-2 text-slate-800 bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tanggal Kuliah Pengganti
                </label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 text-slate-800 bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Alasan Kuliah Pengganti
                </label>
                <select
                  value={bookingReason}
                  onChange={(e) => setBookingReason(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 text-slate-800 bg-white focus:outline-none focus:border-blue-600"
                >
                  <option value="Tugas Dinas / Konferensi Luar Kota">Tugas Dinas / Konferensi Luar Kota</option>
                  <option value="Kuliah Pengganti Libur Nasional">Kuliah Pengganti Libur Nasional</option>
                  <option value="Kuliah Tambahan / Responsi Materi">Kuliah Tambahan / Responsi Materi</option>
                  <option value="UTS / UAS Susulan">UTS / UAS Susulan</option>
                </select>
              </div>

              {/* Facility Requirements */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Fasilitas yang Dibutuhkan:
                </label>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <label className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={extraNeeds.projector}
                      onChange={(e) => setExtraNeeds({ ...extraNeeds, projector: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span>Proyektor HD / Smart TV</span>
                  </label>
                  <label className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={extraNeeds.ac}
                      onChange={(e) => setExtraNeeds({ ...extraNeeds, ac: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span>AC Aktif</span>
                  </label>
                  <label className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={extraNeeds.audioMic}
                      onChange={(e) => setExtraNeeds({ ...extraNeeds, audioMic: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span>Mikrofon / Sound System</span>
                  </label>
                  <label className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={extraNeeds.labPc}
                      onChange={(e) => setExtraNeeds({ ...extraNeeds, labPc: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span>Komputer Lab / Software Khusus</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#082c78] hover:bg-blue-900 text-white font-bold rounded-xl shadow-xs transition-colors"
                >
                  Konfirmasi Pengajuan Ruang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Form Peminjaman Belajar Mandiri (Khusus Mahasiswa) ─ */}
      {isBookingModalOpen && selectedSlotForBooking && activeRoleView !== 'dosen' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Reservasi Ruang Belajar Mandiri / Diskusi
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pemanfaatan ruang kelas yang sedang kosong untuk mahasiswa
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBookingModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">
                  Ruangan Kosong
                </span>
                <span className="text-sm font-black text-slate-900">
                  {selectedSlotForBooking.room.fullName}
                </span>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  Lantai {selectedSlotForBooking.room.floor} • Kapasitas: {selectedSlotForBooking.room.capacity} Orang
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">Jadwal Luang</span>
                <span className="text-xs font-bold text-sky-900 bg-white px-2 py-0.5 rounded border border-sky-200">
                  {selectedDay}, {selectedSlotForBooking.colTime} WIB
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitStudentBooking} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Kelompok / Pemohon
                </label>
                <input
                  type="text"
                  value={studentGroupName}
                  onChange={(e) => setStudentGroupName(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 text-slate-800 bg-white focus:outline-none focus:border-sky-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tujuan Penggunaan
                </label>
                <select
                  value={studentPurpose}
                  onChange={(e) => setStudentPurpose(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 text-slate-800 bg-white focus:outline-none focus:border-sky-600"
                >
                  <option value="Belajar Kelompok & Koding Bersama">Belajar Kelompok &amp; Koding Bersama</option>
                  <option value="Diskusi Tugas Akhir / Skripsi">Diskusi Tugas Akhir / Skripsi</option>
                  <option value="Rapat Himpunan Mahasiswa (HIMA)">Rapat Himpunan Mahasiswa (HIMA)</option>
                  <option value="Persiapan Lomba / Bootcamp">Persiapan Lomba / Bootcamp</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jumlah Anggota
                  </label>
                  <input
                    type="number"
                    value={studentHeadcount}
                    onChange={(e) => setStudentHeadcount(Number(e.target.value))}
                    min={2}
                    max={20}
                    className="w-full border border-slate-200 rounded-lg p-2 text-slate-800 bg-white focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Fasilitas Tersedia
                  </label>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600">
                    ✓ Wi-Fi UNAND • Stop Kontak • AC
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                <strong>Tata Tertib Penggunaan:</strong> Harap menjaga kebersihan ruangan, mematikan AC &amp; lampu setelah selesai, serta mengosongkan ruang 10 menit sebelum sesi kuliah berikutnya dimulai.
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenNavForRoom(selectedSlotForBooking.room.name);
                    setIsBookingModalOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-blue-700 hover:bg-blue-50 font-bold rounded-xl transition-colors"
                >
                  <Compass className="w-4 h-4" />
                  <span>Petunjuk Arah Ruangan</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBookingModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-xs transition-colors"
                  >
                    Catat Reservasi
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: Detail Perkuliahan (Klik Sel Biru) ─────────────── */}
      {isDetailModalOpen && selectedOccupiedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Detail Jadwal Perkuliahan
                  </h3>
                  <p className="text-xs text-slate-500">
                    Informasi kelas yang sedang berlangsung di ruangan ini
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                  {selectedOccupiedSlot.slot.code}
                </span>
                <h4 className="text-base font-black text-slate-900 mt-1">
                  {selectedOccupiedSlot.slot.name}
                </h4>
                <div className="text-slate-600 mt-1 font-semibold">
                  {selectedOccupiedSlot.slot.classLabel} • Departemen {selectedOccupiedSlot.slot.dept === 'SI' ? 'Sistem Informasi' : selectedOccupiedSlot.slot.dept === 'IF' ? 'Informatika' : 'Teknik Komputer'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Dosen Pengampu
                  </span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                    {selectedOccupiedSlot.slot.lecturer || 'Tim Dosen FTI'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Ruang &amp; Sesi
                  </span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                    {selectedOccupiedSlot.room.name} ({selectedOccupiedSlot.colTime})
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-blue-900">Keterisian Kursi</span>
                  <span className="text-blue-700">
                    {selectedOccupiedSlot.slot.enrolled} / {selectedOccupiedSlot.slot.capacity} Peserta
                  </span>
                </div>
                <div className="w-full bg-blue-200/60 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          ((selectedOccupiedSlot.slot.enrolled ?? 0) /
                            (selectedOccupiedSlot.slot.capacity ?? 1)) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenNavForRoom(selectedOccupiedSlot.room.name);
                    setIsDetailModalOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-blue-700 hover:bg-blue-50 font-bold rounded-xl transition-colors"
                >
                  <Compass className="w-4 h-4" />
                  <span>Petunjuk Arah ke Ruangan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: Solusi Overload Slot G-203 (PRD F-18) ───────────── */}
      {isOverloadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Peringatan: Ruang G-203 Mengalami Overload
                  </h3>
                  <p className="text-xs text-slate-500">
                    Jumlah mahasiswa melampaui kapasitas kursi yang tersedia
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOverloadModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1.5 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Pelanggaran Batasan Fisik Ruang (Hard Constraint)</span>
              </div>
              <p>
                Mata kuliah <strong>SI-3105 Analisis Proses Bisnis (Kelas A)</strong> memiliki <strong>51 mahasiswa terdaftar</strong>, sementara daya tampung fisik Ruang G-203 hanya <strong>50 kursi</strong>.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Rekomendasi Ruang Alternatif Sesuai PRD F-18:
              </h4>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800">Ruang G-101 (Teori)</div>
                    <div className="text-[11px] text-slate-500">Lantai 1 • Kapasitas 60 Kursi (+10 Kursi Luang)</div>
                  </div>
                  <button
                    onClick={() => {
                      showToast('Jadwal SI-3105 Kelas A berhasil direlokasi ke Ruang G-101.', 'success');
                      setIsOverloadModalOpen(false);
                    }}
                    className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-2xs"
                  >
                    Relokasi ke G-101
                  </button>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800">Ruang G-201 (Teori)</div>
                    <div className="text-[11px] text-slate-500">Lantai 2 • Kapasitas 60 Kursi (+10 Kursi Luang)</div>
                  </div>
                  <button
                    onClick={() => {
                      showToast('Jadwal SI-3105 Kelas A berhasil direlokasi ke Ruang G-201.', 'success');
                      setIsOverloadModalOpen(false);
                    }}
                    className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-2xs"
                  >
                    Relokasi ke G-201
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOverloadModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
