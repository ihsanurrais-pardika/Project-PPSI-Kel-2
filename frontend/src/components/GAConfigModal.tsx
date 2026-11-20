import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Sliders,
  Check,
  AlertCircle,
  RefreshCw,
  Cpu,
  Dna,
  ShieldAlert,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Info,
} from 'lucide-react';
import { GAParameters } from '../types';

export const GAConfigModal: React.FC = () => {
  const { isGAConfigModalOpen, setIsGAConfigModalOpen, gaParams, updateGAParams, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'cpsat' | 'ga'>('cpsat');

  // CP-SAT Hard Constraint Configuration States
  const [cpsatConfig, setCpsatConfig] = useState({
    maxTimeSeconds: 30,
    searchWorkers: 8,
    antiBentrokDosen: true,
    antiBentrokRombel: true,
    kapasitasRuangFisik: true,
    jedaSholatJumat: true,
    aksesibilitasDisabilitas: true,
  });

  // GA Soft Constraint Configuration States
  const [form, setForm] = useState<GAParameters>({ ...gaParams });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isGAConfigModalOpen) return null;

  const validateGA = () => {
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

  const handleSaveGA = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateGA()) {
      showToast('Gagal menyimpan: beberapa parameter tidak memenuhi batasan validasi.', 'error');
      return;
    }
    updateGAParams(form);
    showToast('Konfigurasi parameter optimasi berhasil diperbarui.', 'success');
    setIsGAConfigModalOpen(false);
  };

  const handleSaveCPSAT = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Konfigurasi Hard Constraints Google OR-Tools CP-SAT berhasil disimpan!', 'success');
    setIsGAConfigModalOpen(false);
  };

  const handleResetDefault = () => {
    if (activeTab === 'cpsat') {
      setCpsatConfig({
        maxTimeSeconds: 30,
        searchWorkers: 8,
        antiBentrokDosen: true,
        antiBentrokRombel: true,
        kapasitasRuangFisik: true,
        jedaSholatJumat: true,
        aksesibilitasDisabilitas: true,
      });
      showToast('Konfigurasi CP-SAT direset ke nilai default FTI.', 'info');
    } else {
      setForm({
        populationSize: 200,
        crossoverRate: 0.85,
        mutationRate: 0.05,
        maxGenerations: 250,
        timeoutSeconds: 300,
        randomSeed: 2024,
      });
      setErrors({});
      showToast('Konfigurasi GA direset ke nilai default FTI.', 'info');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 rounded-lg text-blue-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg">Konfigurasi Solver &amp; Constraint Penjadwalan</h3>
              <p className="text-xs text-slate-300">Google OR-Tools CP-SAT (Hard Constraints) &amp; Genetic Algorithm (Soft)</p>
            </div>
          </div>
          <button
            onClick={() => setIsGAConfigModalOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('cpsat')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'cpsat'
                ? 'border-blue-700 text-blue-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            <span>Hard Constraints (CP-SAT Solver)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ga')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'ga'
                ? 'border-blue-700 text-blue-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Dna className="w-4 h-4 text-indigo-600" />
            <span>Soft Constraints &amp; Algoritma Genetika (GA)</span>
          </button>
        </div>

        {/* Tab 1: CP-SAT Content */}
        {activeTab === 'cpsat' && (
          <form onSubmit={handleSaveCPSAT} className="p-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <strong>Aturan Hard Constraint (Kewajiban Mutlak):</strong> Diformulasikan dalam model matematika Google OR-Tools CP-SAT (Boolean SAT variables). Seluruh aturan yang diaktifkan wajib terpenuhi 100% tanpa kompromi.
              </div>
            </div>

            {/* List of 5 Hard Constraints Toggles */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Daftar Hard Constraints Terpasang
              </span>

              {/* Constraint 1 */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">1. Bebas Bentrok Dosen (Tunggal &amp; Tandem)</span>
                    <span className="text-[10px] font-bold uppercase bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded">HARD</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Dosen dilarang terjadwal mengajar di 2 ruangan/kelas berbeda pada slot jam yang sama.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCpsatConfig({ ...cpsatConfig, antiBentrokDosen: !cpsatConfig.antiBentrokDosen })}
                  className="text-blue-700 hover:text-blue-900 transition-colors"
                >
                  {cpsatConfig.antiBentrokDosen ? (
                    <ToggleRight className="w-7 h-7 text-blue-700" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Constraint 2 */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">2. Bebas Bentrok Rombel Mahasiswa Se-Angkatan</span>
                    <span className="text-[10px] font-bold uppercase bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded">HARD</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Mata kuliah paket wajib pada semester &amp; program studi yang sama dilarang bertabrakan jamnya (No Cohort Overlap).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCpsatConfig({ ...cpsatConfig, antiBentrokRombel: !cpsatConfig.antiBentrokRombel })}
                  className="text-blue-700 hover:text-blue-900 transition-colors"
                >
                  {cpsatConfig.antiBentrokRombel ? (
                    <ToggleRight className="w-7 h-7 text-blue-700" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Constraint 3 */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">3. Kapasitas Ruang Fisik &gt;= Jumlah Mahasiswa</span>
                    <span className="text-[10px] font-bold uppercase bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded">HARD</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Mencegah penempatan kelas rombel di ruangan yang kapasitas kursinya lebih kecil dari peserta.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCpsatConfig({ ...cpsatConfig, kapasitasRuangFisik: !cpsatConfig.kapasitasRuangFisik })}
                  className="text-blue-700 hover:text-blue-900 transition-colors"
                >
                  {cpsatConfig.kapasitasRuangFisik ? (
                    <ToggleRight className="w-7 h-7 text-blue-700" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Constraint 4 */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">4. Window Jam Kuliah (07:30 - 18:00) &amp; Jeda Jumat</span>
                    <span className="text-[10px] font-bold uppercase bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded">HARD</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Membatasi perkuliahan di jendela operasional akademik dan menjamin bebas kuliah saat jam sholat Jumat (11:45-13:30).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCpsatConfig({ ...cpsatConfig, jedaSholatJumat: !cpsatConfig.jedaSholatJumat })}
                  className="text-blue-700 hover:text-blue-900 transition-colors"
                >
                  {cpsatConfig.jedaSholatJumat ? (
                    <ToggleRight className="w-7 h-7 text-blue-700" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Constraint 5 */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">5. Aksesibilitas Disabilitas (Prioritas Lantai 1)</span>
                    <span className="text-[10px] font-bold uppercase bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded">HARD</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Kelas yang memiliki mahasiswa berkebutuhan khusus wajib dialokasikan di lantai 1 atau ruang dengan akses lift.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCpsatConfig({ ...cpsatConfig, aksesibilitasDisabilitas: !cpsatConfig.aksesibilitasDisabilitas })}
                  className="text-blue-700 hover:text-blue-900 transition-colors"
                >
                  {cpsatConfig.aksesibilitasDisabilitas ? (
                    <ToggleRight className="w-7 h-7 text-blue-700" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Hyperparameters CP-SAT */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Batas Waktu Pencarian (Max Time)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={cpsatConfig.maxTimeSeconds}
                    onChange={(e) => setCpsatConfig({ ...cpsatConfig, maxTimeSeconds: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg pr-12 focus:border-blue-600 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">detik</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jumlah Worker Thread (Parallel)
                </label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={cpsatConfig.searchWorkers}
                  onChange={(e) => setCpsatConfig({ ...cpsatConfig, searchWorkers: Number(e.target.value) })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={handleResetDefault}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Default FTI</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsGAConfigModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-colors"
                >
                  Terapkan Konfigurasi CP-SAT
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 2: GA Content */}
        {activeTab === 'ga' && (
          <form onSubmit={handleSaveGA} className="p-6 space-y-4">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-xs text-indigo-900 leading-relaxed flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong>Aturan Soft Constraint &amp; Algoritma Genetika:</strong> Mengoptimalkan preferensi hari &amp; jam dosen, perataan beban mengajar harian, serta kedekatan gedung dan lantai antar kelas.
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
                  }`}
                />
                {errors.populationSize && <p className="text-[10px] text-rose-600 mt-1">{errors.populationSize}</p>}
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
                  }`}
                />
                {errors.crossoverRate && <p className="text-[10px] text-rose-600 mt-1">{errors.crossoverRate}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Peluang Mutasi (Pm)
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
                  }`}
                />
                {errors.mutationRate && <p className="text-[10px] text-rose-600 mt-1">{errors.mutationRate}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jumlah Generasi Maksimum
                </label>
                <input
                  type="number"
                  min="10"
                  max="2000"
                  value={form.maxGenerations}
                  onChange={(e) => setForm({ ...form, maxGenerations: parseInt(e.target.value) || 0 })}
                  className={`w-full px-3 py-2 rounded-lg border text-sm font-medium ${
                    errors.maxGenerations ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-slate-300 focus:border-blue-500'
                  }`}
                />
                {errors.maxGenerations && <p className="text-[10px] text-rose-600 mt-1">{errors.maxGenerations}</p>}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={handleResetDefault}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Default GA</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsGAConfigModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                >
                  Terapkan Parameter GA
                </button>
              </div>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
