import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole, CourseOffering, Room, ScheduleItem, ConflictItem, AuditLogItem, GAParameters } from '../types';
import { mockCourses, mockRooms, mockScheduleGrid, mockConflicts, mockAuditLogs, initialGAParams, mockLecturers } from '../data/mockData';

interface AppContextType {
  currentUser: User;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  activePage: string;
  setActivePage: (page: string) => void;
  isLoggedIn: boolean;
  login: (role?: UserRole) => void;
  logout: () => void;
  
  // Data State
  courses: CourseOffering[];
  rooms: Room[];
  schedule: ScheduleItem[];
  conflicts: ConflictItem[];
  auditLogs: AuditLogItem[];
  gaParams: GAParameters;
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

  // Actions
  addCourse: (course: Partial<CourseOffering>) => void;
  updateCourse: (id: string, updated: Partial<CourseOffering>) => void;
  deleteCourse: (id: string) => void;
  resolveConflict: (conflictId: string) => void;
  autoFixConflicts: () => void;
  updateGAParams: (params: GAParameters) => void;
  wadekApprove: () => void;
  wadekReject: (note: string) => void;
  publishOfficialSchedule: () => void;
  reassignRoomSchedule: (scheduleId: string, newRoomId: string, isPermanent: boolean) => void;
  cancelClassOffering: (courseId: string, classId: string, reason: string) => void;
  addClassToCourse: (courseId: string, className: string, capacity: number) => void;
  toast: { message: string; type: 'success' | 'info' | 'error' | 'warning' } | null;
  showToast: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  clearToast: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');
  const [activePage, setActivePage] = useState<string>('dashboard_admin');

  const [courses, setCourses] = useState<CourseOffering[]>(mockCourses);
  const [rooms, setRooms] = useState<Room[]>(mockRooms);
  const [schedule, setSchedule] = useState<ScheduleItem[]>(mockScheduleGrid);
  const [conflicts, setConflicts] = useState<ConflictItem[]>(mockConflicts);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(mockAuditLogs);
  const [gaParams, setGaParams] = useState<GAParameters>(initialGAParams);
  
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
          name: 'Dr. Eng. Ir. Administrator',
          email: 'alghifari@it.unand.ac.id',
          role: 'admin',
          nipOrNim: '19850123 201012 1 001',
          department: 'Konsol Operasional Akademik FTI',
        };
      case 'wadek1':
        return {
          id: 'u-wadek1',
          name: 'Dr. Eng. Rahmadi, M.T.',
          email: 'rahmadi@it.unand.ac.id',
          role: 'wadek1',
          nipOrNim: '19750312 200212 1 002',
          department: 'Wakil Dekan I (Bidang Akademik)',
        };
      case 'departemen_si':
        return {
          id: 'u-dept-si',
          name: 'Ricky Akbar, M.Kom.',
          email: 'kaprodi.si@it.unand.ac.id',
          role: 'departemen_si',
          nipOrNim: '19840915 200812 1 002',
          department: 'Departemen Sistem Informasi',
        };
      case 'departemen_if':
        return {
          id: 'u-dept-if',
          name: 'Dr. Ir. Wahyudi, S.T., M.T.',
          email: 'kaprodi.if@it.unand.ac.id',
          role: 'departemen_if',
          nipOrNim: '19760724 200212 1 001',
          department: 'Departemen Informatika',
        };
      case 'departemen_tk':
        return {
          id: 'u-dept-tk',
          name: 'Dr. Eng. Tati Erlina, M.IT.',
          email: 'kaprodi.tk@it.unand.ac.id',
          role: 'departemen_tk',
          nipOrNim: '19790412 200604 2 001',
          department: 'Departemen Teknik Komputer',
        };
      case 'dosen':
        return {
          id: 'u-dosen',
          name: 'Dr. Eng. Rahmad, M.T.',
          email: 'rahmad@it.unand.ac.id',
          role: 'dosen',
          nipOrNim: '19820412 200812 1 003',
          department: 'Departemen Sistem Informasi',
        };
      case 'mahasiswa':
        return {
          id: 'u-mhs',
          name: 'Faris Alfath',
          email: 'faris.22@student.unand.ac.id',
          role: 'mahasiswa',
          nipOrNim: '2211522001',
          department: 'Sistem Informasi (BP 22)',
        };
    }
  };

  const currentUser = getUserForRole(currentRole);

  const handleRoleChange = (newRole: UserRole) => {
    setCurrentRole(newRole);
    if (newRole === 'wadek1') {
      setActivePage('approval_wadek');
    } else if (newRole === 'dosen' || newRole === 'mahasiswa') {
      setActivePage('portal_akademik');
    } else if (newRole.startsWith('departemen')) {
      setActivePage('kebutuhan_departemen');
    } else {
      setActivePage('dashboard_admin');
    }
    showToast(`Beralih ke peran: ${getUserForRole(newRole).name} (${newRole.toUpperCase()})`, 'info');
  };

  const login = (role?: UserRole) => {
    setIsLoggedIn(true);
    if (role) {
      handleRoleChange(role);
    } else {
      setActivePage('dashboard_admin');
      showToast('Autentikasi SSO Berhasil. Selamat datang di SIPRAMA FTI UNAND', 'success');
    }
  };

  const logout = () => {
    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: 'Baru saja',
      activity: `User ${currentUser.name} melakukan logout dari sistem`,
      description: 'Sesi token JWT dinonaktifkan',
      category: 'ADMIN',
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
      category: 'DEPT-SI',
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
      category: 'CP-SAT SOLVER',
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
      activity: 'Konfigurasi Parameter Algoritma Genetika diperbarui',
      description: `Populasi: ${params.populationSize}, Cr: ${params.crossoverRate}, Mr: ${params.mutationRate}, MaxGen: ${params.maxGenerations}`,
      category: 'GA-OPTIMIZER',
      actorName: currentUser.name,
      actorRole: currentUser.role,
      status: 'info',
    };
    setAuditLogs([log, ...auditLogs]);
    showToast('Parameter GA berhasil disimpan dan siap diterapkan pada iterasi berikutnya.', 'success');
  };

  const wadekApprove = () => {
    setScheduleApprovalStatus('Disetujui');
    const log: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: 'Baru saja',
      activity: 'Persetujuan & Pengesahan Draf SK Jadwal oleh Wakil Dekan I',
      description: 'Draf jadwal resmi FTI Ganjil 2024/2025 disahkan dengan tanda tangan digital BSrE.',
      category: 'APPROVAL WADEK',
      actorName: 'Dr. Eng. Rahmadi, M.T.',
      actorRole: 'Wakil Dekan I',
      status: 'success',
    };
    setAuditLogs([log, ...auditLogs]);
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
      category: 'APPROVAL WADEK',
      actorName: 'Dr. Eng. Rahmadi, M.T.',
      actorRole: 'Wakil Dekan I',
      status: 'warning',
    };
    setAuditLogs([log, ...auditLogs]);
    showToast(`Draf jadwal dikembalikan ke Admin Fakultas untuk revisi: "${note}"`, 'warning');
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
      activity: 'Publikasi Jadwal Resmi Perkuliahan FTI Semester Ganjil 2024/2025',
      description: 'Jadwal resmi diterbitkan secara live dan dapat diakses publik oleh Dosen & Mahasiswa.',
      category: 'ADMIN',
      actorName: currentUser.name,
      actorRole: currentUser.role,
      status: 'success',
    };
    setAuditLogs([log, ...auditLogs]);
    showToast('Sukses! Jadwal Perkuliahan Resmi Berhasil Dipublikasikan ke Portal Akademik.', 'success');
    setIsPublishModalOpen(false);
  };

  const reassignRoomSchedule = (scheduleId: string, newRoomId: string, isPermanent: boolean) => {
    const targetRoom = rooms.find(r => r.id === newRoomId);
    if (!targetRoom) return;

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

    const log: AuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: 'Baru saja',
      activity: `Penetapan Ruang Pengganti ke ${targetRoom.name}`,
      description: `Jadwal ${scheduleId} dipindahkan ke ${targetRoom.name} (${isPermanent ? 'Permanen' : 'Sementara'})`,
      category: 'ADMIN',
      actorName: currentUser.name,
      actorRole: currentUser.role,
      status: 'info',
    };
    setAuditLogs([log, ...auditLogs]);
    showToast(`Ruang pengganti berhasil dialokasikan ke ${targetRoom.name}!`, 'success');
  };

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
        publishOfficialSchedule,
        reassignRoomSchedule,
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
