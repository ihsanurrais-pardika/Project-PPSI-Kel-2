import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Globe,
  User,
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  QrCode,
  BookOpen,
  Compass,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileText,
  Building,
} from 'lucide-react';

export const PortalAkademikPage: React.FC = () => {
  const { setSelectedRoomForNav, setIsRoomNavModalOpen, showToast, rooms } = useApp();

  const [portalMode, setPortalMode] = useState<'student' | 'lecturer'>('student');
  const [activeTab, setActiveTab] = useState<'today' | 'all' | 'requests'>('today');

  const handleOpenNav = (roomName: string) => {
    const r =
      rooms.find(
        (rm) =>
          rm.name.toLowerCase().includes(roomName.toLowerCase()) ||
          rm.code.toLowerCase().includes(roomName.toLowerCase())
      ) || rooms[0];
    setSelectedRoomForNav(r);
    setIsRoomNavModalOpen(true);
  };

  const handlePresence = () => {
    showToast('Presensi digital berhasil divalidasi dengan GPS Geolocation Kampus Limau Manih!', 'success');
  };

  const handleReportIssue = () => {
    showToast('Laporan kendala fasilitas telah dikirimkan ke Tim Sarana & Prasarana FTI.', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
            <span className="bg-blue-100 px-2 py-0.5 rounded font-mono">PORTAL AKADEMIK</span>
            <span>•</span>
            <span className="text-slate-500">SSO Integrasi Mahasiswa &amp; Dosen</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Portal Informasi Akademik FTI Unand
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Akses personal jadwal kuliah, lokasi ruang perkuliahan fisik, dan presensi mandiri terintegrasi.
          </p>
        </div>

        {/* View Switcher: Student vs Lecturer */}
        <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
          <button
            onClick={() => setPortalMode('student')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              portalMode === 'student'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Mode Mahasiswa</span>
          </button>
          <button
            onClick={() => setPortalMode('lecturer')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              portalMode === 'lecturer'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Mode Dosen Pengampu</span>
          </button>
        </div>
      </div>

      {/* User Profile Summary Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-blue-700/20">
            {portalMode === 'student' ? 'MA' : 'RA'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">
                {portalMode === 'student'
                  ? 'M. Alghifari Rahman'
                  : 'Dr. Eng. Rahmad, M.T.'}
              </h2>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                {portalMode === 'student' ? 'Mahasiswa Aktif' : 'Dosen Utama'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {portalMode === 'student'
                ? 'NIM: 2111522001 • Departemen Sistem Informasi • Semester 7'
                : 'NIP: 19820412 200812 1 003 • Departemen Sistem Informasi • Bidang Data Engineering'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-5 text-xs text-slate-600">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              {portalMode === 'student' ? 'Total SKS' : 'Beban BKD'}
            </span>
            <span className="font-bold text-slate-800 text-sm">
              {portalMode === 'student' ? '21 SKS' : '10 SKS Aktif'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              Tahun Ajaran
            </span>
            <span className="font-bold text-blue-700 text-sm">2024/2025 Ganjil</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              {portalMode === 'student' ? 'Dosen PA' : 'Jumlah Bimbingan'}
            </span>
            <span className="font-bold text-slate-800 text-sm">
              {portalMode === 'student' ? 'Prof. Surya Afnarius' : '18 Mahasiswa'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('today')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'today'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Jadwal Kuliah Hari Ini (Senin)
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'all'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Semua Rombel Semester Ini (7 MK)
        </button>
      </div>

      {/* Today's Schedule Cards */}
      {activeTab === 'today' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Jadwal Perkuliahan Hari Ini — Senin, 21 Oktober 2024
            </h3>
            <span className="text-xs text-slate-500">2 Sesi Perkuliahan Terdaftar</span>
          </div>

          {/* Class Card 1 - Ongoing */}
          <div className="bg-white rounded-xl border border-blue-300 shadow-sm p-5 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-blue-600" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  SEDANG BERLANGSUNG
                </span>
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  SI211 • 3 SKS
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>07:30 - 09:10 WIB (Sesi 1)</span>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold text-slate-800">
                Basis Data Terdistribusi (Kelas A)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Dosen Pengampu: Dr. Eng. Rahmad, M.T. &amp; Husnil Kamil, M.T.
              </p>
            </div>

            {/* Room Location Info Box */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-xs">
                    Ruang G-203 (Teori Multimedia)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Gedung FTI Lantai 2 • Sayap Timur • Fasilitas: 2 AC, Smart TV 75"
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleOpenNav('G-203')}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Panduan Rute &amp; Navigasi Ruang</span>
              </button>
            </div>

            {/* Actions Bottom Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Pertemuan Ke-8 (Evaluasi Tengah Semester)</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePresence}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Presensi Mandiri / QR</span>
                </button>
                <button
                  onClick={() => showToast('Membuka materi kuliah di i-Learn UNAND...', 'info')}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                >
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>Materi Kuliah</span>
                </button>
              </div>
            </div>
          </div>

          {/* Class Card 2 - Upcoming */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-indigo-500" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                  <Clock className="w-3 h-3 text-slate-400" />
                  AKAN DATANG (13:30 WIB)
                </span>
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  IF301 • 3 SKS
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>13:30 - 15:10 WIB (Sesi 4)</span>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold text-slate-800">
                Pemrograman Web &amp; Aplikasi Mobile (Kelas B)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Dosen Pengampu: Ricky Akbar, M.Kom. • Modul Praktikum Lab
              </p>
            </div>

            {/* Room Location Info Box */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-xs">
                    Lab Software 1 (Lab Terpadu FTI)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Gedung FTI Lantai 2 • 40 Workstations i7/32GB • Dedicated GPU
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleOpenNav('Lab Software 1')}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Panduan Rute &amp; Navigasi Ruang</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* All Courses Tab */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3">Kode MK</th>
                  <th className="p-3">Mata Kuliah</th>
                  <th className="p-3">SKS</th>
                  <th className="p-3">Jadwal Sesi</th>
                  <th className="p-3">Ruang Kuliah</th>
                  <th className="p-3">Dosen Pengampu</th>
                  <th className="p-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-blue-700">SI211</td>
                  <td className="p-3 font-semibold text-slate-800">Basis Data Terdistribusi</td>
                  <td className="p-3 font-bold text-slate-700">3 SKS</td>
                  <td className="p-3 text-slate-600">Senin, 07:30 - 09:10 (Sesi 1)</td>
                  <td className="p-3 text-blue-700 font-semibold">G-203</td>
                  <td className="p-3 text-slate-600">Dr. Eng. Rahmad, M.T.</td>
                  <td className="p-3">
                    <button
                      onClick={() => handleOpenNav('G-203')}
                      className="text-xs text-blue-700 hover:underline font-semibold"
                    >
                      Rute
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-blue-700">SI315</td>
                  <td className="p-3 font-semibold text-slate-800">Rekayasa Perangkat Lunak</td>
                  <td className="p-3 font-bold text-slate-700">3 SKS</td>
                  <td className="p-3 text-slate-600">Rabu, 09:20 - 11:00 (Sesi 2)</td>
                  <td className="p-3 text-blue-700 font-semibold">G-205</td>
                  <td className="p-3 text-slate-600">Prof. Surya Afnarius</td>
                  <td className="p-3">
                    <button
                      onClick={() => handleOpenNav('G-205')}
                      className="text-xs text-blue-700 hover:underline font-semibold"
                    >
                      Rute
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-blue-700">IF301</td>
                  <td className="p-3 font-semibold text-slate-800">Pemrograman Web</td>
                  <td className="p-3 font-bold text-slate-700">3 SKS</td>
                  <td className="p-3 text-slate-600">Senin, 13:30 - 15:10 (Sesi 4)</td>
                  <td className="p-3 text-blue-700 font-semibold">Lab Software 1</td>
                  <td className="p-3 text-slate-600">Ricky Akbar, M.Kom.</td>
                  <td className="p-3">
                    <button
                      onClick={() => handleOpenNav('Lab Software 1')}
                      className="text-xs text-blue-700 hover:underline font-semibold"
                    >
                      Rute
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Action Widgets at Bottom */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Widget 1 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-1">
              <Calendar className="w-4 h-4 text-blue-700" />
              <span>Kalender Akademik Semester</span>
            </div>
            <p className="text-xs text-slate-500">
              Ujian Tengah Semester (UTS): 28 Okt - 08 Nov 2024. Batas akhir revisi KRS: 25 Okt 2024.
            </p>
          </div>
          <button
            onClick={() => showToast('Membuka kalender akademik universitas...', 'info')}
            className="mt-3 text-xs font-semibold text-blue-700 hover:underline text-left"
          >
            Lihat Agenda Lengkap →
          </button>
        </div>

        {/* Widget 2 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-1">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>Pengajuan Pindah Ruang / Kelas</span>
            </div>
            <p className="text-xs text-slate-500">
              Memerlukan ruang pengganti untuk kuliah darurat atau kompensasi libur nasional?
            </p>
          </div>
          <button
            onClick={() => showToast('Form pengajuan ruang pengganti insidental dibuka.', 'info')}
            className="mt-3 text-xs font-semibold text-blue-700 hover:underline text-left"
          >
            Ajukan Jadwal Pengganti →
          </button>
        </div>

        {/* Widget 3 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-1">
              <HelpCircle className="w-4 h-4 text-emerald-600" />
              <span>Lapor Kendala Sarana Ruangan</span>
            </div>
            <p className="text-xs text-slate-500">
              Laporkan jika terdapat AC, proyektor, terminal listrik, atau audio yang bermasalah.
            </p>
          </div>
          <button
            onClick={handleReportIssue}
            className="mt-3 text-xs font-semibold text-blue-700 hover:underline text-left"
          >
            Lapor ke Bagian Umum FTI →
          </button>
        </div>
      </div>
    </div>
  );
};
