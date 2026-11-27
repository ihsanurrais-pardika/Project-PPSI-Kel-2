import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { Toast } from './components/Toast';
import { LoginPage } from './pages/LoginPage';
import { DashboardAdminPage } from './pages/DashboardAdminPage';
import { FormUsulanMKPage } from './pages/FormUsulanMKPage';
import { KebutuhanDepartemenPage } from './pages/KebutuhanDepartemenPage';
import { InventarisRuangPage } from './pages/InventarisRuangPage';
import { HeatmapRuangPage } from './pages/HeatmapRuangPage';
import { GeneratorJadwalPage } from './pages/GeneratorJadwalPage';
import { ValidasiKonflikPage } from './pages/ValidasiKonflikPage';
import { ApprovalWadekPage } from './pages/ApprovalWadekPage';
import { JadwalTerpaduPage } from './pages/JadwalTerpaduPage';
import { PortalAkademikPage } from './pages/PortalAkademikPage';
import { UtilisasiHeatmapPage } from './pages/UtilisasiHeatmapPage';
import { WadekWorkspacePage } from './pages/WadekWorkspacePage';
import { DepartemenWorkspacePage } from './pages/DepartemenWorkspacePage';
import { PengaturanSistemPage } from './pages/PengaturanSistemPage';

const AppContent: React.FC = () => {
  const { isLoggedIn, activePage, currentRole } = useApp();

  // If user is not logged in, render the SSO Login Page
  if (!isLoggedIn) {
    return <LoginPage />;
  }

  // Wadek 1 dedicated executive workspace
  if (currentRole === 'wadek1') {
    return <WadekWorkspacePage />;
  }

  // Department accounts (SI, IF, TK) dedicated workspace (UC-03 & UC-04)
  if (
    currentRole === 'departemen_si' ||
    currentRole === 'departemen_if' ||
    currentRole === 'departemen_tk'
  ) {
    return <DepartemenWorkspacePage />;
  }

  // Standard Layout with pages for Admin and others
  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard_admin':
        return <DashboardAdminPage />;
      case 'form_usulan_mk':
        return <FormUsulanMKPage />;
      case 'kebutuhan_departemen':
      case 'kebutuhan_si':
      case 'kebutuhan_if':
      case 'kebutuhan_tk':
        return <KebutuhanDepartemenPage />;
      case 'inventaris_ruang':
        return <InventarisRuangPage />;
      case 'ketersediaan_ruang':
      case 'cari_ruang':
        return <HeatmapRuangPage />;
      case 'utilisasi_heatmap':
        return currentRole === 'dosen' || currentRole === 'mahasiswa' ? <HeatmapRuangPage /> : <UtilisasiHeatmapPage />;
      case 'generator_jadwal':
      case 'optimasi_ga':
        return <GeneratorJadwalPage />;
      case 'validasi_konflik':
        return currentRole === 'admin' ? <ValidasiKonflikPage /> : <DashboardAdminPage />;
      case 'approval_wadek':
        return <ApprovalWadekPage />;
      case 'jadwal_kuliah':
        return <JadwalTerpaduPage />;
      case 'portal_akademik':
        return <PortalAkademikPage />;
      case 'pengaturan':
        return <PengaturanSistemPage />;
      default:
        return <DashboardAdminPage />;
    }
  };

  return <Layout>{renderActivePage()}</Layout>;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
        <Toast />
      </AppProvider>
    </ErrorBoundary>
  );
}
