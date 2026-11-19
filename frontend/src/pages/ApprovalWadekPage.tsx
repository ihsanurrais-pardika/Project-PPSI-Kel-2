import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  Send,
  Printer,
  ChevronDown,
  Building,
  Users,
  Layers,
  Sparkles,
  Award,
  Calendar,
  Clock,
  RotateCcw,
} from 'lucide-react';

export const ApprovalWadekPage: React.FC = () => {
  const {
    scheduleApprovalStatus,
    wadekApprove,
    wadekReject,
    wadekRevisionNote,
    setIsPublishModalOpen,
    showToast,
  } = useApp();

  const [revisionText, setRevisionText] = useState(
    wadekRevisionNote || 'Harap pastikan slot praktikum basis data tidak berbenturan dengan modul hardware lab TK.'
  );
  const [selectedDeptDetail, setSelectedDeptDetail] = useState<string | null>('SI');

  const handleApproveClick = () => {
    wadekApprove();
    setIsPublishModalOpen(true);
  };

  const handleRejectClick = () => {
    if (!revisionText.trim()) {
      showToast('Harap masukkan catatan revisi untuk admin/kaprodi!', 'warning');
      return;
    }
    wadekReject(revisionText);
    showToast('Catatan revisi berhasil dikirimkan kembali ke Admin Penjadwalan.', 'info');
  };

  const handlePrintDraft = () => {
    showToast('Menyiapkan berkas draf SK Perkuliahan FTI Unand untuk pencetakan/PDF...', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
            <span className="bg-blue-100 px-2 py-0.5 rounded font-mono">
              OTORISASI DEKANAT
            </span>
            <span>•</span>
            <span className="text-slate-500">Persetujuan Draf SK Perkuliahan Semester Ganjil 2024/2025</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Review & Approval Jadwal - Wakil Dekan I
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 max-w-3xl">
            Verifikasi kepatuhan aturan akademik, optimalisasi beban mengajar dosen, dan ratifikasi resmi Surat Keputusan (SK) Dekan FTI Unand.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handlePrintDraft}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Cetak Rekap Verifikasi</span>
          </button>

          <button
            onClick={handleApproveClick}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 shadow-sm shadow-blue-700/20 transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Setujui &amp; Terbitkan SK Resmi</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Total Mata Kuliah
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-800">142 MK</div>
          <p className="text-xs text-slate-500 mt-1">318 Rombongan Belajar Terjadwal</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Kepatuhan Hard Constraint
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">100% Lolos</div>
          <p className="text-xs text-slate-500 mt-1">0 Bentrok Dosen, Ruang, &amp; Rombel</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Kualitas Jadwal (Fitness)
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-700">94.8% Optimal</div>
          <p className="text-xs text-slate-500 mt-1">Konvergen pada Generasi 250</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Status Approval
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                scheduleApprovalStatus === 'Disetujui' || scheduleApprovalStatus === 'Resmi'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : scheduleApprovalStatus === 'Revisi'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  scheduleApprovalStatus === 'Disetujui' || scheduleApprovalStatus === 'Resmi'
                    ? 'bg-emerald-500'
                    : scheduleApprovalStatus === 'Revisi'
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
                }`}
              />
              {scheduleApprovalStatus}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Draf v2.4 FTI Terpadu</p>
        </div>
      </div>

      {/* PRD UC-09: make the effect of GA optimization reviewable by WD1. */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-800">Perbandingan Kualitas Optimasi</h2>
            <p className="text-xs text-slate-500 mt-1">Skor penalti sebelum dan sesudah Genetic Algorithm. Nilai lebih rendah menunjukkan jadwal lebih baik.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <Sparkles className="w-3.5 h-3.5" /> Penalti turun 68%
          </span>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1.5"><span className="font-medium text-slate-600">Draf CP-SAT</span><span className="font-bold text-slate-700">312 poin</span></div>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden"><div className="h-full w-full bg-slate-400 rounded-full" /></div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5"><span className="font-medium text-slate-600">Hasil optimasi GA</span><span className="font-bold text-blue-700">101 poin</span></div>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden"><div className="h-full w-[32%] bg-blue-600 rounded-full" /></div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3"><div className="text-[10px] uppercase tracking-wide text-slate-500">Preferensi dosen</div><div className="mt-1 text-lg font-bold text-slate-800">−42%</div><div className="text-[10px] text-slate-500">penalti</div></div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3"><div className="text-[10px] uppercase tracking-wide text-slate-500">Beban harian</div><div className="mt-1 text-lg font-bold text-slate-800">−31%</div><div className="text-[10px] text-slate-500">penalti</div></div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3"><div className="text-[10px] uppercase tracking-wide text-slate-500">Jeda antar kelas</div><div className="mt-1 text-lg font-bold text-slate-800">−25%</div><div className="text-[10px] text-slate-500">penalti</div></div>
          </div>
        </div>
      </section>

      {/* Main Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Department Submissions (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Daftar Usulan Jadwal Tiap Departemen
                </h3>
                <p className="text-xs text-slate-500">
                  Hasil agregasi komputasi solver CP-SAT &amp; GA per program studi
                </p>
              </div>
              <span className="text-xs text-slate-500 font-medium">3 Departemen Terdaftar</span>
            </div>

            <div className="space-y-3">
              {/* SI Item */}
              <div
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedDeptDetail === 'SI'
                    ? 'border-blue-500 bg-blue-50/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => setSelectedDeptDetail('SI')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      SI
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Departemen Sistem Informasi
                      </h4>
                      <p className="text-xs text-slate-500">
                        114 Kelas • 28 Dosen Pengampu • 36 Mata Kuliah
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    Feasible 100%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Okupansi Ruang</span>
                    <span className="font-semibold text-slate-700">92.4% Optimal</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Jeda Sholat Jumat</span>
                    <span className="font-semibold text-emerald-600">Nol Pelanggaran</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Verifikasi Kaprodi</span>
                    <span className="font-semibold text-blue-700">Telah Disetujui</span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-2 italic bg-white p-2 rounded border border-slate-100">
                  "Catatan Kaprodi: Distribusi mata kuliah wajib semester 1, 3, 5 telah diuji bebas bentrok angkatan."
                </p>
              </div>

              {/* IF Item */}
              <div
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedDeptDetail === 'IF'
                    ? 'border-blue-500 bg-blue-50/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => setSelectedDeptDetail('IF')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                      IF
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Departemen Informatika
                      </h4>
                      <p className="text-xs text-slate-500">
                        128 Kelas • 34 Dosen Pengampu • 42 Mata Kuliah
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    Feasible 100%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Okupansi Ruang</span>
                    <span className="font-semibold text-slate-700">94.8% Optimal</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Kapasitas Lab</span>
                    <span className="font-semibold text-emerald-600">Sesuai Kuota PC</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Verifikasi Kaprodi</span>
                    <span className="font-semibold text-blue-700">Telah Disetujui</span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-2 italic bg-white p-2 rounded border border-slate-100">
                  "Catatan Kaprodi: Beban praktikum Daspro & PBO telah dibagi merata ke 2 shift asistensi."
                </p>
              </div>

              {/* TK Item */}
              <div
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedDeptDetail === 'TK'
                    ? 'border-blue-500 bg-blue-50/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => setSelectedDeptDetail('TK')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                      TK
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Departemen Teknik Komputer
                      </h4>
                      <p className="text-xs text-slate-500">
                        76 Kelas • 22 Dosen Pengampu • 24 Mata Kuliah
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    Feasible 100%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Okupansi Ruang</span>
                    <span className="font-semibold text-slate-700">89.1% Optimal</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Lab Hardware &amp; IoT</span>
                    <span className="font-semibold text-emerald-600">Tersinkronisasi</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Verifikasi Kaprodi</span>
                    <span className="font-semibold text-blue-700">Telah Disetujui</span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-2 italic bg-white p-2 rounded border border-slate-100">
                  "Catatan Kaprodi: Praktikum Embedded System dan Jaringan Terdistribusi dialokasikan di Lab Lt. 3."
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Wadek I Approval Form & Signature (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">
                Panel Validasi &amp; Keputusan Pimpinan
              </h3>
              <p className="text-xs text-slate-500">
                Hak otorisasi Wakil Dekan I Bidang Akademik
              </p>
            </div>

            {/* Checklist Validasi Wadek */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Rubrik Kelayakan Akademik
              </span>

              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>NIDN Seluruh Pengampu Terverifikasi PDDikti</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Beban Mengajar Dosen Sesuai BKD (&lt; 12 SKS)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Jeda Sholat Jumat (11:45 - 13:30) Terpenuhi</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Kapasitas Kursi Fisik &gt;= Jumlah Rombel</span>
                </div>
              </div>
            </div>

            {/* Revision Note Box */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Revisi / Arahan Khusus Wakil Dekan I:
              </label>
              <textarea
                rows={3}
                value={revisionText}
                onChange={(e) => setRevisionText(e.target.value)}
                placeholder="Tuliskan arahan jika terdapat kelas yang memerlukan penyesuaian..."
                className="w-full text-xs p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 placeholder-slate-400"
              />
            </div>

            {/* Digital Signature Card (BSrE BSSN) */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                <span>Sertifikasi Tanda Tangan Elektronik (BSrE)</span>
              </div>
              <div className="text-[11px] text-slate-600 leading-snug">
                <div>Penandatangan: <strong>Dr. Eng. Ir. Rahmadi, S.Kom, M.T.</strong></div>
                <div className="text-slate-500">NIP: 19780512 200501 1 002</div>
                <div className="text-slate-500 text-[10px] mt-1">
                  Status: Siap ditandatangani secara kriptografis menggunakan sertifikat elektronik resmi Universitas Andalas.
                </div>
              </div>
            </div>

            {/* Decision Buttons */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <button
                onClick={handleApproveClick}
                className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-sm shadow-blue-700/20 transition-colors flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Setujui &amp; Terbitkan SK Resmi Dekan</span>
              </button>

              <button
                onClick={handleRejectClick}
                className="w-full py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Kembalikan untuk Revisi ke Admin</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

