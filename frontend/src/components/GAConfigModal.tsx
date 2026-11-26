import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Sliders, Check, AlertCircle, RefreshCw, Cpu, Layers } from 'lucide-react';
import { CPSATParameters } from '../types';

export const GAConfigModal: React.FC = () => {
  const { isGAConfigModalOpen, setIsGAConfigModalOpen, cpsatParams, updateCPSATParams } = useApp();

  const [form, setForm] = useState<CPSATParameters>({ ...cpsatParams });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isGAConfigModalOpen) return null;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (form.wGap < 0) errs.wGap = 'Bobot jeda mahasiswa harus ≥ 0';
    if (form.wPref < 0) errs.wPref = 'Bobot preferensi dosen harus ≥ 0';
    if (form.wSpread < 0) errs.wSpread = 'Bobot sebaran hari mengajar harus ≥ 0';
    if (form.wWaste < 0) errs.wWaste = 'Bobot efisiensi ruang harus ≥ 0';
    if (form.timeoutSeconds <= 0) errs.timeoutSeconds = 'Batas waktu harus > 0 detik';
    if (form.numWorkers <= 0) errs.numWorkers = 'Jumlah pekerja prosesor harus ≥ 1';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    updateCPSATParams(form);
    setIsGAConfigModalOpen(false);
  };

  const handleResetDefault = () => {
    setForm({
      wGap: 10,
      wPref: 4,
      wSpread: 3,
      wWaste: 1,
      timeoutSeconds: 60,
      numWorkers: 8,
      linearizationLevel: 0,
    });
    setErrors({});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 rounded-lg text-blue-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Pengaturan Preferensi Penjadwalan</h3>
              <p className="text-xs text-slate-300">Penyesuaian Prioritas Kenyamanan Kuliah & Performa Alokasi Ruang</p>
            </div>
          </div>
          <button
            onClick={() => setIsGAConfigModalOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 leading-relaxed flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              Pengaturan ini mengarahkan sistem dalam menyeimbangkan kenyamanan mahasiswa, ketersediaan dosen, dan efisiensi ruang tanpa melanggar batasan wajib (bebas bentrok).
            </div>
          </div>

          {/* Section 1: Prioritas Kenyamanan Jadwal */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Prioritas Kualitas & Kenyamanan Jadwal
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Minimalkan Jam Kosong Mahasiswa
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.wGap}
                  onChange={(e) => setForm({ ...form, wGap: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:border-blue-500 focus:outline-hidden"
                />
                {errors.wGap && <p className="text-[10px] text-rose-600 mt-0.5">{errors.wGap}</p>}
                <p className="text-[10px] text-slate-500 mt-0.5">Standar: 10 (Menghindari jeda kuliah yang terlalu lama)</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kesesuaian Waktu Dosen
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.wPref}
                  onChange={(e) => setForm({ ...form, wPref: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:border-blue-500 focus:outline-hidden"
                />
                {errors.wPref && <p className="text-[10px] text-rose-600 mt-0.5">{errors.wPref}</p>}
                <p className="text-[10px] text-slate-500 mt-0.5">Standar: 4 (Mengutamakan jam luang pilihan dosen)</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kompaksi Hari Hadir Dosen
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.wSpread}
                  onChange={(e) => setForm({ ...form, wSpread: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:border-blue-500 focus:outline-hidden"
                />
                {errors.wSpread && <p className="text-[10px] text-rose-600 mt-0.5">{errors.wSpread}</p>}
                <p className="text-[10px] text-slate-500 mt-0.5">Standar: 3 (Fokus mengajar di hari yang sama)</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Efisiensi Kapasitas Ruangan
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.wWaste}
                  onChange={(e) => setForm({ ...form, wWaste: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:border-blue-500 focus:outline-hidden"
                />
                {errors.wWaste && <p className="text-[10px] text-rose-600 mt-0.5">{errors.wWaste}</p>}
                <p className="text-[10px] text-slate-500 mt-0.5">Standar: 1 (Menghindari ruang terlalu besar untuk kelas kecil)</p>
              </div>
            </div>
          </div>

          {/* Section 2: Kapasitas Komputasi */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              Kapasitas & Batas Waktu Komputasi
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Batas Waktu Kalkulasi (Detik)
                </label>
                <input
                  type="number"
                  min="5"
                  max="600"
                  value={form.timeoutSeconds}
                  onChange={(e) => setForm({ ...form, timeoutSeconds: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:border-blue-500 focus:outline-hidden"
                />
                {errors.timeoutSeconds && <p className="text-[10px] text-rose-600 mt-0.5">{errors.timeoutSeconds}</p>}
                <p className="text-[10px] text-slate-500 mt-0.5">Disarankan: 30 - 60 detik untuk skala fakultas</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Intensitas Prosesor (Threads)
                </label>
                <select
                  value={form.numWorkers}
                  onChange={(e) => setForm({ ...form, numWorkers: parseInt(e.target.value) || 8 })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:border-blue-500 focus:outline-hidden"
                >
                  <option value={4}>4 Inti Prosesor (Standar)</option>
                  <option value={8}>8 Inti Prosesor (Disarankan)</option>
                  <option value={12}>12 Inti Prosesor (Cepat)</option>
                  <option value={16}>16 Inti Prosesor (Performa Penuh)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-0.5">Mengoptimalkan waktu kalkulasi jadwal</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetDefault}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset ke Standar
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsGAConfigModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
              >
                <Check className="w-4 h-4" />
                Simpan Preferensi
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
