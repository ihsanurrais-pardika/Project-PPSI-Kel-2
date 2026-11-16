import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Wand2,
  Clock,
  Users,
  Check,
  ArrowRight,
  Info,
  Building2,
  List,
  Layers,
  Calendar,
  X,
  MapPin,
  Zap,
  BookOpen,
  FileText,
  Download,
  ChevronRight,
  Activity,
  BarChart3,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
type TabKey = 'all' | 'hard' | 'capacity' | 'time_pref';

interface ConflictCardData {
  id: string;
  category: TabKey;
  categoryLabel: string;
  categoryColor: string;
  severity: 'hard' | 'soft' | 'info';
  icon: React.ReactNode;
  title: string;
  courseCode: string;
  courseName: string;
  classLabel: string;
  lecturer: string;
  room: string;
  day: string;
  time: string;
  details: string;
  recommendation: string;
  primaryAction: string;
  secondaryAction: string;
  isResolved: boolean;
}

// ─── Mock conflict data matching screenshot ──────────────────────────────────
const conflictCards: ConflictCardData[] = [
  {
    id: 'cf-01',
    category: 'capacity',
    categoryLabel: 'Kapasitas Ruang',
    categoryColor: 'orange',
    severity: 'soft',
    icon: <Building2 className="w-4 h-4" />,
    title: 'IF-202 Rekayasa Perangkat Lunak (Kelas A – 48 Mahasiswa)',
    courseCode: 'IF-202',
    courseName: 'Rekayasa Perangkat Lunak',
    classLabel: 'Kelas A',
    lecturer: 'Dr. Ir. Wahyudi, S.T., M.T.',
    room: 'G-203 (Kapasitas 50 Kursi)',
    day: 'Senin',
    time: '09:20 – 11:00 WIB',
    details:
      'Estimasi Mahasiswa Mendekati Kapasitas Maksimal. Ruang Dialokasikan: G-203 (Kapasitas 50). Mahasiswa: 48. Tersisa buffer 2 kursi. Disarankan memindahkan ke G-101/80 Kursi jika ada lonjakan KRS mahasiswa semester pendek/atas.',
    recommendation:
      'Tukar Ruang Alternatif',
    primaryAction: 'Tukar Ruang Alternatif',
    secondaryAction: 'Abaikan (Tetap Gunakan)',
    isResolved: false,
  },
  {
    id: 'cf-02',
    category: 'time_pref',
    categoryLabel: 'Preferensi Jadwal',
    categoryColor: 'blue',
    severity: 'soft',
    icon: <Clock className="w-4 h-4" />,
    title: 'TK-101 Rangkaian Logika Digital (Kelas B)',
    courseCode: 'TK-101',
    courseName: 'Rangkaian Logika Digital',
    classLabel: 'Kelas B',
    lecturer: 'Darwison, M.T.',
    room: 'Ruang H-102',
    day: 'Kamis',
    time: '08:00 WIB',
    details:
      'Deviasi Minor Preferensi Hari Mengajar: Dosen mengajukan preferensi hari Rabu pagi, namun dialokasikan pada Kamis 08:00 WIB agar tidak bentrok dengan slot penggunaan laboratorium perangkat keras.',
    recommendation: 'Toleransi Soft Constraint Diterima',
    primaryAction: 'Lihat Slot Rabu Tersedia',
    secondaryAction: 'Terima Alokasi',
    isResolved: true,
  },
  {
    id: 'cf-03',
    category: 'time_pref',
    categoryLabel: 'Jarak / Interval',
    categoryColor: 'purple',
    severity: 'soft',
    icon: <MapPin className="w-4 h-4" />,
    title: 'Dr. Eng. Rahmad, M.T. — Sistem Basis Data',
    courseCode: 'SI-211',
    courseName: 'Sistem Basis Data',
    classLabel: 'Kelas A',
    lecturer: 'Dr. Eng. Rahmad, M.T.',
    room: 'G-203 ke Gedung B Lt. 2',
    day: 'Senin',
    time: 'Jeda < 30 menit',
    details:
      'Jeda Mengajar Singkat (< 30 menit): Terdeteksi jeda transit 15 menit antara sesi Basis Data di ruang G-203 ke sesi lanjutan di Gedung B Lt. 2. Estimasi waktu jalan antar gedung 7 menit, menyisakan margin istirahat yang sangat minim untuk persiapan mengajar.',
    recommendation: 'Sesuaikan Ruang Terdekat',
    primaryAction: 'Sesuaikan Ruang Terdekat',
    secondaryAction: 'Pertahankan',
    isResolved: false,
  },
];

// ─── Room utilization data ───────────────────────────────────────────────────
const roomUtilData = [
  { name: 'Ruang G-101 (Auditorium Mini)', pct: 78, capacity: 60, color: 'emerald' },
  { name: 'Ruang G-203 (Lab Teori)', pct: 96, capacity: 50, color: 'rose' },
  { name: 'Ruang G-204 (Multimedia)', pct: 64, capacity: 45, color: 'blue' },
];

// ─── Document readiness ──────────────────────────────────────────────────────
const docReadiness = [
  { label: 'Validasi Kurikulum OBE', status: 'LULUS', color: 'emerald' },
  { label: 'Batas SKS Dosen Maks', status: 'SESUAI', color: 'emerald' },
  { label: 'Ketersediaan Ruang Ujian', status: 'TERLAKSANA', color: 'blue' },
];

// ─── Helper: color tokens ────────────────────────────────────────────────────
const categoryColors: Record<string, { badge: string; border: string; iconBg: string; iconText: string }> = {
  orange: {
    badge: 'bg-orange-100 text-orange-700',
    border: 'border-orange-200',
    iconBg: 'bg-orange-100',
    iconText: 'text-orange-600',
  },
  blue: {
    badge: 'bg-blue-100 text-blue-700',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
  },
  purple: {
    badge: 'bg-purple-100 text-purple-700',
    border: 'border-purple-200',
    iconBg: 'bg-purple-100',
    iconText: 'text-purple-600',
  },
  rose: {
    badge: 'bg-rose-100 text-rose-700',
    border: 'border-rose-200',
    iconBg: 'bg-rose-100',
    iconText: 'text-rose-600',
  },
};

const utilColors: Record<string, string> = {
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
  blue: 'bg-blue-500',
};

const utilTextColors: Record<string, string> = {
  emerald: 'text-emerald-700',
  rose: 'text-rose-700',
  blue: 'text-blue-700',
};

const docBadgeColors: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-700',
  blue: 'bg-blue-100 text-blue-700',
};

// ─── Component ───────────────────────────────────────────────────────────────
export const ValidasiKonflikPage: React.FC = () => {
  const { showToast } = useApp();

  const [cards, setCards] = useState<ConflictCardData[]>(conflictCards);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [solverRunning, setSolverRunning] = useState(false);

  const unresolved = cards.filter((c) => !c.isResolved);
  const resolved = cards.filter((c) => c.isResolved);

  // hard constraint: 100% bebas bentrok (none in mock)
  const hardConflicts = cards.filter((c) => c.category === 'hard');
  const softWarnings = cards.filter((c) => c.category !== 'hard' && !c.isResolved);

  const handleResolve = (id: string, action: string) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, isResolved: true } : c)));
    showToast(`Rekomendasi "${action}" berhasil diterapkan oleh Solver.`, 'success');
  };

  const handleIgnore = (id: string) => {
    showToast('Peringatan diabaikan sementara. Harap tinjau sebelum SK diterbitkan.', 'warning');
  };

  const handleAutoFix = () => {
    setSolverRunning(true);
    setTimeout(() => {
      setCards((prev) => prev.map((c) => ({ ...c, isResolved: true })));
      setSolverRunning(false);
      showToast('Auto-Fix Solver Selesai: Seluruh peringatan & konflik jadwal telah teratasi!', 'success');
    }, 1800);
  };

  const handleRerunSolver = () => {
    setSolverRunning(true);
    setTimeout(() => {
      setSolverRunning(false);
      showToast('Validasi Ulang Selesai: 318 Rombel × 4 Hard Constraints telah dievaluasi.', 'info');
    }, 1500);
  };

  const filteredCards = (() => {
    if (activeTab === 'all') return cards;
    if (activeTab === 'hard') return cards.filter((c) => c.category === 'hard');
    if (activeTab === 'capacity') return cards.filter((c) => c.category === 'capacity');
    if (activeTab === 'time_pref') return cards.filter((c) => c.category === 'time_pref');
    return cards;
  })();

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'all', label: 'Semua Catatan', count: cards.length },
    { key: 'hard', label: 'Bentrok Dosen', count: hardConflicts.length },
    { key: 'capacity', label: 'Kapasitas Ruang', count: cards.filter((c) => c.category === 'capacity').length },
    { key: 'time_pref', label: 'Preferensi Waktu', count: cards.filter((c) => c.category === 'time_pref').length },
  ];

  return (
    <div className="space-y-6">

      {/* ── Breadcrumb ────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
        <span>Beranda</span>
        <ChevronRight className="w-3 h-3" />
        <span>Penjadwalan Terpadu</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-700 font-semibold">Validasi &amp; Resolusi Konflik</span>
      </nav>

      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-1">
          {/* Solver badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[11px] font-bold text-blue-700">
            <Zap className="w-3 h-3" />
            Grei Solver #2024-B
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Validasi &amp; Resolusi Konflik Jadwal
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
            Pemeriksaan kepatuhan hard constraints (tanpa bentrok) dan penanganan soft constraints sebelum pengajuan ke pimpinan.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRerunSolver}
            disabled={solverRunning}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${solverRunning ? 'animate-spin text-blue-500' : 'text-slate-500'}`} />
            Jalankan Ulang Solver
          </button>
          <button
            onClick={handleAutoFix}
            disabled={unresolved.length === 0 || solverRunning}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 shadow-sm transition-colors disabled:opacity-50"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Sahkan Draf Bebas Konflik
          </button>
        </div>
      </div>

      {/* ── 4 Metric Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hard Constraints */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Hard Constraints</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600">100%</div>
          <div className="text-xs font-bold text-emerald-700">Bebas Bentrok</div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <Check className="w-3 h-3 text-emerald-500" />
            0 Konflik Mutlak
          </div>
        </div>

        {/* Soft Constraints */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Soft Constraints</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="text-3xl font-black text-blue-700">92.4%</div>
          <div className="text-xs font-bold text-blue-700">Kepatuhan</div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <BarChart3 className="w-3 h-3 text-blue-400" />
            Skor Penalti: –18.2
          </div>
        </div>

        {/* Peringatan Ringan */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Peringatan Ringan</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-600">{unresolved.length}</div>
          <div className="text-xs font-bold text-amber-700">Perhatian</div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <Info className="w-3 h-3 text-amber-400" />
            Dapat Diluluskan
          </div>
        </div>

        {/* Total Rombel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Rombel Kelas</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
              <List className="w-4 h-4 text-slate-600" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800">318 / 318</div>
          <div className="text-xs font-bold text-slate-700">Total Rombel Kelas</div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <Check className="w-3 h-3 text-emerald-500" />
            100% Terpetakan
          </div>
        </div>
      </div>

      {/* ── Recommendation Banner ────────────────────────────────── */}
      {unresolved.length > 0 && (
        <div className="rounded-xl bg-gradient-to-r from-blue-900 to-indigo-900 p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Wand2 className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black text-white uppercase tracking-wider">Rekomendasi Penukaran Slot Otomatis oleh Engine</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-extrabold uppercase">Solusi Optimal</span>
              </div>
              <p className="text-xs text-blue-200 leading-relaxed max-w-2xl">
                Engine menyarankan rotasi 2 slot ruangan pada hari Kamis antara G-203 &amp; G-183. Tindakan ini secara matematis mengeliminasi kapasitas ruang IF-202 dan melanggarak jeda mengajar Dr. Eng. Rahmad tanpa menimbulkan bentrok baru.
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-[11px] text-blue-300">
                <span>↑ Efisiensi Ruang: +6.8%</span>
                <span>• Penuranan Beban Jalan Kaki: -350m</span>
                <span>• Tingkat Risiko Sampingan: 0.0%</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleAutoFix}
            disabled={solverRunning}
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-lg shadow transition-colors disabled:opacity-60"
          >
            {solverRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            Terapkan Rekomendasi Solver (Auto-Fix)
          </button>
        </div>
      )}

      {/* ── Tabs + Conflict List + Side Panel ────────────────────── */}
      <div className="flex flex-col xl:flex-row gap-5">
        {/* Left: Conflict list */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Tab bar */}
          <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 pb-3">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
            <span className="ml-auto text-[11px] text-slate-400 font-medium">
              Menampilkan {filteredCards.length} isu non-kritis &nbsp;•&nbsp; Semester Ganjil 2024/2025
            </span>
          </div>

          {/* Cards */}
          {filteredCards.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-14 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Tidak Ada Konflik pada Kategori Ini</h3>
              <p className="text-xs text-slate-500 mt-1">
                Seluruh jadwal mata kuliah telah mematuhi aturan akademik dan bebas tumpang tindih.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCards.map((card) => {
                const col = categoryColors[card.categoryColor] ?? categoryColors['blue'];
                const isResolved = card.isResolved;
                return (
                  <div
                    key={card.id}
                    className={`bg-white rounded-xl border shadow-sm transition-all ${
                      isResolved
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : col.border
                    }`}
                  >
                    <div className="p-5 space-y-4">
                      {/* Header */}
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`w-9 h-9 rounded-xl ${col.iconBg} ${col.iconText} flex items-center justify-center shrink-0 mt-0.5`}>
                            {card.icon}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1.5">
                            {/* Badges row */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${col.badge}`}>
                                {card.categoryLabel}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {card.courseCode}
                              </span>
                              {isResolved ? (
                                <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Toleransi Soft Constraint Diterima
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                  Perlu Ditinjau
                                </span>
                              )}
                            </div>

                            <h3 className="text-sm font-bold text-slate-800 leading-snug">{card.title}</h3>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" /> Dosen: <strong>{card.lecturer}</strong>
                              </span>
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" /> {card.room}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {card.day}, {card.time}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-row md:flex-col gap-2 shrink-0">
                          {isResolved ? (
                            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 py-1">
                              <CheckCircle2 className="w-4 h-4" /> Telah Diintervensi
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleResolve(card.id, card.primaryAction)}
                                className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5"
                              >
                                <Check className="w-3.5 h-3.5" />
                                {card.primaryAction}
                              </button>
                              <button
                                onClick={() => handleIgnore(card.id)}
                                className="px-3.5 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium rounded-lg transition-colors text-center"
                              >
                                {card.secondaryAction}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Detail box */}
                      <div className="bg-slate-50 rounded-lg border border-slate-100 p-3.5 flex items-start gap-2.5 text-xs">
                        <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-700 block mb-0.5">Detail Anomali:</span>
                          <span className="text-slate-600 leading-relaxed">{card.details}</span>
                        </div>
                      </div>

                      {/* Recommendation footer */}
                      <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg ${
                        isResolved ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                        Rekomendasi Solver: {card.recommendation}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Side panels */}
        <div className="xl:w-72 space-y-4 shrink-0">
          {/* Room utilization */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Sebaran Utilisasi Ruang FTI Terkait
              </h3>
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                Gedung Jurusan Sistem Informasi &amp; TI
              </span>
            </div>

            <div className="space-y-3">
              {roomUtilData.map((room) => (
                <div key={room.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-semibold truncate max-w-[70%]">{room.name}</span>
                    <span className="text-slate-500 font-medium shrink-0">Kapasitas {room.capacity}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${utilColors[room.color]} transition-all`}
                        style={{ width: `${room.pct}%` }}
                      />
                    </div>
                    <span className={`text-xs font-black shrink-0 ${utilTextColors[room.color]}`}>
                      {room.pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-100 pt-2">
              Batas keamanan kapasitas gedung terpelihara sesuai protokol K3 UNAND.{' '}
              <button
                onClick={() => showToast('Membuka Heatmap Utilisasi Ruang FTI…', 'info')}
                className="text-blue-600 hover:underline font-semibold"
              >
                Lihat Heatmap Menyeluruh →
              </button>
            </p>
          </div>

          {/* Document readiness */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Kesiapan Dokumen</h3>
            </div>

            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-xs font-bold text-emerald-800">🏁 Siap Menuju Wadek I</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                3 departemen (SI, IF, TK) telah mengirimkan konfirmasi usulan final.
              </p>
            </div>

            <div className="space-y-2">
              {docReadiness.map((doc) => (
                <div key={doc.label} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">{doc.label}</span>
                  <span className={`font-black px-2 py-0.5 rounded text-[10px] uppercase ${docBadgeColors[doc.color]}`}>
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => showToast('Mengunduh Berita Acara Validasi (PDF)…', 'info')}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh Berita Acara Validasi (PDF)
            </button>
          </div>

          {/* Summary stats */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-slate-400" />
              Ringkasan Status
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Total Konflik Aktif</span>
                <span className={`font-black ${unresolved.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {unresolved.length} Peringatan
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Telah Diselesaikan</span>
                <span className="font-black text-emerald-600">{resolved.length} Isu</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Rombel Feasible</span>
                <span className="font-black text-blue-700">318 / 318</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-500">Status Mitigasi</span>
                <span className={`font-black ${unresolved.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {unresolved.length > 0 ? 'Perlu Intervensi' : '✓ Semua Beres'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── All-Clear Banner ─────────────────────────────────────── */}
      {unresolved.length === 0 && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black">🎉 Jadwal 100% Bebas Konflik!</h3>
              <p className="text-xs text-emerald-100 mt-0.5">
                Seluruh 318 rombel telah divalidasi dan siap untuk persetujuan Wakil Dekan I.
              </p>
            </div>
          </div>
          <button
            onClick={() => showToast('Meneruskan draf jadwal ke Wakil Dekan I untuk persetujuan…', 'success')}
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-700 font-bold text-xs rounded-lg hover:bg-emerald-50 transition-colors shadow"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Kirim ke Approval Wadek I
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
