import React from 'react';
import { useApp } from '../context/AppContext';
import {
  BookOpen,
  Users,
  UserCheck,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Download,
  Sliders,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  Search,
  ExternalLink,
  Laptop,
  Check,
  Clock,
} from 'lucide-react';

export const DashboardAdminPage: React.FC = () => {
  const {
    setActivePage,
    conflicts,
    auditLogs,
    scheduleApprovalStatus,
    setIsGAConfigModalOpen,
    setIsPublishModalOpen,
    autoFixConflicts,
    showToast,
  } = useApp();

  const unresolvedCount = conflicts.filter((c) => !c.isResolved).length;

  const handleExport = () => {
    showToast('Mengekspor ringkasan eksekutif dashboard (Format Excel & PDF)...', 'info');
    setTimeout(() => {
      showToast('Berkas Rekapitulasi_Dashboard_FTI_2024.xlsx berhasil diunduh.', 'success');
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mb-1">
            <span>Beranda</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-800 font-semibold">Dashboard Admin</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Dashboard Utama
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Ringkasan proses penjadwalan terpadu, kapasitas ruang, dan status solver optimasi multi-departemen Fakultas Teknologi Informasi Universitas Andalas.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition-all"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Quick Export
          </button>
          <button
            onClick={() => showToast('Data dashboard telah diperbarui ke data riil terkini.', 'info')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition-all"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            Perbarui
          </button>
          <button
            onClick={() => setActivePage('generator_jadwal')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 shadow-md shadow-blue-700/20 active:scale-98 transition-all"
          >
            <Sparkles className="w-4 h-4 text-blue-200" />
            Generate Jadwal Baru
          </button>
        </div>
      </div>

      {/* Filter Konteks Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Filter Konteks:</span>
            <span className="font-semibold text-slate-700">Semester:</span>
            <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-bold">
              Ganjil 2024/2025
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Tahun:</span>
            <span className="text-slate-800 font-bold">2024/2025</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Departemen:</span>
            <span className="text-slate-800 font-bold">Semua Departemen (FTI)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            Solver: CP-SAT v9.8 + GA Hybrid
          </span>
          <button
            onClick={() => setIsGAConfigModalOpen(true)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            title="Konfigurasi Parameter GA"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 6 Core Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Total Mata Kuliah */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              TOTAL MATA KULIAH
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">142</div>
          <div className="text-xs text-blue-600 font-semibold mt-1">
            +4 kurikulum baru <span className="text-slate-400 font-normal">(MBKM 2024)</span>
          </div>
        </div>

        {/* 2. Total Rombel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              TOTAL ROMBEL
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">318</div>
          <div className="text-xs text-slate-600 font-semibold mt-1">
            242 Teori • <span className="text-blue-600">76 Praktikum</span>
          </div>
        </div>

        {/* 3. Total Dosen */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              TOTAL DOSEN
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">84</div>
          <div className="text-xs text-slate-600 font-semibold mt-1">
            68 Utama • <span className="text-indigo-600">16 Tandem</span>
          </div>
        </div>

        {/* 4. Total Ruang */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              TOTAL RUANG
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">28</div>
          <div className="text-xs text-slate-600 font-semibold mt-1">
            20 Kelas • <span className="text-blue-600">8 Lab Komputer</span>
          </div>
        </div>

        {/* 5. Jadwal Feasible */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              JADWAL FEASIBLE
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">
            315 <span className="text-base font-bold text-slate-400">/ 318</span>
          </div>
          <div className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> 99.05% Terpetakan
          </div>
        </div>

        {/* 6. Konflik Jadwal (Urgent) */}
        <div
          onClick={() => setActivePage('validasi_konflik')}
          className="bg-rose-50/70 p-5 rounded-2xl border border-rose-200 shadow-xs relative overflow-hidden cursor-pointer hover:bg-rose-100/70 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-700">
              KONFLIK JADWAL
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-900 mt-2">
            {unresolvedCount} Konflik
          </div>
          <div className="text-xs text-rose-700 font-bold mt-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
            Perlu Resolusi Segera
          </div>
        </div>
      </div>

      {/* Status Pipeline Penjadwalan Terpadu (Stepper) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <h3 className="font-extrabold text-sm text-slate-900">
                Status Pipeline Penjadwalan Terpadu
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Alur otomatisasi pembentukan jadwal perkuliahan semester ganjil berbasis Algoritma Genetika & Constraint Programming
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Tahap Berjalan:</span>
            <span className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Tahap 6: Review Wadek I
            </span>
          </div>
        </div>

        {/* 6 Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 relative">
          {/* Step 1 */}
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
            <div className="w-7 h-7 mx-auto rounded-full bg-blue-600 text-white flex items-center justify-center mb-2 shadow-xs">
              <Check className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-900">1. Pengajuan</div>
            <div className="text-[11px] text-blue-700 font-semibold mt-0.5">Selesai (100%)</div>
            <div className="text-[10px] text-slate-500 mt-0.5">SI, IF, TK</div>
          </div>

          {/* Step 2 */}
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
            <div className="w-7 h-7 mx-auto rounded-full bg-blue-600 text-white flex items-center justify-center mb-2 shadow-xs">
              <Check className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-900">2. Agregasi Data</div>
            <div className="text-[11px] text-blue-700 font-semibold mt-0.5">Selesai (100%)</div>
            <div className="text-[10px] text-slate-500 mt-0.5">318 Matriks Rombel</div>
          </div>

          {/* Step 3 */}
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
            <div className="w-7 h-7 mx-auto rounded-full bg-blue-600 text-white flex items-center justify-center mb-2 shadow-xs">
              <Check className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-900">3. Solver CP-SAT</div>
            <div className="text-[11px] text-blue-700 font-semibold mt-0.5">Feasible Found</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Runtime: 124.2s</div>
          </div>

          {/* Step 4 */}
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
            <div className="w-7 h-7 mx-auto rounded-full bg-blue-600 text-white flex items-center justify-center mb-2 shadow-xs">
              <Check className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-900">4. Optimasi GA</div>
            <div className="text-[11px] text-blue-700 font-semibold mt-0.5">Penalty 184 → 42</div>
            <div className="text-[10px] text-slate-500 mt-0.5">150 Generasi</div>
          </div>

          {/* Step 5 */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
            <div className="w-7 h-7 mx-auto rounded-full bg-amber-500 text-white flex items-center justify-center mb-2 shadow-xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-900">5. Validasi Sistem</div>
            <div className="text-[11px] text-amber-700 font-semibold mt-0.5">3 Soft Conflict</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Ruang & Dosen</div>
          </div>

          {/* Step 6 */}
          <div className="p-3 rounded-xl bg-blue-600 text-white text-center shadow-md shadow-blue-600/20">
            <div className="w-7 h-7 mx-auto rounded-full bg-white text-blue-600 flex items-center justify-center mb-2 font-black text-xs">
              6
            </div>
            <div className="text-xs font-bold">6. Review Wadek I</div>
            <div className="text-[11px] text-blue-100 font-semibold mt-0.5">Menunggu Approval</div>
            <div className="text-[10px] text-blue-200 mt-0.5">Draft v2.4</div>
          </div>
        </div>

        {/* Stepper info footer */}
        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Draft jadwal telah dieksekusi dengan solver Google OR-Tools CP-SAT. Rekomendasi GA selesai dengan skor fitness <strong>94.8%</strong>.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActivePage('generator_jadwal')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Lihat Log Eksekusi
            </button>
            <button
              onClick={() => setActivePage('validasi_konflik')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
            >
              Validasi Detail
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Row: 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1: Distribusi Kelas per Departemen */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Distribusi Kelas per Departemen</h4>
                <p className="text-[11px] text-slate-500">Proporsi rombongan belajar aktif semester ganjil 2024/2025.</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400">Total: 318</span>
                <span className="block text-[10px] text-slate-400">Kelas</span>
              </div>
            </div>

            <div className="space-y-4">
              {/* IF */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-800">Informatika (IF)</span>
                  <span className="text-blue-700 font-bold">138 Kelas (43.4%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-900 rounded-full" style={{ width: '43.4%' }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>98 Kuliah Teori</span>
                  <span>40 Praktikum Lab</span>
                </div>
              </div>

              {/* SI */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-800">Sistem Informasi (SI)</span>
                  <span className="text-blue-600 font-bold">110 Kelas (34.6%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: '34.6%' }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>86 Kuliah Teori</span>
                  <span>24 Praktikum Lab</span>
                </div>
              </div>

              {/* TK */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-800">Teknik Komputer (TK)</span>
                  <span className="text-sky-600 font-bold">70 Kelas (22.0%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500 rounded-full" style={{ width: '22%' }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>58 Kuliah Teori</span>
                  <span>12 Praktikum Hardware</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-4">
            <span>Rata-rata mahasiswa per rombel:</span>
            <span className="font-bold text-slate-800">38.4 Mhs/Kelas</span>
          </div>
        </div>

        {/* Col 2: Utilisasi Ruang Kuliah */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Utilisasi Ruang Kuliah</h4>
                <p className="text-[11px] text-slate-500">Persentase jam terpakai vs jam operasional (07:30 - 18:00 WIB).</p>
              </div>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-md">
                84.6% Avg
              </span>
            </div>

            {/* Circular representation */}
            <div className="flex flex-col items-center justify-center my-2">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-slate-100"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-blue-600"
                    strokeWidth="10"
                    strokeDasharray={`${84.6 * 2.51} 251.2`}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-black text-slate-900">84.6%</span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Occupancy Rate</span>
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="space-y-2 mt-3 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                <span className="flex items-center gap-2 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-900" />
                  Gedung FTI (Lab & Seminar)
                </span>
                <span className="font-bold text-slate-900">88.4% (12 Ruang)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                <span className="flex items-center gap-2 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  GKB Bersama (Teori FTI)
                </span>
                <span className="font-bold text-slate-900">81.2% (16 Ruang)</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActivePage('ketersediaan_ruang')}
            className="w-full mt-4 py-2 text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            Cari Ruang Kosong Real-time
          </button>
        </div>

        {/* Col 3: Matriks Kepatuhan Aturan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Matriks Kepatuhan</h4>
                <p className="text-[11px] text-slate-500">Evaluasi kepatuhan aturan akademik (Hard Constraints) & preferensi dosen.</p>
              </div>
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>

            <div className="space-y-4">
              {/* Hard Constraints Box */}
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-emerald-900">Hard Constraints</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-600 text-white">
                    100% LOLOS
                  </span>
                </div>
                <div className="w-full h-1.5 bg-emerald-200 rounded-full my-1.5">
                  <div className="h-full bg-emerald-600 rounded-full w-full" />
                </div>
                <p className="text-[11px] text-emerald-800 leading-tight">
                  Nol bentrok ruangan fisik dan nol bentrok jam dosen utama maupun tandem.
                </p>
              </div>

              {/* Soft Constraints Box */}
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-blue-900">Soft Constraints</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-600 text-white">
                    92.4% Terpenuhi
                  </span>
                </div>
                <div className="w-full h-1.5 bg-blue-200 rounded-full my-1.5">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: '92.4%' }} />
                </div>
                <p className="text-[11px] text-blue-800 leading-tight">
                  Preferensi hari mengajar & jeda istirahat dosen 12:00-13:30 optimal.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActivePage('validasi_konflik')}
            className="w-full mt-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Lihat Validasi & Konflik
          </button>
        </div>
      </div>

      {/* Pusat Tindakan Mendesak & Audit Log (from Screenshot 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Perhatian & Tindakan Mendesak (8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-rose-600 font-bold">🚨</span>
              <h3 className="font-black text-sm text-slate-900">Perhatian & Tindakan Mendesak</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-700">
              3 Butuh Perhatian
            </span>
          </div>

          <div className="space-y-3">
            {/* Alert 1 */}
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="font-extrabold text-xs text-slate-900">
                      3 Konflik Slot Waktu Dosen Tandem
                    </h5>
                    <span className="px-2 py-0.5 rounded-sm bg-rose-100 text-rose-700 text-[10px] font-bold">
                      Sistem Informasi
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Mata kuliah Manajemen Proyek TI & Rekayasa Perangkat Lunak tumpang tindih jam tandem Dr. Surya & Dr. Rahmi pada slot Selasa 10:00-12:30.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActivePage('validasi_konflik')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shrink-0 transition-colors flex items-center gap-1 self-start sm:self-center"
              >
                Selesaikan <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Alert 2 */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="font-extrabold text-xs text-slate-900">
                      12 Kelas Praktikum Memerlukan Konfirmasi Kapasitas Lab
                    </h5>
                    <span className="px-2 py-0.5 rounded-sm bg-blue-100 text-blue-700 text-[10px] font-bold">
                      Informatika
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Lab Komputer Terpadu 1-3 melebihi kuota 40 PC per sesi akibat penambahan peminatan AI & Cloud Computing.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActivePage('kebutuhan_departemen')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 shrink-0 transition-colors flex items-center gap-1 self-start sm:self-center"
              >
                Sesuaikan Kuota <Sliders className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Alert 3 */}
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="font-extrabold text-xs text-slate-900">
                      1 Draf Jadwal Lengkap Menunggu Approval Akhir
                    </h5>
                    <span className="px-2 py-0.5 rounded-sm bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                      Wakil Dekan I
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Draf komprehensif FTI Versi 2.4 telah diajukan ke Dr. Eng. Rahmadi, S.Kom, M.T. untuk tanda tangan digital & SK Perkuliahan.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActivePage('approval_wadek')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-900 hover:bg-indigo-950 shrink-0 transition-colors flex items-center gap-1 self-start sm:self-center"
              >
                Kirim Pengingat <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Smart Lecture Hall Widget (4 cols) */}
        <div className="lg:col-span-4 bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-950 text-white p-6 rounded-2xl shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-[10px] font-bold text-blue-300 uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Pusat Kendali Jadwal FTI
            </div>
            <h4 className="text-lg font-black leading-snug">Gedung FTI & Smart Lecture Hall</h4>
            <p className="text-xs text-blue-200 mt-2 leading-relaxed">
              Seluruh ruang kelas telah dilengkapi sensor IoT presensi dan smart display jadwal yang tersinkronisasi otomatis dengan server lokal.
            </p>
          </div>

          <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between mt-6">
            <div>
              <div className="text-xs font-bold text-white">28 Smart Rooms</div>
              <div className="text-[10px] text-emerald-400">Online & Siap Pakai</div>
            </div>
            <button
              onClick={() => setActivePage('inventaris_ruang')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-900 bg-white hover:bg-blue-50 transition-colors"
            >
              Kelola Spek Ruang
            </button>
          </div>
        </div>
      </div>

      {/* Riwayat Aktivitas & Audit Log Sistem (Table from Screenshot 3) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h3 className="font-extrabold text-sm text-slate-900">
                Riwayat Aktivitas & Audit Log Sistem
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Catatan transaksional solver, manipulasi jadwal, dan otorisasi wadek (PRD NF-09 Immutable Audit Trail)
            </p>
          </div>

          <span className="text-xs text-slate-400 font-mono">
            Update Terakhir: 11:05:42 WIB
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="pb-3 font-bold">Aktivitas / Event</th>
                <th className="pb-3 font-bold">Kategori & Modul</th>
                <th className="pb-3 font-bold">Pelaksana</th>
                <th className="pb-3 font-bold">Waktu</th>
                <th className="pb-3 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.slice(0, 5).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 pr-4">
                    <div className="font-bold text-slate-900">{log.activity}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{log.description}</div>
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className={`px-2 py-0.5 rounded-sm text-[10px] font-extrabold ${
                      log.category === 'GA-OPTIMIZER' ? 'bg-purple-100 text-purple-700' :
                      log.category === 'CP-SAT SOLVER' ? 'bg-blue-100 text-blue-700' :
                      log.category === 'APPROVAL WADEK' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {log.category}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4">
                    <div className="font-semibold text-slate-800">{log.actorName}</div>
                    <div className="text-[10px] text-slate-400">{log.actorRole}</div>
                  </td>
                  <td className="py-3.5 pr-4 text-slate-500 font-medium whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3.5 text-right">
                    <button
                      onClick={() => showToast(`Detail log audit #${log.id}: ${log.activity}`, 'info')}
                      className="text-blue-600 hover:text-blue-800 font-bold hover:underline"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Menampilkan 4 dari 86 entri audit log penjadwalan</span>
          <button
            onClick={() => showToast('Menampilkan seluruh 86 entri audit log...', 'info')}
            className="font-bold text-blue-700 hover:underline flex items-center gap-1"
          >
            Buka Semua Riwayat Transaksi <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

