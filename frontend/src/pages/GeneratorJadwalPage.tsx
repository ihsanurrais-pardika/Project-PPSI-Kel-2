import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Cpu,
  Dna,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  Users,
  Building,
  Terminal,
  TrendingDown,
  Download,
  Calendar,
  Send,
  Settings,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';

export const GeneratorJadwalPage: React.FC = () => {
  const {
    gaParams,
    setIsGAConfigModalOpen,
    setActivePage,
    showToast,
    wadekApprove,
    scheduleApprovalStatus,
  } = useApp();

  const [isRunningSolver, setIsRunningSolver] = useState(false);
  const [solverProgress, setSolverProgress] = useState(100);

  const handleRerunSolver = () => {
    setIsRunningSolver(true);
    setSolverProgress(15);
    showToast('Memulai ulang komputasi Solver Dual-Engine (CP-SAT + GA)...', 'info');

    setTimeout(() => setSolverProgress(45), 600);
    setTimeout(() => setSolverProgress(80), 1200);
    setTimeout(() => {
      setSolverProgress(100);
      setIsRunningSolver(false);
      showToast('Komputasi berhasil! Feasible solution ditemukan dengan 0 pelanggaran Hard Constraint.', 'success');
    }, 1800);
  };

  const handleSubmitToWadek = () => {
    showToast('Draf Jadwal Terpadu v2.4 resmi diajukan ke Wakil Dekan I untuk review dan penandatanganan SK.', 'success');
    setActivePage('approval_wadek');
  };

  const handleDownloadLog = () => {
    const logData = {
      batchId: '#SCH-2024-GANJIL-B92',
      academicYear: '2024/2025 Ganjil',
      solver: 'Google OR-Tools CP-SAT v9.8 + Genetic Algorithm v2.4',
      executionTimeSeconds: 7.34,
      hardConstraintsPassed: 4,
      penaltyInitial: 184,
      penaltyFinal: 42,
      improvementPercentage: '77.2%',
      departments: {
        SI: { classes: 114, utilization: '92.4%' },
        IF: { classes: 128, utilization: '94.8%' },
        TK: { classes: 76, utilization: '89.1%' },
      },
    };

    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'solver_execution_log_FTI_2024_GANJIL.json';
    a.click();
    showToast('Log eksekusi solver (.JSON) berhasil diunduh.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
            <span className="bg-blue-100 px-2 py-0.5 rounded font-mono">
              SOLVER DUAL-ENGINE ACTIVE
            </span>
            <span>•</span>
            <span className="text-slate-500">Versi Runtime: CP-SAT v9.8 + GA-v2.4</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Mesin Otomasi Timetable FTI Unand
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight mt-1">
            Generate Jadwal Kuliah & Engine Optimasi
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 max-w-4xl">
            Pipeline otomatis penjadwalan cerdas mengombinasikan Google OR-Tools CP-SAT untuk kelayakan constraint mutlak (hard constraint) dan Genetic Algorithm untuk optimasi preferensi dosen serta efisiensi spasial (soft constraint).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsGAConfigModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>Parameter GA</span>
          </button>
          <button
            disabled={isRunningSolver}
            onClick={handleRerunSolver}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 shadow-sm transition-colors disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${isRunningSolver ? 'animate-spin' : ''}`} />
            <span>{isRunningSolver ? 'Menjalankan Solver...' : 'Jalankan Ulang Solver'}</span>
          </button>
        </div>
      </div>

      {/* 7-Stage Pipeline Stepper */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Alur Eksekusi Solver Terpadu
            </h3>
            <p className="text-xs text-slate-500">
              Tahap 6 dari 7 Aktif • Komputasi Selesai (Optimal Pareto)
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md">
            ID BATCH: #SCH-2024-GANJIL-B92
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {/* Step 1 */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/70 border border-blue-200">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
              ✓
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-800 truncate">1. Semester</div>
              <div className="text-[10px] text-blue-600 font-semibold truncate">Ganjil 24/25</div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/70 border border-blue-200">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
              ✓
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-800 truncate">2. Departemen</div>
              <div className="text-[10px] text-blue-600 font-semibold truncate">SI, IF, TK</div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/70 border border-blue-200">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
              ✓
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-800 truncate">3. Agregasi Data</div>
              <div className="text-[10px] text-blue-600 font-semibold truncate">318 Kelas</div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/70 border border-blue-200">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
              ✓
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-800 truncate">4. Constraint Awal</div>
              <div className="text-[10px] text-emerald-600 font-semibold truncate">4/4 Valid</div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/70 border border-blue-200">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
              ✓
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-800 truncate">5. Solver CP-SAT</div>
              <div className="text-[10px] text-emerald-600 font-semibold truncate">Feasible 100%</div>
            </div>
          </div>

          {/* Step 6 */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-600 text-white shadow-xs">
            <div className="w-6 h-6 rounded-full bg-white text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
              6
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold truncate">6. Optimasi GA</div>
              <div className="text-[10px] text-blue-100 truncate">Generasi 250</div>
            </div>
          </div>

          {/* Step 7 */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-500">
            <div className="w-6 h-6 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
              7
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold truncate">7. Review Wadek I</div>
              <div className="text-[10px] text-slate-400 truncate">Menunggu Submit</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Total Beban Kelas
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-800">318 Kelas</div>
          <p className="text-xs text-slate-500 mt-1">SI: 114 | IF: 128 | TK: 76</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Ketersediaan Dosen
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-700">84 Pengampu</div>
          <p className="text-xs text-slate-500 mt-1">Preferensi Waktu Terpetakan</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Inventaris Ruang FTI
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-700">28 Ruangan</div>
          <p className="text-xs text-slate-500 mt-1">19 Teori + 9 Lab Komputer</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Durasi Komputasi Total
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">7.34s</div>
          <p className="text-xs text-slate-500 mt-1">CP-SAT: 4.82s | GA: 2.52s</p>
        </div>
      </div>

      {/* Middle Two-Column Section: CP-SAT vs GA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: CP-SAT Solver Status & Log */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Status Solver CP-SAT
                  </h3>
                  <p className="text-xs text-slate-500">
                    Constraint Programming & SAT Feasibility Engine
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  FEASIBLE 100%
                </span>
                <span className="block text-[10px] text-slate-400 mt-0.5">Google OR-Tools</span>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-3 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Waktu Eksekusi</span>
                <span className="font-bold text-slate-800">4.82 detik</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Hard Constraint</span>
                <span className="font-bold text-emerald-600">4 / 4 Lolos</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Status Branching</span>
                <span className="font-bold text-blue-700">Optimal</span>
              </div>
            </div>

            {/* Verifikasi Hard Constraints */}
            <div className="mt-4 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Verifikasi Hard Constraints (Kewajiban Mutlak)
              </span>

              {/* Constraint 1 */}
              <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-800">Bebas Bentrok Dosen</div>
                  <div className="text-[11px] text-slate-500">
                    Tidak ada satu dosen mengajar 2 kelas di slot waktu yang sama.
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-emerald-600 text-xs">100% PASSED</span>
                  <span className="block text-[10px] text-slate-400">318/318 Kelas</span>
                </div>
              </div>

              {/* Constraint 2 */}
              <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-800">Bebas Bentrok Rombel Mahasiswa</div>
                  <div className="text-[11px] text-slate-500">
                    Satu angkatan/paket semester tidak memiliki jadwal mata kuliah tumpang tindih.
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-emerald-600 text-xs">100% PASSED</span>
                  <span className="block text-[10px] text-slate-400">Semua Angkatan Ok</span>
                </div>
              </div>

              {/* Constraint 3 */}
              <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-800">Kapasitas Ruang &gt;= Mahasiswa</div>
                  <div className="text-[11px] text-slate-500">
                    Tidak ada over-capacity kelas melebihi kursi fisik ruangan kuliah.
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-emerald-600 text-xs">100% PASSED</span>
                  <span className="block text-[10px] text-slate-400">Delta Min: +4 Kursi</span>
                </div>
              </div>

              {/* Constraint 4 */}
              <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-800">Window Waktu Kuliah (07:30 - 18:00)</div>
                  <div className="text-[11px] text-slate-500">
                    Sesuai ketentuan akademik FTI Unand &amp; jeda waktu ibadah Jumat.
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-emerald-600 text-xs">100% PASSED</span>
                  <span className="block text-[10px] text-slate-400">Zero Violation</span>
                </div>
              </div>
            </div>
          </div>

          {/* Terminal Box: CP-SAT Log */}
          <div className="bg-slate-900 rounded-lg p-3 text-slate-200 font-mono text-[11px] border border-slate-800 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2 text-slate-400 text-[10px]">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3 h-3 text-emerald-400" />
                OR-TOOLS CP-SAT SOLVER LOG
              </span>
              <span>WALLTIME: 4.821s</span>
            </div>
            <div className="space-y-1 text-slate-300">
              <p>Parameters: max_time_in_seconds: 30.0, num_search_workers: 8</p>
              <p># Model build: Variables = 15,264 | Boolean constraints = 28,490</p>
              <p># Initial search space solved in 1,240 branches.</p>
              <p className="text-emerald-400 font-semibold">
                &gt;&gt;&gt; Solution 0 FOUND: Feasible solution with 0 Hard Violations.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: GA Optimization & Soft Constraints */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Dna className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Hasil Optimasi Genetic Algorithm (GA)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Minimasi Nilai Penalti Soft Constraint &amp; Preferensi Dosen
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md">
                  <TrendingDown className="w-3.5 h-3.5 text-indigo-600" />
                  PENALTI TURUN 77.2%
                </span>
                <span className="block text-[10px] text-slate-400 mt-0.5">Metaheuristik</span>
              </div>
            </div>

            {/* GA Parameters Summary */}
            <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-3 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Populasi</span>
                <span className="font-bold text-slate-800">{gaParams.populationSize}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Crossover</span>
                <span className="font-bold text-slate-800">{gaParams.crossoverRate}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Mutasi</span>
                <span className="font-bold text-slate-800">{gaParams.mutationRate}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Generasi</span>
                <span className="font-bold text-indigo-700">
                  {gaParams.maxGenerations} / {gaParams.maxGenerations}
                </span>
              </div>
            </div>

            {/* SVG Convergence Curve */}
            <div className="mt-4 bg-slate-50 border border-slate-200/80 rounded-lg p-3">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-700">
                  Kurva Konvergensi Skor Penalti (Generasi vs Fitness Penalty)
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  Awal CP-SAT: <span className="text-red-500 font-bold">184</span> → Akhir GA:{' '}
                  <span className="text-emerald-600 font-bold">42 Score</span>
                </span>
              </div>

              {/* Curve visualization */}
              <div className="h-28 w-full relative flex items-end">
                <svg viewBox="0 0 400 100" className="w-full h-full overflow-visible">
                  {/* Grid lines */}
                  <line x1="0" y1="20" x2="400" y2="20" stroke="#e2e8f0" strokeDasharray="3,3" />
                  <line x1="0" y1="50" x2="400" y2="50" stroke="#e2e8f0" strokeDasharray="3,3" />
                  <line x1="0" y1="80" x2="400" y2="80" stroke="#e2e8f0" strokeDasharray="3,3" />

                  {/* Gradient fill */}
                  <defs>
                    <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Shaded Area */}
                  <path
                    d="M 10 20 Q 80 55, 160 68 T 320 82 L 390 84 L 390 95 L 10 95 Z"
                    fill="url(#curveGradient)"
                  />

                  {/* Convergence line */}
                  <path
                    d="M 10 20 Q 80 55, 160 68 T 320 82 L 390 84"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Key Points */}
                  <circle cx="10" cy="20" r="4" fill="#ef4444" />
                  <circle cx="390" cy="84" r="4" fill="#10b981" />
                </svg>
              </div>

              <div className="flex justify-between text-[10px] text-slate-400 mt-1 border-t border-slate-200/60 pt-1 font-mono">
                <span>Gen 0 (Inisialisasi)</span>
                <span>Gen 50</span>
                <span>Gen 125</span>
                <span>Gen 190</span>
                <span>Gen 250 (Konvergen)</span>
              </div>
            </div>

            {/* Soft Constraints Fulfillment */}
            <div className="mt-4 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Pencapaian Soft Constraints (Kualitas Jadwal)
              </span>

              {/* Metric 1 */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">
                    👍 Preferensi Hari &amp; Jam Dosen
                  </span>
                  <span className="font-bold text-blue-700">94.6%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: '94.6%' }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>80 dari 84 Dosen mendapat jadwal ideal</span>
                  <span>Hanya 4 deviasi minor</span>
                </div>
              </div>

              {/* Metric 2 */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">
                    ⚖ Distribusi Beban Mengajar Merata
                  </span>
                  <span className="font-bold text-blue-700">91.2%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: '91.2%' }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>Maksimal 6 SKS/hari per dosen</span>
                  <span>Tidak ada hari kosong terjepit</span>
                </div>
              </div>

              {/* Metric 3 */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">
                    🏢 Kedekatan Ruang Kuliah Berurutan
                  </span>
                  <span className="font-bold text-blue-700">88.5%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-600 h-full rounded-full" style={{ width: '88.5%' }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>Minimasi perpindahan gedung FTI Limau Manih</span>
                  <span>Lantai berdekatan</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Department Breakdown Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-700" />
            <h3 className="text-base font-bold text-slate-800">
              Rincian Hasil Alokasi Tiap Departemen FTI
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Semua kelas telah ditempatkan secara tuntas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* SI */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-slate-800">Sistem Informasi (SI)</span>
              <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                114 Kelas
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              36 Mata Kuliah • 28 Dosen • Ruang Teori R.101-R.108 &amp; Lab ERP
            </p>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
              <span className="text-slate-500">Tingkat Utilisasi:</span>
              <span className="font-bold text-emerald-600">92.4% Optimal</span>
            </div>
          </div>

          {/* IF */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-slate-800">Informatika (IF)</span>
              <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                128 Kelas
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              42 Mata Kuliah • 34 Dosen • Ruang R.201-R.209 &amp; Lab AI/Software
            </p>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
              <span className="text-slate-500">Tingkat Utilisasi:</span>
              <span className="font-bold text-emerald-600">94.8% Optimal</span>
            </div>
          </div>

          {/* TK */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-slate-800">Teknik Komputer (TK)</span>
              <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                76 Kelas
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              24 Mata Kuliah • 22 Dosen • Ruang R.301-R.305 &amp; Lab Robotika/IoT
            </p>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
              <span className="text-slate-500">Tingkat Utilisasi:</span>
              <span className="font-bold text-emerald-600">89.1% Optimal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Action Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">
              Draft Siap Dikirim ke Pimpinan
            </h4>
            <p className="text-xs text-slate-500">
              Semua constraint matematis terpenuhi tanpa konflik jadwal pengajar.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleDownloadLog}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Unduh Log Eksekusi (.JSON)</span>
          </button>

          <button
            onClick={() => setActivePage('jadwal_kuliah')}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>Lihat Jadwal Lengkap Matrix</span>
          </button>

          <button
            onClick={handleSubmitToWadek}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 shadow-sm shadow-blue-700/20 transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>Ajukan Jadwal ke Wakil Dekan I (Kirim Approval)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

