import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Lock,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Layers,
  MapPin,
  ArrowRight,
  Eye,
  EyeOff,
  Cloud,
  SlidersHorizontal,
  HelpCircle,
  Building2,
  Sparkles,
  X,
  ShieldAlert,
} from 'lucide-react';
import { UserRole } from '../types';

interface RegisteredAccount {
  id: string;
  email: string;
  nipOrNim: string;
  password: string;
  name: string;
  role: UserRole;
  roleLabel: string;
  department: string;
  icon: string;
}

// Master Akun Resmi SIPRAMA FTI UNAND (Sesuai Ketentuan User & PRD)
const OFFICIAL_ACCOUNTS: RegisteredAccount[] = [
  {
    id: 'usr-wadek1',
    email: 'Wadek1@it.unand.ac.id',
    nipOrNim: '19750312 200212 1 002',
    password: 'wadek1ftiunand',
    name: 'Dr. Eng. Rahmadi, M.T.',
    role: 'wadek1',
    roleLabel: 'Wakil Dekan I (Bidang Akademik)',
    department: 'Fakultas Teknologi Informasi',
    icon: '🎓',
  },
  {
    id: 'usr-kadep-si',
    email: 'kadepsi@it.unand.ac.id',
    nipOrNim: '19840915 200812 1 002',
    password: 'kadepsiftiunand',
    name: 'Ricky Akbar, M.Kom.',
    role: 'departemen_si',
    roleLabel: 'Ketua Departemen Sistem Informasi',
    department: 'Departemen Sistem Informasi',
    icon: '💻',
  },
  {
    id: 'usr-kadep-if',
    email: 'kadepif@it.unand.ac.id',
    nipOrNim: '19760724 200212 1 001',
    password: 'kadepifftiunand',
    name: 'Dr. Ir. Wahyudi, S.T., M.T.',
    role: 'departemen_if',
    roleLabel: 'Ketua Departemen Informatika',
    department: 'Departemen Informatika',
    icon: '🖥️',
  },
  {
    id: 'usr-kadep-tekkom',
    email: 'kadeptekkom@it.unand.ac.id',
    nipOrNim: '19790412 200604 2 001',
    password: 'kadeptekkomftiunand',
    name: 'Dr. Eng. Tati Erlina, M.IT.',
    role: 'departemen_tk',
    roleLabel: 'Ketua Departemen Teknik Komputer',
    department: 'Departemen Teknik Komputer',
    icon: '🔌',
  },
  {
    id: 'usr-dosen',
    email: 'dosen@it.unand.ac.id',
    nipOrNim: '19820412 200812 1 003',
    password: 'dosenftiunand',
    name: 'Dr. Eng. Rahmad, M.T.',
    role: 'dosen',
    roleLabel: 'Dosen Pengampu',
    department: 'Departemen Sistem Informasi',
    icon: '📚',
  },
  {
    id: 'usr-mahasiswa',
    email: 'ihsan@gmail.com',
    nipOrNim: '2211522001',
    password: 'ihsan123',
    name: 'Ihsan',
    role: 'mahasiswa',
    roleLabel: 'Mahasiswa Aktif',
    department: 'Sistem Informasi (BP 22)',
    icon: '🎒',
  },
  {
    id: 'usr-admin',
    email: 'admin@gmail.com',
    nipOrNim: '12345678',
    password: 'password_admin_anda',
    name: 'Admin',
    role: 'admin',
    roleLabel: 'Administrator Sistem FTI',
    department: 'Konsol Operasional Akademik FTI',
    icon: '👨‍💼',
  },
];

export const LoginPage: React.FC = () => {
  const { login, showToast } = useApp();

  const [username, setUsername] = useState('admin@gmail.com');
  const [password, setPassword] = useState('password_admin_anda');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [activeQA, setActiveQA] = useState<'normal' | 'wrong' | 'empty' | 'loading' | 'success'>('normal');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedUser = username.trim();
    const trimmedPw = password.trim();

    if (!trimmedUser || !trimmedPw) {
      const msg = 'Sandi atau NIP/NIM/Email Anda salah.';
      setErrorMsg(msg);
      setShowErrorPopup(true);
      showToast(msg, 'warning');
      return;
    }

    setIsLoading(true);

    try {
      // Request ke Backend API Server (Membaca data riil dari tabel database MySQL Laragon)
      let response: Response | null = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: trimmedUser, password: trimmedPw }),
      }).catch(() => null);

      // Fallback koneksi langsung ke port 8000 jika proxy vite belum aktif
      if (!response) {
        response = await fetch('http://127.0.0.1:8000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: trimmedUser, password: trimmedPw }),
        }).catch(() => null);
      }

      setIsLoading(false);

      if (response) {
        if (response.ok) {
          const data = await response.json();
          login(data.role, data.user);
          showToast(data.message || `Login berhasil sebagai ${data.role}`, 'success');
          return;
        } else {
          // Status 401 Unauthorized dari database (Data tidak ditemukan, kosong, atau password salah)
          const errData = await response.json().catch(() => ({}));
          const detailMsg = errData.detail || 'Sandi atau NIP/NIM/Email Anda salah.';
          setErrorMsg(detailMsg);
          setShowErrorPopup(true);
          showToast('Sandi atau NIP/NIM/Email Anda salah.', 'error');
          return;
        }
      } else {
        // Jika server backend belum dijalankan
        const failMsg = 'Tidak dapat membaca database. Pastikan server backend aktif (python backend/server.py) dan database Laragon berjalan.';
        setErrorMsg(failMsg);
        setShowErrorPopup(true);
        showToast(failMsg, 'error');
        return;
      }
    } catch (err) {
      setIsLoading(false);
      const failMsg = 'Terjadi kesalahan saat memeriksa data pengguna di database.';
      setErrorMsg(failMsg);
      setShowErrorPopup(true);
      showToast(failMsg, 'error');
    }
  };

  const setPresetAccount = (acc: RegisteredAccount) => {
    setUsername(acc.email);
    setPassword(acc.password);
    setErrorMsg('');
    setShowErrorPopup(false);
    showToast(`Akun dipilih: ${acc.roleLabel}`, 'info');
  };

  // Interactive QA Tester matching the PRD test bench
  const triggerQAState = (type: 'normal' | 'wrong' | 'empty' | 'loading' | 'success') => {
    setActiveQA(type);
    setErrorMsg('');
    setShowErrorPopup(false);

    if (type === 'normal') {
      setUsername('Wadek1@it.unand.ac.id');
      setPassword('wadek1ftiunand');
      setIsLoading(false);
      showToast('State Formulir: Normal input (Wadek 1)', 'info');
    } else if (type === 'wrong') {
      setUsername('Wadek1@it.unand.ac.id');
      setPassword('salah_password');
      setErrorMsg('Sandi atau NIP/NIM/Email Anda salah.');
      setShowErrorPopup(true);
      showToast('State Formulir: Password salah (Error 401 Popup)', 'error');
    } else if (type === 'empty') {
      setUsername('');
      setPassword('');
      setErrorMsg('Sandi atau NIP/NIM/Email Anda salah.');
      setShowErrorPopup(true);
      showToast('State Formulir: Validasi input kosong', 'warning');
    } else if (type === 'loading') {
      setIsLoading(true);
      showToast('State Formulir: Simulasi loading autentikasi...', 'info');
      setTimeout(() => setIsLoading(false), 2000);
    } else if (type === 'success') {
      setUsername('Wadek1@it.unand.ac.id');
      setPassword('wadek1ftiunand');
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        login('wadek1');
        showToast('Login SSO berhasil diverifikasi!', 'success');
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/80 flex items-center justify-center p-4 md:p-8 font-sans selection:bg-blue-600 selection:text-white">
      {/* ── POPUP MODAL NOTIFIKASI JIKA SALAH KREDENSIAL ── */}
      {showErrorPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-rose-100 text-center animate-in zoom-in-95 duration-150 relative">
            <button
              onClick={() => setShowErrorPopup(false)}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3.5 border border-rose-200">
              <ShieldAlert className="w-6 h-6 text-rose-600" />
            </div>

            <h4 className="text-base font-bold text-slate-800 mb-1.5">
              Autentikasi Gagal
            </h4>

            <p className="text-xs md:text-sm text-slate-600 leading-relaxed mb-5 font-medium">
              {errorMsg || 'Sandi atau NIP/NIM/Email Anda salah.'}
            </p>

            <button
              type="button"
              onClick={() => {
                setShowErrorPopup(false);
                setPassword('');
              }}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.99] transition-all shadow-sm cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      )}

      {/* ── CARD LOGIN UTAMA ── */}
      <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 overflow-hidden border border-slate-200/80">
        {/* Left Side: Institutional Blue Brand Hero (6 cols) */}
        <div className="lg:col-span-6 bg-[#082c78] p-8 md:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Top Brand Identity */}
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm">
                <img src="LOGO_FTI_SOSMED-03.png" alt="logo" />
                </div>
                <div>
                  <div className="font-bold text-xs tracking-wider uppercase leading-tight text-white">
                    UNIVERSITAS ANDALAS
                  </div>
                  <div className="text-[11px] text-blue-100 font-medium">
                    Fakultas Teknologi Informasi
                  </div>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-emerald-300 border border-white/20 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Akreditasi Unggul
              </span>
            </div>

            <div className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-[#172554] text-blue-200 border border-blue-400/20 mb-3 font-mono">
              OPTIMIZED ENGINE V4.2 • CP-SAT &amp; GA
            </div>

            <h2 className="text-2xl md:text-[26px] font-bold text-white leading-snug mb-3 tracking-tight">
              Sistem Informasi Penjadwalan Perkuliahan &amp; Manajemen Ruang Terintegrasi
            </h2>

            <p className="text-xs text-blue-100/90 leading-relaxed font-normal">
              Portal cerdas sintesis jadwal otomatis berbasis multi-constraint solver, eliminasi bentrok dosen, distribusi kapasitas ruang kuliah, dan sinkronisasi kurikulum berbasis luaran (OBE).
            </p>
          </div>

          {/* Middle: Campus Illustration / Limau Manis Card */}
          <div className="relative z-10 my-6 bg-[#172554]/90 rounded-xl p-4 border border-blue-300/20">
            <div className="h-28 rounded-lg bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-white/10 relative overflow-hidden flex items-end p-3 shadow-inner">
              <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:12px_12px]" />
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <Building2 className="w-28 h-28 text-white" />
              </div>
              <div className="relative z-10 w-full flex items-center justify-between text-xs text-white">
                <span className="flex items-center gap-1.5 font-medium text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  Kampus Limau Manis, Padang
                </span>
                <span className="text-[10px] font-mono font-bold text-blue-200">
                  FTI-CORE-NODE #01
                </span>
              </div>
            </div>

            {/* 3 Metric Sub-boxes */}
            <div className="grid grid-cols-3 gap-2 pt-3 text-center border-t border-white/10 mt-3">
              <div className="bg-white/5 rounded-lg p-2">
                <div className="text-[10px] text-blue-200">Tahun Akademik</div>
                <div className="text-xs font-bold text-white mt-0.5">2024/2025</div>
                <div className="text-[10px] text-emerald-300 flex items-center justify-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Ganjil
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-2">
                <div className="text-[10px] text-blue-200">Departemen FTI</div>
                <div className="text-xs font-bold text-white mt-0.5">SI • IF • TK</div>
                <div className="text-[10px] text-blue-300 flex items-center justify-center gap-1 mt-0.5">
                  <Layers className="w-2.5 h-2.5" /> 3 Terhubung
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-2">
                <div className="text-[10px] text-blue-200">Kondisi Server</div>
                <div className="text-xs font-bold text-white mt-0.5">100% Sync</div>
                <div className="text-[10px] text-emerald-300 flex items-center justify-center gap-1 mt-0.5">
                  <Cloud className="w-2.5 h-2.5" /> Terkoneksi
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="relative z-10 flex items-center justify-between text-[11px] text-blue-200/80 pt-2 border-t border-white/10">
            <span>© 2025 Universitas Andalas</span>
            <span className="font-mono text-[10px]">Python API • SSO v2.8</span>
          </div>
        </div>

        {/* Right Side: SSO Login Form (6 cols) */}
        <div className="lg:col-span-6 p-7 md:p-9 flex flex-col justify-between bg-white">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 mb-1">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span>Autentikasi Terpusat SSO UNAND</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
              Selamat Datang Kembali
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Gunakan akun resmi single sign-on untuk mengakses konsol penjadwalan akademik sesuai peran Anda.
            </p>

            {/* Quick Role Switcher Buttons Sesuai Daftar User */}
            <div className="mt-4 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  Pilih Akun Login Cepat:
                </span>
                <span className="text-[9px] text-slate-400 font-normal">Klik untuk mengisi otomatis</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                {OFFICIAL_ACCOUNTS.map((acc) => {
                  const isSelected = username.toLowerCase() === acc.email.toLowerCase();
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setPresetAccount(acc)}
                      className={`p-1.5 rounded-lg border text-left font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#082c78] text-white border-blue-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="truncate">{acc.icon} {acc.role === 'wadek1' ? 'Wadek 1' : acc.role === 'departemen_si' ? 'Kadep SI' : acc.role === 'departemen_if' ? 'Kadep IF' : acc.role === 'departemen_tk' ? 'Kadep TK' : acc.role === 'dosen' ? 'Dosen' : acc.role === 'mahasiswa' ? 'Mahasiswa' : 'Admin'}</div>
                      <div className="text-[9px] opacity-80 font-normal truncate">{acc.email.split('@')[0]}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error Message Inline (selain Popup) */}
            {errorMsg && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* Form Input */}
            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Institusi / NIP / NIM SSO
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Wadek1@it.unand.ac.id atau NIP/NIM"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-hidden text-slate-800"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Kata Sandi SSO
                  </label>
                  <a
                    href="#lupa-password"
                    onClick={(e) => {
                      e.preventDefault();
                      showToast('Silakan hubungi UPT TIK UNAND untuk verifikasi reset kata sandi.', 'info');
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                  >
                    Lupa Password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-hidden text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 p-0.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-700 rounded border-slate-300"
                  />
                  <span className="text-xs text-slate-600">
                    Ingat sesi perangkat ini
                  </span>
                </label>

                <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  TLS 1.3
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-[#082c78] hover:bg-[#0c3999] active:scale-[0.99] shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi ke Backend Python...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Konsol Sistem</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Interactive QA State Tester (Sesuai Mockup) */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-slate-500" />
                Uji Coba State Formulir (Interaktif):
              </span>
              <span className="text-[9px] font-mono text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.2 rounded">
                Interactive QA
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => triggerQAState('normal')}
                className={`py-1 px-1 rounded text-center font-medium border transition-colors cursor-pointer ${
                  activeQA === 'normal'
                    ? 'bg-blue-50 text-blue-700 border-blue-200 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                1. Normal
              </button>
              <button
                type="button"
                onClick={() => triggerQAState('wrong')}
                className={`py-1 px-1 rounded text-center font-medium border transition-colors cursor-pointer ${
                  activeQA === 'wrong'
                    ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                2. Salah Sandi
              </button>
              <button
                type="button"
                onClick={() => triggerQAState('empty')}
                className={`py-1 px-1 rounded text-center font-medium border transition-colors cursor-pointer ${
                  activeQA === 'empty'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                3. Validasi Kosong
              </button>
              <button
                type="button"
                onClick={() => triggerQAState('loading')}
                className={`py-1 px-1 rounded text-center font-medium border transition-colors cursor-pointer ${
                  activeQA === 'loading'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                4. Loading
              </button>
              <button
                type="button"
                onClick={() => triggerQAState('success')}
                className={`py-1 px-1 rounded text-center font-medium border transition-colors cursor-pointer ${
                  activeQA === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                5. Berhasil
              </button>
            </div>
          </div>

          {/* Bottom Help */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>UPT TIK UNAND &bull; FTI Kampus Limau Manis</span>
            <span className="text-slate-400 font-mono">Backend Python: Port 8000</span>
          </div>
        </div>
      </div>
    </div>
  );
};
