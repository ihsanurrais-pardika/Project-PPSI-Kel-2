import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Lock,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Building2,
  Server,
  Layers,
  MapPin,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const { login, showToast } = useApp();

  const [username, setUsername] = useState('alghifari@it.unand.ac.id');
  const [password, setPassword] = useState('SecretKey2024!');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedDemoRole, setSelectedDemoRole] = useState<UserRole>('admin');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Email/NIP dan Kata Sandi wajib diisi lengkap (PRD UC-01 AF-1).');
      showToast('Harap lengkapi semua kolom formulir login.', 'error');
      return;
    }

    if (password === 'salah') {
      setErrorMsg('Email atau kata sandi tidak valid. Silakan coba kembali (PRD UC-01 E1).');
      showToast('Kredensial login salah.', 'error');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      login(selectedDemoRole);
    }, 700);
  };

  // Interactive QA Tester as shown in design screenshot!
  const triggerQAState = (type: 'normal' | 'wrong' | 'empty' | 'loading' | 'success') => {
    setErrorMsg('');
    if (type === 'normal') {
      setUsername('alghifari@it.unand.ac.id');
      setPassword('SecretKey2024!');
      setIsLoading(false);
      showToast('State Formulir: Normal input', 'info');
    } else if (type === 'wrong') {
      setUsername('alghifari@it.unand.ac.id');
      setPassword('salah');
      setErrorMsg('Email atau kata sandi SSO tidak sesuai. Periksa kembali NIP/Akun Anda.');
      showToast('State Formulir: Password salah (Error 401)', 'error');
    } else if (type === 'empty') {
      setUsername('');
      setPassword('');
      setErrorMsg('Email dan kata sandi wajib diisi.');
      showToast('State Formulir: Validasi input kosong', 'warning');
    } else if (type === 'loading') {
      setIsLoading(true);
      showToast('State Formulir: Simulasi loading autentikasi...', 'info');
      setTimeout(() => setIsLoading(false), 2000);
    } else if (type === 'success') {
      setUsername('alghifari@it.unand.ac.id');
      setPassword('SecretKey2024!');
      login(selectedDemoRole);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 md:p-8 font-sans selection:bg-blue-600 selection:text-white">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 overflow-hidden border border-slate-200">
        
        {/* Left Side: Institutional Blue Brand Hero (5 cols) */}
        <div className="lg:col-span-6 bg-gradient-to-br from-blue-800 via-blue-900 to-slate-950 p-8 md:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -top-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Identity */}
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-black text-xl text-white shadow-lg">
                  FTI
                </div>
                <div>
                  <div className="font-extrabold text-sm tracking-tight leading-tight">
                    UNIVERSITAS ANDALAS
                  </div>
                  <div className="text-xs text-blue-200 font-medium">
                    Fakultas Teknologi Informasi
                  </div>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Akreditasi Unggul
              </span>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-blue-500/20 text-blue-300 border border-blue-400/20 mb-4">
              OPTIMIZED ENGINE V4.2 • CP-SAT & GA
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight mb-3">
              Sistem Informasi Penjadwalan Perkuliahan & Manajemen Ruang Terintegrasi
            </h2>

            <p className="text-xs text-blue-100/90 leading-relaxed">
              Portal cerdas sintesis jadwal otomatis berbasis multi-constraint solver, eliminasi bentrok dosen, distribusi kapasitas ruang kuliah, dan sinkronisasi kurikulum berbasis luaran (OBE).
            </p>
          </div>

          {/* Middle: Campus Photo / Location Badge */}
          <div className="relative z-10 my-6 bg-slate-950/60 rounded-2xl p-4 border border-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between text-xs text-blue-200 pb-3 border-b border-white/10">
              <span className="flex items-center gap-1.5 font-semibold text-white">
                <MapPin className="w-4 h-4 text-rose-400" />
                Kampus Limau Manih, Padang
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-400">
                FTI-CORE-NODE #01
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3 text-center">
              <div>
                <div className="text-[10px] text-slate-400">Tahun Akademik</div>
                <div className="text-xs font-bold text-white mt-0.5">2024/2025</div>
                <div className="text-[10px] text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Ganjil
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400">Departemen FTI</div>
                <div className="text-xs font-bold text-white mt-0.5">SI • IF • TK</div>
                <div className="text-[10px] text-blue-300 flex items-center justify-center gap-1 mt-0.5">
                  <Layers className="w-3 h-3" /> 3 Terhubung
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400">Kondisi Server</div>
                <div className="text-xs font-bold text-white mt-0.5">100% Sync</div>
                <div className="text-[10px] text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
                  <Server className="w-3 h-3" /> Terkoneksi
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/10">
            <span>© 2025 Universitas Andalas</span>
            <span className="font-mono text-[10px]">SSO Authenticator v2.8</span>
          </div>
        </div>

        {/* Right Side: SSO Form & Test Bench (6 cols) */}
        <div className="lg:col-span-6 p-8 md:p-10 flex flex-col justify-between bg-white">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 mb-1">
              <ShieldCheck className="w-4 h-4" />
              Autentikasi Terpusat SSO
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Selamat Datang Kembali
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Gunakan akun resmi single sign-on (SSO / Portal Akademik) Universitas Andalas untuk mengelola dan memantau penjadwalan.
            </p>

            {/* Error banner if any */}
            {errorMsg && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-shake">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Institusi / NIP / Username SSO
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="nama@it.unand.ac.id atau 1985xxxx"
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-hidden font-medium text-slate-800 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Kata Sandi SSO
                  </label>
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      showToast('Silakan hubungi UPT TIK UNAND untuk reset kata sandi.', 'info');
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    Lupa Password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-hidden font-medium text-slate-800 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-600 font-medium">
                    Ingat sesi saya di perangkat ini
                  </span>
                </label>

                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  TLS 1.3 256-bit
                </span>
              </div>

              {/* Demo Role Selector (Allows testing all roles!) */}
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Masuk Sebagai Peran (Simulasi RBAC):
                </label>
                <select
                  value={selectedDemoRole}
                  onChange={(e) => setSelectedDemoRole(e.target.value as UserRole)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 focus:border-blue-600 focus:outline-hidden"
                >
                  <option value="admin">Admin Penjadwal Fakultas (Akses Penuh)</option>
                  <option value="wadek1">Wakil Dekan I - WD1 (Review & Approval)</option>
                  <option value="departemen_si">Departemen Sistem Informasi (Input Kebutuhan)</option>
                  <option value="departemen_if">Departemen Informatika (Input Kebutuhan)</option>
                  <option value="departemen_tk">Departemen Teknik Komputer (Input Kebutuhan)</option>
                  <option value="dosen">Dosen Pengampu / Tandem</option>
                  <option value="mahasiswa">Mahasiswa (Portal Publik)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs text-white bg-blue-700 hover:bg-blue-800 active:scale-98 shadow-md shadow-blue-700/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi Kredensial SSO...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Sistem</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Help text */}
            <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 leading-relaxed flex items-start gap-2">
              <span className="text-blue-600 font-bold">ℹ</span>
              <span>
                Mengalami kendala otentikasi akun? Silakan hubungi <strong>Unit Pelaksana Teknis Teknologi Informasi dan Komunikasi (UPT TIK) UNAND</strong> atau Sub-bagian Akademik FTI Gedung B Kampus Limau Manih.
              </span>
            </div>
          </div>

          {/* Bottom Interactive QA State Bench (From Screenshot!) */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold text-slate-600 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                Uji Coba State Formulir (Interaktif)
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                Interactive QA
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              <button
                type="button"
                onClick={() => triggerQAState('normal')}
                className="px-2 py-1.5 text-[10px] font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors truncate"
              >
                1. Normal
              </button>
              <button
                type="button"
                onClick={() => triggerQAState('wrong')}
                className="px-2 py-1.5 text-[10px] font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors truncate"
              >
                2. Salah Sandi
              </button>
              <button
                type="button"
                onClick={() => triggerQAState('empty')}
                className="px-2 py-1.5 text-[10px] font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors truncate"
              >
                3. Validasi Kosong
              </button>
              <button
                type="button"
                onClick={() => triggerQAState('loading')}
                className="px-2 py-1.5 text-[10px] font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors truncate"
              >
                4. Loading
              </button>
              <button
                type="button"
                onClick={() => triggerQAState('success')}
                className="px-2 py-1.5 text-[10px] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors truncate"
              >
                5. Berhasil
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
