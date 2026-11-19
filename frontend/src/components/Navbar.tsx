import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Bell, LogOut, ChevronDown, User, ShieldCheck } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { activePage, currentUser, conflicts, setActivePage, logout } = useApp();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const unresolvedCount = conflicts.filter((c) => !c.isResolved).length;

  const getPageInfo = (page: string) => {
    switch (page) {
      case 'dashboard_admin':
        return { title: 'Dashboard Utama', category: 'Ringkasan Operasional' };
      case 'jadwal_kuliah':
        return { title: 'Jadwal Perkuliahan', category: 'Penjadwalan Terpadu' };
      case 'generator_jadwal':
      case 'optimasi_ga':
        return { title: 'Buat Jadwal Otomatis', category: 'Penjadwalan Terpadu' };
      case 'validasi_konflik':
        return { title: 'Validasi & Konflik', category: 'Penjadwalan Terpadu' };
      case 'inventaris_ruang':
        return { title: 'Inventaris & Spek Ruang', category: 'Manajemen Ruangan' };
      case 'ketersediaan_ruang':
        return { title: 'Ketersediaan Ruang', category: 'Manajemen Ruangan' };
      case 'utilisasi_heatmap':
        return { title: 'Statistik Ruang', category: 'Manajemen Ruangan' };
      case 'kebutuhan_departemen':
      case 'form_usulan_mk':
      case 'kebutuhan_si':
      case 'kebutuhan_if':
      case 'kebutuhan_tk':
        return { title: 'Tawaran Mata Kuliah', category: 'Kebutuhan Departemen' };
      case 'approval_wadek':
        return { title: 'Approval Wakil Dekan I', category: 'Tata Kelola' };
      case 'portal_akademik':
        return { title: 'Portal Dosen & Mahasiswa', category: 'Portal Publik' };
      case 'pengaturan':
        return { title: 'Pengaturan Sistem', category: 'Tata Kelola' };
      default:
        return { title: 'Dashboard Utama', category: 'Konsol Operasional' };
    }
  };

  const pageInfo = getPageInfo(activePage);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Admin Fakultas', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'wadek1':
        return { label: 'Wakil Dekan I', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'departemen_si':
        return { label: 'Departemen SI', color: 'bg-sky-50 text-sky-700 border-sky-200' };
      case 'departemen_if':
        return { label: 'Departemen IF', color: 'bg-violet-50 text-violet-700 border-violet-200' };
      case 'departemen_tk':
        return { label: 'Departemen TK', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: role.toUpperCase(), color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const badge = getRoleBadge(currentUser.role);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Title & subtitle breadcrumb */}
      <div>
        <h1 className="text-base font-extrabold text-slate-900 leading-tight">
          {pageInfo.title}
        </h1>
        <p className="text-[11px] text-slate-500 leading-tight">
          SIPRAMA FTI UNAND • {pageInfo.category}
        </p>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Search bar */}
        <div className="relative hidden md:block">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari ruang, mata kuliah, dosen..."
            className="w-56 pl-8 pr-12 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-blue-500 focus:outline-hidden transition-all placeholder:text-slate-400"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px] font-bold text-slate-400 bg-slate-200/70 rounded">
            Ctrl+K
          </span>
        </div>

        {/* Academic year indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-blue-900 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
          <span>2024/2025 Ganjil</span>
        </div>

        {/* Notification bell */}
        <button
          onClick={() => setActivePage('validasi_konflik')}
          title={`${unresolvedCount} Peringatan konflik memerlukan perhatian`}
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unresolvedCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
          )}
          {unresolvedCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
          )}
        </button>

        {/* Clean Profile Badge & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 pl-2.5 pr-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-900 leading-tight max-w-[150px] truncate">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-slate-500 leading-tight truncate">
                {currentUser.department || 'Konsol Akademik FTI'}
              </div>
            </div>

            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.color}`}>
              {badge.label}
            </span>

            <div className="w-8 h-8 rounded-lg bg-[#082c78] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {currentUser.name.charAt(0)}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50">
              <div className="px-3 py-2 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-900">{currentUser.name}</div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">{currentUser.email}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">NIP: {currentUser.nipOrNim}</div>
              </div>

              <div className="py-1 text-xs">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Sesi Pengguna
                </div>
                <div className="px-3 py-1 text-slate-600 text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Autentikasi SSO Aktif</span>
                </div>
              </div>

              <div className="pt-1 border-t border-slate-100">
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar dari Akun (Logout)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
