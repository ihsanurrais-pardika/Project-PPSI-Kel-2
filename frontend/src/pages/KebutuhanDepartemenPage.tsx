import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  BookOpen,
  Users,
  Plus,
  Search,
  FileSpreadsheet,
  FileText,
  Trash2,
  Sliders,
  X,
  RefreshCw,
  Sparkles,
  Building,
  Check,
  Download,
  Tag,
  AlertTriangle,
  ChevronDown,
  MoreVertical,
  Layers,
  List,
  History,
} from 'lucide-react';
import { apiService, BackendClassItem, AdjustClassPayload, DepartemenLogItem } from '../services/api';
import { mockLecturers } from '../data/mockData';

const MIN_CLASS_QUOTA = 15;

export const KebutuhanDepartemenPage: React.FC = () => {
  const {
    backendClasses,
    backendCourses,
    backendLecturers,
    activeSemesterInfo,
    backendStatus,
    addBackendClass,
    adjustBackendClass,
    cancelBackendClass,
    restoreBackendClass,
    resetBackendClassesToCSV,
    setActivePage,
    showToast,
  } = useApp();

  const minQuota = activeSemesterInfo?.kuota_minimum_kelas ?? MIN_CLASS_QUOTA;
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [deptLogs, setDeptLogs] = useState<DepartemenLogItem[]>([]);
  const [cancelledClasses, setCancelledClasses] = useState<BackendClassItem[]>([]);
  const [showCancelledPanel, setShowCancelledPanel] = useState(false);

  const [activeDeptTab, setActiveDeptTab] = useState<'SI' | 'IF' | 'TK'>('SI');
  const [selectedPrefixFilter, setSelectedPrefixFilter] = useState<string>('all');

  const loadCancelledAndLogs = async () => {
    if (backendStatus !== 'connected') return;
    try {
      const [allCls, logs] = await Promise.all([
        apiService.getClasses({ department: activeDeptTab, include_cancelled: true }).catch(() => []),
        apiService.getDepartemenLogs(activeDeptTab, 50).catch(() => []),
      ]);
      setCancelledClasses(allCls.filter((c) => c.status_kelas === 'DIBATALKAN'));
      setDeptLogs(logs);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadCancelledAndLogs();
  }, [backendStatus, activeDeptTab]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedRoomType, setSelectedRoomType] = useState<string>('all');
  const [selectedRequiresRoom, setSelectedRequiresRoom] = useState<string>('all');
  const [belowQuotaOnly, setBelowQuotaOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});

  // Header dropdowns & safety modals
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Modal for class adjustment
  const [editingClass, setEditingClass] = useState<BackendClassItem | null>(null);
  const [editForm, setEditForm] = useState<AdjustClassPayload>({});

  // Modal for safe class cancellation
  const [cancelingClass, setCancelingClass] = useState<BackendClassItem | null>(null);
  const [cancelReason, setCancelReason] = useState('Kuota peserta di bawah batas minimum kelas');

  // Modal for adding a new class
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [showAllProdiCourses, setShowAllProdiCourses] = useState(false);
  const [newClassForm, setNewClassForm] = useState({
    course_code: '',
    name: '',
    class_label: 'A',
    semester: 1,
    sks: 2,
    enrolled_count: 40,
    room_type_needed: 'Teori',
    rombel_key: 'SI-S1-A',
    requires_room: true,
    lecturer_names: '',
  });

  const masterCoursesForModal = useMemo(() => {
    if (showAllProdiCourses) return backendCourses;
    return backendCourses.filter(
      (mk) => mk.kode_prodi.toUpperCase() === activeDeptTab || mk.lintas_prodi
    );
  }, [backendCourses, activeDeptTab, showAllProdiCourses]);

  const existingLabelsForNewCourse = useMemo(() => {
    const code = newClassForm.course_code.trim().toUpperCase();
    if (!code) return [];
    return backendClasses
      .filter((c) => c.course_code.toUpperCase() === code)
      .map((c) => c.class_label)
      .sort();
  }, [backendClasses, newClassForm.course_code]);

  const isDuplicateNewClassLabel = useMemo(() => {
    const lbl = newClassForm.class_label.trim().toUpperCase();
    if (!lbl) return false;
    return existingLabelsForNewCourse.some((ex) => ex.toUpperCase() === lbl);
  }, [existingLabelsForNewCourse, newClassForm.class_label]);

  // Known lecturer names from DB lecturers + classes + mock list
  const knownLecturers = useMemo(() => {
    const names = new Set<string>(backendLecturers.map((l) => l.name));
    if (names.size === 0) {
      mockLecturers.forEach((l) => names.add(l.name));
    }
    backendClasses.forEach((c) => {
      c.lecturer_names.forEach((n) => {
        if (n && !n.toLowerCase().includes('placeholder')) names.add(n);
      });
    });
    return Array.from(names).sort();
  }, [backendLecturers, backendClasses]);

  const handleSelectDeptTab = (dept: 'SI' | 'IF' | 'TK') => {
    setActiveDeptTab(dept);
    setSelectedPrefixFilter('all');
    setExpandedCourses({});
  };

  // Filter backend classes
  const filteredClasses = useMemo(() => {
    return backendClasses.filter((c) => {
      if (c.department.toUpperCase() !== activeDeptTab) return false;

      if (selectedPrefixFilter !== 'all') {
        const p = c.course_code.toUpperCase().slice(0, 3);
        if (selectedPrefixFilter === 'MKU') {
          if (!['MWU', 'AND'].includes(p)) return false;
        } else if (p !== selectedPrefixFilter) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = c.course_code.toLowerCase().includes(q);
        const matchName = c.name.toLowerCase().includes(q);
        const matchLec = c.lecturer_names.some((l) => l.toLowerCase().includes(q));
        const matchRombel = c.rombel_key.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchLec && !matchRombel) return false;
      }

      if (selectedSemester !== 'all' && c.semester.toString() !== selectedSemester) return false;
      if (selectedRoomType !== 'all' && c.room_type_needed.toLowerCase() !== selectedRoomType.toLowerCase()) return false;
      if (selectedRequiresRoom !== 'all') {
        const req = selectedRequiresRoom === 'true';
        if (c.requires_room !== req) return false;
      }
      if (belowQuotaOnly && (!c.requires_room || c.enrolled_count >= MIN_CLASS_QUOTA)) {
        return false;
      }
      return true;
    });
  }, [
    backendClasses,
    activeDeptTab,
    selectedPrefixFilter,
    searchQuery,
    selectedSemester,
    selectedRoomType,
    selectedRequiresRoom,
    belowQuotaOnly,
  ]);

  // Group filtered classes by course_code for compact view
  const groupedCourses = useMemo(() => {
    const map = new Map<string, BackendClassItem[]>();
    filteredClasses.forEach((cls) => {
      const list = map.get(cls.course_code) || [];
      list.push(cls);
      map.set(cls.course_code, list);
    });
    return Array.from(map.entries()).map(([code, classes]) => {
      const sorted = [...classes].sort((a, b) => a.class_label.localeCompare(b.class_label));
      const first = sorted[0];
      const totalMhs = sorted.reduce((acc, c) => acc + c.enrolled_count, 0);
      const hasBelowQuota = sorted.some((c) => c.requires_room && c.enrolled_count < MIN_CLASS_QUOTA);
      const lecturers = Array.from(new Set(sorted.flatMap((c) => c.lecturer_names)));
      return {
        code,
        name: first.name,
        semester: first.semester,
        sks: first.sks,
        is_mandatory: first.is_mandatory,
        room_type_needed: first.room_type_needed,
        requires_accessibility: first.requires_accessibility,
        classes: sorted,
        totalMhs,
        hasBelowQuota,
        lecturers,
      };
    });
  }, [filteredClasses]);

  const deptCounts = {
    SI: backendClasses.filter((c) => c.department.toUpperCase() === 'SI').length,
    IF: backendClasses.filter((c) => c.department.toUpperCase() === 'IF').length,
    TK: backendClasses.filter((c) => c.department.toUpperCase() === 'TK').length,
  };

  const belowQuotaAllCount = useMemo(
    () => backendClasses.filter((c) => c.requires_room && c.enrolled_count < MIN_CLASS_QUOTA).length,
    [backendClasses]
  );

  // Prefix breakdown per active department
  const prefixCounts = useMemo(() => {
    const deptClasses = backendClasses.filter((c) => c.department.toUpperCase() === activeDeptTab);
    const counts: Record<string, number> = { all: deptClasses.length };
    deptClasses.forEach((c) => {
      const p = c.course_code.toUpperCase().slice(0, 3);
      if (['MWU', 'AND'].includes(p)) {
        counts['MKU'] = (counts['MKU'] || 0) + 1;
      } else {
        counts[p] = (counts[p] || 0) + 1;
      }
    });
    return counts;
  }, [backendClasses, activeDeptTab]);

  const renderPrefixBadge = (code: string) => {
    const p = code.toUpperCase().slice(0, 3);
    switch (p) {
      case 'CCE':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">CCE</span>;
      case 'SCE':
      case 'SSC':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">SCE</span>;
      case 'ECS':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-700 border border-cyan-200">ECS</span>;
      case 'DSI':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">DSI</span>;
      case 'DIF':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">DIF</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">{p}</span>;
    }
  };

  const handleOpenEdit = (item: BackendClassItem) => {
    setEditingClass(item);
    setEditForm({
      name: item.name,
      class_label: item.class_label,
      sks: item.sks,
      enrolled_count: item.enrolled_count,
      room_type_needed: item.room_type_needed,
      rombel_key: item.rombel_key,
      requires_room: item.requires_room,
      lecturer_names: [...item.lecturer_names],
    });
  };

  const handleSaveEdit = async () => {
    if (!editingClass) return;
    const ok = await adjustBackendClass(editingClass.id, editForm);
    if (ok) {
      setEditingClass(null);
    }
  };

  const openCancelModal = (item: BackendClassItem) => {
    setCancelingClass(item);
    const isLow = item.requires_room && item.enrolled_count < MIN_CLASS_QUOTA;
    setCancelReason(
      isLow
        ? `Peserta (${item.enrolled_count} mhs) di bawah kuota minimum (${MIN_CLASS_QUOTA})`
        : 'Pembatalan atau penggabungan kelas oleh Admin'
    );
  };

  const handleConfirmCancel = async () => {
    if (!cancelingClass) return;
    const ok = await cancelBackendClass(
      cancelingClass.id,
      cancelReason.trim() || 'Pembatalan kelas oleh Admin'
    );
    if (ok) {
      if (editingClass?.id === cancelingClass.id) setEditingClass(null);
      setCancelingClass(null);
      await loadCancelledAndLogs();
    }
  };

  const handleDownloadBackendDoc = async (format: 'excel' | 'pdf') => {
    setExportMenuOpen(false);
    try {
      await apiService.downloadExportFile(format, activeDeptTab, false);
      showToast(
        `Dokumen ${format === 'excel' ? 'Excel (.xlsx)' : 'Surat Pengajuan (.pdf)'} ${activeDeptTab} berhasil diunduh.`,
        'success'
      );
    } catch (err: any) {
      showToast(`Gagal mengunduh dokumen: ${err.message}`, 'error');
    }
  };

  const handleSelectCoursePreset = (kodeMk: string) => {
    const found = backendCourses.find((c) => c.kode_mk === kodeMk);
    if (!found) return;
    const existing = backendClasses.filter((c) => c.course_code.toUpperCase() === found.kode_mk.toUpperCase());
    const usedLabels = new Set(existing.map((c) => c.class_label.toUpperCase()));
    let nextLabel = 'A';
    for (let code = 65; code <= 90; code += 1) {
      const cand = String.fromCharCode(code);
      if (!usedLabels.has(cand)) {
        nextLabel = cand;
        break;
      }
    }
    const existingLecturers = existing[0]?.lecturer_names?.join(', ') || '';

    setNewClassForm((prev) => ({
      ...prev,
      course_code: found.kode_mk,
      name: found.nama_mk,
      class_label: nextLabel,
      semester: found.semester_paket,
      sks: found.sks,
      room_type_needed: found.jenis_mk.toLowerCase().includes('praktikum') ? 'Lab' : 'Teori',
      requires_room: !found.jenis_mk.toLowerCase().includes('non-ruang'),
      rombel_key: `${activeDeptTab}-S${found.semester_paket}-${nextLabel}`,
      lecturer_names: prev.lecturer_names || existingLecturers,
    }));
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = newClassForm.course_code.trim().toUpperCase();
    const name = newClassForm.name.trim();
    const label = newClassForm.class_label.trim() || 'A';
    if (!code || !name) {
      showToast('Kode mata kuliah dan nama mata kuliah wajib diisi.', 'warning');
      return;
    }
    const ok = await addBackendClass({
      id: `${code}-${label}`,
      course_code: code,
      department: activeDeptTab,
      semester: Number(newClassForm.semester) || 1,
      name,
      class_label: label,
      sks: Number(newClassForm.sks) || 2,
      enrolled_count: Number(newClassForm.enrolled_count) || 40,
      enrolled_is_estimated: false,
      room_type_needed: newClassForm.room_type_needed || 'Teori',
      is_mandatory: true,
      is_elective: false,
      rombel_key: newClassForm.rombel_key.trim() || `${activeDeptTab}-S${newClassForm.semester}-${label}`,
      requires_room: newClassForm.requires_room,
      requires_accessibility: false,
      is_transition_course: false,
      lecturer_ids: [],
      lecturer_names: newClassForm.lecturer_names.split(',').map((s) => s.trim()).filter(Boolean),
    });
    if (ok) {
      setIsAddClassModalOpen(false);
    }
  };

  const handleExportCSV = (scope: 'dept' | 'pure' | 'filtered' = 'dept') => {
    setExportMenuOpen(false);
    let target = filteredClasses;
    let filename = `classes_${activeDeptTab.toLowerCase()}_terfilter.csv`;

    if (scope === 'dept') {
      target = backendClasses.filter((c) => c.department.toUpperCase() === activeDeptTab);
      filename = `classes_${activeDeptTab === 'TK' ? 'teknik_komputer' : activeDeptTab === 'SI' ? 'sistem_informasi' : 'teknik_informatika'}.csv`;
    } else if (scope === 'pure') {
      const purePrefixes = activeDeptTab === 'TK' ? ['CCE', 'SCE', 'ECS', 'SSC'] : activeDeptTab === 'SI' ? ['DSI'] : ['DIF'];
      target = backendClasses.filter((c) => c.department.toUpperCase() === activeDeptTab && purePrefixes.includes(c.course_code.toUpperCase().slice(0, 3)));
      filename = `classes_${activeDeptTab.toLowerCase()}_pure.csv`;
    }

    const header = [
      'id', 'course_code', 'department', 'semester', 'name', 'class_label',
      'sks', 'enrolled_count', 'enrolled_is_estimated', 'room_type_needed',
      'is_mandatory', 'is_elective', 'rombel_key', 'requires_room',
      'requires_accessibility', 'is_transition_course', 'lecturer_ids', 'lecturer_names',
    ];
    const rows = target.map((c) => [
      c.id, c.course_code, c.department, c.semester, `"${c.name}"`, c.class_label,
      c.sks, c.enrolled_count, c.enrolled_is_estimated, c.room_type_needed,
      c.is_mandatory, c.is_elective, c.rombel_key, c.requires_room,
      c.requires_accessibility, c.is_transition_course,
      `"${c.lecturer_ids.join(';')}"`, `"${c.lecturer_names.join('/')}"`,
    ]);
    const csvStr = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`File ${filename} berhasil diunduh (${target.length} baris kelas).`, 'success');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Simplified Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Tawaran Mata Kuliah &amp; Penyesuaian Kelas
            </h2>
            {backendStatus === 'connected' ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Terhubung Database
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Mode Offline
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Kelola gabungan kebutuhan kelas seluruh prodi FTI (SI, IF, TK) sebelum penyusunan jadwal otomatis.
          </p>
        </div>

        {/* Clean 2 Primary Actions + 1 Overflow Menu */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddClassModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Kelas ({activeDeptTab})
          </button>

          {/* Unified Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setExportMenuOpen((prev) => !prev);
                setMoreMenuOpen(false);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Ekspor</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-40 text-xs">
                <button
                  type="button"
                  onClick={() => void handleDownloadBackendDoc('excel')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 font-medium text-slate-700 flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Excel Rekap Kebutuhan (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleDownloadBackendDoc('pdf')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 font-medium text-slate-700 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-rose-600" />
                  <span>Surat Pengajuan Resmi (.pdf)</span>
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => handleExportCSV('dept')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  <span>CSV Semua Kelas ({activeDeptTab})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportCSV('pure')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>CSV Kode Prodi Murni</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportCSV('filtered')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                  <span>CSV Hasil Filter Saat Ini</span>
                </button>
              </div>
            )}
          </div>

          {/* Overflow Menu for Secondary / Destructive Actions */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setMoreMenuOpen((prev) => !prev);
                setExportMenuOpen(false);
              }}
              title="Aksi Lanjutan"
              className="p-2 rounded-xl text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {moreMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-40 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    void loadCancelledAndLogs();
                    setLogsModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 font-semibold text-slate-700 flex items-center gap-2"
                >
                  <History className="w-4 h-4 text-slate-500" />
                  <span>Riwayat Perubahan ({deptLogs.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setActivePage('generator_jadwal');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 font-semibold text-blue-800 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Buka Buat Jadwal Otomatis</span>
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setConfirmResetOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 font-semibold text-rose-700 flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4 text-rose-600" />
                  <span>Reset Data ke CSV Awal</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4 Summary Stat Cards (4th card is actionable: Below Minimum Quota) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              TOTAL KELAS AKTIF
            </div>
            <div className="text-2xl font-black text-slate-900">{backendClasses.length} Kelas</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              KELAS BUTUH RUANGAN
            </div>
            <div className="text-2xl font-black text-indigo-700">
              {backendClasses.filter((c) => c.requires_room).length} Kelas
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              RATA-RATA KUOTA PESERTA
            </div>
            <div className="text-2xl font-black text-purple-700">
              {backendClasses.length > 0
                ? Math.round(backendClasses.reduce((acc, c) => acc + c.enrolled_count, 0) / backendClasses.length)
                : 0}{' '}
              Mhs/Kls
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setBelowQuotaOnly((prev) => !prev)}
          className={`p-4 rounded-2xl border shadow-xs flex items-center gap-3.5 text-left transition-all ${
            belowQuotaOnly
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              belowQuotaAllCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              DI BAWAH KUOTA (&lt; {MIN_CLASS_QUOTA} MHS)
            </div>
            <div
              className={`text-2xl font-black ${
                belowQuotaAllCount > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {belowQuotaAllCount} Kelas
            </div>
          </div>
        </button>
      </div>

      {/* Department Tabs with Course Code Prefixes */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleSelectDeptTab('SI')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeDeptTab === 'SI'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>Sistem Informasi (SI)</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  activeDeptTab === 'SI' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {deptCounts.SI}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectDeptTab('IF')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeDeptTab === 'IF'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>Teknik Informatika (IF)</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  activeDeptTab === 'IF' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {deptCounts.IF}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectDeptTab('TK')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeDeptTab === 'TK'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>Teknik Komputer (TK)</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  activeDeptTab === 'TK' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {deptCounts.TK}
              </span>
            </button>
          </div>

          {/* View Mode Switcher: Grouped per MK vs Flat per Class */}
          <div className="inline-flex rounded-xl bg-white p-0.5 border border-slate-200 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
                viewMode === 'grouped'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Ringkas per MK ({groupedCourses.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('flat')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
                viewMode === 'flat'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Semua Kelas ({filteredClasses.length})</span>
            </button>
          </div>
        </div>

        {/* Course Code Prefix Sub-Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 py-1 text-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Tag className="w-3 h-3 text-slate-400" />
            Kode MK:
          </span>
          <button
            type="button"
            onClick={() => setSelectedPrefixFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              selectedPrefixFilter === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Semua ({prefixCounts.all || 0})
          </button>

          {activeDeptTab === 'TK' && (
            <>
              <button
                type="button"
                onClick={() => setSelectedPrefixFilter('CCE')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  selectedPrefixFilter === 'CCE'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                }`}
              >
                CCE - Inti TK ({prefixCounts['CCE'] || 0})
              </button>
              <button
                type="button"
                onClick={() => setSelectedPrefixFilter('SCE')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  selectedPrefixFilter === 'SCE'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                SCE - MIPA &amp; Sains ({prefixCounts['SCE'] || 0})
              </button>
              <button
                type="button"
                onClick={() => setSelectedPrefixFilter('ECS')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  selectedPrefixFilter === 'ECS'
                    ? 'bg-cyan-700 text-white shadow-xs'
                    : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200'
                }`}
              >
                ECS - Pilihan ({prefixCounts['ECS'] || 0})
              </button>
            </>
          )}

          {activeDeptTab === 'SI' && (
            <button
              type="button"
              onClick={() => setSelectedPrefixFilter('DSI')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                selectedPrefixFilter === 'DSI'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              DSI - Prodi SI ({prefixCounts['DSI'] || 0})
            </button>
          )}

          {activeDeptTab === 'IF' && (
            <button
              type="button"
              onClick={() => setSelectedPrefixFilter('DIF')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                selectedPrefixFilter === 'DIF'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              DIF - Prodi IF ({prefixCounts['DIF'] || 0})
            </button>
          )}

          <button
            type="button"
            onClick={() => setSelectedPrefixFilter('MKU')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              selectedPrefixFilter === 'MKU'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            MWU &amp; AND - MK Umum ({prefixCounts['MKU'] || 0})
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-[280px] flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode MK, nama mata kuliah, rombel, atau dosen..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-hidden"
          >
            <option value="all">Semua Semester</option>
            <option value="1">Semester 1</option>
            <option value="3">Semester 3</option>
            <option value="5">Semester 5</option>
            <option value="7">Semester 7</option>
          </select>

          <select
            value={selectedRoomType}
            onChange={(e) => setSelectedRoomType(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-hidden"
          >
            <option value="all">Semua Tipe Ruang</option>
            <option value="Teori">Ruang Teori</option>
            <option value="Lab">Laboratorium</option>
          </select>

          <select
            value={selectedRequiresRoom}
            onChange={(e) => setSelectedRequiresRoom(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-hidden"
          >
            <option value="all">Semua Kebutuhan Ruang</option>
            <option value="true">Butuh Ruang Fisik</option>
            <option value="false">Tanpa Ruang (Online/Mandiri)</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium flex items-center gap-2.5 flex-wrap">
          <span>
            Menampilkan <strong className="text-slate-800">{filteredClasses.length}</strong> kelas ({groupedCourses.length} MK)
          </span>
          {cancelledClasses.length > 0 && (
            <button
              type="button"
              onClick={() => setShowCancelledPanel((prev) => !prev)}
              className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold hover:bg-rose-100"
            >
              {showCancelledPanel ? 'Tutup' : 'Lihat'} {cancelledClasses.length} Dibatalkan
            </button>
          )}
        </div>
      </div>

      {showCancelledPanel && cancelledClasses.length > 0 && (
        <div className="bg-white rounded-2xl border border-rose-200 p-4 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-rose-900">
              Kelas Dibatalkan — Departemen {activeDeptTab} ({cancelledClasses.length})
            </h4>
            <span className="text-[11px] text-slate-500">
              Batas kuota minimum: {minQuota} Mhs. Klik Pulihkan untuk mengaktifkan kembali.
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {cancelledClasses.map((cc) => (
              <div
                key={cc.id}
                className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-200 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 truncate">
                    [{cc.id}] {cc.name} ({cc.enrolled_count} Mhs)
                  </div>
                  <div className="text-[10px] text-rose-700 truncate">
                    Alasan: {cc.alasan_pembatalan || '-'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await restoreBackendClass(cc.id);
                    if (ok) await loadCancelledAndLogs();
                  }}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50 shrink-0"
                >
                  Pulihkan
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Table: Grouped by MK vs Flat */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {viewMode === 'grouped' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-3">No</th>
                  <th className="py-3 px-3">Kode MK</th>
                  <th className="py-3 px-4">Mata Kuliah</th>
                  <th className="py-3 px-2 text-center">SKS</th>
                  <th className="py-3 px-3">Daftar Rombel (Klik untuk Ubah)</th>
                  <th className="py-3 px-2 text-center">Total Mhs</th>
                  <th className="py-3 px-4">Dosen Pengampu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupedCourses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Tidak ada mata kuliah yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  groupedCourses.map((g, idx) => {
                    const isExpanded = !!expandedCourses[g.code];
                    return (
                      <React.Fragment key={g.code}>
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                            {String(idx + 1).padStart(2, '0')}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-blue-700">
                              {renderPrefixBadge(g.code)}
                              <span>{g.code}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{g.name}</span>
                              {g.hasBelowQuota && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-bold">
                                  &lt; {MIN_CLASS_QUOTA} Mhs
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {g.is_mandatory ? 'Wajib' : 'Pilihan'} • Semester {g.semester} • {g.room_type_needed}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-slate-800">{g.sks}</td>
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {g.classes.map((cl) => {
                                const isLow = cl.requires_room && cl.enrolled_count < MIN_CLASS_QUOTA;
                                return (
                                  <button
                                    key={cl.id}
                                    type="button"
                                    onClick={() => handleOpenEdit(cl)}
                                    title={`Klik untuk sesuaikan ${cl.id}`}
                                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors ${
                                      isLow
                                        ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                        : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                    }`}
                                  >
                                    {cl.class_label} ({cl.enrolled_count})
                                  </button>
                                );
                              })}
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedCourses((prev) => ({
                                    ...prev,
                                    [g.code]: !prev[g.code],
                                  }))
                                }
                                className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                              >
                                {isExpanded ? 'Tutup' : 'Detail'}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-slate-800">
                            {g.totalMhs}
                          </td>
                          <td className="py-3 px-4 text-slate-700 max-w-[220px] truncate" title={g.lecturers.join(', ')}>
                            {g.lecturers.join(', ')}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={7} className="px-6 py-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {g.classes.map((cl) => (
                                  <div
                                    key={cl.id}
                                    className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2 text-xs"
                                  >
                                    <div className="min-w-0">
                                      <div className="font-bold text-slate-800">
                                        Kelas {cl.class_label} • {cl.enrolled_count} Mhs
                                      </div>
                                      <div className="text-[10px] text-slate-500 truncate">
                                        {cl.rombel_key || '-'} • {cl.lecturer_names.join(', ')}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEdit(cl)}
                                        className="px-2 py-1 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200"
                                      >
                                        Sesuaikan
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openCancelModal(cl)}
                                        className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                                        title="Batalkan Kelas"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-3">No</th>
                  <th className="py-3 px-3">ID Kelas</th>
                  <th className="py-3 px-3">Kode MK</th>
                  <th className="py-3 px-4">Nama Mata Kuliah</th>
                  <th className="py-3 px-2 text-center">Kelas</th>
                  <th className="py-3 px-2 text-center">SKS</th>
                  <th className="py-3 px-2 text-center">Kuota</th>
                  <th className="py-3 px-3">Tipe Ruang</th>
                  <th className="py-3 px-3">Rombel</th>
                  <th className="py-3 px-4">Dosen Pengampu</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClasses.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">
                      Tidak ada kelas yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredClasses.map((c, idx) => {
                    const isLow = c.requires_room && c.enrolled_count < MIN_CLASS_QUOTA;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] font-bold text-slate-600">
                          {c.id}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-blue-700">
                            {renderPrefixBadge(c.course_code)}
                            <span>{c.course_code}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{c.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {c.is_mandatory ? 'Wajib' : 'Pilihan'} • Semester {c.semester}
                            {c.requires_accessibility && ' • Ramah Disabilitas'}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-slate-800">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {c.class_label}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-slate-800">{c.sks}</td>
                        <td className="py-3 px-2 text-center font-bold">
                          <span
                            className={
                              isLow
                                ? 'px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300'
                                : c.enrolled_count > 50
                                ? 'text-amber-700'
                                : 'text-slate-800'
                            }
                          >
                            {c.enrolled_count} Mhs
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.room_type_needed.toLowerCase() === 'lab'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {c.room_type_needed}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-700 font-semibold">
                          {c.rombel_key || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-700 max-w-[200px] truncate" title={c.lecturer_names.join(', ')}>
                          {c.lecturer_names.length > 0 ? (
                            c.lecturer_names.join(', ')
                          ) : (
                            <span className="text-slate-400 italic">Belum Ditentukan</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(c)}
                              title="Sesuaikan Kelas"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                              Sesuaikan
                            </button>
                            <button
                              type="button"
                              onClick={() => openCancelModal(c)}
                              title="Batalkan Kelas"
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Penyesuaian Kelas */}
      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Sesuaikan Kelas: [{editingClass.course_code}] {editingClass.name}
                  </h3>
                  <p className="text-xs text-slate-500">ID Kelas: {editingClass.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingClass(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Label Kelas / Rombel</label>
                  <input
                    type="text"
                    value={editForm.class_label || ''}
                    onChange={(e) => setEditForm({ ...editForm, class_label: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kuota Peserta (Mahasiswa)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={editForm.enrolled_count || 0}
                    onChange={(e) => setEditForm({ ...editForm, enrolled_count: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-blue-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Durasi SKS</label>
                  <select
                    value={editForm.sks || 2}
                    onChange={(e) => setEditForm({ ...editForm, sks: parseInt(e.target.value) || 2 })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  >
                    <option value={1}>1 SKS (1 Slot)</option>
                    <option value={2}>2 SKS (1 Slot)</option>
                    <option value={3}>3 SKS (2 Slot)</option>
                    <option value={4}>4 SKS (2 Slot)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipe Ruangan</label>
                  <select
                    value={editForm.room_type_needed || 'Teori'}
                    onChange={(e) => setEditForm({ ...editForm, room_type_needed: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  >
                    <option value="Teori">Ruang Teori Reguler</option>
                    <option value="Lab">Laboratorium Komputer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Rombel Key (Identitas Cohort)</label>
                <input
                  type="text"
                  value={editForm.rombel_key || ''}
                  onChange={(e) => setEditForm({ ...editForm, rombel_key: e.target.value })}
                  placeholder="mis. SI-S3-A"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dosen Pengampu</label>
                <div className="space-y-1.5">
                  <select
                    value=""
                    onChange={(e) => {
                      const picked = e.target.value;
                      if (!picked) return;
                      const current = editForm.lecturer_names || [];
                      if (!current.includes(picked)) {
                        setEditForm({ ...editForm, lecturer_names: [...current, picked] });
                      }
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">+ Pilih cepat dari daftar dosen...</option>
                    {knownLecturers.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={editForm.lecturer_names ? editForm.lecturer_names.join(', ') : ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        lecturer_names: e.target.value.split(',').map((x) => x.trim()),
                      })
                    }
                    placeholder="Pisahkan beberapa dosen dengan koma"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  id="req_room"
                  checked={editForm.requires_room ?? true}
                  onChange={(e) => setEditForm({ ...editForm, requires_room: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="req_room" className="font-semibold text-slate-700 select-none">
                  Kelas membutuhkan alokasi ruang fisik FTI
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => openCancelModal(editingClass)}
                className="px-3 py-2 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl font-bold text-xs"
              >
                Batalkan Kelas Ini
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold text-xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Kelas Baru */}
      {isAddClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Tambah Kelas Baru — Departemen {activeDeptTab}
                </h3>
                <p className="text-xs text-slate-500">Pilih mata kuliah dari database atau ketik kode baru.</p>
              </div>
              <button type="button" onClick={() => setIsAddClassModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-3 text-xs">
              {backendCourses.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Pilih dari Master Mata Kuliah</label>
                    <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showAllProdiCourses}
                        onChange={(e) => setShowAllProdiCourses(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Tampilkan MK prodi lain</span>
                    </label>
                  </div>
                  <select
                    value={newClassForm.course_code}
                    onChange={(e) => handleSelectCoursePreset(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">-- Pilih Mata Kuliah atau ketik manual di bawah --</option>
                    {masterCoursesForModal.map((mk) => (
                      <option key={mk.id_mk} value={mk.kode_mk}>
                        [{mk.kode_prodi}] {mk.kode_mk} — {mk.nama_mk} ({mk.sks} SKS)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kode MK *</label>
                  <input
                    type="text"
                    required
                    value={newClassForm.course_code}
                    onChange={(e) => setNewClassForm({ ...newClassForm, course_code: e.target.value })}
                    placeholder="Contoh: DSI61101"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Label Kelas *</label>
                  <input
                    type="text"
                    required
                    value={newClassForm.class_label}
                    onChange={(e) => setNewClassForm({ ...newClassForm, class_label: e.target.value })}
                    placeholder="A, B, C"
                    className={`w-full px-3 py-1.5 rounded-lg border ${
                      isDuplicateNewClassLabel ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                    }`}
                  />
                  {existingLabelsForNewCourse.length > 0 && (
                    <div
                      className={`text-[10px] mt-1 font-semibold ${
                        isDuplicateNewClassLabel ? 'text-rose-600' : 'text-slate-500'
                      }`}
                    >
                      {isDuplicateNewClassLabel
                        ? `Kelas ${newClassForm.course_code.toUpperCase()}-${newClassForm.class_label} sudah ada! Pilih huruf lain.`
                        : `Rombel yang sudah ada: ${existingLabelsForNewCourse.join(', ')}`}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Mata Kuliah *</label>
                <input
                  type="text"
                  required
                  value={newClassForm.name}
                  onChange={(e) => setNewClassForm({ ...newClassForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Semester</label>
                  <select
                    value={newClassForm.semester}
                    onChange={(e) => setNewClassForm({ ...newClassForm, semester: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">SKS</label>
                  <select
                    value={newClassForm.sks}
                    onChange={(e) => setNewClassForm({ ...newClassForm, sks: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  >
                    {[1, 2, 3, 4].map((s) => (
                      <option key={s} value={s}>{s} SKS</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kuota Mhs</label>
                  <input
                    type="number"
                    min={1}
                    max={150}
                    value={newClassForm.enrolled_count}
                    onChange={(e) => setNewClassForm({ ...newClassForm, enrolled_count: Number(e.target.value) || 40 })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dosen Pengampu</label>
                <div className="space-y-1.5">
                  <select
                    value=""
                    onChange={(e) => {
                      const picked = e.target.value;
                      if (!picked) return;
                      const current = newClassForm.lecturer_names
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean);
                      if (!current.includes(picked)) {
                        setNewClassForm({
                          ...newClassForm,
                          lecturer_names: [...current, picked].join(', '),
                        });
                      }
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">+ Pilih dari daftar dosen...</option>
                    {knownLecturers.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newClassForm.lecturer_names}
                    onChange={(e) => setNewClassForm({ ...newClassForm, lecturer_names: e.target.value })}
                    placeholder="Atau ketik nama dosen (pisahkan koma jika tandem)"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddClassModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                >
                  Simpan ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Pembatalan Kelas */}
      {cancelingClass && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-rose-200 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  Konfirmasi Pembatalan Kelas {cancelingClass.id}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {cancelingClass.name} ({cancelingClass.enrolled_count} Mahasiswa). Kelas yang dibatalkan akan dikeluarkan dari penjadwalan.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alasan Pembatalan <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-rose-500 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelingClass(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!cancelReason.trim()}
                onClick={() => void handleConfirmCancel()}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50"
              >
                Ya, Batalkan Kelas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Riwayat Perubahan Kebutuhan */}
      {logsModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-700" />
                <h4 className="font-bold text-sm text-slate-900">
                  Riwayat Perubahan Kebutuhan — {activeDeptTab}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setLogsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {deptLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Belum ada riwayat perubahan kebutuhan tercatat di database.
                </div>
              ) : (
                deptLogs.map((log) => (
                  <div key={log.id_perubahan} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold text-[10px]">
                          {log.jenis_aksi}
                        </span>
                        <span className="font-bold text-slate-800">
                          {log.kode_mk}{log.kode_kelas ? `-${log.kode_kelas}` : ''}
                        </span>
                        <span className="text-[10px] text-slate-400">oleh {log.actor_name}</span>
                      </div>
                      {(log.nilai_lama || log.nilai_baru) && (
                        <div className="text-slate-600 mt-0.5">
                          {log.nilai_lama ? `${log.nilai_lama} → ` : ''}
                          {log.nilai_baru || ''}
                        </div>
                      )}
                      {log.alasan && (
                        <div className="text-[11px] text-slate-500 italic">Alasan: {log.alasan}</div>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {log.waktu_perubahan.replace('T', ' ')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Reset ke CSV Awal (Destructive Guard) */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-rose-200 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  Reset Seluruh Kelas ke CSV Awal?
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Tindakan ini akan mengembalikan seluruh daftar mata kuliah, kelas, dan kuota ke data bawaan CSV seed. Penambahan atau penyesuaian kelas manual sebelumnya dapat tertimpa.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmResetOpen(false);
                  void resetBackendClassesToCSV();
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Ya, Reset Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
