import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
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

const AppContent: React.FC = () => {
  const { isLoggedIn, activePage } = useApp();

  // If user is not logged in, always render the high-fidelity SSO Login Page!
  if (!isLoggedIn) {
    return <LoginPage />;
  }

  // Once authenticated, render Layout with the selected active page
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
        return <HeatmapRuangPage />;
      case 'utilisasi_heatmap':
        return <UtilisasiHeatmapPage />;
      case 'generator_jadwal':
      case 'optimasi_ga':
        return <GeneratorJadwalPage />;
      case 'validasi_konflik':
        return <ValidasiKonflikPage />;
      case 'approval_wadek':
        return <ApprovalWadekPage />;
      case 'jadwal_kuliah':
        return <JadwalTerpaduPage />;
      case 'portal_akademik':
        return <PortalAkademikPage />;
      default:
        return <DashboardAdminPage />;
    }
  };

  return <Layout>{renderActivePage()}</Layout>;
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
