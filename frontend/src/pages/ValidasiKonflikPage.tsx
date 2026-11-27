import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Users,
  Wand2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ValidationIssueDTO, ValidationSuggestion } from '../services/api';
import {
  DepartmentCode,
  getDepartmentBadgeStyle,
  resolveDepartment,
} from '../utils/departmentHelper';

type FilterTab = 'unresolved' | 'hard' | 'soft' | 'resolved';
type DeptScope = DepartmentCode | 'ALL';

const PAGE_SIZE = 8;

const DEPT_TABS: Array<{ key: DeptScope; label: string; shortLabel: string }> = [
  { key: 'SI', label: 'Sistem Informasi', shortLabel: 'SI' },
  { key: 'IF', label: 'Informatika', shortLabel: 'IF' },
  { key: 'TK', label: 'Teknik Komputer', shortLabel: 'TK' },
  { key: 'ALL', label: 'Semua FTI', shortLabel: 'Semua FTI' },
];

function getIssueDepartments(issue: ValidationIssueDTO): DepartmentCode[] {
  const depts: DepartmentCode[] = [];
  if (issue.item_1) {
    depts.push(resolveDepartment(issue.item_1.department, issue.item_1.course_code));
  }
  if (issue.item_2) {
    const d2 = resolveDepartment(issue.item_2.department, issue.item_2.course_code);
    if (!depts.includes(d2)) {
      depts.push(d2);
    }
  }
  return depts.length > 0 ? depts : ['SI'];
}

export const ValidasiKonflikPage: React.FC = () => {
  const {
    currentRole,
    backendStatus,
    validationReport,
    isValidationLoading,
    fetchValidationReport,
    resolveValidationIssueById,
    runAutoFixValidation,
    applyValidationSuggestion,
    submitScheduleToWadek,
    setActivePage,
    setPendingManualEditScheduleId,
    scheduleApprovalStatus,
    latestCPSATResult,
    schedule,
    showToast,
  } = useApp();

  const [deptFilter, setDeptFilter] = useState<DeptScope>('SI');
  const [activeTab, setActiveTab] = useState<FilterTab>('unresolved');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleLimit, setVisibleLimit] = useState<number>(PAGE_SIZE);
  const [busyIssueKey, setBusyIssueKey] = useState<string | null>(null);
  const [submittingWadek, setSubmittingWadek] = useState(false);
  const hasAutoSelectedDept = useRef(false);

  // Muat hasil validasi nyata dari database saat halaman dibuka
  useEffect(() => {
    if (backendStatus === 'connected' && !validationReport) {
      void fetchValidationReport(false);
    }
  }, [backendStatus]);

  const issues: ValidationIssueDTO[] = validationReport?.issues ?? [];

  // Hitung jumlah bentrok aktif per jurusan (bentrok lintas prodi muncul di kedua tab terkait)
  const deptUnresolvedCounts = useMemo(() => {
    const map: Record<DeptScope, number> = { SI: 0, IF: 0, TK: 0, ALL: 0 };
    for (const iss of issues) {
      if (iss.is_resolved) continue;
      map.ALL += 1;
      for (const d of getIssueDepartments(iss)) {
        map[d] += 1;
      }
    }
    return map;
  }, [issues]);

  // Saat pertama kali report masuk, arahkan ke jurusan pertama yang masih punya catatan aktif
  useEffect(() => {
    if (!validationReport || hasAutoSelectedDept.current) return;
    hasAutoSelectedDept.current = true;
    const firstNeedsWork = (['SI', 'IF', 'TK'] as DepartmentCode[]).find(
      (d) => deptUnresolvedCounts[d] > 0
    );
    if (firstNeedsWork) {
      setDeptFilter(firstNeedsWork);
    }
  }, [validationReport, deptUnresolvedCounts]);

  // Reset jumlah kartu tampil setiap filter berubah agar tampilan tetap ringan
  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
  }, [deptFilter, activeTab, searchQuery]);

  // Ringkasan menyeluruh FTI (dari DB)
  const globalCounts = useMemo(() => {
    const unresolved = issues.filter((i) => !i.is_resolved);
    return {
      unresolved: unresolved.length,
      hard: unresolved.filter((i) => i.severity === 'hard').length,
      soft: unresolved.filter((i) => i.severity === 'soft').length,
      resolved: issues.filter((i) => i.is_resolved).length,
    };
  }, [issues]);

  const summary = validationReport?.summary ?? {
    total_active_classes: latestCPSATResult?.total_classes || schedule.length,
    scheduled_classes: latestCPSATResult?.scheduled_classes || schedule.length,
    unassigned_count: 0,
    hard_conflicts_count: globalCounts.hard,
    soft_warnings_count: globalCounts.soft,
    unresolved_total: globalCounts.unresolved,
    resolved_count: globalCounts.resolved,
    total_penalty: latestCPSATResult?.penalty_breakdown?.total_weighted_penalty || 0,
    compliance_pct: 100,
  };

  // Issue sesuai jurusan yang sedang dibuka
  const deptScopedIssues = useMemo(() => {
    if (deptFilter === 'ALL') return issues;
    return issues.filter((iss) => getIssueDepartments(iss).includes(deptFilter));
  }, [issues, deptFilter]);

  // Hitungan status khusus jurusan yang sedang aktif
  const scopedCounts = useMemo(() => {
    const unresolved = deptScopedIssues.filter((i) => !i.is_resolved);
    return {
      unresolved: unresolved.length,
      hard: unresolved.filter((i) => i.severity === 'hard').length,
      soft: unresolved.filter((i) => i.severity === 'soft').length,
      resolved: deptScopedIssues.filter((i) => i.is_resolved).length,
    };
  }, [deptScopedIssues]);

  const filteredIssues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return deptScopedIssues.filter((iss) => {
      if (activeTab === 'unresolved' && iss.is_resolved) return false;
      if (activeTab === 'hard' && (iss.is_resolved || iss.severity !== 'hard')) return false;
      if (activeTab === 'soft' && (iss.is_resolved || iss.severity !== 'soft')) return false;
      if (activeTab === 'resolved' && !iss.is_resolved) return false;

      if (!q) return true;
      const hay = [
        iss.title,
        iss.description,
        iss.type_label,
        iss.item_1?.course_name,
        iss.item_1?.course_code,
        iss.item_1?.room_name,
        ...(iss.item_1?.lecturer_names || []),
        iss.item_2?.course_name,
        iss.item_2?.course_code,
        iss.item_2?.room_name,
        ...(iss.item_2?.lecturer_names || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [deptScopedIssues, activeTab, searchQuery]);

  const visibleIssues = useMemo(
    () => filteredIssues.slice(0, visibleLimit),
    [filteredIssues, visibleLimit]
  );

  const nextPendingDept = useMemo(() => {
    return DEPT_TABS.find(
      (t) => t.key !== 'ALL' && t.key !== deptFilter && deptUnresolvedCounts[t.key] > 0
    );
  }, [deptFilter, deptUnresolvedCounts]);

  const handleApplySuggestion = async (issueId: string, sug: ValidationSuggestion) => {
    if (busyIssueKey) return;
    setBusyIssueKey(issueId);
    try {
      await applyValidationSuggestion(sug);
    } finally {
      setBusyIssueKey(null);
    }
  };

  const handleAcceptSoft = async (issue: ValidationIssueDTO) => {
    if (busyIssueKey) return;
    setBusyIssueKey(issue.id);
    try {
      await resolveValidationIssueById(issue.conflict_id, 'TOLERANSI_DITERIMA');
    } finally {
      setBusyIssueKey(null);
    }
  };

  const handleOpenManualEdit = (jadwalId?: number, itemId?: number | string) => {
    const targetScheduleId = jadwalId ? `db-sch-${jadwalId}` : String(itemId || '');
    if (targetScheduleId) {
      setPendingManualEditScheduleId(targetScheduleId);
    }
    setActivePage('jadwal_kuliah');
  };

  const handleSendToWadek = async () => {
    if (summary.hard_conflicts_count > 0 || submittingWadek) return;
    setSubmittingWadek(true);
    try {
      const ok = await submitScheduleToWadek();
      if (ok) {
        setActivePage('approval_wadek');
      }
    } finally {
      setSubmittingWadek(false);
    }
  };

  const handleDownloadSummary = () => {
    const verText = validationReport?.version_number
      ? `Versi #${validationReport.version_number} (${validationReport.semester_label})`
      : 'Jadwal Aktif';
    const lines = [
      `BERITA ACARA VALIDASI JADWAL - SIPRAMA FTI UNAND`,
      `Jadwal       : ${verText}`,
      `Status       : ${validationReport?.approval_status || scheduleApprovalStatus}`,
      `Kelas        : ${summary.scheduled_classes} / ${summary.total_active_classes} terjadwal`,
      `Bentrok Wajib: ${summary.hard_conflicts_count}`,
      `Peringatan   : ${summary.soft_warnings_count}`,
      `Penalti      : ${summary.total_penalty}`,
      '',
      'DAFTAR CATATAN VALIDASI:',
      ...(issues.length === 0
        ? ['- Tidak ada bentrok atau peringatan ditemukan.']
        : issues.map(
            (it, idx) =>
              `${idx + 1}. [${it.status_bentrok}] ${it.type_label} - ${it.title}\n   ${it.description}`
          )),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `berita-acara-validasi-v${validationReport?.version_number || 1}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Ringkasan berita acara validasi berhasil diunduh.', 'success');
  };

  if (currentRole !== 'admin') {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
        <ShieldAlert className="w-8 h-8 text-rose-600 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Halaman Khusus Admin</h2>
        <p className="text-xs text-slate-500">
          Validasi dan penyelesaian bentrok jadwal hanya dapat diakses oleh Admin Fakultas.
        </p>
      </div>
    );
  }

  const versionTitle = validationReport?.version_number
    ? `Versi #${validationReport.version_number} · ${validationReport.semester_label}`
    : 'Belum ada jadwal di database';
  const hasHardConflicts = summary.hard_conflicts_count > 0;
  const isAlreadySentToWadek =
    scheduleApprovalStatus === 'Disetujui' || scheduleApprovalStatus === 'Resmi';
  const activeDeptMeta = DEPT_TABS.find((d) => d.key === deptFilter) || DEPT_TABS[0];

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-10">
      {/* Header Ringkas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500 mt-1">
            {versionTitle} · Pemeriksaan bentrok per jurusan sebelum diajukan ke Wakil Dekan I.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => void fetchValidationReport(true)}
            disabled={isValidationLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-60"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isValidationLoading ? 'animate-spin text-blue-700' : 'text-slate-500'}`}
            />
            <span>{isValidationLoading ? 'Memeriksa...' : 'Validasi Ulang'}</span>
          </button>

          <button
            type="button"
            onClick={handleSendToWadek}
            disabled={hasHardConflicts || submittingWadek || summary.scheduled_classes === 0}
            title={
              hasHardConflicts
                ? 'Selesaikan seluruh bentrok wajib FTI terlebih dahulu'
                : 'Ajukan jadwal bebas bentrok ke Wakil Dekan I'
            }
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#082c78] hover:bg-blue-900 rounded-xl shadow-xs transition-colors disabled:bg-slate-200 disabled:text-slate-600 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              {hasHardConflicts
                ? 'Selesaikan Bentrok FTI'
                : isAlreadySentToWadek
                  ? 'Lihat di Approval Wadek I'
                  : submittingWadek
                    ? 'Mengirim...'
                    : 'Kirim ke Wadek I'}
            </span>
          </button>
        </div>
      </div>

      {/* 3 Ringkasan Kesiapan FTI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className={`rounded-2xl border p-4 flex items-center justify-between gap-3 ${
            hasHardConflicts
              ? 'bg-rose-50/70 border-rose-200'
              : 'bg-emerald-50/70 border-emerald-200'
          }`}
        >
          <div>
            <div
              className={`text-xs font-bold ${
                hasHardConflicts ? 'text-rose-800' : 'text-emerald-800'
              }`}
            >
              Bentrok Wajib FTI (Harus 0)
            </div>
            <div
              className={`text-2xl font-black mt-0.5 tabular-nums ${
                hasHardConflicts ? 'text-rose-950' : 'text-emerald-950'
              }`}
            >
              {summary.hard_conflicts_count}
            </div>
            <div
              className={`text-[11px] mt-0.5 ${
                hasHardConflicts ? 'text-rose-700' : 'text-emerald-700'
              }`}
            >
              {hasHardConflicts
                ? 'Selesaikan sebelum kirim ke Wadek I'
                : 'Semua aturan mutlak FTI terpenuhi'}
            </div>
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              hasHardConflicts ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {hasHardConflicts ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-slate-600">Peringatan Ringan</div>
            <div className="text-2xl font-black text-amber-700 mt-0.5 tabular-nums">
              {summary.soft_warnings_count}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Kapasitas mepet atau jeda antar-gedung
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-600">Kelas Terjadwal</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5 tabular-nums">
              {summary.scheduled_classes} / {summary.total_active_classes}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
              <span className="tabular-nums">Penalti: {summary.total_penalty}</span>
              <span>·</span>
              <button
                type="button"
                onClick={handleDownloadSummary}
                className="inline-flex items-center gap-1 font-bold text-blue-700 hover:underline"
              >
                <Download className="w-3 h-3" />
                Berita Acara
              </button>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Bar Auto-Fix ringkas (muncul hanya jika ada bentrok wajib) */}
      {hasHardConflicts && (
        <div className="rounded-2xl bg-blue-50/80 border border-blue-200 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                Rapikan bentrok secara otomatis atau pilih per jurusan di bawah
              </h2>
              <p className="text-xs text-slate-600">
                Sistem dapat memindahkan kelas bentrok ke ruang dan sesi kosong terdekat di seluruh FTI.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void runAutoFixValidation()}
            disabled={isValidationLoading}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#082c78] hover:bg-blue-900 rounded-xl shadow-xs transition-colors disabled:opacity-60"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>{isValidationLoading ? 'Memperbaiki...' : 'Auto-Fix Bentrok'}</span>
          </button>
        </div>
      )}

      {/* Filter Terpusat: Row 1 Tab Jurusan, Row 2 Status & Pencarian */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            {DEPT_TABS.map((dept) => {
              const active = deptFilter === dept.key;
              const pendingCount = deptUnresolvedCounts[dept.key];
              return (
                <button
                  key={dept.key}
                  type="button"
                  onClick={() => setDeptFilter(dept.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors ${
                    active
                      ? 'bg-[#082c78] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{dept.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                      active
                        ? 'bg-white/20 text-white'
                        : pendingCount === 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-white text-slate-700'
                    }`}
                  >
                    {pendingCount}
                  </span>
                </button>
              );
            })}
          </div>

          <span className="text-[11px] text-slate-500">
            Menampilkan catatan untuk <strong className="text-slate-700">{activeDeptMeta.label}</strong>
          </span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: 'unresolved' as const, label: 'Perlu Ditangani', count: scopedCounts.unresolved },
              { key: 'hard' as const, label: 'Bentrok Wajib', count: scopedCounts.hard },
              { key: 'soft' as const, label: 'Ringan', count: scopedCounts.soft },
              { key: 'resolved' as const, label: 'Selesai', count: scopedCounts.resolved },
            ].map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors ${
                    active
                      ? 'bg-blue-700 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] tabular-nums ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari MK, ruang, atau dosen..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>
      </div>

      {/* Daftar Catatan Ringkas & Bertahap (8 per tampil) */}
      {filteredIssues.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-9 text-center space-y-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900">
            {activeTab === 'unresolved' && summary.unresolved_total === 0
              ? 'Seluruh bentrok FTI telah teratasi'
              : activeTab === 'unresolved' && deptFilter !== 'ALL' && scopedCounts.unresolved === 0
                ? `Catatan ${activeDeptMeta.label} sudah bersih`
                : 'Tidak ada catatan di filter ini'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {summary.hard_conflicts_count === 0
              ? 'Seluruh jadwal FTI sudah memenuhi aturan wajib dan siap diteruskan ke Wakil Dekan I.'
              : nextPendingDept
                ? `Masih ada ${deptUnresolvedCounts[nextPendingDept.key]} catatan aktif di jurusan ${nextPendingDept.label}.`
                : 'Silakan pilih tab status lain atau ubah kata kunci pencarian Anda.'}
          </p>
          <div className="pt-1 flex flex-wrap items-center justify-center gap-2.5">
            {nextPendingDept && activeTab === 'unresolved' && (
              <button
                type="button"
                onClick={() => setDeptFilter(nextPendingDept.key)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#082c78] hover:bg-blue-900 rounded-xl transition-colors"
              >
                <span>Lanjut ke {nextPendingDept.label} ({deptUnresolvedCounts[nextPendingDept.key]})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            {summary.hard_conflicts_count === 0 && (
              <button
                type="button"
                onClick={handleSendToWadek}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#082c78] hover:bg-blue-900 rounded-xl transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isAlreadySentToWadek ? 'Buka Approval Wadek I' : 'Kirim ke Approval Wadek I'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActivePage('jadwal_kuliah')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <span>Buka Jadwal Terpadu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleIssues.map((issue) => {
            const isHard = issue.severity === 'hard';
            const isBusy = busyIssueKey === issue.id;
            const depts = getIssueDepartments(issue);
            const deptLabel = depts.join(' ↔ ');
            return (
              <article
                key={issue.id}
                className={`bg-white rounded-2xl border p-4 space-y-3 transition-colors ${
                  issue.is_resolved
                    ? 'border-slate-200 bg-slate-50/40'
                    : isHard
                      ? 'border-rose-200'
                      : 'border-amber-200'
                }`}
              >
                {/* Baris Judul, Jurusan, & Status */}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        issue.is_resolved
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isHard
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {issue.type_label}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      {deptLabel}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {issue.is_resolved
                        ? issue.status_bentrok === 'TOLERANSI_DITERIMA'
                          ? 'Diterima sebagai toleransi'
                          : 'Sudah teratasi'
                        : isHard
                          ? 'Wajib diperbaiki'
                          : 'Peringatan ringan'}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900">{issue.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{issue.description}</p>
                </div>

                {/* Perbandingan Ringkas Kelas Terlibat */}
                {(issue.item_1 || issue.item_2) && (
                  <div
                    className={`rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 ${
                      issue.item_2
                        ? 'md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200'
                        : ''
                    }`}
                  >
                    {[issue.item_1, issue.item_2].map((item, idx) => {
                      if (!item) return null;
                      const itemDept = resolveDepartment(item.department, item.course_code);
                      const badgeStyle = getDepartmentBadgeStyle(itemDept);
                      return (
                        <div key={`${issue.id}-part-${idx}`} className="p-3 space-y-1 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 truncate">
                              {item.course_name} ({item.class_label})
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${badgeStyle.badge}`}
                            >
                              {itemDept}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 tabular-nums">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {item.day}, {item.start_time}–{item.end_time}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              {item.room_name} ({item.student_count}/{item.room_capacity} mhs)
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-400" />
                              {item.lecturer_names.join(', ')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tindak Lanjut Nyata */}
                {!issue.is_resolved && (
                  <div className="pt-0.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {issue.suggestions &&
                        issue.suggestions.slice(0, 2).map((sug, sIdx) => (
                          <button
                            key={`${issue.id}-sug-${sIdx}`}
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleApplySuggestion(issue.id, sug)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors disabled:opacity-50"
                          >
                            <Clock className="w-3 h-3 text-blue-700 shrink-0" />
                            <span className="tabular-nums">{sug.label}</span>
                          </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {issue.item_1 && (
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenManualEdit(
                              issue.item_2?.jadwal_id || issue.item_1?.jadwal_id,
                              issue.item_2?.item_id || issue.item_1?.item_id
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#082c78] hover:bg-blue-900 rounded-xl transition-colors"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          <span>Atur / Tukar Manual</span>
                        </button>
                      )}

                      {issue.can_ignore && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleAcceptSoft(issue)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{isBusy ? 'Menyimpan...' : 'Terima Toleransi'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}

          {/* Kontrol Paginasi Ringan */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 px-1 text-xs text-slate-500">
            <span className="tabular-nums">
              Menampilkan <strong className="text-slate-700">{visibleIssues.length}</strong> dari{' '}
              <strong className="text-slate-700">{filteredIssues.length}</strong> catatan (
              {activeDeptMeta.shortLabel})
            </span>

            {visibleIssues.length < filteredIssues.length && (
              <button
                type="button"
                onClick={() => setVisibleLimit((prev) => prev + PAGE_SIZE)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors self-start sm:self-auto"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                <span>
                  Tampilkan {Math.min(PAGE_SIZE, filteredIssues.length - visibleIssues.length)} berikutnya
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
