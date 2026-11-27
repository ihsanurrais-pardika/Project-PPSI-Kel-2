import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  BookOpen,
  Plus,
  Search,
  FileSpreadsheet,
  FileText,
  Sliders,
  X,
  Send,
  CheckCircle2,
  Trash2,
  Sparkles,
  HelpCircle,
  Building,
  Check,
  AlertTriangle,
  Menu,
  Download,
  ChevronDown,
  History,
  LogOut,
  Lock,
} from 'lucide-react';
import { CourseOffering, ClassRombel } from '../types';
import { mockLecturers } from '../data/mockData';
import {
  apiService,
  BackendClassItem,
  AdjustClassPayload,
  DepartemenLogItem,
  DepartemenStatusResponse,
} from '../services/api';

type DeptView = 'daftar_mk' | 'input_mk' | 'riwayat' | 'pedoman';
type DeptCode = 'SI' | 'IF' | 'TK';
type DeptName = 'Sistem Informasi' | 'Informatika' | 'Teknik Komputer';

const MIN_CLASS_QUOTA = 15;

const DEPT_BY_CODE: Record<DeptCode, DeptName> = {
  SI: 'Sistem Informasi',
  IF: 'Informatika',
  TK: 'Teknik Komputer',
};

const CODE_BY_DEPT: Record<DeptName, DeptCode> = {
  'Sistem Informasi': 'SI',
  Informatika: 'IF',
  'Teknik Komputer': 'TK',
};

interface GroupedDeptCourse {
  key: string;
  code: string;
  name: string;
  sks: number;
  semester: number;
  isMandatory: boolean;
  roomTypeNeeded: string;
  lecturerNames: string[];
  classes: BackendClassItem[];
  totalEnrolled: number;
  hasBelowQuota: boolean;
}

interface DeptChangeLog {
  id: string;
  timestamp: string;
  action: 'Tambah' | 'Sesuaikan' | 'Batalkan' | 'Ajukan';
  target: string;
  detail: string;
  reason?: string;
}

export const DepartemenWorkspacePage: React.FC = () => {
  const {
    currentUser,
    currentRole,
    courses,
    addCourse,
    deleteCourse,
    cancelClassOffering,
    addClassToCourse,
    backendStatus,
    backendClasses,
    backendCourses,
    backendLecturers,
    activeSemesterInfo,
    addBackendClass,
    adjustBackendClass,
    cancelBackendClass,
    restoreBackendClass,
    createDepartemenOffering,
    latestCPSATResult,
    logout,
    showToast,
  } = useApp();

  const isRoleLocked =
    currentRole === 'departemen_si' ||
    currentRole === 'departemen_if' ||
    currentRole === 'departemen_tk';

  const getRoleDept = (): DeptName => {
    if (currentRole === 'departemen_if') return 'Informatika';
    if (currentRole === 'departemen_tk') return 'Teknik Komputer';
    return 'Sistem Informasi';
  };

  const [activeDept, setActiveDept] = useState<DeptName>(getRoleDept());
  useEffect(() => {
    if (isRoleLocked) {
      setActiveDept(getRoleDept());
    }
  }, [currentRole]);

  const activeDeptCode: DeptCode = CODE_BY_DEPT[activeDept];
  const isConnected = backendStatus === 'connected' && backendClasses.length > 0;
  const minQuota = activeSemesterInfo?.kuota_minimum_kelas ?? MIN_CLASS_QUOTA;
  const semesterLabel =
    activeSemesterInfo?.semester_label || latestCPSATResult?.semester_label || '2026/2027 Ganjil';

  const [view, setView] = useState<DeptView>('daftar_mk');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [belowQuotaOnly, setBelowQuotaOnly] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [cancelledClasses, setCancelledClasses] = useState<BackendClassItem[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'Draft' | 'Diajukan ke Fakultas'>('Draft');
  const [deptStatusInfo, setDeptStatusInfo] = useState<DepartemenStatusResponse | null>(null);

  // Persistent DB logs (fallback to local session log if offline)
  const [dbLogs, setDbLogs] = useState<DepartemenLogItem[]>([]);
  const [deptLogs, setDeptLogs] = useState<DeptChangeLog[]>([]);

  const refreshDeptMetadata = async () => {
    if (backendStatus !== 'connected') return;
    try {
      const [statusRes, logsRes, allWithCancelled] = await Promise.all([
        apiService.getDepartemenStatus(activeDeptCode).catch(() => null),
        apiService.getDepartemenLogs(activeDeptCode, 60).catch(() => []),
        apiService.getClasses({ department: activeDeptCode, include_cancelled: true }).catch(() => []),
      ]);
      if (statusRes) {
        setDeptStatusInfo(statusRes);
        setSubmissionStatus(statusRes.status_pengajuan === 'DIAJUKAN' ? 'Diajukan ke Fakultas' : 'Draft');
      }
      setDbLogs(logsRes);
      setCancelledClasses(allWithCancelled.filter((c) => c.status_kelas === 'DIBATALKAN'));
    } catch {
      // ignore background refresh error
    }
  };

  useEffect(() => {
    void refreshDeptMetadata();
  }, [backendStatus, activeDeptCode]);

  const pushDeptLog = (
    action: DeptChangeLog['action'],
    target: string,
    detail: string,
    reason?: string
  ) => {
    setDeptLogs((prev) => [
      {
        id: `dlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
        action,
        target,
        detail,
        reason,
      },
      ...prev,
    ]);
  };

  const lecturerOptions = useMemo(() => {
    if (backendLecturers.length > 0) {
      return [...backendLecturers].sort((a, b) => {
        const aMatch = a.department.toUpperCase() === activeDeptCode ? 0 : 1;
        const bMatch = b.department.toUpperCase() === activeDeptCode ? 0 : 1;
        return aMatch - bMatch || a.name.localeCompare(b.name);
      });
    }
    return mockLecturers.map((l) => ({
      id: l.id,
      id_dosen: null,
      nidn: l.id,
      name: l.name,
      email: '',
      department: l.department,
      jabatan_struktural: 'Dosen Pengampu',
      maks_sks_harian: 12,
    }));
  }, [backendLecturers, activeDeptCode]);

  // Modal State for Managing Rombels (Connected DB mode)
  const [managingGroup, setManagingGroup] = useState<GroupedDeptCourse | null>(null);
  const [editingClassItem, setEditingClassItem] = useState<BackendClassItem | null>(null);
  const [editClassForm, setEditClassForm] = useState<AdjustClassPayload>({});
  const [cancelTargetClass, setCancelTargetClass] = useState<BackendClassItem | null>(null);
  const [cancelReason, setCancelReason] = useState('Kuota peserta di bawah batas minimum kelas');
  const [newRombelLabel, setNewRombelLabel] = useState('');
  const [newRombelQuota, setNewRombelQuota] = useState(40);
  const [isSavingAction, setIsSavingAction] = useState(false);

  // Fallback Modal State (Offline mock mode)
  const [classActionCourse, setClassActionCourse] = useState<CourseOffering | null>(null);
  const [newClassName, setNewClassName] = useState('Kelas C');
  const [newClassCapacity, setNewClassCapacity] = useState(40);

  // Form Input State (1 MK -> Multi-Rombel)
  const [inputMode, setInputMode] = useState<'curriculum' | 'new'>('curriculum');
  const [selectedPresetCode, setSelectedPresetCode] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formSemester, setFormSemester] = useState<number>(1);
  const [formSks, setFormSks] = useState<number>(3);
  const [formTheorySks, setFormTheorySks] = useState<number>(2);
  const [formPracticeSks, setFormPracticeSks] = useState<number>(1);
  const [formIsMandatory, setFormIsMandatory] = useState<boolean>(true);
  const [formClasses, setFormClasses] = useState<ClassRombel[]>([
    { id: `cl-${Date.now()}-1`, name: 'A', capacity: 40, enrolled: 40 },
    { id: `cl-${Date.now()}-2`, name: 'B', capacity: 40, enrolled: 40 },
  ]);
  const [formPrimaryLecturerName, setFormPrimaryLecturerName] = useState<string>(mockLecturers[0].name);
  const [formTandemNames, setFormTandemNames] = useState<string[]>([]);
  useEffect(() => {
    if (lecturerOptions.length > 0 && !lecturerOptions.some((l) => l.name === formPrimaryLecturerName)) {
      setFormPrimaryLecturerName(lecturerOptions[0].name);
    }
  }, [lecturerOptions]);
  const [formPreferredDays, setFormPreferredDays] = useState<string[]>(['Senin', 'Rabu']);
  const [formTimeSlot, setFormTimeSlot] = useState<'Sesi Pagi' | 'Sesi Siang' | 'Sesi Sore'>('Sesi Pagi');
  const [formAvoidFriday, setFormAvoidFriday] = useState(true);
  const [formMaxOneSession, setFormMaxOneSession] = useState(true);
  const [formSpecialNote, setFormSpecialNote] = useState('');
  const [formError, setFormError] = useState('');
  const [existingOfferingHint, setExistingOfferingHint] = useState('');

  // Department Master Courses from DB (for preset picker)
  const deptMasterCourses = useMemo(() => {
    return backendCourses.filter((c) => c.kode_prodi.toUpperCase() === activeDeptCode);
  }, [backendCourses, activeDeptCode]);

  // Group real backendClasses by course_code for active department
  const groupedBackendCourses = useMemo<GroupedDeptCourse[]>(() => {
    const deptClasses = backendClasses.filter(
      (c) => c.department.toUpperCase() === activeDeptCode
    );
    const map = new Map<string, BackendClassItem[]>();
    deptClasses.forEach((cls) => {
      const list = map.get(cls.course_code) || [];
      list.push(cls);
      map.set(cls.course_code, list);
    });

    const result: GroupedDeptCourse[] = [];
    map.forEach((clsList, code) => {
      const sorted = [...clsList].sort((a, b) => a.class_label.localeCompare(b.class_label));
      const first = sorted[0];
      const lecturersSet = new Set<string>();
      sorted.forEach((c) => c.lecturer_names.forEach((l) => lecturersSet.add(l)));
      const totalEnrolled = sorted.reduce((acc, c) => acc + c.enrolled_count, 0);
      const hasBelowQuota = sorted.some((c) => c.requires_room && c.enrolled_count < MIN_CLASS_QUOTA);

      result.push({
        key: code,
        code,
        name: first.name,
        sks: first.sks,
        semester: first.semester,
        isMandatory: first.is_mandatory,
        roomTypeNeeded: first.room_type_needed,
        lecturerNames: Array.from(lecturersSet),
        classes: sorted,
        totalEnrolled,
        hasBelowQuota,
      });
    });

    return result.sort((a, b) => a.semester - b.semester || a.code.localeCompare(b.code));
  }, [backendClasses, activeDeptCode]);

  // Keep managingGroup synced with latest backendClasses updates
  const syncedManagingGroup = useMemo(() => {
    if (!managingGroup) return null;
    return groupedBackendCourses.find((g) => g.code === managingGroup.code) || null;
  }, [groupedBackendCourses, managingGroup]);

  // Filtered list for Connected DB Mode
  const filteredGroupedCourses = useMemo(() => {
    return groupedBackendCourses.filter((g) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          g.code.toLowerCase().includes(q) ||
          g.name.toLowerCase().includes(q) ||
          g.lecturerNames.some((l) => l.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (selectedSemester !== 'all' && g.semester.toString() !== selectedSemester) return false;
      if (selectedType !== 'all') {
        if (selectedType === 'wajib' && !g.isMandatory) return false;
        if (selectedType === 'pilihan' && g.isMandatory) return false;
      }
      if (belowQuotaOnly && !g.hasBelowQuota) return false;
      return true;
    });
  }, [groupedBackendCourses, searchQuery, selectedSemester, selectedType, belowQuotaOnly]);

  // Fallback Mock Courses (when offline)
  const deptMockCourses = useMemo(() => {
    return courses.filter((c) => {
      if (c.department !== activeDept) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          c.code.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.primaryLecturer.name.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (selectedSemester !== 'all' && c.semester.toString() !== selectedSemester) return false;
      if (selectedType !== 'all') {
        if (selectedType === 'wajib' && !c.isMandatory) return false;
        if (selectedType === 'pilihan' && c.isMandatory) return false;
      }
      if (belowQuotaOnly && !c.classes.some((cl) => cl.capacity < MIN_CLASS_QUOTA)) return false;
      return true;
    });
  }, [courses, activeDept, searchQuery, selectedSemester, selectedType, belowQuotaOnly]);

  // Live Statistics
  const totalMk = isConnected ? groupedBackendCourses.length : deptMockCourses.length;
  const totalRombel = isConnected
    ? groupedBackendCourses.reduce((sum, g) => sum + g.classes.length, 0)
    : deptMockCourses.reduce((sum, c) => sum + c.classes.length, 0);
  const totalSks = isConnected
    ? groupedBackendCourses.reduce((sum, g) => sum + g.sks, 0)
    : deptMockCourses.reduce((sum, c) => sum + c.sks, 0);
  const totalEstMhs = isConnected
    ? groupedBackendCourses.reduce((sum, g) => sum + g.totalEnrolled, 0)
    : deptMockCourses.reduce((sum, c) => sum + c.totalEnrolledEst, 0);
  const belowQuotaClassCount = isConnected
    ? groupedBackendCourses.reduce(
        (sum, g) =>
          sum + g.classes.filter((c) => c.requires_room && c.enrolled_count < MIN_CLASS_QUOTA).length,
        0
      )
    : deptMockCourses.reduce(
        (sum, c) => sum + c.classes.filter((cl) => cl.capacity < MIN_CLASS_QUOTA).length,
        0
      );

  // SKS Auto-Sync handlers
  const handleTotalSksChange = (newTotal: number) => {
    setFormSks(newTotal);
    const clampedPractice = Math.min(formPracticeSks, newTotal);
    setFormPracticeSks(clampedPractice);
    setFormTheorySks(newTotal - clampedPractice);
  };

  const handlePracticeSksChange = (newPractice: number) => {
    const safePractice = Math.max(0, Math.min(formSks, newPractice));
    setFormPracticeSks(safePractice);
    setFormTheorySks(formSks - safePractice);
  };

  const handleTheorySksChange = (newTheory: number) => {
    const safeTheory = Math.max(0, Math.min(formSks, newTheory));
    setFormTheorySks(safeTheory);
    setFormPracticeSks(formSks - safeTheory);
  };

  const handleSelectCurriculumPreset = (kodeMk: string) => {
    setSelectedPresetCode(kodeMk);
    setFormError('');
    const found = deptMasterCourses.find((m) => m.kode_mk === kodeMk);
    if (!found) {
      setExistingOfferingHint('');
      return;
    }
    const isLab = found.jenis_mk.toLowerCase().includes('praktikum');
    const safeSks = Math.max(1, Math.min(4, found.sks));
    setFormCode(found.kode_mk);
    setFormName(found.nama_mk);
    setFormSemester(found.semester_paket || 1);
    setFormSks(safeSks);
    setFormPracticeSks(isLab ? Math.min(1, safeSks) : 0);
    setFormTheorySks(isLab ? Math.max(0, safeSks - 1) : safeSks);
    setFormIsMandatory(!found.jenis_mk.toLowerCase().includes('pilihan'));

    const existingGroup = groupedBackendCourses.find((g) => g.code === found.kode_mk);
    if (existingGroup && existingGroup.classes.length > 0) {
      setFormClasses(
        existingGroup.classes.map((cl, idx) => ({
          id: `cl-${found.kode_mk}-${cl.class_label}-${idx}`,
          name: cl.class_label,
          capacity: cl.enrolled_count,
          enrolled: cl.enrolled_count,
        }))
      );
      if (existingGroup.lecturerNames.length > 0) {
        setFormPrimaryLecturerName(existingGroup.lecturerNames[0]);
        setFormTandemNames(existingGroup.lecturerNames.slice(1));
      }
      setExistingOfferingHint(
        `${found.kode_mk} sudah memiliki ${existingGroup.classes.length} kelas aktif (${existingGroup.classes.map((c) => c.class_label).join(', ')}). Anda bisa memperbarui kuota/dosen atau klik + Tambah Kelas, lalu simpan.`
      );
    } else {
      setExistingOfferingHint('');
      setFormClasses([
        { id: `cl-${Date.now()}-1`, name: 'A', capacity: 40, enrolled: 40 },
        { id: `cl-${Date.now()}-2`, name: 'B', capacity: 40, enrolled: 40 },
      ]);
    }
  };

  // Form helper: Add rombel (picks next unused letter)
  const handleAddFormClass = () => {
    const used = new Set(formClasses.map((c) => c.name.replace(/^Kelas\s+/i, '').trim().toUpperCase()));
    let nextChar = String.fromCharCode(65 + formClasses.length);
    for (let code = 65; code <= 90; code += 1) {
      const candidate = String.fromCharCode(code);
      if (!used.has(candidate)) {
        nextChar = candidate;
        break;
      }
    }
    const newCls: ClassRombel = {
      id: `cl-${Date.now()}-${nextChar}`,
      name: nextChar,
      capacity: 40,
      enrolled: 40,
    };
    setFormClasses([...formClasses, newCls]);
  };

  const handleRemoveFormClass = (idx: number) => {
    if (formClasses.length <= 1) {
      showToast('Minimal harus ada 1 rombel kelas.', 'warning');
      return;
    }
    setFormClasses(formClasses.filter((_, i) => i !== idx));
  };

  const toggleDay = (day: string) => {
    setFormPreferredDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Submit Form Input
  const handleSaveCourse = async (asDraft: boolean) => {
    setFormError('');
    const cleanCode = formCode.trim().toUpperCase();
    const cleanName = formName.trim();
    if (!cleanCode || !cleanName) {
      const msg = 'Kode Mata Kuliah dan Nama Mata Kuliah wajib diisi.';
      setFormError(msg);
      showToast(msg, 'error');
      return;
    }
    if (formTheorySks + formPracticeSks !== formSks) {
      const msg = 'Jumlah SKS Teori + Praktik harus sama dengan Total SKS.';
      setFormError(msg);
      showToast(msg, 'warning');
      return;
    }
    if (formClasses.some((cl) => cl.capacity <= 0)) {
      const msg = 'Estimasi mahasiswa per rombel harus lebih dari 0.';
      setFormError(msg);
      showToast(msg, 'warning');
      return;
    }

    const primary = mockLecturers.find((l) => l.name === formPrimaryLecturerName) || {
      ...mockLecturers[0],
      name: formPrimaryLecturerName,
    };
    const tandems = formTandemNames.map(
      (tname, i) =>
        mockLecturers.find((l) => l.name === tname) || {
          ...mockLecturers[0],
          id: `t-${i}`,
          name: tname,
        }
    );

    if (backendStatus === 'connected') {
      setIsSavingAction(true);
      const res = await createDepartemenOffering({
        course_code: cleanCode,
        name: cleanName,
        department: activeDeptCode,
        semester: formSemester,
        sks: formSks,
        sks_teori: formTheorySks,
        sks_praktik: formPracticeSks,
        is_mandatory: formIsMandatory,
        requires_room: true,
        room_type_needed: formPracticeSks > 0 ? 'Lab' : 'Teori',
        primary_lecturer_name: formPrimaryLecturerName,
        tandem_lecturer_names: formTandemNames,
        classes: formClasses.map((cls) => ({
          class_label: cls.name.replace(/^Kelas\s+/i, '').trim() || 'A',
          enrolled_count: cls.capacity,
        })),
        preferred_days: formPreferredDays,
        preferred_time_slot: formTimeSlot,
        avoid_friday: formAvoidFriday,
        special_note: formSpecialNote.trim() || undefined,
        as_draft: asDraft,
        update_existing: inputMode === 'curriculum',
      });
      setIsSavingAction(false);

      if (res) {
        await refreshDeptMetadata();
        setFormCode('');
        setFormName('');
        setFormTandemNames([]);
        setSelectedPresetCode('');
        setExistingOfferingHint('');
        setFormError('');
        setView('daftar_mk');
      } else {
        setFormError(
          'Gagal menyimpan usulan ke database. Periksa kembali kode MK atau pastikan label kelas belum terdaftar aktif.'
        );
      }
      return;
    }

    // Fallback offline mode
    const specialConstraints: string[] = [];
    if (formAvoidFriday) specialConstraints.push('Hindari Jumat Siang');
    if (formMaxOneSession) specialConstraints.push('Maksimal 1 Sesi / Hari');
    if (formSpecialNote.trim()) specialConstraints.push(formSpecialNote.trim());
    const totalCapacity = formClasses.reduce((sum, c) => sum + c.capacity, 0);

    addCourse({
      code: cleanCode,
      name: cleanName,
      sks: formSks,
      theorySks: formTheorySks,
      practiceSks: formPracticeSks,
      department: activeDept,
      semester: formSemester,
      curriculum: 'Kurikulum OBE 2024',
      isMandatory: formIsMandatory,
      totalEnrolledEst: totalCapacity,
      classes: formClasses.map((c) => ({ ...c, name: `Kelas ${c.name.replace(/^Kelas\s+/i, '')}` })),
      primaryLecturer: primary,
      tandemLecturers: tandems,
      preferredDays: formPreferredDays.length > 0 ? formPreferredDays : ['Senin'],
      preferredTimeSlot: formTimeSlot,
      specialConstraints,
      recommendedRoomType: formPracticeSks > 0 ? 'Lab Komputer' : 'Ruang Teori Standar',
      status: asDraft ? 'Draft' : 'Submitted',
    });
    pushDeptLog('Tambah', `${cleanCode} (${cleanName})`, `${formClasses.length} rombel (mode lokal)`);
    showToast(`Mata kuliah [${cleanCode}] ${cleanName} berhasil disimpan.`, 'success');
    setFormCode('');
    setFormName('');
    setView('daftar_mk');
  };

  // Manage Rombels in Connected Mode
  const openManageGroup = (group: GroupedDeptCourse) => {
    setManagingGroup(group);
    const nextChar = String.fromCharCode(65 + group.classes.length);
    setNewRombelLabel(nextChar);
    setNewRombelQuota(40);
    setEditingClassItem(null);
  };

  const handleAddRombelToGroup = async () => {
    if (!syncedManagingGroup) return;
    const label = newRombelLabel.trim() || String.fromCharCode(65 + syncedManagingGroup.classes.length);
    setIsSavingAction(true);
    const ok = await addBackendClass({
      id: `${syncedManagingGroup.code}-${label}`,
      course_code: syncedManagingGroup.code,
      department: activeDeptCode,
      semester: syncedManagingGroup.semester,
      name: syncedManagingGroup.name,
      class_label: label,
      sks: syncedManagingGroup.sks,
      enrolled_count: Number(newRombelQuota) || 40,
      enrolled_is_estimated: true,
      room_type_needed: syncedManagingGroup.roomTypeNeeded,
      is_mandatory: syncedManagingGroup.isMandatory,
      is_elective: !syncedManagingGroup.isMandatory,
      rombel_key: `${activeDeptCode}-S${syncedManagingGroup.semester}-${label}`,
      requires_room: true,
      requires_accessibility: false,
      is_transition_course: false,
      lecturer_ids: [],
      lecturer_names: syncedManagingGroup.lecturerNames,
    });
    setIsSavingAction(false);
    if (ok) {
      pushDeptLog('Tambah', `${syncedManagingGroup.code}-${label}`, `Menambah rombel baru (kuota ${newRombelQuota} mhs)`);
      setNewRombelLabel(String.fromCharCode(65 + syncedManagingGroup.classes.length + 1));
    }
  };

  const handleSaveClassEdit = async () => {
    if (!editingClassItem) return;
    setIsSavingAction(true);
    const ok = await adjustBackendClass(editingClassItem.id, editClassForm);
    setIsSavingAction(false);
    if (ok) {
      pushDeptLog(
        'Sesuaikan',
        editingClassItem.id,
        `Kuota: ${editClassForm.enrolled_count ?? editingClassItem.enrolled_count} mhs, SKS: ${editClassForm.sks ?? editingClassItem.sks}`
      );
      setEditingClassItem(null);
    }
  };

  const handleConfirmCancelClass = async () => {
    if (!cancelTargetClass) return;
    setIsSavingAction(true);
    const reason = cancelReason.trim() || 'Dibatalkan oleh departemen';
    const ok = await cancelBackendClass(cancelTargetClass.id, reason);
    setIsSavingAction(false);
    if (ok) {
      pushDeptLog(
        'Batalkan',
        cancelTargetClass.id,
        `Dibatalkan (peserta ${cancelTargetClass.enrolled_count} mhs)`,
        reason
      );
      setCancelTargetClass(null);
      await refreshDeptMetadata();
    }
  };

  const handleRestoreClass = async (classId: string) => {
    setIsSavingAction(true);
    const ok = await restoreBackendClass(classId);
    setIsSavingAction(false);
    if (ok) {
      await refreshDeptMetadata();
    }
  };

  // Real Excel (.xlsx) & PDF (.pdf) export via Modul 4 backend
  const handleExportSpreadsheet = async () => {
    setExportDropdownOpen(false);
    if (backendStatus === 'connected') {
      try {
        await apiService.downloadExportFile('excel', activeDeptCode, showCancelled);
        showToast(`Berkas Excel kebutuhan ${activeDept} berhasil diunduh.`, 'success');
      } catch (err: any) {
        showToast(`Gagal mengunduh Excel: ${err.message}`, 'error');
      }
      return;
    }
    showToast('Ekspor Excel membutuhkan koneksi backend aktif.', 'warning');
  };

  const handleExportPdf = async () => {
    setExportDropdownOpen(false);
    if (backendStatus === 'connected') {
      try {
        await apiService.downloadExportFile('pdf', activeDeptCode, showCancelled);
        showToast(`Surat Pengajuan PDF ${activeDept} berhasil diunduh.`, 'success');
      } catch (err: any) {
        showToast(`Gagal mengunduh PDF: ${err.message}`, 'error');
      }
      return;
    }
    window.print();
  };

  const handleSendToFaculty = async () => {
    if (backendStatus === 'connected') {
      try {
        const res = await apiService.submitDepartemen(activeDeptCode, currentUser.email);
        setDeptStatusInfo(res);
        setSubmissionStatus('Diajukan ke Fakultas');
        await refreshDeptMetadata();
        showToast(`Usulan perkuliahan ${activeDept} resmi diajukan ke Fakultas.`, 'success');
        return;
      } catch (err: any) {
        showToast(`Gagal mengajukan usulan: ${err.message}`, 'error');
        return;
      }
    }
    setSubmissionStatus('Diajukan ke Fakultas');
    pushDeptLog(
      'Ajukan',
      `Usulan ${activeDept}`,
      `Mengajukan ${totalMk} MK (${totalRombel} rombel) ke Admin Fakultas`
    );
    showToast(`Usulan perkuliahan ${activeDept} resmi diajukan ke Admin Penjadwalan Fakultas.`, 'success');
  };

  const deptMeta = {
    'Sistem Informasi': {
      code: 'DSI',
      kaprodi: 'Ricky Akbar, M.Kom.',
      nip: '19840915 200812 1 002',
      rules: [
        'Mata kuliah pilihan (CRM, Pemrograman Framework, NLP Terapan, Blockchain) diusulkan terjadwal pada hari yang sama.',
        'Mengakomodasi kelas penyesuaian transisi kurikulum antar-angkatan.',
        'Koordinasi jadwal dosen layanan dengan fakultas luar (MIPA/Teknik).',
      ],
      docNo: 'Surat Ketua DSI No. 228/UN.16.15.3.2/PK.01.00/2026',
    },
    Informatika: {
      code: 'DIF',
      kaprodi: 'Dr. Ir. Wahyudi, S.T., M.T.',
      nip: '19760724 200212 1 001',
      rules: [
        'Kelas berkapasitas besar (Sem 1 & Sem 3) dibagi menjadi kelas teori dan kelas praktikum.',
        'Sinkronisasi jadwal antara teori (2 SKS) dan praktikum pendamping (1 SKS) tim tandem.',
        'Kapasitas Lab Software maksimal 40 PC per rombel.',
      ],
      docNo: 'Surat Ketua DIF No. 234/UN.16.15.3.3/PK.01.00/2026',
    },
    'Teknik Komputer': {
      code: 'DTK',
      kaprodi: 'Dr. Eng. Tati Erlina, M.IT.',
      nip: '19790412 200604 2 001',
      rules: [
        'Mata kuliah berbobot 3 SKS diprioritaskan pada Shift-1 (07:30 - 10:00).',
        'Mata kuliah berbobot 2 SKS diminta tidak dijadwalkan pada shift pukul 11:00.',
        'Matematika 1, Matematika 3, dan Aljabar Linear diprioritaskan Shift-1.',
        'Perkuliahan yang diampu Dosen DTK tidak dijadwalkan pada Hari Kamis Shift 1 dan 2.',
      ],
      docNo: 'Surat Ketua DTK No. B/131/UN16.15.3.1/PK.01.00/2026',
    },
  }[activeDept];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row text-slate-800 font-sans">
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden"
        />
      )}

      {/* Sidebar Khusus Departemen */}
      <aside
        className={`fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50 w-64 h-screen bg-white border-r border-slate-200 flex flex-col shrink-0 transition-transform lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#082c78] flex items-center justify-center text-white font-black text-xs shadow-xs">
              FTI
            </div>
            <div>
              <div className="font-extrabold text-xs text-slate-900 leading-tight">
                UNIVERSITAS ANDALAS
              </div>
              <div className="text-[10px] text-slate-500 font-semibold leading-tight">
                Konsol Departemen Akademik
              </div>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dept Card (Locked to Kadep role) */}
        <div className="p-3">
          <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-100">
            <div className="text-[9px] uppercase tracking-wider font-bold text-blue-600 mb-1 flex items-center justify-between">
              <span>Departemen Pengelola</span>
              {isRoleLocked && <Lock className="w-3 h-3 text-blue-500" />}
            </div>
            {isRoleLocked ? (
              <div className="text-xs font-extrabold text-blue-950">
                Departemen {activeDept}
              </div>
            ) : (
              <select
                value={activeDept}
                onChange={(e) => setActiveDept(e.target.value as DeptName)}
                className="w-full text-xs font-bold text-blue-950 bg-white border border-blue-200 rounded-lg p-1.5 focus:outline-hidden"
              >
                <option value="Sistem Informasi">Departemen Sistem Informasi</option>
                <option value="Informatika">Departemen Informatika</option>
                <option value="Teknik Komputer">Departemen Teknik Komputer</option>
              </select>
            )}
            <div className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate">{currentUser.name || deptMeta.kaprodi}</span>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 text-xs">
          <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Kebutuhan Perkuliahan
          </div>

          <button
            onClick={() => {
              setView('daftar_mk');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold transition-all ${
              view === 'daftar_mk'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4" />
              <span>Daftar Tawaran MK</span>
            </div>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                view === 'daftar_mk' ? 'bg-white/20 text-white' : 'bg-slate-200/60 text-slate-700'
              }`}
            >
              {totalMk}
            </span>
          </button>

          <button
            onClick={() => {
              setView('input_mk');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-semibold transition-all ${
              view === 'input_mk'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Ajukan MK Baru</span>
          </button>

          <button
            onClick={() => {
              setView('riwayat');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold transition-all ${
              view === 'riwayat'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <History className="w-4 h-4" />
              <span>Riwayat Perubahan</span>
            </div>
            {(dbLogs.length > 0 || deptLogs.length > 0) && (
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                  view === 'riwayat' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                }`}
              >
                {dbLogs.length > 0 ? dbLogs.length : deptLogs.length}
              </span>
            )}
          </button>

          <div className="px-3 pt-4 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Pedoman
          </div>

          <button
            onClick={() => {
              setView('pedoman');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-semibold transition-all ${
              view === 'pedoman'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Aturan &amp; Batasan Prodi</span>
          </button>
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-800 truncate">{deptMeta.kaprodi}</div>
              <div className="text-[10px] text-slate-400 truncate">Ketua {activeDept}</div>
            </div>
            <button
              onClick={logout}
              title="Keluar / Logout"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content body */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-600"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="text-xs font-bold text-[#082c78] flex items-center gap-1.5">
                <span>Departemen {activeDept}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 font-normal">Semester {semesterLabel}</span>
              </div>
              <div className="text-[11px] text-slate-500 hidden sm:flex items-center gap-2">
                <span>Pengelolaan Tawaran Mata Kuliah &amp; Kebutuhan Kelas</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    isConnected
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {isConnected ? 'Terhubung Database' : 'Mode Offline'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
                submissionStatus === 'Draft'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  submissionStatus === 'Draft' ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
              {submissionStatus}
            </span>

            {submissionStatus === 'Draft' && (
              <button
                onClick={handleSendToFaculty}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#082c78] hover:bg-[#0c3999] shadow-xs transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ajukan ke Fakultas</span>
              </button>
            )}
          </div>
        </header>

        <main className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto w-full">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Mata Kuliah</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">{totalMk} MK</div>
              <div className="text-[10px] text-blue-700 mt-0.5 font-medium">{totalSks} SKS Total</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400">Jumlah Kelas (Rombel)</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">{totalRombel} Kelas</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Prodi {activeDeptCode}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400">Estimasi Mahasiswa</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">{totalEstMhs} Kursi</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Total Kebutuhan Ruang</div>
            </div>

            <button
              type="button"
              onClick={() => {
                setView('daftar_mk');
                setBelowQuotaOnly((prev) => !prev);
              }}
              className={`p-3.5 rounded-xl border text-left transition-all shadow-xs ${
                belowQuotaOnly
                  ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-200'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-[10px] uppercase font-bold text-slate-400">
                Di Bawah Kuota (&lt; {MIN_CLASS_QUOTA})
              </div>
              <div
                className={`text-xl font-black mt-0.5 ${
                  belowQuotaClassCount > 0 ? 'text-amber-600' : 'text-emerald-700'
                }`}
              >
                {belowQuotaClassCount > 0 ? `${belowQuotaClassCount} Kelas` : 'Semua Aman'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {belowQuotaClassCount > 0 ? 'Klik untuk filter kelas sepi' : `Semua >= ${MIN_CLASS_QUOTA} Mhs`}
              </div>
            </button>
          </div>

          {/* VIEW: DAFTAR TAWARAN MK */}
          {view === 'daftar_mk' && (
            <div className="space-y-4">
              {/* Simplified Toolbar */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-[260px] flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari kode MK, nama mata kuliah, atau dosen..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-hidden"
                  >
                    <option value="all">Semua Semester</option>
                    <option value="1">Semester 1</option>
                    <option value="3">Semester 3</option>
                    <option value="5">Semester 5</option>
                    <option value="7">Semester 7</option>
                  </select>

                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-hidden"
                  >
                    <option value="all">Semua Jenis</option>
                    <option value="wajib">Wajib Prodi</option>
                    <option value="pilihan">MK Pilihan</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  {/* Unified Export Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setExportDropdownOpen((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>Unduh Laporan</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    {exportDropdownOpen && (
                      <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 z-40 text-xs">
                        <button
                          type="button"
                          onClick={() => void handleExportSpreadsheet()}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 text-slate-700 font-medium flex items-center gap-2"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                          <span>Rekap Excel (.xlsx)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleExportPdf()}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 text-slate-700 font-medium flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4 text-rose-600" />
                          <span>Surat Pengajuan Resmi (.pdf)</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setView('input_mk')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[#082c78] hover:bg-[#0c3999] shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajukan MK Baru</span>
                  </button>
                </div>
              </div>

              {/* Table (Connected DB Grouped Mode vs Offline Mock Fallback) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  {isConnected ? (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                        <tr>
                          <th className="py-2.5 px-3">No</th>
                          <th className="py-2.5 px-3">Kode &amp; Nama Mata Kuliah</th>
                          <th className="py-2.5 px-2 text-center">SKS</th>
                          <th className="py-2.5 px-3">Dosen Pengampu</th>
                          <th className="py-2.5 px-3">Rombel Kelas</th>
                          <th className="py-2.5 px-3 text-center">Est. Mhs</th>
                          <th className="py-2.5 px-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredGroupedCourses.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
                              Tidak ada mata kuliah yang sesuai filter.
                            </td>
                          </tr>
                        ) : (
                          filteredGroupedCourses.map((g, idx) => (
                            <tr key={g.key} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-blue-900 font-mono text-xs">
                                    {g.code}
                                  </span>
                                  {g.hasBelowQuota && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-bold">
                                      Ada kelas &lt; {MIN_CLASS_QUOTA} mhs
                                    </span>
                                  )}
                                </div>
                                <div className="font-semibold text-slate-800 text-xs">{g.name}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {g.isMandatory ? 'Wajib Prodi' : 'MK Pilihan'} • Sem {g.semester} • {g.roomTypeNeeded}
                                </div>
                              </td>
                              <td className="py-3 px-2 text-center font-bold text-slate-800">
                                {g.sks}
                              </td>
                              <td className="py-3 px-3 text-slate-700 text-[11px] max-w-[220px]">
                                <div className="truncate" title={g.lecturerNames.join(', ')}>
                                  {g.lecturerNames.join(', ')}
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex flex-wrap gap-1">
                                  {g.classes.map((cl) => (
                                    <span
                                      key={cl.id}
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                        cl.requires_room && cl.enrolled_count < MIN_CLASS_QUOTA
                                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                                          : 'bg-blue-50 text-blue-800 border-blue-200'
                                      }`}
                                    >
                                      {cl.class_label} ({cl.enrolled_count})
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-slate-800 text-xs">
                                {g.totalEnrolled}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => openManageGroup(g)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                                >
                                  <Sliders className="w-3.5 h-3.5" />
                                  <span>Kelola Kelas</span>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                        <tr>
                          <th className="py-2.5 px-3">No</th>
                          <th className="py-2.5 px-3">Kode &amp; Nama MK</th>
                          <th className="py-2.5 px-2 text-center">SKS</th>
                          <th className="py-2.5 px-3">Dosen Pengampu</th>
                          <th className="py-2.5 px-3 text-center">Rombel</th>
                          <th className="py-2.5 px-3 text-center">Est. Mhs</th>
                          <th className="py-2.5 px-2 text-center">Status</th>
                          <th className="py-2.5 px-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {deptMockCourses.map((c, idx) => (
                          <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-blue-900 font-mono text-xs">{c.code}</div>
                              <div className="font-semibold text-slate-800 text-xs">{c.name}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {c.isMandatory ? 'Wajib Prodi' : 'MK Pilihan'} • Sem {c.semester}
                              </div>
                            </td>
                            <td className="py-3 px-2 text-center font-bold text-slate-800">{c.sks}</td>
                            <td className="py-3 px-3 text-[11px] text-slate-700">{c.primaryLecturer.name}</td>
                            <td className="py-3 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-blue-50 text-blue-800 border border-blue-200">
                                {c.classes.length} Kelas
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-slate-800">{c.totalEnrolledEst}</td>
                            <td className="py-3 px-2 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                {c.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setClassActionCourse(c)}
                                  title="Kelola Rombel"
                                  className="p-1 text-blue-700 hover:bg-blue-50 rounded"
                                >
                                  <Sliders className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteCourse(c.id)}
                                  title="Hapus Usulan"
                                  className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span>
                      Menampilkan{' '}
                      <strong>
                        {isConnected ? filteredGroupedCourses.length : deptMockCourses.length}
                      </strong>{' '}
                      mata kuliah dari Departemen {activeDept}
                    </span>
                    {isConnected && cancelledClasses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowCancelled((prev) => !prev)}
                        className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold hover:bg-rose-100"
                      >
                        {showCancelled ? 'Sembunyikan' : 'Lihat'} {cancelledClasses.length} Kelas Dibatalkan
                      </button>
                    )}
                  </div>
                  <span className="text-[11px]">
                    {deptStatusInfo?.waktu_pengajuan
                      ? `Diajukan: ${deptStatusInfo.waktu_pengajuan.replace('T', ' ')}`
                      : `Acuan: ${deptMeta.docNo}`}
                  </span>
                </div>
              </div>

              {isConnected && showCancelled && cancelledClasses.length > 0 && (
                <div className="bg-white rounded-xl border border-rose-200 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-rose-900">
                      Daftar Kelas Dibatalkan ({cancelledClasses.length})
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Kelas ini tidak ikut dijadwalkan oleh mesin CP-SAT.
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {cancelledClasses.map((cc) => (
                      <div
                        key={cc.id}
                        className="p-2.5 rounded-lg bg-rose-50/50 border border-rose-200 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 truncate">
                            [{cc.id}] {cc.name} ({cc.enrolled_count} Mhs)
                          </div>
                          <div className="text-[10px] text-rose-700 truncate">
                            Alasan: {cc.alasan_pembatalan || '-'}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={isSavingAction}
                          onClick={() => void handleRestoreClass(cc.id)}
                          className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50 shrink-0"
                        >
                          Pulihkan
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: AJUKAN MK BARU */}
          {view === 'input_mk' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 md:p-6 space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    Formulir Pengajuan Mata Kuliah &amp; Rombel
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pilih mata kuliah dari kurikulum atau buat baru, lalu tentukan jumlah rombel, dosen, dan preferensi waktu.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setView('daftar_mk')}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal / Kembali
                </button>
              </div>

              {/* Source Mode Toggle: Curriculum Picker vs New Course */}
              {deptMasterCourses.length > 0 && (
                <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-blue-950">Sumber Data Mata Kuliah:</span>
                    <div className="inline-flex rounded-lg bg-white p-0.5 border border-blue-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setInputMode('curriculum')}
                        className={`px-3 py-1 rounded-md font-bold transition-colors ${
                          inputMode === 'curriculum'
                            ? 'bg-[#082c78] text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Pilih dari Kurikulum ({deptMasterCourses.length} MK)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setInputMode('new');
                          setSelectedPresetCode('');
                        }}
                        className={`px-3 py-1 rounded-md font-bold transition-colors ${
                          inputMode === 'new'
                            ? 'bg-[#082c78] text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Mata Kuliah Baru
                      </button>
                    </div>
                  </div>

                  {inputMode === 'curriculum' && (
                    <div className="space-y-2">
                      <select
                        value={selectedPresetCode}
                        onChange={(e) => handleSelectCurriculumPreset(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-blue-200 bg-white focus:border-blue-600 focus:outline-hidden"
                      >
                        <option value="">-- Pilih mata kuliah kurikulum {activeDept} untuk isi otomatis --</option>
                        {deptMasterCourses.map((mk) => (
                          <option key={mk.id_mk} value={mk.kode_mk}>
                            {mk.kode_mk} — {mk.nama_mk} ({mk.sks} SKS • Sem {mk.semester_paket})
                          </option>
                        ))}
                      </select>
                      {existingOfferingHint && (
                        <div className="p-2.5 rounded-lg bg-white border border-blue-200 text-[11px] text-blue-900 font-medium">
                          {existingOfferingHint}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kode Mata Kuliah <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="Contoh: DSI61101 / DIF61102 / CCE61101"
                    className="w-full px-3 py-2 text-xs font-bold font-mono rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Mata Kuliah <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: Basis Data Terdistribusi"
                    className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                {/* SKS Auto-Sync */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Total SKS</label>
                    <select
                      value={formSks}
                      onChange={(e) => handleTotalSksChange(parseInt(e.target.value))}
                      className="w-full px-2.5 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                    >
                      <option value={1}>1 SKS</option>
                      <option value={2}>2 SKS</option>
                      <option value={3}>3 SKS</option>
                      <option value={4}>4 SKS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Teori</label>
                    <input
                      type="number"
                      min={0}
                      max={formSks}
                      value={formTheorySks}
                      onChange={(e) => handleTheorySksChange(parseInt(e.target.value) || 0)}
                      className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Praktik</label>
                    <input
                      type="number"
                      min={0}
                      max={formSks}
                      value={formPracticeSks}
                      onChange={(e) => handlePracticeSksChange(parseInt(e.target.value) || 0)}
                      className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Semester</label>
                    <select
                      value={formSemester}
                      onChange={(e) => setFormSemester(parseInt(e.target.value))}
                      className="w-full px-2.5 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                    >
                      <option value={1}>Semester 1 (Tingkat 1)</option>
                      <option value={3}>Semester 3 (Tingkat 2)</option>
                      <option value={5}>Semester 5 (Tingkat 3)</option>
                      <option value={7}>Semester 7 (Tingkat 4)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Klasifikasi MK</label>
                    <div className="flex gap-2 mt-0.5">
                      <button
                        type="button"
                        onClick={() => setFormIsMandatory(true)}
                        className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg border transition-all ${
                          formIsMandatory
                            ? 'bg-[#082c78] text-white border-blue-900'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        Wajib Prodi
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormIsMandatory(false)}
                        className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg border transition-all ${
                          !formIsMandatory
                            ? 'bg-[#082c78] text-white border-blue-900'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        MK Pilihan
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dosen Pengampu & Tandem */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dosen Pengampu Utama (PJMK) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formPrimaryLecturerName}
                    onChange={(e) => setFormPrimaryLecturerName(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
                  >
                    {lecturerOptions.map((lec) => (
                      <option key={`${lec.id}-${lec.name}`} value={lec.name}>
                        {lec.name} ({lec.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dosen Tandem / Pendamping (Opsional)
                  </label>
                  <select
                    value=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && !formTandemNames.includes(val)) {
                        setFormTandemNames([...formTandemNames, val]);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">+ Pilih Dosen Tandem...</option>
                    {lecturerOptions
                      .filter((l) => l.name !== formPrimaryLecturerName && !formTandemNames.includes(l.name))
                      .map((lec) => (
                        <option key={`${lec.id}-${lec.name}`} value={lec.name}>
                          {lec.name} ({lec.department})
                        </option>
                      ))}
                  </select>
                  {formTandemNames.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {formTandemNames.map((tname) => (
                        <span
                          key={tname}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200 text-[11px] font-semibold"
                        >
                          {tname}
                          <button
                            type="button"
                            onClick={() => setFormTandemNames(formTandemNames.filter((n) => n !== tname))}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Rombel Paralel & Estimasi Mahasiswa */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">
                      Rombongan Belajar Paralel &amp; Estimasi Mahasiswa
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      Batas minimum kuota kelas adalah {MIN_CLASS_QUOTA} mahasiswa per rombel.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddFormClass}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Kelas
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {formClasses.map((cls, idx) => {
                    const isLow = cls.capacity > 0 && cls.capacity < MIN_CLASS_QUOTA;
                    return (
                      <div
                        key={cls.id}
                        className={`p-2.5 rounded-lg bg-white border flex flex-col justify-between ${
                          isLow ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-blue-900">
                            Kelas {cls.name.replace(/^Kelas\s+/i, '')}
                          </span>
                          {formClasses.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveFormClass(idx)}
                              className="text-slate-400 hover:text-rose-600 p-0.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-500">Kapasitas:</span>
                          <input
                            type="number"
                            min={1}
                            value={cls.capacity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setFormClasses(
                                formClasses.map((c, i) =>
                                  i === idx ? { ...c, capacity: val, enrolled: val } : c
                                )
                              );
                            }}
                            className="w-16 px-2 py-0.5 text-xs font-bold rounded border border-slate-200 text-center"
                          />
                          <span className="text-[10px] text-slate-500">Mhs</span>
                        </div>
                        {isLow && (
                          <div className="text-[9px] font-bold text-amber-700 mt-1">
                            Di bawah kuota min ({MIN_CLASS_QUOTA})
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="text-[11px] text-slate-600 pt-1 flex justify-between font-semibold">
                  <span>Total Rombel: {formClasses.length} Kelas</span>
                  <span>
                    Total Mahasiswa: {formClasses.reduce((sum, c) => sum + c.capacity, 0)} Mahasiswa
                  </span>
                </div>
              </div>

              {/* Preferensi Hari & Sesi Waktu */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Preferensi Hari Perkuliahan
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map((day) => {
                      const checked = formPreferredDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                            checked
                              ? 'bg-[#082c78] text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3 text-blue-200" />}
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Preferensi Sesi Waktu
                    </label>
                    <select
                      value={formTimeSlot}
                      onChange={(e) => setFormTimeSlot(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="Sesi Pagi">Sesi Pagi (07:30 - 11:40 WIB)</option>
                      <option value="Sesi Siang">Sesi Siang (13:30 - 16:10 WIB)</option>
                      <option value="Sesi Sore">Sesi Sore (16:20 - 18:00 WIB)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Catatan / Batasan Khusus
                    </label>
                    <input
                      type="text"
                      value={formSpecialNote}
                      onChange={(e) => setFormSpecialNote(e.target.value)}
                      placeholder="Misal: Perlu Lab PC spesifikasi GPU / Dosen pagi"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formAvoidFriday}
                      onChange={(e) => setFormAvoidFriday(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="text-slate-700 font-medium">Hindari Jumat Siang</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formMaxOneSession}
                      onChange={(e) => setFormMaxOneSession(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span className="text-slate-700 font-medium">Maksimal 1 Sesi per Hari</span>
                  </label>
                </div>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSavingAction}
                  onClick={() => void handleSaveCourse(true)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  {isSavingAction ? 'Menyimpan...' : 'Simpan sebagai Draf'}
                </button>
                <button
                  type="button"
                  disabled={isSavingAction}
                  onClick={() => void handleSaveCourse(false)}
                  className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-[#082c78] hover:bg-[#0c3999] shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {isSavingAction ? 'Menyimpan...' : 'Simpan & Ajukan Mata Kuliah'}
                </button>
              </div>
            </div>
          )}

          {/* VIEW: RIWAYAT PERUBAHAN */}
          {view === 'riwayat' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      Riwayat Perubahan Kebutuhan &amp; Pembatalan Kelas
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Catatan penambahan rombel, penyesuaian kuota/SKS, dan pembatalan kelas pada sesi ini.
                    </p>
                  </div>
                </div>
              </div>

              {dbLogs.length === 0 && deptLogs.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  Belum ada perubahan kelas yang tercatat di database.
                </div>
              ) : dbLogs.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {dbLogs.map((log) => (
                    <div key={log.id_perubahan} className="py-3 flex items-start justify-between gap-4 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.jenis_aksi.includes('BATAL') || log.jenis_aksi.includes('HAPUS')
                                ? 'bg-rose-100 text-rose-800'
                                : log.jenis_aksi.includes('TAMBAH') || log.jenis_aksi.includes('PULIH')
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {log.jenis_aksi}
                          </span>
                          <span className="font-bold text-slate-800">
                            {log.kode_mk}{log.kode_kelas ? `-${log.kode_kelas}` : ''}
                          </span>
                          <span className="text-[10px] text-slate-400">oleh {log.actor_name}</span>
                        </div>
                        {(log.nilai_lama || log.nilai_baru) && (
                          <div className="text-slate-600">
                            {log.nilai_lama ? `${log.nilai_lama} → ` : ''}
                            {log.nilai_baru || ''}
                          </div>
                        )}
                        {log.alasan && (
                          <div className="text-[11px] text-slate-500 italic">Alasan: {log.alasan}</div>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 shrink-0">
                        {log.waktu_perubahan.replace('T', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {deptLogs.map((log) => (
                    <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.action === 'Batalkan'
                                ? 'bg-rose-100 text-rose-800'
                                : log.action === 'Tambah'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {log.action}
                          </span>
                          <span className="font-bold text-slate-800">{log.target}</span>
                        </div>
                        <div className="text-slate-600">{log.detail}</div>
                        {log.reason && (
                          <div className="text-[11px] text-slate-500 italic">Alasan: {log.reason}</div>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 shrink-0">
                        {log.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW: PEDOMAN & ATURAN PRODI */}
          {view === 'pedoman' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Aturan Khusus &amp; Ketentuan Departemen
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ketentuan penjadwalan prodi yang dijadikan acuan dalam penyusunan jadwal otomatis.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200">
                <div className="flex items-center gap-2 font-bold text-xs text-blue-950 mb-2">
                  <Building className="w-4 h-4 text-blue-700" />
                  <span>
                    Departemen {activeDept} ({deptMeta.code}) — {deptMeta.docNo}
                  </span>
                </div>
                <ul className="space-y-2 text-xs text-slate-700 list-disc pl-5 leading-relaxed">
                  {deptMeta.rules.map((rule, idx) => (
                    <li key={idx}>{rule}</li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Aturan Wajib Anti-Bentrok
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Setiap kelas wajib pada angkatan yang sama dijamin bebas bentrok waktu, dan kapasitas ruang dipastikan mencukupi jumlah mahasiswa terdaftar.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Kuota Minimum Pembukaan Kelas
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Kelas dengan estimasi peserta di bawah {MIN_CLASS_QUOTA} mahasiswa ditandai agar dapat digabung atau dibatalkan sebelum jadwal disusun.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* MODAL KELOLA ROMBEL (Connected DB Mode) */}
          {syncedManagingGroup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      Kelola Kelas: [{syncedManagingGroup.code}] {syncedManagingGroup.name}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Semester {syncedManagingGroup.semester} • {syncedManagingGroup.sks} SKS • {syncedManagingGroup.roomTypeNeeded}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setManagingGroup(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* List existing classes */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {syncedManagingGroup.classes.map((cl) => {
                    const isLow = cl.requires_room && cl.enrolled_count < MIN_CLASS_QUOTA;
                    const isEditing = editingClassItem?.id === cl.id;
                    return (
                      <div
                        key={cl.id}
                        className={`p-3 rounded-xl border text-xs space-y-2 ${
                          isLow ? 'bg-amber-50/50 border-amber-300' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-900">Kelas {cl.class_label}</span>
                              <span className="text-slate-600 font-semibold">
                                {cl.enrolled_count} Mhs
                              </span>
                              {isLow && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                                  &lt; {MIN_CLASS_QUOTA} Mhs
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Dosen: {cl.lecturer_names.join(', ')}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (isEditing) {
                                  setEditingClassItem(null);
                                } else {
                                  setEditingClassItem(cl);
                                  setEditClassForm({
                                    enrolled_count: cl.enrolled_count,
                                    sks: cl.sks,
                                    room_type_needed: cl.room_type_needed,
                                  });
                                }
                              }}
                              className="px-2 py-1 rounded text-[10px] font-bold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50"
                            >
                              {isEditing ? 'Tutup' : 'Ubah'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCancelTargetClass(cl);
                                setCancelReason(
                                  isLow
                                    ? `Peserta (${cl.enrolled_count} mhs) di bawah kuota minimum (${MIN_CLASS_QUOTA})`
                                    : 'Dibatalkan oleh departemen'
                                );
                              }}
                              className="px-2 py-1 rounded text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200"
                            >
                              Batalkan
                            </button>
                          </div>
                        </div>

                        {isEditing && (
                          <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-2 items-end">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                Kuota Mhs
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={editClassForm.enrolled_count ?? cl.enrolled_count}
                                onChange={(e) =>
                                  setEditClassForm({
                                    ...editClassForm,
                                    enrolled_count: parseInt(e.target.value) || 1,
                                  })
                                }
                                className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                SKS
                              </label>
                              <select
                                value={editClassForm.sks ?? cl.sks}
                                onChange={(e) =>
                                  setEditClassForm({
                                    ...editClassForm,
                                    sks: parseInt(e.target.value) || 2,
                                  })
                                }
                                className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
                              >
                                {[1, 2, 3, 4].map((s) => (
                                  <option key={s} value={s}>{s} SKS</option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              disabled={isSavingAction}
                              onClick={() => void handleSaveClassEdit()}
                              className="py-1.5 px-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded text-[11px] disabled:opacity-50"
                            >
                              Simpan
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add new rombel to this MK */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="text-[11px] font-bold text-slate-700">
                    Tambah Rombel Paralel Baru:
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={newRombelLabel}
                      onChange={(e) => setNewRombelLabel(e.target.value)}
                      placeholder="Label (mis. C)"
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                    />
                    <input
                      type="number"
                      min={1}
                      value={newRombelQuota}
                      onChange={(e) => setNewRombelQuota(parseInt(e.target.value) || 0)}
                      placeholder="Kuota Mhs"
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                    />
                    <button
                      type="button"
                      disabled={isSavingAction}
                      onClick={() => void handleAddRombelToGroup()}
                      className="py-1.5 bg-[#082c78] hover:bg-[#0c3999] text-white text-xs font-bold rounded-lg shadow-xs disabled:opacity-50"
                    >
                      + Tambah
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODAL KONFIRMASI PEMBATALAN KELAS DENGAN ALASAN */}
          {cancelTargetClass && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-rose-200 p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      Konfirmasi Pembatalan Kelas {cancelTargetClass.id}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {cancelTargetClass.name} ({cancelTargetClass.enrolled_count} Mahasiswa). Kelas yang dibatalkan tidak akan ikut dijadwalkan.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alasan Pembatalan <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-rose-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCancelTargetClass(null)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isSavingAction || !cancelReason.trim()}
                    onClick={() => void handleConfirmCancelClass()}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50"
                  >
                    Ya, Batalkan Kelas
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Fallback Class Management Modal (Offline Mode) */}
          {classActionCourse && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-xs text-slate-900">
                      Kelola Rombel: [{classActionCourse.code}] {classActionCourse.name}
                    </h3>
                    <p className="text-[10px] text-slate-500">Penyesuaian &amp; Pembatalan Kelas</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setClassActionCourse(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-700">Daftar Rombel Saat Ini:</div>
                  {classActionCourse.classes.map((cl) => (
                    <div
                      key={cl.id}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-blue-900">{cl.name}</span>
                        <span className="text-slate-500 text-[11px] ml-2">{cl.capacity} Mahasiswa</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          cancelClassOffering(
                            classActionCourse.id,
                            cl.id,
                            'Pembatalan oleh departemen: kuota minimum tidak terpenuhi'
                          );
                          setClassActionCourse(null);
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200"
                      >
                        Batalkan Kelas
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="text-[11px] font-bold text-slate-700">Tambah Rombel Paralel Baru:</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      placeholder="Nama Kelas (mis. Kelas D)"
                      className="px-2.5 py-1 text-xs rounded-lg border border-slate-300"
                    />
                    <input
                      type="number"
                      value={newClassCapacity}
                      onChange={(e) => setNewClassCapacity(parseInt(e.target.value) || 0)}
                      placeholder="Kapasitas Mhs"
                      className="px-2.5 py-1 text-xs rounded-lg border border-slate-300"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      addClassToCourse(classActionCourse.id, newClassName, newClassCapacity);
                      setClassActionCourse(null);
                    }}
                    className="w-full py-1.5 bg-[#082c78] hover:bg-[#0c3999] text-white text-xs font-bold rounded-lg shadow-xs"
                  >
                    + Simpan Rombel Tambahan
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
