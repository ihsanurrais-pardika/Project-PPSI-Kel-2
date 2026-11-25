import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, CourseOffering, Room, ScheduleItem, ConflictItem, AuditLogItem, GAParameters, CPSATParameters, ClassRombel } from '../types';
import { mockCourses, mockRooms, mockScheduleGrid, mockConflicts, mockAuditLogs, initialGAParams, mockLecturers } from '../data/mockData';
import {
  apiService,
  BackendClassItem,
  BackendCourseItem,
  BackendRoom,
  AdjustClassPayload,
  RoomPayload,
  SolverResultResponse,
  GenerateScheduleParams,
} from '../services/api';
import { resolveDepartment } from '../utils/departmentHelper';
import {
  evaluateManualMove,
  evaluateSwapPair,
  matchSessionIndex,
  normalizeDayTitle,
  resolveRoomForScheduleItem,
} from '../utils/scheduleConflictHelper';

export const initialCPSATParams: CPSATParameters = {
  wGap: 10,
  wPref: 4,
  wSpread: 3,
  wWaste: 1,
  timeoutSeconds: 60,
  numWorkers: 8,
  linearizationLevel: 0,
};

function mapBackendRoomToRoom(r: BackendRoom): Room {
  const bName = r.building || `Gedung ${r.gedung_code || 'FTI'}`;
  return {
    id: r.id,
    code: r.code || r.name,
    name: r.name,
    building: bName,
    floor: r.floor,
    capacity: r.capacity,
    wing: `Lantai ${r.floor}`,
    type: r.room_type === 'Lab' ? 'Laboratorium' : 'Teori',
    isAccessible: r.floor === 1,
    status: 'Siap Digunakan',
    priorityDepartment: r.department === 'SI' ? 'Sistem Informasi' : r.department === 'IF' ? 'Informatika' : r.department === 'TK' ? 'Teknik Komputer' : 'Fakultas / Bersama',
    facilities: r.features?.length ? r.features : [bName, `Lantai ${r.floor}`, `${r.capacity} Kursi`],
  };
}

function mapSolverScheduleToItems(res: SolverResultResponse): ScheduleItem[] {
  return res.schedule.map((sc, idx) => ({
    id: sc.jadwal_id ? `db-sch-${sc.jadwal_id}` : `sch-${sc.class_id}-${idx}`,
    jadwalId: sc.jadwal_id,
    dbRuangId: sc.db_ruang_id,
    courseCode: sc.course_code,
    courseName: sc.course_name,
    classLabel: sc.class_label,
    className: sc.class_label,
    semester: sc.semester,
    rombelKey: sc.group_names?.[0] || '',
    sks: sc.sks ?? (sc.duration >= 2 ? 3 : 2),
    studentCount: sc.size,
    roomId: sc.room_id,
    roomName: sc.room_name,
    building: sc.building || (sc.floor === 1 ? 'Gedung FTI (Lantai 1)' : 'Gedung FTI'),
    floor: sc.floor,
    capacity: sc.room_capacity,
    day: sc.day as any,
    sessionIndex: (sc.start_slot_index % 6) + 1,
    timeLabel: `${sc.start_time} - ${sc.end_time}`,
    time: `${sc.start_time} - ${sc.end_time}`,
    primaryLecturer: sc.lecturer_names[0] || 'Dosen Pengampu',
    lecturerName: sc.lecturer_names.join(', '),
    lecturerNames: sc.lecturer_names,
    tandemLecturers: sc.lecturer_names.slice(1),
    isTandem: sc.lecturer_names.length > 1,
    department: resolveDepartment(sc.department, sc.course_code),
    status: 'OK',
    wd1Status: res.approval_status === 'Disetujui' || res.approval_status === 'Resmi' ? 'Disetujui' : res.approval_status === 'Revisi' ? 'Revisi' : 'Menunggu Review',
  }));
}

interface AppContextType {
  currentUser: User;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  activePage: string;
  setActivePage: (page: string) => void;
  isLoggedIn: boolean;
  login: (role?: UserRole, customUser?: User) => void;
  logout: () => void;
  
  // Data State
  courses: CourseOffering[];
  rooms: Room[];
  schedule: ScheduleItem[];
  conflicts: ConflictItem[];
  auditLogs: AuditLogItem[];
  gaParams: GAParameters;
  cpsatParams: CPSATParameters;
  scheduleApprovalStatus: 'Menunggu Persetujuan' | 'Disetujui' | 'Revisi' | 'Resmi';
  wadekRevisionNote: string;
  isPublishModalOpen: boolean;
  setIsPublishModalOpen: (open: boolean) => void;
  isGAConfigModalOpen: boolean;
  setIsGAConfigModalOpen: (open: boolean) => void;
  isRoomReplacementModalOpen: boolean;
  setIsRoomReplacementModalOpen: (open: boolean) => void;
  isRoomNavModalOpen: boolean;
  setIsRoomNavModalOpen: (open: boolean) => void;
  selectedRoomForNav: Room | null;
  setSelectedRoomForNav: (room: Room | null) => void;

  // Backend API Integration State
  backendStatus: 'connected' | 'offline' | 'checking';
  backendClasses: BackendClassItem[];
  backendCourses: BackendCourseItem[];
  isBackendLoading: boolean;
  latestCPSATResult: SolverResultResponse | null;
  fetchBackendClasses: () => Promise<void>;
  addBackendClass: (classItem: BackendClassItem) => Promise<boolean>;
  adjustBackendClass: (classId: string, payload: AdjustClassPayload) => Promise<boolean>;
  deleteBackendClass: (classId: string) => Promise<boolean>;
  resetBackendClassesToCSV: () => Promise<void>;
  addBackendRoom: (payload: RoomPayload) => Promise<boolean>;
  updateBackendRoom: (roomId: string, payload: RoomPayload) => Promise<boolean>;
  deleteBackendRoom: (roomId: string) => Promise<boolean>;
  submitScheduleToWadek: () => Promise<boolean>;
  updateCPSATParams: (params: CPSATParameters) => void;
  runCPSATSolver: (params?: GenerateScheduleParams) => Promise<SolverResultResponse | null>;

  // Actions
  addCourse: (course: Partial<CourseOffering>) => void;
  updateCourse: (id: string, updated: Partial<CourseOffering>) => void;
  deleteCourse: (id: string) => void;
  resolveConflict: (conflictId: string) => void;
  autoFixConflicts: () => void;
  updateGAParams: (params: GAParameters) => void;
  wadekApprove: () => void;
  wadekReject: (note: string) => void;
  reviewScheduleClass: (scheduleId: string, decision: 'Disetujui' | 'Revisi', note?: string) => void;
  publishOfficialSchedule: () => void;
  reassignRoomSchedule: (scheduleId: string, newRoomId: string, isPermanent: boolean) => void;
  updateScheduleClassSksAndTime: (
    scheduleId: string,
    params: {
      sks: number;
      day: string;
      sessionIndex: number;
      startTime: string;
      endTime: string;
      roomId?: string;
      roomName?: string;
      reason?: string;
    }
  ) => Promise<boolean>;
  swapScheduleItems: (
    scheduleIdA: string,
    scheduleIdB: string,
    params?: { aSks?: number; reason?: string }
  ) => Promise<boolean>;
  cancelClassOffering: (courseId: string, classId: string, reason: string) => void;
  addClassToCourse: (courseId: string, className: string, capacity: number) => void;
  toast: { message: string; type: 'success' | 'info' | 'error' | 'warning' } | null;
  showToast: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  clearToast: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');
  const [activePage, setActivePage] = useState<string>('dashboard_admin');

  const [courses, setCourses] = useState<CourseOffering[]>(mockCourses);
  const [rooms, setRooms] = useState<Room[]>(mockRooms);
  const [schedule, setSchedule] = useState<ScheduleItem[]>(mockScheduleGrid);
  const [conflicts, setConflicts] = useState<ConflictItem[]>(mockConflicts);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(mockAuditLogs);
  const [gaParams, setGaParams] = useState<GAParameters>(initialGAParams);
  const [cpsatParams, setCpsatParams] = useState<CPSATParameters>(initialCPSATParams);
  
  // Backend API Integration State
  const [backendStatus, setBackendStatus] = useState<'connected' | 'offline' | 'checking'>('checking');
  const [backendClasses, setBackendClasses] = useState<BackendClassItem[]>([]);
  const [backendCourses, setBackendCourses] = useState<BackendCourseItem[]>([]);
  const [isBackendLoading, setIsBackendLoading] = useState<boolean>(false);
  const [latestCPSATResult, setLatestCPSATResult] = useState<SolverResultResponse | null>(null);
  
  const [scheduleApprovalStatus, setScheduleApprovalStatus] = useState<'Menunggu Persetujuan' | 'Disetujui' | 'Revisi' | 'Resmi'>('Menunggu Persetujuan');
  const [wadekRevisionNote, setWadekRevisionNote] = useState<string>('');

  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [isGAConfigModalOpen, setIsGAConfigModalOpen] = useState<boolean>(false);
  const [isRoomReplacementModalOpen, setIsRoomReplacementModalOpen] = useState<boolean>(false);
  const [isRoomNavModalOpen, setIsRoomNavModalOpen] = useState<boolean>(false);
  const [selectedRoomForNav, setSelectedRoomForNav] = useState<Room | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const clearToast = () => setToast(null);

  const getUserForRole = (role: UserRole): User => {
    switch (role) {
      case 'admin':
        return {
          id: 'u-admin',
          name: 'Admin',
          email: 'admin@it.unand.ac.id',
          role: 'admin',
          nipOrNim: '12345678',
          department: 'Konsol Operasional Akademik FTI',
        };
      case 'wadek1':
        return {
          id: 'u-wadek1',
          name: 'Dr. Eng. Rahmadi, M.T.',
          email: 'Wadek1@it.unand.ac.id',
          role: 'wadek1',
          nipOrNim: '19750312 200212 1 002',
          department: 'Wakil Dekan I (Bidang Akademik)',
        };
      case 'departemen_si':
        return {
          id: 'u-dept-si',
          name: 'Ricky Akbar, M.Kom.',
          email: 'kadepsi@it.unand.ac.id',
          role: 'departemen_si',
          nipOrNim: '19840915 200812 1 002',
          department: 'Departemen Sistem Informasi',
        };
      case 'departemen_if':
        return {
          id: 'u-dept-if',
          name: 'Dr. Ir. Wahyudi, S.T., M.T.',
          email: 'kadepif@it.unand.ac.id',
          role: 'departemen_if',
          nipOrNim: '19760724 200212 1 001',
          department: 'Departemen Informatika',
        };
      case 'departemen_tk':
        return {
          id: 'u-dept-tk',
          name: 'Dr. Eng. Tati Erlina, M.IT.',
          email: 'kadeptekkom@it.unand.ac.id',
          role: 'departemen_tk',
          nipOrNim: '19790412 200604 2 001',
          department: 'Departemen Teknik Komputer',
        };
      case 'dosen':
        return {
          id: 'u-dosen',
          name: 'Dr. Eng. Rahmad, M.T.',
          email: 'dosen@it.unand.ac.id',
          role: 'dosen',
          nipOrNim: '19820412 200812 1 003',
          department: 'Departemen Sistem Informasi',
        };
      case 'mahasiswa':
        return {
          id: 'u-mhs',
          name: 'Ihsan',
          email: 'ihsan@gmail.com',
          role: 'mahasiswa',
          nipOrNim: '2211522001',
          department: 'Sistem Informasi (BP 22)',
        };
    }
  };

  const [currentUser, setCurrentUser] = useState<User>(getUserForRole('admin'));

  const handleRoleChange = (newRole: UserRole, customUser?: User) => {
    setCurrentRole(newRole);
    const userToSet = customUser || getUserForRole(newRole);
    setCurrentUser(userToSet);

    if (newRole === 'wadek1') {
      setActivePage('approval_wadek');
    } else if (newRole === 'dosen' || newRole === 'mahasiswa') {
      setActivePage('portal_akademik');
    } else if (newRole.startsWith('departemen')) {
      setActivePage('kebutuhan_departemen');
    } else {
      setActivePage('dashboard_admin');
    }
    showToast(`Beralih ke peran: ${userToSet.name} (${newRole.toUpperCase()})`, 'info');
  };

  const login = (role?: UserRole, customUser?: User) => {
    setIsLoggedIn(true);
    if (role) {
      handleRoleChange(role, customUser);
    } else {
      setActivePage('dashboard_admin');
      showToast('Autentikasi SSO Berhasil. Selamat datang di SIPRAMA FTI UNAND', 'success');
    }
    void fetchBackendClasses();
  };

  const logout = () => {
    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: 'Baru saja',
      activity: `User ${currentUser.name} melakukan logout dari sistem`,
      description: 'Sesi pengguna dinonaktifkan',
      category: 'Admin',
      actorName: currentUser.name,
      actorRole: currentUser.role,
      status: 'info',
    };
    setAuditLogs([newLog, ...auditLogs]);
    setIsLoggedIn(false);
    setActivePage('login');
    showToast('Anda telah berhasil keluar dari sistem.', 'info');
  };

  const addCourse = (data: Partial<CourseOffering>) => {
    const newCourse: CourseOffering = {
      id: `c-${Date.now()}`,
      code: data.code || 'SI000',
      name: data.name || 'Mata Kuliah Baru',
      sks: data.sks || 3,
      theorySks: data.theorySks || 2,
      practiceSks: data.practiceSks || 1,
      department: data.department || 'Sistem Informasi',
      semester: data.semester || 1,
      curriculum: data.curriculum || 'Kurikulum OBE 2024',
      isMandatory: data.isMandatory !== undefined ? data.isMandatory : true,
      totalEnrolledEst: data.totalEnrolledEst || 40,
      classes: data.classes || [{ id: `cl-${Date.now()}`, name: 'Kelas A', capacity: 40, enrolled: 40 }],
      primaryLecturer: data.primaryLecturer || mockLecturers[0],
      tandemLecturers: data.tandemLecturers || [],
      preferredDays: data.preferredDays || ['Senin'],
      preferredTimeSlot: data.preferredTimeSlot || 'Sesi Pagi',
      specialConstraints: data.specialConstraints || [],
      recommendedRoomType: data.recommendedRoomType || 'Ruang Teori Standar',
      status: 'Submitted',
      lastUpdated: 'Hari ini, Baru saja',
    };
    setCourses([newCourse, ...courses]);
    
    // add audit log
    const log: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: 'Baru saja',
      activity: `Pengajuan Kebutuhan MK ${newCourse.code} - ${newCourse.name}`,
      description: `Disimpan dengan ${newCourse.classes.length} rombel kelas, SKS: ${newCourse.sks}`,
      category: 'Usulan Prodi',
      actorName: currentUser.name,
      actorRole: currentUser.role,
      status: 'success',
    };
    setAuditLogs([log, ...auditLogs]);
    showToast(`Mata kuliah ${newCourse.code} - ${newCourse.name} berhasil diajukan!`, 'success');
  };

  const updateCourse = (id: string, updated: Partial<CourseOffering>) => {
    setCourses(courses.map(c => c.id === id ? { ...c, ...updated, lastUpdated: 'Hari ini, Baru saja' } : c));
    showToast('Data kebutuhan mata kuliah berhasil diperbarui.', 'success');
  };

  const deleteCourse = (id: string) => {
    const course = courses.find(c => c.id === id);
    setCourses(courses.filter(c => c.id !== id));
    showToast(`Mata kuliah ${course?.code || ''} dihapus dari usulan.`, 'warning');
  };

  const addClassToCourse = (courseId: string, className: string, capacity: number) => {
    setCourses(courses.map(c => {
      if (c.id === courseId) {
        const newClass: ClassRombel = {
          id: `cl-${Date.now()}`,
          name: className,
          capacity,
          enrolled: capacity,
        };
        return {
          ...c,
          classes: [...c.classes, newClass],
          totalEnrolledEst: c.totalEnrolledEst + capacity,
          lastUpdated: 'Hari ini, Baru saja',
        };
      }
      return c;
    }));
    showToast(`Kelas ${className} berhasil ditambahkan ke mata kuliah.`, 'success');
  };

  const cancelClassOffering = (courseId: string, classId: string, reason: string) => {
    setCourses(courses.map(c => {
      if (c.id === courseId) {
        return {
          ...c,
          classes: c.classes.filter(cl => cl.id !== classId),
          lastUpdated: 'Hari ini, Baru saja',
        };
      }
      return c;
    }));

    const log: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: 'Baru saja',
      activity: `Pembatalan Kelas pada Mata Kuliah ID ${courseId}`,
      description: `Alasan pembatalan: ${reason}. Slot ruangan dibebaskan.`,
      category: 'ADMIN',
      actorName: currentUser.name,
      actorRole: currentUser.role,
      status: 'warning',
    };
    setAuditLogs([log, ...auditLogs]);
    showToast(`Kelas berhasil dibatalkan. Alokasi ruangan dibebaskan kembali.`, 'info');
  };

  const resolveConflict = (conflictId: string) => {
    setConflicts(conflicts.map(c => c.id === conflictId ? { ...c, isResolved: true } : c));
    showToast('Konflik jadwal berhasil diselesaikan.', 'success');
  };

  const autoFixConflicts = () => {
    setConflicts(conflicts.map(c => ({ ...c, isResolved: true })));
    const log: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: 'Baru saja',
      activity: 'Terapkan Rekomendasi Solver (Auto-Fix)',
      description: 'Rotasi 2 slot ruangan berhasil diterapkan. Seluruh hard conflict teratasi 100%.',
      category: 'Penjadwalan',
      actorName: currentUser.name,
      actorRole: currentUser.role,
      status: 'success',
    };
    setAuditLogs([log, ...auditLogs]);
    showToast('Auto-Fix Solver Berhasil: Seluruh konflik jadwal telah teratasi!', 'success');
  };

  const updateGAParams = (params: GAParameters) => {
    setGaParams(params);
    const log: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: 'Baru saja',
      activity: 'Konfigurasi Parameter Algoritma diperbarui',
      description: `Populasi: ${params.populationSize}, Cr: ${params.crossoverRate}, Mr: ${params.mutationRate}`,
      category: 'Optimasi Jadwal',
      actorName: currentUser.name,
      actorRole: currentUser.role,
      status: 'info',
    };
    setAuditLogs([log, ...auditLogs]);
    showToast('Parameter GA berhasil disimpan dan siap diterapkan pada iterasi berikutnya.', 'success');
  };

  const wadekApprove = () => {
    setScheduleApprovalStatus('Disetujui');
    setWadekRevisionNote('');
    const log: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: 'Baru saja',
      activity: 'Persetujuan & Pengesahan Draf SK Jadwal oleh Wakil Dekan I',
      description: 'Draf jadwal resmi FTI Ganjil disahkan dan disimpan ke database.',
      category: 'Pengesahan WD1',
      actorName: currentUser.name,
      actorRole: 'Wakil Dekan I',
      status: 'success',
    };
    setAuditLogs([log, ...auditLogs]);
    if (backendStatus === 'connected') {
      void apiService.sendWadekDecision(true, '', latestCPSATResult?.version_id)
        .then((wf) => {
          setLatestCPSATResult((prev) => prev ? { ...prev, tahap: wf.tahap, status_versi: wf.status_versi, approval_status: wf.approval_status, revision_note: '' } : prev);
        })
        .catch((err) => showToast(`Peringatan sinkronisasi database: ${err.message}`, 'warning'));
    }
    showToast('Jadwal berhasil DISETUJUI oleh Wakil Dekan I! Status siap dipublikasikan oleh Admin.', 'success');
  };

  const wadekReject = (note: string) => {
    setScheduleApprovalStatus('Revisi');
    setWadekRevisionNote(note);
    const log: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: 'Baru saja',
      activity: 'Pengembalian Jadwal dengan Catatan Revisi oleh Wadek I',
      description: `Catatan revisi: "${note}"`,
      category: 'Pengesahan WD1',
      actorName: currentUser.name,
      actorRole: 'Wakil Dekan I',
      status: 'warning',
    };
    setAuditLogs([log, ...auditLogs]);
    if (backendStatus === 'connected') {
      void apiService.sendWadekDecision(false, note, latestCPSATResult?.version_id)
        .then((wf) => {
          setLatestCPSATResult((prev) => prev ? { ...prev, tahap: wf.tahap, status_versi: wf.status_versi, approval_status: wf.approval_status, revision_note: note } : prev);
        })
        .catch((err) => showToast(`Peringatan sinkronisasi revisi ke database: ${err.message}`, 'warning'));
    }
    showToast(`Draf jadwal dikembalikan ke Admin Fakultas untuk revisi: "${note}"`, 'warning');
  };

  const reviewScheduleClass = (scheduleId: string, decision: 'Disetujui' | 'Revisi', note = '') => {
    const selected = schedule.find(item => item.id === scheduleId);
    if (!selected) return;
    if (decision === 'Revisi' && !note.trim()) {
      showToast('Catatan revisi wajib diisi.', 'warning');
      return;
    }
    setSchedule(schedule.map(item => item.id === scheduleId
      ? { ...item, wd1Status: decision, wd1RevisionNote: decision === 'Revisi' ? note.trim() : '' }
      : item));
    const log: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
      activity: `${decision === 'Disetujui' ? 'ACC' : 'Revisi'} kelas ${selected.courseCode} ${selected.classLabel || selected.className || ''}`.trim(),
      description: `${selected.courseName} · ${selected.department} · ${selected.day} ${selected.timeLabel || selected.time || ''}${decision === 'Revisi' ? ` · Catatan: ${note.trim()}` : ''}`,
      category: 'Pengesahan WD1',
      actorName: currentUser.name,
      actorRole: 'Wakil Dekan I',
      status: decision === 'Disetujui' ? 'success' : 'warning',
    };
    setAuditLogs(previous => [log, ...previous]);
    showToast(decision === 'Disetujui' ? 'Persetujuan kelas berhasil dicatat.' : 'Catatan revisi kelas berhasil dikirim ke Admin.', decision === 'Disetujui' ? 'success' : 'info');
  };

  const publishOfficialSchedule = () => {
    if (scheduleApprovalStatus !== 'Disetujui') {
      showToast('Gagal Publikasi: Jadwal belum disetujui oleh Wakil Dekan I!', 'error');
      return;
    }
    setScheduleApprovalStatus('Resmi');
    const log: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: 'Baru saja',
      activity: 'Publikasi Jadwal Resmi Perkuliahan FTI Semester Ganjil',
      description: 'Jadwal resmi diterbitkan secara live ke database dan dapat diakses Dosen & Mahasiswa.',
      category: 'Admin',
      actorName: currentUser.name,
      actorRole: currentUser.role,
      status: 'success',
    };
    setAuditLogs([log, ...auditLogs]);
    if (backendStatus === 'connected') {
      void apiService.publishSchedule(latestCPSATResult?.version_id)
        .then((wf) => {
          setLatestCPSATResult((prev) => prev ? { ...prev, tahap: wf.tahap, status_versi: wf.status_versi, approval_status: wf.approval_status } : prev);
        })
        .catch((err) => showToast(`Peringatan sinkronisasi publikasi DB: ${err.message}`, 'warning'));
    }
    showToast('Sukses! Jadwal Perkuliahan Resmi Berhasil Dipublikasikan ke Portal Akademik.', 'success');
    setIsPublishModalOpen(false);
  };

  const reassignRoomSchedule = (scheduleId: string, newRoomId: string, isPermanent: boolean) => {
    const targetRoom = rooms.find(r => r.id === newRoomId);
    if (!targetRoom) return;

    const currentItem = schedule.find(s => s.id === scheduleId);
    setSchedule(schedule.map(s => {
      if (s.id === scheduleId) {
        return {
          ...s,
          roomId: targetRoom.id,
          roomName: targetRoom.name,
          building: targetRoom.building,
          floor: targetRoom.floor,
          note: isPermanent ? 'Perubahan Ruang Permanen' : 'Perubahan Ruang Sementara Pertemuan',
        };
      }
      return s;
    }));

    if (isPermanent && currentItem?.jadwalId && backendStatus === 'connected' && !Number.isNaN(Number(targetRoom.id))) {
      void apiService.updateScheduleItem(currentItem.jadwalId, { room_id: Number(targetRoom.id) }).catch(() => null);
    }

    const log: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: 'Baru saja',
      activity: `Penetapan Ruang Pengganti ke ${targetRoom.name}`,
      description: `Jadwal ${scheduleId} dipindahkan ke ${targetRoom.name} (${isPermanent ? 'Permanen' : 'Sementara'})`,
      category: 'Admin',
      actorName: currentUser.name,
      actorRole: currentUser.role,
      status: 'info',
    };
    setAuditLogs([log, ...auditLogs]);
    showToast(`Ruang pengganti berhasil dialokasikan ke ${targetRoom.name}!`, 'success');
  };

  const updateScheduleClassSksAndTime = async (
    scheduleId: string,
    params: {
      sks: number;
      day: string;
      sessionIndex: number;
      startTime: string;
      endTime: string;
      roomId?: string;
      roomName?: string;
      reason?: string;
    }
  ): Promise<boolean> => {
    if (currentRole !== 'admin') {
      showToast('Hanya Admin yang dapat mengubah jadwal secara manual.', 'error');
      return false;
    }
    const currentItem = schedule.find((item) => item.id === scheduleId);
    if (!currentItem) {
      showToast('Data jadwal kelas tidak ditemukan.', 'error');
      return false;
    }

    const fallbackRoom = resolveRoomForScheduleItem(currentItem, rooms);
    const chosenRoom =
      rooms.find(
        (r) =>
          (params.roomId && (String(r.id) === String(params.roomId) || r.code === params.roomId)) ||
          (params.roomName && r.name === params.roomName)
      ) || fallbackRoom.room;

    const evalRes = evaluateManualMove(
      currentItem,
      {
        day: params.day,
        startTime: params.startTime,
        endTime: params.endTime,
        room: chosenRoom,
        roomId: chosenRoom ? String(chosenRoom.id) : params.roomId || fallbackRoom.id,
        roomCode: chosenRoom ? chosenRoom.code : params.roomName || fallbackRoom.code,
        roomName: chosenRoom ? chosenRoom.name : params.roomName || fallbackRoom.name,
        roomCapacity: chosenRoom ? chosenRoom.capacity : fallbackRoom.capacity,
      },
      schedule,
      rooms
    );

    if (!evalRes.isValid) {
      const msg =
        evalRes.capacityMessage ||
        evalRes.conflicts[0]?.reasons[0] ||
        'Slot atau ruangan masih mengalami bentrok.';
      showToast(`Tidak bisa disimpan: ${msg}`, 'error');
      return false;
    }

    const normDay = normalizeDayTitle(params.day);
    const numericRoom =
      chosenRoom && !Number.isNaN(Number(chosenRoom.id))
        ? Number(chosenRoom.id)
        : params.roomId && !Number.isNaN(Number(params.roomId))
          ? Number(params.roomId)
          : currentItem.dbRuangId;

    if (currentItem.jadwalId && backendStatus === 'connected') {
      try {
        await apiService.updateScheduleItem(currentItem.jadwalId, {
          day: normDay,
          start_time: params.startTime,
          end_time: params.endTime,
          ...(numericRoom ? { room_id: numericRoom } : {}),
          sks: params.sks,
          reason: params.reason,
          actor_role: currentRole,
          actor_email: currentUser.email,
        });
      } catch (err: any) {
        showToast(err?.message || 'Jadwal bentrok dan ditolak oleh server.', 'error');
        return false;
      }
    }

    const newRoomCode = chosenRoom?.code || params.roomName || fallbackRoom.code;
    const newRoomId = chosenRoom ? String(chosenRoom.id) : params.roomId || currentItem.roomId;
    setSchedule((prev) =>
      prev.map((item) => {
        if (item.id === scheduleId) {
          return {
            ...item,
            sks: params.sks,
            day: normDay as any,
            sessionIndex: params.sessionIndex || matchSessionIndex(params.startTime, item.sessionIndex),
            timeLabel: `${params.startTime} - ${params.endTime}`,
            time: `${params.startTime} - ${params.endTime}`,
            roomId: newRoomId,
            dbRuangId: numericRoom ?? item.dbRuangId,
            roomName: newRoomCode,
            building: chosenRoom?.building || item.building,
            floor: chosenRoom?.floor ?? item.floor,
            capacity: chosenRoom?.capacity ?? item.capacity,
            isManualEdited: true,
          };
        }
        return item;
      })
    );

    const log: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: 'Baru saja',
      activity: `Edit Jadwal Manual — ${currentItem.courseName} (${currentItem.classLabel || 'A'})`,
      description: `Dipindah ke ${normDay} ${params.startTime}-${params.endTime} di ${newRoomCode}.${params.reason ? ` Alasan: ${params.reason}` : ''}`,
      category: 'Admin',
      actorName: currentUser.name,
      actorRole: currentUser.role,
      status: 'info',
    };
    setAuditLogs((prev) => [log, ...prev]);
    showToast(
      `Jadwal ${currentItem.courseName} berhasil disimpan ke ${normDay} ${params.startTime}–${params.endTime} (${newRoomCode}).`,
      'success'
    );
    return true;
  };

  const swapScheduleItems = async (
    scheduleIdA: string,
    scheduleIdB: string,
    params?: { aSks?: number; reason?: string }
  ): Promise<boolean> => {
    if (currentRole !== 'admin') {
      showToast('Hanya Admin yang dapat menukar jadwal perkuliahan.', 'error');
      return false;
    }
    const itemA = schedule.find((s) => s.id === scheduleIdA);
    const itemB = schedule.find((s) => s.id === scheduleIdB);
    if (!itemA || !itemB || itemA.id === itemB.id) {
      showToast('Pilih dua kelas berbeda untuk ditukar.', 'error');
      return false;
    }

    const swapEval = evaluateSwapPair(itemA, itemB, schedule, rooms, params?.aSks);
    if (!swapEval.isSafe) {
      showToast(
        swapEval.blockingReasons[0] || 'Pertukaran jadwal memicu bentrok baru.',
        'error'
      );
      return false;
    }

    if (itemA.jadwalId && itemB.jadwalId && backendStatus === 'connected') {
      try {
        await apiService.swapScheduleItems({
          jadwal_id_a: itemA.jadwalId,
          jadwal_id_b: itemB.jadwalId,
          a_sks: params?.aSks,
          reason: params?.reason,
          actor_role: currentRole,
          actor_email: currentUser.email,
        });
      } catch (err: any) {
        showToast(err?.message || 'Gagal menukar jadwal di database.', 'error');
        return false;
      }
    }

    const { aAfter, bAfter } = swapEval;
    const roomB = resolveRoomForScheduleItem(itemB, rooms);
    const roomA = resolveRoomForScheduleItem(itemA, rooms);

    setSchedule((prev) =>
      prev.map((item) => {
        if (item.id === itemA.id) {
          return {
            ...item,
            sks: params?.aSks || item.sks,
            day: aAfter.dayLabel as any,
            sessionIndex: matchSessionIndex(aAfter.startTime, itemB.sessionIndex),
            timeLabel: `${aAfter.startTime} - ${aAfter.endTime}`,
            time: `${aAfter.startTime} - ${aAfter.endTime}`,
            roomId: roomB.id,
            dbRuangId: roomB.room && !Number.isNaN(Number(roomB.room.id)) ? Number(roomB.room.id) : itemB.dbRuangId,
            roomName: aAfter.roomCode,
            building: roomB.building,
            floor: roomB.room?.floor ?? itemB.floor,
            capacity: aAfter.capacity,
            isManualEdited: true,
          };
        }
        if (item.id === itemB.id) {
          return {
            ...item,
            day: bAfter.dayLabel as any,
            sessionIndex: matchSessionIndex(bAfter.startTime, itemA.sessionIndex),
            timeLabel: `${bAfter.startTime} - ${bAfter.endTime}`,
            time: `${bAfter.startTime} - ${bAfter.endTime}`,
            roomId: roomA.id,
            dbRuangId: roomA.room && !Number.isNaN(Number(roomA.room.id)) ? Number(roomA.room.id) : itemA.dbRuangId,
            roomName: bAfter.roomCode,
            building: roomA.building,
            floor: roomA.room?.floor ?? itemA.floor,
            capacity: bAfter.capacity,
            isManualEdited: true,
          };
        }
        return item;
      })
    );

    const log: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: 'Baru saja',
      activity: `Tukar Jadwal — ${itemA.courseName} ⇄ ${itemB.courseName}`,
      description: `${itemA.courseName} (${itemA.classLabel || 'A'}) -> ${aAfter.dayLabel} ${aAfter.startTime} (${aAfter.roomCode}); ${itemB.courseName} (${itemB.classLabel || 'B'}) -> ${bAfter.dayLabel} ${bAfter.startTime} (${bAfter.roomCode}).${params?.reason ? ` Alasan: ${params.reason}` : ''}`,
      category: 'Admin',
      actorName: currentUser.name,
      actorRole: currentUser.role,
      status: 'success',
    };
    setAuditLogs((prev) => [log, ...prev]);
    showToast(
      `Jadwal ${itemA.courseName} (${itemA.classLabel || 'A'}) berhasil ditukar dengan ${itemB.courseName} (${itemB.classLabel || 'B'}).`,
      'success'
    );
    return true;
  };

  const fetchBackendClasses = async () => {
    setIsBackendLoading(true);
    try {
      const [classesData, coursesData, roomsData, latestRes] = await Promise.all([
        apiService.getClasses(),
        apiService.getCourses().catch(() => [] as BackendCourseItem[]),
        apiService.getRooms().catch(() => [] as BackendRoom[]),
        apiService.getLatestSchedule().catch(() => null),
      ]);
      setBackendClasses(classesData);
      if (coursesData.length > 0) setBackendCourses(coursesData);
      if (roomsData.length > 0) {
        setRooms(roomsData.map(mapBackendRoomToRoom));
      }
      if (latestRes && latestRes.schedule && latestRes.schedule.length > 0) {
        setLatestCPSATResult(latestRes);
        setSchedule(mapSolverScheduleToItems(latestRes));
        if (latestRes.approval_status) {
          setScheduleApprovalStatus(latestRes.approval_status);
        }
        if (typeof latestRes.revision_note === 'string') {
          setWadekRevisionNote(latestRes.revision_note);
        }
      }
      setBackendStatus('connected');
    } catch (err) {
      console.warn('Backend API is currently offline:', err);
      setBackendStatus('offline');
    } finally {
      setIsBackendLoading(false);
    }
  };

  const addBackendClass = async (classItem: BackendClassItem): Promise<boolean> => {
    try {
      const created = await apiService.addClass(classItem);
      setBackendClasses((prev) => [...prev, created]);
      showToast(`Kelas ${created.course_code} (${created.class_label}) berhasil disimpan ke database!`, 'success');
      return true;
    } catch (err: any) {
      showToast(`Gagal menambah kelas: ${err.message}`, 'error');
      return false;
    }
  };

  const adjustBackendClass = async (classId: string, payload: AdjustClassPayload): Promise<boolean> => {
    try {
      const updated = await apiService.adjustClass(classId, payload);
      setBackendClasses(prev => prev.map(c => c.id === classId ? updated : c));
      showToast(`Kelas ${updated.course_code} (${updated.class_label}) berhasil disesuaikan!`, 'success');
      return true;
    } catch (err: any) {
      showToast(`Gagal menyesuaikan kelas: ${err.message}`, 'error');
      return false;
    }
  };

  const deleteBackendClass = async (classId: string): Promise<boolean> => {
    try {
      await apiService.deleteClass(classId);
      setBackendClasses(prev => prev.filter(c => c.id !== classId));
      showToast(`Kelas ${classId} berhasil dibatalkan dari alokasi jadwal.`, 'info');
      return true;
    } catch (err: any) {
      showToast(`Gagal membatalkan kelas: ${err.message}`, 'error');
      return false;
    }
  };

  const resetBackendClassesToCSV = async () => {
    setIsBackendLoading(true);
    try {
      const res = await apiService.resetClassesToCSV();
      await fetchBackendClasses();
      showToast(`Data kelas berhasil disinkronkan ulang (${res.total_classes} kelas).`, 'success');
    } catch (err: any) {
      showToast(`Gagal reset ke CSV: ${err.message}`, 'error');
    } finally {
      setIsBackendLoading(false);
    }
  };

  const addBackendRoom = async (payload: RoomPayload): Promise<boolean> => {
    try {
      const created = await apiService.createRoom(payload);
      setRooms((prev) => [...prev, mapBackendRoomToRoom(created)]);
      showToast(`Ruang ${created.code || created.name} berhasil ditambahkan ke database!`, 'success');
      return true;
    } catch (err: any) {
      showToast(`Gagal menambah ruang: ${err.message}`, 'error');
      return false;
    }
  };

  const updateBackendRoom = async (roomId: string, payload: RoomPayload): Promise<boolean> => {
    try {
      const updated = await apiService.updateRoom(roomId, payload);
      setRooms((prev) => prev.map((r) => (r.id === roomId ? mapBackendRoomToRoom(updated) : r)));
      showToast(`Data ruang ${updated.code || updated.name} berhasil diperbarui!`, 'success');
      return true;
    } catch (err: any) {
      showToast(`Gagal memperbarui ruang: ${err.message}`, 'error');
      return false;
    }
  };

  const deleteBackendRoom = async (roomId: string): Promise<boolean> => {
    try {
      await apiService.deleteRoom(roomId);
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      showToast('Ruang berhasil dihapus dari database.', 'info');
      return true;
    } catch (err: any) {
      showToast(`Gagal menghapus ruang: ${err.message}`, 'error');
      return false;
    }
  };

  const submitScheduleToWadek = async (): Promise<boolean> => {
    try {
      const wf = await apiService.submitScheduleToWadek(latestCPSATResult?.version_id);
      setScheduleApprovalStatus(wf.approval_status);
      setWadekRevisionNote('');
      setLatestCPSATResult((prev) =>
        prev ? { ...prev, version_id: wf.version_id, version_number: wf.version_number, tahap: wf.tahap, status_versi: wf.status_versi, approval_status: wf.approval_status } : prev
      );
      showToast(wf.message, 'success');
      return true;
    } catch (err: any) {
      showToast(`Gagal mengajukan jadwal ke Wadek I: ${err.message}`, 'error');
      return false;
    }
  };

  const updateCPSATParams = (params: CPSATParameters) => {
    setCpsatParams(params);
    showToast('Parameter solver CP-SAT berhasil disimpan.', 'success');
  };

  const runCPSATSolver = async (params?: GenerateScheduleParams): Promise<SolverResultResponse | null> => {
    setIsBackendLoading(true);
    try {
      const payload: GenerateScheduleParams = {
        w_gap: cpsatParams.wGap,
        w_pref: cpsatParams.wPref,
        w_spread: cpsatParams.wSpread,
        w_waste: cpsatParams.wWaste,
        max_time_seconds: cpsatParams.timeoutSeconds,
        num_workers: cpsatParams.numWorkers,
        ...params,
      };
      const res = await apiService.generateScheduleCPSAT(payload);
      setLatestCPSATResult(res);

      if (res.status === 'OPTIMAL' || res.status === 'FEASIBLE') {
        setSchedule(mapSolverScheduleToItems(res));
        setScheduleApprovalStatus(res.approval_status || 'Menunggu Persetujuan');
        setWadekRevisionNote('');
        showToast(`Penjadwalan CP-SAT tersimpan ke DB (Versi #${res.version_number || 1}): ${res.scheduled_classes} kelas dalam ${res.wall_time_seconds} detik!`, 'success');
      } else {
        showToast(`Penyusunan jadwal memerlukan penyesuaian batasan atau kapasitas ruang (Status: ${res.status}).`, 'warning');
      }
      return res;
    } catch (err: any) {
      showToast(`Gagal memproses penjadwalan otomatis: ${err.message}`, 'error');
      return null;
    } finally {
      setIsBackendLoading(false);
    }
  };

  useEffect(() => {
    fetchBackendClasses();
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        currentRole,
        setCurrentRole: handleRoleChange,
        activePage,
        setActivePage,
        isLoggedIn,
        login,
        logout,
        courses,
        rooms,
        schedule,
        conflicts,
        auditLogs,
        gaParams,
        cpsatParams,
        backendStatus,
        backendClasses,
        backendCourses,
        isBackendLoading,
        latestCPSATResult,
        fetchBackendClasses,
        addBackendClass,
        adjustBackendClass,
        deleteBackendClass,
        resetBackendClassesToCSV,
        addBackendRoom,
        updateBackendRoom,
        deleteBackendRoom,
        submitScheduleToWadek,
        updateCPSATParams,
        runCPSATSolver,
        scheduleApprovalStatus,
        wadekRevisionNote,
        isPublishModalOpen,
        setIsPublishModalOpen,
        isGAConfigModalOpen,
        setIsGAConfigModalOpen,
        isRoomReplacementModalOpen,
        setIsRoomReplacementModalOpen,
        isRoomNavModalOpen,
        setIsRoomNavModalOpen,
        selectedRoomForNav,
        setSelectedRoomForNav,
        addCourse,
        updateCourse,
        deleteCourse,
        resolveConflict,
        autoFixConflicts,
        updateGAParams,
        wadekApprove,
        wadekReject,
        reviewScheduleClass,
        publishOfficialSchedule,
        reassignRoomSchedule,
        updateScheduleClassSksAndTime,
        swapScheduleItems,
        cancelClassOffering,
        addClassToCourse,
        toast,
        showToast,
        clearToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

