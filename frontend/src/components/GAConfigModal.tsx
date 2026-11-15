import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Sliders, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { GAParameters } from '../types';

export const GAConfigModal: React.FC = () => {
  const { isGAConfigModalOpen, setIsGAConfigModalOpen, gaParams, updateGAParams, showToast } = useApp();

  const [form, setForm] = useState<GAParameters>({ ...gaParams });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isGAConfigModalOpen) return null;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (form.populationSize <= 0 || !Number.isInteger(form.populationSize)) {
      errs.populationSize = 'Ukuran populasi harus berupa bilangan bulat > 0 (NF-12)';
    }
    if (form.crossoverRate < 0 || form.crossoverRate > 1) {
      errs.crossoverRate = 'Peluang crossover harus bernilai antara 0.0 sampai 1.0 (NF-12)';
    }
    if (form.mutationRate < 0 || form.mutationRate > 1) {
      errs.mutationRate = 'Peluang mutasi harus bernilai antara 0.0 sampai 1.0 (NF-12)';
    }
    if (form.maxGenerations <= 0 || !Number.isInteger(form.maxGenerations)) {
      errs.maxGenerations = 'Generasi maksimum harus berupa bilangan bulat > 0';
    }
    if (form.timeoutSeconds <= 0) {
      errs.timeoutSeconds = 'Batas waktu (timeout) harus > 0 detik';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      showToast('Gagal menyimpan: beberapa parameter tidak memenuhi batasan validasi.', 'error');
      return;
    }
    updateGAParams(form);
    setIsGAConfigModalOpen(false);
  };

  const handleResetDefault = () => {
    setForm({
      populationSize: 200,
      crossoverRate: 0.85,
      mutationRate: 0.05,
      maxGenerations: 250,
      timeoutSeconds: 300,
      randomSeed: 2024,
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
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Konfigurasi Parameter Algoritma Optimasi (GA)</h3>
              <p className="text-xs text-slate-300">Modul Penjadwalan Perkuliahan • Sesuai PRD F-07 & NF-12</p>
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
              Perubahan parameter metaheuristik GA akan langsung diterapkan pada eksekusi optimasi berikutnya tanpa mengubah kode sumber. Input di luar rentang valid ditolak secara otomatis.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ukuran Populasi (Individuals)
              </label>
              <input
                type="number"
                min="10"
                max="1000"
                value={form.populationSize}
                onChange={(e) => setForm({ ...form, populationSize: parseInt(e.target.value) || 0 })}
                className={`w-full px-3 py-2 rounded-lg border text-sm font-medium ${
                  errors.populationSize ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-slate-300 focus:border-blue-500'
                } focus:outline-hidden`}
              />
              {errors.populationSize && (
                <p className="text-xs text-rose-600 mt-1">{errors.populationSize}</p>
              )}
              <p className="text-[11px] text-slate-500 mt-0.5">Rekomendasi: 200 - 300 kromosom</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Peluang Crossover / Pindah Silang (Pc)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={form.crossoverRate}
                onChange={(e) => setForm({ ...form, crossoverRate: parseFloat(e.target.value) || 0 })}
                className={`w-full px-3 py-2 rounded-lg border text-sm font-medium ${
                  errors.crossoverRate ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-slate-300 focus:border-blue-500'
                } focus:outline-hidden`}
              />
              {errors.crossoverRate && (
                <p className="text-xs text-rose-600 mt-1">{errors.crossoverRate}</p>
              )}
              <p className="text-[11px] text-slate-500 mt-0.5">Rentang: 0.0 s.d. 1.0 (Def: 0.85)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Peluang Mutasi / Acak Gen (Pm)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={form.mutationRate}
                onChange={(e) => setForm({ ...form, mutationRate: parseFloat(e.target.value) || 0 })}
                className={`w-full px-3 py-2 rounded-lg border text-sm font-medium ${
                  errors.mutationRate ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-slate-300 focus:border-blue-500'
                } focus:outline-hidden`}
              />
              {errors.mutationRate && (
                <p className="text-xs text-rose-600 mt-1">{errors.mutationRate}</p>
              )}
              <p className="text-[11px] text-slate-500 mt-0.5">Rentang: 0.0 s.d. 1.0 (Def: 0.05)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Maksimum Generasi (Epoch)
              </label>
              <input
                type="number"
                min="50"
                max="1000"
                value={form.maxGenerations}
                onChange={(e) => setForm({ ...form, maxGenerations: parseInt(e.target.value) || 0 })}
                className={`w-full px-3 py-2 rounded-lg border text-sm font-medium ${
                  errors.maxGenerations ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-slate-300 focus:border-blue-500'
                } focus:outline-hidden`}
              />
              {errors.maxGenerations && (
                <p className="text-xs text-rose-600 mt-1">{errors.maxGenerations}</p>
              )}
              <p className="text-[11px] text-slate-500 mt-0.5">Kriteria konvergensi Pareto (Def: 250)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Batas Waktu Timeout (Detik)
              </label>
              <input
                type="number"
                min="10"
                max="1200"
                value={form.timeoutSeconds}
                onChange={(e) => setForm({ ...form, timeoutSeconds: parseInt(e.target.value) || 0 })}
                className={`w-full px-3 py-2 rounded-lg border text-sm font-medium ${
                  errors.timeoutSeconds ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-slate-300 focus:border-blue-500'
                } focus:outline-hidden`}
              />
              <p className="text-[11px] text-slate-500 mt-0.5">Maks. runtime solver (NF-02 ≤ 600s)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Random Seed (Deterministik)
              </label>
              <input
                type="number"
                value={form.randomSeed}
                onChange={(e) => setForm({ ...form, randomSeed: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:border-blue-500 focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-500 mt-0.5">Menjamin reproduksibilitas hasil (NF-13)</p>
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
                Simpan Parameter
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
