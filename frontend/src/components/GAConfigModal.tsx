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
    if (form.wGap < 0) errs.wGap = 'Bobot penalti jeda mahasiswa harus ≥ 0';
    if (form.wPref < 0) errs.wPref = 'Bobot penalti preferensi dosen harus ≥ 0';
    if (form.wSpread < 0) errs.wSpread = 'Bobot penalti sebaran hari mengajar harus ≥ 0';
    if (form.wWaste < 0) errs.wWaste = 'Bobot penalti pemborosan kursi harus ≥ 0';
    if (form.timeoutSeconds <= 0) errs.timeoutSeconds = 'Batas waktu (timeout) harus > 0 detik';
    if (form.numWorkers <= 0) errs.numWorkers = 'Jumlah search workers harus ≥ 1';

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
      linearizationLevel: 2,
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
              <h3 className="font-bold text-lg">Konfigurasi Solver Google OR-Tools CP-SAT</h3>
              <p className="text-xs text-slate-300">Parameter Matematis & Bobot Multi-Objective • Sesuai task.md</p>
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
              Fungsi tujuan meminimalkan penalti: <span className="font-mono font-bold">min Z = W1·P_Gap + W2·P_Pref + W3·P_Spread + W4·P_RoomWaste</span>. Perubahan bobot akan langsung dieksekusi oleh solver CP-SAT tanpa modifikasi kode sumber.
            </div>
          </div>

          {/* Section 1: Bobot Multi-Objective */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Bobot Batasan Lunak (Soft Constraints)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  W1: Penalti Jeda Mahasiswa (P_Gap)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.wGap}
                  onChange={(e) => setForm({ ...form, wGap: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:border-blue-500 focus:outline-hidden"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Def: 10 (Menghindari jam kosong di tengah)</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  W2: Penalti Preferensi Dosen (P_Pref)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.wPref}
                  onChange={(e) => setForm({ ...form, wPref: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:border-blue-500 focus:outline-hidden"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Def: 4 (Slot waktu yang kurang disukai)</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  W3: Penalti Sebaran Dosen (P_Spread)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.wSpread}
                  onChange={(e) => setForm({ ...form, wSpread: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:border-blue-500 focus:outline-hidden"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Def: 3 (Kompaksi hari datang dosen)</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  W4: Penalti Kursi Terbuang (P_RoomWaste)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.wWaste}
                  onChange={(e) => setForm({ ...form, wWaste: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:border-blue-500 focus:outline-hidden"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Def: 1 (Menghindari ruang terlalu besar)</p>
              </div>
            </div>
          </div>

          {/* Section 2: Parameter Teknis Solver (task.md Bagian 8) */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              Parameter Eksekusi Solver (task.md Bagian 8)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Time Limit Solver (Detik)
                </label>
                <input
                  type="number"
                  min="5"
                  max="600"
                  value={form.timeoutSeconds}
                  onChange={(e) => setForm({ ...form, timeoutSeconds: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:border-blue-500 focus:outline-hidden"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Rekomendasi task.md: 30 - 300 detik</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jumlah Search Workers (Threads)
                </label>
                <select
                  value={form.numWorkers}
                  onChange={(e) => setForm({ ...form, numWorkers: parseInt(e.target.value) || 8 })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:border-blue-500 focus:outline-hidden"
                >
                  <option value={4}>4 Threads</option>
                  <option value={8}>8 Threads (Rekomendasi task.md)</option>
                  <option value={12}>12 Threads</option>
                  <option value={16}>16 Threads (Maksimal)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-0.5">Branching: PORTFOLIO_SEARCH aktif</p>
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
              Reset ke Default
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
                Simpan Parameter CP-SAT
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
