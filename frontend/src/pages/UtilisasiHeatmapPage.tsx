import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { apiService, RoomUtilizationResponse } from '../services/api';
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
  lecturers?: string[];
  dept?: 'SI' | 'IF' | 'TK';
  capacity?: number;
  enrolled?: number;
  unit?: string; // 'Mahasiswa' | 'PC' | 'Meja'
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

// ─── Time columns (aligned with backend SLOT_TIMES) ──────────────────────────
const TIME_COLS = [
  { time: '07:30', label: '07:30' },
  { time: '09:10', label: '09:10' },
  { time: '10:00', label: '10:00' },
  { time: '11:10', label: '11:10' },
  { time: '12:30', label: '12:30', isBreak: true },
  { time: '13:30', label: '13:30' },
  { time: '16:00', label: '16:00' },
];

// ─── Initial mock rooms matching uploaded screenshot ─────────────────────────
const buildInitialRooms = (): RoomRow[] => [
  {
    id: 'g101',
    name: 'G-101',
    fullName: 'G-101',
    type: 'Teori',
    building: 'Gedung Utama FTI',
    floor: 1,
    capacity: 60,
    unit: 'Mahasiswa',
    utilPct: 91,
    accentColor: 'bg-blue-600',
    slots: [
      { type: 'occupied', code: 'IF-2101', name: 'Algoritma', classLabel: 'Kelas A', lecturer: 'Dr. Eng. Rahmad, M.T.', dept: 'IF', capacity: 60, enrolled: 56, unit: 'Mahasiswa' },
      { type: 'occupied', code: 'IF-2101', name: 'Algoritma', classLabel: 'Kelas B', lecturer: 'Dr. Eng. Rahmad, M.T.', dept: 'IF', capacity: 60, enrolled: 54, unit: 'Mahasiswa' },
      { type: 'occupied', code: 'SI-1204', name: 'Basis Data', classLabel: 'Kelas A', lecturer: 'Dr. Surya Afnarius', dept: 'SI', capacity: 60, enrolled: 58, unit: 'Mahasiswa' },
      { type: 'occupied', code: 'SI-1204', name: 'Basis Data', classLabel: 'Kelas B', lecturer: 'Dr. Surya Afnarius', dept: 'SI', capacity: 60, enrolled: 55, unit: 'Mahasiswa' },
      { type: 'free' },
      { type: 'break' },
      { type: 'occupied', code: 'TK-3201', name: 'Mikroprosesor', classLabel: 'Kelas A', lecturer: 'Ir. Hendra, M.T.', dept: 'TK', capacity: 60, enrolled: 48, unit: 'Mahasiswa' },
      { type: 'occupied', code: 'TK-3201', name: 'Mikroprosesor', classLabel: 'Kelas B', lecturer: 'Ir. Hendra, M.T.', dept: 'TK', capacity: 60, enrolled: 46, unit: 'Mahasiswa' },
    ],
  },
  {
    id: 'g102',
    name: 'G-102',
    fullName: 'G-102',
    type: 'Teori',
    building: 'Gedung Utama FTI',
    floor: 1,
    capacity: 50,
    unit: 'Mahasiswa',
    utilPct: 82,
    accentColor: 'bg-blue-500',
    slots: [
      { type: 'free' },
      { type: 'occupied', code: 'SI-2102', name: 'Rekayasa Web', classLabel: 'Kelas A', lecturer: 'Fikri, M.Kom', dept: 'SI', capacity: 50, enrolled: 45, unit: 'Mahasiswa' },
      { type: 'occupied', code: 'SI-2102', name: 'Rekayasa Web', classLabel: 'Kelas B', lecturer: 'Fikri, M.Kom', dept: 'SI', capacity: 50, enrolled: 43, unit: 'Mahasiswa' },
      { type: 'occupied', code: 'SI-2102', name: 'Rekayasa Web', classLabel: 'Kelas C', lecturer: 'Fikri, M.Kom', dept: 'SI', capacity: 50, enrolled: 44, unit: 'Mahasiswa' },
      { type: 'free' },
      { type: 'break' },
      { type: 'occupied', code: 'IF-3301', name: 'Kriptografi', classLabel: 'Kelas A', lecturer: 'Prof. Asril, M.Sc', dept: 'IF', capacity: 50, enrolled: 48, unit: 'Mahasiswa' },
      { type: 'occupied', code: 'IF-3301', name: 'Kriptografi', classLabel: 'Kelas B', lecturer: 'Prof. Asril, M.Sc', dept: 'IF', capacity: 50, enrolled: 46, unit: 'Mahasiswa' },
    ],
  },
  {
    id: 'g201',
    name: 'G-201',
    fullName: 'G-201',
    type: 'Teori',
    building: 'Gedung Utama FTI',
    floor: 2,
    capacity: 60,
    unit: 'Mahasiswa',
    utilPct: 75,
    accentColor: 'bg-indigo-500',
    slots: [
      { type: 'free' },
      { type: 'free' },
      { type: 'occupied', code: 'IF-1102', name: 'Matematika Diskrit', classLabel: 'Kelas A', lecturer: 'Dr. Defri, M.Si', dept: 'IF', capacity: 60, enrolled: 55, unit: 'Mahasiswa' },
      { type: 'occupied', code: 'IF-1102', name: 'Matematika Diskrit', classLabel: 'Kelas B', lecturer: 'Dr. Defri, M.Si', dept: 'IF', capacity: 60, enrolled: 53, unit: 'Mahasiswa' },
      { type: 'occupied', code: 'IF-1102', name: 'Matematika Diskrit', classLabel: 'Kelas C', lecturer: 'Dr. Defri, M.Si', dept: 'IF', capacity: 60, enrolled: 50, unit: 'Mahasiswa' },
      { type: 'break' },
      { type: 'free' },
      { type: 'occupied', code: 'TK-1205', name: 'Elektronika', classLabel: 'Kelas A', lecturer: 'Dwi, M.T.', dept: 'TK', capacity: 60, enrolled: 42, unit: 'Mahasiswa' },
    ],
  },
  {
    id: 'g203',
    name: 'G-203',
    fullName: 'G-203',
    type: 'Teori',
    building: 'Gedung Utama FTI',
    floor: 2,
    capacity: 50,
    unit: 'Mahasiswa',
    utilPct: 100,
    accentColor: 'bg-rose-600',
    isOverload: true,
    slots: [
      { type: 'overload', code: 'SI-3105', name: 'Analisis Proses', classLabel: 'Kelas A', lecturer: 'Husnil Kamil, M.T.', dept: 'SI', capacity: 50, enrolled: 51, unit: 'Mahasiswa' },
      { type: 'overload', code: 'SI-3105', name: 'Analisis Proses', classLabel: 'Kelas B', lecturer: 'Husnil Kamil, M.T.', dept: 'SI', capacity: 50, enrolled: 50, unit: 'Mahasiswa' },
      { type: 'overload', code: 'SI-3105', name: 'Analisis Proses', classLabel: 'Kelas C', lecturer: 'Husnil Kamil, M.T.', dept: 'SI', capacity: 50, enrolled: 50, unit: 'Mahasiswa' },
      { type: 'occupied', code: 'IF-2207', name: 'Struktur Data', classLabel: 'Kelas A', lecturer: 'Dwi, M.T.', dept: 'IF', capacity: 50, enrolled: 48, unit: 'Mahasiswa' },
      { type: 'occupied', code: 'IF-2207', name: 'Struktur Data', classLabel: 'Kelas B', lecturer: 'Dwi, M.T.', dept: 'IF', capacity: 50, enrolled: 47, unit: 'Mahasiswa' },
      { type: 'break' },
      { type: 'occupied', code: 'TK-2104', name: 'Jaringan Komp', classLabel: 'Kelas A', lecturer: 'Eko, Ph.D', dept: 'TK', capacity: 50, enrolled: 44, unit: 'Mahasiswa' },
      { type: 'occupied', code: 'TK-2104', name: 'Jaringan Komp', classLabel: 'Kelas B', lecturer: 'Eko, Ph.D', dept: 'TK', capacity: 50, enrolled: 42, unit: 'Mahasiswa' },
    ],
  },
  {
    id: 'g204',
    name: 'G-204',
    fullName: 'G-204',
    type: 'Teori',
    building: 'Gedung Utama FTI',
    floor: 2,
    capacity: 55,
    unit: 'Mahasiswa',
    utilPct: 54,
    accentColor: 'bg-teal-500',
    slots: [
      { type: 'free' },
      { type: 'free' },
      { type: 'free' },
      { type: 'free' },
      { type: 'occupied', code: 'SI-3208', name: 'Audit SI', classLabel: 'Kelas A', lecturer: 'Dr. Rahmi, M.Kom', dept: 'SI', capacity: 55, enrolled: 48, unit: 'Mahasiswa' },
      { type: 'break' },
      { type: 'occupied', code: 'SI-3208', name: 'Audit SI', classLabel: 'Kelas B', lecturer: 'Dr. Rahmi, M.Kom', dept: 'SI', capacity: 55, enrolled: 46, unit: 'Mahasiswa' },
      { type: 'occupied', code: 'SI-3208', name: 'Audit SI', classLabel: 'Kelas C', lecturer: 'Dr. Rahmi, M.Kom', dept: 'SI', capacity: 55, enrolled: 44, unit: 'Mahasiswa' },
    ],
  },
  {
    id: 'g205',
    name: 'G-205',
    fullName: 'G-205',
    type: 'Teori',
    building: 'Gedung Utama FTI',
    floor: 2,
    capacity: 45,
    unit: 'Mahasiswa',
    utilPct: 64,
    accentColor: 'bg-cyan-500',
    slots: [
      { type: 'occupied', code: 'TI-1002', name: 'Pengantar TI', classLabel: 'Kelas A', lecturer: 'Tim Pengampu TI', dept: 'SI', capacity: 45, enrolled: 42, unit: 'Mahasiswa' },
      { type: 'occupied', code: 'TI-1002', name: 'Pengantar TI', classLabel: 'Kelas B', lecturer: 'Tim Pengampu TI', dept: 'SI', capacity: 45, enrolled: 40, unit: 'Mahasiswa' },
      { type: 'free' },
      { type: 'free' },
      { type: 'free' },
      { type: 'break' },
      { type: 'occupied', code: 'IF-3204', name: 'Teori Bahasa', classLabel: 'Kelas A', lecturer: 'Hasdi, M.Kom', dept: 'IF', capacity: 45, enrolled: 38, unit: 'Mahasiswa' },
      { type: 'occupied', code: 'IF-3204', name: 'Teori Bahasa', classLabel: 'Kelas B', lecturer: 'Hasdi, M.Kom', dept: 'IF', capacity: 45, enrolled: 36, unit: 'Mahasiswa' },
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

  const [rooms, setRooms] = useState<RoomRow[]>(buildInitialRooms);
  const [selectedDay, setSelectedDay] = useState<string>('Senin');
  const [filterBuilding, setFilterBuilding] = useState<string>('Semua');
  const [filterTime, setFilterTime] = useState<string>('Semua');
  const [filterType, setFilterType] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'heatmap' | 'requests'>('heatmap');
  const [selectedRoomDetail, setSelectedRoomDetail] = useState<RoomRow | null>(null);

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

  // ── API Integration (UC-16: Real-time + Auto-refresh + Error Fallback) ──
  const [apiData, setApiData] = useState<RoomUtilizationResponse | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const mapApiToRoomRows = useCallback((data: RoomUtilizationResponse): RoomRow[] => {
    if (!data.rooms || data.rooms.length === 0) return buildInitialRooms();

    const accentColors = [
      'bg-blue-600', 'bg-indigo-500', 'bg-teal-500', 'bg-cyan-500',
      'bg-purple-600', 'bg-rose-600', 'bg-emerald-500', 'bg-amber-500',
    ];

    return data.rooms.map((r, idx) => {
      // Map slots from API ke format TIME_COLS (8 kolom per hari)
      const mappedSlots: SlotData[] = TIME_COLS.map((col) => {
        if (col.isBreak) return { type: 'break' as SlotType };

        // Cari slot API yang cocok dengan jam kolom ini
        const apiSlot = r.slots.find(
          (s) => s.start_time === col.time || s.time_label.startsWith(col.time)
        );

        if (!apiSlot || apiSlot.status === 'free') {
          return { type: 'free' as SlotType };
        }

        return {
          type: apiSlot.status === 'overload' ? 'overload' as SlotType : 'occupied' as SlotType,
          code: apiSlot.course_code || '',
          name: apiSlot.course_name || '',
          classLabel: apiSlot.class_label || '',
          lecturer: apiSlot.lecturer_name || '',
          lecturers: apiSlot.lecturer_names || [],
          dept: (apiSlot.department || 'FTI') as 'SI' | 'IF' | 'TK',
          capacity: apiSlot.capacity || r.capacity,
          enrolled: apiSlot.enrolled_count || 0,
          unit: r.room_type?.includes('Lab') ? 'PC' : 'Mahasiswa',
        };
      });

      const roomType: 'Teori' | 'Lab Software' | 'Lab Hardware' =
        r.room_type === 'Lab Software' ? 'Lab Software' :
        r.room_type === 'Lab Hardware' ? 'Lab Hardware' : 'Teori';

      return {
        id: r.room_id || r.room_code,
        name: r.room_code,
        fullName: r.room_code,
        type: roomType,
        building: r.building,
        floor: r.floor,
        capacity: r.capacity,
        unit: roomType.includes('Lab') ? 'PC' : 'Mahasiswa',
        utilPct: Math.round(r.utilization_percentage),
        accentColor: r.is_overload ? 'bg-rose-600' : accentColors[idx % accentColors.length],
        isOverload: r.is_overload,
        slots: mappedSlots,
      };
    });
  }, []);

  const fetchUtilization = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoadingApi(true);
    try {
      const data = await apiService.getRoomUtilization({
        day: selectedDay,
      });
      setApiData(data);
      const mapped = mapApiToRoomRows(data);
      setRooms(mapped);
      setApiError(null);
      setLastUpdatedAt(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch {
      // UC-16 EF-1: Pertahankan tampilan terakhir & tampilkan pesan galat
      setApiError('Gagal mengambil data utilisasi terbaru dari server. Menampilkan data terakhir dan mencoba ulang otomatis.');
    } finally {
      if (!isSilent) setIsLoadingApi(false);
    }
  }, [selectedDay, mapApiToRoomRows]);

  useEffect(() => {
    fetchUtilization(false);
    // UC-16 AF-3: Pembaruan otomatis berkala tiap 30 detik
    const timer = setInterval(() => {
      fetchUtilization(true);
    }, 30000);
    return () => clearInterval(timer);
  }, [fetchUtilization]);

  const buildingOptions = React.useMemo(() => {
    const set = new Set<string>();
    rooms.forEach((r) => {
      if (r.building) set.add(r.building);
    });
    return ['Semua', ...Array.from(set).sort()];
  }, [rooms]);

  // Filtering UC-16 AF-1 (Gedung, Hari, Jam, Tipe, Pencarian)
  const filteredRooms = rooms.filter((r) => {
    if (filterBuilding !== 'Semua' && r.building !== filterBuilding) return false;
    if (filterType === 'Teori' && r.type !== 'Teori') return false;
    if (filterType === 'Lab' && r.type === 'Teori') return false;
    if (filterTime !== 'Semua') {
      const colIdx = TIME_COLS.findIndex((t) => t.time === filterTime);
      if (colIdx !== -1) {
        const slotAtTime = r.slots[colIdx];
        // Tampilkan ruang yang terpakai pada jam tersebut (atau cocok filter)
        if (!slotAtTime || (slotAtTime.type !== 'occupied' && slotAtTime.type !== 'overload')) {
          return false;
        }
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchRoom =
        r.name.toLowerCase().includes(q) ||
        r.fullName.toLowerCase().includes(q) ||
        r.building.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        `lt. ${r.floor}`.includes(q) ||
        `lantai ${r.floor}`.includes(q);
      const matchSlot = r.slots.some(
        (s) =>
          s.code?.toLowerCase().includes(q) ||
          s.name?.toLowerCase().includes(q) ||
          s.classLabel?.toLowerCase().includes(q) ||
          s.lecturer?.toLowerCase().includes(q) ||
          s.dept?.toLowerCase().includes(q)
      );
      if (!matchRoom && !matchSlot) return false;
    }
    return true;
  });

  const totalRooms = apiData?.summary?.total_rooms ?? 28;
  const freeSlotsCount = apiData?.summary?.total_free_slots ?? rooms.reduce((acc, r) => acc + r.slots.filter((s) => s.type === 'free').length, 0);
  const overloadCount = apiData?.summary?.overload_classes_count ?? rooms.filter((r) => r.isOverload).length;
  const avgUtil = apiData?.summary?.average_utilization_percentage != null
    ? Math.round(apiData.summary.average_utilization_percentage)
    : Math.round(rooms.reduce((acc, r) => acc + r.utilPct, 0) / rooms.length);

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
      {/* ── 4 Metric Summary Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Ruang</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalRooms}</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Slot Kosong Siap Pakai</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{freeSlotsCount} Slot</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Ruang Overload / Penuh</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-rose-700">{overloadCount} Ruang</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
              overloadCount > 0
                ? 'text-rose-700 bg-rose-50 border-rose-200'
                : 'text-emerald-700 bg-emerald-50 border-emerald-200'
            }`}>
              {overloadCount > 0 ? 'Butuh Aksi' : 'Aman'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Filter Bar & Actions ────────────────────────────────────── */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap xl:flex-nowrap items-center justify-between gap-3 overflow-x-auto">
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
        <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap">
          {/* Filter Gedung (UC-16 AF-1) */}
          <select
            value={filterBuilding}
            onChange={(e) => setFilterBuilding(e.target.value)}
            aria-label="Filter Gedung"
            className="text-xs font-semibold border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-blue-500"
          >
            {buildingOptions.map((bld) => (
              <option key={bld} value={bld}>
                {bld === 'Semua' ? 'Semua Gedung' : bld}
              </option>
            ))}
          </select>

          {/* Filter Jam (UC-16 AF-1) */}
          <select
            value={filterTime}
            onChange={(e) => setFilterTime(e.target.value)}
            aria-label="Filter Jam"
            className="text-xs font-semibold border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="Semua">Semua Jam</option>
            {TIME_COLS.filter((c) => !c.isBreak).map((c) => (
              <option key={c.time} value={c.time}>
                Jam {c.label}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ruang, gedung, MK, dosen..."
              className="pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-500 w-48 md:w-56"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                title="Hapus pencarian"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => showToast('Mengunduh laporan utilisasi ruang dalam format PDF...', 'info')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Unduh PDF</span>
          </button>
        </div>
      </div>

      {/* ── UC-16 EF-1: Error Banner (Pertahankan tampilan terakhir) ───── */}
      {apiError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{apiError}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchUtilization(false)}
            className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] shrink-0"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* ── Utilisasi Ruang FTI (Card Grid ala Wadek 1 + Hover Detail) ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#082c78]">
              <Grid3X3 className="w-4 h-4" />
              <span>Utilisasi Ruang FTI</span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Arahkan kursor pada indikator biru/merah untuk melihat detail jadwal, atau klik nama ruang untuk melihat rincian pemakaian ruang. Menampilkan {filteredRooms.length} dari {totalRooms} ruang.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdatedAt && !isLoadingApi && (
              <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                Auto-sync · {lastUpdatedAt}
              </span>
            )}
            {isLoadingApi && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Memuat data...
              </span>
            )}
          </div>
        </div>

        {filteredRooms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center space-y-2">
            <Search className="w-6 h-6 text-slate-300 mx-auto" />
            <div className="text-xs font-bold text-slate-700">Tidak ada data utilisasi untuk filter yang dipilih</div>
            <p className="text-[11px] text-slate-500">
              Ubah filter gedung, hari, jam, tipe ruang, atau kata kunci pencarian untuk menampilkan data.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterType('Semua');
                setFilterBuilding('Semua');
                setFilterTime('Semua');
              }}
              className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-colors"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {filteredRooms.map((room) => {
              const activeSlots = room.slots.filter((s) => s.type !== 'break');
              const usedSlots = activeSlots.filter((s) => s.type === 'occupied' || s.type === 'overload').length;
              const totalSlots = activeSlots.length || 6;
              const pct = room.utilPct ?? Math.round((usedSlots / totalSlots) * 100);
              const heatColor =
                pct >= 60
                  ? 'bg-blue-600 text-white'
                  : pct >= 40
                  ? 'bg-blue-400 text-white'
                  : pct >= 20
                  ? 'bg-blue-200 text-blue-900'
                  : pct > 0
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-slate-100 text-slate-500';
              const barColor =
                pct >= 60
                  ? 'bg-blue-600'
                  : pct >= 40
                  ? 'bg-blue-400'
                  : pct >= 20
                  ? 'bg-blue-300'
                  : 'bg-blue-200';

              return (
                <div key={`card-${room.id}`} className="rounded-xl border border-slate-200/80 p-4 hover:border-blue-300 transition-colors bg-white">
                  <div
                    onClick={() => setSelectedRoomDetail(room)}
                    className="cursor-pointer group"
                    title="Klik untuk melihat detail jadwal pemakaian ruang ini"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate transition-colors">
                        {room.name}
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 ${heatColor}`}>
                        {pct}%
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500">
                      {room.type} · Kapasitas {room.capacity} · {room.building} Lt. {room.floor}
                    </div>
                  </div>
                  <div className="mt-2 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>

                  {/* Indikator sesi per jam (diperlebar + hover tooltip ala matriks sebelumnya) */}
                  <div className="mt-3 grid grid-cols-6 gap-1.5">
                    {TIME_COLS.filter((c) => !c.isBreak).slice(0, 6).map((col, idx) => {
                      const colIdx = TIME_COLS.findIndex((t) => t.time === col.time);
                      const slot = room.slots[colIdx] || { type: 'free' as SlotType };
                      const isUsed = slot.type === 'occupied' || slot.type === 'overload';
                      const isOver = slot.type === 'overload';
                      return (
                        <div key={`${room.id}-${col.time}-${idx}`} className="text-center">
                          <div className="text-[9px] font-medium text-slate-500 mb-1">{col.label}</div>
                          <button
                            type="button"
                            onClick={() => handleSlotClick(room, slot, colIdx)}
                            onMouseEnter={(e) => {
                              if (!isUsed) return;
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              setTooltip({
                                roomName: room.name,
                                col: col.time,
                                slot,
                                x: rect.left,
                                y: rect.bottom + 200 > window.innerHeight ? rect.top - 175 : rect.bottom + 8,
                              });
                            }}
                            onMouseLeave={() => setTooltip(null)}
                            className={`w-full h-7 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                              isOver
                                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-2xs'
                                : isUsed
                                ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-2xs'
                                : 'bg-slate-100 hover:bg-emerald-100 border border-slate-200/80 text-slate-400'
                            }`}
                          >
                            {isUsed && (
                              <span className="text-[9px] font-bold truncate px-0.5">
                                {slot.code?.split('-')[0] || 'MK'}
                              </span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-100 px-4 py-2.5 text-[10px] text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-bold text-slate-800">Keterangan Slot:</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-blue-500" />Biru: Terisi Kuliah (Occupied)</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-rose-500" />Merah: Overload (Melebihi Kapasitas)</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-slate-100 border border-slate-200" />Abu-abu: Kosong (Tersedia)</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-slate-800">Tingkat Utilisasi:</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" />≥ 60%</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-400" />40–59%</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-200" />20–39%</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-slate-200" />0%</span>
          </div>
        </div>
      </section>

      {/* ── Hover Tooltip (Desain Pop-up Detail Jadwal Perkuliahan Admin) ── */}
      {tooltip && tooltip.slot.type !== 'free' && tooltip.slot.type !== 'break' && (
        <div
          className="fixed z-50 w-72 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden pointer-events-none"
          style={{
            top: Math.max(8, tooltip.y),
            left: Math.min(tooltip.x, window.innerWidth - 300),
          }}
        >
          <div className="bg-[#082c78] text-white px-4 py-2.5">
            <div className="flex items-center justify-between gap-2 text-[10px] text-blue-200 font-semibold">
              <span className="font-mono bg-blue-900/60 px-1.5 py-0.5 rounded text-white">
                {tooltip.slot.code || '-'}
              </span>
              {tooltip.slot.classLabel && (
                <span className="bg-white/15 px-1.5 py-0.5 rounded text-white">
                  {tooltip.slot.classLabel}
                </span>
              )}
            </div>
            <div className="font-black text-xs text-white mt-1 leading-snug">
              {tooltip.slot.name}
            </div>
          </div>
          <div className="bg-blue-50 px-4 py-2.5 grid grid-cols-2 gap-2.5 text-[11px]">
            <div>
              <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Hari &amp; Waktu</div>
              <div className="font-bold text-slate-900 mt-0.5">{selectedDay}</div>
              <div className="text-slate-600 text-[10px]">{tooltip.col} WIB</div>
            </div>
            <div>
              <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Ruang</div>
              <div className="font-bold text-slate-900 mt-0.5 truncate">{tooltip.roomName}</div>
              <div className="text-slate-600 text-[10px]">
                {tooltip.slot.enrolled} / {tooltip.slot.capacity} Mahasiswa
              </div>
            </div>
            <div className="col-span-2 pt-1 border-t border-blue-100">
              <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Dosen Pengampu</div>
              {(tooltip.slot.lecturers?.length ? tooltip.slot.lecturers : [tooltip.slot.lecturer || '—']).map((name, i) => (
                <div key={i} className="font-bold text-slate-900 mt-0.5 leading-snug">{name}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── UC-16 AF-2: Modal Detail Jadwal Pemakaian Ruang ─────────────── */}
      {selectedRoomDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#082c78] text-white px-5 py-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold text-blue-200 uppercase tracking-wider">
                  Detail Jadwal Pemakaian Ruang • {selectedDay}
                </div>
                <h3 className="text-base font-black mt-0.5">{selectedRoomDetail.fullName}</h3>
                <div className="text-xs text-blue-100 mt-1">
                  {selectedRoomDetail.building} Lt. {selectedRoomDetail.floor} · Kapasitas {selectedRoomDetail.capacity} {selectedRoomDetail.unit} · Utilisasi {selectedRoomDetail.utilPct}%
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoomDetail(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-2.5 max-h-[65vh] overflow-y-auto">
              {TIME_COLS.filter((c) => !c.isBreak).map((col) => {
                const colIdx = TIME_COLS.findIndex((t) => t.time === col.time);
                const slot = selectedRoomDetail.slots[colIdx] || { type: 'free' as SlotType };
                const isUsed = slot.type === 'occupied' || slot.type === 'overload';
                return (
                  <div
                    key={col.time}
                    className={`rounded-xl border p-3 flex items-center justify-between gap-3 text-xs ${
                      slot.type === 'overload'
                        ? 'bg-rose-50 border-rose-200'
                        : isUsed
                        ? 'bg-blue-50/70 border-blue-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-mono font-bold text-slate-700 text-[11px]">{col.label} WIB</div>
                      {isUsed ? (
                        <>
                          <div className="font-bold text-slate-900 mt-0.5">
                            {slot.code} — {slot.name} ({slot.classLabel})
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Dosen: {slot.lecturer || 'Tim Dosen FTI'} · {slot.enrolled}/{slot.capacity} Mahasiswa
                          </div>
                        </>
                      ) : (
                        <div className="text-slate-500 mt-0.5">Kosong (Tersedia untuk perkuliahan/pengganti)</div>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        slot.type === 'overload'
                          ? 'bg-rose-600 text-white'
                          : isUsed
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {slot.type === 'overload' ? 'Overload' : isUsed ? 'Terpakai' : 'Kosong'}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRoomDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold"
              >
                Tutup
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
      {isBookingModalOpen && selectedSlotForBooking && currentRole === 'dosen' && (
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
      {isBookingModalOpen && selectedSlotForBooking && currentRole !== 'dosen' && (
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
                <span />

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
                <span />

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
                    <div className="font-bold text-slate-800">Ruang G-101</div>
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
                    <div className="font-bold text-slate-800">Ruang G-201</div>
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
