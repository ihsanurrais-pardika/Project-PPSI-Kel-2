import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  ChevronRight,
  TrendingDown,
  Lock,
  Layers,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Award,
} from 'lucide-react';

export const ApprovalWadekPage: React.FC = () => {
  const {
    currentRole,
    scheduleApprovalStatus,
    wadekApprove,
    wadekReject,
    wadekRevisionNote,
    setIsPublishModalOpen,
    submitScheduleToWadek,
    showToast,
    setActivePage,
    backendClasses,
    backendCourses,
    rooms,
    schedule,
    latestCPSATResult,
  } = useApp();

  const [revisionNote, setRevisionNote] = useState(
    wadekRevisionNote || 'Harap pastikan kapasitas ruang dan jadwal tidak bentrok.'
  );
  const [showRevisionModal, setShowRevisionModal] = useState(false);

  const isWadekRole = currentRole === 'wadek1';
  const totalMk = backendCourses.length || new Set(schedule.map((s) => s.courseCode)).size;
  const totalKelas = backendClasses.length || schedule.length;
  const versionLabel = latestCPSATResult?.version_number ? `Versi #${latestCPSATResult.version_number}` : 'Draf Terbaru';

  const handleApprove = () => {
    if (!isWadekRole) {
      showToast('Otorisasi persetujuan hanya dapat dilakukan dari akun Wakil Dekan I (Wadek1@it.unand.ac.id).', 'warning');
      return;
    }
    wadekApprove();
    setIsPublishModalOpen(true);
  };

  const handleReject = () => {
    if (!revisionNote.trim()) {
      showToast('Harap masukkan catatan revisi!', 'warning');
      return;
    }
    wadekReject(revisionNote);
    setShowRevisionModal(false);
    showToast('Catatan revisi berhasil dikirimkan kembali ke Admin Penjadwalan.', 'info');
  };

  const handlePrint = () => {
    showToast('Mencetak lembar verifikasi akademik resmi FTI Unand (PDF)...', 'info');
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* ── Top Header & Authority Card ────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <span>Beranda</span>
            <span>/</span>
            <span>Portal Eksekutif</span>
            <span>/</span>
            <span className="font-semibold text-blue-700">Review &amp; Approval Jadwal</span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Verifikasi kepatuhan <strong>hard constraint</strong> akademik, optimasi beban pengajaran dosen lintas prodi, dan otoritas pengesahan Surat Keputusan (SK) jadwal perkuliahan semester ganjil Fakultas Teknologi Informasi.
          </p>
        </div>

        {/* Right Authority Pill */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs px-4 py-2.5 flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Award className="w-5 h-5 text-blue-700" />
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              OTORITAS PENGESAHAN
            </span>
            <span className="text-xs font-bold text-slate-800 block">
              Wakil Dekan I (Akademik)
            </span>
            <span className="text-[10px] font-semibold text-blue-600 block">
              STATUS: {scheduleApprovalStatus.toUpperCase()} ({versionLabel})
            </span>
          </div>
        </div>
      </div>

      {!isWadekRole && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-blue-900 space-y-1">
            <div className="font-bold">
              Mode Pantau Admin • {versionLabel} ({latestCPSATResult?.tahap || 'DRAFT_ADMIN'} / {scheduleApprovalStatus})
            </div>
            <p className="text-blue-800">
              {scheduleApprovalStatus === 'Revisi' && wadekRevisionNote
                ? `Catatan Revisi dari Wadek I: "${wadekRevisionNote}"`
                : latestCPSATResult?.tahap === 'DRAFT_ADMIN'
                ? 'Draf hasil CP-SAT belum dikirim ke Wakil Dekan I. Klik tombol di kanan untuk mengirim ke Wadek I agar bisa direview.'
                : scheduleApprovalStatus === 'Disetujui'
                ? 'Wakil Dekan I sudah menyetujui jadwal ini. Anda sekarang dapat menerbitkan jadwal resmi.'
                : scheduleApprovalStatus === 'Resmi'
                ? 'Jadwal resmi sudah dipublikasikan dan dapat dilihat oleh Dosen & Mahasiswa.'
                : 'Draf sudah berada di antrean Review Wakil Dekan I. Login sebagai Wadek I (Wadek1@it.unand.ac.id) untuk melakukan ACC atau revisi.'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {latestCPSATResult?.tahap === 'DRAFT_ADMIN' && (
              <button
                onClick={() => void submitScheduleToWadek()}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg"
              >
                Kirim ke Wadek I Sekarang
              </button>
            )}
            {scheduleApprovalStatus === 'Disetujui' && (
              <button
                onClick={() => setIsPublishModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
              >
                Publikasikan Jadwal Resmi
              </button>
            )}
            <button
              onClick={() => setActivePage('jadwal_kuliah')}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-blue-800 border border-blue-200 text-xs font-semibold rounded-lg"
            >
              Lihat Kalender Jadwal
            </button>
          </div>
        </div>
      )}

      {/* ── Section 1: Ringkasan Audit Kelayakan Jadwal (KPI Eksekutif) */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-700" />
            <h2 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
              Ringkasan Audit Kelayakan Jadwal (KPI Eksekutif)
            </h2>
          </div>
          <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
            Algoritma GA Gen-140 • Konvergen
          </span>
        </div>

        {/* 6 KPI Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          {/* Card 1 */}
          <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Total Mata Kuliah
              </span>
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-800">{totalMk}</span>
              <span className="text-xs font-semibold text-slate-500 ml-1">MK</span>
            </div>
            <div className="mt-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 100% Terakomodir
              </span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Total Rombel / Kelas
              </span>
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-800">{totalKelas}</span>
              <span className="text-xs font-semibold text-slate-500 ml-1">Kelas ({schedule.length} Terjadwal)</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Terdistribusi di {rooms.length} Ruang FTI
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Hard Constraints
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-emerald-600">100%</span>
              <span className="text-xs font-bold text-emerald-600 ml-1">Passed</span>
            </div>
            <p className="text-[10px] text-emerald-700 font-medium mt-2">
              0 Pelanggaran Syarat Wajib
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Soft Constraints
              </span>
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-blue-700">92.4%</span>
              <span className="text-xs font-semibold text-slate-500 ml-1">Kepuasan</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-blue-600 h-full rounded-full" style={{ width: '92.4%' }} />
            </div>
          </div>

          {/* Card 5 */}
          <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Reduksi Penalti GA
              </span>
              <TrendingDown className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-base font-bold text-slate-400 line-through">184</span>
              <span className="text-slate-400">→</span>
              <span className="text-2xl font-black text-indigo-700">42</span>
            </div>
            <p className="text-[10px] text-indigo-700 font-semibold mt-2">
              ↓ 77.2% Penalti Preferensi
            </p>
          </div>

          {/* Card 6 */}
          <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Indikator Konflik
              </span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-amber-600">3</span>
              <span className="text-xs font-semibold text-amber-700 ml-1">Soft Warn</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Jeda kuliah dosen &lt; 30 mnt
            </p>
          </div>
        </div>
      </div>

      {/* ── Main 2-Column Content: Left Table & Curve | Right Decision ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (8 cols): Table & GA Curve */}
        <div className="lg:col-span-8 space-y-5">
          {/* Table: Daftar Usulan Jadwal Departemen */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-700" />
                <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                  Daftar Usulan Jadwal Departemen
                </h3>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                3 Departemen Lengkap
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Menunggu review verifikasi dan penandatanganan Wadek I FTI
            </p>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-2.5 px-2">NO</th>
                    <th className="py-2.5 px-3">DEPARTEMEN</th>
                    <th className="py-2.5 px-3 text-center">BEBAN MK/KELAS</th>
                    <th className="py-2.5 px-3 text-center">HARD CONSTRAINT</th>
                    <th className="py-2.5 px-3 text-center">SOFT SCORE</th>
                    <th className="py-2.5 px-3 text-center">PENALTI GA</th>
                    <th className="py-2.5 px-3">PENGAJUAN</th>
                    <th className="py-2.5 px-3">STATUS</th>
                    <th className="py-2.5 px-2 text-right">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {/* Row 1: SI */}
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-2 font-bold text-slate-400">1</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                          SI
                        </span>
                        <div>
                          <div className="font-bold text-slate-800">Departemen Sistem Informasi</div>
                          <div className="text-[10px] text-slate-400">Ganjil 2024/2025 • Kampus Limau Manis</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-700">
                      <div>52 MK</div>
                      <div className="text-[10px] text-slate-400 font-normal">110 Rombel</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        ✓ 100% Lolos
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-blue-700">
                      94.2%
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        Skor 12
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      <div>12 Okt 2024</div>
                      <div className="text-[10px] text-slate-400">09:15 WIB</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Menunggu Wadek 1
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button
                        onClick={() => showToast('Melihat rincian usulan Departemen Sistem Informasi (SI)', 'info')}
                        className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>

                  {/* Row 2: IF */}
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-2 font-bold text-slate-400">2</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                          IF
                        </span>
                        <div>
                          <div className="font-bold text-slate-800">Departemen Teknik Informatika</div>
                          <div className="text-[10px] text-slate-400">Ganjil 2024/2025 • Kampus Limau Manis</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-700">
                      <div>64 MK</div>
                      <div className="text-[10px] text-slate-400 font-normal">138 Rombel</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        ✓ 100% Lolos
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-blue-700">
                      91.8%
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        Skor 18
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      <div>12 Okt 2024</div>
                      <div className="text-[10px] text-slate-400">10:40 WIB</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Menunggu Wadek 1
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button
                        onClick={() => showToast('Melihat rincian usulan Departemen Teknik Informatika (IF)', 'info')}
                        className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>

                  {/* Row 3: TK */}
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-2 font-bold text-slate-400">3</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-[10px]">
                          TK
                        </span>
                        <div>
                          <div className="font-bold text-slate-800">Departemen Teknik Komputer</div>
                          <div className="text-[10px] text-slate-400">Ganjil 2024/2025 • Lab &amp; Studio IoT</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-700">
                      <div>26 MK</div>
                      <div className="text-[10px] text-slate-400 font-normal">70 Rombel</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        ✓ 100% Lolos
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-blue-700">
                      92.0%
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        Skor 12
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      <div>11 Okt 2024</div>
                      <div className="text-[10px] text-slate-400">16:20 WIB</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Menunggu Wadek 1
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button
                        onClick={() => showToast('Melihat rincian usulan Departemen Teknik Komputer (TK)', 'info')}
                        className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bottom Validasi Banner */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-emerald-900 leading-snug">
                  <strong>Validasi Hard Constraints Terpenuhi:</strong> Tidak ada bentrok ruangan, dosen terhindar dari jadwal paralel simultan, kuota kapasitas ruang &gt;= peserta rombel.
                </span>
              </div>
              <button
                onClick={() => setActivePage('validasi_konflik')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 shrink-0 flex items-center gap-1"
              >
                <span>Lihat Laporan Validasi Lengkap</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Section: Karakteristik Optimasi Algoritma Genetika (GA) */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                  Karakteristik Optimasi Algoritma Genetika (GA)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Penurunan penalti pelanggaran preferensi dosen &amp; efisiensi ruang FTI
                </p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-900" />
                  <span>Skor Penalti</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-blue-600" />
                  <span>Pemanfaatan Ruang (%)</span>
                </div>
              </div>
            </div>

            {/* SVG Convergence Curve */}
            <div className="relative bg-slate-50/70 rounded-xl p-4 border border-slate-100">
              <div className="h-36 w-full relative">
                <svg viewBox="0 0 500 130" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="gaBlueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines */}
                  <line x1="0" y1="20" x2="500" y2="20" stroke="#e2e8f0" strokeDasharray="3,3" />
                  <line x1="0" y1="65" x2="500" y2="65" stroke="#e2e8f0" strokeDasharray="3,3" />
                  <line x1="0" y1="110" x2="500" y2="110" stroke="#e2e8f0" strokeDasharray="3,3" />

                  {/* Shaded Area */}
                  <path
                    d="M 20 25 C 100 50, 160 85, 260 100 C 340 110, 420 112, 480 112 L 480 125 L 20 125 Z"
                    fill="url(#gaBlueGrad)"
                  />

                  {/* Primary Curve (Skor Penalti) */}
                  <path
                    d="M 20 25 C 100 50, 160 85, 260 100 C 340 110, 420 112, 480 112"
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Secondary Room Utilization Curve */}
                  <path
                    d="M 20 105 C 120 95, 220 80, 320 65 C 400 55, 450 50, 480 48"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                    strokeDasharray="4,4"
                    strokeLinecap="round"
                  />

                  {/* Points */}
                  <circle cx="20" cy="25" r="4" fill="#0f172a" />
                  <circle cx="200" cy="92" r="3.5" fill="#0f172a" />
                  <circle cx="480" cy="112" r="4.5" fill="#10b981" />
                </svg>

                {/* Overlaid badges */}
                <div className="absolute top-2 left-6 bg-slate-900 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow-xs">
                  Gen-001: Penalti 184
                </div>

                <div className="absolute bottom-4 right-6 bg-emerald-600 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Gen-140: Penalti 42 (Stabil)
                </div>
              </div>

              {/* 3 GA Parameter Cards at Bottom */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-200/60 mt-2 text-center">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Populasi Jadwal
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    300 Kromosom
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Crossover Rate (Pc)
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    0.85 (Two-Point)
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Mutation Rate (Pm)
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    0.05 (Swap Slot)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Keputusan Resmi Wadek I & Log Konsolidasi */}
        <div className="lg:col-span-4 space-y-5">
          {/* Card 1: Keputusan Resmi Wadek I */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 space-y-4">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-900 text-white mb-2">
                KEPUTUSAN RESMI WADEK I
              </span>
              <h3 className="text-base font-bold text-slate-800">
                Pengesahan Draf Terpadu
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Tindakan di bawah ini bersifat legalitas akademik. Persetujuan akan langsung menerbitkan SK Dekan FTI untuk perkuliahan semester ganjil.
              </p>
            </div>

            {/* Checklist / Status List */}
            <div className="space-y-2.5 bg-slate-50/70 p-3 rounded-lg border border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Validasi Akademik FTI</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  TERVERIFIKASI
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Kesesuaian Kuota Lab IF/TK</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  100% SESUAI
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Beban Mengajar &gt; 16 SKS</span>
                <span className="font-bold text-slate-800">
                  0 Dosen <span className="font-normal text-slate-400">(Nihil)</span>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Catatan Soft Warning</span>
                <span className="font-bold text-amber-600">
                  3 Dosen (Jeda Singkat)
                </span>
              </div>
            </div>

            {/* 3 Main Action Buttons */}
            <div className="space-y-2 pt-1">
              {isWadekRole ? (
                <>
                  <button
                    disabled={scheduleApprovalStatus === 'Disetujui' || scheduleApprovalStatus === 'Resmi'}
                    onClick={handleApprove}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Setujui &amp; Sahkan SK Jadwal</span>
                  </button>

                  <button
                    onClick={() => setShowRevisionModal(true)}
                    className="w-full py-2 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg border border-blue-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Kembalikan dengan Catatan Revisi</span>
                  </button>
                </>
              ) : (
                <button
                  disabled={scheduleApprovalStatus !== 'Disetujui'}
                  onClick={() => setIsPublishModalOpen(true)}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {scheduleApprovalStatus === 'Resmi'
                      ? 'Sudah Dipublikasikan Resmi'
                      : scheduleApprovalStatus === 'Disetujui'
                      ? 'Publikasikan Jadwal Resmi'
                      : 'Menunggu ACC Wakil Dekan I'}
                  </span>
                </button>
              )}

              <button
                onClick={handlePrint}
                className="w-full py-2 px-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Cetak Lembar Verifikasi Akademik (PDF)</span>
              </button>
            </div>

            {/* BSrE Security Note */}
            <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 flex items-start gap-2.5 text-[11px] text-slate-600 leading-snug">
              <Lock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <span>
                Tanda tangan digital BSrE (Badan Siber dan Sandi Negara) akan diterapkan otomatis pada draf SK jadwal resmi.
              </span>
            </div>
          </div>

          {/* Card 2: Log Konsolidasi Draf (Versi 1.4.2) */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-bold text-slate-800">
                Log Konsolidasi Draf
              </h4>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                Versi 1.4.2
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Log Item 1 */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                  <RotateCcw className="w-3 h-3 text-blue-600" />
                  <span>Sistem Penjadwalan Terpadu FTI</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Seluruh Hard Conflict ruangan Lab SI-02 berhasil diselesaikan via penukaran jam mandiri.
                </p>
                <div className="text-[10px] text-slate-400 pt-0.5">
                  12 Okt 2024, 08:30 WIB
                </div>
              </div>

              {/* Log Item 2 */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Kaprodi Teknik Informatika</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Konfirmasi persetujuan slot dosen luar biasa untuk mata kuliah Keamanan Jaringan.
                </p>
                <div className="text-[10px] text-slate-400 pt-0.5">
                  11 Okt 2024, 17:15 WIB
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Catatan Revisi */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800">
                Kirim Catatan Revisi ke Admin Penjadwalan
              </h3>
              <button
                onClick={() => setShowRevisionModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Tuliskan instruksi atau arahan khusus untuk penyesuaian kelas sebelum SK dapat disahkan.
            </p>
            <textarea
              rows={4}
              value={revisionNote}
              onChange={(e) => setRevisionNote(e.target.value)}
              placeholder="Contoh: Harap pastikan Lab Basis Data tidak bentrok dengan praktikum TK..."
              className="w-full text-xs p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowRevisionModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs"
              >
                Kirim Revisi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
