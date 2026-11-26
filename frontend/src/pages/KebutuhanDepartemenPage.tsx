import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  BookOpen,
  Users,
  UserCheck,
  CheckCircle2,
  Send,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  ChevronRight,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  AlertCircle,
  HelpCircle,
  Sliders,
  X,
  RefreshCw,
  Sparkles,
  Building,
  Check,
  Download,
  Tag,
} from 'lucide-react';
import { BackendClassItem, AdjustClassPayload } from '../services/api';

export const KebutuhanDepartemenPage: React.FC = () => {
  const {
    backendClasses,
    backendCourses,
    backendStatus,
    addBackendClass,
    adjustBackendClass,
    deleteBackendClass,
    resetBackendClassesToCSV,
    setActivePage,
    showToast,
  } = useApp();

  const [activeDeptTab, setActiveDeptTab] = useState<'SI' | 'IF' | 'TK'>('SI');
  const [selectedPrefixFilter, setSelectedPrefixFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedRoomType, setSelectedRoomType] = useState<string>('all');
  const [selectedRequiresRoom, setSelectedRequiresRoom] = useState<string>('all');

  // Modal for class adjustment (F-14 / F-15)
  const [editingClass, setEditingClass] = useState<BackendClassItem | null>(null);
  const [editForm, setEditForm] = useState<AdjustClassPayload>({});

  // Modal for adding a new class
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
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
    lecturer_names: 'Dosen Departemen',
  });

  const handleSelectDeptTab = (dept: 'SI' | 'IF' | 'TK') => {
    setActiveDeptTab(dept);
    setSelectedPrefixFilter('all');
  };

  // Filter backend classes (from CSV)
  const filteredClasses = backendClasses.filter((c) => {
    if (c.department.toUpperCase() !== activeDeptTab) return false;

    // Filter by Course Code Prefix
    if (selectedPrefixFilter !== 'all') {
      const p = c.course_code.toUpperCase().slice(0, 3);
      if (selectedPrefixFilter === 'MKU') {
        if (!['MWU', 'AND'].includes(p)) return false;
      } else {
        if (p !== selectedPrefixFilter) return false;
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
    return true;
  });

  const deptCounts = {
    SI: backendClasses.filter((c) => c.department.toUpperCase() === 'SI').length,
    IF: backendClasses.filter((c) => c.department.toUpperCase() === 'IF').length,
    TK: backendClasses.filter((c) => c.department.toUpperCase() === 'TK').length,
  };

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
      case 'MWU':
      case 'AND':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{p}</span>;
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

  const handleDeleteClass = async (classId: string) => {
    if (window.confirm(`Yakin ingin membatalkan/menghapus kelas ${classId} dari jadwal?`)) {
      await deleteBackendClass(classId);
      if (editingClass?.id === classId) {
        setEditingClass(null);
      }
    }
  };

  const handleSelectCoursePreset = (kodeMk: string) => {
    const found = backendCourses.find((c) => c.kode_mk === kodeMk);
    if (!found) return;
    setNewClassForm((prev) => ({
      ...prev,
      course_code: found.kode_mk,
      name: found.nama_mk,
      semester: found.semester_paket,
      sks: found.sks,
      room_type_needed: found.jenis_mk.toLowerCase().includes('praktikum') ? 'Lab' : 'Teori',
      requires_room: !found.jenis_mk.toLowerCase().includes('non-ruang'),
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
      'requires_accessibility', 'is_transition_course', 'lecturer_ids', 'lecturer_names'
    ];
    const rows = target.map((c) => [
      c.id, c.course_code, c.department, c.semester, `"${c.name}"`, c.class_label,
      c.sks, c.enrolled_count, c.enrolled_is_estimated, c.room_type_needed,
      c.is_mandatory, c.is_elective, c.rombel_key, c.requires_room,
      c.requires_accessibility, c.is_transition_course,
      `"${c.lecturer_ids.join(';')}"`, `"${c.lecturer_names.join('/')}"`
    ]);
    const csvStr = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    showToast(`File CSV ${filename} berhasil diunduh (${target.length} baris kelas).`, 'success');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mb-1">
            <span>Beranda</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span>Kebutuhan Departemen</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-800 font-semibold">Pengelolaan & Penyesuaian Kelas (PRD F-14 & F-15)</span>
          </div>

          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Penyesuaian Kelas & Kebutuhan Departemen
            </h2>
            {backendStatus === 'connected' ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Backend CP-SAT Aktif
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Mode Offline
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Data terhubung langsung dengan database MySQL (<span className="font-mono font-bold text-slate-700">siprama_db</span>) &amp; engine CP-SAT. Admin dapat menambah kelas baru, menyesuaikan kuota, SKS, tipe ruang, maupun menghapus kelas sebelum penjadwalan otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsAddClassModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Kelas ({activeDeptTab})
          </button>
          <button
            onClick={resetBackendClassesToCSV}
            title="Reset seluruh penyesuaian kembali ke file CSV awal"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Reset ke CSV Asli
          </button>

          <button
            onClick={() => handleExportCSV('dept')}
            title={`Unduh seluruh file CSV untuk ${activeDeptTab}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ekspor CSV {activeDeptTab}</span>
          </button>

          <button
            onClick={() => handleExportCSV('pure')}
            title="Unduh CSV mata kuliah prodi murni tanpa MK Umum/Fakultas"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Kode Murni</span>
          </button>

          <button
            onClick={() => setActivePage('generator_jadwal')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 shadow-md shadow-blue-700/20 active:scale-98 transition-all"
          >
            <Sparkles className="w-4 h-4 text-blue-200" />
            Jalankan Solver CP-SAT
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              TOTAL KELAS DI DATABASE
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

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              ENGINE SOLVER
            </div>
            <div className="text-2xl font-black text-emerald-600">CP-SAT 100%</div>
          </div>
        </div>
      </div>

      {/* Department Tabs with Course Code Prefixes */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => handleSelectDeptTab('SI')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeDeptTab === 'SI'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>Sistem Informasi (SI)</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${
              activeDeptTab === 'SI' ? 'bg-blue-700 text-blue-100' : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              Kode: DSI
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeDeptTab === 'SI' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {deptCounts.SI} Kelas
            </span>
          </button>

          <button
            onClick={() => handleSelectDeptTab('IF')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeDeptTab === 'IF'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>Teknik Informatika (IF)</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${
              activeDeptTab === 'IF' ? 'bg-blue-700 text-blue-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              Kode: DIF
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeDeptTab === 'IF' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {deptCounts.IF} Kelas
            </span>
          </button>

          <button
            onClick={() => handleSelectDeptTab('TK')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeDeptTab === 'TK'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>Teknik Komputer (TK)</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${
              activeDeptTab === 'TK' ? 'bg-blue-700 text-blue-100' : 'bg-purple-50 text-purple-700 border border-purple-200'
            }`}>
              Kode: CCE / ECS / SCE
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeDeptTab === 'TK' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {deptCounts.TK} Kelas
            </span>
          </button>
        </div>

        {/* Course Code Prefix Sub-Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 py-1 text-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Tag className="w-3 h-3 text-slate-400" />
            Pisahkan Kode MK:
          </span>
          <button
            onClick={() => setSelectedPrefixFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              selectedPrefixFilter === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Semua Kode ({prefixCounts.all || 0})
          </button>

          {activeDeptTab === 'TK' && (
            <>
              <button
                onClick={() => setSelectedPrefixFilter('CCE')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  selectedPrefixFilter === 'CCE'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                }`}
              >
                CCE - Inti Teknik Komputer ({prefixCounts['CCE'] || 0})
              </button>
              <button
                onClick={() => setSelectedPrefixFilter('SCE')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  selectedPrefixFilter === 'SCE'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                SCE - MIPA &amp; Sains Komputer ({prefixCounts['SCE'] || 0})
              </button>
              <button
                onClick={() => setSelectedPrefixFilter('ECS')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  selectedPrefixFilter === 'ECS'
                    ? 'bg-cyan-700 text-white shadow-xs'
                    : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200'
                }`}
              >
                ECS - Pilihan &amp; Lanjut ({prefixCounts['ECS'] || 0})
              </button>
            </>
          )}

          {activeDeptTab === 'SI' && (
            <button
              onClick={() => setSelectedPrefixFilter('DSI')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                selectedPrefixFilter === 'DSI'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              DSI - Inti &amp; Pilihan Sistem Informasi ({prefixCounts['DSI'] || 0})
            </button>
          )}

          {activeDeptTab === 'IF' && (
            <button
              onClick={() => setSelectedPrefixFilter('DIF')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                selectedPrefixFilter === 'DIF'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              DIF - Inti &amp; Praktikum Informatika ({prefixCounts['DIF'] || 0})
            </button>
          )}

          <button
            onClick={() => setSelectedPrefixFilter('MKU')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
              selectedPrefixFilter === 'MKU'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            MWU &amp; AND - MK Umum / Fakultas ({prefixCounts['MKU'] || 0})
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
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

        <div className="text-xs text-slate-500 font-medium">
          Ditemukan: <strong className="text-slate-800">{filteredClasses.length}</strong> kelas di {activeDeptTab}
        </div>
      </div>

      {/* Main Table from CSV */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
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
                <th className="py-3 px-3 text-center">Aksi (F-14 / F-15)</th>
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
                filteredClasses.map((c, idx) => (
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
                    <td className="py-3 px-2 text-center font-bold text-slate-800">
                      {c.sks}
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-slate-800">
                      <span className={c.enrolled_count > 50 ? 'text-amber-700' : 'text-slate-800'}>
                        {c.enrolled_count} Mhs
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.room_type_needed.toLowerCase() === 'lab'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {c.room_type_needed}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-700 font-semibold">
                      {c.rombel_key || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-[200px] truncate" title={c.lecturer_names.join(', ')}>
                      {c.lecturer_names.length > 0 ? c.lecturer_names.join(', ') : <span className="text-slate-400 italic">Belum Ditentukan</span>}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          title="Sesuaikan Kelas (F-14): Kuota, SKS, Dosen, Tipe Ruang"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          Sesuaikan
                        </button>
                        <button
                          onClick={() => handleDeleteClass(c.id)}
                          title="Batalkan / Hapus Kelas dari Penjadwalan (F-15)"
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Penyesuaian Kelas (F-14 & F-15) */}
      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Sesuaikan Kelas: [{editingClass.course_code}] {editingClass.name}
                  </h3>
                  <p className="text-xs text-slate-500">ID Kelas: {editingClass.id} • Modul F-14 & F-15</p>
                </div>
              </div>
              <button
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
                  <label className="block font-bold text-slate-700 mb-1">Tipe Ruangan yang Diperlukan</label>
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
                  placeholder="e.g. SI-S3-A"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dosen Pengampu (Pisahkan koma/titik koma)</label>
                <input
                  type="text"
                  value={editForm.lecturer_names ? editForm.lecturer_names.join(', ') : ''}
                  onChange={(e) => setEditForm({ ...editForm, lecturer_names: e.target.value.split(',').map((x) => x.trim()) })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                />
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
                  Kelas Membutuhkan Alokasi Ruang Fisik FTI
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteClass(editingClass.id)}
                className="px-3 py-2 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl font-bold text-xs"
              >
                Batalkan Kelas Ini (F-15)
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
                  Simpan Penyesuaian (F-14)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal Tambah Kelas Baru (Simpan ke MySQL) */}
      {isAddClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Tambah Kelas Baru — Departemen {activeDeptTab}
                </h3>
                <p className="text-xs text-slate-500">Pilih mata kuliah dari database atau input kode baru.</p>
              </div>
              <button onClick={() => setIsAddClassModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-3 text-xs">
              {backendCourses.length > 0 && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pilih dari Master Mata Kuliah (MySQL)</label>
                  <select
                    value={newClassForm.course_code}
                    onChange={(e) => handleSelectCoursePreset(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">-- Pilih Mata Kuliah atau ketik manual di bawah --</option>
                    {backendCourses.map((mk) => (
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
                    placeholder="A, B, C, Shift 1"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
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
    </div>
  );
};
