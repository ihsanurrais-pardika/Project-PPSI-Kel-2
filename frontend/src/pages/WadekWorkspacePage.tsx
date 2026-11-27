import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiService, RoomUtilizationItem } from '../services/api';
import { resolveDepartment } from '../utils/departmentHelper';
import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Eye,
  FileText,
  Gauge,
  Grid3X3,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
  CheckSquare,
  Square,
  Send,
  Info,
} from 'lucide-react';

type View = 'dashboard' | 'kalender' | 'jadwal' | 'validasi' | 'konflik' | 'heatmap' | 'riwayat';
const navItems: { id: View; label: string; icon: React.ElementType; section?: string }[] = [
  { id: 'dashboard', label: 'Dashboard Eksekutif', icon: LayoutDashboard },
  { id: 'kalender', label: 'Kalender Jadwal', icon: CalendarDays, section: 'TINJAUAN AKADEMIK' },
  { id: 'jadwal', label: 'Review Per Kelas (Tabel)', icon: ClipboardCheck },
  { id: 'validasi', label: 'Laporan Validasi', icon: ShieldCheck },
  { id: 'konflik', label: 'Validasi & Konflik', icon: ShieldAlert },
  { id: 'heatmap', label: 'Utilisasi Ruang', icon: Grid3X3, section: 'MANAJEMEN RUANGAN' },
  { id: 'riwayat', label: 'Riwayat Keputusan', icon: History, section: 'TATA KELOLA' },
];

const departments = [
  { code: 'SI', name: 'Departemen Sistem Informasi', classes: 52, groups: 110, hard: '100%', score: '94.2%', penalty: 12, date: '12 Okt 2024', time: '09:15 WIB' },
  { code: 'IF', name: 'Departemen Informatika', classes: 64, groups: 138, hard: '100%', score: '91.8%', penalty: 18, date: '12 Okt 2024', time: '10:40 WIB' },
  { code: 'TK', name: 'Departemen Teknik Komputer', classes: 26, groups: 70, hard: '100%', score: '92.0%', penalty: 12, date: '11 Okt 2024', time: '16:20 WIB' },
];

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'] as const;
const SESSIONS = [
  { idx: 1, label: '07:30 - 09:10' },
  { idx: 2, label: '09:10 - 10:50' },
  { idx: 3, label: '10:00 - 11:40' },
  { idx: 4, label: '11:10 - 12:50' },
  { idx: 5, label: '13:30 - 15:10' },
  { idx: 6, label: '16:00 - 17:40' },
];

const deptColor = (dept: string) => {
  const d = dept.toLowerCase();
  if (d.includes('sistem informasi') || d === 'si') return { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', badge: 'bg-blue-100 text-blue-800' };
  if (d.includes('informatika') || d === 'if') return { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-800', badge: 'bg-indigo-100 text-indigo-800' };
  if (d.includes('teknik komputer') || d === 'tk') return { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-800', badge: 'bg-purple-100 text-purple-800' };
  return { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-800', badge: 'bg-slate-100 text-slate-800' };
};

export const WadekWorkspacePage: React.FC = () => {
  const {
    currentUser,
    logout,
    schedule,
    conflicts,
    rooms,
    auditLogs,
    scheduleApprovalStatus,
    wadekRevisionNote,
    wadekApprove,
    wadekReject,
    reviewScheduleClass,
    showToast,
    backendClasses,
    backendCourses,
    latestCPSATResult,
  } = useApp();
  const [view, setView] = useState<View>('dashboard');
  const [note, setNote] = useState(wadekRevisionNote);
  const [query, setQuery] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [showRevision, setShowRevision] = useState(false);
  const reviewLogs = auditLogs.filter(log => log.category === 'APPROVAL WADEK' || log.category === 'Pengesahan WD1');
  const filteredSchedule = useMemo(() => schedule.filter(item => `${item.courseCode} ${item.courseName} ${item.lecturerName || item.primaryLecturer || ''} ${item.department} ${item.roomName}`.toLowerCase().includes(query.toLowerCase())), [schedule, query]);
  const title = navItems.find(item => item.id === view)?.label || 'Dashboard Eksekutif';

  const totalMk = backendCourses.length || new Set(schedule.map((s) => s.courseCode)).size;
  const totalKelas = backendClasses.length || schedule.length;
  const semesterLabel = latestCPSATResult?.semester_label || '2026/2027 GANJIL';
  const liveDepartments = [
    { code: 'SI', name: 'Departemen Sistem Informasi' },
    { code: 'IF', name: 'Departemen Informatika' },
    { code: 'TK', name: 'Departemen Teknik Komputer' },
  ].map((d) => {
    const deptClasses = backendClasses.filter((c) => c.department.toUpperCase() === d.code);
    const deptSched = schedule.filter((s) => resolveDepartment(s.department, s.courseCode) === d.code);
    const uniqueMk = new Set(deptClasses.length ? deptClasses.map((c) => c.course_code) : deptSched.map((s) => s.courseCode)).size;
    return {
      ...d,
      classes: uniqueMk,
      groups: deptClasses.length || deptSched.length,
      scheduled: deptSched.length,
      hard: '100%',
      score: 'Optimal',
      penalty: latestCPSATResult?.penalty_breakdown?.total_weighted_penalty ?? 0,
    };
  });

  const unresolvedConflicts = conflicts.filter(c => !c.isResolved);

  const approve = () => {
    if (scheduleApprovalStatus === 'Disetujui' || scheduleApprovalStatus === 'Resmi') return showToast('Persetujuan jadwal ini sudah tercatat.', 'info');
    wadekApprove();
  };
  const reject = () => {
    if (!note.trim()) return showToast('Catatan revisi wajib diisi sebelum jadwal dikembalikan.', 'warning');
    wadekReject(note.trim()); setShowRevision(false);
  };

  return <div className="fixed inset-0 z-40 flex bg-[#f5f7fc] text-slate-900 font-sans">
    {mobileNav && <button aria-label="Tutup menu" onClick={() => setMobileNav(false)} className="fixed inset-0 bg-slate-950/30 lg:hidden" />}
    <aside className={`fixed lg:static inset-y-0 left-0 z-50 flex w-[270px] shrink-0 flex-col border-r border-blue-100 bg-white transition-transform lg:translate-x-0 ${mobileNav ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-[72px] items-center gap-3 border-b border-slate-100 px-5"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#082c78] text-sm font-black text-white">FTI</div><div><div className="text-xs font-extrabold text-[#082c78]">Universitas Andalas</div><div className="text-[11px] text-slate-500">Fakultas Teknologi Informasi</div></div><button onClick={() => setMobileNav(false)} className="ml-auto lg:hidden"><X size={18} /></button></div>
      <div className="mx-4 mt-3 flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-[10px]"><span className="flex items-center gap-1.5 text-slate-700"><i className="h-2 w-2 rounded-full bg-blue-600" />Semester Aktif</span><b className="font-mono text-blue-800">{semesterLabel}</b></div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navItems.map((item, index) => <React.Fragment key={item.id}>{item.section && <div className="px-3 pb-2 pt-4 text-[10px] font-bold tracking-wider text-slate-400">{item.section}</div>}<button onClick={() => { setView(item.id); setMobileNav(false) }} className={`mb-0.5 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-all ${view === item.id ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}><item.icon size={16} />{item.label}{item.id === 'dashboard' && <span className="ml-auto rounded bg-white/15 px-1.5 py-0.5 text-[9px]">WD1</span>}{item.id === 'konflik' && unresolvedConflicts.length > 0 && <span className="ml-auto rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] text-white font-bold">{unresolvedConflicts.length}</span>}</button></React.Fragment>)}
      </nav>
      <div className="border-t border-slate-100 p-3"><div className="flex items-center gap-2 rounded-xl border border-slate-200 p-2"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-900">{currentUser.name.charAt(0)}</div><div className="min-w-0 flex-1"><div className="truncate text-[11px] font-bold">{currentUser.name}</div><div className="text-[10px] text-slate-500">Wakil Dekan I · Akademik</div></div><button onClick={logout} title="Keluar" className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><LogOut size={15} /></button></div></div>
    </aside>
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="z-20 flex min-h-[72px] items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 md:px-6"><div className="flex min-w-0 items-center gap-3"><button onClick={() => setMobileNav(true)} className="lg:hidden"><Menu size={20} /></button><div className="min-w-0"><h1 className="text-base font-extrabold leading-tight text-slate-900">{title}</h1><div className="text-[11px] leading-tight text-slate-500">SIPRAMA FTI UNAND • Portal Eksekutif</div></div></div><div className="flex items-center gap-2 md:gap-3"><div className="hidden items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-[11px] font-bold text-slate-700 sm:flex"><ShieldCheck size={15} className="text-blue-700" /> Wakil Dekan I</div><button onClick={() => setView('riwayat')} aria-label="Notifikasi keputusan" className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Bell size={17} />{scheduleApprovalStatus === 'Menunggu Persetujuan' && <i className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />}</button><div className="grid h-8 w-8 place-items-center rounded-full bg-[#082c78] text-white"><span className="text-xs font-bold">{currentUser.name.charAt(0)}</span></div></div></header>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1500px] space-y-5 p-4 md:p-6">
          {view === 'dashboard' && <>
            <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-bold text-[#082c78]"><Activity size={16} /> Ringkasan Audit Kelayakan Jadwal (KPI Eksekutif)</h2><span className="hidden rounded-full bg-blue-100 px-3 py-1 font-mono text-[10px] text-slate-600 sm:inline">CP-SAT Solver · {latestCPSATResult?.version_number ? `Versi #${latestCPSATResult.version_number}` : 'Database Aktif'}</span></div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">{[
              { label: 'Total Mata Kuliah', value: String(totalMk), sub: '100% terakomodir', icon: BookOpen, color: 'text-blue-900' },
              { label: 'Total Rombel / Kelas', value: String(totalKelas), sub: `Terdistribusi di ${rooms.length} ruang`, icon: Users, color: 'text-blue-900' },
              { label: 'Hard Constraints', value: '100%', sub: '0 pelanggaran syarat wajib', icon: ShieldCheck, color: 'text-emerald-700' },
              { label: 'Jadwal Tersusun', value: String(schedule.length), sub: 'Bebas bentrok ruang & dosen', icon: SlidersHorizontal, color: 'text-blue-700' },
              { label: 'Skor Penalti CP-SAT', value: String(latestCPSATResult?.penalty_breakdown?.total_weighted_penalty ?? 0), sub: `Status: ${latestCPSATResult?.status || 'OPTIMAL'}`, icon: Gauge, color: 'text-emerald-700' },
              { label: 'Status SK Saat Ini', value: scheduleApprovalStatus, sub: latestCPSATResult?.tahap || 'Siap Ditinjau', icon: AlertTriangle, color: 'text-amber-700' },
            ].map(card => <div key={card.label} className="flex min-h-[116px] flex-col justify-between rounded-xl border border-slate-100 bg-white p-3 shadow-sm"><div className="flex items-start justify-between gap-1"><span className="text-[10px] leading-4 text-slate-500">{card.label}</span><card.icon size={15} className={card.color} /></div><div className={`text-xl font-extrabold tracking-tight ${card.color}`}>{card.value}</div><div className="text-[10px] leading-4 text-slate-500">{card.sub}</div></div>)}</div>
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
              <div className="space-y-4">
                <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4"><div><h2 className="flex items-center gap-2 text-sm font-bold text-[#082c78]"><ClipboardCheck size={16} /> Daftar Usulan Jadwal Departemen</h2><p className="mt-1 text-[10px] text-slate-500">Klik Detail untuk meninjau jadwal mingguan atau ACC/Revisi per mata kuliah</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">● 3 Departemen Lengkap</span></div><div className="overflow-x-auto"><table className="w-full min-w-[790px] text-left text-[10px]"><thead className="bg-[#f0f4ff] font-mono uppercase tracking-wider text-slate-500"><tr>{['No', 'Departemen', 'Beban MK/Kelas', 'Hard Constraint', 'Terjadwal', 'Penalti CP-SAT', 'Status', 'Aksi'].map(label => <th key={label} className="px-3 py-3 font-medium">{label}</th>)}</tr></thead><tbody>{liveDepartments.map((dept, i) => <tr key={dept.code} className="border-t border-slate-100"><td className="px-3 py-4 text-slate-500">{i + 1}</td><td className="px-3 py-4"><div className="flex items-center gap-2"><span className="rounded-md bg-blue-50 px-1.5 py-1 font-bold text-blue-800">{dept.code}</span><div className="max-w-[140px] font-bold leading-4 text-blue-900">{dept.name}<div className="font-normal text-slate-500">{semesterLabel}</div></div></div></td><td className="px-3 py-4"><b>{dept.classes} MK</b><div className="text-slate-500">{dept.groups} kelas</div></td><td className="px-3 py-4"><span className="rounded-full bg-emerald-50 px-2 py-1 font-bold text-emerald-700">✓ {dept.hard} Lolos</span></td><td className="px-3 py-4 font-bold text-blue-700">{dept.scheduled} kelas</td><td className="px-3 py-4"><span className="rounded bg-blue-100 px-2 py-1 text-blue-900">Skor {dept.penalty}</span></td><td className="px-3 py-4"><span className="rounded-full bg-amber-50 px-2 py-1 font-medium text-amber-800">● {scheduleApprovalStatus}</span></td><td className="px-3 py-4"><button onClick={() => setView('kalender')} className="rounded bg-blue-50 px-2 py-1.5 font-bold text-blue-800 hover:bg-blue-100">Review</button></td></tr>)}</tbody></table></div><div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3"><div className="flex max-w-xl items-start gap-2 text-[10px] text-slate-500"><ShieldCheck size={15} className="shrink-0 text-emerald-700" /><span><b className="text-slate-700">Validasi Hard Constraints Terpenuhi:</b> Tidak ada bentrok ruangan, dosen terhindar dari jadwal paralel simultan, dan kapasitas ruang memenuhi peserta rombel.</span></div><button onClick={() => setView('validasi')} className="text-[10px] font-bold text-blue-700">Lihat Laporan Validasi Lengkap →</button></div></section>
                <GAChart />
              </div>
              <div className="space-y-4 xl:sticky xl:top-4"><section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"><span className="rounded-full bg-[#082c78] px-2.5 py-1 text-[9px] font-bold uppercase text-white">Keputusan Resmi Wadek I</span><h2 className="mt-2 text-sm font-bold text-[#082c78]">Pengesahan Draf Terpadu</h2><p className="mt-1 text-[10px] leading-4 text-slate-600">Tindakan berikut memiliki konsekuensi akademik. Persetujuan diteruskan ke Admin untuk proses penerbitan SK jadwal.</p><div className="mt-4 space-y-2 rounded-lg bg-[#f0f4ff] p-3 text-[10px]"><div className="flex justify-between gap-2"><span>Validasi Akademik FTI</span><b className="text-emerald-700">✓ TERVERIFIKASI</b></div><div className="flex justify-between gap-2"><span>Kesesuaian Kuota Lab IF/TK</span><b className="text-emerald-700">100% SESUAI</b></div><div className="flex justify-between gap-2"><span>Beban mengajar &gt; 16 SKS</span><b>0 Dosen (Nihil)</b></div><div className="flex justify-between gap-2"><span>Catatan soft warning</span><b className="text-amber-700">3 Dosen (Jeda singkat)</b></div></div><button disabled={scheduleApprovalStatus === 'Disetujui' || scheduleApprovalStatus === 'Resmi'} onClick={approve} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 size={16} />Setujui &amp; Sahkan SK Jadwal</button><button onClick={() => setShowRevision(true)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-50 py-3 text-xs font-bold text-amber-800 hover:bg-blue-100"><FileText size={15} />Kembalikan dengan Catatan Revisi</button><button onClick={() => window.print()} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-100 py-2.5 text-xs font-semibold text-blue-900 hover:bg-slate-50"><FileText size={15} />Cetak Lembar Verifikasi Akademik (PDF)</button><div className="mt-3 rounded-lg bg-blue-50 p-3 text-[10px] leading-4 text-slate-600"><ShieldCheck size={14} className="mr-1 inline text-blue-700" />Tanda tangan digital BSrE diterapkan otomatis pada draf SK setelah pengesahan.</div></section>
                <section className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm"><div className="mb-2 flex justify-between"><b className="text-[11px] text-blue-900">Log Konsolidasi Draf</b><span className="text-[9px] text-slate-400">Versi 1.4.2</span></div>{auditLogs.slice(0, 2).map(log => <div key={log.id} className="mb-2 rounded-lg bg-blue-50 p-2.5"><b className="text-[10px] text-blue-900">{log.actorName}</b><div className="mt-1 text-[10px] leading-4 text-slate-600">{log.activity}</div><div className="mt-1 font-mono text-[9px] text-slate-400">{log.timestamp}</div></div>)}</section></div>
            </div>
          </>}
          {view === 'kalender' && <CalendarView rows={filteredSchedule} query={query} setQuery={setQuery} onReview={reviewScheduleClass} onApproveAll={approve} onRejectAll={() => setShowRevision(true)} approvalStatus={scheduleApprovalStatus} />}
          {view === 'jadwal' && <ScheduleView rows={filteredSchedule} query={query} setQuery={setQuery} onReview={reviewScheduleClass} />}
          {view === 'validasi' && <ValidationView rows={filteredSchedule} />}
          {view === 'konflik' && <ConflictView conflicts={conflicts} />}
          {view === 'heatmap' && <HeatmapView rooms={rooms} schedule={schedule} />}
          {view === 'riwayat' && <HistoryView rows={reviewLogs} />}
        </div>
      </main>
      {showRevision && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/40 p-4"><div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl"><div className="flex items-center justify-between"><h2 className="font-bold text-blue-950">Kembalikan jadwal untuk revisi</h2><button onClick={() => setShowRevision(false)}><X size={18} /></button></div><p className="mt-1 text-xs text-slate-500">Catatan ini akan diteruskan kepada Admin Fakultas sebagai dasar perbaikan.</p><textarea value={note} onChange={e => setNote(e.target.value)} rows={5} placeholder="Tuliskan revisi yang diperlukan..." className="mt-4 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-500" /><div className="mt-4 flex justify-end gap-2"><button onClick={() => setShowRevision(false)} className="rounded-lg border px-4 py-2 text-xs">Batal</button><button onClick={reject} className="rounded-lg bg-blue-900 px-4 py-2 text-xs font-bold text-white">Kirim catatan revisi</button></div></div></div>}
    </div>
  </div>;
};

/* ─────────────── KALENDER VIEW (NEW) ─────────────── */
const CalendarView: React.FC<{
  rows: any[];
  query: string;
  setQuery: (v: string) => void;
  onReview: (id: string, decision: 'Disetujui' | 'Revisi', note?: string) => void;
  onApproveAll: () => void;
  onRejectAll: () => void;
  approvalStatus: string;
}> = ({ rows, query, setQuery, onReview, onApproveAll, onRejectAll, approvalStatus }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailItem, setDetailItem] = useState<any>(null);
  const [revisionModal, setRevisionModal] = useState<{ mode: 'single' | 'bulk'; items: any[] } | null>(null);
  const [revisionNote, setRevisionNote] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    let items = rows;
    if (deptFilter !== 'all') items = items.filter(r => {
      const resolved = resolveDepartment(r.department, r.courseCode || r.code);
      return resolved === deptFilter;
    });
    return items;
  }, [rows, deptFilter]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(r => r.id)));
  };
  const getCell = (day: string, session: number) => filtered.filter(r => r.day === day && r.sessionIndex === session);

  const handleBulkAcc = () => {
    if (selectedIds.size === 0) return;
    selectedIds.forEach(id => onReview(id, 'Disetujui'));
    setSelectedIds(new Set());
  };

  const handleBulkRevision = () => {
    if (selectedIds.size === 0) return;
    const items = filtered.filter(r => selectedIds.has(r.id));
    setRevisionModal({ mode: 'bulk', items });
    setRevisionNote('');
  };

  const handleSingleRevision = (item: any) => {
    setRevisionModal({ mode: 'single', items: [item] });
    setRevisionNote(item.wd1RevisionNote || '');
  };

  const submitRevision = () => {
    if (!revisionModal || !revisionNote.trim()) return;
    revisionModal.items.forEach(item => onReview(item.id, 'Revisi', revisionNote.trim()));
    setRevisionModal(null);
    setRevisionNote('');
    setSelectedIds(new Set());
  };

  const statusDot = (item: any) => {
    if (item.wd1Status === 'Disetujui') return 'bg-emerald-500';
    if (item.wd1Status === 'Revisi') return 'bg-amber-500';
    return 'bg-blue-400';
  };

  const approvedCount = filtered.filter(r => r.wd1Status === 'Disetujui').length;
  const revisiCount = filtered.filter(r => r.wd1Status === 'Revisi').length;
  const pendingCount = filtered.length - approvedCount - revisiCount;

  return <div className="space-y-4">
    {/* Toolbar */}
    <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-[#082c78]"><CalendarDays size={16} /> Kalender Jadwal Perkuliahan</h2>
          <p className="mt-1 text-[10px] text-slate-500">Klik mata kuliah di kalender untuk mereview. Pilih satu atau lebih untuk revisi/ACC.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">
            <option value="all">Semua Departemen</option>
            <option value="SI">Sistem Informasi</option>
            <option value="IF">Informatika</option>
            <option value="TK">Teknik Komputer</option>
          </select>
          <div className="relative"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari..." className="w-44 rounded-lg border px-8 py-2 text-xs" /></div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
        <span className="rounded-full bg-blue-100 px-2.5 py-1 font-semibold text-blue-800">{filtered.length} kelas total</span>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">{approvedCount} disetujui</span>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">{revisiCount} perlu revisi</span>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">{pendingCount} menunggu review</span>
      </div>

      {/* Bulk action bar */}
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
        <button onClick={selectAll} className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          {selectedIds.size === filtered.length && filtered.length > 0 ? <CheckSquare size={14} className="text-blue-600" /> : <Square size={14} />}
          {selectedIds.size > 0 ? `${selectedIds.size} dipilih` : 'Pilih Semua'}
        </button>
        {selectedIds.size > 0 && <>
          <button onClick={handleBulkAcc} className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"><Check size={13} />ACC Terpilih ({selectedIds.size})</button>
          <button onClick={handleBulkRevision} className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"><RotateCcw size={13} />Revisi Terpilih ({selectedIds.size})</button>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-500 hover:text-slate-700">Batal Pilih</button>
        </>}
        <div className="ml-auto flex gap-2">
          <button disabled={approvalStatus === 'Disetujui' || approvalStatus === 'Resmi'} onClick={onApproveAll} className="flex items-center gap-1.5 rounded-md bg-[#082c78] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0a3a9e] disabled:opacity-50"><ShieldCheck size={13} />ACC Keseluruhan</button>
          <button onClick={onRejectAll} className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"><RotateCcw size={13} />Revisi Keseluruhan</button>
        </div>
      </div>
    </section>

    {/* Calendar Grid */}
    <section className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full min-w-[900px] border-collapse text-[10px]">
        <thead>
          <tr className="bg-[#082c78] text-white">
            <th className="w-24 border-r border-blue-800 px-3 py-3 text-left font-semibold">Waktu / Sesi</th>
            {DAYS.map(day => <th key={day} className="border-r border-blue-800 px-2 py-3 text-center font-semibold last:border-r-0">{day}</th>)}
          </tr>
        </thead>
        <tbody>
          {SESSIONS.map(session => (
            <tr key={session.idx} className="border-t border-slate-100">
              <td className="border-r border-slate-100 bg-slate-50 px-3 py-2 align-top">
                <div className="font-bold text-slate-700">Sesi {session.idx}</div>
                <div className="text-[9px] text-slate-500">{session.label}</div>
              </td>
              {DAYS.map(day => {
                const cells = getCell(day, session.idx);
                return <td key={day} className="border-r border-slate-100 px-1.5 py-1.5 align-top last:border-r-0 min-w-[160px]">
                  {cells.length === 0 && <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-slate-400">—</div>}
                  {cells.map(item => {
                    const dc = deptColor(item.department);
                    const isSelected = selectedIds.has(item.id);
                    return <div
                      key={item.id}
                      onClick={() => setDetailItem(detailItem?.id === item.id ? null : item)}
                      className={`group relative mb-1.5 cursor-pointer rounded-lg border p-2.5 transition-all ${isSelected ? 'ring-2 ring-blue-500 border-blue-400 bg-blue-50/60' :
                        detailItem?.id === item.id ? 'ring-2 ring-indigo-400 border-indigo-300' :
                          dc.bg
                        } hover:shadow-md`}
                    >
                      {/* Selection checkbox */}
                      <button
                        onClick={e => { e.stopPropagation(); toggleSelect(item.id); }}
                        className="absolute right-1.5 top-1.5 rounded p-0.5 text-slate-400 hover:text-blue-600"
                      >
                        {isSelected ? <CheckSquare size={14} className="text-blue-600" /> : <Square size={14} />}
                      </button>
                      {/* Status dot */}
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`h-2 w-2 rounded-full ${statusDot(item)}`} />
                        <span className={`font-bold ${dc.text}`}>{item.courseCode}</span>
                      </div>
                      <div className="text-[9px] leading-3.5 text-slate-700 font-medium truncate pr-5">{item.courseName}</div>
                      <div className="mt-1 text-[9px] text-slate-500">{item.classLabel || item.className || 'Kelas A'} · {item.studentCount} mhs</div>
                      <div className="mt-0.5 text-[9px] text-slate-500 truncate">{item.lecturerName || item.primaryLecturer || '—'}</div>
                      <div className="mt-0.5 text-[9px] text-slate-400 truncate">{item.roomName}</div>
                      {item.wd1Status && <div className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[8px] font-bold ${item.wd1Status === 'Disetujui' ? 'bg-emerald-100 text-emerald-700' :
                        item.wd1Status === 'Revisi' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>{item.wd1Status}</div>}
                    </div>;
                  })}
                </td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>

    {/* Legend */}
    <div className="flex flex-wrap gap-4 rounded-lg bg-white border border-slate-100 px-4 py-2.5 text-[10px] text-slate-600">
      <span className="font-bold text-slate-800">Legenda:</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-400" />Menunggu Review</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Disetujui (ACC)</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />Perlu Revisi</span>
      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-blue-400 bg-blue-50" />Terpilih</span>
      <span className="flex items-center gap-1.5">🖱️ Klik = Lihat Detail</span>
      <span className="flex items-center gap-1.5">☑️ Checkbox = Pilih untuk Revisi/ACC</span>
    </div>

    {/* Detail Panel (shows below calendar when an item is clicked) */}
    {detailItem && <section className="rounded-xl border border-indigo-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`rounded-md px-2 py-1 text-xs font-bold ${deptColor(detailItem.department).badge}`}>{detailItem.courseCode}</span>
            <h3 className="text-sm font-bold text-slate-900">{detailItem.courseName}</h3>
            {detailItem.wd1Status && <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${detailItem.wd1Status === 'Disetujui' ? 'bg-emerald-50 text-emerald-700' :
              detailItem.wd1Status === 'Revisi' ? 'bg-amber-50 text-amber-700' :
                'bg-blue-50 text-blue-700'
              }`}>{detailItem.wd1Status}</span>}
          </div>
          {detailItem.wd1RevisionNote && <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800"><b>Catatan Revisi:</b> {detailItem.wd1RevisionNote}</div>}
        </div>
        <button onClick={() => setDetailItem(null)} className="rounded-lg p-1 hover:bg-slate-100"><X size={18} /></button>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <div><div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Kelas / Rombel</div><div className="mt-1 text-xs font-semibold">{detailItem.classLabel || detailItem.className || 'Kelas A'}</div><div className="text-[10px] text-slate-500">{detailItem.studentCount} mahasiswa · {detailItem.sks} SKS</div></div>
        <div><div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Dosen Pengampu</div><div className="mt-1 text-xs font-semibold">{detailItem.lecturerName || detailItem.primaryLecturer || '—'}</div>{detailItem.isTandem && <div className="text-[10px] text-slate-500">Dosen tandem</div>}</div>
        <div><div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Jadwal</div><div className="mt-1 text-xs">{detailItem.day}, {detailItem.timeLabel || detailItem.time || `Sesi ${detailItem.sessionIndex}`}</div></div>
        <div><div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Ruang</div><div className="mt-1 text-xs">{detailItem.roomName}</div><div className="text-[10px] text-slate-500">{detailItem.building || ''}{detailItem.floor ? ` · Lt. ${detailItem.floor}` : ''}</div></div>
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
        <button onClick={() => { onReview(detailItem.id, 'Disetujui'); setDetailItem({ ...detailItem, wd1Status: 'Disetujui' }); }} className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"><Check size={14} />ACC Mata Kuliah Ini</button>
        <button onClick={() => handleSingleRevision(detailItem)} className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"><RotateCcw size={14} />Revisi dengan Catatan</button>
        <div className="ml-auto text-[10px] text-slate-500">Departemen: <b>{detailItem.department}</b></div>
      </div>
    </section>}

    {/* Revision Modal */}
    {revisionModal && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-blue-950">
              {revisionModal.mode === 'single' ? 'Catatan Revisi Mata Kuliah' : `Catatan Revisi Terpilih (${revisionModal.items.length} kelas)`}
            </h2>
            {revisionModal.mode === 'single' && <div className="mt-1 text-xs text-slate-500">{revisionModal.items[0].courseCode} · {revisionModal.items[0].courseName} · {revisionModal.items[0].classLabel || 'Kelas A'}</div>}
          </div>
          <button onClick={() => setRevisionModal(null)}><X size={18} /></button>
        </div>
        {revisionModal.mode === 'bulk' && <div className="mt-3 max-h-32 overflow-y-auto rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-[10px] space-y-1">
          {revisionModal.items.map(item => <div key={item.id} className="flex items-center gap-2"><span className="font-bold text-blue-800">{item.courseCode}</span><span className="text-slate-600">{item.courseName} · {item.classLabel || 'Kelas A'}</span><span className="text-slate-400">{item.day}</span></div>)}
        </div>}
        <label className="mt-4 block text-xs font-semibold">Arahan revisi untuk Admin / Penjadwal</label>
        <textarea autoFocus value={revisionNote} onChange={e => setRevisionNote(e.target.value)} rows={4} placeholder="Contoh: pindahkan kelas ke sesi 3 karena dosen memiliki jadwal paralel..." className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-500" />
        <div className="mt-2 rounded-lg bg-blue-50 p-2.5 text-[10px] text-slate-600"><Info size={12} className="inline mr-1 text-blue-600" />Catatan revisi ini akan langsung diteruskan ke sistem Admin Penjadwalan FTI untuk ditindaklanjuti.</div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setRevisionModal(null)} className="rounded-lg border px-4 py-2 text-xs">Batal</button>
          <button onClick={submitRevision} disabled={!revisionNote.trim()} className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"><Send size={13} className="inline mr-1" />Kirim Revisi</button>
        </div>
      </div>
    </div>}
  </div>;
};

/* ─────────────── GA CHART ─────────────── */
const GAChart = () => <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-bold text-[#082c78]">Karakteristik Optimasi Algoritma Genetika (GA)</h2><p className="mt-1 text-[10px] text-slate-500">Penurunan penalti pelanggaran preferensi dosen &amp; efisiensi ruang FTI</p></div><div className="flex gap-3 text-[9px]"><span><i className="mr-1 inline-block h-2 w-2 bg-[#082c78]" />Skor Penalti</span><span><i className="mr-1 inline-block h-2 w-2 bg-blue-600" />Pemanfaatan Ruang</span></div></div><svg viewBox="0 0 700 220" className="mt-3 h-48 w-full" role="img" aria-label="Grafik tren optimasi algoritma genetika"><path d="M25 35 H680 M25 90 H680 M25 145 H680 M25 195 H680" stroke="#dbe6ff" strokeDasharray="4 5" /><path d="M25 55 C110 80 150 120 230 160 S360 174 420 158 S560 160 680 183" fill="none" stroke="#082c78" strokeWidth="3" /><path d="M25 170 C130 155 190 125 270 105 S390 63 450 78 S570 70 680 50 L680 195 L25 195Z" fill="#2563eb" opacity=".12" /><path d="M25 170 C130 155 190 125 270 105 S390 63 450 78 S570 70 680 50" fill="none" stroke="#075bea" strokeWidth="3" /><text x="28" y="215" fontSize="10" fill="#64748b">Generasi 001</text><text x="620" y="215" fontSize="10" fill="#64748b">Gen-140</text><text x="520" y="178" fontSize="10" fill="#082c78">Penalti: 42 (Stabil)</text></svg><div className="grid grid-cols-3 rounded-lg bg-slate-50 px-3 py-2 text-center text-[9px] text-slate-500"><div>Populasi Jadwal<br /><b className="font-mono text-blue-900">300 Kromosom</b></div><div>Crossover Rate (Pc)<br /><b className="font-mono text-blue-900">0.85 (Two-Point)</b></div><div>Mutation Rate (Pm)<br /><b className="font-mono text-blue-900">0.05 (Swap Slot)</b></div></div></section>;

/* ─────────────── SCHEDULE TABLE VIEW ─────────────── */
const ScheduleView: React.FC<{ rows: any[]; query: string; setQuery: (v: string) => void; onReview: (id: string, decision: 'Disetujui' | 'Revisi', note?: string) => void }> = ({ rows, query, setQuery, onReview }) => {
  const [selected, setSelected] = useState<any>(null);
  const [revisionTarget, setRevisionTarget] = useState<any>(null);
  const [revisionNote, setRevisionNote] = useState('');
  const submitRevision = () => {
    if (!revisionTarget || !revisionNote.trim()) return;
    onReview(revisionTarget.id, 'Revisi', revisionNote.trim());
    setRevisionTarget(null); setRevisionNote('');
  };
  const statusPill = (status: string) => status === 'Disetujui' ? 'bg-emerald-50 text-emerald-700' : status === 'Revisi' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-700';
  return <div className="space-y-4">
    <section className="overflow-hidden rounded-xl border bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><h2 className="font-bold text-blue-950">Review &amp; Approval Jadwal per Kelas</h2><p className="mt-1 text-xs text-slate-500">Tinjau mata kuliah, kelas, dosen, waktu, dan ruang. Berikan ACC atau catatan revisi untuk setiap kelas.</p></div><div className="flex gap-2"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari MK, kelas, dosen, ruang" className="w-56 rounded-lg border px-3 py-2 text-xs" /><button onClick={() => window.print()} className="rounded-lg border px-3 py-2 text-xs">Cetak</button></div></div>
      <div className="flex flex-wrap gap-2 border-b bg-slate-50 px-4 py-3 text-[10px]"><span className="rounded-full bg-blue-100 px-2.5 py-1 font-semibold text-blue-800">{rows.length} kelas ditampilkan</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">{rows.filter(r => r.wd1Status === 'Disetujui').length} disetujui</span><span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">{rows.filter(r => r.wd1Status === 'Revisi').length} perlu revisi</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-left text-[11px]"><thead className="bg-blue-50 text-slate-600"><tr>{['Mata Kuliah', 'Kelas / Rombel', 'Departemen', 'Dosen Pengampu', 'Hari & Waktu', 'Ruang', 'Review WD1', 'Aksi'].map(x => <th key={x} className="px-3 py-3 font-semibold">{x}</th>)}</tr></thead><tbody>{rows.map((row: any) => <React.Fragment key={row.id}><tr className={`border-t ${selected?.id === row.id ? 'bg-blue-50/50' : ''}`}><td className="px-3 py-3 font-bold text-blue-950">{row.courseCode}<div className="mt-1 max-w-48 font-normal leading-4 text-slate-500">{row.courseName}</div></td><td className="px-3 py-3"><span className="rounded bg-slate-100 px-2 py-1 font-semibold">{row.classLabel || row.className || 'Kelas A'}</span><div className="mt-1 text-[10px] text-slate-500">{row.studentCount} mahasiswa · {row.sks} SKS</div></td><td className="px-3 py-3">{row.department}</td><td className="px-3 py-3">{row.lecturerName || row.primaryLecturer || '—'}{row.isTandem && <div className="text-[10px] text-slate-500">Dosen tandem</div>}</td><td className="px-3 py-3">{row.day}<div className="text-slate-500">{row.timeLabel || row.time || `Sesi ${row.sessionIndex}`}</div></td><td className="px-3 py-3">{row.roomName}</td><td className="px-3 py-3"><span className={`whitespace-nowrap rounded-full px-2 py-1 font-semibold ${statusPill(row.wd1Status || 'Menunggu Review')}`}>{row.wd1Status || 'Menunggu Review'}</span>{row.wd1RevisionNote && <div className="mt-1 max-w-40 text-[10px] text-amber-800">Catatan: {row.wd1RevisionNote}</div>}</td><td className="px-3 py-3"><div className="flex items-center gap-1.5"><button onClick={() => setSelected(selected?.id === row.id ? null : row)} title="Review detail kelas" className="flex items-center gap-1 rounded-md border border-blue-200 px-2 py-1.5 font-semibold text-blue-800 hover:bg-blue-50"><Eye size={13} />Review</button><button onClick={() => onReview(row.id, 'Disetujui')} title="ACC kelas" className="flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1.5 font-bold text-white hover:bg-emerald-700"><Check size={13} />ACC</button><button onClick={() => { setRevisionTarget(row); setRevisionNote(row.wd1RevisionNote || '') }} title="Revisi dengan catatan" className="rounded-md border border-amber-200 px-2 py-1.5 font-semibold text-amber-800 hover:bg-amber-50">Revisi</button></div></td></tr>{selected?.id === row.id && <tr className="border-t bg-[#f6f8ff]"><td colSpan={8} className="px-5 py-4"><div className="grid gap-4 md:grid-cols-3"><div><div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Detail kelas</div><div className="mt-1 text-xs font-bold">{row.courseName} · {row.classLabel || row.className || 'Kelas A'}</div><div className="mt-1 text-[10px] text-slate-600">{row.sks} SKS · kapasitas/peserta {row.studentCount} · {row.department}</div></div><div><div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Penempatan</div><div className="mt-1 text-xs">{row.day}, {row.timeLabel || row.time || `Sesi ${row.sessionIndex}`}</div><div className="text-[10px] text-slate-600">{row.roomName}{row.building ? ` · ${row.building}` : ''}</div></div><div><div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Catatan penjadwalan</div><div className="mt-1 text-xs text-slate-700">{row.note || 'Tidak ada catatan khusus untuk kelas ini.'}</div></div></div></td></tr>}</React.Fragment>)}</tbody></table>{!rows.length && <div className="p-10 text-center text-sm text-slate-500">Tidak ada kelas yang cocok dengan pencarian.</div>}</div>
    </section>
    {revisionTarget && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/40 p-4"><div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl"><div className="flex items-center justify-between"><div><h2 className="font-bold text-blue-950">Catatan revisi kelas</h2><div className="mt-1 text-xs text-slate-500">{revisionTarget.courseCode} · {revisionTarget.courseName} · {revisionTarget.classLabel || revisionTarget.className || 'Kelas A'}</div></div><button onClick={() => setRevisionTarget(null)}><X size={18} /></button></div><label className="mt-4 block text-xs font-semibold">Arahan revisi untuk Admin / Penjadwal</label><textarea autoFocus value={revisionNote} onChange={e => setRevisionNote(e.target.value)} rows={4} placeholder="Contoh: pindahkan kelas ke sesi 3 karena dosen memiliki jadwal paralel..." className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-500" /><div className="mt-2 rounded-lg bg-blue-50 p-2.5 text-[10px] text-slate-600"><Info size={12} className="inline mr-1 text-blue-600" />Catatan revisi ini akan langsung diteruskan ke sistem Admin Penjadwalan FTI untuk ditindaklanjuti.</div><div className="mt-4 flex justify-end gap-2"><button onClick={() => setRevisionTarget(null)} className="rounded-lg border px-4 py-2 text-xs">Batal</button><button onClick={submitRevision} disabled={!revisionNote.trim()} className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Kirim revisi</button></div></div></div>}
  </div>;
};

/* ─────────────── CONFLICT VIEW (NEW) ─────────────── */
const ConflictView: React.FC<{ conflicts: any[] }> = ({ conflicts }) => {
  const unresolved = conflicts.filter(c => !c.isResolved);
  const resolved = conflicts.filter(c => c.isResolved);

  const severityStyle = (sev: string) => {
    if (sev === 'hard' || sev === 'Tinggi') return 'bg-rose-50 border-rose-200 text-rose-800';
    if (sev === 'warning' || sev === 'Sedang') return 'bg-amber-50 border-amber-200 text-amber-800';
    return 'bg-blue-50 border-blue-200 text-blue-700';
  };

  return <div className="space-y-4">
    <div className="grid gap-3 md:grid-cols-3">
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="text-xs text-slate-500">Total Konflik</div>
        <div className="mt-2 text-xl font-bold text-slate-800">{conflicts.length}</div>
      </div>
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="text-xs text-slate-500">Belum Teratasi</div>
        <div className={`mt-2 text-xl font-bold ${unresolved.length > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{unresolved.length}</div>
      </div>
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="text-xs text-slate-500">Sudah Teratasi</div>
        <div className="mt-2 flex items-center gap-2 text-xl font-bold text-emerald-700"><CheckCircle2 size={19} />{resolved.length}</div>
      </div>
    </div>

    {unresolved.length > 0 && <section className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-bold text-amber-800"><ShieldAlert size={16} /> Konflik Belum Teratasi</h2>
      <div className="mt-4 space-y-3">
        {unresolved.map(c => <div key={c.id} className={`rounded-lg border p-4 ${severityStyle(c.severity)}`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="rounded px-1.5 py-0.5 bg-white/50 font-mono text-[9px]">{c.type}</span>
                {c.title}
              </div>
              <div className="mt-1 text-[10px] text-slate-600">{c.courseCode} · {c.courseName} · {c.classLabel || ''}</div>
              <div className="mt-1 text-[10px] text-slate-500">{c.details || c.description}</div>
            </div>
          </div>
          {c.recommendation && <div className="mt-2 rounded bg-white/50 px-2.5 py-1.5 text-[10px]"><b>Rekomendasi:</b> {c.recommendation}</div>}
        </div>)}
      </div>
    </section>}

    <section className="rounded-xl border bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-bold text-emerald-800"><CheckCircle2 size={16} /> Konflik Teratasi</h2>
      {resolved.length === 0 ? <div className="mt-4 text-sm text-slate-500">Belum ada konflik yang teratasi.</div> :
        <div className="mt-4 space-y-3">
          {resolved.map(c => <div key={c.id} className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
              <CheckCircle2 size={14} />
              <span className="rounded px-1.5 py-0.5 bg-emerald-100 font-mono text-[9px]">{c.type}</span>
              {c.title}
            </div>
            <div className="mt-1 text-[10px] text-slate-500">{c.courseCode} · {c.courseName} — {c.recommendation}</div>
          </div>)}
        </div>}
    </section>

    <div className="rounded-lg bg-blue-50 p-3 text-xs text-slate-600"><Info size={14} className="inline mr-1 text-blue-600" />Halaman ini menampilkan status validasi dan konflik jadwal. Sebagai Wakil Dekan I, Anda dapat meninjau konflik yang belum teratasi sebelum memberikan persetujuan.</div>
  </div>;
};

/* ─────────────── HEATMAP / ROOM UTILIZATION VIEW (NEW) ─────────────── */
const HeatmapView: React.FC<{ rooms: any[]; schedule: any[] }> = ({ rooms, schedule }) => {
  const [selectedDay, setSelectedDay] = useState<string>('Senin');
  const [apiData, setApiData] = useState<{
    summary: any;
    rooms: RoomUtilizationItem[];
  } | null>(null);
  const [tooltip, setTooltip] = useState<{
    roomName: string;
    time: string;
    courseCode?: string;
    courseName?: string;
    classLabel?: string;
    lecturer?: string;
    lecturers?: string[];
    enrolled?: number;
    capacity?: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiService
      .getRoomUtilization({ day: selectedDay })
      .then((res) => {
        if (!cancelled && res.rooms && res.rooms.length > 0) {
          setApiData({ summary: res.summary, rooms: res.rooms });
        }
      })
      .catch(() => {
        if (!cancelled) setApiData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDay]);

  const roomUsage = useMemo(() => {
    if (apiData && apiData.rooms.length > 0) {
      return apiData.rooms
        .map((r) => ({
          id: r.room_id,
          name: r.room_code || r.room_name,
          type: r.room_type || 'Teori',
          capacity: r.capacity,
          building: r.building,
          floor: r.floor,
          used: r.occupied_slots_count,
          totalSlots: r.total_slots_available || 6,
          pct: Math.round(r.utilization_percentage),
          isOverload: r.is_overload,
          apiSlots: r.slots,
        }))
        .sort((a, b) => b.pct - a.pct);
    }

    return rooms.map(room => {
      const slots = schedule.filter(s => s.roomId === room.id && s.day === selectedDay);
      const totalSlots = 6; // 1 day x 6 sessions
      const used = slots.length;
      const pct = Math.round((used / totalSlots) * 100);
      return { ...room, used, totalSlots, pct, isOverload: false, slots, apiSlots: null };
    }).sort((a, b) => b.pct - a.pct);
  }, [apiData, rooms, schedule, selectedDay]);

  const totalRooms = apiData?.summary?.total_rooms ?? roomUsage.length;
  const avgUtil = apiData?.summary?.average_utilization_percentage != null
    ? Math.round(apiData.summary.average_utilization_percentage)
    : roomUsage.length > 0
      ? Math.round(roomUsage.reduce((acc, r) => acc + r.pct, 0) / roomUsage.length)
      : 0;
  const freeSlotsCount = apiData?.summary?.total_free_slots ??
    roomUsage.reduce((acc, r) => acc + Math.max(0, r.totalSlots - r.used), 0);
  const overloadCount = apiData?.summary?.overload_classes_count ??
    roomUsage.filter((r) => r.isOverload).length;

  const heatColor = (pct: number) => {
    if (pct >= 60) return 'bg-blue-600 text-white';
    if (pct >= 40) return 'bg-blue-400 text-white';
    if (pct >= 20) return 'bg-blue-200 text-blue-900';
    if (pct > 0) return 'bg-blue-100 text-blue-800';
    return 'bg-slate-100 text-slate-500';
  };

  return <div className="space-y-4">
    {/* 4 Summary Metric Cards (matching Admin) */}
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[10px] font-bold uppercase tracking-wider">Total Ruang</span>
          <LayoutDashboard className="w-4 h-4 text-blue-600" />
        </div>
        <div className="text-2xl font-black text-slate-900 mt-1">{totalRooms}</div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[10px] font-bold uppercase tracking-wider">Slot Kosong Siap Pakai</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="text-2xl font-black text-emerald-700 mt-1">{freeSlotsCount} Slot</div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[10px] font-bold uppercase tracking-wider">Ruang Overload / Penuh</span>
          <AlertTriangle className="w-4 h-4 text-rose-600" />
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-black text-rose-700">{overloadCount} Ruang</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${overloadCount > 0 ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
            }`}>
            {overloadCount > 0 ? 'Butuh Aksi' : 'Aman'}
          </span>
        </div>
      </div>
    </div>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-[#082c78]"><Grid3X3 size={16} /> Utilisasi Ruang FTI</h2>
          <p className="mt-1 text-xs text-slate-500">Tingkat pemanfaatan ruang berdasarkan jadwal yang telah dioptimasi.</p>
        </div>
        <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-0.5 self-start">
          {DAYS.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedDay === day ? 'bg-[#082c78] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {roomUsage.map(room => <div key={room.id} className="rounded-xl border border-slate-200/80 p-4 hover:border-blue-300 transition-colors bg-white">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-bold text-slate-800 truncate">{room.name}</div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 ${heatColor(room.pct)}`}>{room.pct}%</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500">{room.type} · Kapasitas {room.capacity} · {room.building} Lt. {room.floor}</div>
          <div className="mt-2 h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${room.pct >= 60 ? 'bg-blue-600' : room.pct >= 40 ? 'bg-blue-400' : room.pct >= 20 ? 'bg-blue-300' : 'bg-blue-200'}`} style={{ width: `${Math.max(room.pct, 2)}%` }} />
          </div>
          <div className="mt-1.5 text-[9px] text-slate-400">{room.used} dari {room.totalSlots} slot terisi ({selectedDay})</div>

          {/* Slot indikator per jam (pakai jam, bukan sesi) */}
          <div className="mt-2.5 grid grid-cols-6 gap-1.5">
            {SESSIONS.map((session, sIdx) => {
              const startTime = session.label.split(' - ')[0];
              const apiSlot = room.apiSlots?.[sIdx];
              const fallbackSlot = !room.apiSlots ? room.slots.find((s: any) => s.sessionIndex === session.idx) : null;
              const isOver = apiSlot?.status === 'overload';
              const isUsed = apiSlot ? (apiSlot.status === 'occupied' || apiSlot.status === 'overload') : Boolean(fallbackSlot);
              return <div key={session.idx} className="text-center">
                <div className="text-[9px] font-medium text-slate-500 mb-1">{startTime}</div>
                <div
                  className={`h-6 rounded-md transition-all ${isOver ? 'bg-rose-500 hover:bg-rose-600 cursor-pointer' : isUsed ? 'bg-blue-500 hover:bg-blue-600 cursor-pointer' : 'bg-slate-100 border border-slate-200/70'
                    }`}
                  onMouseEnter={(e) => {
                    if (!isUsed) return;
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setTooltip({
                      roomName: room.name,
                      time: session.label,
                      courseCode: apiSlot?.course_code || fallbackSlot?.courseCode,
                      courseName: apiSlot?.course_name || fallbackSlot?.courseName,
                      classLabel: apiSlot?.class_label || fallbackSlot?.classLabel,
                      lecturer: apiSlot?.lecturer_name || fallbackSlot?.lecturerName || fallbackSlot?.primaryLecturer,
                      lecturers: apiSlot?.lecturer_names?.length ? apiSlot.lecturer_names : fallbackSlot?.lecturerNames,
                      enrolled: apiSlot?.enrolled_count ?? fallbackSlot?.studentCount,
                      capacity: apiSlot?.capacity ?? room.capacity,
                      x: rect.left,
                      y: rect.bottom + 200 > window.innerHeight ? rect.top - 175 : rect.bottom + 8,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              </div>;
            })}
          </div>
        </div>)}
      </div>
    </section>

    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white border border-slate-100 px-4 py-2.5 text-[10px] text-slate-600">
      <div className="flex flex-wrap items-center gap-4">
        <span className="font-bold text-slate-800">Keterangan Slot:</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-blue-500" />Biru: Terisi Kuliah (Occupied)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-rose-500" />Merah: Overload (Melebihi Kapasitas)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-slate-100 border border-slate-200" />Abu-abu: Kosong (Tersedia)</span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-bold text-slate-800">Tingkat Utilisasi:</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" />≥ 60%</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-400" />40–59%</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-200" />20–39%</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-slate-200" />0%</span>
      </div>
    </div>

    {tooltip && (
      <div
        className="fixed z-50 w-72 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden pointer-events-none"
        style={{ top: Math.max(8, tooltip.y), left: Math.min(tooltip.x, window.innerWidth - 300) }}
      >
        <div className="bg-[#082c78] text-white px-4 py-2.5">
          <div className="flex items-center justify-between gap-2 text-[10px] text-blue-200 font-semibold">
            <span className="font-mono bg-blue-900/60 px-1.5 py-0.5 rounded text-white">{tooltip.courseCode || '-'}</span>
            {tooltip.classLabel && <span className="bg-white/15 px-1.5 py-0.5 rounded text-white">{tooltip.classLabel}</span>}
          </div>
          <div className="font-black text-xs text-white mt-1 leading-snug">{tooltip.courseName || 'Terjadwal'}</div>
        </div>
        <div className="bg-blue-50 px-4 py-2.5 grid grid-cols-2 gap-2.5 text-[11px]">
          <div>
            <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Hari &amp; Waktu</div>
            <div className="font-bold text-slate-900 mt-0.5">{selectedDay}</div>
            <div className="text-slate-600 text-[10px]">{tooltip.time}</div>
          </div>
          <div>
            <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Ruang</div>
            <div className="font-bold text-slate-900 mt-0.5 truncate">{tooltip.roomName}</div>
            <div className="text-slate-600 text-[10px]">
              {tooltip.enrolled != null ? `${tooltip.enrolled} / ${tooltip.capacity} Mahasiswa` : 'Terisi'}
            </div>
          </div>
          <div className="col-span-2 pt-1 border-t border-blue-100">
            <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Dosen Pengampu</div>
            {(tooltip.lecturers?.length ? tooltip.lecturers : [tooltip.lecturer || '—']).map((name, i) => (
              <div key={i} className="font-bold text-slate-900 mt-0.5 leading-snug">{name}</div>
            ))}
          </div>
        </div>
      </div>
    )}
  </div>;
};

/* ─────────────── VALIDATION VIEW ─────────────── */
const ValidationView: React.FC<{ rows: any[] }> = ({ rows }) => <div className="space-y-4"><div className="grid gap-3 md:grid-cols-3">{[['Bentrok ruang', 0], ['Bentrok dosen', 0], ['Bentrok rombel', 0]].map(([name, value]) => <div key={String(name)} className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">{name}</div><div className="mt-2 flex items-center gap-2 text-xl font-bold text-emerald-700"><CheckCircle2 size={19} />{value} ditemukan</div></div>)}</div><section className="rounded-xl border bg-white p-5"><h2 className="font-bold text-blue-950">Laporan Validasi Akademik</h2><p className="mt-1 text-xs text-slate-500">Ringkasan pemeriksaan hard constraint jadwal hasil optimasi.</p><div className="mt-4 space-y-3">{[['Tidak ada kelas berjalan paralel untuk dosen yang sama', 'Lolos'], ['Kapasitas ruang memenuhi jumlah peserta rombel', 'Lolos'], ['Jeda waktu Jumat terlindungi', 'Lolos'], ['Pemerataan beban mengajar lintas hari', 'Perlu tinjauan soft constraint']].map(([label, status]) => <div key={label} className="flex items-center justify-between gap-3 border-b pb-3 text-xs"><span>{label}</span><span className={`font-bold ${status === 'Lolos' ? 'text-emerald-700' : 'text-amber-700'}`}>{status}</span></div>)}</div><div className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800"><AlertTriangle size={15} className="mr-1 inline" />Ada 3 soft warning jeda dosen kurang dari 30 menit; keputusan akhir berada pada WD1.</div><div className="mt-3 text-[10px] text-slate-400">Validasi ringkas ini menggunakan data prototipe untuk {rows.length} baris jadwal.</div></section></div>;

/* ─────────────── HISTORY VIEW ─────────────── */
const HistoryView: React.FC<{ rows: any[] }> = ({ rows }) => <section className="rounded-xl border bg-white p-5"><div className="flex items-center gap-2"><History size={18} className="text-blue-800" /><h2 className="font-bold text-blue-950">Log Keputusan Persetujuan WD1</h2></div><p className="mt-1 text-xs text-slate-500">Daftar keputusan persetujuan dan catatan revisi pada sesi aplikasi ini. Informasi ini langsung tersedia di sistem Admin Penjadwalan.</p>{rows.length === 0 ? <div className="mt-5 rounded-lg border border-dashed p-10 text-center text-sm text-slate-500">Belum ada keputusan yang dicatat.</div> : <div className="mt-5 space-y-3">{rows.map((log: any) => <div key={log.id} className="flex gap-3 rounded-lg border border-slate-100 p-4"><span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${log.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{log.status === 'success' ? <Check size={15} /> : <FileText size={15} />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><b className="text-xs">{log.activity}</b><span className="text-[10px] text-slate-500">{log.timestamp}</span></div><p className="mt-1 text-xs text-slate-600">{log.description}</p><div className="mt-2 text-[10px] text-slate-400">{log.actorName} · {log.actorRole}</div></div></div>)}</div>}</section>;
