import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Calendar,
  Clock,
  Layers,
  Search,
  Download,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Moon,
  X,
  SlidersHorizontal,
  Building,
  Tv,
  Users,
  BookOpen,
  MapPin,
  Check,
  ChevronRight,
} from 'lucide-react';

interface CourseScheduleCell {
  id: string;
  code: string;
  name: string;
  classLabel: string;
  lecturer: string;
  dept: 'SI' | 'IF' | 'TK';
  enrolled: number;
  capacity: number;
  roomName: string;
  sessionTime: string;
  type?: string;
}

export const HeatmapRuangPage: React.FC = () => {
  const { rooms, setIsRoomReplacementModalOpen, showToast, setActivePage } = useApp();

  const [selectedDay, setSelectedDay] = useState<'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat'>('Senin');
  const [selectedBuilding, setSelectedBuilding] = useState('Semua');
  
  // Slide-over drawer state for Instant Replacement Finder
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Modal / Popover state for course details
  const [selectedCourseDetail, setSelectedCourseDetail] = useState<CourseScheduleCell | null>(null);

  // Quick instant search state inside drawer
  const [instantDay, setInstantDay] = useState('Senin');
  const [instantSession, setInstantSession] = useState('11:10 - 12:50 (Sesi 3)');
  const [instantMinCap, setInstantMinCap] = useState(40);

  const days: Array<'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat'> = [
    'Senin',
    'Selasa',
    'Rabu',
    'Kamis',
    'Jumat',
  ];

  const handleOpenSlot = (roomCode: string, sessionLabel: string) => {
    setIsRoomReplacementModalOpen(true);
  };

  const handleAllocateInstant = (roomName: string) => {
    showToast(`Ruang ${roomName} berhasil dialokasikan untuk kelas pengganti pada ${instantDay}, ${instantSession}!`, 'success');
    setIsDrawerOpen(false);
  };

  const handleRequestSeminar = () => {
    showToast('Pengajuan izin pemakaian Ruang Seminar FTI telah dikirimkan ke Sekretariat Dekanat & Wadek I.', 'info');
    setIsDrawerOpen(false);
  };

  // Helper for pastel card style based on Department
  const getDeptCardStyle = (dept: 'SI' | 'IF' | 'TK') => {
    switch (dept) {
      case 'SI':
        return 'bg-sky-50/90 hover:bg-sky-100/90 border-sky-200 border-l-sky-500 text-sky-950';
      case 'IF':
        return 'bg-indigo-50/90 hover:bg-indigo-100/90 border-indigo-200 border-l-indigo-500 text-indigo-950';
      case 'TK':
        return 'bg-purple-50/90 hover:bg-purple-100/90 border-purple-200 border-l-purple-500 text-purple-950';
      default:
        return 'bg-slate-50 hover:bg-slate-100 border-slate-200 border-l-slate-400 text-slate-800';
    }
  };

  // Helper component for schedule cell (Max 2 lines, pastel card, click for details)
  const RenderCourseCell: React.FC<{ item: CourseScheduleCell }> = ({ item }) => {
    const cardColor = getDeptCardStyle(item.dept);

    return (
      <button
        type="button"
        onClick={() => setSelectedCourseDetail(item)}
        className={`w-full text-left p-2 rounded-lg border border-l-4 transition-all shadow-2xs cursor-pointer group ${cardColor}`}
        title="Klik untuk melihat detail lengkap mata kuliah & kapasitas"
      >
        {/* Line 1: Nama Mata Kuliah */}
        <div className="font-bold text-xs truncate leading-tight group-hover:text-blue-700 transition-colors">
          {item.name}
        </div>
        {/* Line 2: Kelas & Dosen */}
        <div className="text-[10px] text-slate-600 truncate mt-1 leading-tight">
          {item.classLabel} • {item.lecturer}
        </div>
      </button>
    );
  };

  // Helper component for empty slot (Clean, hover-only "+ Pilih Ruang")
  const RenderEmptySlot: React.FC<{ roomName: string; sessionTime: string }> = ({ roomName, sessionTime }) => {
    return (
      <div
        onClick={() => handleOpenSlot(roomName, sessionTime)}
        className="group relative w-full h-full min-h-[58px] rounded-lg border border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 flex items-center justify-center transition-all cursor-pointer p-1"
        title={`Slot Kosong: ${roomName} (${sessionTime}) - Klik untuk memilih ruang`}
      >
        <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-white border border-blue-200 rounded-md shadow-xs">
          <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
          <span>+ Pilih Ruang</span>
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
            <span className="bg-blue-100 px-2 py-0.5 rounded">Monitoring Ketersediaan Ruangan</span>
            <span>•</span>
            <span className="text-slate-500">Sinkronisasi Real-time</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Ketersediaan Ruang Perkuliahan
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-3xl">
            Pemantauan okupansi ruang per slot waktu untuk identifikasi ruang luang dan penjadwalan kelas pengganti.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* CTA Button that triggers slide-over drawer */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-[#082c78] hover:bg-[#0c3999] rounded-lg shadow-sm shadow-blue-900/20 active:scale-98 transition-all"
          >
            <Search className="w-3.5 h-3.5" />
            <span>+ Cari Ruang Pengganti</span>
          </button>

          <button
            onClick={() => showToast('Mengunduh matriks pemakaian ruang perkuliahan (PDF)...', 'info')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Unduh Matriks</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Ruang Pantau
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">28</span>
            <span className="text-xs text-slate-500">Ruangan</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Gedung Utama FTI &amp; GKB Bersama</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Okupansi Rata-rata
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-700">68.4%</span>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
              Optimal
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div className="bg-indigo-600 h-full rounded-full" style={{ width: '68.4%' }} />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Slot Kosong Hari Ini
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">42</span>
            <span className="text-xs text-slate-500">Slot Sesi</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Siap digunakan untuk kelas insidental</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Ruang Lab Aktif
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Tv className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700">8/10</span>
            <span className="text-xs text-slate-500">Laboratorium</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">80% praktikum terjadwal aktif</p>
        </div>
      </div>

      {/* Filter and Pastel Legend Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Day Pills */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-3.5 py-1 rounded-md text-xs font-semibold transition-all ${
                selectedDay === day
                  ? 'bg-[#082c78] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2.5">
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="Semua">Semua Gedung</option>
            <option value="Gedung FTI">Gedung Utama FTI</option>
            <option value="GKB">GKB Bersama</option>
          </select>
        </div>

        {/* Soft Pastel Legend per Department */}
        <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-sky-100 border border-sky-300 border-l-2 border-l-sky-500" />
            <span className="font-medium text-slate-700">Sistem Informasi</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-indigo-100 border border-indigo-300 border-l-2 border-l-indigo-500" />
            <span className="font-medium text-slate-700">Informatika</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-purple-100 border border-purple-300 border-l-2 border-l-purple-500" />
            <span className="font-medium text-slate-700">Teknik Komputer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs border border-dashed border-slate-300 bg-slate-50" />
            <span className="text-slate-500">Slot Kosong (Hover)</span>
          </div>
        </div>
      </div>

      {/* Heatmap Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-44">Ruang Perkuliahan</th>
                <th className="py-3 px-3 text-center">
                  <div>07:30 - 09:10</div>
                  <div className="text-[10px] text-slate-400 font-normal">Sesi 1 (100m)</div>
                </th>
                <th className="py-3 px-3 text-center">
                  <div>09:20 - 11:00</div>
                  <div className="text-[10px] text-slate-400 font-normal">Sesi 2 (100m)</div>
                </th>
                <th className="py-3 px-3 text-center">
                  <div>11:10 - 12:50</div>
                  <div className="text-[10px] text-slate-400 font-normal">Sesi 3 (100m)</div>
                </th>
                <th className="py-3 px-2 text-center bg-slate-100/70 w-24">
                  <div>12:50 - 13:30</div>
                  <div className="text-[10px] text-slate-400 font-normal">Istirahat (40m)</div>
                </th>
                <th className="py-3 px-3 text-center">
                  <div>13:30 - 15:10</div>
                  <div className="text-[10px] text-slate-400 font-normal">Sesi 4 (100m)</div>
                </th>
                <th className="py-3 px-3 text-center">
                  <div>15:30 - 17:10</div>
                  <div className="text-[10px] text-slate-400 font-normal">Sesi 5 (100m)</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {/* Row 1: G-101 */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="p-3 border-r border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-7 rounded-full bg-blue-600" />
                    <div>
                      <div className="font-bold text-slate-800">G-101</div>
                      <div className="text-[11px] text-slate-400">Teori • 60 Kursi</div>
                    </div>
                  </div>
                </td>
                <td className="p-2">
                  <RenderCourseCell
                    item={{
                      id: 'h-1',
                      code: 'IF-2101',
                      name: 'Algoritma Pemrograman',
                      classLabel: 'Kelas A',
                      lecturer: 'Dosen TIM',
                      dept: 'IF',
                      enrolled: 56,
                      capacity: 60,
                      roomName: 'G-101',
                      sessionTime: '07:30 - 09:10',
                    }}
                  />
                </td>
                <td className="p-2">
                  <RenderCourseCell
                    item={{
                      id: 'h-2',
                      code: 'SI-1204',
                      name: 'Basis Data',
                      classLabel: 'Kelas B',
                      lecturer: 'Dr. Surya',
                      dept: 'SI',
                      enrolled: 58,
                      capacity: 60,
                      roomName: 'G-101',
                      sessionTime: '09:20 - 11:00',
                    }}
                  />
                </td>
                <td className="p-2">
                  <RenderEmptySlot roomName="G-101" sessionTime="11:10 - 12:50" />
                </td>
                <td className="p-2 bg-slate-100/50 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400 text-[10px] gap-1 py-3">
                    <Moon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Jeda Shalat</span>
                  </div>
                </td>
                <td className="p-2">
                  <RenderCourseCell
                    item={{
                      id: 'h-3',
                      code: 'TK-3201',
                      name: 'Mikroprosesor & Antarmuka',
                      classLabel: 'Kelas A',
                      lecturer: 'Ir. Hendra',
                      dept: 'TK',
                      enrolled: 48,
                      capacity: 60,
                      roomName: 'G-101',
                      sessionTime: '13:30 - 15:10',
                    }}
                  />
                </td>
                <td className="p-2">
                  <RenderEmptySlot roomName="G-101" sessionTime="15:30 - 17:10" />
                </td>
              </tr>

              {/* Row 2: G-102 */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="p-3 border-r border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-7 rounded-full bg-blue-500" />
                    <div>
                      <div className="font-bold text-slate-800">G-102</div>
                      <div className="text-[11px] text-slate-400">Teori • 50 Kursi</div>
                    </div>
                  </div>
                </td>
                <td className="p-2">
                  <RenderEmptySlot roomName="G-102" sessionTime="07:30 - 09:10" />
                </td>
                <td className="p-2">
                  <RenderCourseCell
                    item={{
                      id: 'h-4',
                      code: 'SI-2102',
                      name: 'Rekayasa Web',
                      classLabel: 'Kelas C',
                      lecturer: 'Fikri, M.Kom',
                      dept: 'SI',
                      enrolled: 45,
                      capacity: 50,
                      roomName: 'G-102',
                      sessionTime: '09:20 - 11:00',
                    }}
                  />
                </td>
                <td className="p-2">
                  <RenderEmptySlot roomName="G-102" sessionTime="11:10 - 12:50" />
                </td>
                <td className="p-2 bg-slate-100/50 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400 text-[10px] gap-1 py-3">
                    <Moon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Jeda Shalat</span>
                  </div>
                </td>
                <td className="p-2">
                  <RenderCourseCell
                    item={{
                      id: 'h-5',
                      code: 'IF-3301',
                      name: 'Kriptografi & Keamanan',
                      classLabel: 'Kelas B',
                      lecturer: 'Prof. Asril',
                      dept: 'IF',
                      enrolled: 48,
                      capacity: 50,
                      roomName: 'G-102',
                      sessionTime: '13:30 - 15:10',
                    }}
                  />
                </td>
                <td className="p-2">
                  <RenderCourseCell
                    item={{
                      id: 'h-6',
                      code: 'SI-3205',
                      name: 'Etika Profesi TI',
                      classLabel: 'Kelas A',
                      lecturer: 'Dr. Rahmi',
                      dept: 'SI',
                      enrolled: 42,
                      capacity: 50,
                      roomName: 'G-102',
                      sessionTime: '15:30 - 17:10',
                    }}
                  />
                </td>
              </tr>

              {/* Row 3: G-203 */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="p-3 border-r border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-7 rounded-full bg-indigo-600" />
                    <div>
                      <div className="font-bold text-slate-800">G-203</div>
                      <div className="text-[11px] text-slate-400">Teori • 50 Kursi</div>
                    </div>
                  </div>
                </td>
                <td className="p-2">
                  <RenderCourseCell
                    item={{
                      id: 'h-7',
                      code: 'SI-3105',
                      name: 'Analisis Proses Bisnis',
                      classLabel: 'Kelas A',
                      lecturer: 'Husnil, MT',
                      dept: 'SI',
                      enrolled: 49,
                      capacity: 50,
                      roomName: 'G-203',
                      sessionTime: '07:30 - 09:10',
                    }}
                  />
                </td>
                <td className="p-2">
                  <RenderCourseCell
                    item={{
                      id: 'h-8',
                      code: 'SI-3105',
                      name: 'Analisis Proses Bisnis',
                      classLabel: 'Kelas Lanjutan',
                      lecturer: 'Husnil, MT',
                      dept: 'SI',
                      enrolled: 49,
                      capacity: 50,
                      roomName: 'G-203',
                      sessionTime: '09:20 - 11:00',
                    }}
                  />
                </td>
                <td className="p-2">
                  <RenderCourseCell
                    item={{
                      id: 'h-9',
                      code: 'IF-2207',
                      name: 'Struktur Data & Algoritma',
                      classLabel: 'Kelas B',
                      lecturer: 'Dwi, M.T.',
                      dept: 'IF',
                      enrolled: 50,
                      capacity: 50,
                      roomName: 'G-203',
                      sessionTime: '11:10 - 12:50',
                    }}
                  />
                </td>
                <td className="p-2 bg-slate-100/50 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400 text-[10px] gap-1 py-3">
                    <Moon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Jeda Shalat</span>
                  </div>
                </td>
                <td className="p-2">
                  <RenderCourseCell
                    item={{
                      id: 'h-10',
                      code: 'TK-2104',
                      name: 'Jaringan Komputer',
                      classLabel: 'Kelas C',
                      lecturer: 'Eko, Ph.D',
                      dept: 'TK',
                      enrolled: 44,
                      capacity: 50,
                      roomName: 'G-203',
                      sessionTime: '13:30 - 15:10',
                    }}
                  />
                </td>
                <td className="p-2">
                  <RenderEmptySlot roomName="G-203" sessionTime="15:30 - 17:10" />
                </td>
              </tr>

              {/* Row 4: Lab Software 1 */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="p-3 border-r border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-7 rounded-full bg-indigo-600" />
                    <div>
                      <div className="font-bold text-slate-800">Lab Software 1</div>
                      <div className="text-[11px] text-slate-400">Lab • 40 Kursi</div>
                    </div>
                  </div>
                </td>
                <td className="p-2">
                  <RenderCourseCell
                    item={{
                      id: 'h-11',
                      code: 'PRAK-IF101',
                      name: 'Praktikum Dasar Pemrograman',
                      classLabel: 'Shift 1',
                      lecturer: 'Asisten Lab IF',
                      dept: 'IF',
                      enrolled: 38,
                      capacity: 40,
                      roomName: 'Lab Software 1',
                      sessionTime: '07:30 - 09:10',
                    }}
                  />
                </td>
                <td className="p-2">
                  <RenderCourseCell
                    item={{
                      id: 'h-12',
                      code: 'PRAK-IF101',
                      name: 'Praktikum Dasar Pemrograman',
                      classLabel: 'Shift 2',
                      lecturer: 'Asisten Lab IF',
                      dept: 'IF',
                      enrolled: 40,
                      capacity: 40,
                      roomName: 'Lab Software 1',
                      sessionTime: '09:20 - 11:00',
                    }}
                  />
                </td>
                <td className="p-2">
                  <RenderCourseCell
                    item={{
                      id: 'h-13',
                      code: 'PRAK-SI201',
                      name: 'Praktikum Basis Data',
                      classLabel: 'Shift 1',
                      lecturer: 'Asisten Lab SI',
                      dept: 'SI',
                      enrolled: 35,
                      capacity: 40,
                      roomName: 'Lab Software 1',
                      sessionTime: '11:10 - 12:50',
                    }}
                  />
                </td>
                <td className="p-2 bg-slate-100/50 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400 text-[10px] gap-1 py-3">
                    <Moon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Jeda Shalat</span>
                  </div>
                </td>
                <td className="p-2">
                  <RenderCourseCell
                    item={{
                      id: 'h-14',
                      code: 'PRAK-IF302',
                      name: 'Praktikum Basis Data Lanjut',
                      classLabel: 'Shift A',
                      lecturer: 'Lab Terpadu',
                      dept: 'IF',
                      enrolled: 39,
                      capacity: 40,
                      roomName: 'Lab Software 1',
                      sessionTime: '13:30 - 15:10',
                    }}
                  />
                </td>
                <td className="p-2">
                  <RenderEmptySlot roomName="Lab Software 1" sessionTime="15:30 - 17:10" />
                </td>
              </tr>

              {/* Row 5: Lab Hardware */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="p-3 border-r border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-7 rounded-full bg-purple-600" />
                    <div>
                      <div className="font-bold text-slate-800">Lab Hardware</div>
                      <div className="text-[11px] text-slate-400">Lab • 35 Kursi</div>
                    </div>
                  </div>
                </td>
                <td className="p-2">
                  <RenderEmptySlot roomName="Lab Hardware" sessionTime="07:30 - 09:10" />
                </td>
                <td className="p-2">
                  <RenderEmptySlot roomName="Lab Hardware" sessionTime="09:20 - 11:00" />
                </td>
                <td className="p-2">
                  <RenderCourseCell
                    item={{
                      id: 'h-15',
                      code: 'TK-2201',
                      name: 'Sistem Embedded & IoT',
                      classLabel: 'Kelas B',
                      lecturer: 'Dr. Eng. Firdaus',
                      dept: 'TK',
                      enrolled: 30,
                      capacity: 35,
                      roomName: 'Lab Hardware',
                      sessionTime: '11:10 - 12:50',
                    }}
                  />
                </td>
                <td className="p-2 bg-slate-100/50 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400 text-[10px] gap-1 py-3">
                    <Moon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Jeda Shalat</span>
                  </div>
                </td>
                <td className="p-2">
                  <RenderEmptySlot roomName="Lab Hardware" sessionTime="13:30 - 15:10" />
                </td>
                <td className="p-2">
                  <RenderEmptySlot roomName="Lab Hardware" sessionTime="15:30 - 17:10" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Clean footer bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span>
              Arahkan kursor pada slot kosong untuk memilih ruang, atau gunakan tombol <strong>+ Cari Ruang Pengganti</strong>.
            </span>
          </div>
          <span className="font-medium text-slate-600">5 Ruangan Representatif Ditampilkan</span>
        </div>
      </div>

      {/* ── Slide-over Drawer: Pencari Ruang Pengganti Instan ── */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          {/* Drawer container */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Search className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      Pencari Ruang Pengganti Instan
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Alokasi ruang cepat untuk kuliah darurat atau susulan
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Query Controls */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Kriteria Ruang
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Pilih Hari
                      </label>
                      <select
                        value={instantDay}
                        onChange={(e) => setInstantDay(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-blue-500"
                      >
                        {days.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Kapasitas Minimal
                      </label>
                      <input
                        type="number"
                        value={instantMinCap}
                        onChange={(e) => setInstantMinCap(Number(e.target.value))}
                        min={10}
                        max={150}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Pilih Jam / Sesi
                    </label>
                    <select
                      value={instantSession}
                      onChange={(e) => setInstantSession(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="07:30 - 09:10 (Sesi 1)">07:30 - 09:10 (Sesi 1)</option>
                      <option value="09:20 - 11:00 (Sesi 2)">09:20 - 11:00 (Sesi 2)</option>
                      <option value="11:10 - 12:50 (Sesi 3)">11:10 - 12:50 (Sesi 3)</option>
                      <option value="13:30 - 15:10 (Sesi 4)">13:30 - 15:10 (Sesi 4)</option>
                      <option value="15:30 - 17:10 (Sesi 5)">15:30 - 17:10 (Sesi 5)</option>
                    </select>
                  </div>
                </div>

                {/* Banner Status */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2 text-xs text-blue-900">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Ditemukan <strong>4 ruang kosong</strong> yang memenuhi kriteria untuk dialokasikan.
                  </span>
                </div>

                {/* Matched Cards */}
                <div className="space-y-3">
                  {/* Card 1: G-101 */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:border-blue-300 transition-colors flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">G-101</h4>
                          <p className="text-xs text-slate-500">Gedung Utama Lantai 1</p>
                        </div>
                        <span className="text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                          50 Kursi
                        </span>
                      </div>
                      <div className="mt-2.5 space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Proyektor &amp; AC Aktif</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Tersedia pada {instantSession}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAllocateInstant('G-101')}
                      className="mt-3 w-full py-1.5 bg-[#082c78] hover:bg-[#0c3999] text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
                    >
                      Alokasikan Ruang Ini
                    </button>
                  </div>

                  {/* Card 2: G-102 */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:border-blue-300 transition-colors flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">G-102</h4>
                          <p className="text-xs text-slate-500">Gedung Utama Lantai 1</p>
                        </div>
                        <span className="text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                          50 Kursi
                        </span>
                      </div>
                      <div className="mt-2.5 space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Smart TV &amp; Sound System</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Tersedia pada {instantSession}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAllocateInstant('G-102')}
                      className="mt-3 w-full py-1.5 bg-[#082c78] hover:bg-[#0c3999] text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
                    >
                      Alokasikan Ruang Ini
                    </button>
                  </div>

                  {/* Card 3: G-301 */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:border-blue-300 transition-colors flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">G-301 (Ruang Teater)</h4>
                          <p className="text-xs text-slate-500">Gedung Utama Lantai 3</p>
                        </div>
                        <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded">
                          75 Kursi
                        </span>
                      </div>
                      <div className="mt-2.5 space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Kapasitas Besar • Proyektor Ganda</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Bebas Sepanjang Hari</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAllocateInstant('G-301')}
                      className="mt-3 w-full py-1.5 bg-[#082c78] hover:bg-[#0c3999] text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
                    >
                      Alokasikan Ruang Ini
                    </button>
                  </div>

                  {/* Card 4: Seminar FTI */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:border-blue-300 transition-colors flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">Ruang Seminar FTI</h4>
                          <p className="text-xs text-slate-500">Gedung Dekanat Lt. 2</p>
                        </div>
                        <span className="text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded">
                          100 Kursi
                        </span>
                      </div>
                      <div className="mt-2.5 space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-purple-600" />
                          <span>Hybrid Video Conference</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                          <span>Memerlukan Izin Dekanat / WD1</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleRequestSeminar}
                      className="mt-3 w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
                    >
                      Ajukan Izin Pakai
                    </button>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Tutup Drawer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal / Popover: Detail Lengkap Mata Kuliah ── */}
      {selectedCourseDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => setSelectedCourseDetail(null)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
          />

          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {selectedCourseDetail.code}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    selectedCourseDetail.dept === 'SI' ? 'bg-sky-100 text-sky-800' :
                    selectedCourseDetail.dept === 'IF' ? 'bg-indigo-100 text-indigo-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {selectedCourseDetail.dept === 'SI' ? 'Sistem Informasi' :
                     selectedCourseDetail.dept === 'IF' ? 'Informatika' : 'Teknik Komputer'}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                  {selectedCourseDetail.name}
                </h3>
              </div>

              <button
                onClick={() => setSelectedCourseDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Specs */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Kelas &amp; SKS</div>
                  <div className="font-bold text-slate-800 mt-0.5">{selectedCourseDetail.classLabel} (3 SKS)</div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Ruang &amp; Sesi</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {selectedCourseDetail.roomName} • {selectedCourseDetail.sessionTime}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Dosen Pengampu</div>
                <div className="font-bold text-slate-800 mt-0.5">{selectedCourseDetail.lecturer}</div>
              </div>

              {/* Kapasitas bar */}
              <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Kapasitas Peserta</span>
                  <strong className="text-blue-900">
                    {selectedCourseDetail.enrolled} / {selectedCourseDetail.capacity} Mahasiswa
                  </strong>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{
                      width: `${Math.min(100, (selectedCourseDetail.enrolled / selectedCourseDetail.capacity) * 100)}%`,
                    }}
                  />
                </div>
                <div className="text-[10px] text-slate-500">
                  Okupansi {Math.round((selectedCourseDetail.enrolled / selectedCourseDetail.capacity) * 100)}% dari kapasitas ruang
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedCourseDetail(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  setSelectedCourseDetail(null);
                  setActivePage('jadwal_kuliah');
                }}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#082c78] hover:bg-[#0c3999] rounded-lg transition-colors flex items-center gap-1 shadow-xs"
              >
                <span>Lihat Jadwal Terpadu</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
