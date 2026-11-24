/**
 * Department Helper Utility
 * Standardized course code prefixes and department mapping for FTI UNAND:
 * - Teknik Komputer (TK): Prefixes CCE, SCE, ECS, SSC, TK
 * - Sistem Informasi (SI): Prefixes DSI, PSI, TSI, SI
 * - Informatika (IF): Prefixes DIF, TIF, IF
 * - MKU/Bersama (MWU, AND): Mapped according to class department/rombel
 */

export type DepartmentCode = 'SI' | 'IF' | 'TK';

/**
 * Mengidentifikasi departemen berdasarkan awalan kode mata kuliah (prioritas utama dari CSV)
 * atau atribut departemen yang tersimpan.
 */
export function resolveDepartment(dept?: string, courseCode?: string): DepartmentCode {
  const c = (courseCode || '').toUpperCase().trim();

  // 1. Cek awalan kode mata kuliah resmi FTI (Prioritas Utama sesuai CSV)
  if (
    c.startsWith('CCE') ||
    c.startsWith('SCE') ||
    c.startsWith('ECS') ||
    c.startsWith('SSC') ||
    c.startsWith('TK')
  ) {
    return 'TK';
  }

  if (
    c.startsWith('DSI') ||
    c.startsWith('PSI') ||
    c.startsWith('TSI') ||
    c.startsWith('SI')
  ) {
    return 'SI';
  }

  if (
    c.startsWith('DIF') ||
    c.startsWith('TIF') ||
    c.startsWith('IF')
  ) {
    return 'IF';
  }

  // 2. Evaluasi atribut departemen (untuk MKU seperti MWU, AND, atau data eksternal)
  const d = (dept || '').toUpperCase().trim();
  if (d === 'TK' || d === 'TEKNIK KOMPUTER' || d.includes('KOMPUTER') || d.includes('COMPUTER')) {
    return 'TK';
  }
  if (d === 'IF' || d === 'INFORMATIKA' || d.includes('INFORMATIKA') || d.includes('INFORMATICS')) {
    return 'IF';
  }
  if (d === 'SI' || d === 'SISTEM INFORMASI' || d.includes('INFORMASI') || d.includes('INFORMATION')) {
    return 'SI';
  }

  return 'SI';
}

/**
 * Mengembalikan label lengkap nama departemen
 */
export function getDepartmentLabel(deptCode: DepartmentCode | 'Semua' | string): string {
  switch (deptCode) {
    case 'SI':
      return 'Departemen Sistem Informasi';
    case 'IF':
      return 'Departemen Informatika';
    case 'TK':
      return 'Departemen Teknik Komputer';
    default:
      return 'Seluruh FTI (SI, IF, TK)';
  }
}

/**
 * Mengembalikan styling badge departemen
 */
export function getDepartmentBadgeStyle(deptCode: DepartmentCode | string): {
  badge: string;
  text: string;
  border: string;
  label: string;
} {
  switch (deptCode) {
    case 'SI':
      return {
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        label: 'Sistem Informasi',
      };
    case 'IF':
      return {
        badge: 'bg-sky-50 text-sky-700 border-sky-200',
        text: 'text-sky-700',
        border: 'border-sky-200',
        label: 'Informatika',
      };
    case 'TK':
      return {
        badge: 'bg-purple-50 text-purple-700 border-purple-200',
        text: 'text-purple-700',
        border: 'border-purple-200',
        label: 'Teknik Komputer',
      };
    default:
      return {
        badge: 'bg-slate-100 text-slate-700 border-slate-200',
        text: 'text-slate-700',
        border: 'border-slate-200',
        label: 'Fakultas / Bersama',
      };
  }
}

/**
 * ─── SKS & Waktu Perkuliahan Fleksibel (50 Menit/SKS) ───────────────────────────
 * Standar Jam Mulai Sesi Kampus: 07:30, 09:10, 10:00, 11:10, 13:30, 16:00
 * Durasi Tatap Muka: 1 SKS = 50 menit, 2 SKS = 100 menit, 3 SKS = 150 menit, 4 SKS = 200 menit
 */

export const STANDARD_SESSION_STARTS = [
  '07:30',
  '09:10',
  '10:00',
  '11:10',
  '13:30',
  '16:00',
] as const;

export interface SessionSlotDefinition {
  id: number;
  name: string;
  startTime: string;
}

export const CAMPUS_SESSION_SLOTS: SessionSlotDefinition[] = [
  { id: 1, name: 'SESI 1', startTime: '07:30' },
  { id: 2, name: 'SESI 2', startTime: '09:10' },
  { id: 3, name: 'SESI 3', startTime: '10:00' },
  { id: 4, name: 'SESI 4', startTime: '11:10' },
  { id: 5, name: 'SESI 5', startTime: '13:30' },
  { id: 6, name: 'SESI 6', startTime: '16:00' },
];

/**
 * Menghitung jam selesai berdasarkan jam mulai dan bobot SKS (50 menit/SKS)
 */
export function calculateEndTime(startTime: string, sks: number): string {
  if (!startTime) return '09:10';
  const clean = startTime.trim().split(' - ')[0] || '07:30';
  const parts = clean.split(':');
  if (parts.length < 2) return '09:10';

  const h = parseInt(parts[0], 10) || 7;
  const m = parseInt(parts[1], 10) || 30;
  const validSks = Math.max(1, Math.min(6, sks || 2));
  const totalMinutes = h * 60 + m + validSks * 50;

  const endH = Math.floor(totalMinutes / 60);
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

/**
 * Mengembalikan rentang waktu terformat: "07:30 - 10:00"
 */
export function formatTimeRange(startTime: string, sks: number): string {
  const startClean = (startTime || '07:30').split(' - ')[0].trim();
  const endTime = calculateEndTime(startClean, sks);
  return `${startClean} - ${endTime}`;
}

/**
 * Mengembalikan jam mulai default berdasarkan session index (1..6)
 */
export function getSessionDefaultStartTime(sessionIndex: number): string {
  const idx = Math.max(1, Math.min(6, sessionIndex || 1)) - 1;
  return STANDARD_SESSION_STARTS[idx] || '07:30';
}

/**
 * Mengembalikan styling badge untuk SKS tertentu
 */
export function getSksBadgeStyle(sks: number): {
  badge: string;
  label: string;
  minutes: number;
} {
  const minutes = (sks || 2) * 50;
  switch (sks) {
    case 1:
      return {
        badge: 'bg-teal-50 text-teal-700 border-teal-200',
        label: '1 SKS • 50m',
        minutes,
      };
    case 2:
      return {
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        label: '2 SKS • 100m',
        minutes,
      };
    case 3:
      return {
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
        label: '3 SKS • 150m',
        minutes,
      };
    case 4:
      return {
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        label: '4 SKS • 200m',
        minutes,
      };
    default:
      return {
        badge: 'bg-slate-100 text-slate-700 border-slate-200',
        label: `${sks} SKS • ${minutes}m`,
        minutes,
      };
  }
}

