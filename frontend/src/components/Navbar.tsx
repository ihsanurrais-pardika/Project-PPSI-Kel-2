import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Bell, Shield, UserCheck, ChevronDown, Check } from 'lucide-react';
import { UserRole } from '../types';

export const Navbar: React.FC = () => {
  const { currentUser, currentRole, setCurrentRole, conflicts, setActivePage } = useApp();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const unresolvedCount = conflicts.filter(c => !c.isResolved).length;

  const rolesList: { role: UserRole; title: string; desc: string }[] = [
    { role: 'admin', title: 'Admin / Penjadwal Fakultas', desc: 'Pengelola Sentral & Penjadwal Lintas Prodi (UC-05 s.d. UC-18)' },
    { role: 'wadek1', title: 'Wakil Dekan I (WD1)', desc: 'Pemberi Persetujuan Akademik (UC-09, UC-10, UC-11)' },
    { role: 'departemen_si', title: 'Departemen SI', desc: 'Pengaju Kebutuhan Prodi Sistem Informasi (UC-03, UC-04)' },
    { role: 'departemen_if', title: 'Departemen IF', desc: 'Pengaju Kebutuhan Prodi Informatika (UC-03, UC-04)' },
    { role: 'departemen_tk', title: 'Departemen TK', desc: 'Pengaju Kebutuhan Prodi Teknik Komputer (UC-03, UC-04)' },
    { role: 'dosen', title: 'Dosen (Pengampu / Tandem)', desc: 'Pendidik & Cek Ruang Kosong (UC-19, UC-20, UC-21)' },
    { role: 'mahasiswa', title: 'Mahasiswa', desc: 'Peserta Didik, Jadwal & Navigasi Ruang (UC-19, UC-20, UC-21)' },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Title & subtitle breadcrumb */}
      <div>
        <h1 className="text-sm font-bold text-slate-900 leading-tight">
          Sistem Informasi Penjadwalan Perkuliahan & Manajemen Ruang Terintegrasi
        </h1>
        <p className="text-[11px] text-slate-500 leading-tight">
          FTI UNAND / Konsol Operasional Akademik Terpusat
        </p>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-4">
        {/* Search bar */}
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari ruang, mata kuliah, dosen..."
            className="w-64 pl-9 pr-12 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-blue-500 focus:outline-hidden transition-all"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 bg-slate-200/70 rounded-md">
            Ctrl+K
          </span>
        </div>

        {/* Role Switcher Pill (Great for interactive evaluation according to PRD RBAC matrix!) */}
        <div className="relative">
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 text-xs font-bold hover:bg-blue-100 transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span className="max-w-[140px] truncate">{currentUser.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
          </button>

          {roleMenuOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 z-50 animate-scale-up">
              <div className="px-3 py-2 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-900">Uji Hak Akses Pengguna (RBAC)</div>
                <div className="text-[11px] text-slate-500">Pilih peran aktor sesuai tabel 4 PRD:</div>
              </div>
              <div className="space-y-1 py-1 max-h-72 overflow-y-auto">
                {rolesList.map((r) => {
                  const isCurrent = currentRole === r.role;
                  return (
                    <button
                      key={r.role}
                      onClick={() => {
                        setCurrentRole(r.role);
                        setRoleMenuOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-start justify-between ${
                        isCurrent ? 'bg-blue-50 text-blue-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          {r.title}
                          {isCurrent && <span className="text-[10px] text-blue-600 font-normal">(Aktif)</span>}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{r.desc}</div>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Academic year indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          <span>2024/2025 Ganjil</span>
        </div>

        {/* Notification bell */}
        <button
          onClick={() => setActivePage('validasi_konflik')}
          title={`${unresolvedCount} Peringatan konflik memerlukan perhatian`}
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unresolvedCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
          )}
          {unresolvedCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
          )}
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
          {currentUser.name.charAt(0)}
        </div>
      </div>
    </header>
  );
};

