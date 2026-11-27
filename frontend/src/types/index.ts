export type UserRole = 'admin' | 'wadek1' | 'departemen_si' | 'departemen_if' | 'departemen_tk' | 'dosen' | 'mahasiswa';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  nipOrNim: string;
  department?: string;
  avatar?: string;
}

export type CourseStatus = 'Draft' | 'Submitted' | 'Validated' | 'Need Revision';

export interface ClassRombel {
  id: string;
  name: string; // e.g. "Kelas A"
  capacity: number; // e.g. 40
  enrolled: number;
}

export interface Lecturer {
  id: string;
  nip: string;
  name: string;
  department: string;
  expertise: string;
  maxSks: number;
  currentSks: number;
  isAvailable: boolean;
}

export interface CourseOffering {
  id: string;
  code: string;
  name: string;
  sks: number;
  theorySks: number;
  practiceSks: number;
  department: 'Sistem Informasi' | 'Informatika' | 'Teknik Komputer';
  semester: number;
  curriculum: string; // "Kurikulum OBE 2024"
  isMandatory: boolean;
  totalEnrolledEst: number;
  classes: ClassRombel[];
  primaryLecturer: Lecturer;
  tandemLecturers: Lecturer[];
  preferredDays: string[];
  preferredTimeSlot: 'Sesi Pagi' | 'Sesi Siang' | 'Sesi Sore';
  specialConstraints: string[];
  recommendedRoomType: string;
  status: CourseStatus;
  lastUpdated: string;
}

export interface Room {
  id: string;
  name: string;
  code: string;
  building: 'Gedung FTI' | 'GKB Bersama' | string;
  floor: number;
  capacity: number;
  areaM2?: number;
  wing?: string;
  type: 'Teori' | 'Teori Multimedia' | 'Teori Standar' | 'Teori Besar' | 'Lab Software' | 'Lab Hardware & IoT' | 'Studio' | 'Seminar' | 'Laboratorium' | string;
  isAccessible: boolean; // Ramah disabilitas (lantai 1 / lift ready)
  status: 'Siap Digunakan' | 'Pemeliharaan Berkala' | 'Sedang Digunakan' | 'Tersedia' | 'Pemeliharaan' | string;
  priorityDepartment?: 'Sistem Informasi' | 'Informatika' | 'Teknik Komputer' | 'Fakultas / Bersama' | string;
  facilities: string[];
}

export interface ScheduleItem {
  id: string;
  jadwalId?: number;
  dbRuangId?: number;
  courseCode: string;
  courseName: string;
  classLabel?: string;
  className?: string;
  semester?: number;
  rombelKey?: string;
  sks: number;
  studentCount: number;
  roomId?: string;
  roomName: string;
  building?: string;
  floor?: number;
  capacity?: number;
  day: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | string;
  sessionIndex: number; // 1 to 5
  timeLabel?: string; // e.g. "07:30 - 09:10"
  time?: string;
  primaryLecturer?: string;
  lecturerName?: string;
  lecturerNames?: string[];
  tandemLecturers?: string[];
  isTandem: boolean;
  department: 'Sistem Informasi' | 'Informatika' | 'Teknik Komputer' | 'SI' | 'IF' | 'TK' | string;
  status: 'OK' | 'Tandem' | 'Warning' | 'Bentrok' | string;
  note?: string;
  isManualEdited?: boolean;
  wd1Status?: 'Menunggu Review' | 'Disetujui' | 'Revisi';
  wd1RevisionNote?: string;
}

export interface ConflictItem {
  id: string;
  conflictId?: number | string;
  jenisBentrok?: string;
  statusBentrok?: string;
  canIgnore?: boolean;
  type: 'Bentrok Ruang' | 'Bentrok Dosen' | 'Bentrok Mahasiswa' | 'Kapasitas Ruang' | 'Preferensi Jadwal' | 'Jarak / Interval' | 'Bentrok Rombel' | 'Hard Constraint' | 'Soft Constraint' | string;
  severity: 'hard' | 'soft' | 'warning' | 'Tinggi' | 'Sedang' | 'Rendah' | string;
  title: string;
  courseCode?: string;
  courseName?: string;
  classLabel?: string;
  lecturerName?: string;
  roomName?: string;
  day?: string;
  timeSlot?: string;
  details?: string;
  description?: string;
  recommendation?: string;
  isResolved: boolean;
  department?: string;
  affectedCourses?: string[];
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  activity: string;
  description: string;
  category:
    | 'Optimasi Jadwal'
    | 'Penjadwalan'
    | 'Pengesahan WD1'
    | 'Usulan Prodi'
    | 'Admin'
    | 'GA-OPTIMIZER'
    | 'CP-SAT SOLVER'
    | 'DEPT-SI'
    | 'DEPT-IF'
    | 'DEPT-TK'
    | 'APPROVAL WADEK'
    | 'ADMIN'
    | string;
  actorName: string;
  actorRole: string;
  status: 'success' | 'warning' | 'info';
}

export interface GAParameters {
  populationSize: number;
  crossoverRate: number;
  mutationRate: number;
  maxGenerations: number;
  timeoutSeconds: number;
  randomSeed: number;
}

export interface CPSATParameters {
  wGap: number;
  wPref: number;
  wSpread: number;
  wWaste: number;
  timeoutSeconds: number;
  numWorkers: number;
  linearizationLevel: number;
}

