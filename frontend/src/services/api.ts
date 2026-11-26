/**
 * Layanan Komunikasi API Backend SIPRAMA FTI UNAND (MySQL + Google OR-Tools CP-SAT).
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (data && typeof data.detail === 'string') return data.detail;
    if (data && data.detail && typeof data.detail.message === 'string') return data.detail.message;
  } catch {
    // ignore
  }
  return `${fallback}: ${res.statusText}`;
}

export interface BackendCourseItem {
  id_mk: number;
  kode_mk: string;
  nama_mk: string;
  sks: number;
  sks_teori?: number;
  sks_praktik?: number;
  semester_paket: number;
  jenis_mk: string;
  lintas_prodi: boolean;
  kode_prodi: string;
  nama_prodi: string;
}

export interface BackendClassItem {
  id: string;
  course_code: string;
  department: string; // 'TK' | 'SI' | 'IF'
  semester: number;
  name: string;
  class_label: string;
  sks: number;
  sks_teori?: number;
  sks_praktik?: number;
  enrolled_count: number;
  enrolled_is_estimated: boolean;
  room_type_needed: string;
  is_mandatory: boolean;
  is_elective: boolean;
  rombel_key: string;
  requires_room: boolean;
  requires_accessibility: boolean;
  is_transition_course: boolean;
  lecturer_ids: string[];
  lecturer_names: string[];
  status_kelas?: string;
  alasan_pembatalan?: string | null;
  preferensi_hari?: string[];
  preferensi_waktu?: string | null;
  catatan_khusus?: string | null;
  below_min_quota?: boolean;
}

export interface AdjustClassPayload {
  name?: string;
  class_label?: string;
  sks?: number;
  enrolled_count?: number;
  room_type_needed?: string;
  rombel_key?: string;
  requires_room?: boolean;
  lecturer_names?: string[];
  lecturer_ids?: string[];
  reason?: string;
  actor_email?: string;
}

export interface BackendLecturer {
  id: string;
  id_dosen: number | null;
  nidn: string;
  name: string;
  email: string;
  department: string;
  jabatan_struktural: string;
  maks_sks_harian: number;
}

export interface CreateOfferingPayload {
  course_code: string;
  name: string;
  department: string;
  semester: number;
  sks: number;
  sks_teori?: number;
  sks_praktik?: number;
  is_mandatory?: boolean;
  requires_room?: boolean;
  room_type_needed?: string;
  primary_lecturer_name: string;
  tandem_lecturer_names?: string[];
  classes: { class_label: string; enrolled_count: number }[];
  preferred_days?: string[];
  preferred_time_slot?: string;
  avoid_friday?: boolean;
  special_note?: string;
  as_draft?: boolean;
  update_existing?: boolean;
  actor_email?: string;
}

export interface CreateOfferingResponse {
  message: string;
  course_code: string;
  created_classes: BackendClassItem[];
  warnings: string[];
}

export interface DepartemenLogItem {
  id_perubahan: number;
  kode_prodi: string;
  kode_mk: string;
  kode_kelas?: string | null;
  jenis_aksi: string;
  nilai_lama?: string | null;
  nilai_baru?: string | null;
  alasan?: string | null;
  actor_name: string;
  actor_email?: string;
  waktu_perubahan: string;
}

export interface DepartemenStatusResponse {
  department: string;
  status_pengajuan: string;
  waktu_pengajuan?: string | null;
  catatan?: string | null;
  kuota_minimum_kelas: number;
  total_active_classes: number;
  below_quota_count: number;
}

export interface ActiveSemesterInfo {
  id_semester: number;
  tahun_ajaran: string;
  jenis_semester: string;
  semester_label: string;
  kuota_minimum_kelas: number;
}

export interface BackendRoom {
  id: string;
  db_ruang_id?: number;
  code?: string;
  name: string;
  raw_name?: string;
  building?: string;
  gedung_code?: string;
  capacity: number;
  room_type: string;
  floor: number;
  department?: string;
  features: string[];
}

export interface RoomPayload {
  code?: string;
  name?: string;
  building?: string;
  floor?: number;
  capacity?: number;
  kode_prodi?: string;
}

export interface BackendSlot {
  id: string;
  index: number;
  day: string;
  daily_index: number;
  time_label: string;
}

export interface ScheduledClassResult {
  class_id: string;
  course_code: string;
  course_name: string;
  class_label: string;
  department: string;
  semester: number;
  size: number;
  duration: number;
  sks?: number;
  room_id: string;
  room_name: string;
  room_capacity: number;
  room_type: string;
  floor: number;
  building?: string;
  day: string;
  start_slot_index: number;
  end_slot_index: number;
  start_time: string;
  end_time: string;
  slot_ids: string[];
  lecturer_names: string[];
  group_names: string[];
  jadwal_id?: number;
  db_kelas_id?: number;
  db_ruang_id?: number;
}

export interface SolverResultResponse {
  status: 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'MODEL_INVALID' | 'UNKNOWN';
  wall_time_seconds: number;
  total_classes: number;
  scheduled_classes: number;
  penalty_breakdown: {
    gap_penalty: number;
    pref_penalty: number;
    spread_penalty: number;
    waste_penalty: number;
    total_weighted_penalty: number;
  };
  schedule: ScheduledClassResult[];
  diagnostics?: {
    total_demand_slot_hours: number;
    total_room_slot_hours: number;
    utilization_percentage: number;
    is_capacity_sufficient: boolean;
    unassigned_classes: string[];
    conflict_notes: string[];
  };
  version_id?: number;
  version_number?: number;
  tahap?: string;
  status_versi?: string;
  approval_status?: 'Menunggu Persetujuan' | 'Disetujui' | 'Revisi' | 'Resmi';
  revision_note?: string;
  semester_label?: string;
}

export interface GenerateScheduleParams {
  department?: string;
  max_classes?: number;
  w_gap?: number;
  w_pref?: number;
  w_spread?: number;
  w_waste?: number;
  max_time_seconds?: number;
  num_workers?: number;
}

export interface WorkflowResponse {
  message: string;
  version_id: number;
  version_number: number;
  tahap: string;
  status_versi: string;
  approval_status: 'Menunggu Persetujuan' | 'Disetujui' | 'Revisi' | 'Resmi';
  revision_note?: string;
}

export interface ValidationScheduleBrief {
  item_id: number | string;
  jadwal_id?: number;
  course_code: string;
  course_name: string;
  class_label: string;
  department: string;
  day: string;
  start_time: string;
  end_time: string;
  room_id: string;
  room_name: string;
  room_capacity: number;
  building: string;
  student_count: number;
  lecturer_names: string[];
  sks: number;
}

export interface ValidationSuggestion {
  action_type: 'move' | 'swap';
  target_item_id: number | string;
  target_jadwal_id?: number;
  course_name: string;
  class_label: string;
  day: string;
  start_time: string;
  end_time: string;
  room_id: string;
  room_name: string;
  room_capacity: number;
  label: string;
}

export interface ValidationIssueDTO {
  id: string;
  conflict_id: number;
  jenis_bentrok: string;
  type_label: string;
  severity: 'hard' | 'soft';
  title: string;
  description: string;
  recommendation: string;
  status_bentrok: string;
  is_resolved: boolean;
  can_ignore: boolean;
  item_1: ValidationScheduleBrief | null;
  item_2: ValidationScheduleBrief | null;
  suggestions: ValidationSuggestion[];
}

export interface ValidationReportResponse {
  version_id: number | null;
  version_number: number | null;
  tahap: string | null;
  status_versi: string | null;
  approval_status: string;
  semester_label: string;
  message?: string;
  fixed_count?: number;
  summary: {
    total_active_classes: number;
    scheduled_classes: number;
    unassigned_count: number;
    hard_conflicts_count: number;
    soft_warnings_count: number;
    unresolved_total: number;
    resolved_count: number;
    total_penalty: number;
    compliance_pct: number;
  };
  issues: ValidationIssueDTO[];
}

export const apiService = {
  async checkHealth(): Promise<{ status: string; engine: string; database?: string; total_classes: number; total_rooms: number }> {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    if (!res.ok) throw new Error(await parseError(res, 'Health check failed'));
    return res.json();
  },

  async getCourses(): Promise<BackendCourseItem[]> {
    const res = await fetch(`${API_BASE_URL}/api/courses`);
    if (!res.ok) throw new Error(await parseError(res, 'Gagal memuat daftar mata kuliah'));
    return res.json();
  },

  async getClasses(filters?: {
    department?: string;
    semester?: number;
    search?: string;
    room_type?: string;
    include_cancelled?: boolean;
  }): Promise<BackendClassItem[]> {
    const query = new URLSearchParams();
    if (filters?.department) query.append('department', filters.department);
    if (filters?.semester) query.append('semester', filters.semester.toString());
    if (filters?.search) query.append('search', filters.search);
    if (filters?.room_type) query.append('room_type', filters.room_type);
    if (filters?.include_cancelled) query.append('include_cancelled', 'true');

    const url = `${API_BASE_URL}/api/classes${query.toString() ? '?' + query.toString() : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(await parseError(res, 'Gagal memuat daftar kelas'));
    return res.json();
  },

  async getActiveSemester(): Promise<ActiveSemesterInfo> {
    const res = await fetch(`${API_BASE_URL}/api/semester/active`);
    if (!res.ok) throw new Error(await parseError(res, 'Gagal memuat info semester'));
    return res.json();
  },

  async getLecturers(department?: string): Promise<BackendLecturer[]> {
    const query = department ? `?department=${encodeURIComponent(department)}` : '';
    const res = await fetch(`${API_BASE_URL}/api/lecturers${query}`);
    if (!res.ok) throw new Error(await parseError(res, 'Gagal memuat daftar dosen'));
    return res.json();
  },

  async createOffering(payload: CreateOfferingPayload): Promise<CreateOfferingResponse> {
    const res = await fetch(`${API_BASE_URL}/api/departemen/offerings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await parseError(res, 'Gagal menyimpan usulan mata kuliah'));
    return res.json();
  },

  async cancelClassSoft(classId: string, reason: string, actorEmail?: string): Promise<BackendClassItem> {
    const res = await fetch(`${API_BASE_URL}/api/classes/${encodeURIComponent(classId)}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, actor_email: actorEmail }),
    });
    if (!res.ok) throw new Error(await parseError(res, 'Gagal membatalkan kelas'));
    return res.json();
  },

  async restoreClass(classId: string, actorEmail?: string): Promise<BackendClassItem> {
    const res = await fetch(`${API_BASE_URL}/api/classes/${encodeURIComponent(classId)}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor_email: actorEmail }),
    });
    if (!res.ok) throw new Error(await parseError(res, 'Gagal memulihkan kelas'));
    return res.json();
  },

  async adjustRombels(
    courseCode: string,
    payload: { target_count: number; default_capacity?: number; reason?: string; actor_email?: string }
  ): Promise<{ message: string; course_code: string; classes: BackendClassItem[] }> {
    const res = await fetch(
      `${API_BASE_URL}/api/departemen/offerings/${encodeURIComponent(courseCode)}/adjust-rombels`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) throw new Error(await parseError(res, 'Gagal menyesuaikan jumlah rombel'));
    return res.json();
  },

  async getBelowQuotaClasses(department?: string): Promise<{
    kuota_minimum_kelas: number;
    total_below_quota: number;
    classes: BackendClassItem[];
  }> {
    const query = department ? `?department=${encodeURIComponent(department)}` : '';
    const res = await fetch(`${API_BASE_URL}/api/classes/below-quota${query}`);
    if (!res.ok) throw new Error(await parseError(res, 'Gagal memeriksa kuota minimum'));
    return res.json();
  },

  async getDepartemenLogs(department?: string, limit = 50): Promise<DepartemenLogItem[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (department) params.append('department', department);
    const res = await fetch(`${API_BASE_URL}/api/departemen/logs?${params.toString()}`);
    if (!res.ok) throw new Error(await parseError(res, 'Gagal memuat riwayat perubahan'));
    return res.json();
  },

  async getDepartemenStatus(department: string): Promise<DepartemenStatusResponse> {
    const res = await fetch(`${API_BASE_URL}/api/departemen/status?department=${encodeURIComponent(department)}`);
    if (!res.ok) throw new Error(await parseError(res, 'Gagal memuat status pengajuan'));
    return res.json();
  },

  async submitDepartemen(
    department: string,
    actorEmail?: string,
    catatan?: string
  ): Promise<DepartemenStatusResponse> {
    const res = await fetch(`${API_BASE_URL}/api/departemen/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ department, actor_email: actorEmail, catatan }),
    });
    if (!res.ok) throw new Error(await parseError(res, 'Gagal mengajukan kebutuhan ke fakultas'));
    return res.json();
  },

  async downloadExportFile(format: 'excel' | 'pdf' | 'csv', department?: string, includeCancelled = false): Promise<void> {
    const endpoint =
      format === 'excel'
        ? '/api/classes/export-excel'
        : format === 'pdf'
        ? '/api/classes/export-pdf'
        : '/api/classes/export-csv';
    const params = new URLSearchParams();
    if (department) params.append('department', department);
    if (includeCancelled && format !== 'csv') params.append('include_cancelled', 'true');
    const url = `${API_BASE_URL}${endpoint}${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(await parseError(res, 'Gagal mengunduh dokumen ekspor'));
    const blob = await res.blob();
    const disp = res.headers.get('content-disposition') || '';
    const match = disp.match(/filename="?([^"]+)"?/i);
    const ext = format === 'excel' ? 'xlsx' : format;
    const filename = match ? match[1] : `kebutuhan_${(department || 'all').toLowerCase()}.${ext}`;
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objUrl);
  },

  async adjustClass(classId: string, payload: AdjustClassPayload): Promise<BackendClassItem> {
    const res = await fetch(`${API_BASE_URL}/api/classes/${encodeURIComponent(classId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await parseError(res, 'Gagal memperbarui kelas'));
    return res.json();
  },

  async deleteClass(classId: string): Promise<{ message: string; class_id: string }> {
    const res = await fetch(`${API_BASE_URL}/api/classes/${encodeURIComponent(classId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(await parseError(res, 'Gagal menghapus kelas'));
    return res.json();
  },

  async addClass(classItem: BackendClassItem): Promise<BackendClassItem> {
    const res = await fetch(`${API_BASE_URL}/api/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(classItem),
    });
    if (!res.ok) throw new Error(await parseError(res, 'Gagal menambah kelas'));
    return res.json();
  },

  async resetClassesToCSV(): Promise<{ message: string; total_classes: number }> {
    const res = await fetch(`${API_BASE_URL}/api/classes/reset-csv`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(await parseError(res, 'Gagal sinkronisasi ulang dari CSV'));
    return res.json();
  },

  async getRooms(): Promise<BackendRoom[]> {
    const res = await fetch(`${API_BASE_URL}/api/rooms`);
    if (!res.ok) throw new Error(await parseError(res, 'Gagal memuat data ruang'));
    return res.json();
  },

  async createRoom(payload: RoomPayload): Promise<BackendRoom> {
    const res = await fetch(`${API_BASE_URL}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await parseError(res, 'Gagal menambah ruang'));
    return res.json();
  },

  async updateRoom(roomId: string, payload: RoomPayload): Promise<BackendRoom> {
    const res = await fetch(`${API_BASE_URL}/api/rooms/${encodeURIComponent(roomId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await parseError(res, 'Gagal memperbarui ruang'));
    return res.json();
  },

  async deleteRoom(roomId: string): Promise<{ message: string; room_id: string }> {
    const res = await fetch(`${API_BASE_URL}/api/rooms/${encodeURIComponent(roomId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(await parseError(res, 'Gagal menghapus ruang'));
    return res.json();
  },

  async getSlots(): Promise<BackendSlot[]> {
    const res = await fetch(`${API_BASE_URL}/api/slots`);
    if (!res.ok) throw new Error(await parseError(res, 'Gagal memuat slot waktu'));
    return res.json();
  },

  async generateScheduleCPSAT(params: GenerateScheduleParams = {}): Promise<SolverResultResponse> {
    const res = await fetch(`${API_BASE_URL}/api/schedule/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(await parseError(res, 'Gagal menjalankan solver CP-SAT'));
    return res.json();
  },

  async getLatestSchedule(): Promise<SolverResultResponse | null> {
    const res = await fetch(`${API_BASE_URL}/api/schedule/latest`);
    if (!res.ok) throw new Error(await parseError(res, 'Gagal memuat jadwal terbaru'));
    return res.json();
  },

  async submitScheduleToWadek(versionId?: number): Promise<WorkflowResponse> {
    const res = await fetch(`${API_BASE_URL}/api/schedule/submit-wadek`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version_id: versionId ?? null }),
    });
    if (!res.ok) throw new Error(await parseError(res, 'Gagal mengirim draf ke Wadek I'));
    return res.json();
  },

  async sendWadekDecision(approved: boolean, note = '', versionId?: number): Promise<WorkflowResponse> {
    const res = await fetch(`${API_BASE_URL}/api/schedule/wadek-decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved, note, version_id: versionId ?? null }),
    });
    if (!res.ok) throw new Error(await parseError(res, 'Gagal menyimpan keputusan Wadek I'));
    return res.json();
  },

  async publishSchedule(versionId?: number): Promise<WorkflowResponse> {
    const res = await fetch(`${API_BASE_URL}/api/schedule/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version_id: versionId ?? null }),
    });
    if (!res.ok) throw new Error(await parseError(res, 'Gagal menerbitkan jadwal resmi'));
    return res.json();
  },

  async updateScheduleItem(
    jadwalId: number | string,
    payload: {
      day?: string;
      start_time?: string;
      end_time?: string;
      room_id?: number | string;
      sks?: number;
      reason?: string;
      actor_role?: string;
      actor_email?: string;
    }
  ): Promise<{
    message: string;
    jadwal_id: number | string;
    day?: string;
    start_time?: string;
    end_time?: string;
    room_id?: number | string;
    room_name?: string;
  }> {
    const res = await fetch(`${API_BASE_URL}/api/schedule/items/${jadwalId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await parseError(res, 'Gagal memperbarui slot jadwal'));
    return res.json();
  },

  async swapScheduleItems(payload: {
    jadwal_id_a: number | string;
    jadwal_id_b: number | string;
    a_sks?: number;
    reason?: string;
    actor_role?: string;
    actor_email?: string;
  }): Promise<{
    message: string;
    a: { day: string; start_time: string; end_time: string; room_id: string | number; room_name: string };
    b: { day: string; start_time: string; end_time: string; room_id: string | number; room_name: string };
  }> {
    const res = await fetch(`${API_BASE_URL}/api/schedule/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await parseError(res, 'Gagal menukar posisi dua jadwal'));
    return res.json();
  },

  async getValidationReport(rescan = false, versionId?: number): Promise<ValidationReportResponse> {
    const query = versionId ? `?version_id=${versionId}` : '';
    const url = rescan
      ? `${API_BASE_URL}/api/schedule/validation/scan${query}`
      : `${API_BASE_URL}/api/schedule/validation${query}`;
    const res = await fetch(url, { method: rescan ? 'POST' : 'GET' });
    if (!res.ok) throw new Error(await parseError(res, 'Gagal memuat hasil validasi bentrok'));
    return res.json();
  },

  async resolveValidationIssue(
    conflictId: number | string,
    payload: { decision?: string; actor_role?: string; actor_email?: string }
  ): Promise<ValidationReportResponse> {
    const res = await fetch(`${API_BASE_URL}/api/schedule/validation/${conflictId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await parseError(res, 'Gagal menandai peringatan selesai'));
    return res.json();
  },

  async autoFixValidationConflicts(payload: {
    version_id?: number;
    actor_role?: string;
    actor_email?: string;
  }): Promise<ValidationReportResponse> {
    const res = await fetch(`${API_BASE_URL}/api/schedule/validation/auto-fix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await parseError(res, 'Gagal menjalankan perbaikan otomatis'));
    return res.json();
  },
};
