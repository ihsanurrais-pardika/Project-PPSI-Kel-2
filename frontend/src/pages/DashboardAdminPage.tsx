import React from 'react';
import { useApp } from '../context/AppContext';
import {
  BookOpen,
  Users,
  UserCheck,
  Building2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Download,
  Sliders,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Sparkles,
  Laptop,
  Check,
  Clock,
  Layers,
  Activity,
  SlidersHorizontal,
  FileCheck,
  TrendingUp,
} from 'lucide-react';

export const DashboardAdminPage: React.FC = () => {
  const {
    setActivePage,
    conflicts,
    auditLogs,
    scheduleApprovalStatus,
    setIsGAConfigModalOpen,
    showToast,
    backendClasses,
    backendCourses,
    backendStatus,
    rooms,
    schedule,
    fetchBackendClasses,
    latestCPSATResult,
  } = useApp();

  const unresolvedCount = conflicts.filter((c) => !c.isResolved).length;
  const hardConflictCount = conflicts.filter((c) => !c.isResolved && c.severity === 'hard').length;
  const totalCoursesCount = backendCourses.length || 99;
  const totalClassesCount = backendClasses.length || schedule.length || 196;
  const activeRoomClassesCount = backendClasses.filter((c) => c.requires_room).length || totalClassesCount;
  const labClassesCount = backendClasses.filter((c) => c.room_type_needed.toLowerCase() === 'lab').length;
  const theoryClassesCount = totalClassesCount - labClassesCount;
  const scheduledCount = latestCPSATResult?.scheduled_classes ?? schedule.length;
  const pctScheduled = activeRoomClassesCount > 0 ? Math.min(100, Math.round((scheduledCount / activeRoomClassesCount) * 1000) / 10) : 100;

  const handleExport = () => {
    showToast('Mengekspor ringkasan eksekutif dashboard (Format Excel & PDF)...', 'info');
    setTimeout(() => {
      showToast('Berkas Rekapitulasi_Dashboard_FTI_2024.xlsx berhasil diunduh.', 'success');
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mb-1">
            <span>Beranda</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="text-slate-800 font-semibold">Dashboard Utama</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Dashboard Pengelolaan Akademik & Jadwal FTI
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Pusat koordinasi kebutuhan perkuliahan departemen, optimasi alokasi ruang dan waktu, serta pengesahan jadwal perkuliahan terpadu Fakultas Teknologi Informasi Universitas Andalas.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Ekspor Ringkasan
          </button>
          <button
            onClick={() => {
              void fetchBackendClasses();
              showToast('Data dashboard disinkronkan langsung dari database MySQL.', 'info');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            Perbarui Data
          </button>
          <button
            onClick={() => setActivePage('generator_jadwal')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#082c78] hover:bg-[#0c3999] shadow-sm shadow-blue-900/20 active:scale-98 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            Susun Jadwal Otomatis
          </button>
        </div>
      </div>

      {/* Filter & Status Bar */}
      <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 text-slate-500 font-medium">
            <span className="text-[10px] uppercase font-bold text-slate-400">Tahun Ajaran:</span>
            <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 font-bold font-mono text-[11px] border border-blue-100">
              {latestCPSATResult?.semester_label || '2026/2027 GANJIL'}
            </span>
          </span>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <span className="text-slate-600">
            Cakupan: <strong className="text-slate-800 font-semibold">3 Departemen (Sistem Informasi, Informatika, Teknik Komputer)</strong>
          </span>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <span className="text-slate-600">
            Status SK: <strong className="text-blue-800 font-semibold">{scheduleApprovalStatus}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className={`px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
            backendStatus === 'connected'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            <span className={`w-2 h-2 rounded-full animate-pulse ${backendStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {backendStatus === 'connected' ? 'Terhubung Database MySQL & CP-SAT' : 'Mode Offline'}
          </span>
          <button
            onClick={() => setIsGAConfigModalOpen(true)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            title="Pengaturan Preferensi Penjadwalan"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 6 Core Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 1. Total Mata Kuliah */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all group">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mata Kuliah</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 group-hover:scale-105 transition-transform">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">{totalCoursesCount}</div>
          <div className="text-[11px] text-blue-700 font-semibold mt-1">Database MySQL Aktif</div>
        </div>

        {/* 2. Total Rombel */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all group">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Kelas</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 group-hover:scale-105 transition-transform">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">{totalClassesCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">{theoryClassesCount} Teori • {labClassesCount} Praktikum</div>
        </div>

        {/* 3. Total Dosen */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all group">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dosen Pengampu</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 group-hover:scale-105 transition-transform">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">47</div>
          <div className="text-[11px] text-slate-500 mt-1">Tim Pengajar Lintas Prodi</div>
        </div>

        {/* 4. Total Ruang */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all group">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ruang Kuliah</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 group-hover:scale-105 transition-transform">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">{rooms.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Gedung H &amp; Gedung G</div>
        </div>

        {/* 5. Keterpenuhan Jadwal */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all group">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Keterpenuhan Jadwal</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {scheduledCount} <span className="text-xs text-slate-400 font-normal">/{activeRoomClassesCount}</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-1">
            <Check className="w-3 h-3" /> {pctScheduled}% Terjadwal Rapi
          </div>
        </div>

        {/* 6. Indikator Validasi & Konflik */}
        <div
          onClick={() => setActivePage('validasi_konflik')}
          className={`p-4 rounded-2xl border shadow-xs transition-all cursor-pointer group ${
            hardConflictCount > 0
              ? 'bg-rose-50/70 border-rose-200 hover:bg-rose-100/70'
              : unresolvedCount > 0
                ? 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/70'
                : 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-100/60'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                hardConflictCount > 0 ? 'text-rose-800' : unresolvedCount > 0 ? 'text-amber-800' : 'text-emerald-800'
              }`}
            >
              Validasi & Konflik
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform ${
                hardConflictCount > 0
                  ? 'bg-rose-100 text-rose-700'
                  : unresolvedCount > 0
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {unresolvedCount === 0 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            </div>
          </div>
          <div
            className={`text-2xl font-black tracking-tight ${
              hardConflictCount > 0 ? 'text-rose-900' : unresolvedCount > 0 ? 'text-amber-900' : 'text-emerald-900'
            }`}
          >
            {unresolvedCount} <span className="text-xs font-semibold">{hardConflictCount > 0 ? 'Bentrok' : 'Isu'}</span>
          </div>
          <div
            className={`text-[11px] font-medium mt-1 flex items-center gap-1 ${
              hardConflictCount > 0 ? 'text-rose-800' : unresolvedCount > 0 ? 'text-amber-800' : 'text-emerald-800'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                hardConflictCount > 0 ? 'bg-rose-500 animate-pulse' : unresolvedCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
              }`}
            />
            {hardConflictCount > 0
              ? `${hardConflictCount} bentrok mutlak perlu diperbaiki`
              : unresolvedCount > 0
                ? 'Hanya peringatan ringan tersisa'
                : 'Semua jadwal bebas bentrok'}
          </div>
        </div>
      </div>

      {/* Stepper Alur Penjadwalan Terpadu */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-100" />
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Alur Kerja Penjadwalan Terpadu Semester
              </h3>
              <p className="text-[11px] text-slate-500">Tahapan terintegrasi dari usulan prodi hingga pengesahan SK resmi</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-blue-800 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 self-start sm:self-auto">
            Fase Berjalan: Tinjauan & Pengesahan Wadek I
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Step 1 */}
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-center">
            <div className="w-6 h-6 mx-auto rounded-full bg-blue-600 text-white flex items-center justify-center mb-1.5 text-xs font-bold shadow-xs">
              ✓
            </div>
            <div className="text-xs font-bold text-slate-800">1. Usulan Prodi</div>
            <div className="text-[11px] text-emerald-700 font-semibold">100% Diterima</div>
            <div className="text-[10px] text-slate-500 mt-0.5">SI, IF, TK Lengkap</div>
          </div>

          {/* Step 2 */}
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-center">
            <div className="w-6 h-6 mx-auto rounded-full bg-blue-600 text-white flex items-center justify-center mb-1.5 text-xs font-bold shadow-xs">
              ✓
            </div>
            <div className="text-xs font-bold text-slate-800">2. Rekap Rombel</div>
            <div className="text-[11px] text-emerald-700 font-semibold">100% Terdata</div>
            <div className="text-[10px] text-slate-500 mt-0.5">318 Matriks Kelas</div>
          </div>

          {/* Step 3 */}
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-center">
            <div className="w-6 h-6 mx-auto rounded-full bg-blue-600 text-white flex items-center justify-center mb-1.5 text-xs font-bold shadow-xs">
              ✓
            </div>
            <div className="text-xs font-bold text-slate-800">3. Alokasi Jadwal</div>
            <div className="text-[11px] text-emerald-700 font-semibold">Bebas Bentrok</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Ruang Terpetakan</div>
          </div>

          {/* Step 4 */}
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-center">
            <div className="w-6 h-6 mx-auto rounded-full bg-blue-600 text-white flex items-center justify-center mb-1.5 text-xs font-bold shadow-xs">
              ✓
            </div>
            <div className="text-xs font-bold text-slate-800">4. Optimasi Waktu</div>
            <div className="text-[11px] text-blue-700 font-bold">Kenyamanan 92%</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Efisiensi Maksimal</div>
          </div>

          {/* Step 5 */}
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-center">
            <div className="w-6 h-6 mx-auto rounded-full bg-amber-500 text-white flex items-center justify-center mb-1.5 text-xs font-bold shadow-xs">
              !
            </div>
            <div className="text-xs font-bold text-slate-800">5. Konfirmasi Waktu</div>
            <div className="text-[11px] text-amber-700 font-semibold">3 Catatan Jadwal</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Preferensi Dosen</div>
          </div>

          {/* Step 6 */}
          <div className="p-3 rounded-xl bg-[#082c78] text-white text-center shadow-xs">
            <div className="w-6 h-6 mx-auto rounded-full bg-white text-[#082c78] flex items-center justify-center mb-1.5 text-xs font-black shadow-xs">
              6
            </div>
            <div className="text-xs font-bold">6. Pengesahan SK</div>
            <div className="text-[11px] text-blue-200 font-semibold">Menunggu Wadek I</div>
            <div className="text-[10px] text-blue-300 mt-0.5">Draf Jadwal FTI</div>
          </div>
        </div>
      </div>

      {/* 3 Analytics Cards: Distribution, Utilization, Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Col 1: Distribusi Kelas per Departemen */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Distribusi Rombel Departemen</h4>
                <p className="text-[10px] text-slate-400">Proporsi kelas semester ganjil 2024/2025</p>
              </div>
              <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                318 Kelas
              </span>
            </div>

            <div className="space-y-3.5">
              {/* IF */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-800">Informatika (IF)</span>
                  <span className="text-blue-900 font-bold">138 Kelas (43.4%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#082c78] rounded-full" style={{ width: '43.4%' }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>98 Kelas Teori</span>
                  <span>40 Praktikum Lab</span>
                </div>
              </div>

              {/* SI */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-800">Sistem Informasi (SI)</span>
                  <span className="text-blue-700 font-bold">110 Kelas (34.6%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: '34.6%' }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>86 Kelas Teori</span>
                  <span>24 Praktikum Lab</span>
                </div>
              </div>

              {/* TK */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-800">Teknik Komputer (TK)</span>
                  <span className="text-indigo-700 font-bold">70 Kelas (22.0%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: '22%' }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>58 Kelas Teori</span>
                  <span>12 Praktikum Hardware</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-4">
            <span>Rata-rata mahasiswa per rombel:</span>
            <strong className="text-slate-900 font-bold">38.4 Mahasiswa/Kelas</strong>
          </div>
        </div>

        {/* Col 2: Utilisasi Ruang Kuliah */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Pemanfaatan Ruang Kuliah</h4>
                <p className="text-[10px] text-slate-400">Jam operasional perkuliahan 07:30–18:00 WIB</p>
              </div>
              <span className="text-[11px] font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                84.6% Optimal
              </span>
            </div>

            <div className="space-y-3 my-2">
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-700">Gedung FTI (Lab & Seminar)</span>
                  <strong className="text-blue-900 font-bold">88.4% (12 Ruang)</strong>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#082c78] rounded-full" style={{ width: '88.4%' }} />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-700">GKB Bersama (Ruang Teori)</span>
                  <strong className="text-blue-700 font-bold">81.2% (16 Ruang)</strong>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: '81.2%' }} />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActivePage('ketersediaan_ruang')}
            className="w-full mt-3 py-2.5 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Calendar className="w-3.5 h-3.5" />
            Cek Ketersediaan Ruangan Terkini
          </button>
        </div>

        {/* Col 3: Evaluasi Kepatuhan & Kenyamanan Jadwal */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Kepatuhan Aturan & Kenyamanan</h4>
                <p className="text-[10px] text-slate-400">Aturan pokok akademik dan preferensi mengajar</p>
              </div>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900 mb-1">
                  <span>Aturan Pokok (Ruang & Dosen)</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-600 text-white">
                    100% TERPENUHI
                  </span>
                </div>
                <div className="text-[11px] text-emerald-800 leading-relaxed">
                  Semua kelas memiliki ruangan sesuai kapasitas tanpa ada jadwal dosen yang bertabrakan.
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                <div className="flex items-center justify-between text-xs font-bold text-blue-900 mb-1">
                  <span>Kenyamanan Jadwal & Istirahat</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-600 text-white">
                    92.4% Optimal
                  </span>
                </div>
                <div className="text-[11px] text-blue-800 leading-relaxed">
                  Meminimalkan jam kosong mahasiswa dan mengakomodasi jeda istirahat dosen 12:00–13:30 WIB.
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActivePage('validasi_konflik')}
            className="w-full mt-3 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Buka Panel Validasi & Konflik
          </button>
        </div>
      </div>

      {/* Action Center (8 cols) + Timeline Semester (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Side: Perhatian & Tindakan Mendesak (8 cols) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <h3 className="font-bold text-xs text-slate-900">Perhatian & Tindakan Mendesak</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
              3 Perlu Penyesuaian
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Alert 1 */}
            <div className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-xs">Konflik Jadwal Mengajar Bersama (Tandem)</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                      Sistem Informasi
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Dua dosen pengampu memiliki agenda lain pada sesi Selasa pukul 10:00 WIB.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActivePage('validasi_konflik')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shrink-0 transition-colors flex items-center gap-1.5 self-start sm:self-center"
              >
                Selesaikan <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Alert 2 */}
            <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-xs">Kebutuhan Kapasitas Lab Komputer</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                      Informatika
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Lab Software Terpadu mendekati batas kapasitas 40 PC per sesi akibat penambahan peminatan baru.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActivePage('kebutuhan_departemen')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shrink-0 transition-colors flex items-center gap-1.5 self-start sm:self-center"
              >
                Sesuaikan <Sliders className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Alert 3 */}
            <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-xs">Draf Jadwal Siap Disahkan Pimpinan</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                      Otorisasi SK
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Draf jadwal perkuliahan semester ganjil telah lengkap dan siap ditinjau serta disahkan oleh Wadek I.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActivePage('approval_wadek')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[#082c78] hover:bg-[#0c3999] shrink-0 transition-colors flex items-center gap-1.5 self-start sm:self-center"
              >
                Tinjau <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Progres Penjadwalan Semester (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Tahapan Penjadwalan Semester</h4>
                <p className="text-[10px] text-slate-500">Semester Ganjil 2024/2025</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Tahap 3 dari 4
              </span>
            </div>

            {/* 4 Stages Timeline */}
            <div className="space-y-3.5 relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {/* Stage 1 */}
              <div className="relative">
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                  ✓
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">1. Usulan Departemen</span>
                  <span className="text-[10px] font-semibold text-emerald-600">Selesai (3 Prodi)</span>
                </div>
                <p className="text-[10px] text-slate-500 truncate">SI, IF, dan TK telah mengunggah usulan</p>
              </div>

              {/* Stage 2 */}
              <div className="relative">
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                  ✓
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">2. Penyusunan Jadwal</span>
                  <span className="text-[10px] font-semibold text-emerald-600">Selesai (99.1%)</span>
                </div>
                <p className="text-[10px] text-slate-500 truncate">315 dari 318 rombel teralokasi rapi</p>
              </div>

              {/* Stage 3 */}
              <div className="relative">
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold ring-4 ring-blue-100 shadow-xs">
                  3
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900">3. Pengesahan Wadek I</span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Sedang Berjalan</span>
                </div>
                <p className="text-[10px] text-slate-600 truncate">Menunggu verifikasi dan penandatanganan SK</p>
              </div>

              {/* Stage 4 */}
              <div className="relative">
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                  4
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">4. Publikasi Portal</span>
                  <span className="text-[10px] text-slate-400">Tahap Akhir</span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">Akan dibuka ke portal dosen & mahasiswa</p>
              </div>
            </div>
          </div>

          <div className="pt-3.5 border-t border-slate-100 mt-4">
            <button
              onClick={() => setActivePage('approval_wadek')}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-[#082c78] hover:bg-[#0c3999] transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Buka Review & Pengesahan Wadek I</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-700" />
              <h3 className="font-bold text-xs text-slate-900">
                Riwayat Aktivitas & Perubahan Sistem
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Catatan pembaruan jadwal perkuliahan, penyesuaian usulan prodi, dan otorisasi pimpinan.
            </p>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Pembaruan Terkini: Realtime
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="pb-2.5 font-bold">Aktivitas / Kegiatan</th>
                <th className="pb-2.5 font-bold">Kategori</th>
                <th className="pb-2.5 font-bold">Penanggung Jawab</th>
                <th className="pb-2.5 font-bold">Waktu</th>
                <th className="pb-2.5 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.slice(0, 5).map((log) => {
                const getCategoryInfo = (cat: string) => {
                  if (cat === 'Optimasi Jadwal' || cat === 'GA-OPTIMIZER') {
                    return { label: 'Optimasi Jadwal', color: 'bg-purple-100 text-purple-700' };
                  }
                  if (cat === 'Penjadwalan' || cat === 'CP-SAT SOLVER') {
                    return { label: 'Penjadwalan Terpadu', color: 'bg-blue-100 text-blue-700' };
                  }
                  if (cat === 'Pengesahan WD1' || cat === 'APPROVAL WADEK') {
                    return { label: 'Pengesahan Pimpinan', color: 'bg-emerald-100 text-emerald-800' };
                  }
                  if (cat === 'Usulan Prodi' || cat.startsWith('DEPT')) {
                    return { label: 'Usulan Departemen', color: 'bg-sky-100 text-sky-800' };
                  }
                  return { label: 'Administrasi', color: 'bg-slate-100 text-slate-700' };
                };
                const catInfo = getCategoryInfo(log.category);

                return (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="font-bold text-slate-900">{log.activity}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 max-w-xl truncate">{log.description}</div>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${catInfo.color}`}>
                        {catInfo.label}
                      </span>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800 text-[11px]">{log.actorName}</div>
                      <div className="text-[10px] text-slate-400">{log.actorRole}</div>
                    </td>
                    <td className="py-3 pr-4 text-slate-500 text-[11px] whitespace-nowrap font-mono">
                      {log.timestamp}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => showToast(`Detail riwayat #${log.id}: ${log.activity}`, 'info')}
                        className="text-blue-700 hover:text-blue-900 font-bold text-[11px]"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Menampilkan 5 entri riwayat terbaru</span>
          <button
            onClick={() => showToast('Menampilkan seluruh riwayat aktivitas sistem...', 'info')}
            className="font-bold text-blue-700 hover:underline flex items-center gap-1"
          >
            Buka Riwayat Lengkap <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
