import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Wand2,
  Clock,
  Building,
  UserX,
  Users,
  Check,
  ArrowRight,
  Split,
  MoveRight,
  Info,
} from 'lucide-react';

export const ValidasiKonflikPage: React.FC = () => {
  const {
    conflicts,
    resolveConflict,
    autoFixConflicts,
    showToast,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');

  const filteredConflicts = conflicts.filter((c) => {
    if (activeFilter === 'unresolved') return !c.isResolved;
    if (activeFilter === 'resolved') return c.isResolved;
    return true;
  });

  const unresolvedCount = conflicts.filter((c) => !c.isResolved).length;

  const handleManualResolve = (id: string, title: string) => {
    resolveConflict(id);
    showToast(`Konflik "${title}" berhasil diselesaikan dengan rekomendasi sistem.`, 'success');
  };

  const handleAutoFix = () => {
    autoFixConflicts();
    showToast('Semua konflik jadwal berhasil diselesaikan secara otomatis!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 mb-1">
            <span className="bg-rose-100 px-2 py-0.5 rounded font-mono">
              DIAGNOSTIK JADWAL
            </span>
            <span>•</span>
            <span className="text-slate-500">Evaluasi Multi-Constraint Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Validasi & Resolusi Konflik Jadwal
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 max-w-3xl">
            Pusat deteksi anomali jadwal, bentrok dosen, kelebihan kapasitas rombel, dan pelanggaran batasan akademik (hard &amp; soft constraints).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => showToast('Memvalidasi seluruh 318 rombel terhadap 4 Hard Constraints...', 'info')}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Jalankan Validasi Ulang</span>
          </button>
          <button
            disabled={unresolvedCount === 0}
            onClick={handleAutoFix}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 shadow-sm transition-colors disabled:opacity-50"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Auto-Fix Semua Konflik ({unresolvedCount})</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Total Konflik Aktif
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600">
            {unresolvedCount} Konflik
          </div>
          <p className="text-xs text-slate-500 mt-1">2 Hard Constraint • 1 Soft Constraint</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Hard Constraint
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">99.05% Feasible</div>
          <p className="text-xs text-slate-500 mt-1">315/318 Rombel Bebas Pelanggaran</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Soft Constraint
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-700">92.0% Terpenuhi</div>
          <p className="text-xs text-slate-500 mt-1">Preferensi Jam &amp; Hari Dosen</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Status Mitigasi
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            {unresolvedCount > 0 ? 'Perlu Intervensi' : 'Semua Beres'}
          </div>
          <p className="text-xs text-slate-500 mt-1">Tersedia Rekomendasi Solutif</p>
        </div>
      </div>

      {/* Auto-Fix Recommendation Banner */}
      {unresolvedCount > 0 && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 text-blue-300 flex items-center justify-center shrink-0">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                Auto-Resolusi Cerdas Berbasis CP-SAT Optimizer
              </h3>
              <p className="text-xs text-blue-200 mt-0.5">
                Sistem dapat menukar 2 slot ruang dan memecah 1 kelas lab praktikum secara otomatis tanpa melanggar preferensi jadwal dosen lainnya.
              </p>
            </div>
          </div>

          <button
            onClick={handleAutoFix}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors shrink-0 flex items-center gap-1.5"
          >
            <span>Terapkan Auto-Resolusi Sekarang</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveFilter('unresolved')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeFilter === 'unresolved'
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Butuh Tindakan ({unresolvedCount})
        </button>
        <button
          onClick={() => setActiveFilter('resolved')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeFilter === 'resolved'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Terselesaikan ({conflicts.filter((c) => c.isResolved).length})
        </button>
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeFilter === 'all'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Semua ({conflicts.length})
        </button>
      </div>

      {/* Conflict Items List */}
      <div className="space-y-4">
        {filteredConflicts.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Tidak Ada Konflik Jadwal
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Seluruh jadwal mata kuliah telah mematuhi aturan akademik dan bebas tumpang tindih.
            </p>
          </div>
        ) : (
          filteredConflicts.map((item) => {
            const isHard = item.type === 'Hard Constraint';
            const isResolved = item.isResolved;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl border p-5 transition-all shadow-xs ${
                  isResolved
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : isHard
                    ? 'border-rose-200 hover:border-rose-300'
                    : 'border-amber-200 hover:border-amber-300'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          isHard
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {item.type}
                      </span>

                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {item.department}
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          item.severity === 'Tinggi'
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : item.severity === 'Sedang'
                            ? 'bg-amber-50 text-amber-600 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Tingkat: {item.severity}
                      </span>

                      {isResolved && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Terselesaikan
                        </span>
                      )}
                    </div>

                    {/* Title and Description */}
                    <h3 className="text-base font-bold text-slate-800">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.description}
                    </p>

                    {/* Affected classes info */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      <div className="flex items-center gap-1.5">
                        <UserX className="w-3.5 h-3.5 text-slate-400" />
                        <span>Mata Kuliah Terlibat: <strong>{item.affectedCourses.join(' & ')}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-2">
                    {!isResolved ? (
                      <>
                        <button
                          onClick={() => handleManualResolve(item.id, item.title)}
                          className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Terapkan Rekomendasi</span>
                        </button>

                        <button
                          onClick={() =>
                            showToast(
                              `Mengabaikan sementara peringatan ${item.title}. Perlu perhatian sebelum SK diterbitkan.`,
                              'warning'
                            )
                          }
                          className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium rounded-lg transition-colors text-center"
                        >
                          Abaikan Sementara
                        </button>
                      </>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 py-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Telah Diintervensi
                      </span>
                    )}
                  </div>
                </div>

                {/* Proposed Solution Box */}
                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-2.5 text-xs">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-700 block">
                      Rekomendasi Tindakan Solver:
                    </span>
                    <span className="text-slate-600">
                      {item.id === 'c-01' &&
                        'Pindahkan jadwal kelas SI-3105 ke slot Rabu Sesi 2 (09:20 - 11:00) di Ruang G-203. Slot tersebut berstatus kosong dan tidak melanggar batasan jam tandem Dr. Surya.'}
                      {item.id === 'c-02' &&
                        'Pecah rombel menjadi 2 shift praktikum (24 mhs/shift) sesuai F-14 pada hari Kamis & Jumat, atau pindahkan ke Lab Terpadu AI (55 Workstations).'}
                      {item.id === 'c-03' &&
                        'Majukan sesi ke 09:20 - 11:00 atau pindahkan ke slot Kamis siang agar terhindar dari pemotongan waktu ibadah Sholat Jumat.'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
