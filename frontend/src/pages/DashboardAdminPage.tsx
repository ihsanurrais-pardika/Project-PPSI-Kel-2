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
  Gauge,
  SlidersHorizontal,
} from 'lucide-react';

export const DashboardAdminPage: React.FC = () => {
  const {
    setActivePage,
    conflicts,
    auditLogs,
    scheduleApprovalStatus,
    setIsGAConfigModalOpen,
    showToast,
  } = useApp();

  const unresolvedCount = conflicts.filter((c) => !c.isResolved).length;

  const handleExport = () => {
    showToast('Mengekspor ringkasan eksekutif dashboard (Format Excel & PDF)...', 'info');
    setTimeout(() => {
      showToast('Berkas Rekapitulasi_Dashboard_FTI_2024.xlsx berhasil diunduh.', 'success');
    }, 800);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mb-0.5">
            <span>Beranda</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="text-slate-800 font-semibold">Dashboard Utama</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Konsol Operasional Akademik
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-3xl leading-relaxed">
            Pemantauan kebutuhan departemen, optimasi jadwal perkuliahan, serta status pengesahan SK jadwal perkuliahan FTI UNAND.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Ekspor Ringkasan
          </button>
          <button
            onClick={() => showToast('Data dashboard telah diperbarui ke data riil terkini.', 'info')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            Perbarui
          </button>
          <button
            onClick={() => setActivePage('generator_jadwal')}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[#082c78] hover:bg-[#0c3999] shadow-sm shadow-blue-900/20 active:scale-98 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            Buat Jadwal Otomatis
          </button>
        </div>
      </div>

      {/* Filter & Solver Status Strip */}
      <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 text-slate-500 font-medium">
            <span className="text-[10px] uppercase font-bold text-slate-400">Semester:</span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold font-mono text-[11px]">
              2024/2025 GANJIL
            </span>
          </span>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <span className="text-slate-600">
            Cakupan: <strong className="text-slate-800">3 Departemen (SI, IF, TK)</strong>
          </span>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <span className="text-slate-600">
            Status SK: <strong className="text-blue-700">{scheduleApprovalStatus}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            Penjadwalan Otomatis Aktif
          </span>
          <button
            onClick={() => setIsGAConfigModalOpen(true)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
            title="Konfigurasi Parameter Optimasi"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 6 Core Metric Cards - Compact & Clean */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Total Mata Kuliah */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mata Kuliah</span>
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">142</div>
          <div className="text-[10px] text-blue-700 font-medium mt-0.5">+4 MK Pilihan Baru</div>
        </div>

        {/* 2. Total Rombel */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Rombel</span>
            <Users className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">318</div>
          <div className="text-[10px] text-slate-500 mt-0.5">242 Teori • 76 Praktikum</div>
        </div>

        {/* 3. Total Dosen */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dosen Aktif</span>
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">84</div>
          <div className="text-[10px] text-slate-500 mt-0.5">68 Utama • 16 Tandem</div>
        </div>

        {/* 4. Total Ruang */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ruangan</span>
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">28</div>
          <div className="text-[10px] text-slate-500 mt-0.5">20 Teori • 8 Lab Komputer</div>
        </div>

        {/* 5. Feasible Schedule */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jadwal Feasible</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            315 <span className="text-xs text-slate-400 font-normal">/318</span>
          </div>
          <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
            <Check className="w-3 h-3" /> 99.05% Terpetakan
          </div>
        </div>

        {/* 6. Konflik Jadwal */}
        <div
          onClick={() => setActivePage('validasi_konflik')}
          className={`p-3.5 rounded-xl border shadow-xs transition-all cursor-pointer ${
            unresolvedCount > 0
              ? 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/70'
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Indikator Konflik</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900 tracking-tight">
            {unresolvedCount} <span className="text-xs font-normal text-amber-700">Soft Warn</span>
          </div>
          <div className="text-[10px] text-amber-800 font-medium mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Perlu Perhatian Wadek
          </div>
        </div>
      </div>

      {/* Stepper Pipeline Penjadwalan Terpadu (Clean & Connected) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <h3 className="font-bold text-xs text-slate-900">
              Alur Penjadwalan Terpadu
            </h3>
          </div>
          <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 self-start sm:self-auto">
            Fase Aktif: Review &amp; Otorisasi Wadek I
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* Step 1 */}
          <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200/70 text-center">
            <div className="w-5 h-5 mx-auto rounded-full bg-blue-600 text-white flex items-center justify-center mb-1 text-[10px] font-bold">
              ✓
            </div>
            <div className="text-[11px] font-bold text-slate-800">1. Input Prodi</div>
            <div className="text-[10px] text-emerald-700 font-semibold">100% Selesai</div>
            <div className="text-[9px] text-slate-400">SI, IF, TK Lengkap</div>
          </div>

          {/* Step 2 */}
          <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200/70 text-center">
            <div className="w-5 h-5 mx-auto rounded-full bg-blue-600 text-white flex items-center justify-center mb-1 text-[10px] font-bold">
              ✓
            </div>
            <div className="text-[11px] font-bold text-slate-800">2. Rekap Rombel</div>
            <div className="text-[10px] text-emerald-700 font-semibold">100% Selesai</div>
            <div className="text-[9px] text-slate-400">318 Matriks Kelas</div>
          </div>

          {/* Step 3 */}
          <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200/70 text-center">
            <div className="w-5 h-5 mx-auto rounded-full bg-blue-600 text-white flex items-center justify-center mb-1 text-[10px] font-bold">
              ✓
            </div>
            <div className="text-[11px] font-bold text-slate-800">3. Penjadwalan Awal</div>
            <div className="text-[10px] text-emerald-700 font-semibold">Bebas Bentrok</div>
            <div className="text-[9px] text-slate-400">Alokasi Ruang Optimal</div>
          </div>

          {/* Step 4 */}
          <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200/70 text-center">
            <div className="w-5 h-5 mx-auto rounded-full bg-blue-600 text-white flex items-center justify-center mb-1 text-[10px] font-bold">
              ✓
            </div>
            <div className="text-[11px] font-bold text-slate-800">4. Optimasi Jadwal</div>
            <div className="text-[10px] text-blue-700 font-semibold">Penalti 184 → 42</div>
            <div className="text-[9px] text-slate-400">Jadwal Lebih Nyaman</div>
          </div>

          {/* Step 5 */}
          <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/70 text-center">
            <div className="w-5 h-5 mx-auto rounded-full bg-amber-500 text-white flex items-center justify-center mb-1 text-[10px] font-bold">
              !
            </div>
            <div className="text-[11px] font-bold text-slate-800">5. Validasi Bentrok</div>
            <div className="text-[10px] text-amber-700 font-semibold">3 Soft Warning</div>
            <div className="text-[9px] text-slate-400">Jeda Waktu Dosen</div>
          </div>

          {/* Step 6 */}
          <div className="p-2.5 rounded-lg bg-[#082c78] text-white text-center shadow-xs">
            <div className="w-5 h-5 mx-auto rounded-full bg-white text-[#082c78] flex items-center justify-center mb-1 text-[10px] font-black">
              6
            </div>
            <div className="text-[11px] font-bold">6. Pengesahan WD1</div>
            <div className="text-[10px] text-blue-200 font-semibold">Menunggu Review</div>
            <div className="text-[9px] text-blue-300">Draf Jadwal FTI</div>
          </div>
        </div>
      </div>

      {/* 3 Analytics Cards: Distribution, Utilization, Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Col 1: Distribusi Kelas per Departemen */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Distribusi Rombel Departemen</h4>
                <p className="text-[10px] text-slate-400">Proporsi kelas semester ganjil 2024/2025</p>
              </div>
              <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                318 Kelas
              </span>
            </div>

            <div className="space-y-3">
              {/* IF */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-800">Informatika (IF)</span>
                  <span className="text-blue-900 font-bold">138 Kelas (43.4%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-900 rounded-full" style={{ width: '43.4%' }} />
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                  <span>98 Teori</span>
                  <span>40 Praktikum Lab</span>
                </div>
              </div>

              {/* SI */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-800">Sistem Informasi (SI)</span>
                  <span className="text-blue-700 font-bold">110 Kelas (34.6%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: '34.6%' }} />
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                  <span>86 Teori</span>
                  <span>24 Praktikum Lab</span>
                </div>
              </div>

              {/* TK */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-800">Teknik Komputer (TK)</span>
                  <span className="text-indigo-700 font-bold">70 Kelas (22.0%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: '22%' }} />
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                  <span>58 Teori</span>
                  <span>12 Praktikum Hardware</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 mt-3">
            <span>Rata-rata mahasiswa per rombel:</span>
            <strong className="text-slate-800">38.4 Mhs/Kelas</strong>
          </div>
        </div>

        {/* Col 2: Utilisasi Ruang Kuliah */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Utilisasi Ruang Terjadwal</h4>
                <p className="text-[10px] text-slate-400">Pemanfaatan jam operasional 07:30–18:00 WIB</p>
              </div>
              <span className="text-[11px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                84.6% Avg
              </span>
            </div>

            <div className="space-y-2.5 my-2">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Gedung FTI (Lab &amp; Seminar)</span>
                  <strong className="text-blue-900">88.4% (12 Ruang)</strong>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#082c78] rounded-full" style={{ width: '88.4%' }} />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">GKB Bersama (Ruang Teori)</span>
                  <strong className="text-blue-700">81.2% (16 Ruang)</strong>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: '81.2%' }} />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActivePage('ketersediaan_ruang')}
            className="w-full mt-2 py-2 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            Cek Ruang Kosong Real-time
          </button>
        </div>

        {/* Col 3: Matriks Kepatuhan Aturan */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Evaluasi Kepatuhan Aturan</h4>
                <p className="text-[10px] text-slate-400">Hard constraint vs preferensi dosen</p>
              </div>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="space-y-2.5">
              <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900 mb-1">
                  <span>Aturan Wajib (Ruang &amp; Dosen)</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-emerald-600 text-white">
                    100% LOLOS
                  </span>
                </div>
                <div className="text-[10px] text-emerald-800 leading-tight">
                  0 bentrok ruangan, 0 bentrok dosen, dan kuota ruang ≥ mahasiswa.
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200">
                <div className="flex items-center justify-between text-xs font-bold text-blue-900 mb-1">
                  <span>Kenyamanan Jadwal &amp; Istirahat</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-blue-600 text-white">
                    92.4% Optimal
                  </span>
                </div>
                <div className="text-[10px] text-blue-800 leading-tight">
                  Preferensi hari mengajar &amp; jeda istirahat dosen 12:00–13:30 terpenuhi.
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActivePage('validasi_konflik')}
            className="w-full mt-2 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Buka Panel Validasi &amp; Konflik
          </button>
        </div>
      </div>

      {/* Action Center (8 cols) + Smart Rooms (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Side: Perhatian & Tindakan Mendesak (8 cols) */}
        <div className="lg:col-span-8 bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <h3 className="font-bold text-xs text-slate-900">Perhatian &amp; Tindakan Mendesak</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
              3 Perlu Verifikasi
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Alert 1 */}
            <div className="p-3 rounded-lg border border-rose-100 bg-rose-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-900">3 Konflik Slot Waktu Dosen Tandem</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                      Sistem Informasi
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                    Manajemen Proyek TI &amp; RPL tumpang tindih jam tandem pada Selasa 10:00.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActivePage('validasi_konflik')}
                className="px-3 py-1 rounded-md text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 shrink-0 transition-colors flex items-center gap-1 self-start sm:self-center"
              >
                Selesaikan <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Alert 2 */}
            <div className="p-3 rounded-lg border border-blue-100 bg-blue-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Laptop className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-900">12 Kelas Praktikum Butuh Verifikasi PC</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-700">
                      Informatika
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                    Lab Software Terpadu mendekati kapasitas 40 PC per sesi akibat penambahan peminatan.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActivePage('kebutuhan_departemen')}
                className="px-3 py-1 rounded-md text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shrink-0 transition-colors flex items-center gap-1 self-start sm:self-center"
              >
                Sesuaikan <Sliders className="w-3 h-3" />
              </button>
            </div>

            {/* Alert 3 */}
            <div className="p-3 rounded-lg border border-indigo-100 bg-indigo-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-900">Draf Jadwal Siap Ditandatangani WD1</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700">
                      Otorisasi SK
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                    Draf jadwal perkuliahan semester ganjil siap ditinjau dan disahkan oleh Wadek I.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActivePage('approval_wadek')}
                className="px-3 py-1 rounded-md text-[11px] font-bold text-white bg-[#082c78] hover:bg-[#0c3999] shrink-0 transition-colors flex items-center gap-1 self-start sm:self-center"
              >
                Tinjau <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Progres Penjadwalan Semester (4 cols) */}
        <div className="lg:col-span-4 bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Progres Penjadwalan Semester</h4>
                <p className="text-[10px] text-slate-500">Semester Ganjil 2024/2025</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Tahap 3 dari 4
              </span>
            </div>

            {/* 4 Stages Timeline */}
            <div className="space-y-3 relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {/* Stage 1: Input Prodi */}
              <div className="relative">
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                  ✓
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">1. Input Prodi</span>
                  <span className="text-[10px] font-semibold text-emerald-600">Selesai (3 Prodi)</span>
                </div>
                <p className="text-[10px] text-slate-500 truncate">SI, IF, dan TK telah mengunggah usulan</p>
              </div>

              {/* Stage 2: Generate */}
              <div className="relative">
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                  ✓
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">2. Generate Jadwal</span>
                  <span className="text-[10px] font-semibold text-emerald-600">Selesai (99.05%)</span>
                </div>
                <p className="text-[10px] text-slate-500 truncate">315 dari 318 rombel terpetakan optimal</p>
              </div>

              {/* Stage 3: Approval WD1 */}
              <div className="relative">
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold ring-4 ring-blue-100 shadow-xs">
                  3
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900">3. Approval WD1</span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">Sedang Berjalan</span>
                </div>
                <p className="text-[10px] text-slate-600 truncate">Menunggu verifikasi dan pengesahan SK</p>
              </div>

              {/* Stage 4: Publikasi */}
              <div className="relative">
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                  4
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">4. Publikasi</span>
                  <span className="text-[10px] text-slate-400">Tahap Akhir</span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">Akan dibuka ke portal dosen &amp; mahasiswa</p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-3">
            <button
              onClick={() => setActivePage('approval_wadek')}
              className="w-full py-2 rounded-lg text-xs font-bold text-white bg-[#082c78] hover:bg-[#0c3999] transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>Buka Review &amp; Approval WD1</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3 pb-2 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-blue-700" />
              <h3 className="font-bold text-xs text-slate-900">
                Riwayat Aktivitas &amp; Log Sistem
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Pencatatan riwayat penataan jadwal, usulan prodi, dan pengesahan.
            </p>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Pembaruan Terakhir: Realtime
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="pb-2 font-bold">Aktivitas / Event</th>
                <th className="pb-2 font-bold">Kategori</th>
                <th className="pb-2 font-bold">Pelaksana</th>
                <th className="pb-2 font-bold">Waktu</th>
                <th className="pb-2 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.slice(0, 5).map((log) => {
                const getCategoryInfo = (cat: string) => {
                  if (cat === 'Optimasi Jadwal' || cat === 'GA-OPTIMIZER') {
                    return { label: 'Optimasi Jadwal', color: 'bg-purple-100 text-purple-700' };
                  }
                  if (cat === 'Penjadwalan' || cat === 'CP-SAT SOLVER') {
                    return { label: 'Penjadwalan', color: 'bg-blue-100 text-blue-700' };
                  }
                  if (cat === 'Pengesahan WD1' || cat === 'APPROVAL WADEK') {
                    return { label: 'Pengesahan WD1', color: 'bg-emerald-100 text-emerald-800' };
                  }
                  if (cat === 'Usulan Prodi' || cat.startsWith('DEPT')) {
                    return { label: 'Usulan Prodi', color: 'bg-sky-100 text-sky-800' };
                  }
                  return { label: 'Admin', color: 'bg-slate-100 text-slate-700' };
                };
                const catInfo = getCategoryInfo(log.category);

                return (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 pr-4">
                      <div className="font-bold text-slate-900">{log.activity}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 max-w-xl truncate">{log.description}</div>
                    </td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${catInfo.color}`}>
                        {catInfo.label}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800 text-[11px]">{log.actorName}</div>
                      <div className="text-[9px] text-slate-400">{log.actorRole}</div>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500 text-[11px] whitespace-nowrap font-mono">
                      {log.timestamp}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => showToast(`Detail log #${log.id}: ${log.activity}`, 'info')}
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

        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Menampilkan 5 entri transaksi log terbaru</span>
          <button
            onClick={() => showToast('Menampilkan seluruh riwayat audit log transaksi...', 'info')}
            className="font-bold text-blue-700 hover:underline flex items-center gap-1"
          >
            Buka Riwayat Lengkap <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
