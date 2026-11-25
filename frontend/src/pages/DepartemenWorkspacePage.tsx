import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  BookOpen,
  Users,
  Plus,
  Search,
  FileSpreadsheet,
  FileText,
  Sliders,
  X,
  Send,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Layers,
  Sparkles,
  HelpCircle,
  LogOut,
  ChevronRight,
  Info,
  Download,
  Printer,
  ShieldCheck,
  Building,
  Check,
  AlertTriangle,
  Menu,
} from 'lucide-react';
import { CourseOffering, ClassRombel, Lecturer } from '../types';
import { mockLecturers } from '../data/mockData';

type DeptView = 'daftar_mk' | 'input_mk' | 'ekspor' | 'pedoman' | 'riwayat';

export const DepartemenWorkspacePage: React.FC = () => {
  const {
    currentUser,
    currentRole,
    courses,
    addCourse,
    updateCourse,
    deleteCourse,
    cancelClassOffering,
    addClassToCourse,
    logout,
    showToast,
  } = useApp();

  // Determine current active department based on user role or fallback
  const getInitialDept = (): 'Sistem Informasi' | 'Informatika' | 'Teknik Komputer' => {
    if (currentRole === 'departemen_if') return 'Informatika';
    if (currentRole === 'departemen_tk') return 'Teknik Komputer';
    return 'Sistem Informasi';
  };

  const [activeDept, setActiveDept] = useState<'Sistem Informasi' | 'Informatika' | 'Teknik Komputer'>(getInitialDept());
  const [view, setView] = useState<DeptView>('daftar_mk');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Status submission state
  const [submissionStatus, setSubmissionStatus] = useState<'Draft' | 'Diajukan ke Fakultas' | 'Diterima'>('Draft');

  // Modal State for Class Action (F-14 / F-15)
  const [classActionCourse, setClassActionCourse] = useState<CourseOffering | null>(null);
  const [newClassName, setNewClassName] = useState('Kelas C');
  const [newClassCapacity, setNewClassCapacity] = useState(40);

  // Form Input State (UC-03)
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formSemester, setFormSemester] = useState<number>(1);
  const [formSks, setFormSks] = useState<number>(3);
  const [formTheorySks, setFormTheorySks] = useState<number>(2);
  const [formPracticeSks, setFormPracticeSks] = useState<number>(1);
  const [formIsMandatory, setFormIsMandatory] = useState<boolean>(true);
  const [formClasses, setFormClasses] = useState<ClassRombel[]>([
    { id: `cl-${Date.now()}-1`, name: 'Kelas A', capacity: 40, enrolled: 40 },
    { id: `cl-${Date.now()}-2`, name: 'Kelas B', capacity: 40, enrolled: 40 },
  ]);
  const [formPrimaryLecturerId, setFormPrimaryLecturerId] = useState<string>(mockLecturers[0].id);
  const [formTandemIds, setFormTandemIds] = useState<string[]>([]);
  const [formPreferredDays, setFormPreferredDays] = useState<string[]>(['Senin', 'Rabu']);
  const [formTimeSlot, setFormTimeSlot] = useState<'Sesi Pagi' | 'Sesi Siang' | 'Sesi Sore'>('Sesi Pagi');
  const [formAvoidFriday, setFormAvoidFriday] = useState(true);
  const [formMaxOneSession, setFormMaxOneSession] = useState(true);
  const [formSpecialNote, setFormSpecialNote] = useState('');

  // Filter department's courses
  const deptCourses = useMemo(() => {
    return courses.filter((c) => {
      if (c.department !== activeDept) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          c.code.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.primaryLecturer.name.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (selectedSemester !== 'all' && c.semester.toString() !== selectedSemester) return false;
      if (selectedType !== 'all') {
        if (selectedType === 'wajib' && !c.isMandatory) return false;
        if (selectedType === 'pilihan' && c.isMandatory) return false;
      }
      return true;
    });
  }, [courses, activeDept, searchQuery, selectedSemester, selectedType]);

  // Statistics
  const totalMk = deptCourses.length;
  const totalRombel = deptCourses.reduce((sum, c) => sum + c.classes.length, 0);
  const totalSks = deptCourses.reduce((sum, c) => sum + c.sks, 0);
  const totalEstMhs = deptCourses.reduce((sum, c) => sum + c.totalEnrolledEst, 0);

  // Form helper: Add rombel
  const handleAddFormClass = () => {
    const char = String.fromCharCode(65 + formClasses.length);
    const newCls: ClassRombel = {
      id: `cl-${Date.now()}`,
      name: `Kelas ${char}`,
      capacity: 40,
      enrolled: 40,
    };
    setFormClasses([...formClasses, newCls]);
    showToast(`Rombel Kelas ${char} ditambahkan.`, 'info');
  };

  const handleRemoveFormClass = (idx: number) => {
    if (formClasses.length <= 1) {
      showToast('Minimal harus ada 1 rombel kelas.', 'warning');
      return;
    }
    setFormClasses(formClasses.filter((_, i) => i !== idx));
  };

  const toggleDay = (day: string) => {
    if (formPreferredDays.includes(day)) {
      setFormPreferredDays(formPreferredDays.filter((d) => d !== day));
    } else {
      setFormPreferredDays([...formPreferredDays, day]);
    }
  };

  // Submit Form Input (UC-03)
  const handleSaveCourse = (asDraft: boolean) => {
    if (!formCode.trim() || !formName.trim()) {
      showToast('Kode Mata Kuliah dan Nama Mata Kuliah wajib diisi (PRD UC-03)!', 'error');
      return;
    }

    const primary = mockLecturers.find((l) => l.id === formPrimaryLecturerId) || mockLecturers[0];
    const tandems = mockLecturers.filter((l) => formTandemIds.includes(l.id));

    const specialConstraints: string[] = [];
    if (formAvoidFriday) specialConstraints.push('Hindari Jumat Siang');
    if (formMaxOneSession) specialConstraints.push('Maksimal 1 Sesi / Hari');
    if (formSpecialNote.trim()) specialConstraints.push(formSpecialNote.trim());

    const totalCapacity = formClasses.reduce((sum, c) => sum + c.capacity, 0);

    const newOffering: Partial<CourseOffering> = {
      code: formCode.trim().toUpperCase(),
      name: formName.trim(),
      sks: formSks,
      theorySks: formTheorySks,
      practiceSks: formPracticeSks,
      department: activeDept,
      semester: formSemester,
      curriculum: 'Kurikulum OBE 2024',
      isMandatory: formIsMandatory,
      totalEnrolledEst: totalCapacity,
      classes: formClasses,
      primaryLecturer: primary,
      tandemLecturers: tandems,
      preferredDays: formPreferredDays.length > 0 ? formPreferredDays : ['Senin'],
      preferredTimeSlot: formTimeSlot,
      specialConstraints,
      recommendedRoomType: formPracticeSks > 0 ? 'Lab Komputer' : 'Ruang Teori Standar',
      status: asDraft ? 'Draft' : 'Submitted',
    };

    addCourse(newOffering);
    showToast(`Mata kuliah [${newOffering.code}] ${newOffering.name} berhasil disimpan (UC-03).`, 'success');

    // Reset form
    setFormCode('');
    setFormName('');
    setView('daftar_mk');
  };

  // Export handlers (UC-04)
  const handleExportExcel = () => {
    showToast(`Menghasilkan berkas Excel (.xlsx) untuk ${activeDept}...`, 'info');
    setTimeout(() => {
      showToast(`Berkas Usulan_MK_${activeDept.replace(/\s+/g, '_')}_Ganjil_2024.xlsx berhasil diunduh (UC-04).`, 'success');
    }, 700);
  };

  const handleExportPdf = () => {
    showToast(`Menyusun format resmi Surat Pengajuan Kebutuhan Perkuliahan PDF...`, 'info');
    setTimeout(() => {
      showToast(`Berkas Surat_Usulan_Kebutuhan_${activeDept.replace(/\s+/g, '_')}.pdf berhasil diunduh (UC-04).`, 'success');
    }, 700);
  };

  const handleSendToFaculty = () => {
    setSubmissionStatus('Diajukan ke Fakultas');
    showToast(`Seluruh berkas usulan perkuliahan ${activeDept} resmi dikirimkan ke Admin Penjadwalan Fakultas!`, 'success');
  };

  // Department metadata
  const deptMeta = {
    'Sistem Informasi': {
      code: 'DSI',
      kaprodi: 'Ricky Akbar, M.Kom.',
      nip: '19840915 200812 1 002',
      rules: [
        'Seluruh Mata Kuliah Pilihan (CRM, Pemrograman Framework, NLP Terapan, Blockchain) diusulkan dijadwalkan pada hari yang sama (PRD 5.2).',
        'Mengakomodasi kelas penyesuaian transisi kurikulum antar-angkatan.',
        'Koordinasi jadwal dosen service dengan fakultas luar (MIPA/Teknik).',
      ],
      docNo: 'Surat Ketua DSI No. 228/UN.16.15.3.2/PK.01.00/2026',
    },
    'Informatika': {
      code: 'DIF',
      kaprodi: 'Dr. Ir. Wahyudi, S.T., M.T.',
      nip: '19760724 200212 1 001',
      rules: [
        'Mengakomodasi kelas berkapasitas besar (Sem 1: 89 mhs, Sem 3: 82 mhs) terbagi 2 kelas teori dan 3 kelas praktikum.',
        'Sinkronisasi ketat jadwal antara teori (2 SKS) dan praktikum pendamping (1 SKS) tim tandem.',
        'Kapasitas Lab Software 1 & 2 maksimal 40 PC per rombel.',
      ],
      docNo: 'Surat Ketua DIF No. 234/UN.16.15.3.3/PK.01.00/2026',
    },
    'Teknik Komputer': {
      code: 'DTK',
      kaprodi: 'Dr. Eng. Tati Erlina, M.IT.',
      nip: '19790412 200604 2 001',
      rules: [
        'Mata kuliah berbobot 3 SKS diprioritaskan pada Shift-1 (07:30 - 10:00).',
        'Mata kuliah berbobot 2 SKS diminta tidak dijadwalkan pada shift pukul 11:00.',
        'Matematika 1, Matematika 3, dan Aljabar Linear diprioritaskan Shift-1.',
        'Perkuliahan yang diampu Dosen DTK tidak dijadwalkan pada Hari Kamis Shift 1 dan 2.',
      ],
      docNo: 'Surat Ketua DTK No. B/131/UN16.15.3.1/PK.01.00/2026',
    },
  }[activeDept];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row text-slate-800 font-sans">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden"
        />
      )}

      {/* Sidebar Khusus Departemen */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 transition-transform lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Brand header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#082c78] flex items-center justify-center text-white font-black text-xs shadow-xs">
              FTI
            </div>
            <div>
              <div className="font-extrabold text-xs text-slate-900 leading-tight">
                UNIVERSITAS ANDALAS
              </div>
              <div className="text-[10px] text-slate-500 font-semibold leading-tight">
                Konsol Departemen Akademik
              </div>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dept Selector Badge */}
        <div className="p-3">
          <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-100">
            <div className="text-[9px] uppercase tracking-wider font-bold text-blue-600 mb-1">
              Departemen Pengelola:
            </div>
            <select
              value={activeDept}
              onChange={(e) => setActiveDept(e.target.value as any)}
              className="w-full text-xs font-bold text-blue-950 bg-white border border-blue-200 rounded-lg p-1.5 focus:outline-hidden"
            >
              <option value="Sistem Informasi">Departemen Sistem Informasi</option>
              <option value="Informatika">Departemen Informatika</option>
              <option value="Teknik Komputer">Departemen Teknik Komputer</option>
            </select>
            <div className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Kaprodi: {deptMeta.kaprodi}
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-3 py-2 space-y-1 text-xs">
          <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Pengelolaan Usulan MK (UC-03 &amp; UC-04)
          </div>

          <button
            onClick={() => {
              setView('daftar_mk');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold transition-all ${view === 'daftar_mk'
              ? 'bg-[#082c78] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4" />
              <span>Daftar Tawaran MK</span>
            </div>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${view === 'daftar_mk' ? 'bg-white/20 text-white' : 'bg-slate-200/60 text-slate-700'
                }`}
            >
              {totalMk}
            </span>
          </button>

          <button
            onClick={() => {
              setView('input_mk');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-semibold transition-all ${view === 'input_mk'
              ? 'bg-[#082c78] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
          >
            <Plus className="w-4 h-4" />
            <span>Input Usulan Baru (UC-03)</span>
          </button>

          <button
            onClick={() => {
              setView('ekspor');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-semibold transition-all ${view === 'ekspor'
              ? 'bg-[#082c78] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
          >
            <Download className="w-4 h-4" />
            <span>Ekspor PDF &amp; Excel (UC-04)</span>
          </button>

          <div className="px-3 pt-4 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Aturan &amp; Batasan
          </div>

          <button
            onClick={() => {
              setView('pedoman');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-semibold transition-all ${view === 'pedoman'
              ? 'bg-[#082c78] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Batasan Prodi (PRD 5.2)</span>
          </button>
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-800 truncate">{deptMeta.kaprodi}</div>
              <div className="text-[10px] text-slate-400 truncate">Ketua {activeDept}</div>
            </div>
            <button
              onClick={logout}
              title="Keluar / Logout"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content body */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-600"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="text-xs font-bold text-[#082c78] flex items-center gap-1.5">
                <span>{activeDept}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 font-normal">Semester Ganjil 2024/2025</span>
              </div>
              <div className="text-[11px] text-slate-500 hidden sm:block">
                Pengajuan Kebutuhan Perkuliahan &amp; Ekspor Data (PRD F-03 &amp; F-04)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${submissionStatus === 'Draft'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${submissionStatus === 'Draft' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
              />
              {submissionStatus}
            </span>

            {submissionStatus === 'Draft' && (
              <button
                onClick={handleSendToFaculty}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#082c78] hover:bg-[#0c3999] shadow-xs transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ajukan ke Fakultas</span>
              </button>
            )}
          </div>
        </header>

        {/* Content View Container */}
        <main className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto w-full">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total MK Diusulkan</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">{totalMk} Mata Kuliah</div>
              <div className="text-[10px] text-blue-700 mt-0.5 font-medium">{totalSks} SKS Kurikulum</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400">Rombel Paralel</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">{totalRombel} Kelas</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Rata-rata 2–3 per MK</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400">Estimasi Mahasiswa</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">{totalEstMhs} Kursi</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Kebutuhan Kuota Ruang</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400">Kesiapan Validasi</div>
              <div className="text-xl font-black text-emerald-700 mt-0.5">100% Siap</div>
              <div className="text-[10px] text-emerald-800 mt-0.5 font-medium">Bebas bentrok dosen</div>
            </div>
          </div>

          {/* VIEW: DAFTAR USULAN MK */}
          {view === 'daftar_mk' && (
            <div className="space-y-4">
              {/* Filter and Action toolbar */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari kode MK, nama mata kuliah, atau dosen..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-hidden"
                  >
                    <option value="all">Semua Semester</option>
                    <option value="1">Semester 1</option>
                    <option value="3">Semester 3</option>
                    <option value="5">Semester 5</option>
                    <option value="7">Semester 7</option>
                  </select>

                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-hidden"
                  >
                    <option value="all">Semua Jenis</option>
                    <option value="wajib">Wajib Prodi</option>
                    <option value="pilihan">MK Pilihan</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportExcel}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    Excel (UC-04)
                  </button>
                  <button
                    onClick={handleExportPdf}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-600" />
                    PDF (UC-04)
                  </button>
                  <button
                    onClick={() => setView('input_mk')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#082c78] hover:bg-[#0c3999] shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah MK (UC-03)
                  </button>
                </div>
              </div>

              {/* Table of courses */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                      <tr>
                        <th className="py-2.5 px-3">No</th>
                        <th className="py-2.5 px-3">Kode &amp; Nama MK</th>
                        <th className="py-2.5 px-2 text-center">SKS</th>
                        <th className="py-2.5 px-3">Dosen Pengampu Utama</th>
                        <th className="py-2.5 px-3">Dosen Tandem</th>
                        <th className="py-2.5 px-3 text-center">Rombel Paralel</th>
                        <th className="py-2.5 px-3 text-center">Est. Mhs</th>
                        <th className="py-2.5 px-3">Preferensi Waktu</th>
                        <th className="py-2.5 px-2 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deptCourses.map((c, idx) => (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-bold text-blue-900 font-mono text-xs">{c.code}</div>
                            <div className="font-semibold text-slate-800 text-xs">{c.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {c.isMandatory ? 'Wajib Prodi' : 'MK Pilihan'} • Sem {c.semester} (Teori {c.theorySks} SKS, Praktik {c.practiceSks} SKS)
                            </div>
                          </td>

                          <td className="py-3 px-2 text-center font-bold text-slate-800">
                            {c.sks}
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800 text-[11px]">
                              {c.primaryLecturer.name}
                            </div>
                            <div className="text-[9px] text-slate-400">PJMK / Pengampu</div>
                          </td>

                          <td className="py-3 px-3 text-slate-600 text-[11px]">
                            {c.tandemLecturers && c.tandemLecturers.length > 0 ? (
                              <span>{c.tandemLecturers.map((t) => t.name).join(', ')}</span>
                            ) : (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-blue-50 text-blue-800 border border-blue-200">
                              {c.classes.length} Rombel
                            </span>
                            <div className="text-[9px] text-slate-400 mt-0.5">
                              {c.classes.map((cl) => cl.name.replace('Kelas ', '')).join(', ')}
                            </div>
                          </td>

                          <td className="py-3 px-3 text-center font-bold text-slate-800 text-xs">
                            {c.totalEnrolledEst}
                          </td>

                          <td className="py-3 px-3 text-[11px]">
                            <div className="text-slate-700 font-medium">
                              {c.preferredDays.join(', ')}
                            </div>
                            <div className="text-[10px] text-slate-400">{c.preferredTimeSlot}</div>
                          </td>

                          <td className="py-3 px-2 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${c.status === 'Submitted'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : c.status === 'Validated'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                            >
                              {c.status}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setClassActionCourse(c)}
                                title="Atur Rombel Kelas & Kuota (F-14 / F-15)"
                                className="p-1 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteCourse(c.id)}
                                title="Hapus Usulan MK"
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                  <span>Menampilkan {deptCourses.length} mata kuliah dari {activeDept}</span>
                  <div className="flex gap-2 text-[11px]">
                    <span>Dokumen acuan: <strong>{deptMeta.docNo}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: INPUT USULAN BARU (UC-03) */}
          {view === 'input_mk' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 md:p-6 space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    Formulir Input Penawaran Mata Kuliah (UC-03)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Masukkan data penawaran mata kuliah, pembagian kelas rombel, penugasan dosen pengampu, dan preferensi jadwal.
                  </p>
                </div>
                <button
                  onClick={() => setView('daftar_mk')}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal / Kembali
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Kode & Nama */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kode Mata Kuliah <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="Contoh: SI211 / IF202 / TK101"
                    className="w-full px-3 py-2 text-xs font-bold font-mono rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Mata Kuliah <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: Basis Data Terdistribusi"
                    className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                {/* SKS & Semester */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Total SKS</label>
                    <select
                      value={formSks}
                      onChange={(e) => setFormSks(parseInt(e.target.value))}
                      className="w-full px-2.5 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                    >
                      <option value={2}>2 SKS</option>
                      <option value={3}>3 SKS</option>
                      <option value={4}>4 SKS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Teori</label>
                    <input
                      type="number"
                      value={formTheorySks}
                      onChange={(e) => setFormTheorySks(parseInt(e.target.value) || 0)}
                      className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Praktik</label>
                    <input
                      type="number"
                      value={formPracticeSks}
                      onChange={(e) => setFormPracticeSks(parseInt(e.target.value) || 0)}
                      className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Semester</label>
                    <select
                      value={formSemester}
                      onChange={(e) => setFormSemester(parseInt(e.target.value))}
                      className="w-full px-2.5 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                    >
                      <option value={1}>Semester 1 (Tingkat 1)</option>
                      <option value={3}>Semester 3 (Tingkat 2)</option>
                      <option value={5}>Semester 5 (Tingkat 3)</option>
                      <option value={7}>Semester 7 (Tingkat 4)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Klasifikasi MK</label>
                    <div className="flex gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setFormIsMandatory(true)}
                        className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg border transition-all ${formIsMandatory
                          ? 'bg-[#082c78] text-white border-blue-900'
                          : 'bg-white text-slate-600 border-slate-200'
                          }`}
                      >
                        Wajib Prodi
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormIsMandatory(false)}
                        className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg border transition-all ${!formIsMandatory
                          ? 'bg-[#082c78] text-white border-blue-900'
                          : 'bg-white text-slate-600 border-slate-200'
                          }`}
                      >
                        MK Pilihan
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dosen Pengampu & Tandem */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dosen Pengampu Utama (PJMK) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formPrimaryLecturerId}
                    onChange={(e) => setFormPrimaryLecturerId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
                  >
                    {mockLecturers.map((lec) => (
                      <option key={lec.id} value={lec.id}>
                        {lec.name} ({lec.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dosen Tandem / Pendamping (Opsional)
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && !formTandemIds.includes(val)) {
                          setFormTandemIds([...formTandemIds, val]);
                        }
                      }}
                      className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="">+ Pilih Dosen Tandem...</option>
                      {mockLecturers
                        .filter((l) => l.id !== formPrimaryLecturerId && !formTandemIds.includes(l.id))
                        .map((lec) => (
                          <option key={lec.id} value={lec.id}>
                            {lec.name} ({lec.department})
                          </option>
                        ))}
                    </select>
                  </div>
                  {formTandemIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {formTandemIds.map((tid) => {
                        const lec = mockLecturers.find((l) => l.id === tid);
                        return (
                          <span
                            key={tid}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200 text-[11px] font-semibold"
                          >
                            {lec?.name}
                            <button
                              type="button"
                              onClick={() => setFormTandemIds(formTandemIds.filter((id) => id !== tid))}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Rombel Paralel & Estimasi Mahasiswa (UC-03) */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">
                      Rombongan Belajar Paralel &amp; Estimasi Kapasitas
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      Tentukan jumlah rombel dan estimasi mahasiswa per rombel untuk alokasi ruang otomatis CP-SAT.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddFormClass}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Kelas
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {formClasses.map((cls, idx) => (
                    <div
                      key={cls.id}
                      className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-blue-900">{cls.name}</span>
                        {formClasses.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFormClass(idx)}
                            className="text-slate-400 hover:text-rose-600 p-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500">Kapasitas:</span>
                        <input
                          type="number"
                          value={cls.capacity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setFormClasses(
                              formClasses.map((c, i) =>
                                i === idx ? { ...c, capacity: val, enrolled: val } : c
                              )
                            );
                          }}
                          className="w-16 px-2 py-0.5 text-xs font-bold rounded border border-slate-200 text-center"
                        />
                        <span className="text-[10px] text-slate-500">Mhs</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-[11px] text-slate-600 pt-1 flex justify-between font-semibold">
                  <span>Total Rombel: {formClasses.length} Kelas</span>
                  <span>
                    Total Mahasiswa: {formClasses.reduce((sum, c) => sum + c.capacity, 0)} Mahasiswa
                  </span>
                </div>
              </div>

              {/* Preferensi Hari & Sesi Waktu */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Preferensi Hari Perkuliahan
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map((day) => {
                      const checked = formPreferredDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${checked
                            ? 'bg-[#082c78] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                          {checked && <Check className="w-3 h-3 text-blue-200" />}
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Preferensi Sesi Waktu
                    </label>
                    <select
                      value={formTimeSlot}
                      onChange={(e) => setFormTimeSlot(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="Sesi Pagi">Sesi Pagi (07:30 - 11:40 WIB)</option>
                      <option value="Sesi Siang">Sesi Siang (13:30 - 16:10 WIB)</option>
                      <option value="Sesi Sore">Sesi Sore (16:20 - 18:00 WIB)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Catatan / Batasan Khusus (Constraint)
                    </label>
                    <input
                      type="text"
                      value={formSpecialNote}
                      onChange={(e) => setFormSpecialNote(e.target.value)}
                      placeholder="Misal: Perlu Lab PC spesifikasi GPU / Dosen pagi"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formAvoidFriday}
                      onChange={(e) => setFormAvoidFriday(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="text-slate-700 font-medium">Hindari Jumat Siang</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formMaxOneSession}
                      onChange={(e) => setFormMaxOneSession(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="text-slate-700 font-medium">Maksimal 1 Sesi per Hari</span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSaveCourse(true)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Simpan sebagai Draf
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveCourse(false)}
                  className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-[#082c78] hover:bg-[#0c3999] shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Simpan &amp; Ajukan Mata Kuliah
                </button>
              </div>
            </div>
          )}

          {/* VIEW: EKSPOR DATA KEBUTUHAN (UC-04) */}
          {view === 'ekspor' && (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      Ekspor Data Kebutuhan Perkuliahan (UC-04 / PRD F-04)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Hasilkan berkas resmi unduhan dalam format PDF dan Excel yang presisi sesuai basis data penawaran.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                  {/* Excel Card */}
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                          Rekapitulasi Format Excel (.xlsx)
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                          PRD F-04
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Tabel terstruktur berisi seluruh mata kuliah, pembagian kelas rombel, kapasitas mahasiswa, dosen pengampu &amp; tandem, serta preferensi hari/jam untuk arsip spreadsheet departemen.
                      </p>
                      <div className="mt-3 text-[11px] text-slate-500 space-y-1">
                        <div>• {deptCourses.length} baris data mata kuliah</div>
                        <div>• Format kolom sesuai standar BAAK &amp; FTI</div>
                        <div>• Kompatibel dengan Microsoft Excel 2016+ / Google Sheets</div>
                      </div>
                    </div>

                    <button
                      onClick={handleExportExcel}
                      className="mt-4 w-full py-2.5 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 shadow-xs"
                    >
                      <Download className="w-4 h-4" />
                      Unduh Berkas Excel (.xlsx)
                    </button>
                  </div>

                  {/* PDF Card */}
                  <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-rose-950 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-rose-600" />
                          Surat Pengajuan Resmi Format PDF (.pdf)
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                          PRD F-04
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Surat resmi penawaran perkuliahan ber-kop Surat Fakultas Teknologi Informasi Universitas Andalas, dilampiri daftar usulan dan kolom pengesahan Ketua Departemen.
                      </p>
                      <div className="mt-3 text-[11px] text-slate-500 space-y-1">
                        <div>• Dokumen Acuan: {deptMeta.docNo}</div>
                        <div>• Penandatangan: {deptMeta.kaprodi} (NIP {deptMeta.nip})</div>
                        <div>• Format A4 Siap Cetak &amp; Disposisi Wadek I</div>
                      </div>
                    </div>

                    <button
                      onClick={handleExportPdf}
                      className="mt-4 w-full py-2.5 rounded-lg text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 transition-colors flex items-center justify-center gap-2 shadow-xs"
                    >
                      <Download className="w-4 h-4" />
                      Unduh Berkas PDF (.pdf)
                    </button>
                  </div>
                </div>

                {/* Document Preview Box */}
                <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-800">
                      Pratinjau Data yang Akan Diekspor ({activeDept})
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Total: {deptCourses.length} MK ({totalRombel} Rombel)
                    </span>
                  </div>
                  <div className="max-h-56 overflow-y-auto bg-white rounded-lg border border-slate-200 p-2 text-[11px]">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b text-[10px]">
                        <tr>
                          <th className="p-1.5">Kode</th>
                          <th className="p-1.5">Mata Kuliah</th>
                          <th className="p-1.5">SKS</th>
                          <th className="p-1.5">Dosen Pengampu</th>
                          <th className="p-1.5">Rombel</th>
                          <th className="p-1.5">Mhs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {deptCourses.slice(0, 8).map((c) => (
                          <tr key={c.id}>
                            <td className="p-1.5 font-mono font-bold text-blue-900">{c.code}</td>
                            <td className="p-1.5 font-medium">{c.name}</td>
                            <td className="p-1.5">{c.sks}</td>
                            <td className="p-1.5 text-slate-600">{c.primaryLecturer.name}</td>
                            <td className="p-1.5">{c.classes.length} Kls</td>
                            <td className="p-1.5 font-bold">{c.totalEnrolledEst}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: PEDOMAN & ATURAN PRODI (PRD 5.2) */}
          {view === 'pedoman' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Aturan Khusus &amp; Soft Constraints Departemen (PRD Section 5.2)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ketentuan penjadwalan spesifik yang dioptimalkan oleh mesin Algoritma Genetika (GA).
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200">
                <div className="flex items-center gap-2 font-bold text-xs text-blue-950 mb-2">
                  <Building className="w-4 h-4 text-blue-700" />
                  <span>{activeDept} ({deptMeta.code}) — {deptMeta.docNo}</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-700 list-disc pl-5 leading-relaxed">
                  {deptMeta.rules.map((rule, idx) => (
                    <li key={idx}>{rule}</li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Hard Constraints Wajib (CP-SAT)
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Setiap rombel MK wajib prodi di angkatan yang sama dijamin bebas bentrok waktu, dan kapasitas kursi ruang yang dialokasikan dijamin ≥ jumlah mahasiswa terdaftar.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    Optimalisasi Kualitas (GA)
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Preferensi hari dan sesi mengajar dosen serta jeda istirahat ibadah Jumat diminimalkan penaltinya melalui iterasi populasi algoritma genetika.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Class Management Modal (F-14 & F-15) */}
          {classActionCourse && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-xs text-slate-900">
                      Kelola Rombel: [{classActionCourse.code}] {classActionCourse.name}
                    </h3>
                    <p className="text-[10px] text-slate-500">Penyesuaian &amp; Pembatalan Kelas (PRD F-14 &amp; F-15)</p>
                  </div>
                  <button
                    onClick={() => setClassActionCourse(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Existing classes list */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-700">Daftar Rombel Saat Ini:</div>
                  {classActionCourse.classes.map((cl) => (
                    <div
                      key={cl.id}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-blue-900">{cl.name}</span>
                        <span className="text-slate-500 text-[11px] ml-2">
                          {cl.capacity} Mahasiswa
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          cancelClassOffering(
                            classActionCourse.id,
                            cl.id,
                            'Pembatalan oleh departemen: kuota minimum tidak terpenuhi (F-15)'
                          );
                          setClassActionCourse(null);
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200"
                      >
                        Batalkan Kelas (F-15)
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new class (F-14) */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="text-[11px] font-bold text-slate-700">
                    Tambah Rombel Paralel Baru (F-14):
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      placeholder="Nama Kelas (e.g. Kelas D)"
                      className="px-2.5 py-1 text-xs rounded-lg border border-slate-300"
                    />
                    <input
                      type="number"
                      value={newClassCapacity}
                      onChange={(e) => setNewClassCapacity(parseInt(e.target.value) || 0)}
                      placeholder="Kapasitas Mhs"
                      className="px-2.5 py-1 text-xs rounded-lg border border-slate-300"
                    />
                  </div>
                  <button
                    onClick={() => {
                      addClassToCourse(classActionCourse.id, newClassName, newClassCapacity);
                      setClassActionCourse(null);
                    }}
                    className="w-full py-1.5 bg-[#082c78] hover:bg-[#0c3999] text-white text-xs font-bold rounded-lg shadow-xs"
                  >
                    + Simpan Rombel Tambahan
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
