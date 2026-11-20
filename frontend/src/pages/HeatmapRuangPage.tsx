import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Calendar,
  Clock,
  Layers,
  Search,
  Download,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Moon,
  X,
  Building,
  Tv,
  Users,
  Check,
  ChevronRight,
  Compass,
  Sparkles,
  GraduationCap,
  User as UserIcon,
  RefreshCw,
  Info,
  MapPin,
  Filter,
} from 'lucide-react';

// ─── KRS Mahasiswa (Faris Alfath – digunakan untuk validasi "Cari Kelas Pengganti") ──
// Key: courseCode (kode MK di heatmap), value: info kelas
const MAHASISWA_KRS: Record<string, { courseCode: string; courseName: string; classLabel: string; day: string; sessionTime: string; roomCode: string }> = {
  'SI-2114': { courseCode: 'SI-2114', courseName: 'Basis Data Terdistribusi', classLabel: 'Kelas A', day: 'Senin', sessionTime: '07:30 - 09:10', roomCode: 'G-203' },
  'SI211':   { courseCode: 'SI211',   courseName: 'Basis Data Terdistribusi', classLabel: 'Kelas A', day: 'Senin', sessionTime: '07:30 - 09:10', roomCode: 'G-203' },
  'SI-3105': { courseCode: 'SI-3105', courseName: 'Analisis Proses Bisnis',   classLabel: 'Kelas A', day: 'Senin', sessionTime: '09:20 - 11:00', roomCode: 'G-101' },
  'SI-2102': { courseCode: 'SI-2102', courseName: 'Rekayasa Web Terintegrasi', classLabel: 'Kelas C', day: 'Selasa', sessionTime: '09:20 - 11:00', roomCode: 'G-102' },
  'PRAK-SI201': { courseCode: 'PRAK-SI201', courseName: 'Praktikum Basis Data', classLabel: 'Shift 1', day: 'Selasa', sessionTime: '13:30 - 15:10', roomCode: 'LAB-SI-01' },
  'PRAK-SI101': { courseCode: 'PRAK-SI101', courseName: 'Praktikum Basis Data', classLabel: 'Shift 1', day: 'Selasa', sessionTime: '13:30 - 15:10', roomCode: 'LAB-SI-01' },
  'SI-3208': { courseCode: 'SI-3208', courseName: 'Audit Sistem Informasi', classLabel: 'Kelas A', day: 'Rabu', sessionTime: '13:30 - 15:10', roomCode: 'G-204' },
  'UNAND-101': { courseCode: 'UNAND-101', courseName: 'Pendidikan Pancasila', classLabel: 'Kelas FTI Bersama', day: 'Kamis', sessionTime: '11:10 - 12:50', roomCode: 'GKB-101' },
  'SI-3205': { courseCode: 'SI-3205', courseName: 'Etika Profesi & Hukum Siber', classLabel: 'Kelas A', day: 'Jumat', sessionTime: '07:30 - 09:10', roomCode: 'G-101' },
};

// ─── KRS Dosen (Dr. Eng. Rahmad – digunakan untuk validasi "Cari Kelas Pengganti") ──
const DOSEN_MENGAJAR: Record<string, { courseCode: string; courseName: string; classLabel: string; day: string; sessionTime: string; roomCode: string }> = {
  'SI-2114': { courseCode: 'SI-2114', courseName: 'Basis Data Terdistribusi', classLabel: 'Kelas A', day: 'Senin', sessionTime: '07:30 - 09:10', roomCode: 'G-203' },
  'SI211':   { courseCode: 'SI211',   courseName: 'Basis Data Terdistribusi', classLabel: 'Kelas A', day: 'Senin', sessionTime: '07:30 - 09:10', roomCode: 'G-203' },
  'IF-2101': { courseCode: 'IF-2101', courseName: 'Algoritma & Struktur Data', classLabel: 'Kelas B', day: 'Rabu', sessionTime: '09:20 - 11:00', roomCode: 'G-101' },
  'SI-3105': { courseCode: 'SI-3105', courseName: 'Analisis Proses Bisnis', classLabel: 'Kelas C', day: 'Jumat', sessionTime: '07:30 - 09:10', roomCode: 'G-203' },
  'SI-1202': { courseCode: 'SI-1202', courseName: 'Algoritma & Struktur Data SI', classLabel: 'Kelas A', day: 'Kamis', sessionTime: '11:10 - 12:50', roomCode: 'G-203' },
};

interface CourseScheduleCell {
  id: string;
  code: string;
  name: string;
  classLabel: string;
  lecturer: string;
  dept: 'SI' | 'IF' | 'TK' | 'GKB';
  enrolled: number;
  capacity: number;
  roomName: string;
  sessionTime: string;
  type?: string;
}

interface RoomDefinition {
  id: string;
  code: string;
  name: string;
  type: 'Teori' | 'Lab' | 'Seminar';
  building: 'Gedung FTI' | 'GKB';
  floor: number;
  capacity: number;
  dept: 'SI' | 'IF' | 'TK' | 'GKB'; // Department ownership / priority
  accentColor: string;
  facilities: string[];
  schedules: {
    [day: string]: {
      sesi1?: CourseScheduleCell;
      sesi2?: CourseScheduleCell;
      sesi3?: CourseScheduleCell;
      sesi4?: CourseScheduleCell;
      sesi5?: CourseScheduleCell;
    };
  };
}

// ─── Master Room Data: Prodi SI, IF, TK, and GKB Bersama ───────────────────────
const MASTER_ROOMS: RoomDefinition[] = [
  // ── Ruangan Departemen Sistem Informasi (SI) ──
  {
    id: 'r-g101',
    code: 'G-101',
    name: 'G-101 (Teori SI)',
    type: 'Teori',
    building: 'Gedung FTI',
    floor: 1,
    capacity: 60,
    dept: 'SI',
    accentColor: 'bg-sky-500',
    facilities: ['2 AC', 'Proyektor Smart HDMI', 'Sound System', 'Akses Disabilitas Lantai 1'],
    schedules: {
      Senin: {
        sesi1: { id: 's-1', code: 'IF-2101', name: 'Algoritma Pemrograman', classLabel: 'Kelas A', lecturer: 'Dosen TIM', dept: 'IF', enrolled: 56, capacity: 60, roomName: 'G-101', sessionTime: '07:30 - 09:10' },
        sesi2: { id: 's-2', code: 'SI-1204', name: 'Basis Data Terdistribusi', classLabel: 'Kelas B', lecturer: 'Dr. Surya Afnarius', dept: 'SI', enrolled: 58, capacity: 60, roomName: 'G-101', sessionTime: '09:20 - 11:00' },
        sesi4: { id: 's-3', code: 'TK-3201', name: 'Mikroprosesor & Antarmuka', classLabel: 'Kelas A', lecturer: 'Ir. Hendra, M.T.', dept: 'TK', enrolled: 48, capacity: 60, roomName: 'G-101', sessionTime: '13:30 - 15:10' },
      },
      Selasa: {
        sesi1: { id: 's-4', code: 'SI-2201', name: 'Manajemen Rantai Pasok', classLabel: 'Kelas A', lecturer: 'Dr. Rahmi, M.Kom', dept: 'SI', enrolled: 52, capacity: 60, roomName: 'G-101', sessionTime: '07:30 - 09:10' },
        sesi3: { id: 's-5', code: 'SI-1102', name: 'Konsep Sistem Informasi', classLabel: 'Kelas B', lecturer: 'Husnil Kamil, M.T.', dept: 'SI', enrolled: 55, capacity: 60, roomName: 'G-101', sessionTime: '11:10 - 12:50' },
      },
      Rabu: {
        sesi2: { id: 's-6', code: 'SI-3102', name: 'Tata Kelola TI (COBIT)', classLabel: 'Kelas A', lecturer: 'Ricky Akbar, M.Kom', dept: 'SI', enrolled: 50, capacity: 60, roomName: 'G-101', sessionTime: '09:20 - 11:00' },
        sesi4: { id: 's-7', code: 'SI-2104', name: 'Analisis & Perancangan SI', classLabel: 'Kelas C', lecturer: 'Fikri, M.Kom', dept: 'SI', enrolled: 54, capacity: 60, roomName: 'G-101', sessionTime: '13:30 - 15:10' },
      },
      Kamis: {
        sesi1: { id: 's-8', code: 'SI-1204', name: 'Basis Data Terdistribusi', classLabel: 'Kelas A', lecturer: 'Dr. Surya Afnarius', dept: 'SI', enrolled: 57, capacity: 60, roomName: 'G-101', sessionTime: '07:30 - 09:10' },
      },
      Jumat: {
        sesi1: { id: 's-9', code: 'SI-3205', name: 'Etika Profesi & Hukum Siber', classLabel: 'Kelas A', lecturer: 'Dr. Rahmi, M.Kom', dept: 'SI', enrolled: 48, capacity: 60, roomName: 'G-101', sessionTime: '07:30 - 09:10' },
      },
    },
  },
  {
    id: 'r-g203',
    code: 'G-203',
    name: 'G-203 (Teori Multimedia SI)',
    type: 'Teori',
    building: 'Gedung FTI',
    floor: 2,
    capacity: 50,
    dept: 'SI',
    accentColor: 'bg-sky-500',
    facilities: ['2 AC', 'Smart TV 75"', 'Sound System', 'Whiteboard Magnetic'],
    schedules: {
      Senin: {
        sesi1: { id: 's-10', code: 'SI-3105', name: 'Analisis Proses Bisnis', classLabel: 'Kelas A', lecturer: 'Husnil Kamil, M.T.', dept: 'SI', enrolled: 49, capacity: 50, roomName: 'G-203', sessionTime: '07:30 - 09:10' },
        sesi2: { id: 's-11', code: 'SI-3105', name: 'Analisis Proses Bisnis', classLabel: 'Kelas B', lecturer: 'Husnil Kamil, M.T.', dept: 'SI', enrolled: 49, capacity: 50, roomName: 'G-203', sessionTime: '09:20 - 11:00' },
        sesi3: { id: 's-12', code: 'IF-2207', name: 'Struktur Data & Algoritma', classLabel: 'Kelas B', lecturer: 'Dwi, M.T.', dept: 'IF', enrolled: 50, capacity: 50, roomName: 'G-203', sessionTime: '11:10 - 12:50' },
        sesi4: { id: 's-13', code: 'TK-2104', name: 'Jaringan Komputer', classLabel: 'Kelas C', lecturer: 'Eko, Ph.D', dept: 'TK', enrolled: 44, capacity: 50, roomName: 'G-203', sessionTime: '13:30 - 15:10' },
      },
      Selasa: {
        sesi2: { id: 's-14', code: 'SI-2102', name: 'Rekayasa Web Lanjutan', classLabel: 'Kelas A', lecturer: 'Fikri, M.Kom', dept: 'SI', enrolled: 45, capacity: 50, roomName: 'G-203', sessionTime: '09:20 - 11:00' },
      },
      Rabu: {
        sesi1: { id: 's-15', code: 'SI-3302', name: 'Sistem Informasi Eksekutif', classLabel: 'Kelas A', lecturer: 'Ricky Akbar, M.Kom', dept: 'SI', enrolled: 42, capacity: 50, roomName: 'G-203', sessionTime: '07:30 - 09:10' },
        sesi3: { id: 's-16', code: 'SI-2204', name: 'Keamanan Sistem Informasi', classLabel: 'Kelas B', lecturer: 'Dr. Rahmi, M.Kom', dept: 'SI', enrolled: 47, capacity: 50, roomName: 'G-203', sessionTime: '11:10 - 12:50' },
      },
      Kamis: {
        sesi3: { id: 's-17', code: 'SI-1202', name: 'Algoritma & Struktur Data SI', classLabel: 'Kelas A', lecturer: 'Dr. Eng. Rahmad, M.T.', dept: 'SI', enrolled: 48, capacity: 50, roomName: 'G-203', sessionTime: '11:10 - 12:50' },
      },
      Jumat: {
        sesi1: { id: 's-18', code: 'SI-3105', name: 'Analisis Proses Bisnis', classLabel: 'Kelas C', lecturer: 'Husnil Kamil, M.T.', dept: 'SI', enrolled: 46, capacity: 50, roomName: 'G-203', sessionTime: '07:30 - 09:10' },
      },
    },
  },
  {
    id: 'r-g204',
    code: 'G-204',
    name: 'G-204 (Teori Standar SI)',
    type: 'Teori',
    building: 'Gedung FTI',
    floor: 2,
    capacity: 55,
    dept: 'SI',
    accentColor: 'bg-sky-500',
    facilities: ['2 AC', 'Proyektor HD', 'Whiteboard Magnetic', 'Sound System'],
    schedules: {
      Senin: {
        sesi4: { id: 's-19', code: 'SI-3208', name: 'Audit Sistem Informasi', classLabel: 'Kelas A', lecturer: 'Dr. Rahmi, M.Kom', dept: 'SI', enrolled: 48, capacity: 55, roomName: 'G-204', sessionTime: '13:30 - 15:10' },
        sesi5: { id: 's-20', code: 'SI-3208', name: 'Audit Sistem Informasi', classLabel: 'Kelas B', lecturer: 'Dr. Rahmi, M.Kom', dept: 'SI', enrolled: 46, capacity: 55, roomName: 'G-204', sessionTime: '15:30 - 17:10' },
      },
      Selasa: {
        sesi1: { id: 's-21', code: 'SI-2101', name: 'Pemrograman Berorientasi Objek', classLabel: 'Kelas B', lecturer: 'Fikri, M.Kom', dept: 'SI', enrolled: 50, capacity: 55, roomName: 'G-204', sessionTime: '07:30 - 09:10' },
        sesi2: { id: 's-22', code: 'SI-2101', name: 'Pemrograman Berorientasi Objek', classLabel: 'Kelas C', lecturer: 'Fikri, M.Kom', dept: 'SI', enrolled: 52, capacity: 55, roomName: 'G-204', sessionTime: '09:20 - 11:00' },
      },
      Rabu: {
        sesi4: { id: 's-23', code: 'SI-3104', name: 'Manajemen Proyek SI', classLabel: 'Kelas A', lecturer: 'Ricky Akbar, M.Kom', dept: 'SI', enrolled: 51, capacity: 55, roomName: 'G-204', sessionTime: '13:30 - 15:10' },
      },
      Kamis: {
        sesi2: { id: 's-24', code: 'SI-1101', name: 'Pengantar Teknologi Informasi', classLabel: 'Kelas A', lecturer: 'Dosen Tim SI', dept: 'SI', enrolled: 54, capacity: 55, roomName: 'G-204', sessionTime: '09:20 - 11:00' },
      },
      Jumat: {},
    },
  },
  {
    id: 'r-lab-si',
    code: 'LAB-SI-01',
    name: 'Lab SI-01 (Basis Data & Rekayasa Web)',
    type: 'Lab',
    building: 'Gedung FTI',
    floor: 2,
    capacity: 40,
    dept: 'SI',
    accentColor: 'bg-sky-600',
    facilities: ['40 PC i7/16GB', 'AC Sentral', 'Server Database Oracle/PostgreSQL', 'LAN Gigabit'],
    schedules: {
      Senin: {
        sesi2: { id: 's-25', code: 'PRAK-SI101', name: 'Praktikum Basis Data Terdistribusi', classLabel: 'Shift 1', lecturer: 'Asisten Lab SI', dept: 'SI', enrolled: 38, capacity: 40, roomName: 'LAB-SI-01', sessionTime: '09:20 - 11:00' },
        sesi3: { id: 's-26', code: 'PRAK-SI101', name: 'Praktikum Basis Data Terdistribusi', classLabel: 'Shift 2', lecturer: 'Asisten Lab SI', dept: 'SI', enrolled: 39, capacity: 40, roomName: 'LAB-SI-01', sessionTime: '11:10 - 12:50' },
      },
      Selasa: {
        sesi3: { id: 's-27', code: 'PRAK-SI202', name: 'Praktikum Rekayasa Web', classLabel: 'Shift 1', lecturer: 'Asisten Lab SI', dept: 'SI', enrolled: 37, capacity: 40, roomName: 'LAB-SI-01', sessionTime: '11:10 - 12:50' },
        sesi4: { id: 's-28', code: 'PRAK-SI202', name: 'Praktikum Rekayasa Web', classLabel: 'Shift 2', lecturer: 'Asisten Lab SI', dept: 'SI', enrolled: 36, capacity: 40, roomName: 'LAB-SI-01', sessionTime: '13:30 - 15:10' },
      },
      Rabu: {},
      Kamis: {
        sesi4: { id: 's-29', code: 'PRAK-SI301', name: 'Praktikum Business Intelligence', classLabel: 'Shift A', lecturer: 'Lab Terpadu SI', dept: 'SI', enrolled: 35, capacity: 40, roomName: 'LAB-SI-01', sessionTime: '13:30 - 15:10' },
      },
      Jumat: {},
    },
  },

  // ── Ruangan GKB Bersama (Gedung Kuliah Bersama & Fasilitas Bersama) ──
  {
    id: 'r-gkb101',
    code: 'GKB-101',
    name: 'GKB-101 (Teori Bersama)',
    type: 'Teori',
    building: 'GKB',
    floor: 1,
    capacity: 80,
    dept: 'GKB',
    accentColor: 'bg-amber-500',
    facilities: ['3 AC', 'Dual Proyektor', 'Microphone Wireless', 'Ramah Disabilitas'],
    schedules: {
      Senin: {
        sesi2: { id: 's-30', code: 'UNAND-101', name: 'Pendidikan Pancasila & Kewarganegaraan', classLabel: 'Kelas Gabungan FTI', lecturer: 'Dosen MKU', dept: 'GKB', enrolled: 76, capacity: 80, roomName: 'GKB-101', sessionTime: '09:20 - 11:00' },
        sesi4: { id: 's-31', code: 'UNAND-102', name: 'Bahasa Indonesia Akademik', classLabel: 'Kelas FTI Bersama', lecturer: 'Dosen MKU', dept: 'GKB', enrolled: 72, capacity: 80, roomName: 'GKB-101', sessionTime: '13:30 - 15:10' },
      },
      Selasa: {
        sesi1: { id: 's-32', code: 'UNAND-103', name: 'Pendidikan Agama', classLabel: 'Kelas Bersama A', lecturer: 'Dosen PAI', dept: 'GKB', enrolled: 75, capacity: 80, roomName: 'GKB-101', sessionTime: '07:30 - 09:10' },
      },
      Rabu: {},
      Kamis: {
        sesi3: { id: 's-33', code: 'FTI-1001', name: 'Kalkulus Dasar Terpadu', classLabel: 'Kelas Bersama SI & IF', lecturer: 'Dr. Defri, M.Si', dept: 'GKB', enrolled: 78, capacity: 80, roomName: 'GKB-101', sessionTime: '11:10 - 12:50' },
      },
      Jumat: {},
    },
  },
  {
    id: 'r-gkb204',
    code: 'GKB-204',
    name: 'GKB-204 (Teori Bersama)',
    type: 'Teori',
    building: 'GKB',
    floor: 2,
    capacity: 75,
    dept: 'GKB',
    accentColor: 'bg-amber-500',
    facilities: ['2 AC', 'Proyektor HD', 'Sound System', 'Wi-Fi Eduroam'],
    schedules: {
      Senin: {
        sesi3: { id: 's-34', code: 'UNAND-201', name: 'Kewirausahaan Berbasis Teknologi', classLabel: 'Kelas FTI 2022', lecturer: 'Tim Inkubator', dept: 'GKB', enrolled: 68, capacity: 75, roomName: 'GKB-204', sessionTime: '11:10 - 12:50' },
      },
      Selasa: {},
      Rabu: {
        sesi2: { id: 's-35', code: 'FTI-1002', name: 'Fisika Dasar untuk TI', classLabel: 'Kelas Bersama FTI', lecturer: 'Dosen Fisika', dept: 'GKB', enrolled: 70, capacity: 75, roomName: 'GKB-204', sessionTime: '09:20 - 11:00' },
      },
      Kamis: {},
      Jumat: {},
    },
  },
  {
    id: 'r-gkb302',
    code: 'GKB-302',
    name: 'GKB-302 (Teori Bersama)',
    type: 'Teori',
    building: 'GKB',
    floor: 3,
    capacity: 65,
    dept: 'GKB',
    accentColor: 'bg-amber-500',
    facilities: ['2 AC', 'Proyektor', 'Whiteboard Magnetic'],
    schedules: {
      Senin: {},
      Selasa: {
        sesi4: { id: 's-36', code: 'UNAND-104', name: 'Bahasa Inggris Saintifik', classLabel: 'Kelas SI & TK', lecturer: 'Dosen Bahasa', dept: 'GKB', enrolled: 60, capacity: 65, roomName: 'GKB-302', sessionTime: '13:30 - 15:10' },
      },
      Rabu: {},
      Kamis: {},
      Jumat: {},
    },
  },
  {
    id: 'r-g102',
    code: 'G-102',
    name: 'G-102 (Teori Besar FTI Bersama)',
    type: 'Teori',
    building: 'Gedung FTI',
    floor: 1,
    capacity: 70,
    dept: 'GKB',
    accentColor: 'bg-blue-600',
    facilities: ['3 AC', 'Dual Smart Proyektor', 'Sound System', 'Tiered Amphitheater'],
    schedules: {
      Senin: {
        sesi2: { id: 's-37', code: 'SI-2102', name: 'Rekayasa Web', classLabel: 'Kelas C', lecturer: 'Fikri, M.Kom', dept: 'SI', enrolled: 45, capacity: 70, roomName: 'G-102', sessionTime: '09:20 - 11:00' },
        sesi4: { id: 's-38', code: 'IF-3301', name: 'Kriptografi & Keamanan', classLabel: 'Kelas B', lecturer: 'Prof. Asril, M.Sc', dept: 'IF', enrolled: 48, capacity: 70, roomName: 'G-102', sessionTime: '13:30 - 15:10' },
        sesi5: { id: 's-39', code: 'SI-3205', name: 'Etika Profesi TI', classLabel: 'Kelas A', lecturer: 'Dr. Rahmi, M.Kom', dept: 'SI', enrolled: 42, capacity: 70, roomName: 'G-102', sessionTime: '15:30 - 17:10' },
      },
      Selasa: {},
      Rabu: {
        sesi1: { id: 's-40', code: 'FTI-2001', name: 'Statistika Komputasi', classLabel: 'Kelas Bersama SI-IF', lecturer: 'Dwi, M.T.', dept: 'GKB', enrolled: 65, capacity: 70, roomName: 'G-102', sessionTime: '07:30 - 09:10' },
      },
      Kamis: {},
      Jumat: {},
    },
  },
  {
    id: 'r-seminar',
    code: 'SEM-FTI',
    name: 'Ruang Seminar FTI (Dekanat)',
    type: 'Seminar',
    building: 'Gedung FTI',
    floor: 2,
    capacity: 100,
    dept: 'GKB',
    accentColor: 'bg-purple-600',
    facilities: ['Hybrid Teleconference', 'Microphone Ceiling Array', '3 Smart Display 85"', 'Izin Dekanat'],
    schedules: {
      Senin: {},
      Selasa: {},
      Rabu: {},
      Kamis: {},
      Jumat: {},
    },
  },

  // ── Ruangan Departemen Informatika (IF) ──
  {
    id: 'r-g201',
    code: 'G-201',
    name: 'G-201 (Teori IF)',
    type: 'Teori',
    building: 'Gedung FTI',
    floor: 2,
    capacity: 60,
    dept: 'IF',
    accentColor: 'bg-indigo-500',
    facilities: ['2 AC', 'Proyektor Smart HDMI', 'Whiteboard Magnetic'],
    schedules: {
      Senin: {
        sesi2: { id: 's-41', code: 'IF-1102', name: 'Matematika Diskrit', classLabel: 'Kelas A', lecturer: 'Dr. Defri, M.Si', dept: 'IF', enrolled: 55, capacity: 60, roomName: 'G-201', sessionTime: '09:20 - 11:00' },
        sesi3: { id: 's-42', code: 'IF-1102', name: 'Matematika Diskrit', classLabel: 'Kelas B', lecturer: 'Dr. Defri, M.Si', dept: 'IF', enrolled: 53, capacity: 60, roomName: 'G-201', sessionTime: '11:10 - 12:50' },
        sesi5: { id: 's-43', code: 'TK-1205', name: 'Elektronika Digital', classLabel: 'Kelas A', lecturer: 'Dwi, M.T.', dept: 'TK', enrolled: 42, capacity: 60, roomName: 'G-201', sessionTime: '15:30 - 17:10' },
      },
      Selasa: {},
      Rabu: {},
      Kamis: {},
      Jumat: {},
    },
  },
  {
    id: 'r-g205',
    code: 'G-205',
    name: 'G-205 (Teori IF)',
    type: 'Teori',
    building: 'Gedung FTI',
    floor: 2,
    capacity: 45,
    dept: 'IF',
    accentColor: 'bg-indigo-500',
    facilities: ['2 AC', 'Proyektor HDMI', 'Sound System'],
    schedules: {
      Senin: {
        sesi1: { id: 's-44', code: 'TI-1002', name: 'Pengantar Pemrograman C++', classLabel: 'Kelas A', lecturer: 'Tim Dosen IF', dept: 'IF', enrolled: 42, capacity: 45, roomName: 'G-205', sessionTime: '07:30 - 09:10' },
        sesi2: { id: 's-45', code: 'TI-1002', name: 'Pengantar Pemrograman C++', classLabel: 'Kelas B', lecturer: 'Tim Dosen IF', dept: 'IF', enrolled: 40, capacity: 45, roomName: 'G-205', sessionTime: '09:20 - 11:00' },
        sesi4: { id: 's-46', code: 'IF-3204', name: 'Teori Bahasa & Otomata', classLabel: 'Kelas A', lecturer: 'Hasdi, M.Kom', dept: 'IF', enrolled: 38, capacity: 45, roomName: 'G-205', sessionTime: '13:30 - 15:10' },
      },
      Selasa: {},
      Rabu: {},
      Kamis: {},
      Jumat: {},
    },
  },
  {
    id: 'r-lab-soft-1',
    code: 'LAB-IF-01',
    name: 'Lab Software 1 (Lab Terpadu IF)',
    type: 'Lab',
    building: 'Gedung FTI',
    floor: 2,
    capacity: 40,
    dept: 'IF',
    accentColor: 'bg-indigo-600',
    facilities: ['40 Workstations i7/GPU', 'AC Sentral', 'Server Komputasi', 'LAN Gigabit'],
    schedules: {
      Senin: {
        sesi1: { id: 's-47', code: 'PRAK-IF101', name: 'Praktikum Dasar Pemrograman', classLabel: 'Shift 1', lecturer: 'Asisten Lab IF', dept: 'IF', enrolled: 38, capacity: 40, roomName: 'LAB-IF-01', sessionTime: '07:30 - 09:10' },
        sesi2: { id: 's-48', code: 'PRAK-IF101', name: 'Praktikum Dasar Pemrograman', classLabel: 'Shift 2', lecturer: 'Asisten Lab IF', dept: 'IF', enrolled: 40, capacity: 40, roomName: 'LAB-IF-01', sessionTime: '09:20 - 11:00' },
        sesi3: { id: 's-49', code: 'PRAK-IF201', name: 'Praktikum Pemrograman Web', classLabel: 'Shift 1', lecturer: 'Asisten Lab IF', dept: 'IF', enrolled: 39, capacity: 40, roomName: 'LAB-IF-01', sessionTime: '11:10 - 12:50' },
        sesi4: { id: 's-50', code: 'PRAK-IF302', name: 'Praktikum Basis Data Lanjut', classLabel: 'Shift A', lecturer: 'Lab Terpadu IF', dept: 'IF', enrolled: 39, capacity: 40, roomName: 'LAB-IF-01', sessionTime: '13:30 - 15:10' },
      },
      Selasa: {},
      Rabu: {},
      Kamis: {},
      Jumat: {},
    },
  },

  // ── Ruangan Departemen Teknik Komputer (TK) ──
  {
    id: 'r-h102',
    code: 'H-102',
    name: 'H-102 (Teori TK)',
    type: 'Teori',
    building: 'Gedung FTI',
    floor: 1,
    capacity: 45,
    dept: 'TK',
    accentColor: 'bg-purple-500',
    facilities: ['2 AC', 'Smart TV 65"', 'Workbench Meja Lab'],
    schedules: {
      Senin: {
        sesi1: { id: 's-51', code: 'TK-2101', name: 'Rangkaian Logika Digital', classLabel: 'Kelas A', lecturer: 'Darwison, M.T.', dept: 'TK', enrolled: 38, capacity: 45, roomName: 'H-102', sessionTime: '07:30 - 09:10' },
        sesi4: { id: 's-52', code: 'TK-3103', name: 'Arsitektur Komputer Modern', classLabel: 'Kelas B', lecturer: 'Dr. Eng. Firdaus', dept: 'TK', enrolled: 40, capacity: 45, roomName: 'H-102', sessionTime: '13:30 - 15:10' },
      },
      Selasa: {},
      Rabu: {},
      Kamis: {},
      Jumat: {},
    },
  },
  {
    id: 'r-lab-hard',
    code: 'LAB-TK-02',
    name: 'Lab Hardware & IoT (TK)',
    type: 'Lab',
    building: 'Gedung FTI',
    floor: 3,
    capacity: 35,
    dept: 'TK',
    accentColor: 'bg-purple-600',
    facilities: ['35 Modul IoT Workbench', 'Oscilloscope', 'Kit ESP32', 'Smart TV'],
    schedules: {
      Senin: {
        sesi3: { id: 's-53', code: 'TK-2201', name: 'Sistem Embedded & IoT', classLabel: 'Kelas B', lecturer: 'Dr. Eng. Firdaus', dept: 'TK', enrolled: 30, capacity: 35, roomName: 'LAB-TK-02', sessionTime: '11:10 - 12:50' },
      },
      Selasa: {},
      Rabu: {},
      Kamis: {},
      Jumat: {},
    },
  },
];

export const HeatmapRuangPage: React.FC = () => {
  const {
    currentUser,
    currentRole,
    setIsRoomReplacementModalOpen,
    showToast,
    setActivePage,
    setSelectedRoomForNav,
    setIsRoomNavModalOpen,
  } = useApp();

  // Detect user's prodi from profile (SI, IF, or TK)
  const userProdiKey = useMemo<'SI' | 'IF' | 'TK'>(() => {
    const dept = (currentUser.department || '').toLowerCase();
    if (dept.includes('informatika') || dept.includes('if')) return 'IF';
    if (dept.includes('komputer') || dept.includes('tk')) return 'TK';
    return 'SI'; // Default for Dr. Rahmad & Faris Alfath (Sistem Informasi)
  }, [currentUser]);

  // Active prodi filter: for Dosen & Mahasiswa, this is locked to their own prodi,
  // but we provide a demo switcher so evaluators can test how IF & TK look!
  const [activeProdiView, setActiveProdiView] = useState<'SI' | 'IF' | 'TK' | 'ALL'>(
    currentRole === 'admin' ? 'ALL' : userProdiKey
  );

  const [selectedDay, setSelectedDay] = useState<'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat'>('Senin');
  const [selectedDate, setSelectedDate] = useState<string>('2024-11-25'); // Default: Senin, 25 Nov 2024
  const [selectedBuilding, setSelectedBuilding] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Mapping referensi tanggal minggu aktif semester ganjil 2024/2025
  const dayDateMapping: Record<'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat', { dateStr: string; displayDate: string }> = {
    Senin:  { dateStr: '2024-11-25', displayDate: '25 Nov 2024' },
    Selasa: { dateStr: '2024-11-26', displayDate: '26 Nov 2024' },
    Rabu:   { dateStr: '2024-11-27', displayDate: '27 Nov 2024' },
    Kamis:  { dateStr: '2024-11-28', displayDate: '28 Nov 2024' },
    Jumat:  { dateStr: '2024-11-29', displayDate: '29 Nov 2024' },
  };

  const handleSelectDayWithDate = (day: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat') => {
    setSelectedDay(day);
    setSelectedDate(dayDateMapping[day].dateStr);
  };

  const handleDateChange = (newDateStr: string) => {
    setSelectedDate(newDateStr);
    if (!newDateStr) return;
    const d = new Date(newDateStr);
    const dayIndex = d.getDay(); // 0 Sun, 1 Mon, 2 Tue, 3 Wed, 4 Thu, 5 Fri, 6 Sat
    if (dayIndex === 1) setSelectedDay('Senin');
    else if (dayIndex === 2) setSelectedDay('Selasa');
    else if (dayIndex === 3) setSelectedDay('Rabu');
    else if (dayIndex === 4) setSelectedDay('Kamis');
    else if (dayIndex === 5) setSelectedDay('Jumat');
  };

  // Slide-over drawer state
  // drawerMode: 'cari_kosong' = umum (tidak terikat MK), 'cari_pengganti' = konteks MK tertentu
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'cari_kosong' | 'cari_pengganti'>('cari_kosong');
  // The course context used when drawerMode === 'cari_pengganti'
  const [drawerCourseContext, setDrawerCourseContext] = useState<CourseScheduleCell | null>(null);

  // Modal states
  const [selectedCourseDetail, setSelectedCourseDetail] = useState<CourseScheduleCell | null>(null);
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState<{
    room: RoomDefinition;
    sessionKey: 'sesi1' | 'sesi2' | 'sesi3' | 'sesi4' | 'sesi5';
    sessionLabel: string;
  } | null>(null);

  // Drawer search criteria
  const [instantDay, setInstantDay] = useState('Senin');
  const [instantDate, setInstantDate] = useState('2024-11-25');
  const [instantTimeStart, setInstantTimeStart] = useState('07:30');
  const [instantTimeEnd, setInstantTimeEnd] = useState('09:10');
  const [instantSession, setInstantSession] = useState('07:30 - 09:10 (Sesi 1)');
  const [instantMinCap, setInstantMinCap] = useState(40);
  const [instantBuilding, setInstantBuilding] = useState<'Semua' | 'Gedung FTI' | 'GKB'>('Semua');
  const [instantAccessibility, setInstantAccessibility] = useState(false);
  const [drawerValidationError, setDrawerValidationError] = useState<string | null>(null);
  const [drawerSearchDone, setDrawerSearchDone] = useState(false);

  // Dosen replacement form state
  const [replacementCourse, setReplacementCourse] = useState('SI-1204 - Basis Data Terdistribusi');
  const [replacementClass, setReplacementClass] = useState('Kelas A');
  const [replacementDate, setReplacementDate] = useState('2024-11-25');
  const [replacementStudents, setReplacementStudents] = useState(45);
  const [replacementReason, setReplacementReason] = useState('Tugas Dinas / Konferensi Luar Kota');

  // Mahasiswa study reservation form state
  const [studentGroup, setStudentGroup] = useState('Kelompok Tugas Akhir / Proyek');
  const [studentActivity, setStudentActivity] = useState('Belajar Mandiri & Diskusi Tugas Besar');
  const [studentHeadcount, setStudentHeadcount] = useState(5);

  const days: Array<'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat'> = [
    'Senin',
    'Selasa',
    'Rabu',
    'Kamis',
    'Jumat',
  ];

  // ── RULE FILTERING: DOSEN & MAHASISWA HANYA BISA MELIHAT GKB DAN PRODINYA SENDIRI ──
  const visibleRooms = useMemo(() => {
    return MASTER_ROOMS.filter((room) => {
      // 1. Prodi vs GKB Filter Rule
      if (activeProdiView !== 'ALL') {
        const isUserProdiRoom = room.dept === activeProdiView;
        const isGKBRoom = room.dept === 'GKB' || room.building === 'GKB';
        if (!isUserProdiRoom && !isGKBRoom) {
          return false; // Hide other departments!
        }
      }

      // 2. Building Dropdown Filter
      if (selectedBuilding === 'Gedung FTI' && room.building !== 'Gedung FTI') return false;
      if (selectedBuilding === 'GKB' && room.building !== 'GKB') return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRoom = room.code.toLowerCase().includes(q) || room.name.toLowerCase().includes(q);
        const daySched = room.schedules[selectedDay] || {};
        const matchCourse = Object.values(daySched).some(
          (c) => c && (c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.lecturer.toLowerCase().includes(q))
        );
        if (!matchRoom && !matchCourse) return false;
      }

      return true;
    });
  }, [activeProdiView, selectedBuilding, searchQuery, selectedDay]);

  // Calculate dynamic metrics based on visible rooms
  const totalVisibleRooms = visibleRooms.length;
  const labRoomsCount = visibleRooms.filter((r) => r.type === 'Lab').length;

  const totalPossibleSlots = totalVisibleRooms * 5;
  const occupiedSlotsCount = visibleRooms.reduce((acc, r) => {
    const s = r.schedules[selectedDay] || {};
    return acc + Object.keys(s).length;
  }, 0);
  const freeSlotsCount = Math.max(0, totalPossibleSlots - occupiedSlotsCount);
  const avgOccupancy = totalPossibleSlots > 0 ? Math.round((occupiedSlotsCount / totalPossibleSlots) * 100) : 0;

  // Handle slot action
  const handleSlotClick = (
    room: RoomDefinition,
    sessionKey: 'sesi1' | 'sesi2' | 'sesi3' | 'sesi4' | 'sesi5',
    sessionLabel: string
  ) => {
    setSelectedSlotForBooking({ room, sessionKey, sessionLabel });
  };

  const handleAllocateInstant = (roomCode: string) => {
    const label = drawerMode === 'cari_pengganti'
      ? `Ruang ${roomCode} berhasil dialokasikan sebagai ruang pengganti untuk ${drawerCourseContext?.name || 'kelas'} pada ${instantDay} (${instantDate}), ${instantTimeStart}–${instantTimeEnd}!`
      : `Ruang ${roomCode} berhasil dicatat sebagai ruang kosong untuk digunakan pada ${instantDay} (${instantDate}), ${instantTimeStart}–${instantTimeEnd}!`;
    showToast(label, 'success');
    setIsDrawerOpen(false);
    setDrawerSearchDone(false);
  };

  // Open drawer in "Cari Ruang Kosong" mode (general – no course context)
  const handleOpenDrawerGeneral = () => {
    setDrawerMode('cari_kosong');
    setDrawerCourseContext(null);
    setDrawerValidationError(null);
    setDrawerSearchDone(false);
    setInstantDay(selectedDay);
    setInstantDate(selectedDate || dayDateMapping[selectedDay]?.dateStr || '2024-11-25');
    setInstantTimeStart('07:30');
    setInstantTimeEnd('09:10');
    setInstantMinCap(30);
    setIsDrawerOpen(true);
  };

  // Open drawer in "Cari Kelas Pengganti" mode (tied to a specific course)
  const handleOpenDrawerReplacement = (course: CourseScheduleCell) => {
    setDrawerMode('cari_pengganti');
    setDrawerCourseContext(course);
    setDrawerValidationError(null);
    setDrawerSearchDone(false);
    // Pre-fill with the course's original day/session
    const dayMap: Record<string, 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat'> = {
      Senin: 'Senin', Selasa: 'Selasa', Rabu: 'Rabu', Kamis: 'Kamis', Jumat: 'Jumat',
    };
    // Find which day this course is on (from MASTER_ROOMS schedules)
    let foundDay: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' = selectedDay;
    for (const room of MASTER_ROOMS) {
      for (const [day, sched] of Object.entries(room.schedules)) {
        if (Object.values(sched).some((c) => c?.id === course.id)) {
          foundDay = dayMap[day] || (day as any);
          break;
        }
      }
    }
    setInstantDay(foundDay);
    setInstantDate(dayDateMapping[foundDay]?.dateStr || '2024-11-25');
    const timeParts = course.sessionTime.split(' - ');
    setInstantTimeStart(timeParts[0] || '07:30');
    setInstantTimeEnd(timeParts[1] || '09:10');
    setInstantMinCap(course.enrolled || 30);
    setIsDrawerOpen(true);
  };

  // Submit Dosen Replacement
  const handleConfirmDosenReplacement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotForBooking) return;

    if (replacementStudents > selectedSlotForBooking.room.capacity) {
      showToast(
        `Perhatian: Jumlah mahasiswa (${replacementStudents}) melampaui kapasitas ruang ${selectedSlotForBooking.room.code} (${selectedSlotForBooking.room.capacity} kursi)!`,
        'warning'
      );
    }

    // Add schedule dynamically
    const newCell: CourseScheduleCell = {
      id: `rep-${Date.now()}`,
      code: replacementCourse.split(' - ')[0],
      name: `${replacementCourse.split(' - ')[1] || replacementCourse} (Pengganti)`,
      classLabel: replacementClass,
      lecturer: currentUser.name || 'Dr. Eng. Rahmad, M.T.',
      dept: activeProdiView === 'ALL' ? 'SI' : activeProdiView,
      enrolled: replacementStudents,
      capacity: selectedSlotForBooking.room.capacity,
      roomName: selectedSlotForBooking.room.code,
      sessionTime: selectedSlotForBooking.sessionLabel,
    };

    if (!selectedSlotForBooking.room.schedules[selectedDay]) {
      selectedSlotForBooking.room.schedules[selectedDay] = {};
    }
    selectedSlotForBooking.room.schedules[selectedDay][selectedSlotForBooking.sessionKey] = newCell;

    setSelectedSlotForBooking(null);
    showToast(
      `Kuliah pengganti ${newCell.name} berhasil dijadwalkan di ${selectedSlotForBooking.room.code} (${selectedDay}, ${selectedSlotForBooking.sessionLabel})!`,
      'success'
    );
  };

  // Submit Student Study Reservation
  const handleConfirmStudentReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotForBooking) return;

    showToast(
      `Ruang ${selectedSlotForBooking.room.code} berhasil dipesan untuk kegiatan "${studentActivity}" pada ${selectedDay}, ${selectedSlotForBooking.sessionLabel}!`,
      'success'
    );
    setSelectedSlotForBooking(null);
  };

  // Open Room Wayfinding Modal
  const handleOpenNavForRoom = (roomCode: string) => {
    const matched =
      MASTER_ROOMS.find(
        (r) => r.code.toLowerCase() === roomCode.toLowerCase() || r.name.toLowerCase().includes(roomCode.toLowerCase())
      ) || MASTER_ROOMS[0];

    setSelectedRoomForNav({
      id: matched.id,
      name: matched.name,
      code: matched.code,
      building: matched.building,
      floor: matched.floor,
      capacity: matched.capacity,
      areaM2: 80,
      type: matched.type,
      isAccessible: true,
      status: 'Siap Digunakan',
      priorityDepartment: matched.dept === 'SI' ? 'Sistem Informasi' : matched.dept === 'IF' ? 'Informatika' : matched.dept === 'TK' ? 'Teknik Komputer' : 'Fakultas / Bersama',
      facilities: matched.facilities,
    });
    setIsRoomNavModalOpen(true);
  };

  // Helper for pastel card style based on Department (Exact HeatmapRuangPage Pastel Design)
  const getDeptCardStyle = (dept: 'SI' | 'IF' | 'TK' | 'GKB') => {
    switch (dept) {
      case 'SI':
        return 'bg-sky-50/90 hover:bg-sky-100/90 border-sky-200 border-l-sky-500 text-sky-950';
      case 'IF':
        return 'bg-indigo-50/90 hover:bg-indigo-100/90 border-indigo-200 border-l-indigo-500 text-indigo-950';
      case 'TK':
        return 'bg-purple-50/90 hover:bg-purple-100/90 border-purple-200 border-l-purple-500 text-purple-950';
      case 'GKB':
        return 'bg-amber-50/90 hover:bg-amber-100/90 border-amber-200 border-l-amber-500 text-amber-950';
      default:
        return 'bg-slate-50 hover:bg-slate-100 border-slate-200 border-l-slate-400 text-slate-800';
    }
  };

  // Helper component for schedule cell (Pastel card, click for details)
  const RenderCourseCell: React.FC<{ item: CourseScheduleCell }> = ({ item }) => {
    const cardColor = getDeptCardStyle(item.dept);

    return (
      <button
        type="button"
        onClick={() => setSelectedCourseDetail(item)}
        className={`w-full text-left p-2 rounded-lg border border-l-4 transition-all shadow-2xs cursor-pointer group ${cardColor}`}
        title="Klik untuk melihat detail lengkap mata kuliah & kapasitas"
      >
        <div className="font-bold text-xs truncate leading-tight group-hover:text-blue-700 transition-colors">
          {item.name}
        </div>
        <div className="text-[10px] text-slate-600 truncate mt-1 leading-tight">
          {item.classLabel} • {item.lecturer}
        </div>
      </button>
    );
  };

  // Helper component for empty slot (Clean, hover-only "+ Pilih Ruang")
  const RenderEmptySlot: React.FC<{
    room: RoomDefinition;
    sessionKey: 'sesi1' | 'sesi2' | 'sesi3' | 'sesi4' | 'sesi5';
    sessionLabel: string;
  }> = ({ room, sessionKey, sessionLabel }) => {
    return (
      <div
        onClick={() => handleSlotClick(room, sessionKey, sessionLabel)}
        className="group relative w-full h-full min-h-[58px] rounded-lg border border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 flex items-center justify-center transition-all cursor-pointer p-1"
        title={`Slot Kosong: ${room.code} (${sessionLabel}) - Klik untuk ${
          currentRole === 'dosen' ? 'ajukan ruang pengganti' : 'cek ruang & reservasi'
        }`}
      >
        <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-white border border-blue-200 rounded-md shadow-xs">
          <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
          <span>{currentRole === 'dosen' ? '+ Ajukan Pengganti' : '+ Cek Ruang'}</span>
        </span>
      </div>
    );
  };

  const getProdiFullName = (p: 'SI' | 'IF' | 'TK' | 'ALL') => {
    if (p === 'SI') return 'Sistem Informasi';
    if (p === 'IF') return 'Informatika';
    if (p === 'TK') return 'Teknik Komputer';
    return 'Semua Departemen';
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-8">
      {/* ── Top Header (Exact HeatmapRuangPage Style) ───────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
            <span className="bg-blue-100 px-2 py-0.5 rounded">Monitoring Ketersediaan Ruangan</span>
            <span>•</span>
            <span className="text-slate-500">Sinkronisasi Real-time</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Ketersediaan Ruang Perkuliahan
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-3xl">
            Pemantauan okupansi ruang per slot waktu untuk identifikasi ruang luang dan penjadwalan kelas pengganti.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Cari Ruang Kosong – general */}
          <button
            onClick={handleOpenDrawerGeneral}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm active:scale-98 transition-all"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Cari Ruang Kosong</span>
          </button>

          {/* Info hint for Cari Kelas Pengganti */}
          <button
            onClick={() => showToast('Klik kartu mata kuliah di heatmap untuk membuka fitur Cari Kelas Pengganti.', 'info')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>Cara Cari Kelas Pengganti</span>
          </button>

          <button
            onClick={() => showToast('Mengunduh matriks pemakaian ruang perkuliahan (PDF)...', 'info')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Unduh Matriks</span>
          </button>
        </div>
      </div>

      {/* ── RULE BANNER: HAK AKSES DOSEN & MAHASISWA (GKB + PRODI SENDIRI) ── */}
      <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-700 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
            {activeProdiView === 'ALL' ? 'FTI' : activeProdiView}
          </div>
          <div>
            <div className="font-extrabold text-slate-900 flex items-center gap-2">
              <span>Akses {currentRole === 'dosen' ? 'Dosen' : currentRole === 'mahasiswa' ? 'Mahasiswa' : 'Pengguna'}: Ruang {getProdiFullName(activeProdiView)} &amp; GKB Bersama</span>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Rule Aktif
              </span>
            </div>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Sesuai ketentuan hak akses, Anda hanya melihat ruangan perkuliahan <strong>prodi sendiri ({getProdiFullName(activeProdiView)})</strong> serta <strong>Gedung Kuliah Bersama (GKB)</strong>. Ruangan prodi lain otomatis disaring.
            </p>
          </div>
        </div>

        {/* Demo Switcher to test SI vs IF vs TK view */}
        <div className="flex items-center gap-2 shrink-0 bg-white px-2.5 py-1.5 rounded-xl border border-sky-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500">Filter Prodi:</span>
          <select
            value={activeProdiView}
            onChange={(e) => setActiveProdiView(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="SI">Prodi Sistem Informasi (SI)</option>
            <option value="IF">Prodi Informatika (IF)</option>
            <option value="TK">Prodi Teknik Komputer (TK)</option>
            {currentRole === 'admin' && <option value="ALL">Semua Prodi (Admin)</option>}
          </select>
        </div>
      </div>

      {/* ── 4 Metric Cards (Matching HeatmapRuangPage) ───────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Ruang Pantau
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalVisibleRooms}</span>
            <span className="text-xs text-slate-500">Ruangan</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {activeProdiView === 'ALL' ? 'Seluruh FTI & GKB' : `Ruang ${activeProdiView} & GKB Bersama`}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Okupansi Rata-rata
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-700">{avgOccupancy}%</span>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
              Optimal
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${avgOccupancy}%` }} />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Slot Kosong Hari Ini
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{freeSlotsCount}</span>
            <span className="text-xs text-slate-500">Slot Sesi</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Siap digunakan untuk kelas pengganti/diskusi</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Ruang Lab Aktif
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Tv className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700">{labRoomsCount}</span>
            <span className="text-xs text-slate-500">Laboratorium</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Fasilitas praktikum prodi</p>
        </div>
      </div>

      {/* ── Filter and Pastel Legend Bar (Exact HeatmapRuangPage Style) ── */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Day Pills with Calendar Dates */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            {days.map((day) => {
              const dateInfo = dayDateMapping[day];
              const isSelected = selectedDay === day;
              return (
                <button
                  key={day}
                  onClick={() => handleSelectDayWithDate(day)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex flex-col items-center ${
                    isSelected
                      ? 'bg-[#082c78] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="font-bold">{day}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                    {dateInfo?.displayDate.split(' ')[0]} {dateInfo?.displayDate.split(' ')[1]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Date Picker Input */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-500">Pilih Tanggal:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-800 font-bold focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Dropdown Filters & Search */}
        <div className="flex items-center gap-2.5">
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="Semua">Semua Gedung</option>
            <option value="Gedung FTI">Gedung Utama FTI</option>
            <option value="GKB">GKB Bersama</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ruang / mata kuliah..."
              className="text-xs border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-slate-700 bg-white focus:outline-none focus:border-blue-500 w-44"
            />
          </div>
        </div>

        {/* Soft Pastel Legend per Department */}
        <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-sky-100 border border-sky-300 border-l-2 border-l-sky-500" />
            <span className="font-medium text-slate-700">Sistem Informasi</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-indigo-100 border border-indigo-300 border-l-2 border-l-indigo-500" />
            <span className="font-medium text-slate-700">Informatika</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-purple-100 border border-purple-300 border-l-2 border-l-purple-500" />
            <span className="font-medium text-slate-700">Teknik Komputer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-amber-100 border border-amber-300 border-l-2 border-l-amber-500" />
            <span className="font-medium text-slate-700">GKB Bersama</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs border border-dashed border-slate-300 bg-slate-50" />
            <span className="text-slate-500">Slot Kosong (Hover)</span>
          </div>
        </div>
      </div>

      {/* ── Heatmap Matrix Table (Exact HeatmapRuangPage Structure) ───── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-52">Ruang Perkuliahan</th>
                <th className="py-3 px-3 text-center">
                  <div>07:30 - 09:10</div>
                  <div className="text-[10px] text-slate-400 font-normal">Sesi 1 (100m)</div>
                </th>
                <th className="py-3 px-3 text-center">
                  <div>09:20 - 11:00</div>
                  <div className="text-[10px] text-slate-400 font-normal">Sesi 2 (100m)</div>
                </th>
                <th className="py-3 px-3 text-center">
                  <div>11:10 - 12:50</div>
                  <div className="text-[10px] text-slate-400 font-normal">Sesi 3 (100m)</div>
                </th>
                <th className="py-3 px-2 text-center bg-slate-100/70 w-24">
                  <div>12:50 - 13:30</div>
                  <div className="text-[10px] text-slate-400 font-normal">Istirahat (40m)</div>
                </th>
                <th className="py-3 px-3 text-center">
                  <div>13:30 - 15:10</div>
                  <div className="text-[10px] text-slate-400 font-normal">Sesi 4 (100m)</div>
                </th>
                <th className="py-3 px-3 text-center">
                  <div>15:30 - 17:10</div>
                  <div className="text-[10px] text-slate-400 font-normal">Sesi 5 (100m)</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {visibleRooms.map((room) => {
                const daySched = room.schedules[selectedDay] || {};

                return (
                  <tr key={room.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Room Header Info Cell */}
                    <td className="p-3 border-r border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-8 rounded-full ${room.accentColor}`} />
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span>{room.code}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                              room.dept === 'GKB'
                                ? 'bg-amber-100 text-amber-800'
                                : room.dept === 'SI'
                                ? 'bg-sky-100 text-sky-800'
                                : room.dept === 'IF'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {room.dept}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {room.type} • {room.capacity} Kursi ({room.building})
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Sesi 1 (07:30 - 09:10) */}
                    <td className="p-2">
                      {daySched.sesi1 ? (
                        <RenderCourseCell item={daySched.sesi1} />
                      ) : (
                        <RenderEmptySlot room={room} sessionKey="sesi1" sessionLabel="07:30 - 09:10 (Sesi 1)" />
                      )}
                    </td>

                    {/* Sesi 2 (09:20 - 11:00) */}
                    <td className="p-2">
                      {daySched.sesi2 ? (
                        <RenderCourseCell item={daySched.sesi2} />
                      ) : (
                        <RenderEmptySlot room={room} sessionKey="sesi2" sessionLabel="09:20 - 11:00 (Sesi 2)" />
                      )}
                    </td>

                    {/* Sesi 3 (11:10 - 12:50) */}
                    <td className="p-2">
                      {daySched.sesi3 ? (
                        <RenderCourseCell item={daySched.sesi3} />
                      ) : (
                        <RenderEmptySlot room={room} sessionKey="sesi3" sessionLabel="11:10 - 12:50 (Sesi 3)" />
                      )}
                    </td>

                    {/* Istirahat (12:50 - 13:30) */}
                    <td className="p-2 bg-slate-100/50 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 text-[10px] gap-1 py-3">
                        <Moon className="w-3.5 h-3.5 text-slate-400" />
                        <span>Jeda Shalat</span>
                      </div>
                    </td>

                    {/* Sesi 4 (13:30 - 15:10) */}
                    <td className="p-2">
                      {daySched.sesi4 ? (
                        <RenderCourseCell item={daySched.sesi4} />
                      ) : (
                        <RenderEmptySlot room={room} sessionKey="sesi4" sessionLabel="13:30 - 15:10 (Sesi 4)" />
                      )}
                    </td>

                    {/* Sesi 5 (15:30 - 17:10) */}
                    <td className="p-2">
                      {daySched.sesi5 ? (
                        <RenderCourseCell item={daySched.sesi5} />
                      ) : (
                        <RenderEmptySlot room={room} sessionKey="sesi5" sessionLabel="15:30 - 17:10 (Sesi 5)" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Clean footer bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Klik <strong>kartu mata kuliah</strong> untuk melihat detail & opsi Cari Kelas Pengganti. Gunakan <strong>Cari Ruang Kosong</strong> untuk pencarian umum.
            </span>
          </div>
          <span className="font-medium text-slate-600">{visibleRooms.length} Ruangan Ditampilkan ({getProdiFullName(activeProdiView)} & GKB)</span>
        </div>
      </div>

      {/* ── Slide-over Drawer: Cari Ruang Kosong / Cari Kelas Pengganti ─── */}
      {isDrawerOpen && (() => {
        // Compute available rooms for drawer
        const drawerTimeStart = instantTimeStart;
        const drawerTimeEnd = instantTimeEnd;

        const timeToMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        const SESSION_INDICES: Record<string, number[]> = {
          'sesi1': [1], 'sesi2': [2], 'sesi3': [3], 'sesi4': [4], 'sesi5': [5],
        };
        const SESSION_TIMES = [
          { key: 'sesi1', start: '07:30', end: '09:10' },
          { key: 'sesi2', start: '09:20', end: '11:00' },
          { key: 'sesi3', start: '11:10', end: '12:50' },
          { key: 'sesi4', start: '13:30', end: '15:10' },
          { key: 'sesi5', start: '15:30', end: '17:10' },
        ];

        const reqStart = timeToMin(drawerTimeStart);
        const reqEnd = timeToMin(drawerTimeEnd);
        const conflictingSessions = SESSION_TIMES
          .filter(s => reqStart < timeToMin(s.end) && reqEnd > timeToMin(s.start))
          .map(s => s.key);

        const drawerAvailableRooms = drawerSearchDone ? visibleRooms.filter((room) => {
          if (instantBuilding !== 'Semua' && room.building !== instantBuilding) return false;
          if (instantAccessibility && !(room.code === 'G-101' || room.code === 'GKB-101' || room.code === 'G-102' || room.code === 'GKB-204')) return false;
          if (room.capacity < instantMinCap) return false;
          const daySched = room.schedules[instantDay] || {};
          const hasConflict = conflictingSessions.some(sk => !!(daySched as any)[sk]);
          if (hasConflict) return false;
          // For replacement mode: skip the original room
          if (drawerMode === 'cari_pengganti' && drawerCourseContext && room.code === drawerCourseContext.roomName) return false;
          return true;
        }) : [];

        const handleDrawerSearch = () => {
          const start = timeToMin(drawerTimeStart);
          const end = timeToMin(drawerTimeEnd);
          if (!instantDay) { setDrawerValidationError('Hari perkuliahan wajib dipilih.'); return; }
          if (!drawerTimeStart || !drawerTimeEnd) { setDrawerValidationError('Jam mulai dan jam selesai wajib diisi.'); return; }
          if (end <= start) { setDrawerValidationError('Jam selesai harus lebih akhir dari jam mulai.'); return; }
          if (end - start < 30) { setDrawerValidationError('Durasi minimal pencarian ruang adalah 30 menit.'); return; }
          setDrawerValidationError(null);
          setDrawerSearchDone(true);
        };

        return (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div onClick={() => { setIsDrawerOpen(false); setDrawerSearchDone(false); }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" />
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
              <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">

                {/* Drawer Header */}
                <div className={`p-5 border-b border-slate-100 flex items-center justify-between ${drawerMode === 'cari_pengganti' ? 'bg-blue-50' : 'bg-emerald-50'}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${drawerMode === 'cari_pengganti' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      <Search className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">
                        {drawerMode === 'cari_pengganti' ? 'Cari Kelas Pengganti' : 'Cari Ruang Kosong'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {drawerMode === 'cari_pengganti'
                          ? `Ruang alternatif untuk: ${drawerCourseContext?.name} (${drawerCourseContext?.classLabel})`
                          : `Pencarian ruang kosong umum — Prodi ${activeProdiView === 'ALL' ? 'Semua' : activeProdiView} & GKB`}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => { setIsDrawerOpen(false); setDrawerSearchDone(false); }} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Context banner for replacement mode */}
                {drawerMode === 'cari_pengganti' && drawerCourseContext && (
                  <div className="px-5 py-3 bg-blue-50 border-b border-blue-100">
                    <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1.5">Kelas yang Akan Digantikan</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-slate-400 text-[10px] font-semibold">Kode MK</div>
                        <div className="font-mono font-black text-blue-800">{drawerCourseContext.code}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px] font-semibold">Kelas</div>
                        <div className="font-bold text-slate-800">{drawerCourseContext.classLabel}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px] font-semibold">Ruang Semula</div>
                        <div className="font-bold text-slate-500 line-through">{drawerCourseContext.roomName}</div>
                      </div>
                      <div className="col-span-3">
                        <div className="text-slate-400 text-[10px] font-semibold">Waktu Semula</div>
                        <div className="font-semibold text-slate-700">{drawerCourseContext.sessionTime} • {drawerCourseContext.enrolled}/{drawerCourseContext.capacity} Mhs</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">

                  {/* Validation Error (E1) */}
                  {drawerValidationError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                      <div>
                        <div className="font-bold">Masukan Tidak Valid</div>
                        <div className="mt-0.5">{drawerValidationError}</div>
                      </div>
                    </div>
                  )}

                  {/* Filter Form */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5" />
                      <span>Kriteria Pencarian {drawerSearchDone && <span className="text-emerald-600 ml-1 normal-case font-semibold">(Klik Cari ulang jika diubah)</span>}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hari <span className="text-red-500">*</span></label>
                        <select
                          value={instantDay}
                          onChange={e => {
                            const newDay = e.target.value as any;
                            setInstantDay(newDay);
                            setInstantDate(dayDateMapping[newDay]?.dateStr || '2024-11-25');
                            setDrawerSearchDone(false);
                            setDrawerValidationError(null);
                          }}
                          className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-blue-500"
                        >
                          {['Senin','Selasa','Rabu','Kamis','Jumat'].map(d => (
                            <option key={d} value={d}>
                              {d} ({dayDateMapping[d as any]?.displayDate})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Tanggal Pelaksanaan <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={instantDate}
                          onChange={e => {
                            const val = e.target.value;
                            setInstantDate(val);
                            if (val) {
                              const d = new Date(val).getDay();
                              if (d === 1) setInstantDay('Senin');
                              else if (d === 2) setInstantDay('Selasa');
                              else if (d === 3) setInstantDay('Rabu');
                              else if (d === 4) setInstantDay('Kamis');
                              else if (d === 5) setInstantDay('Jumat');
                            }
                            setDrawerSearchDone(false);
                            setDrawerValidationError(null);
                          }}
                          className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-blue-500 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jam Mulai <span className="text-red-500">*</span></label>
                        <input type="time" value={instantTimeStart} onChange={e => { setInstantTimeStart(e.target.value); setDrawerSearchDone(false); setDrawerValidationError(null); }}
                          className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jam Selesai <span className="text-red-500">*</span></label>
                        <input type="time" value={instantTimeEnd} onChange={e => { setInstantTimeEnd(e.target.value); setDrawerSearchDone(false); setDrawerValidationError(null); }}
                          className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kapasitas Min.</label>
                        <input type="number" value={instantMinCap} onChange={e => { setInstantMinCap(Number(e.target.value)); setDrawerSearchDone(false); }} min={1} max={150}
                          className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Gedung</label>
                        <select value={instantBuilding} onChange={e => { setInstantBuilding(e.target.value as any); setDrawerSearchDone(false); }}
                          className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-blue-500">
                          <option value="Semua">Semua Gedung</option>
                          <option value="Gedung FTI">Gedung FTI</option>
                          <option value="GKB">GKB Bersama</option>
                        </select>
                      </div>
                      <div className="col-span-2 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                          <input type="checkbox" checked={instantAccessibility} onChange={e => { setInstantAccessibility(e.target.checked); setDrawerSearchDone(false); }} className="rounded" />
                          <span>Ramah Disabilitas (Lantai 1 / Akses Kursi Roda)</span>
                        </label>
                      </div>
                    </div>
                    <button onClick={handleDrawerSearch}
                      className={`w-full py-2 text-xs font-bold text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 ${drawerMode === 'cari_pengganti' ? 'bg-[#082c78] hover:bg-blue-800' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                      <Search className="w-3.5 h-3.5" />
                      <span>Cari Ruang {drawerMode === 'cari_pengganti' ? 'Pengganti' : 'Kosong'}</span>
                    </button>
                  </div>

                  {/* Results */}
                  {drawerSearchDone && (
                    <div className="space-y-3">
                      {drawerAvailableRooms.length === 0 ? (
                        /* A1: No available rooms */
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-2">
                          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                          <div className="font-bold text-slate-800 text-sm">Tidak Ada Ruang Kosong</div>
                          <p className="text-xs text-slate-500">
                            Tidak ditemukan ruang yang tersedia pada <strong>{instantDay}, {instantTimeStart}–{instantTimeEnd}</strong> dengan kapasitas minimal {instantMinCap} kursi.
                          </p>
                          <div className="text-xs text-slate-500">
                            Saran: ubah hari, jam, atau kurangi kapasitas minimum.
                          </div>
                          <button onClick={() => setDrawerSearchDone(false)} className="text-xs text-blue-700 hover:underline font-semibold flex items-center gap-1 mx-auto">
                            <RefreshCw className="w-3 h-3" /> Ubah Kriteria
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>Ditemukan <strong className="text-slate-800">{drawerAvailableRooms.length} ruang</strong> yang tersedia</span>
                            <button onClick={() => setDrawerSearchDone(false)} className="flex items-center gap-1 text-slate-500 hover:text-blue-700 font-semibold">
                              <RefreshCw className="w-3 h-3" /><span>Ubah</span>
                            </button>
                          </div>
                          {drawerAvailableRooms.map((room) => (
                            <div key={room.id} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:border-blue-300 transition-colors">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h4 className="text-sm font-black text-slate-800 font-mono">{room.code}</h4>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${room.dept === 'GKB' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-sky-50 text-sky-800 border-sky-200'}`}>
                                      {room.dept === 'GKB' ? 'GKB Bersama' : `Prodi ${room.dept}`}
                                    </span>
                                    {(room.code === 'G-101' || room.code === 'GKB-101' || room.code === 'G-102' || room.code === 'GKB-204') && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">♿</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">{room.name} • Lt. {room.floor}</p>
                                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                                    <span className="flex items-center gap-1"><Building className="w-3 h-3" />{room.building}</span>
                                    <span className={`font-semibold flex items-center gap-1 ${room.capacity >= instantMinCap ? 'text-emerald-700' : 'text-amber-600'}`}>
                                      <Users className="w-3 h-3" />{room.capacity} Kursi
                                      {room.capacity >= instantMinCap && <Check className="w-3 h-3" />}
                                    </span>
                                  </div>
                                  <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
                                    <Clock className="w-3 h-3" />
                                    <span>Tersedia: <strong>{instantDay} ({instantDate})</strong>, {instantTimeStart}–{instantTimeEnd}</span>
                                  </div>
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {room.facilities.slice(0, 2).map(f => (
                                      <span key={f} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{f}</span>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1.5 shrink-0">
                                  <button onClick={() => handleAllocateInstant(room.code)}
                                    className={`px-3 py-1.5 text-xs font-bold text-white rounded-lg transition-colors ${drawerMode === 'cari_pengganti' ? 'bg-[#082c78] hover:bg-blue-800' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                                    {drawerMode === 'cari_pengganti' ? 'Pilih Ruang' : 'Gunakan'}
                                  </button>
                                  <button onClick={() => handleOpenNavForRoom(room.code)}
                                    className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 justify-center">
                                    <Compass className="w-3 h-3" /><span>Rute</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}

                  {/* Info scope */}
                  {!drawerSearchDone && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2 text-xs text-blue-700">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>Pencarian dibatasi pada ruang <strong>Prodi {activeProdiView === 'ALL' ? 'Semua' : activeProdiView}</strong> dan <strong>GKB Bersama</strong> sesuai hak akses Anda.</span>
                    </div>
                  )}
                </div>

                {/* Drawer Footer */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
                  <button onClick={() => { setIsDrawerOpen(false); setDrawerSearchDone(false); }}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal 1: Pengajuan Ruang Pengganti (Khusus Dosen) ─────────── */}
      {selectedSlotForBooking && currentRole === 'dosen' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                    Mode Dosen Pengampu
                  </span>
                  <span className="text-xs text-slate-500 font-medium">{selectedDay}</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                  Pengajuan Kuliah Pengganti (Make-up Class)
                </h3>
              </div>
              <button
                onClick={() => setSelectedSlotForBooking(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Room Info Box */}
            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] font-bold text-blue-700 uppercase">Ruang Terpilih</span>
                <div className="font-black text-slate-900 text-sm">{selectedSlotForBooking.room.name}</div>
                <div className="text-slate-500 text-[11px]">
                  Kapasitas: {selectedSlotForBooking.room.capacity} Kursi • {selectedSlotForBooking.room.building}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">Sesi Waktu</span>
                <span className="font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-200">
                  {selectedSlotForBooking.sessionLabel}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmDosenReplacement} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mata Kuliah
                </label>
                <select
                  value={replacementCourse}
                  onChange={(e) => setReplacementCourse(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                >
                  <option value="SI-1204 - Basis Data Terdistribusi">SI-1204 - Basis Data Terdistribusi (3 SKS)</option>
                  <option value="SI-2102 - Rekayasa Web">SI-2102 - Rekayasa Web (3 SKS)</option>
                  <option value="SI-3105 - Analisis Proses Bisnis">SI-3105 - Analisis Proses Bisnis (3 SKS)</option>
                  <option value="IF-2101 - Algoritma Pemrograman">IF-2101 - Algoritma Pemrograman (3 SKS)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kelas</label>
                  <select
                    value={replacementClass}
                    onChange={(e) => setReplacementClass(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 bg-white text-slate-800"
                  >
                    <option value="Kelas A">Kelas A</option>
                    <option value="Kelas B">Kelas B</option>
                    <option value="Kelas C">Kelas C</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estimasi Mahasiswa</label>
                  <input
                    type="number"
                    value={replacementStudents}
                    onChange={(e) => setReplacementStudents(Number(e.target.value))}
                    min={1}
                    max={100}
                    className="w-full border border-slate-200 rounded-lg p-2 bg-white text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Pengganti</label>
                <input
                  type="date"
                  value={replacementDate}
                  onChange={(e) => setReplacementDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alasan Penggantian</label>
                <select
                  value={replacementReason}
                  onChange={(e) => setReplacementReason(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 bg-white text-slate-800"
                >
                  <option value="Tugas Dinas / Konferensi Luar Kota">Tugas Dinas / Konferensi Luar Kota</option>
                  <option value="Kuliah Pengganti Libur Nasional">Kuliah Pengganti Libur Nasional</option>
                  <option value="Kuliah Responsi / Pengayaan Materi">Kuliah Responsi / Pengayaan Materi</option>
                  <option value="Ujian Susulan / Praktikum">Ujian Susulan / Praktikum</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedSlotForBooking(null)}
                  className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#082c78] hover:bg-blue-900 text-white font-bold rounded-lg shadow-xs transition-colors"
                >
                  Konfirmasi Pengajuan Ruang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 2: Cek Ruang & Reservasi Belajar (Khusus Mahasiswa) ──── */}
      {selectedSlotForBooking && currentRole !== 'dosen' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded">
                    Mode Mahasiswa
                  </span>
                  <span className="text-xs text-slate-500 font-medium">{selectedDay}</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                  Ketersediaan Ruang Belajar &amp; Diskusi
                </h3>
              </div>
              <button
                onClick={() => setSelectedSlotForBooking(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Room Info Box */}
            <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] font-bold text-sky-700 uppercase">Ruangan Bebas</span>
                <div className="font-black text-slate-900 text-sm">{selectedSlotForBooking.room.name}</div>
                <div className="text-slate-500 text-[11px]">
                  Kapasitas: {selectedSlotForBooking.room.capacity} Kursi • Lantai {selectedSlotForBooking.room.floor}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">Jadwal Sesi</span>
                <span className="font-bold text-sky-900 bg-white px-2 py-0.5 rounded border border-sky-200">
                  {selectedSlotForBooking.sessionLabel}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmStudentReservation} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Kelompok / Kegiatan
                </label>
                <input
                  type="text"
                  value={studentGroup}
                  onChange={(e) => setStudentGroup(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Keperluan Penggunaan
                </label>
                <select
                  value={studentActivity}
                  onChange={(e) => setStudentActivity(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 bg-white text-slate-800"
                >
                  <option value="Belajar Mandiri & Diskusi Tugas Besar">Belajar Mandiri &amp; Diskusi Tugas Besar</option>
                  <option value="Diskusi Skripsi / Proyek Akhir">Diskusi Skripsi / Proyek Akhir</option>
                  <option value="Rapat Himpunan Mahasiswa / UKM">Rapat Himpunan Mahasiswa / UKM</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jumlah Mahasiswa</label>
                <input
                  type="number"
                  value={studentHeadcount}
                  onChange={(e) => setStudentHeadcount(Number(e.target.value))}
                  min={1}
                  max={25}
                  className="w-full border border-slate-200 rounded-lg p-2 bg-white text-slate-800"
                />
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-slate-800">Fasilitas Ruang:</div>
                <div>{selectedSlotForBooking.room.facilities.join(' • ')}</div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenNavForRoom(selectedSlotForBooking.room.code);
                    setSelectedSlotForBooking(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-blue-700 hover:bg-blue-50 font-bold rounded-lg transition-colors"
                >
                  <Compass className="w-4 h-4" />
                  <span>Petunjuk Arah Ruang</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSlotForBooking(null)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg shadow-xs"
                  >
                    Catat Reservasi Belajar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal / Popover: Detail Lengkap Mata Kuliah ─────────────── */}
      {selectedCourseDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => setSelectedCourseDetail(null)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
          />

          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {selectedCourseDetail.code}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    selectedCourseDetail.dept === 'SI' ? 'bg-sky-100 text-sky-800' :
                    selectedCourseDetail.dept === 'IF' ? 'bg-indigo-100 text-indigo-800' :
                    selectedCourseDetail.dept === 'TK' ? 'bg-purple-100 text-purple-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedCourseDetail.dept === 'SI' ? 'Sistem Informasi' :
                     selectedCourseDetail.dept === 'IF' ? 'Informatika' :
                     selectedCourseDetail.dept === 'TK' ? 'Teknik Komputer' : 'GKB Bersama'}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                  {selectedCourseDetail.name}
                </h3>
              </div>

              <button
                onClick={() => setSelectedCourseDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Specs */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Kelas &amp; SKS</div>
                  <div className="font-bold text-slate-800 mt-0.5">{selectedCourseDetail.classLabel} (3 SKS)</div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Ruang &amp; Sesi</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {selectedCourseDetail.roomName} • {selectedCourseDetail.sessionTime}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Dosen Pengampu</div>
                <div className="font-bold text-slate-800 mt-0.5">{selectedCourseDetail.lecturer}</div>
              </div>

              {/* Kapasitas bar */}
              <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Kapasitas Peserta</span>
                  <strong className="text-blue-900">
                    {selectedCourseDetail.enrolled} / {selectedCourseDetail.capacity} Mahasiswa
                  </strong>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{
                      width: `${Math.min(100, (selectedCourseDetail.enrolled / selectedCourseDetail.capacity) * 100)}%`,
                    }}
                  />
                </div>
                <div className="text-[10px] text-slate-500">
                  Okupansi {Math.round((selectedCourseDetail.enrolled / selectedCourseDetail.capacity) * 100)}% dari kapasitas ruang
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            {(() => {
              // Check if user is authorized to request replacement:
              // For mahasiswa: must take this course (in MAHASISWA_KRS)
              // For dosen: must be lecturer for this course (in DOSEN_MENGAJAR or current user's name matches)
              const cleanCode = selectedCourseDetail.code.toUpperCase().replace(/\s+/g, '');
              const isMahasiswaEnrolled = Object.keys(MAHASISWA_KRS).some(
                k => k.toUpperCase().replace(/\s+/g, '') === cleanCode ||
                     selectedCourseDetail.code.toUpperCase().includes(k.toUpperCase())
              );
              const isDosenPengampu = currentRole === 'dosen' && (
                Object.keys(DOSEN_MENGAJAR).some(
                  k => k.toUpperCase().replace(/\s+/g, '') === cleanCode ||
                       selectedCourseDetail.code.toUpperCase().includes(k.toUpperCase())
                ) ||
                selectedCourseDetail.lecturer.toLowerCase().includes('rahmad')
              );

              const canRequestReplacement = currentRole === 'dosen' ? isDosenPengampu : isMahasiswaEnrolled;

              return (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {/* Status Banner for Replacement Eligibility */}
                  {currentRole === 'mahasiswa' && (
                    <div className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between gap-2 ${
                      isMahasiswaEnrolled
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        {isMahasiswaEnrolled ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span><strong>Terdaftar di KRS:</strong> Anda mengambil kelas ini</span>
                          </>
                        ) : (
                          <>
                            <Info className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>Bukan mata kuliah pada KRS aktif Anda</span>
                          </>
                        )}
                      </div>
                      {isMahasiswaEnrolled && (
                        <span className="font-bold text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                          Bisa Ajukan Pengganti
                        </span>
                      )}
                    </div>
                  )}

                  {currentRole === 'dosen' && (
                    <div className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between gap-2 ${
                      isDosenPengampu
                        ? 'bg-blue-50 border-blue-200 text-blue-800'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        {isDosenPengampu ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                            <span><strong>Dosen Pengampu:</strong> Anda mengampu kelas ini</span>
                          </>
                        ) : (
                          <>
                            <Info className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>Bukan kelas ampu utama Anda</span>
                          </>
                        )}
                      </div>
                      {isDosenPengampu && (
                        <span className="font-bold text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                          Hak Akses Pengganti
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        handleOpenNavForRoom(selectedCourseDetail.roomName);
                        setSelectedCourseDetail(null);
                      }}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Petunjuk Arah</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedCourseDetail(null)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Tutup
                      </button>

                      {/* BUTTON CARI KELAS PENGGANTI – HANYA BISA JIKA MAHASISWA MENGAMBIL MATAKULIAH & JADWAL TERSEBUT / DOSEN PENGAMPU */}
                      {canRequestReplacement ? (
                        <button
                          onClick={() => {
                            const courseToReplace = selectedCourseDetail;
                            setSelectedCourseDetail(null);
                            handleOpenDrawerReplacement(courseToReplace);
                          }}
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#082c78] hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                          title="Buka form pencarian ruang kosong untuk kelas pengganti ini"
                        >
                          <Search className="w-3.5 h-3.5" />
                          <span>Cari Kelas Pengganti</span>
                        </button>
                      ) : (
                        <button
                          disabled
                          className="px-3.5 py-1.5 text-xs font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed flex items-center gap-1"
                          title="Hanya mahasiswa yang mengambil mata kuliah & jadwal ini yang dapat mencari kelas pengganti"
                        >
                          <span>Cari Kelas Pengganti</span>
                          <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.2 rounded font-mono">Terkunci</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
