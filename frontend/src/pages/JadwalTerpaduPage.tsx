import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ScheduleItem } from '../types';
import {
  Calendar,
  Table as TableIcon,
  Search,
  Filter,
  Printer,
  Download,
  CheckCircle2,
  Clock,
  Building,
  Users,
  Compass,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';

export const JadwalTerpaduPage: React.FC = () => {
  const { schedule, setSelectedRoomForNav, setIsRoomNavModalOpen, showToast, rooms } = useApp();

  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
  const [selectedDept, setSelectedDept] = useState<'Semua' | 'SI' | 'IF' | 'TK'>('Semua');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDay, setFilterDay] = useState('Semua');

  const days = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'];
  const sessionColumns = [
    { id: 1, label: 'SESI 1 (07:30 - 09:10)' },
    { id: 2, label: 'SESI 2 (09:20 - 11:00)' },
    { id: 3, label: 'SESI 3 (11:10 - 12:50)' },
    { id: 4, label: 'SESI 4 (13:30 - 15:10)' },
    { id: 5, label: 'SESI 5 (15:30 - 17:10)' },
  ];

  // Filtering
  const filteredSchedule = schedule.filter((item) => {
    const matchesDept = selectedDept === 'Semua' || item.department === selectedDept;
    const matchesSearch =
      item.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.lecturerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.roomName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDay = filterDay === 'Semua' || item.day.toUpperCase() === filterDay.toUpperCase();
    return matchesDept && matchesSearch && matchesDay;
  });

  const handleOpenNavForRoom = (roomName: string) => {
    const foundRoom = rooms.find((r) => r.name.toLowerCase().includes(roomName.toLowerCase()) || r.code.toLowerCase().includes(roomName.toLowerCase())) || rooms[0];
    setSelectedRoomForNav(foundRoom);
    setIsRoomNavModalOpen(true);
  };

  const handlePrint = () => {
    showToast('Menyiapkan format cetak Master Jadwal Kuliah Terpadu FTI...', 'info');
    window.print();
  };

  const handleExport = (format: string) => {
    showToast(`Mengekspor jadwal perkuliahan terpadu ke format ${format}...`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
            <span className="bg-blue-100 px-2 py-0.5 rounded font-mono">SEM GANJIL 2024/2025</span>
            <span>•</span>
            <span className="text-slate-500">Master Roster Terpusat</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Jadwal Perkuliahan Terpadu FTI
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 max-w-3xl">
            Master jadwal perkuliahan terintegrasi seluruh departemen, dosen pengampu, rombel kelas, dan optimasi alokasi ruang perkuliahan Fakultas Teknologi Informasi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Cetak Jadwal</span>
          </button>

          <div className="relative group">
            <button
              onClick={() => handleExport('Excel')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export Jadwal</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Top Status Banner */}
      <div className="bg-white rounded-xl border border-blue-200 shadow-xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-800">
                Solver CP-SAT Status: Teroptimasi Penuh
              </h4>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                100% Feasible
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              0 Hard Conflict • 1 Warning Soft Constraint • Waktu Eksekusi GA: 4.8 detik
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Rata-rata Utilisasi Ruang
            </span>
            <span className="text-base font-bold text-slate-800">87.4%</span>
          </div>
          <div className="w-32 bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full rounded-full" style={{ width: '87.4%' }} />
          </div>
        </div>
      </div>

      {/* View Switcher and Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Switcher: Kalender Mingguan vs Tabel Detail */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Kalender Mingguan</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabel Detail</span>
            </button>
          </div>

          {/* Department Filter Pills */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 mr-2 font-medium">Departemen:</span>
            {(['Semua', 'SI', 'IF', 'TK'] as const).map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  selectedDept === dept
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {dept === 'Semua'
                  ? 'Semua'
                  : dept === 'SI'
                  ? 'Sistem Informasi'
                  : dept === 'IF'
                  ? 'Informatika'
                  : 'Teknik Komputer'}
              </button>
            ))}
          </div>
        </div>

        {/* Search bar and secondary dropdowns */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari mata kuliah, kode SI/IF/TK, atau ruang..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Semua">Semua Hari Perkuliahan</option>
            <option value="SENIN">Senin</option>
            <option value="SELASA">Selasa</option>
            <option value="RABU">Rabu</option>
            <option value="KAMIS">Kamis</option>
            <option value="JUMAT">Jumat</option>
          </select>

          <select className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Semua Dosen Pengampu</option>
            <option>Dr. Eng. Rahmad, M.T.</option>
            <option>Prof. Dr. Surya Afnarius</option>
            <option>Ricky Akbar, M.Kom.</option>
            <option>Darwison, M.T.</option>
          </select>

          <select className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Semua Ruang &amp; Laboratorium</option>
            <option>Ruang G-203</option>
            <option>Ruang G-205</option>
            <option>Ruang H-102</option>
            <option>Lab Software 1</option>
            <option>Lab Jaringan</option>
          </select>
        </div>
      </div>

      {/* Main View: Calendar Grid vs Table Detail */}
      {viewMode === 'calendar' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 text-left">
                  <th className="p-3 w-32 border-r border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>HARI / SESI</span>
                    </div>
                  </th>
                  {sessionColumns.map((col) => (
                    <th key={col.id} className="p-3 border-r border-slate-200 min-w-[200px]">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {days.map((day) => {
                  const dayItems = filteredSchedule.filter(
                    (item) => item.day.toUpperCase() === day
                  );

                  return (
                    <tr key={day} className="hover:bg-slate-50/50 transition-colors">
                      {/* Day Label Header */}
                      <td className="p-3 border-r border-slate-200 bg-slate-50/70 align-top">
                        <div className="font-bold text-sm text-slate-800">{day}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {dayItems.length} Sesi Aktif
                        </div>
                        <span className="inline-block mt-3 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {day === 'JUMAT' ? 'Hari Pendek' : 'Hari Kuliah'}
                        </span>
                      </td>

                      {/* Sessions 1 to 5 */}
                      {sessionColumns.map((session) => {
                        const classInSlot = dayItems.find(
                          (item) => item.sessionIndex === session.id
                        );

                        // Special case for Friday session 2 / Friday prayer
                        const isFridayBreak = day === 'JUMAT' && session.id === 2;

                        return (
                          <td
                            key={session.id}
                            className="p-2 border-r border-slate-200 align-top min-h-[90px]"
                          >
                            {isFridayBreak ? (
                              <div className="h-full min-h-[75px] rounded-lg bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-center p-2">
                                <span className="text-[11px] text-slate-400 italic">
                                  Persiapan Jumat
                                </span>
                              </div>
                            ) : classInSlot ? (
                              <div className="p-2.5 rounded-lg border border-slate-200 bg-white shadow-2xs space-y-1.5 hover:border-blue-300 transition-colors">
                                <div className="flex items-center justify-between">
                                  <span
                                    className={`font-mono text-[11px] font-bold px-1.5 py-0.2 rounded ${
                                      classInSlot.department === 'SI'
                                        ? 'bg-blue-100 text-blue-700'
                                        : classInSlot.department === 'IF'
                                        ? 'bg-indigo-100 text-indigo-700'
                                        : 'bg-purple-100 text-purple-700'
                                    }`}
                                  >
                                    {classInSlot.courseCode}
                                  </span>

                                  {classInSlot.isTandem ? (
                                    <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.2 rounded">
                                      ⚠ Tandem
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                      ✓ OK
                                    </span>
                                  )}
                                </div>

                                <div className="font-bold text-slate-800 text-[11px] leading-snug truncate">
                                  {classInSlot.courseName}
                                </div>

                                <div className="text-[10px] text-slate-500">
                                  Kelas {classInSlot.className} ({classInSlot.studentCount} Mhs)
                                </div>

                                <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px]">
                                  <button
                                    onClick={() => handleOpenNavForRoom(classInSlot.roomName)}
                                    className="font-medium text-blue-700 hover:underline flex items-center gap-0.5"
                                  >
                                    <Building className="w-2.5 h-2.5" />
                                    <span>{classInSlot.roomName}</span>
                                  </button>
                                  <span className="text-slate-400 truncate max-w-[90px]">
                                    {classInSlot.lecturerName}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="h-full min-h-[75px] rounded-lg border border-dashed border-slate-100 flex items-center justify-center">
                                <span className="text-[11px] text-slate-300 italic">
                                  Kosong
                                </span>
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
        /* Table Detail View Mode */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3">Hari &amp; Jam</th>
                  <th className="p-3">Kode MK</th>
                  <th className="p-3">Mata Kuliah</th>
                  <th className="p-3">Rombel</th>
                  <th className="p-3">Ruang Kuliah</th>
                  <th className="p-3">Dosen Pengampu</th>
                  <th className="p-3">Dept</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSchedule.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-semibold text-slate-700">
                      <div>{item.day}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{item.time}</div>
                    </td>
                    <td className="p-3 font-mono font-bold text-blue-700">
                      {item.courseCode}
                    </td>
                    <td className="p-3 font-medium text-slate-800">
                      {item.courseName}
                    </td>
                    <td className="p-3 text-slate-600">
                      Kelas {item.className} ({item.studentCount} Mhs)
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleOpenNavForRoom(item.roomName)}
                        className="text-blue-700 hover:underline font-semibold flex items-center gap-1"
                      >
                        <Building className="w-3 h-3" />
                        <span>{item.roomName}</span>
                      </button>
                    </td>
                    <td className="p-3 text-slate-600">{item.lecturerName}</td>
                    <td className="p-3 font-bold text-slate-700">{item.department}</td>
                    <td className="p-3">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        ✓ OK Feasible
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3 Department Stats Summary Cards at Bottom */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* SI */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Departemen Sistem Informasi
            </span>
            <div className="text-xl font-bold text-slate-800 mt-1">
              48 SKS <span className="text-xs font-normal text-slate-500">/ 22 Seksi Kelas</span>
            </div>
            <span className="inline-block mt-2 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              Alokasi Ruang: 94% Efisien
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            SI
          </div>
        </div>

        {/* IF */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Departemen Informatika
            </span>
            <div className="text-xl font-bold text-slate-800 mt-1">
              54 SKS <span className="text-xs font-normal text-slate-500">/ 26 Seksi Kelas</span>
            </div>
            <span className="inline-block mt-2 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
              Alokasi Lab: 89% Optimal
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            IF
          </div>
        </div>

        {/* TK */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Departemen Teknik Komputer
            </span>
            <div className="text-xl font-bold text-slate-800 mt-1">
              36 SKS <span className="text-xs font-normal text-slate-500">/ 16 Seksi Kelas</span>
            </div>
            <span className="inline-block mt-2 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
              Lab Hardware: 82% Terisi
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            TK
          </div>
        </div>
      </div>
    </div>
  );
};
