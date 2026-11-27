import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Settings,
  ChevronRight,
  Save,
  RotateCcw,
  Shield,
  Bell,
  Database,
  Globe,
  Users,
  Lock,
  Mail,
  Calendar,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Info,
  Cpu,
  Sliders,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Server,
  Key,
  Clock,
  UserCheck,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
type TabId = 'umum' | 'keamanan' | 'notifikasi' | 'integrasi' | 'manajemen_pengguna' | 'backup';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

// ─── Toggle Switch Component ──────────────────────────────────────────────────
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label?: string }> = ({
  checked,
  onChange,
  label,
}) => (
  <label className="flex items-center gap-2 cursor-pointer select-none">
    <div
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors ${
        checked ? 'bg-blue-600' : 'bg-slate-300'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </div>
    {label && <span className="text-xs text-slate-700 font-medium">{label}</span>}
  </label>
);

// ─── Section Wrapper ──────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({
  title,
  description,
  children,
}) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
    <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
      <h4 className="text-xs font-bold text-slate-900">{title}</h4>
      {description && <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>}
    </div>
    <div className="p-5 space-y-4">{children}</div>
  </div>
);

// ─── Field Row ────────────────────────────────────────────────────────────────
const FieldRow: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({
  label,
  hint,
  children,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
    <div className="sm:w-52 shrink-0">
      <label className="text-xs font-semibold text-slate-700">{label}</label>
      {hint && <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{hint}</p>}
    </div>
    <div className="flex-1">{children}</div>
  </div>
);

// ─── Input ────────────────────────────────────────────────────────────────────
const Input: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ElementType }
> = ({ icon: Icon, className = '', ...props }) => (
  <div className="relative">
    {Icon && (
      <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
    )}
    <input
      {...props}
      className={`w-full text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 ${
        Icon ? 'pl-8' : ''
      } text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors ${className}`}
    />
  </div>
);

// ─── Select ───────────────────────────────────────────────────────────────────
const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { options: string[] }> = ({
  options,
  className = '',
  ...props
}) => (
  <select
    {...props}
    className={`w-full text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors ${className}`}
  >
    {options.map((o) => (
      <option key={o}>{o}</option>
    ))}
  </select>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export const PengaturanSistemPage: React.FC = () => {
  const { showToast, currentUser } = useApp();

  const [activeTab, setActiveTab] = useState<TabId>('umum');

  // ── State: Pengaturan Umum ──
  const [namaInstansi, setNamaInstansi] = useState('Fakultas Teknologi Informasi');
  const [namaUniversitas, setNamaUniversitas] = useState('Universitas Andalas');
  const [tahunAkademik, setTahunAkademik] = useState('2024/2025');
  const [semester, setSemester] = useState('Ganjil');
  const [jamMulai, setJamMulai] = useState('07:30');
  const [jamSelesai, setJamSelesai] = useState('18:00');
  const [durasiSks, setDurasiSks] = useState('50');
  const [jeda, setJeda] = useState('10');
  const [bahasa, setBahasa] = useState('Bahasa Indonesia');
  const [zona, setZona] = useState('WIB (UTC+7)');

  // ── State: Keamanan ──
  const [ssoEnabled, setSsoEnabled] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('60');
  const [maxLogin, setMaxLogin] = useState('5');
  const [showPass, setShowPass] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [auditEnabled, setAuditEnabled] = useState(true);

  // ── State: Notifikasi ──
  const [emailNotif, setEmailNotif] = useState(true);
  const [emailApproval, setEmailApproval] = useState(true);
  const [emailKonflik, setEmailKonflik] = useState(true);
  const [emailPublikasi, setEmailPublikasi] = useState(false);
  const [smtpHost, setSmtpHost] = useState('smtp.unand.ac.id');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('siprama@it.unand.ac.id');
  const [inAppNotif, setInAppNotif] = useState(true);
  const [inAppSuara, setInAppSuara] = useState(false);

  // ── State: Integrasi ──
  const [siakUrl, setSiakUrl] = useState('https://siak.unand.ac.id/api/v2');
  const [siakEnabled, setSiakEnabled] = useState(true);
  const [bsreEnabled, setBsreEnabled] = useState(true);
  const [bsreUrl, setBsreUrl] = useState('https://bsre.bssn.go.id/api');
  const [calendarSync, setCalendarSync] = useState(false);

  // ── State: Manajemen Pengguna ──
  const mockUsers = [
    { id: 'u1', name: 'Dr. Eng. Ir. Administrator', role: 'Admin', email: 'alghifari@it.unand.ac.id', status: 'Aktif' },
    { id: 'u2', name: 'Dr. Eng. Rahmadi, M.T.', role: 'Wakil Dekan I', email: 'rahmadi@it.unand.ac.id', status: 'Aktif' },
    { id: 'u3', name: 'Ricky Akbar, M.Kom.', role: 'Kaprodi SI', email: 'kaprodi.si@it.unand.ac.id', status: 'Aktif' },
    { id: 'u4', name: 'Dr. Ir. Wahyudi, S.T., M.T.', role: 'Kaprodi IF', email: 'kaprodi.if@it.unand.ac.id', status: 'Aktif' },
    { id: 'u5', name: 'Dr. Eng. Tati Erlina, M.IT.', role: 'Kaprodi TK', email: 'kaprodi.tk@it.unand.ac.id', status: 'Nonaktif' },
  ];

  // ── State: Backup ──
  const [autoBackup, setAutoBackup] = useState(true);
  const [backupFrekuensi, setBackupFrekuensi] = useState('Harian');
  const [retensiBackup, setRetensiBackup] = useState('30');

  const tabs: Tab[] = [
    { id: 'umum', label: 'Umum', icon: Settings },
    { id: 'keamanan', label: 'Keamanan', icon: Shield },
    { id: 'notifikasi', label: 'Notifikasi', icon: Bell },
    { id: 'integrasi', label: 'Integrasi', icon: Globe },
    { id: 'manajemen_pengguna', label: 'Pengguna', icon: Users },
    { id: 'backup', label: 'Backup & Data', icon: Database },
  ];

  const handleSave = () => {
    showToast('Pengaturan sistem berhasil disimpan.', 'success');
  };

  const handleReset = () => {
    showToast('Pengaturan dikembalikan ke nilai default.', 'warning');
  };

  // ─── Tab Content: Umum ───────────────────────────────────────────────────────
  const renderUmum = () => (
    <div className="space-y-5">
      <Section title="Identitas Institusi" description="Informasi dasar institusi yang ditampilkan di seluruh sistem.">
        <FieldRow label="Nama Instansi / Fakultas" hint="Nama fakultas resmi">
          <Input value={namaInstansi} onChange={(e) => setNamaInstansi(e.target.value)} placeholder="Nama Instansi" />
        </FieldRow>
        <FieldRow label="Nama Universitas" hint="Nama universitas induk">
          <Input value={namaUniversitas} onChange={(e) => setNamaUniversitas(e.target.value)} />
        </FieldRow>
      </Section>

      <Section title="Periode Akademik Aktif" description="Tahun akademik dan semester yang sedang berjalan.">
        <FieldRow label="Tahun Akademik" hint="Format: YYYY/YYYY">
          <Input
            icon={Calendar}
            value={tahunAkademik}
            onChange={(e) => setTahunAkademik(e.target.value)}
            placeholder="2024/2025"
          />
        </FieldRow>
        <FieldRow label="Semester Aktif">
          <Select options={['Ganjil', 'Genap', 'Pendek']} value={semester} onChange={(e) => setSemester(e.target.value)} />
        </FieldRow>
      </Section>

      <Section title="Jam Operasional & Durasi SKS" description="Rentang waktu perkuliahan dan durasi per SKS.">
        <div className="grid grid-cols-2 gap-4">
          <FieldRow label="Jam Mulai Kuliah">
            <Input type="time" icon={Clock} value={jamMulai} onChange={(e) => setJamMulai(e.target.value)} />
          </FieldRow>
          <FieldRow label="Jam Selesai Kuliah">
            <Input type="time" icon={Clock} value={jamSelesai} onChange={(e) => setJamSelesai(e.target.value)} />
          </FieldRow>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FieldRow label="Durasi 1 SKS (menit)" hint="Menit per SKS teori">
            <Input type="number" icon={Sliders} value={durasiSks} onChange={(e) => setDurasiSks(e.target.value)} min={40} max={60} />
          </FieldRow>
          <FieldRow label="Jeda Antar Sesi (menit)" hint="Jedaantar slot jadwal">
            <Input type="number" icon={Sliders} value={jeda} onChange={(e) => setJeda(e.target.value)} min={5} max={30} />
          </FieldRow>
        </div>
      </Section>

      <Section title="Lokalisasi & Bahasa" description="Preferensi bahasa dan zona waktu tampilan sistem.">
        <FieldRow label="Bahasa Antarmuka">
          <Select options={['Bahasa Indonesia', 'English']} value={bahasa} onChange={(e) => setBahasa(e.target.value)} />
        </FieldRow>
        <FieldRow label="Zona Waktu">
          <Select options={['WIB (UTC+7)', 'WITA (UTC+8)', 'WIT (UTC+9)']} value={zona} onChange={(e) => setZona(e.target.value)} />
        </FieldRow>
      </Section>
    </div>
  );

  // ─── Tab Content: Keamanan ───────────────────────────────────────────────────
  const renderKeamanan = () => (
    <div className="space-y-5">
      <Section title="Autentikasi & SSO" description="Pengaturan masuk terpusat dan keamanan akun.">
        <FieldRow label="SSO UNAND" hint="Login terpadu via portal UNAND">
          <Toggle checked={ssoEnabled} onChange={setSsoEnabled} label={ssoEnabled ? 'Aktif' : 'Nonaktif'} />
        </FieldRow>
        <FieldRow label="Verifikasi Dua Langkah (2FA)" hint="OTP via email untuk admin">
          <Toggle checked={twoFactor} onChange={setTwoFactor} label={twoFactor ? 'Aktif' : 'Nonaktif'} />
        </FieldRow>
        <FieldRow label="Timeout Sesi (menit)" hint="Otomatis logout jika tidak aktif">
          <Input
            type="number"
            icon={Clock}
            value={sessionTimeout}
            onChange={(e) => setSessionTimeout(e.target.value)}
            min={15}
            max={480}
          />
        </FieldRow>
        <FieldRow label="Maks. Percobaan Login" hint="Akun dikunci setelah batas ini">
          <Input
            type="number"
            icon={Lock}
            value={maxLogin}
            onChange={(e) => setMaxLogin(e.target.value)}
            min={3}
            max={10}
          />
        </FieldRow>
      </Section>

      <Section title="Ganti Password Admin" description="Ubah password akun administrator sistem.">
        <FieldRow label="Password Saat Ini">
          <div className="relative">
            <Input
              type={showPass ? 'text' : 'password'}
              icon={Key}
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              placeholder="Masukkan password lama"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </FieldRow>
        <FieldRow label="Password Baru">
          <Input
            type="password"
            icon={Key}
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder="Min. 8 karakter"
          />
        </FieldRow>
        <FieldRow label="Konfirmasi Password">
          <Input
            type="password"
            icon={Key}
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            placeholder="Ulangi password baru"
          />
        </FieldRow>
        <div className="flex justify-end">
          <button
            onClick={() => {
              if (newPass !== confirmPass) return showToast('Password baru tidak cocok!', 'error');
              if (newPass.length < 8) return showToast('Password minimal 8 karakter!', 'warning');
              showToast('Password berhasil diperbarui.', 'success');
              setCurrentPass(''); setNewPass(''); setConfirmPass('');
            }}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 transition-colors"
          >
            Simpan Password
          </button>
        </div>
      </Section>

      <Section title="Audit & Jejak Aktivitas" description="Pencatatan aktivitas pengguna untuk keamanan sistem.">
        <FieldRow label="Aktifkan Audit Log" hint="Rekam seluruh aksi pengguna di sistem">
          <Toggle checked={auditEnabled} onChange={setAuditEnabled} label={auditEnabled ? 'Aktif' : 'Nonaktif'} />
        </FieldRow>
        {auditEnabled && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-[11px] text-emerald-800">
              Audit log aktif. Seluruh aktivitas dicatat dengan timestamp dan identitas pelaksana.
            </p>
          </div>
        )}
      </Section>
    </div>
  );

  // ─── Tab Content: Notifikasi ─────────────────────────────────────────────────
  const renderNotifikasi = () => (
    <div className="space-y-5">
      <Section title="Notifikasi Email" description="Pengaturan pengiriman email otomatis dari sistem.">
        <FieldRow label="Aktifkan Email Notifikasi" hint="Master switch notifikasi email">
          <Toggle checked={emailNotif} onChange={setEmailNotif} label={emailNotif ? 'Aktif' : 'Nonaktif'} />
        </FieldRow>
        {emailNotif && (
          <>
            <div className="border-t border-slate-100 pt-3 space-y-3">
              <FieldRow label="Notif. Approval & Pengesahan">
                <Toggle checked={emailApproval} onChange={setEmailApproval} label={emailApproval ? 'Ya' : 'Tidak'} />
              </FieldRow>
              <FieldRow label="Notif. Konflik Jadwal Baru">
                <Toggle checked={emailKonflik} onChange={setEmailKonflik} label={emailKonflik ? 'Ya' : 'Tidak'} />
              </FieldRow>
              <FieldRow label="Notif. Jadwal Dipublikasikan">
                <Toggle checked={emailPublikasi} onChange={setEmailPublikasi} label={emailPublikasi ? 'Ya' : 'Tidak'} />
              </FieldRow>
            </div>
          </>
        )}
      </Section>

      <Section title="Konfigurasi SMTP" description="Server email yang digunakan untuk pengiriman notifikasi.">
        <FieldRow label="Host SMTP" hint="Alamat server email outgoing">
          <Input icon={Server} value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.unand.ac.id" />
        </FieldRow>
        <FieldRow label="Port SMTP">
          <Input type="number" icon={Globe} value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} />
        </FieldRow>
        <FieldRow label="Username Email Pengirim">
          <Input icon={Mail} value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="siprama@it.unand.ac.id" />
        </FieldRow>
        <div className="flex justify-end">
          <button
            onClick={() => showToast('Koneksi SMTP berhasil diuji!', 'success')}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
          >
            Uji Koneksi SMTP
          </button>
        </div>
      </Section>

      <Section title="Notifikasi Dalam Aplikasi" description="Pemberitahuan langsung di dalam antarmuka SIPRAMA.">
        <FieldRow label="Aktifkan In-App Notification">
          <Toggle checked={inAppNotif} onChange={setInAppNotif} label={inAppNotif ? 'Aktif' : 'Nonaktif'} />
        </FieldRow>
        <FieldRow label="Efek Suara Notifikasi">
          <Toggle checked={inAppSuara} onChange={setInAppSuara} label={inAppSuara ? 'Aktif' : 'Nonaktif'} />
        </FieldRow>
      </Section>
    </div>
  );

  // ─── Tab Content: Integrasi ──────────────────────────────────────────────────
  const renderIntegrasi = () => (
    <div className="space-y-5">
      <Section title="Integrasi SIAK UNAND" description="Sinkronisasi data mahasiswa, dosen, dan kurikulum dengan SIAK.">
        <FieldRow label="Aktifkan Integrasi SIAK" hint="Sinkronisasi data secara periodik">
          <Toggle checked={siakEnabled} onChange={setSiakEnabled} label={siakEnabled ? 'Terhubung' : 'Nonaktif'} />
        </FieldRow>
        <FieldRow label="URL API SIAK" hint="Endpoint REST API SIAK">
          <Input icon={Globe} value={siakUrl} onChange={(e) => setSiakUrl(e.target.value)} />
        </FieldRow>
        {siakEnabled && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-semibold text-blue-800">Status: Terhubung — Sinkronisasi Terakhir: 10 menit lalu</span>
            </div>
            <button
              onClick={() => showToast('Sinkronisasi SIAK dimulai...', 'info')}
              className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors"
              title="Sync sekarang"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </Section>

      <Section title="Tanda Tangan Digital BSrE" description="Integrasi layanan penandatanganan elektronik resmi BSSN.">
        <FieldRow label="Aktifkan BSrE e-Sign" hint="Penandatanganan SK oleh Wakil Dekan">
          <Toggle checked={bsreEnabled} onChange={setBsreEnabled} label={bsreEnabled ? 'Aktif' : 'Nonaktif'} />
        </FieldRow>
        <FieldRow label="URL API BSrE" hint="Endpoint layanan BSSN">
          <Input icon={Globe} value={bsreUrl} onChange={(e) => setBsreUrl(e.target.value)} />
        </FieldRow>
        {bsreEnabled && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-[11px] text-emerald-800">
              Layanan BSrE aktif dan terautentikasi. Sertifikat digital valid hingga 31 Desember 2025.
            </p>
          </div>
        )}
      </Section>

      <Section title="Sinkronisasi Kalender" description="Ekspor jadwal ke Google Calendar atau MS Outlook.">
        <FieldRow label="Aktifkan Calendar Sync" hint="Jadwal diekspor ke kalender eksternal">
          <Toggle checked={calendarSync} onChange={setCalendarSync} label={calendarSync ? 'Aktif' : 'Nonaktif'} />
        </FieldRow>
        {!calendarSync && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-[11px] text-amber-800">
              Sinkronisasi kalender dinonaktifkan. Aktifkan untuk memungkinkan dosen & mahasiswa mengekspor jadwal.
            </p>
          </div>
        )}
      </Section>

      <Section title="Mesin Penjadwalan" description="Konfigurasi solver yang digunakan oleh SIPRAMA.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/60">
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="w-4 h-4 text-blue-700" />
              <span className="text-xs font-bold text-blue-900">CP-SAT Solver</span>
              <span className="ml-auto px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-700 text-white">AKTIF</span>
            </div>
            <p className="text-[10px] text-blue-800">Google OR-Tools CP-SAT — Penjadwalan awal bebas bentrok (hard constraint).</p>
          </div>
          <div className="p-3 rounded-xl border border-purple-200 bg-purple-50/60">
            <div className="flex items-center gap-2 mb-1">
              <Sliders className="w-4 h-4 text-purple-700" />
              <span className="text-xs font-bold text-purple-900">GA Optimizer</span>
              <span className="ml-auto px-1.5 py-0.5 text-[9px] font-bold rounded bg-purple-700 text-white">AKTIF</span>
            </div>
            <p className="text-[10px] text-purple-800">Genetic Algorithm — Optimasi preferensi dosen & kenyamanan jadwal (soft constraint).</p>
          </div>
        </div>
      </Section>
    </div>
  );

  // ─── Tab Content: Manajemen Pengguna ─────────────────────────────────────────
  const renderPengguna = () => (
    <div className="space-y-5">
      <Section title="Daftar Pengguna Sistem" description="Kelola akun dan hak akses pengguna SIPRAMA.">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="pb-2">Nama</th>
                <th className="pb-2">Peran</th>
                <th className="pb-2 hidden sm:table-cell">Email</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        {u.name.split(' ').slice(-1)[0]?.charAt(0) ?? 'U'}
                      </div>
                      <span className="font-semibold text-slate-800 truncate max-w-[140px]">{u.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-800 border border-blue-100">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-slate-500 font-mono text-[10px] hidden sm:table-cell">{u.email}</td>
                  <td className="py-2.5 pr-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        u.status === 'Aktif'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                          : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => showToast(`Edit akun: ${u.name}`, 'info')}
                      className="text-blue-700 hover:text-blue-900 font-bold text-[11px] mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => showToast(`Reset password: ${u.name}`, 'warning')}
                      className="text-amber-700 hover:text-amber-900 font-bold text-[11px]"
                    >
                      Reset PW
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={() => showToast('Form tambah pengguna baru akan dibuka...', 'info')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Tambah Pengguna
          </button>
        </div>
      </Section>

      <Section title="Kebijakan Peran (RBAC)" description="Hak akses berdasarkan peran dalam sistem SIPRAMA.">
        {[
          { role: 'Admin Penjadwal', akses: 'Akses penuh: semua modul, konfigurasi, dan data sistem', warna: 'bg-blue-700' },
          { role: 'Wakil Dekan I', akses: 'Review jadwal, persetujuan SK, portal akademik', warna: 'bg-purple-700' },
          { role: 'Kaprodi / Departemen', akses: 'Input usulan MK, kebutuhan departemen, lihat jadwal', warna: 'bg-indigo-600' },
          { role: 'Dosen', akses: 'Portal mengajar, cari ruang, jadwal pribadi (read-only)', warna: 'bg-sky-600' },
          { role: 'Mahasiswa', akses: 'Portal jadwal kuliah, navigasi ruang (read-only)', warna: 'bg-slate-500' },
        ].map((r) => (
          <div key={r.role} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className={`mt-0.5 w-7 h-7 rounded-lg ${r.warna} text-white flex items-center justify-center shrink-0`}>
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">{r.role}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{r.akses}</div>
            </div>
          </div>
        ))}
      </Section>
    </div>
  );

  // ─── Tab Content: Backup & Data ──────────────────────────────────────────────
  const renderBackup = () => (
    <div className="space-y-5">
      <Section title="Pencadangan Otomatis" description="Jadwal backup database dan konfigurasi sistem.">
        <FieldRow label="Aktifkan Backup Otomatis" hint="Database di-backup secara periodik">
          <Toggle checked={autoBackup} onChange={setAutoBackup} label={autoBackup ? 'Aktif' : 'Nonaktif'} />
        </FieldRow>
        <FieldRow label="Frekuensi Backup">
          <Select
            options={['Harian', 'Mingguan', 'Bulanan']}
            value={backupFrekuensi}
            onChange={(e) => setBackupFrekuensi(e.target.value)}
          />
        </FieldRow>
        <FieldRow label="Retensi Backup (hari)" hint="Berapa lama backup disimpan">
          <Input
            type="number"
            icon={Database}
            value={retensiBackup}
            onChange={(e) => setRetensiBackup(e.target.value)}
            min={7}
            max={365}
          />
        </FieldRow>
      </Section>

      <Section title="Backup & Restore Manual" description="Ekspor data atau pulihkan dari file backup.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => showToast('Memulai backup database... File akan tersedia dalam beberapa detik.', 'info')}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <div className="text-left">
              <div className="font-bold text-slate-800">Ekspor Backup</div>
              <div className="text-[10px] text-slate-500">Unduh snapshot database saat ini</div>
            </div>
          </button>
          <button
            onClick={() => showToast('Fungsi restore: pilih file backup (.sql / .json).', 'info')}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <div className="text-left">
              <div className="font-bold text-slate-800">Restore Data</div>
              <div className="text-[10px] text-slate-500">Pulihkan dari file backup sebelumnya</div>
            </div>
          </button>
        </div>

        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2 mt-1">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[11px] text-amber-800">
            Proses restore akan <strong>menimpa data saat ini</strong>. Pastikan backup target sudah diverifikasi sebelum melanjutkan.
          </p>
        </div>
      </Section>

      <Section title="Reset & Pembersihan Data" description="Hapus data sementara atau reset konfigurasi sistem.">
        <div className="space-y-2">
          <button
            onClick={() => showToast('Cache sistem berhasil dibersihkan.', 'success')}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            Bersihkan Cache Sistem
          </button>
          <button
            onClick={() => showToast('Log lama (>90 hari) berhasil dihapus.', 'success')}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-slate-500" />
            Hapus Log Lama (&gt;90 hari)
          </button>
          <button
            onClick={() => showToast('Perhatian: Reset penuh membutuhkan konfirmasi tambahan.', 'warning')}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-xs font-semibold text-rose-700 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            Reset Penuh Sistem (Hati-hati)
          </button>
        </div>
      </Section>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'umum': return renderUmum();
      case 'keamanan': return renderKeamanan();
      case 'notifikasi': return renderNotifikasi();
      case 'integrasi': return renderIntegrasi();
      case 'manajemen_pengguna': return renderPengguna();
      case 'backup': return renderBackup();
      default: return renderUmum();
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mb-0.5">
            <span>Beranda</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="text-slate-800 font-semibold">Pengaturan Sistem</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Pengaturan Sistem
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
            Konfigurasi periode akademik, keamanan, notifikasi, integrasi layanan, dan manajemen pengguna SIPRAMA FTI UNAND.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            Reset Default
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[#082c78] hover:bg-[#0c3999] shadow-sm shadow-blue-900/20 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            Simpan Perubahan
          </button>
        </div>
      </div>

      {/* Info Strip */}
      <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 text-slate-500 font-medium">
            <span className="text-[10px] uppercase font-bold text-slate-400">Pengguna Aktif:</span>
            <span className="font-semibold text-slate-800">{currentUser.name}</span>
          </span>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <span className="text-slate-600">
            Versi: <strong className="text-slate-800">SIPRAMA v2.1.0</strong>
          </span>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <span className="text-slate-600">
            Terakhir disimpan: <strong className="text-slate-800">Hari ini, 08:30 WIB</strong>
          </span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
          Sistem Berjalan Normal
        </span>
      </div>

      {/* Tab Navigation + Content */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Sidebar Tabs */}
        <div className="lg:w-48 shrink-0">
          <nav className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold transition-all border-b border-slate-100 last:border-b-0 ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-w-0">{renderContent()}</div>
      </div>
    </div>
  );
};
