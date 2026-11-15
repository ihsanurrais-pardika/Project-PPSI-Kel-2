import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Lock,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Server,
  Layers,
  MapPin,
  ArrowRight,
  Eye,
  EyeOff,
  Cloud,
  SlidersHorizontal,
  HelpCircle,
  Building2,
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
  const [activeQA, setActiveQA] = useState<'normal' | 'wrong' | 'empty' | 'loading' | 'success'>('normal');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Email/NIP dan Kata Sandi wajib diisi lengkap (PRD UC-01 AF-1).');
      showToast('Harap lengkapi semua kolom formulir login.', 'error');
      return;
    }

    if (password === 'salah') {
      setErrorMsg('Email atau kata sandi SSO tidak sesuai. Periksa kembali NIP/Akun Anda.');
      showToast('Kredensial login salah.', 'error');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      login('admin');
      showToast('Login berhasil sebagai Administrator Penjadwalan FTI UNAND', 'success');
    }, 700);
  };

  // Interactive QA Tester matching the mockup!
  const triggerQAState = (type: 'normal' | 'wrong' | 'empty' | 'loading' | 'success') => {
    setActiveQA(type);
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
      setErrorMsg('Email dan kata sandi SSO wajib diisi.');
      showToast('State Formulir: Validasi input kosong', 'warning');
    } else if (type === 'loading') {
      setIsLoading(true);
      showToast('State Formulir: Simulasi loading autentikasi...', 'info');
      setTimeout(() => setIsLoading(false), 2000);
    } else if (type === 'success') {
      setUsername('alghifari@it.unand.ac.id');
      setPassword('SecretKey2024!');
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        login('admin');
        showToast('Login SSO berhasil diverifikasi!', 'success');
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/80 flex items-center justify-center p-4 md:p-8 font-sans selection:bg-blue-600 selection:text-white">
      <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 overflow-hidden border border-slate-200/80">
        
        {/* Left Side: Institutional Blue Brand Hero (5.5 cols) */}
        <div className="lg:col-span-6 bg-[#1e40af] p-8 md:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Top Brand Identity */}
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-[#1e40af] flex items-center justify-center font-bold text-lg shadow-sm">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z" />
                  </svg>
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

          {/* Middle: Campus Illustration / Limau Manih Card */}
          <div className="relative z-10 my-6 bg-[#172554]/90 rounded-xl p-4 border border-blue-300/20">
            <div className="h-28 rounded-lg bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-white/10 relative overflow-hidden flex items-end p-3 shadow-inner">
              {/* Silhouette architecture background */}
              <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:12px_12px]" />
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <Building2 className="w-28 h-28 text-white" />
              </div>
              <div className="relative z-10 w-full flex items-center justify-between text-xs text-white">
                <span className="flex items-center gap-1.5 font-medium text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  Kampus Limau Manih, Padang
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
            <span className="font-mono text-[10px]">SSO Authenticator v2.8</span>
          </div>
        </div>

        {/* Right Side: SSO Login Form (6.5 cols) */}
        <div className="lg:col-span-6 p-8 md:p-10 flex flex-col justify-between bg-white">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 mb-1">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span>Autentikasi Terpusat SSO</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
              Selamat Datang Kembali
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Gunakan akun resmi single sign-on (SSO / Portal Akademik) Universitas Andalas untuk mengelola dan memantau penjadwalan.
            </p>

            {/* Error Message if any */}
            {errorMsg && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Institusi / NIP / Username SSO
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="nama@it.unand.ac.id"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none text-slate-800"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Kata Sandi SSO
                  </label>
                  <a
                    href="#lupa-password"
                    onClick={(e) => {
                      e.preventDefault();
                      showToast('Silakan hubungi UPT TIK UNAND untuk verifikasi reset kata sandi.', 'info');
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800"
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
                    className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 p-0.5"
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
                    className="w-3.5 h-3.5 text-blue-700 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-600">
                    Ingat sesi saya di perangkat ini
                  </span>
                </label>

                <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  TLS 1.3 256-bit
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-lg font-semibold text-xs text-white bg-[#1e3a8a] hover:bg-blue-900 active:scale-[0.99] shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi Kredensial SSO...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    <span>Masuk ke Sistem</span>
                  </>
                )}
              </button>
            </form>

            {/* Help Note Box */}
            <div className="mt-5 p-3 rounded-lg bg-blue-50/60 border border-blue-100 text-[11px] text-slate-600 leading-relaxed flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <span>
                Mengalami kendala otentikasi akun? Silakan hubungi <strong>Unit Pelaksana Teknis Teknologi Informasi dan Komunikasi (UPT TIK) UNAND</strong> atau Sub-bagian Akademik FTI Gedung B Kampus Limau Manih.
              </span>
            </div>
          </div>

          {/* Bottom Interactive QA State Bench (Exact as in Screenshot!) */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                <span>Uji Coba State Formulir (Interaktif)</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Interactive QA
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => triggerQAState('normal')}
                className={`py-1.5 px-2 text-[11px] font-semibold rounded-md transition-colors text-center truncate ${
                  activeQA === 'normal'
                    ? 'bg-[#1e3a8a] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                1. Normal
              </button>
              <button
                type="button"
                onClick={() => triggerQAState('wrong')}
                className={`py-1.5 px-2 text-[11px] font-semibold rounded-md transition-colors text-center truncate ${
                  activeQA === 'wrong'
                    ? 'bg-[#1e3a8a] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                2. Salah Sandi
              </button>
              <button
                type="button"
                onClick={() => triggerQAState('empty')}
                className={`py-1.5 px-2 text-[11px] font-semibold rounded-md transition-colors text-center truncate ${
                  activeQA === 'empty'
                    ? 'bg-[#1e3a8a] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                3. Validasi Kosong
              </button>
              <button
                type="button"
                onClick={() => triggerQAState('loading')}
                className={`py-1.5 px-2 text-[11px] font-semibold rounded-md transition-colors text-center truncate ${
                  activeQA === 'loading'
                    ? 'bg-[#1e3a8a] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                4. Loading
              </button>
              <button
                type="button"
                onClick={() => triggerQAState('success')}
                className={`py-1.5 px-2 text-[11px] font-semibold rounded-md transition-colors text-center truncate ${
                  activeQA === 'success'
                    ? 'bg-[#1e3a8a] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
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
