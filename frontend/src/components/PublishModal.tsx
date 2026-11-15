import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Globe, CheckCircle2, AlertTriangle, ShieldCheck, FileText } from 'lucide-react';

export const PublishModal: React.FC = () => {
  const {
    isPublishModalOpen,
    setIsPublishModalOpen,
    scheduleApprovalStatus,
    publishOfficialSchedule,
    schedule,
    showToast,
  } = useApp();

  const [confirmCheck, setConfirmCheck] = useState<boolean>(false);

  if (!isPublishModalOpen) return null;

  const isApprovedByWadek = scheduleApprovalStatus === 'Disetujui';

  const handlePublish = () => {
    if (!isApprovedByWadek) {
      showToast('Gagal: Jadwal belum mendapatkan persetujuan (approval) resmi dari Wakil Dekan I (F-11 / F-12).', 'error');
      return;
    }
    if (!confirmCheck) {
      showToast('Harap centang konfirmasi publikasi terlebih dahulu.', 'warning');
      return;
    }
    publishOfficialSchedule();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Publikasi Jadwal Perkuliahan Resmi</h3>
              <p className="text-xs text-blue-100">Portal & Informasi Akademik • Sesuai PRD F-12 & UC-12</p>
            </div>
          </div>
          <button
            onClick={() => setIsPublishModalOpen(false)}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Status Persetujuan Check */}
          <div className={`p-4 rounded-xl border ${
            isApprovedByWadek
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-start gap-3">
              {isApprovedByWadek ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="font-bold text-sm">
                  {isApprovedByWadek ? 'Status Otorisasi: Telah Disetujui Wakil Dekan I' : 'Peringatan: Menunggu Persetujuan Wakil Dekan I'}
                </h4>
                <p className="text-xs mt-1 leading-relaxed">
                  {isApprovedByWadek
                    ? 'Draf jadwal telah divalidasi 0% bentrok dan ditandatangani digital oleh Wakil Dekan I FTI. Jadwal siap disiarkan secara resmi ke seluruh sivitas akademika.'
                    : 'Berdasarkan PRD F-11 & F-12, jadwal HANYA dapat diterbitkan ke Portal Akademik setelah status persetujuan Wakil Dekan I tercatat di sistem.'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">Total Sesi Kelas</div>
              <div className="text-lg font-bold text-slate-800">{schedule.length} Sesi</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">Hard Conflict</div>
              <div className="text-lg font-bold text-emerald-600">0% Bentrok</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">Semester</div>
              <div className="text-lg font-bold text-blue-600">Ganjil 24/25</div>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
              <FileText className="w-4 h-4 text-blue-600" />
              Dampak Publikasi Jadwal Resmi:
            </div>
            <p>1. Status jadwal berubah menjadi <span className="font-bold text-emerald-700">Resmi / Terpublikasi</span>.</p>
            <p>2. Jadwal dan ruangan dapat diakses secara live oleh seluruh Dosen dan Mahasiswa.</p>
            <p>3. Riwayat waktu publikasi dan ID Admin akan dicatat ke dalam audit trail (NF-09).</p>
          </div>

          {isApprovedByWadek && (
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-blue-200 bg-blue-50/50 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmCheck}
                onChange={(e) => setConfirmCheck(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-blue-900">
                Saya mengonfirmasi publikasi jadwal ini sebagai jadwal resmi perkuliahan FTI Unand.
              </span>
            </label>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsPublishModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={!isApprovedByWadek || !confirmCheck}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold text-white shadow-sm transition-all ${
                isApprovedByWadek && confirmCheck
                  ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                  : 'bg-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Konfirmasi Publikasikan Sekarang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
