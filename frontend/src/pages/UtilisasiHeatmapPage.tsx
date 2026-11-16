import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Info,
  Download,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  BarChart3,
  Search,
  SlidersHorizontal,
  RefreshCw,
  Building2,
  Monitor,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
type SlotType = 'occupied' | 'free' | 'break' | 'overload' | 'maintenance';

interface SlotData {
  type: SlotType;
  code?: string;
  name?: string;
  classLabel?: string;
  capacity?: number;
  enrolled?: number;
  unit?: string; // 'Mhs' | 'PC' | 'Kit'
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
  slots: SlotData[]; // indices 0-8: 07:30 08:30 09:30 10:30 11:30 [12:30 BREAK] 13:30 14:30 15:30
}

// ─── Time columns (matches screenshot header) ─────────────────────────────
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

// ─── Mock heatmap data (from screenshot) ─────────────────────────────────
const buildRooms = (): RoomRow[] => [
  {
    id: 'g101',
    name: 'G-101',
    fullName: 'G-101 (Teori)',
    type: 'Teori',
    building: 'Gedung',
    floor: 1,
    capacity: 60,
    unit: 'Mhs',
    utilPct: 91,
    accentColor: 'bg-blue-600',
    slots: [
      { type: 'occupied', code: 'IF-2101', name: 'Algoritma', classLabel: 'A', capacity: 60, enrolled: 56, unit: 'Mhs' },
      { type: 'occupied', code: 'IF-2101', name: 'Algoritma', classLabel: 'B', capacity: 60, enrolled: 54, unit: 'Mhs' },
      { type: 'occupied', code: 'SI-1204', name: 'Basis Data', classLabel: 'A', capacity: 60, enrolled: 58, unit: 'Mhs' },
      { type: 'occupied', code: 'SI-1204', name: 'Basis Data', classLabel: 'B', capacity: 60, enrolled: 55, unit: 'Mhs' },
      { type: 'free' },
      { type: 'break' },
      { type: 'occupied', code: 'TK-3201', name: 'Mikroprosesor', classLabel: 'A', capacity: 60, enrolled: 48, unit: 'Mhs' },
      { type: 'occupied', code: 'TK-3201', name: 'Mikroprosesor', classLabel: 'B', capacity: 60, enrolled: 46, unit: 'Mhs' },
    ],
  },
  {
    id: 'g102',
    name: 'G-102',
    fullName: 'G-102 (Teori)',
    type: 'Teori',
    building: 'Gedung',
    floor: 1,
    capacity: 50,
    unit: 'Mhs',
    utilPct: 52,
    accentColor: 'bg-blue-500',
    slots: [
      { type: 'free' },
      { type: 'occupied', code: 'SI-2102', name: 'Rekayasa Web', classLabel: 'A', capacity: 50, enrolled: 45, unit: 'Mhs' },
      { type: 'occupied', code: 'SI-2102', name: 'Rekayasa Web', classLabel: 'B', capacity: 50, enrolled: 43, unit: 'Mhs' },
      { type: 'occupied', code: 'SI-2102', name: 'Rekayasa Web', classLabel: 'C', capacity: 50, enrolled: 44, unit: 'Mhs' },
      { type: 'free' },
      { type: 'break' },
      { type: 'occupied', code: 'IF-3301', name: 'Kriptografi', classLabel: 'A', capacity: 50, enrolled: 48, unit: 'Mhs' },
      { type: 'occupied', code: 'IF-3301', name: 'Kriptografi', classLabel: 'B', capacity: 50, enrolled: 46, unit: 'Mhs' },
    ],
  },
  {
    id: 'g201',
    name: 'G-201',
    fullName: 'G-201 (Teori)',
    type: 'Teori',
    building: 'Gedung',
    floor: 2,
    capacity: 60,
    unit: 'Mhs',
    utilPct: 75,
    accentColor: 'bg-indigo-500',
    slots: [
      { type: 'free' },
      { type: 'free' },
      { type: 'occupied', code: 'IF-1102', name: 'Matematika Diskrit', classLabel: 'A', capacity: 60, enrolled: 55, unit: 'Mhs' },
      { type: 'occupied', code: 'IF-1102', name: 'Matematika Diskrit', classLabel: 'B', capacity: 60, enrolled: 53, unit: 'Mhs' },
      { type: 'occupied', code: 'IF-1102', name: 'Matematika Diskrit', classLabel: 'C', capacity: 60, enrolled: 50, unit: 'Mhs' },
      { type: 'break' },
      { type: 'free' },
      { type: 'occupied', code: 'TK-1205', name: 'Elektronika', classLabel: 'A', capacity: 60, enrolled: 42, unit: 'Mhs' },
    ],
  },
  {
    id: 'g203',
    name: 'G-203',
    fullName: 'G-203 (Teori)',
    type: 'Teori',
    building: 'Gedung',
    floor: 2,
    capacity: 50,
    unit: 'Mhs',
    utilPct: 100,
    accentColor: 'bg-rose-600',
    isOverload: true,
    slots: [
      { type: 'overload', code: 'SI-3105', name: 'Analisis Proses', classLabel: 'A', capacity: 50, enrolled: 51, unit: 'Mhs' },
      { type: 'overload', code: 'SI-3105', name: 'Analisis Proses', classLabel: 'B', capacity: 50, enrolled: 50, unit: 'Mhs' },
      { type: 'overload', code: 'SI-3105', name: 'Analisis Proses', classLabel: 'C', capacity: 50, enrolled: 50, unit: 'Mhs' },
      { type: 'occupied', code: 'IF-2207', name: 'Struktur Data', classLabel: 'A', capacity: 50, enrolled: 48, unit: 'Mhs' },
      { type: 'occupied', code: 'IF-2207', name: 'Struktur Data', classLabel: 'B', capacity: 50, enrolled: 47, unit: 'Mhs' },
      { type: 'break' },
      { type: 'occupied', code: 'TK-2104', name: 'Jaringan Komp', classLabel: 'A', capacity: 50, enrolled: 44, unit: 'Mhs' },
      { type: 'occupied', code: 'TK-2104', name: 'Jaringan Komp', classLabel: 'B', capacity: 50, enrolled: 42, unit: 'Mhs' },
    ],
  },
  {
    id: 'g204',
    name: 'G-204',
    fullName: 'G-204 (Teori)',
    type: 'Teori',
    building: 'Gedung',
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
      { type: 'occupied', code: 'SI-3208', name: 'Audit SI', classLabel: 'A', capacity: 55, enrolled: 48, unit: 'Mhs' },
      { type: 'break' },
      { type: 'occupied', code: 'SI-3208', name: 'Audit SI', classLabel: 'B', capacity: 55, enrolled: 46, unit: 'Mhs' },
      { type: 'occupied', code: 'SI-3208', name: 'Audit SI', classLabel: 'C', capacity: 55, enrolled: 44, unit: 'Mhs' },
    ],
  },
  {
    id: 'g205',
    name: 'G-205',
    fullName: 'G-205 (Teori)',
    type: 'Teori',
    building: 'Gedung',
    floor: 2,
    capacity: 45,
    unit: 'Mhs',
    utilPct: 64,
    accentColor: 'bg-cyan-500',
    slots: [
      { type: 'occupied', code: 'TI-1002', name: 'Pengantar TI', classLabel: 'A', capacity: 45, enrolled: 42, unit: 'Mhs' },
      { type: 'occupied', code: 'TI-1002', name: 'Pengantar TI', classLabel: 'B', capacity: 45, enrolled: 40, unit: 'Mhs' },
      { type: 'free' },
      { type: 'free' },
      { type: 'free' },
      { type: 'break' },
      { type: 'occupied', code: 'IF-3284', name: 'Teori Bahasa', classLabel: 'A', capacity: 45, enrolled: 38, unit: 'Mhs' },
      { type: 'occupied', code: 'IF-3284', name: 'Teori Bahasa', classLabel: 'B', capacity: 45, enrolled: 36, unit: 'Mhs' },
    ],
  },
  {
    id: 'lab-soft',
    name: 'Lab Software 1',
    fullName: 'Lab Software 1',
    type: 'Lab Software',
    building: 'Gedung',
    floor: 2,
    capacity: 40,
    unit: 'PC',
    utilPct: 100,
    accentColor: 'bg-purple-600',
    slots: [
      { type: 'occupied', code: 'PRAK-IF101', name: 'Praktikum Daspro', classLabel: 'Shift 1', capacity: 40, enrolled: 38, unit: 'PC' },
      { type: 'occupied', code: 'PRAK-IF101', name: 'Praktikum Daspro', classLabel: 'Shift 2', capacity: 40, enrolled: 40, unit: 'PC' },
      { type: 'occupied', code: 'PRAK-IF101', name: 'Praktikum Daspro', classLabel: 'Shift 3', capacity: 40, enrolled: 39, unit: 'PC' },
      { type: 'occupied', code: 'PRAK-SI201', name: 'Praktikum PBD', classLabel: 'Shift 1', capacity: 40, enrolled: 35, unit: 'PC' },
      { type: 'occupied', code: 'PRAK-SI201', name: 'Praktikum PBD', classLabel: 'Shift 2', capacity: 40, enrolled: 37, unit: 'PC' },
      { type: 'break' },
      { type: 'occupied', code: 'PRAK-IF302', name: 'Praktikum Basis Data', classLabel: 'Shift A', capacity: 40, enrolled: 39, unit: 'PC' },
      { type: 'occupied', code: 'PRAK-IF302', name: 'Praktikum Basis Data', classLabel: 'Shift B', capacity: 40, enrolled: 38, unit: 'PC' },
    ],
  },
  {
    id: 'lab-hard',
    name: 'Lab Hardware',
    fullName: 'Lab Hardware',
    type: 'Lab Hardware',
    building: 'Gedung',
    floor: 3,
    capacity: 35,
    unit: 'Meja',
    utilPct: 58,
    accentColor: 'bg-emerald-600',
    slots: [
      { type: 'free' },
      { type: 'free' },
      { type: 'occupied', code: 'TK-2201', name: 'Sistem Embedded', classLabel: 'A', capacity: 35, enrolled: 30, unit: 'Kit' },
      { type: 'occupied', code: 'TK-2201', name: 'Sistem Embedded', classLabel: 'B', capacity: 35, enrolled: 29, unit: 'Kit' },
      { type: 'occupied', code: 'TK-2201', name: 'Sistem Embedded', classLabel: 'C', capacity: 35, enrolled: 28, unit: 'Kit' },
      { type: 'break' },
      { type: 'free' },
      { type: 'free' },
    ],
  },
];

// ─── Tooltip state ────────────────────────────────────────────────────────
interface TooltipInfo {
  roomName: string;
  col: string;
  slot: SlotData;
  x: number;
  y: number;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const UtilisasiHeatmapPage: React.FC = () => {
  const { showToast } = useApp();

  const [rooms] = useState<RoomRow[]>(buildRooms);
  const [selectedDay, setSelectedDay] = useState<string>('Senin');
  const [filterType, setFilterType] = useState<string>('Semua');
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [showCount, setShowCount] = useState<number>(7);

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

  const filteredRooms = rooms
    .filter((r) => {
      if (filterType === 'Teori') return r.type === 'Teori';
      if (filterType === 'Lab') return r.type !== 'Teori';
      return true;
    })
    .slice(0, showCount);

  const totalRooms = rooms.length;
  const overloadCount = rooms.filter((r) => r.isOverload).length;
  const freeSlots = rooms.reduce((acc, r) => acc + r.slots.filter((s) => s.type === 'free').length, 0);
  const avgUtil = Math.round(rooms.reduce((acc, r) => acc + r.utilPct, 0) / rooms.length);

  // ── Slot cell renderer ──────────────────────────────────────────────────
  const renderSlot = (room: RoomRow, slot: SlotData, colIdx: number) => {
    const col = TIME_COLS[colIdx];

    if (slot.type === 'break') {
      return (
        <td
          key={colIdx}
          className="border-l border-slate-100"
          style={{ minWidth: 90 }}
        >
          <div className="bg-amber-400 h-full min-h-[72px] flex flex-col items-center justify-center gap-1 px-2">
            <Clock className="w-3.5 h-3.5 text-amber-900" />
            <span className="text-[10px] font-black text-amber-900 uppercase tracking-wide">ISTIRAHAT</span>
          </div>
        </td>
      );
    }

    if (slot.type === 'free') {
      return (
        <td
          key={colIdx}
          className="border-l border-slate-100 p-1"
          style={{ minWidth: 90 }}
        >
          <button
            onClick={() => showToast(`Slot ${col.time} di ${room.name} kosong – siap dialokasikan untuk kelas pengganti.`, 'success')}
            className="w-full h-full min-h-[64px] bg-emerald-500 hover:bg-emerald-400 text-white rounded flex flex-col items-center justify-center gap-1 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[10px] font-bold">Kosong</span>
          </button>
        </td>
      );
    }

    if (slot.type === 'maintenance') {
      return (
        <td
          key={colIdx}
          className="border-l border-slate-100 p-1"
          style={{ minWidth: 90 }}
        >
          <div className="w-full min-h-[64px] bg-slate-200 rounded flex flex-col items-center justify-center gap-1 px-2">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[10px] font-bold text-slate-500">Maintenance</span>
          </div>
        </td>
      );
    }

    // occupied or overload
    const isOverload = slot.type === 'overload';
    const isLab = room.type !== 'Teori';
    const codeColor = isLab ? 'text-purple-300' : isOverload ? 'text-rose-300' : 'text-blue-300';

    return (
      <td
        key={colIdx}
        className="border-l border-slate-100 p-1 cursor-pointer"
        style={{ minWidth: 90 }}
        onMouseEnter={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setTooltip({ roomName: room.name, col: col.time, slot, x: rect.left, y: rect.bottom });
        }}
        onMouseLeave={() => setTooltip(null)}
      >
        <div
          className={`rounded min-h-[64px] p-2 text-white text-[11px] leading-tight transition-opacity hover:opacity-90 ${
            isOverload ? 'bg-rose-800' : 'bg-[#1e3a5f]'
          }`}
        >
          <div className={`font-bold truncate ${codeColor}`}>{slot.code}</div>
          <div className="text-slate-200 truncate text-[10px] mt-0.5">{slot.name}</div>
          <div className="text-slate-400 text-[10px] mt-1">
            {slot.enrolled}/{slot.capacity} {slot.unit ?? room.unit}
          </div>
          {isOverload && (
            <div className="mt-1 text-[9px] font-black text-rose-300 uppercase tracking-wide">⚠ Overload</div>
          )}
        </div>
      </td>
    );
  };

  // ── Util % badge color ──────────────────────────────────────────────────
  const utilBadgeColor = (pct: number) => {
    if (pct >= 100) return 'text-rose-700 font-black';
    if (pct >= 80) return 'text-amber-700 font-bold';
    return 'text-emerald-700 font-bold';
  };

  const utilBarColor = (pct: number) => {
    if (pct >= 100) return 'bg-rose-500';
    if (pct >= 80) return 'bg-amber-400';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-5">

      {/* ── Breadcrumb ─────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
        <span>Beranda</span>
        <ChevronRight className="w-3 h-3" />
        <span>Manajemen Ruangan</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-700 font-semibold">Utilisasi Heatmap</span>
      </nav>

      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Matriks Utilisasi Heatmap Mingguan
            </h1>
          </div>
          <p className="text-sm text-slate-500 max-w-2xl">
            Visualisasi okupansi slot perkuliahan per jam kerja FTI Universitas Andalas (Senin, Semester Ganjil 2024/2025).
          </p>
          <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700 w-fit">
            <Info className="w-3.5 h-3.5 shrink-0" />
            Arahkan kursor pada slot biru untuk melihat detail matakuliah dan dosen pengampu
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => showToast('Memperbarui data heatmap dari sistem jadwal…', 'info')}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Perbarui Data
          </button>
          <button
            onClick={() => showToast('Mengunduh matriks heatmap dalam format PDF…', 'info')}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh Matriks (PDF)
          </button>
        </div>
      </div>

      {/* ── Metric Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Ruang</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-800">28</div>
          <div className="text-xs text-slate-500">Ruang dipantau FTI</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Rata-rata Utilisasi</span>
            <BarChart3 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-700">{avgUtil}%</div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${avgUtil}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Slot Kosong</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{freeSlots}</div>
          <div className="text-xs text-slate-500">Siap dialokasikan</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ruang Overload</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-700">{overloadCount}</div>
          <div className="text-xs text-slate-500">Perlu tindakan segera</div>
        </div>
      </div>

      {/* ── Filter + Legend Bar ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 flex flex-wrap items-center justify-between gap-3">
        {/* Day pills */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg gap-0.5">
          {days.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                selectedDay === d
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Type filter + search */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {['Semua', 'Teori', 'Lab'].map((f) => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  filterType === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={() => showToast('Membuka pencarian ruang cepat…', 'info')}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            Cari Ruang
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-2.5 h-2.5 text-white" />
            </span>
            <span className="font-semibold text-emerald-700">Tersedia (Free)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-[#1e3a5f]" />
            <span>Terisi Kuliah (Occupied)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-amber-400" />
            <span>Istirahat / Pemeliharaan (Buffer)</span>
          </div>
        </div>
      </div>

      {/* ── Heatmap Matrix ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Top right count label */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/60">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            Heatmap interaktif – klik sel hijau untuk alokasi ruang
          </span>
          <span className="text-xs font-semibold text-slate-600">
            Menampilkan {filteredRooms.length} dari {totalRooms} Ruang Terpilih
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left" style={{ minWidth: 900 }}>
            {/* Header */}
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {/* Room column */}
                <th className="sticky left-0 z-10 bg-slate-50 py-3 px-4 border-r border-slate-200 w-52">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    Ruang &amp; Kapasitas
                  </div>
                </th>
                {TIME_COLS.map((col) => (
                  <th
                    key={col.time}
                    className={`py-3 px-2 text-center min-w-[90px] ${
                      col.isBreak
                        ? 'bg-amber-50 text-amber-700'
                        : ''
                    }`}
                  >
                    <div className={col.isBreak ? 'font-black' : ''}>{col.label}</div>
                    {col.isBreak && (
                      <div className="text-[9px] font-normal text-amber-600 normal-case tracking-normal">Jeda Istirahat</div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRooms.map((room) => (
                <tr key={room.id} className="hover:bg-slate-50/50 transition-colors">
                  {/* Room info cell */}
                  <td className="sticky left-0 z-10 bg-white border-r border-slate-100 p-3 w-52">
                    <div className="flex items-start gap-2">
                      <span className={`w-1.5 shrink-0 rounded-full mt-1 ${room.accentColor}`} style={{ height: 36 }} />
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-slate-800 text-sm leading-none">
                          {room.name}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">({room.type})</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          <span className="text-blue-600 font-semibold hover:underline cursor-pointer"
                            onClick={() => showToast(`Detail ruang ${room.name}: Kapasitas ${room.capacity} ${room.unit}, Lantai ${room.floor}`, 'info')}
                          >
                            {room.building}
                          </span>
                          {' · '}Lt. {room.floor} · {room.capacity} {room.unit}
                        </div>

                        {/* Util bar */}
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${utilBarColor(room.utilPct)} transition-all`}
                              style={{ width: `${Math.min(room.utilPct, 100)}%` }}
                            />
                          </div>
                          <span className={`text-[11px] shrink-0 ${utilBadgeColor(room.utilPct)}`}>
                            {room.utilPct}%
                          </span>
                        </div>

                        {room.isOverload && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] font-black text-rose-600">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Overload Slot</span>
                            <span className="text-rose-400 font-normal">(Penuh)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Slot cells */}
                  {room.slots.map((slot, ci) => renderSlot(room, slot, ci))}

                  {/* Fill empty if slots < TIME_COLS */}
                  {room.slots.length < TIME_COLS.length &&
                    Array.from({ length: TIME_COLS.length - room.slots.length }).map((_, ei) => (
                      <td key={`empty-${ei}`} className="border-l border-slate-100" style={{ minWidth: 90 }}>
                        <div className="min-h-[72px]" />
                      </td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Monitor className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Klik <strong className="text-emerald-700">sel hijau (Kosong)</strong> untuk langsung memesan atau mengalokasikan ruang pengganti.
              Hover <strong>sel biru</strong> untuk detail matakuliah.
            </span>
          </div>
          {showCount < totalRooms && (
            <button
              onClick={() => setShowCount((p) => Math.min(p + 7, totalRooms))}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition-colors"
            >
              Tampilkan Lebih Banyak ({totalRooms - showCount} tersisa)
            </button>
          )}
          {showCount >= totalRooms && (
            <span className="font-semibold text-slate-600">Semua {totalRooms} ruang ditampilkan</span>
          )}
        </div>
      </div>

      {/* ── Tooltip overlay ────────────────────────────────────────── */}
      {tooltip && tooltip.slot.type !== 'free' && tooltip.slot.type !== 'break' && (
        <div
          className="fixed z-50 bg-slate-900 text-white text-xs rounded-xl shadow-2xl p-3.5 w-56 pointer-events-none"
          style={{ top: tooltip.y + 8, left: Math.min(tooltip.x, window.innerWidth - 240) }}
        >
          <div className="font-black text-blue-300 text-sm">{tooltip.slot.code}</div>
          <div className="font-semibold text-white mt-0.5">{tooltip.slot.name}</div>
          <div className="text-slate-400 text-[11px] mt-1">
            {tooltip.slot.classLabel} &nbsp;·&nbsp; {tooltip.roomName} &nbsp;·&nbsp; {tooltip.col}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full"
                style={{
                  width: `${Math.round(((tooltip.slot.enrolled ?? 0) / (tooltip.slot.capacity ?? 1)) * 100)}%`,
                }}
              />
            </div>
            <span className="text-blue-300 font-bold">
              {tooltip.slot.enrolled}/{tooltip.slot.capacity} {tooltip.slot.unit}
            </span>
          </div>
        </div>
      )}

      {/* ── Instant Room Finder ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Pencari Ruang Kosong Instan</h3>
              <p className="text-xs text-slate-500">Temukan slot bebas sesuai kapasitas dan waktu yang dibutuhkan</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Auto-Filter Aktif
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Pilih Hari</label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {days.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Slot Waktu</label>
            <select className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {TIME_COLS.filter((c) => !c.isBreak).map((c) => (
                <option key={c.time}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Kapasitas Minimal</label>
            <input
              type="number"
              defaultValue={40}
              min={10}
              max={150}
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <button
              onClick={() => showToast(`Ditemukan ${freeSlots} slot kosong yang memenuhi kriteria pada hari ${selectedDay}!`, 'info')}
              className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Cari Slot Kosong
            </button>
          </div>
        </div>

        {/* Result cards: rooms with free slots */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 flex items-center gap-2 text-xs text-blue-800">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Ditemukan <strong>{freeSlots} slot kosong</strong> yang siap dialokasikan untuk kelas darurat, susulan, atau pengganti pada hari {selectedDay}.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {rooms
            .filter((r) => r.slots.some((s) => s.type === 'free'))
            .slice(0, 4)
            .map((room) => {
              const freeCount = room.slots.filter((s) => s.type === 'free').length;
              return (
                <div key={room.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">{room.name}</h4>
                        <p className="text-xs text-slate-500">Lt. {room.floor} · {room.capacity} {room.unit}</p>
                      </div>
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                        {freeCount} Slot Bebas
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-600">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>{room.type} · Fasilitas Lengkap</span>
                    </div>
                  </div>
                  <button
                    onClick={() => showToast(`Ruang ${room.name} berhasil dialokasikan untuk hari ${selectedDay}!`, 'success')}
                    className="w-full py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                  >
                    Alokasikan Ruang
                  </button>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
