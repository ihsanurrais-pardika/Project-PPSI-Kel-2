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
  building: 'Gedung FTI' | 'GKB Bersama';
  floor: number;
  capacity: number;
  areaM2?: number;
  type: 'Teori' | 'Teori Multimedia' | 'Teori Standar' | 'Teori Besar' | 'Lab Software' | 'Lab Hardware & IoT' | 'Studio' | 'Seminar';
  isAccessible: boolean; // Ramah disabilitas (lantai 1 / lift ready)
  status: 'Siap Digunakan' | 'Pemeliharaan Berkala' | 'Sedang Digunakan';
  priorityDepartment: 'Sistem Informasi' | 'Informatika' | 'Teknik Komputer' | 'Fakultas / Bersama';
  facilities: string[];
}

export interface ScheduleItem {
  id: string;
  courseCode: string;
  courseName: string;
  classLabel: string;
  sks: number;
  studentCount: number;
  roomId: string;
  roomName: string;
  building: string;
  floor: number;
  day: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat';
  sessionIndex: number; // 1 to 5
  timeLabel: string; // e.g. "07:30 - 09:10"
  primaryLecturer: string;
  tandemLecturers?: string[];
  isTandem: boolean;
  department: 'Sistem Informasi' | 'Informatika' | 'Teknik Komputer';
  status: 'OK' | 'Tandem' | 'Warning' | 'Bentrok';
  note?: string;
}

export interface ConflictItem {
  id: string;
  type: 'Kapasitas Ruang' | 'Preferensi Jadwal' | 'Jarak / Interval' | 'Bentrok Dosen' | 'Bentrok Rombel';
  severity: 'hard' | 'soft' | 'warning';
  title: string;
  courseCode: string;
  courseName: string;
  classLabel: string;
  lecturerName: string;
  roomName: string;
  day: string;
  timeSlot: string;
  details: string;
  recommendation: string;
  isResolved: boolean;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  activity: string;
  description: string;
  category: 'GA-OPTIMIZER' | 'CP-SAT SOLVER' | 'DEPT-SI' | 'DEPT-IF' | 'DEPT-TK' | 'APPROVAL WADEK' | 'ADMIN';
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

