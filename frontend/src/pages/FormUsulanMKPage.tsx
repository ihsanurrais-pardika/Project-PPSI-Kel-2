import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  BookOpen,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Save,
  Send,
  Plus,
  Trash2,
  Info,
  ChevronRight,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { CourseOffering, ClassRombel } from '../types';

export const FormUsulanMKPage: React.FC = () => {
  const { addCourse, setActivePage, showToast, mockLecturers } = useApp();

  const [code, setCode] = useState('SI211');
  const [name, setName] = useState('Basis Data Terdistribusi');
  const [department, setDepartment] = useState<'Sistem Informasi' | 'Informatika' | 'Teknik Komputer'>('Sistem Informasi');
  const [semester, setSemester] = useState<number>(3);
  const [sks, setSks] = useState<number>(3);
  const [isMandatory, setIsMandatory] = useState<boolean>(true);

  // Classes
  const [classes, setClasses] = useState<ClassRombel[]>([
    { id: 'cl-1', name: 'Kelas A', capacity: 40, enrolled: 40 },
    { id: 'cl-2', name: 'Kelas B', capacity: 40, enrolled: 40 },
    { id: 'cl-3', name: 'Kelas C', capacity: 40, enrolled: 40 },
  ]);

  // Lecturers
  const [primaryLecturerId, setPrimaryLecturerId] = useState('lec-1');
  const [tandemIds, setTandemIds] = useState<string[]>(['lec-2']);

  // Preferences
  const [preferredDays, setPreferredDays] = useState<string[]>(['Senin', 'Rabu']);
  const [timeSlotPref, setTimeSlotPref] = useState<'Sesi Pagi' | 'Sesi Siang' | 'Sesi Sore'>('Sesi Pagi');
  const [avoidFridayNoon, setAvoidFridayNoon] = useState<boolean>(true);
  const [maxOneSessionPerDay, setMaxOneSessionPerDay] = useState<boolean>(true);

  const toggleDay = (day: string) => {
    if (preferredDays.includes(day)) {
      setPreferredDays(preferredDays.filter(d => d !== day));
    } else {
      setPreferredDays([...preferredDays, day]);
    }
  };

  const handleAddClass = () => {
    const nextChar = String.fromCharCode(65 + classes.length); // A, B, C, D...
    const newClass: ClassRombel = {
      id: `cl-${Date.now()}`,
      name: `Kelas ${nextChar}`,
      capacity: 40,
      enrolled: 40,
    };
    setClasses([...classes, newClass]);
    showToast(`Rombel Kelas ${nextChar} ditambahkan.`, 'info');
  };

  const handleRemoveClass = (index: number) => {
    if (classes.length <= 1) {
      showToast('Minimal harus ada 1 rombongan belajar kelas.', 'warning');
      return;
    }
    setClasses(classes.filter((_, i) => i !== index));
  };

  const totalCapacity = classes.reduce((acc, c) => acc + c.capacity, 0);

  const handleSubmit = (isDraft: boolean) => {
    if (!code.trim() || !name.trim()) {
      showToast('Kode dan Nama Mata Kuliah wajib diisi (PRD UC-03 E1).', 'error');
      return;
    }

    const primary = mockLecturers.find(l => l.id === primaryLecturerId) || mockLecturers[0];
    const tandems = mockLecturers.filter(l => tandemIds.includes(l.id));

    const specialConstraints: string[] = [];
    if (avoidFridayNoon) specialConstraints.push('Hindari Jumat Siang');
    if (maxOneSessionPerDay) specialConstraints.push('Maksimal 1 Sesi / Hari');

    const courseData: Partial<CourseOffering> = {
      code,
      name,
      department,
      semester,
      sks,
      theorySks: 2,
      practiceSks: 1,
      isMandatory,
      classes,
      totalEnrolledEst: totalCapacity,
      primaryLecturer: primary,
      tandemLecturers: tandems,
      preferredDays,
      preferredTimeSlot: timeSlotPref,
      specialConstraints,
      recommendedRoomType: 'Ruang Teori Standar & Lab Komputer Basis Data',
      status: isDraft ? 'Draft' : 'Submitted',
    };

    addCourse(courseData);
    if (!isDraft) {
      setActivePage('kebutuhan_departemen');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mb-1">
            <span>Beranda</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span>Kebutuhan Departemen</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-800 font-semibold">Input Kebutuhan Perkuliahan</span>
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <span className="px-2.5 py-0.5 rounded-sm bg-blue-100 text-blue-800 font-mono text-[11px] font-bold">
              SI-REG-2024
            </span>
            <span className="text-xs text-slate-400 font-medium">• Draf Tersimpan Otomatis</span>
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Formulir Usulan Kebutuhan Perkuliahan
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Kelola alokasi rombel kelas, tim dosen pengampu, serta pembatasan preferensi jadwal semester aktif.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex px-3 py-1.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
            • TA 2024/2025 • FASE PENJARINGAN DRAF
          </span>
          <button
            onClick={() => handleSubmit(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-xs transition-all"
          >
            <Save className="w-4 h-4 text-slate-500" />
            Simpan Draf
          </button>
          <button
            onClick={() => handleSubmit(false)}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 shadow-md shadow-blue-700/20 active:scale-98 transition-all"
          >
            <Send className="w-4 h-4 text-blue-200" />
            Ajukan Kebutuhan
          </button>
        </div>
      </div>

      {/* Main Form Grid: 8 cols Form + 4 cols Validation Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form: 8 cols */}
        <div className="lg:col-span-8 space-y-6">

          {/* Section 1: Informasi Dasar Mata Kuliah */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    1. Informasi Dasar Mata Kuliah
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Identitas kurikulum dan status klasifikasi kurikulum departemen
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                Kurikulum OBE 2024
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kode MK
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:border-blue-600 focus:outline-hidden"
                  placeholder="Contoh: SI211"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Mata Kuliah
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-300 focus:border-blue-600 focus:outline-hidden"
                  placeholder="Contoh: Basis Data Terdistribusi"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Departemen / Pengelola
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as any)}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:border-blue-600 focus:outline-hidden"
                >
                  <option value="Sistem Informasi">Sistem Informasi (SI)</option>
                  <option value="Informatika">Informatika (IF)</option>
                  <option value="Teknik Komputer">Teknik Komputer (TK)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tingkat & Semester
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:border-blue-600 focus:outline-hidden"
                  >
                    <option value={1}>Semester 1 (Ganjil)</option>
                    <option value={3}>Semester 3 (Ganjil)</option>
                    <option value={5}>Semester 5 (Ganjil)</option>
                    <option value={7}>Semester 7 (Ganjil)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Beban Bobot
                  </label>
                  <select
                    value={sks}
                    onChange={(e) => setSks(parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:border-blue-600 focus:outline-hidden"
                  >
                    <option value={2}>2 SKS (2 T)</option>
                    <option value={3}>3 SKS (2 T / 1 P)</option>
                    <option value={4}>4 SKS (3 T / 1 P)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Klasifikasi Wajib Program Studi
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMandatory(true)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isMandatory
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Wajib Prodi (FTI)
                </button>
                <button
                  type="button"
                  onClick={() => setIsMandatory(false)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    !isMandatory
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Mata Kuliah Pilihan
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Mata kuliah ini harus memiliki slot wajib tanpa tumpang tindih angkatan (Hard Constraint PRD 5.1).
              </p>
            </div>
          </div>

          {/* Section 2: Pembagian Rombel & Estimasi Kapasitas */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    2. Pembagian Rombel & Estimasi Kapasitas
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Definisi rombongan belajar (rombel) dan kebutuhan spesifik fasilitas fisik
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                  {totalCapacity} Kursi Total
                </span>
                <button
                  type="button"
                  onClick={handleAddClass}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Kelas
                </button>
              </div>
            </div>

            {/* Class rombel list */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {classes.map((cls, idx) => (
                <div
                  key={cls.id}
                  className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-blue-900">{cls.name}</span>
                    {classes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveClass(idx)}
                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-2">
                    <label className="text-[10px] text-slate-500 font-semibold">Kapasitas Mahasiswa:</label>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <input
                        type="number"
                        value={cls.capacity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setClasses(classes.map((c, i) => i === idx ? { ...c, capacity: val, enrolled: val } : c));
                        }}
                        className="w-16 px-2 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                      />
                      <span className="text-xs font-semibold text-slate-600">Mhs</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recommended Room Characteristic */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Rekomendasi Karakteristik Ruang Perkuliahan
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-2.5">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-slate-900">Ruang Teori Standar (2 SKS)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Kapasitas min. 40 kursi, Proyektor HDMI</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-2.5">
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-slate-900">Lab Komputer Basis Data (1 SKS)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">PostgreSQL Server, min 42 PC client</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Tim Pengajar (Dosen Pengampu & Tandem) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    3. Tim Pengajar (Dosen Pengampu & Tandem)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Alokasi dosen penanggung jawab dan tim tandem untuk sinkronisasi beban SKS
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const available = mockLecturers.find(l => l.id !== primaryLecturerId && !tandemIds.includes(l.id));
                  if (available) {
                    setTandemIds([...tandemIds, available.id]);
                    showToast(`Dosen pendamping ${available.name} ditambahkan.`, 'info');
                  }
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Dosen
              </button>
            </div>

            {/* Dosen Utama Card */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Dosen Pengampu Utama (PJMK)
              </label>
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                    DR
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-900">
                        Dr. Eng. Rahmad, M.T.
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900 text-white">
                        PJMK / Utama
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      NIP: 19820412 200812 1 003 • Bidang Minat: Data Engineering
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    BEBAN MENGAJAR
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">
                    6 / 12 SKS
                  </div>
                  <div className="w-24 h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: '50%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Dosen Tandem */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Dosen Tandem / Tim Pengampu Pendamping
              </label>
              <div className="space-y-2">
                {tandemIds.map((tid) => {
                  const lec = mockLecturers.find(l => l.id === tid);
                  if (!lec) return null;
                  return (
                    <div
                      key={tid}
                      className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                        <span className="font-bold text-slate-800">{lec.name}</span>
                        <span className="text-slate-400 font-mono text-[11px]">(NIP: {lec.nip.slice(0, 10)}...)</span>
                        <span className="px-2 py-0.5 rounded-sm bg-blue-50 text-blue-700 font-semibold text-[10px]">
                          4 SKS Aktif
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setTandemIds(tandemIds.filter(id => id !== tid))}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 4: Preferensi Jadwal & Batasan Waktu */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    4. Preferensi Jadwal & Batasan Waktu
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Parameter soft-constraints untuk solver penjadwalan otomatis
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                Constraint Score: Normal
              </span>
            </div>

            {/* Hari Prioritas Pengajaran */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Hari Prioritas Pengajaran
              </label>
              <div className="grid grid-cols-5 gap-2">
                {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map((day) => {
                  const isChecked = preferredDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        isChecked
                          ? 'bg-blue-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 text-blue-300" />}
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Jendela Waktu Sesi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Jendela Waktu Sesi (Window Preferences)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  onClick={() => setTimeSlotPref('Sesi Pagi')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    timeSlotPref === 'Sesi Pagi'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span>Sesi Pagi</span>
                    <span className="w-3.5 h-3.5 rounded-full border flex items-center justify-center">
                      {timeSlotPref === 'Sesi Pagi' && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">08:00 — 11:40 WIB</div>
                  <div className="text-[10px] text-blue-600 font-bold mt-1">Sangat Diprioritaskan</div>
                </div>

                <div
                  onClick={() => setTimeSlotPref('Sesi Siang')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    timeSlotPref === 'Sesi Siang'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span>Sesi Siang</span>
                    <span className="w-3.5 h-3.5 rounded-full border flex items-center justify-center">
                      {timeSlotPref === 'Sesi Siang' && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">13:30 — 16:10 WIB</div>
                  <div className="text-[10px] text-slate-400 font-medium mt-1">Tersedia alternatif</div>
                </div>

                <div
                  onClick={() => setTimeSlotPref('Sesi Sore')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    timeSlotPref === 'Sesi Sore'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span>Sesi Sore</span>
                    <span className="w-3.5 h-3.5 rounded-full border flex items-center justify-center">
                      {timeSlotPref === 'Sesi Sore' && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">16:20 — 18:00 WIB</div>
                  <div className="text-[10px] text-slate-400 font-medium mt-1">Hanya bila darurat</div>
                </div>
              </div>
            </div>

            {/* Batasan Khusus */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Batasan Khusus (Constraint Directives)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  avoidFridayNoon ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={avoidFridayNoon}
                      onChange={(e) => setAvoidFridayNoon(e.target.checked)}
                      className="text-blue-600 rounded-sm"
                    />
                    <span className="text-xs font-bold text-slate-800">Hindari Jumat Siang</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 pl-5">
                    Digunakan untuk agenda riset lab, pengabdian & ibadah bersama FTI.
                  </p>
                </label>

                <label className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  maxOneSessionPerDay ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={maxOneSessionPerDay}
                      onChange={(e) => setMaxOneSessionPerDay(e.target.checked)}
                      className="text-blue-600 rounded-sm"
                    />
                    <span className="text-xs font-bold text-slate-800">Maksimal 1 Sesi / Hari</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 pl-5">
                    Menjaga dispersi pengajaran dosen tidak berhimpit lebih dari 1 kelas.
                  </p>
                </label>
              </div>
            </div>

          </div>

        </div>

        {/* Right Sidebar: Kesiapan Data Usulan (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Readiness Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-sm text-slate-900">Kesiapan Data Usulan</h4>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                Valid
              </span>
            </div>

            {/* Gauge */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-slate-200"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-blue-600"
                    strokeWidth="10"
                    strokeDasharray={`${85 * 2.51} 251.2`}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute font-black text-slate-900 text-lg">
                  85%
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-900">Tingkat Kelayakan Tinggi</div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  3 dari 4 kriteria validasi utama terpenuhi tanpa benturan jadwal hard constraint.
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <div>
                  <div className="font-bold text-slate-800">Rombel & kuota mahasiswa terisi</div>
                  <div className="text-[11px] text-slate-500">{classes.length} rombel • total {totalCapacity} kapasitas</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <div>
                  <div className="font-bold text-slate-800">Tim pengajar terverifikasi di PDDikti</div>
                  <div className="text-[11px] text-slate-500">NIDN sinkron dengan sistem fakultas</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <div>
                  <div className="font-bold text-slate-800">Beban SKS dosen &lt; 12 SKS</div>
                  <div className="text-[11px] text-slate-500">Rahmad (6 SKS), Kamil (4 SKS)</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-3 h-3" />
                </div>
                <div>
                  <div className="font-bold text-slate-800">Keterbatasan Slot Lab Software</div>
                  <div className="text-[11px] text-slate-500">
                    Slot Rabu pagi di Lab Komputer Basis Data padat terisi MK Algoritma IF.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Integrasi Solver CP-SAT Card */}
          <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white p-5 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-300" />
              <h5 className="font-bold text-xs">Integrasi Solver CP-SAT</h5>
            </div>
            <p className="text-[11px] text-blue-100/90 leading-relaxed">
              Usulan yang telah diajukan akan langsung diagregasi oleh Admin Fakultas ke dalam model optimasi solver CP-SAT untuk komputasi global matriks ruangan.
            </p>

            <div className="pt-2 border-t border-white/10 text-[10px] text-blue-200 space-y-1">
              <div className="flex justify-between">
                <span>Pembuat Usulan:</span>
                <span className="font-bold text-white">Kaprodi SI</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal Pembuatan:</span>
                <span className="font-bold text-white">10 Okt 2024, 09:41 WIB</span>
              </div>
              <div className="flex justify-between">
                <span>Versi Dokumen:</span>
                <span className="font-bold text-white">v1.2-draft</span>
              </div>
            </div>
          </div>

          {/* Preview Matriks Waktu Link Button */}
          <button
            onClick={() => setActivePage('jadwal_kuliah')}
            className="w-full p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 shadow-xs flex items-center justify-between text-xs font-bold text-slate-800 hover:text-blue-700 transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Preview Matriks Waktu</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

      </div>
    </div>
  );
};

