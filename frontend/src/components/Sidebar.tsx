import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Calendar,
  Cpu,
  ShieldAlert,
  Boxes,
  CalendarCheck,
  Grid3X3,
  GitBranch,
  CheckCircle2,
  Globe,
  History,
  Settings,
} from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  badge?: string;
  alertBadge?: string;
  statusBadge?: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export const Sidebar: React.FC = () => {
  const { activePage, setActivePage, currentUser, conflicts, scheduleApprovalStatus } = useApp();

  const unresolvedConflictsCount = conflicts.filter(c => !c.isResolved).length;

  const adminMenuSections: MenuSection[] = [
    {
      title: 'UTAMA',
      items: [
        { id: 'dashboard_admin', label: 'Dashboard Utama', icon: LayoutDashboard },
      ],
    },
    {
      title: 'PENJADWALAN TERPADU',
      items: [
        { id: 'jadwal_kuliah', label: 'Jadwal Perkuliahan', icon: Calendar },
        { id: 'generator_jadwal', label: 'Buat Jadwal Otomatis', icon: Cpu },
        {
          id: 'validasi_konflik',
          label: 'Validasi & Konflik',
          icon: ShieldAlert,
          alertBadge: unresolvedConflictsCount > 0 ? `${unresolvedConflictsCount}` : undefined,
        },
      ],
    },
    {
      title: 'MANAJEMEN RUANGAN',
      items: [
        { id: 'inventaris_ruang', label: 'Inventaris & Spek Ruang', icon: Boxes },
        { id: 'ketersediaan_ruang', label: 'Ketersediaan Ruang', icon: CalendarCheck },
        { id: 'utilisasi_heatmap', label: 'Statistik Ruang', icon: Grid3X3 },
      ],
    },
    {
      title: 'KEBUTUHAN DEPARTEMEN',
      items: [
        { id: 'kebutuhan_departemen', label: 'Tawaran Mata Kuliah', icon: GitBranch },
      ],
    },
    {
      title: 'TATA KELOLA & EKSEKUTIF',
      items: [
        {
          id: 'approval_wadek',
          label: 'Approval Wakil Dekan I',
          icon: CheckCircle2,
          statusBadge: scheduleApprovalStatus === 'Disetujui' ? 'Disetujui' : 'Review',
        },
        { id: 'portal_akademik', label: 'Portal Dosen & Mhs', icon: Globe },
        { id: 'audit_log', label: 'Riwayat & Audit Log', icon: History },
        { id: 'pengaturan', label: 'Pengaturan Sistem', icon: Settings },
      ],
    },
  ];

  // WD1 receives a focused workspace for review and decision making.
  const wadekMenuSections: MenuSection[] = [
    {
      title: 'TINJAUAN AKADEMIK',
      items: [
        { id: 'approval_wadek', label: 'Persetujuan Jadwal', icon: CheckCircle2, statusBadge: scheduleApprovalStatus === 'Disetujui' || scheduleApprovalStatus === 'Resmi' ? scheduleApprovalStatus : 'Review' },
        { id: 'jadwal_kuliah', label: 'Jadwal Hasil Optimasi', icon: Calendar },
        { id: 'portal_akademik', label: 'Portal Akademik', icon: Globe },
      ],
    },
  ];
  const menuSections = currentUser.role === 'wadek1' ? wadekMenuSections : adminMenuSections;

  const handleNavClick = (id: string) => {
    if (id === 'kebutuhan_si' || id === 'kebutuhan_if' || id === 'kebutuhan_tk' || id === 'kebutuhan_departemen') {
      setActivePage('kebutuhan_departemen');
    } else if (id === 'optimasi_ga') {
      setActivePage('generator_jadwal');
    } else if (id === 'utilisasi_heatmap') {
      setActivePage('utilisasi_heatmap');
    } else if (id === 'audit_log') {
      setActivePage('dashboard_admin');
    } else {
      setActivePage(id);
    }
  };

  const isItemActive = (id: string) => {
    if (id === 'kebutuhan_departemen' && (activePage === 'kebutuhan_departemen' || activePage === 'form_usulan_mk' || activePage === 'kebutuhan_si' || activePage === 'kebutuhan_if' || activePage === 'kebutuhan_tk')) {
      return true;
    }
    if (activePage === 'kebutuhan_departemen' && (id === 'kebutuhan_si' || id === 'kebutuhan_if' || id === 'kebutuhan_tk')) {
      return true;
    }
    if (activePage === 'utilisasi_heatmap' && id === 'utilisasi_heatmap') return true;
    return activePage === id;
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 select-none h-screen sticky top-0 overflow-y-auto">
      {/* Brand & Logo */}
      <div className="p-5 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white font-extrabold text-base shadow-md shadow-blue-500/20">
          FTI
        </div>
        <div>
          <div className="font-extrabold text-xs tracking-tight text-slate-900 leading-tight">
            UNIVERSITAS ANDALAS
          </div>
          <div className="text-[11px] font-semibold text-slate-500 leading-tight">
            Fakultas Teknologi Informasi
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-4 space-y-5 text-xs">
        {menuSections.map((sec, idx) => (
          <div key={idx}>
            <div className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 tracking-wider">
              {sec.title}
            </div>
            <div className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.id);

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold transition-all ${
                      active
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-500'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.alertBadge && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                          {item.alertBadge}
                        </span>
                      )}
                      {item.badge && (
                        <span className={`px-1.5 py-0.2 rounded-sm text-[9px] font-extrabold uppercase ${
                          active ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                      {item.statusBadge && (
                        <span className={`px-1.5 py-0.2 rounded-sm text-[9px] font-bold ${
                          active ? 'bg-blue-800 text-blue-100' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.statusBadge}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
};

