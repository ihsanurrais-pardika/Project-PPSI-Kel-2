import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Grid3X3,
  Calendar,
  Clock,
  Layers,
  Search,
  Download,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Moon,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
  Building,
  Tv,
} from 'lucide-react';

export const HeatmapRuangPage: React.FC = () => {
  const { rooms, setIsRoomReplacementModalOpen, showToast } = useApp();

  const [selectedDay, setSelectedDay] = useState<'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat'>('Senin');
  const [selectedBuilding, setSelectedBuilding] = useState('Semua');
  const [searchFilterRoom, setSearchFilterRoom] = useState('');
  
  // Quick instant search state
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
  };

  const handleRequestSeminar = () => {
    showToast('Pengajuan izin pemakaian Ruang Seminar FTI telah dikirimkan ke Sekretariat Dekanat & Wadek I.', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
            <span className="bg-blue-100 px-2 py-0.5 rounded">Monitoring Spasial Real-Time</span>
            <span>•</span>
            <span className="text-slate-500">Sinkronisasi Terakhir: Hari ini, 08:42 WIB</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Heatmap Utilisasi & Slot Ruang Kosong
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitoring okupansi ruang per slot waktu perkuliahan untuk identifikasi ruang luang dan penjadwalan kelas pengganti.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsRoomReplacementModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 shadow-sm transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>Cari Ruang Kosong Cepat</span>
          </button>
          <button
            onClick={() => showToast('Mengunduh matriks pemakaian ruang perkuliahan (PDF)...', 'info')}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Unduh Laporan Matriks</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Ruang Pantau
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">28</span>
            <span className="text-xs text-slate-500">Ruangan</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Gedung FTI Utama & Lab Terpadu</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Okupansi Rata-rata
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-700">68.4%</span>
            <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
              Optimal
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
            <div className="bg-indigo-600 h-full rounded-full" style={{ width: '68.4%' }} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Slot Kosong Hari Ini
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">42</span>
            <span className="text-xs text-slate-500">Slot Sesi</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Siap digunakan untuk kelas insidental</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Ruang Lab Aktif
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Tv className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-700">8/10</span>
            <span className="text-xs text-slate-500">Laboratorium</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">80% praktikum terjadwal aktif</p>
        </div>
      </div>

      {/* Filter and Legend Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Day Pills */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                selectedDay === day
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-3">
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Semua">Semua Gedung FTI</option>
            <option value="Gedung FTI">Gedung Utama FTI</option>
            <option value="GKB">GKB Bersama</option>
          </select>

          <select
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>Semua Sesi (07:30 - 18:00)</option>
            <option>Sesi Pagi (07:30 - 11:00)</option>
            <option>Sesi Siang (11:10 - 15:10)</option>
            <option>Sesi Sore (15:30 - 18:00)</option>
          </select>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#1e293b]" />
            <span>Terisi Kuliah</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-sky-100 border border-sky-300" />
            <span className="text-blue-700 font-medium">Slot Bebas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-slate-200" />
            <span>Istirahat</span>
          </div>
        </div>
      </div>

      {/* Heatmap Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
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
                  <div className="bg-[#1e293b] text-white p-2 rounded-lg text-[11px] shadow-2xs">
                    <div className="font-semibold text-blue-300">IF-2101 Algoritma</div>
                    <div className="text-slate-300 truncate">Kelas A • Dosen TIM</div>
                    <div className="text-[10px] text-slate-400 mt-1">56/60 Mhs</div>
                  </div>
                </td>
                <td className="p-2">
                  <div className="bg-[#1e293b] text-white p-2 rounded-lg text-[11px] shadow-2xs">
                    <div className="font-semibold text-blue-300">SI-1204 Basis Data</div>
                    <div className="text-slate-300 truncate">Kelas B • Dr. Surya</div>
                    <div className="text-[10px] text-slate-400 mt-1">58/60 Mhs</div>
                  </div>
                </td>
                <td className="p-2">
                  <button
                    onClick={() => handleOpenSlot('G-101', '11:10 - 12:50')}
                    className="w-full h-full min-h-[64px] bg-sky-50/80 border border-dashed border-sky-300 rounded-lg text-blue-600 hover:bg-sky-100 flex flex-col items-center justify-center gap-1 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4 text-blue-500" />
                    <span className="text-[11px] font-semibold">Kosong (Bebas)</span>
                  </button>
                </td>
                <td className="p-2 bg-slate-100/50 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400 text-[10px] gap-1 py-3">
                    <Moon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Jeda Shalat/Dhuhur</span>
                  </div>
                </td>
                <td className="p-2">
                  <div className="bg-[#1e293b] text-white p-2 rounded-lg text-[11px] shadow-2xs">
                    <div className="font-semibold text-blue-300">TK-3201 Mikroprosesor</div>
                    <div className="text-slate-300 truncate">Kelas A • Ir. Hendra</div>
                    <div className="text-[10px] text-slate-400 mt-1">48/60 Mhs</div>
                  </div>
                </td>
                <td className="p-2">
                  <button
                    onClick={() => handleOpenSlot('G-101', '15:30 - 17:10')}
                    className="w-full h-full min-h-[64px] bg-sky-50/80 border border-dashed border-sky-300 rounded-lg text-blue-600 hover:bg-sky-100 flex flex-col items-center justify-center gap-1 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4 text-blue-500" />
                    <span className="text-[11px] font-semibold">Kosong (Bebas)</span>
                  </button>
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
                  <button
                    onClick={() => handleOpenSlot('G-102', '07:30 - 09:10')}
                    className="w-full h-full min-h-[64px] bg-sky-50/80 border border-dashed border-sky-300 rounded-lg text-blue-600 hover:bg-sky-100 flex flex-col items-center justify-center gap-1 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4 text-blue-500" />
                    <span className="text-[11px] font-semibold">Kosong (Bebas)</span>
                  </button>
                </td>
                <td className="p-2">
                  <div className="bg-[#1e293b] text-white p-2 rounded-lg text-[11px] shadow-2xs">
                    <div className="font-semibold text-blue-300">SI-2102 Rekayasa Web</div>
                    <div className="text-slate-300 truncate">Kelas C • Fikri, M.Kom</div>
                    <div className="text-[10px] text-slate-400 mt-1">45/50 Mhs</div>
                  </div>
                </td>
                <td className="p-2">
                  <button
                    onClick={() => handleOpenSlot('G-102', '11:10 - 12:50')}
                    className="w-full h-full min-h-[64px] bg-sky-50/80 border border-dashed border-sky-300 rounded-lg text-blue-600 hover:bg-sky-100 flex flex-col items-center justify-center gap-1 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4 text-blue-500" />
                    <span className="text-[11px] font-semibold">Kosong (Bebas)</span>
                  </button>
                </td>
                <td className="p-2 bg-slate-100/50 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400 text-[10px] gap-1 py-3">
                    <Moon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Jeda Shalat/Dhuhur</span>
                  </div>
                </td>
                <td className="p-2">
                  <div className="bg-[#1e293b] text-white p-2 rounded-lg text-[11px] shadow-2xs">
                    <div className="font-semibold text-blue-300">IF-3301 Kriptografi</div>
                    <div className="text-slate-300 truncate">Kelas B • Prof. Asril</div>
                    <div className="text-[10px] text-slate-400 mt-1">48/50 Mhs</div>
                  </div>
                </td>
                <td className="p-2">
                  <div className="bg-[#1e293b] text-white p-2 rounded-lg text-[11px] shadow-2xs">
                    <div className="font-semibold text-blue-300">SI-3205 Etika Profesi</div>
                    <div className="text-slate-300 truncate">Kelas A • Dr. Rahmi</div>
                    <div className="text-[10px] text-slate-400 mt-1">42/50 Mhs</div>
                  </div>
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
                  <div className="bg-[#1e293b] text-white p-2 rounded-lg text-[11px] shadow-2xs">
                    <div className="font-semibold text-blue-300">SI-3105 Analisis Proses</div>
                    <div className="text-slate-300 truncate">Kelas A • Husnil, MT</div>
                    <div className="text-[10px] text-slate-400 mt-1">49/50 Mhs</div>
                  </div>
                </td>
                <td className="p-2">
                  <div className="bg-[#1e293b] text-white p-2 rounded-lg text-[11px] shadow-2xs">
                    <div className="font-semibold text-blue-300">SI-3105 Analisis Proses</div>
                    <div className="text-slate-300 truncate">Lanjutan Praktik/Studi</div>
                    <div className="text-[10px] text-slate-400 mt-1">49/50 Mhs</div>
                  </div>
                </td>
                <td className="p-2">
                  <div className="bg-[#1e293b] text-white p-2 rounded-lg text-[11px] shadow-2xs">
                    <div className="font-semibold text-blue-300">IF-2207 Struktur Data</div>
                    <div className="text-slate-300 truncate">Kelas B • Dwi, M.T.</div>
                    <div className="text-[10px] text-slate-400 mt-1">50/50 Mhs</div>
                  </div>
                </td>
                <td className="p-2 bg-slate-100/50 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400 text-[10px] gap-1 py-3">
                    <Moon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Jeda Shalat/Dhuhur</span>
                  </div>
                </td>
                <td className="p-2">
                  <div className="bg-[#1e293b] text-white p-2 rounded-lg text-[11px] shadow-2xs">
                    <div className="font-semibold text-blue-300">TK-2104 Jaringan Komputer</div>
                    <div className="text-slate-300 truncate">Kelas C • Eko, Ph.D</div>
                    <div className="text-[10px] text-slate-400 mt-1">44/50 Mhs</div>
                  </div>
                </td>
                <td className="p-2">
                  <button
                    onClick={() => handleOpenSlot('G-203', '15:30 - 17:10')}
                    className="w-full h-full min-h-[64px] bg-sky-50/80 border border-dashed border-sky-300 rounded-lg text-blue-600 hover:bg-sky-100 flex flex-col items-center justify-center gap-1 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4 text-blue-500" />
                    <span className="text-[11px] font-semibold">Kosong (Bebas)</span>
                  </button>
                </td>
              </tr>

              {/* Row 4: Lab Software 1 */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="p-3 border-r border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-7 rounded-full bg-purple-600" />
                    <div>
                      <div className="font-bold text-slate-800">Lab Software 1</div>
                      <div className="text-[11px] text-slate-400">Lab • 40 Kursi</div>
                    </div>
                  </div>
                </td>
                <td className="p-2">
                  <div className="bg-[#1e293b] text-white p-2 rounded-lg text-[11px] shadow-2xs">
                    <div className="font-semibold text-purple-300">PRAK-IF101 Daspro</div>
                    <div className="text-slate-300 truncate">Shift 1 • Asisten Lab</div>
                    <div className="text-[10px] text-slate-400 mt-1">38/40 PC</div>
                  </div>
                </td>
                <td className="p-2">
                  <div className="bg-[#1e293b] text-white p-2 rounded-lg text-[11px] shadow-2xs">
                    <div className="font-semibold text-purple-300">PRAK-IF101 Daspro</div>
                    <div className="text-slate-300 truncate">Shift 2 • Asisten Lab</div>
                    <div className="text-[10px] text-slate-400 mt-1">40/40 PC</div>
                  </div>
                </td>
                <td className="p-2">
                  <div className="bg-[#1e293b] text-white p-2 rounded-lg text-[11px] shadow-2xs">
                    <div className="font-semibold text-purple-300">PRAK-SI201 PBD</div>
                    <div className="text-slate-300 truncate">Shift 1 • Asisten Lab</div>
                    <div className="text-[10px] text-slate-400 mt-1">35/40 PC</div>
                  </div>
                </td>
                <td className="p-2 bg-slate-100/50 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400 text-[10px] gap-1 py-3">
                    <Moon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Jeda Shalat/Dhuhur</span>
                  </div>
                </td>
                <td className="p-2">
                  <div className="bg-[#1e293b] text-white p-2 rounded-lg text-[11px] shadow-2xs">
                    <div className="font-semibold text-purple-300">PRAK-IF302 Basis Data</div>
                    <div className="text-slate-300 truncate">Shift A • Lab Terpadu</div>
                    <div className="text-[10px] text-slate-400 mt-1">39/40 PC</div>
                  </div>
                </td>
                <td className="p-2">
                  <button
                    onClick={() => handleOpenSlot('Lab Software 1', '15:30 - 17:10')}
                    className="w-full h-full min-h-[64px] bg-sky-50/80 border border-dashed border-sky-300 rounded-lg text-blue-600 hover:bg-sky-100 flex flex-col items-center justify-center gap-1 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4 text-blue-500" />
                    <span className="text-[11px] font-semibold">Kosong (Bebas)</span>
                  </button>
                </td>
              </tr>

              {/* Row 5: Lab Hardware */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="p-3 border-r border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-7 rounded-full bg-emerald-600" />
                    <div>
                      <div className="font-bold text-slate-800">Lab Hardware</div>
                      <div className="text-[11px] text-slate-400">Lab • 35 Kursi</div>
                    </div>
                  </div>
                </td>
                <td className="p-2">
                  <button
                    onClick={() => handleOpenSlot('Lab Hardware', '07:30 - 09:10')}
                    className="w-full h-full min-h-[64px] bg-sky-50/80 border border-dashed border-sky-300 rounded-lg text-blue-600 hover:bg-sky-100 flex flex-col items-center justify-center gap-1 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4 text-blue-500" />
                    <span className="text-[11px] font-semibold">Kosong (Bebas)</span>
                  </button>
                </td>
                <td className="p-2">
                  <button
                    onClick={() => handleOpenSlot('Lab Hardware', '09:20 - 11:00')}
                    className="w-full h-full min-h-[64px] bg-sky-50/80 border border-dashed border-sky-300 rounded-lg text-blue-600 hover:bg-sky-100 flex flex-col items-center justify-center gap-1 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4 text-blue-500" />
                    <span className="text-[11px] font-semibold">Kosong (Bebas)</span>
                  </button>
                </td>
                <td className="p-2">
                  <div className="bg-[#1e293b] text-white p-2 rounded-lg text-[11px] shadow-2xs">
                    <div className="font-semibold text-emerald-300">TK-2201 Sis. Embedded</div>
                    <div className="text-slate-300 truncate">Kelas B • Dr. Eng. Firdaus</div>
                    <div className="text-[10px] text-slate-400 mt-1">30/35 Kit</div>
                  </div>
                </td>
                <td className="p-2 bg-slate-100/50 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400 text-[10px] gap-1 py-3">
                    <Moon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Jeda Shalat/Dhuhur</span>
                  </div>
                </td>
                <td className="p-2">
                  <button
                    onClick={() => handleOpenSlot('Lab Hardware', '13:30 - 15:10')}
                    className="w-full h-full min-h-[64px] bg-sky-50/80 border border-dashed border-sky-300 rounded-lg text-blue-600 hover:bg-sky-100 flex flex-col items-center justify-center gap-1 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4 text-blue-500" />
                    <span className="text-[11px] font-semibold">Kosong (Bebas)</span>
                  </button>
                </td>
                <td className="p-2">
                  <button
                    onClick={() => handleOpenSlot('Lab Hardware', '15:30 - 17:10')}
                    className="w-full h-full min-h-[64px] bg-sky-50/80 border border-dashed border-sky-300 rounded-lg text-blue-600 hover:bg-sky-100 flex flex-col items-center justify-center gap-1 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4 text-blue-500" />
                    <span className="text-[11px] font-semibold">Kosong (Bebas)</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span>Klik slot bertuliskan <strong>"Kosong (Bebas)"</strong> untuk langsung memesan atau mengalokasikan ruang pengganti.</span>
          </div>
          <span className="font-medium text-slate-600">5 dari 28 Ruang Ditampilkan</span>
        </div>
      </div>

      {/* Bottom Section: Pencari Ruang Pengganti Instan (F-18) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Pencari Ruang Pengganti Instan
              </h3>
              <p className="text-xs text-slate-500">
                Temukan ruang kosong berdasar kriteria untuk kebutuhan kuliah darurat atau jadwal susulan.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Auto-Filtering Aktif
          </span>
        </div>

        {/* Query Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Pilih Hari
            </label>
            <select
              value={instantDay}
              onChange={(e) => setInstantDay(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {days.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Pilih Jam / Sesi
            </label>
            <select
              value={instantSession}
              onChange={(e) => setInstantSession(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="07:30 - 09:10 (Sesi 1)">07:30 - 09:10 (Sesi 1)</option>
              <option value="09:20 - 11:00 (Sesi 2)">09:20 - 11:00 (Sesi 2)</option>
              <option value="11:10 - 12:50 (Sesi 3)">11:10 - 12:50 (Sesi 3)</option>
              <option value="13:30 - 15:10 (Sesi 4)">13:30 - 15:10 (Sesi 4)</option>
              <option value="15:30 - 17:10 (Sesi 5)">15:30 - 17:10 (Sesi 5)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Kapasitas Minimal (Mhs)
            </label>
            <input
              type="number"
              value={instantMinCap}
              onChange={(e) => setInstantMinCap(Number(e.target.value))}
              min={10}
              max={150}
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <button
              onClick={() => showToast('Pencarian ruang pengganti instan diperbarui!', 'info')}
              className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Perbarui Pencarian</span>
            </button>
          </div>
        </div>

        {/* Result status banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 flex items-center gap-2 text-xs text-blue-800">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Ditemukan <strong>4 ruang kosong</strong> yang siap dialokasikan untuk kelas darurat atau ujian susulan pada sesi terpilih.
          </span>
        </div>

        {/* 4 Matched Room Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Card 1 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">G-101</h4>
                  <p className="text-xs text-slate-500">Gedung Utama Lantai 1</p>
                </div>
                <span className="text-[11px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  50 Kursi
                </span>
              </div>
              <div className="mt-3 space-y-1 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Proyektor & AC Aktif</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tersedia Sesi 3 (11:10)</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleAllocateInstant('G-101')}
              className="mt-4 w-full py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
            >
              Alokasikan Ruang
            </button>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">G-102</h4>
                  <p className="text-xs text-slate-500">Gedung Utama Lantai 1</p>
                </div>
                <span className="text-[11px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  50 Kursi
                </span>
              </div>
              <div className="mt-3 space-y-1 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Smart TV & Sound System</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tersedia Sesi 3 (11:10)</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleAllocateInstant('G-102')}
              className="mt-4 w-full py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
            >
              Alokasikan Ruang
            </button>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">G-301</h4>
                  <p className="text-xs text-slate-500">Gedung Utama Lantai 3</p>
                </div>
                <span className="text-[11px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                  75 Kursi
                </span>
              </div>
              <div className="mt-3 space-y-1 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ruang Teater / Kapasitas Besar</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Bebas Sepanjang Hari</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleAllocateInstant('G-301')}
              className="mt-4 w-full py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
            >
              Alokasikan Ruang
            </button>
          </div>

          {/* Card 4 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Seminar FTI</h4>
                  <p className="text-xs text-slate-500">Gedung Dekanat Lt. 2</p>
                </div>
                <span className="text-[11px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                  100 Kursi
                </span>
              </div>
              <div className="mt-3 space-y-1 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                  <span>Hybrid Conference Ready</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Perlu Konfirmasi Wadek I</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleRequestSeminar}
              className="mt-4 w-full py-1.5 bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
            >
              Ajukan Izin Pakai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
