/**
 * Layanan Komunikasi API Backend SIPRAMA FTI UNAND (Google OR-Tools CP-SAT).
 * Tanpa Database & Tanpa Algoritma Genetika.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export interface BackendClassItem {
  id: string;
  course_code: string;
  department: string; // 'TK' | 'SI' | 'IF'
  semester: number;
  name: string;
  class_label: string;
  sks: number;
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
}

export interface BackendRoom {
  id: string;
  name: string;
  capacity: number;
  room_type: string;
  floor: number;
  features: string[];
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
  day: string;
  start_slot_index: number;
  end_slot_index: number;
  start_time: string;
  end_time: string;
  slot_ids: string[];
  lecturer_names: string[];
  group_names: string[];
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

export const apiService = {
  async checkHealth(): Promise<{ status: string; engine: string; total_classes: number }> {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  },

  async getClasses(filters?: {
    department?: string;
    semester?: number;
    search?: string;
    room_type?: string;
  }): Promise<BackendClassItem[]> {
    const query = new URLSearchParams();
    if (filters?.department) query.append('department', filters.department);
    if (filters?.semester) query.append('semester', filters.semester.toString());
    if (filters?.search) query.append('search', filters.search);
    if (filters?.room_type) query.append('room_type', filters.room_type);

    const url = `${API_BASE_URL}/api/classes${query.toString() ? '?' + query.toString() : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch classes: ${res.statusText}`);
    return res.json();
  },

  async adjustClass(classId: string, payload: AdjustClassPayload): Promise<BackendClassItem> {
    const res = await fetch(`${API_BASE_URL}/api/classes/${encodeURIComponent(classId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Failed to adjust class: ${res.statusText}`);
    return res.json();
  },

  async deleteClass(classId: string): Promise<{ message: string; class_id: string }> {
    const res = await fetch(`${API_BASE_URL}/api/classes/${encodeURIComponent(classId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to delete class: ${res.statusText}`);
    return res.json();
  },

  async addClass(classItem: BackendClassItem): Promise<BackendClassItem> {
    const res = await fetch(`${API_BASE_URL}/api/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(classItem),
    });
    if (!res.ok) throw new Error(`Failed to add class: ${res.statusText}`);
    return res.json();
  },

  async resetClassesToCSV(): Promise<{ message: string; total_classes: number }> {
    const res = await fetch(`${API_BASE_URL}/api/classes/reset-csv`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`Failed to reset classes: ${res.statusText}`);
    return res.json();
  },

  async getRooms(): Promise<BackendRoom[]> {
    const res = await fetch(`${API_BASE_URL}/api/rooms`);
    if (!res.ok) throw new Error(`Failed to fetch rooms: ${res.statusText}`);
    return res.json();
  },

  async getSlots(): Promise<BackendSlot[]> {
    const res = await fetch(`${API_BASE_URL}/api/slots`);
    if (!res.ok) throw new Error(`Failed to fetch slots: ${res.statusText}`);
    return res.json();
  },

  async generateScheduleCPSAT(params: GenerateScheduleParams = {}): Promise<SolverResultResponse> {
    const res = await fetch(`${API_BASE_URL}/api/schedule/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`Failed to generate schedule: ${res.statusText}`);
    return res.json();
  },

  async getLatestSchedule(): Promise<SolverResultResponse | null> {
    const res = await fetch(`${API_BASE_URL}/api/schedule/latest`);
    if (!res.ok) throw new Error(`Failed to fetch latest schedule: ${res.statusText}`);
    return res.json();
  },
};
