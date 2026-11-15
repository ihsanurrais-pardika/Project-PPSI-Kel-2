import React, { useState } from 'react';
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
} from 'lucide-react';
import { CourseOffering } from '../types';

export const KebutuhanDepartemenPage: React.FC = () => {
  const {
    courses,
    deleteCourse,
    setActivePage,
    cancelClassOffering,
    addClassToCourse,
    showToast,
  } = useApp();

  const [activeDeptTab, setActiveDeptTab] = useState<'Sistem Informasi' | 'Informatika' | 'Teknik Komputer'>('Sistem Informasi');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Modal for class adjustment (F-14 / F-15)
  const [selectedCourseForClassAction, setSelectedCourseForClassAction] = useState<CourseOffering | null>(null);
  const [newClassName, setNewClassName] = useState('Kelas D');
  const [newClassCapacity, setNewClassCapacity] = useState(40);

  // Filter courses
  const filteredCourses = courses.filter((c) => {
    if (c.department !== activeDeptTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = c.code.toLowerCase().includes(q);
      const matchName = c.name.toLowerCase().includes(q);
      const matchLec = c.primaryLecturer.name.toLowerCase().includes(q);
      if (!matchCode && !matchName && !matchLec) return false;
    }
    if (selectedStatus !== 'all' && c.status !== selectedStatus) return false;
    if (selectedSemester !== 'all' && c.semester.toString() !== selectedSemester) return false;
    if (selectedType !== 'all') {
      if (selectedType === 'wajib' && !c.isMandatory) return false;
      if (selectedType === 'pilihan' && c.isMandatory) return false;
    }
    return true;
  });

  const deptCounts = {
    'Sistem Informasi': courses.filter(c => c.department === 'Sistem Informasi').length + 48,
    'Informatika': courses.filter(c => c.department === 'Informatika').length + 60,
    'Teknik Komputer': courses.filter(c => c.department === 'Teknik Komputer').length + 22,
  };

  const handleExportExcel = () => {
    showToast(`Ekspor Excel data kebutuhan ${activeDeptTab} Semester Ganjil 2024/2025 berhasil (F-04).`, 'success');
  };

  const handleExportPdf = () => {
    showToast(`Dokumen Rekapitulasi_Kebutuhan_${activeDeptTab}.pdf berhasil diunduh (F-04).`, 'success');
  };

  const handleSendToFaculty = () => {
    showToast(`Seluruh berkas usulan kebutuhan perkuliahan ${activeDeptTab} berhasil dikirim ke Admin Fakultas!`, 'success');
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
            <span className="text-slate-800 font-semibold">{activeDeptTab} (SI)</span>
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Manajemen Kebutuhan Departemen
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Pengelolaan usulan mata kuliah, pembagian kelas rombel, penugasan dosen pengampu, dan pemetaan preferensi jadwal perkuliahan terintegrasi semester berjalan.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            • Batas Usulan: 25 Oktober 2024 (Sisa 12 Hari)
          </span>
          <button
            onClick={handleSendToFaculty}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
          >
            <Send className="w-4 h-4" />
            Kirim Usulan ke Fakultas
          </button>
          <button
            onClick={() => setActivePage('form_usulan_mk')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 shadow-md shadow-blue-700/20 active:scale-98 transition-all"
          >
            <Plus className="w-4 h-4" />
            Tambah Kebutuhan MK
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
              TOTAL MK TERDAFTAR
            </div>
            <div className="text-2xl font-black text-slate-900">142 MK</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              TOTAL ROMBEL
            </div>
            <div className="text-2xl font-black text-slate-900">318 Kelas</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              DOSEN DITUGASKAN
            </div>
            <div className="text-2xl font-black text-slate-900">68 Dosen</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              KESIAPAN VALIDASI
            </div>
            <div className="text-2xl font-black text-emerald-600">78.4%</div>
          </div>
        </div>
      </div>

      {/* Department Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveDeptTab('Sistem Informasi')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeDeptTab === 'Sistem Informasi'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Sistem Informasi (SI)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeDeptTab === 'Sistem Informasi' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {deptCounts['Sistem Informasi']} MK
          </span>
        </button>

        <button
          onClick={() => setActiveDeptTab('Informatika')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeDeptTab === 'Informatika'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Teknik Informatika (IF)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeDeptTab === 'Informatika' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {deptCounts['Informatika']} MK
          </span>
        </button>

        <button
          onClick={() => setActiveDeptTab('Teknik Komputer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeDeptTab === 'Teknik Komputer'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Teknik Komputer (TK)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeDeptTab === 'Teknik Komputer' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {deptCounts['Teknik Komputer']} MK
          </span>
        </button>
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
              placeholder="Cari kode, nama MK, atau dosen pengampu..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-hidden"
          >
            <option value="all">Semua Status</option>
            <option value="Submitted">Submitted</option>
            <option value="Validated">Validated</option>
            <option value="Draft">Draft</option>
            <option value="Need Revision">Need Revision</option>
          </select>

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
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-hidden"
          >
            <option value="all">Semua Jenis MK</option>
            <option value="wajib">Wajib Prodi</option>
            <option value="pilihan">MK Pilihan</option>
          </select>
        </div>

        {/* Export Buttons (PRD F-04 / UC-04) */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Excel
          </button>
          <button
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            PDF
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4 font-bold">No</th>
                <th className="py-3 px-4 font-bold">Kode MK</th>
                <th className="py-3 px-4 font-bold">Nama Mata Kuliah</th>
                <th className="py-3 px-3 font-bold text-center">SKS</th>
                <th className="py-3 px-4 font-bold">Dosen Pengampu Utama</th>
                <th className="py-3 px-4 font-bold">Dosen Tandem</th>
                <th className="py-3 px-3 font-bold text-center">Rombel</th>
                <th className="py-3 px-3 font-bold text-center">Est. Mhs</th>
                <th className="py-3 px-4 font-bold">Preferensi Hari & Waktu</th>
                <th className="py-3 px-3 font-bold text-center">Status</th>
                <th className="py-3 px-4 font-bold">Terakhir Diperbarui</th>
                <th className="py-3 px-4 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCourses.map((c, idx) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                    {String(idx + 1).padStart(2, '0')}
                  </td>

                  <td className="py-3 px-4 font-bold text-blue-700 font-mono">
                    {c.code}
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{c.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {c.isMandatory ? 'Wajib' : 'Pilihan'} • Semester {c.semester} • Teori {c.theorySks} SKS, Praktik {c.practiceSks} SKS
                    </div>
                  </td>

                  <td className="py-3 px-3 text-center font-bold text-slate-800">
                    {c.sks}
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {c.primaryLecturer.name.charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                        {c.primaryLecturer.name}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-slate-600">
                    {c.tandemLecturers && c.tandemLecturers.length > 0 ? (
                      <span className="font-medium text-slate-700">
                        {c.tandemLecturers.map(t => t.name).join(', ')}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">-</span>
                    )}
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-blue-50 text-blue-700 border border-blue-200">
                      {c.classes.length} Kls
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">
                      ({c.classes.map(cl => cl.name.replace('Kelas ', '')).join(',')})
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center font-bold text-slate-800">
                    {c.totalEnrolledEst} Mhs
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{c.preferredDays.join('/')}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {c.preferredTimeSlot}
                    </div>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      c.status === 'Submitted' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      c.status === 'Validated' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      c.status === 'Draft' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {c.status}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-slate-500 text-[11px]">
                    {c.lastUpdated}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setSelectedCourseForClassAction(c)}
                        title="Kelola Penambahan/Pengurangan/Pembatalan Kelas (F-14 & F-15)"
                        className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                      >
                        <Sliders className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteCourse(c.id)}
                        title="Hapus Usulan MK"
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Menampilkan 1 - {filteredCourses.length} dari {deptCounts[activeDeptTab]} data mata kuliah
          </div>

          <div className="flex items-center gap-1.5 self-center">
            <span className="mr-2">Baris per halaman: 10</span>
            <button className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center">
              1
            </button>
            <button className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center">
              2
            </button>
            <button className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center">
              3
            </button>
            <span className="px-1">...</span>
            <button className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center">
              5
            </button>
          </div>
        </div>
      </div>

      {/* Bottom 3 Cards (From Screenshot 5) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Distribusi Beban SKS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-extrabold text-xs text-slate-900">Distribusi Beban SKS</h4>
              <span className="text-[10px] font-bold text-slate-400">Ganjil 24/25</span>
            </div>

            {/* Bar charts representation */}
            <div className="flex items-end justify-between h-24 pt-4 px-4 gap-4">
              <div className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full bg-blue-200 rounded-t-md h-12" />
                <span className="text-[10px] font-bold text-slate-500">Sem 1</span>
              </div>
              <div className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full bg-blue-300 rounded-t-md h-16" />
                <span className="text-[10px] font-bold text-slate-500">Sem 3</span>
              </div>
              <div className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full bg-blue-900 rounded-t-md h-20" />
                <span className="text-[10px] font-bold text-slate-800">Sem 5</span>
              </div>
              <div className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full bg-blue-200 rounded-t-md h-8" />
                <span className="text-[10px] font-bold text-slate-500">Sem 7</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 mt-4">
            <span>Kebutuhan Ruangan Teori: <strong>14 Ruang</strong></span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Optimal</span>
          </div>
        </div>

        {/* Card 2: Status Kelengkapan Tim Pengajar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-extrabold text-xs text-slate-900">Status Kelengkapan Tim Pengajar</h4>
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>

            <div className="flex justify-between items-center text-xs font-bold text-slate-800 mb-1.5">
              <span>Telah Memiliki Tim Lengkap</span>
              <span className="text-blue-700">48 / 52 MK</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: '92.3%' }} />
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>4 MK masih membutuhkan konfirmasi dosen tandem fakultas lain.</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 mt-3 text-right">
            Sinkronisasi PDDikti Terverifikasi
          </div>
        </div>

        {/* Card 3: Pedoman Alokasi Jam */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-xs text-slate-900">Pedoman Alokasi Jam</h4>
            <HelpCircle className="w-4 h-4 text-slate-400" />
          </div>

          <ul className="text-xs text-slate-600 space-y-2.5 list-disc pl-4 leading-relaxed">
            <li>
              Maksimal 3 SKS per sesi perkuliahan teori untuk mencegah keletihan kelas.
            </li>
            <li>
              Mata kuliah praktikum diprioritaskan di hari Kamis-Jumat pada laboratorium komputer terpusat.
            </li>
            <li>
              Dosen dengan status menyusui / batasan medis dialokasikan pada sesi 2 (09:20 WIB ke atas).
            </li>
          </ul>
        </div>
      </div>

      {/* Class Management Modal (Penambahan / Pengurangan / Pembatalan Kelas - F-14 & F-15) */}
      {selectedCourseForClassAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Kelola Kelas: [{selectedCourseForClassAction.code}] {selectedCourseForClassAction.name}
                </h3>
                <p className="text-xs text-slate-500">Penyesuaian & Pembatalan Kelas (PRD F-14 & F-15)</p>
              </div>
              <button
                onClick={() => setSelectedCourseForClassAction(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List existing classes */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Daftar Rombel Kelas Saat Ini:</label>
              {selectedCourseForClassAction.classes.map((cl) => (
                <div key={cl.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{cl.name}</span>
                    <span className="text-slate-500 ml-2">Kapasitas: {cl.capacity} Mahasiswa</span>
                  </div>
                  <button
                    onClick={() => cancelClassOffering(selectedCourseForClassAction.id, cl.id, 'Peserta tidak memenuhi kuota minimum')}
                    className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200"
                  >
                    Batalkan Kelas (F-15)
                  </button>
                </div>
              ))}
            </div>

            {/* Add Class Form (F-14) */}
            <div className="pt-3 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 mb-2 block">
                Tambah Rombel Kelas Paralel Baru (F-14)
              </label>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Nama Kelas"
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-300"
                />
                <input
                  type="number"
                  value={newClassCapacity}
                  onChange={(e) => setNewClassCapacity(parseInt(e.target.value) || 0)}
                  placeholder="Kapasitas"
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-300"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  addClassToCourse(selectedCourseForClassAction.id, newClassName, newClassCapacity);
                  setSelectedCourseForClassAction(null);
                }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                + Simpan Penambahan Kelas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
