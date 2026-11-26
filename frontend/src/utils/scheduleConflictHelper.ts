import { Room, ScheduleItem } from '../types';
import {
  CAMPUS_SESSION_SLOTS,
  calculateEndTime,
  resolveDepartment,
} from './departmentHelper';

export type ConflictCategory = 'ROOM' | 'LECTURER' | 'ROMBEL' | 'CAPACITY';

export interface ScheduleConflictEntry {
  scheduleId: string;
  jadwalId?: number;
  courseCode: string;
  courseName: string;
  classLabel: string;
  department: string;
  day: string;
  startTime: string;
  endTime: string;
  roomId: string;
  roomName: string;
  lecturerNames: string[];
  studentCount: number;
  categories: ConflictCategory[];
  categoryLabels: string[];
  reasons: string[];
  opponent: ScheduleItem;
}

export interface MoveConflictEvaluation {
  isValid: boolean;
  hasCapacityIssue: boolean;
  capacityMessage: string | null;
  conflicts: ScheduleConflictEntry[];
  uniqueOpponents: ScheduleItem[];
  singleOpponent: ScheduleItem | null;
}

export interface SwapEndpointView {
  item: ScheduleItem;
  dayLabel: string;
  startTime: string;
  endTime: string;
  roomCode: string;
  roomName: string;
  building: string;
  capacity: number;
}

export interface SwapEvaluation {
  isSafe: boolean;
  blockingReasons: string[];
  aBefore: SwapEndpointView;
  aAfter: SwapEndpointView;
  bBefore: SwapEndpointView;
  bAfter: SwapEndpointView;
  aDuration: number;
  bDuration: number;
}

export interface SafeSlotSuggestion {
  id: string;
  day: string; // Title case e.g. 'Selasa'
  dayUpper: 'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT';
  sessionIndex: number;
  startTime: string;
  endTime: string;
  roomId: string;
  roomCode: string;
  roomName: string;
  roomCapacity: number;
  building: string;
  kind: 'same_time_room' | 'same_room_time' | 'next_available';
  summaryLabel: string;
}

export interface RoomAvailabilityOption {
  room: Room;
  status: 'free' | 'occupied' | 'small_capacity';
  occupant?: ScheduleItem;
  labelSuffix: string;
}

const DAY_UPPER_TO_TITLE: Record<string, string> = {
  SENIN: 'Senin',
  SELASA: 'Selasa',
  RABU: 'Rabu',
  KAMIS: 'Kamis',
  JUMAT: 'Jumat',
};

export const WEEKDAYS_TITLE = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'] as const;

export function normalizeDayTitle(day?: string): string {
  const key = (day || 'SENIN').trim().toUpperCase();
  return DAY_UPPER_TO_TITLE[key] || 'Senin';
}

export function normalizeDayUpper(
  day?: string
): 'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT' {
  const key = (day || 'SENIN').trim().toUpperCase();
  if (key === 'SELASA' || key === 'RABU' || key === 'KAMIS' || key === 'JUMAT') {
    return key;
  }
  return 'SENIN';
}

export function parseTimeMinutes(timeStr?: string): number {
  const clean = (timeStr || '07:30').split(' - ')[0].trim();
  const [hStr, mStr] = clean.split(':');
  const h = Number.parseInt(hStr || '7', 10);
  const m = Number.parseInt(mStr || '30', 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return 7 * 60 + 30;
  return h * 60 + m;
}

export function minutesToTimeStr(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function timeRangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return Math.max(startA, startB) < Math.min(endA, endB);
}

export function extractStartAndEnd(item: ScheduleItem): {
  startTime: string;
  endTime: string;
  startMin: number;
  endMin: number;
} {
  const raw = (item.timeLabel || item.time || '').trim();
  const parts = raw.split(' - ').map((s) => s.trim()).filter(Boolean);
  const startTime = parts[0] || '07:30';
  const endTime = parts[1] || calculateEndTime(startTime, item.sks || 2);
  return {
    startTime,
    endTime,
    startMin: parseTimeMinutes(startTime),
    endMin: parseTimeMinutes(endTime),
  };
}

export function matchSessionIndex(startTime: string, fallback = 1): number {
  const clean = startTime.trim();
  const exact = CAMPUS_SESSION_SLOTS.find((s) => s.startTime === clean);
  if (exact) return exact.id;
  const minVal = parseTimeMinutes(clean);
  let bestId = fallback;
  let bestDiff = 9999;
  for (const slot of CAMPUS_SESSION_SLOTS) {
    const diff = Math.abs(parseTimeMinutes(slot.startTime) - minVal);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestId = slot.id;
    }
  }
  return bestId;
}

export function isPlaceholderLecturer(name: string): boolean {
  const n = (name || '').trim().toLowerCase();
  if (!n) return true;
  return (
    n.startsWith('dosen pengampu') ||
    n.startsWith('dosen mkwu') ||
    n === 'tim dosen' ||
    n === 'tba' ||
    n === '-'
  );
}

export function getRealLecturers(item: ScheduleItem): string[] {
  const list: string[] = [];
  if (item.lecturerNames && item.lecturerNames.length > 0) {
    list.push(...item.lecturerNames);
  } else {
    if (item.primaryLecturer) list.push(item.primaryLecturer);
    if (item.tandemLecturers) list.push(...item.tandemLecturers);
    if (item.lecturerName && list.length === 0) {
      list.push(...item.lecturerName.split(','));
    }
  }
  return Array.from(
    new Set(
      list
        .map((n) => n.trim())
        .filter((n) => !isPlaceholderLecturer(n))
    )
  );
}

export function getDisplayLecturers(item: ScheduleItem): string {
  const real = getRealLecturers(item);
  if (real.length > 0) return real.join(', ');
  return item.primaryLecturer || item.lecturerName || 'Dosen Pengampu';
}

export function getItemRombelKey(item: ScheduleItem): string {
  if (item.rombelKey && item.rombelKey.trim()) return item.rombelKey.trim();
  if (item.semester && item.classLabel) {
    const dept = resolveDepartment(item.department, item.courseCode);
    return `${dept}-S${item.semester}-${item.classLabel}`;
  }
  return '';
}

export function resolveRoomForScheduleItem(
  item: ScheduleItem,
  rooms: Room[]
): { room: Room | null; id: string; code: string; name: string; capacity: number; building: string } {
  const dbIdStr = item.dbRuangId !== undefined ? String(item.dbRuangId) : '';
  const rIdStr = item.roomId !== undefined ? String(item.roomId) : '';
  const rName = (item.roomName || '').trim();
  const rCodeGuess = rName.split('(')[0].trim();

  const matched =
    rooms.find(
      (r) =>
        (dbIdStr && String(r.id) === dbIdStr) ||
        (rIdStr && (String(r.id) === rIdStr || r.code === rIdStr)) ||
        (rCodeGuess && (r.code === rCodeGuess || r.name === rCodeGuess)) ||
        (rName && r.name === rName)
    ) || null;

  return {
    room: matched,
    id: matched ? String(matched.id) : rIdStr || dbIdStr || rCodeGuess,
    code: matched ? matched.code : rCodeGuess || rName || 'Ruang',
    name: matched ? matched.name : rName || 'Ruang Kuliah',
    capacity: matched ? matched.capacity : item.capacity || 50,
    building: matched ? matched.building : item.building || 'Gedung FTI',
  };
}

function sameRoom(
  roomAId: string,
  roomACode: string,
  itemB: ScheduleItem,
  rooms: Room[]
): boolean {
  const resolvedB = resolveRoomForScheduleItem(itemB, rooms);
  if (roomAId && resolvedB.id && String(roomAId) === String(resolvedB.id)) return true;
  if (roomACode && resolvedB.code && roomACode.toLowerCase() === resolvedB.code.toLowerCase()) {
    return true;
  }
  return false;
}

const CATEGORY_LABELS: Record<ConflictCategory, string> = {
  ROOM: 'Ruang Sudah Dipakai',
  LECTURER: 'Dosen Sedang Mengajar',
  ROMBEL: 'Jadwal Mahasiswa Bentrok',
  CAPACITY: 'Kapasitas Ruang Kurang',
};

export function evaluateManualMove(
  target: ScheduleItem,
  proposed: {
    day: string;
    startTime: string;
    endTime: string;
    room: Room | null;
    roomId?: string;
    roomCode?: string;
    roomName?: string;
    roomCapacity?: number;
  },
  allSchedule: ScheduleItem[],
  rooms: Room[],
  ignoreIds: Set<string> = new Set()
): MoveConflictEvaluation {
  const normDay = normalizeDayTitle(proposed.day);
  const startMin = parseTimeMinutes(proposed.startTime);
  const endMin = parseTimeMinutes(proposed.endTime);

  const fallbackRoom = resolveRoomForScheduleItem(target, rooms);
  const targetRoomId = String(proposed.room?.id ?? proposed.roomId ?? fallbackRoom.id);
  const targetRoomCode = proposed.room?.code ?? proposed.roomCode ?? fallbackRoom.code;
  const targetRoomName = proposed.room?.name ?? proposed.roomName ?? fallbackRoom.name;
  const targetRoomCapacity =
    proposed.room?.capacity ?? proposed.roomCapacity ?? fallbackRoom.capacity ?? 0;

  let hasCapacityIssue = false;
  let capacityMessage: string | null = null;
  if (targetRoomCapacity > 0 && target.studentCount > targetRoomCapacity) {
    hasCapacityIssue = true;
    capacityMessage = `Ruang ${targetRoomCode} berkapasitas ${targetRoomCapacity} kursi, tidak cukup untuk ${target.studentCount} mahasiswa.`;
  }

  const targetLecturers = getRealLecturers(target).map((l) => l.toLowerCase());
  const targetRombel = getItemRombelKey(target);

  const conflicts: ScheduleConflictEntry[] = [];
  const ignored = new Set<string>(ignoreIds);
  ignored.add(target.id);

  for (const other of allSchedule) {
    if (ignored.has(other.id)) continue;
    if (normalizeDayTitle(other.day) !== normDay) continue;

    const otherTiming = extractStartAndEnd(other);
    if (!timeRangesOverlap(startMin, endMin, otherTiming.startMin, otherTiming.endMin)) {
      continue;
    }

    const categories: ConflictCategory[] = [];
    const reasons: string[] = [];
    const resolvedOtherRoom = resolveRoomForScheduleItem(other, rooms);

    if (sameRoom(targetRoomId, targetRoomCode, other, rooms)) {
      categories.push('ROOM');
      reasons.push(
        `Ruang ${resolvedOtherRoom.code} pada ${normDay} pukul ${otherTiming.startTime}–${otherTiming.endTime} sedang dipakai kelas ini.`
      );
    }

    const otherLecturers = getRealLecturers(other);
    const sharedLecs = otherLecturers.filter((name) =>
      targetLecturers.includes(name.toLowerCase())
    );
    if (sharedLecs.length > 0) {
      categories.push('LECTURER');
      reasons.push(
        `Dosen (${sharedLecs.join(', ')}) mengajar kelas ini pada jam yang sama.`
      );
    }

    const otherRombel = getItemRombelKey(other);
    if (targetRombel && otherRombel && targetRombel === otherRombel) {
      categories.push('ROMBEL');
      reasons.push(
        `Mahasiswa rombel ${targetRombel} memiliki kelas ini pada jam yang sama.`
      );
    }

    if (categories.length > 0) {
      conflicts.push({
        scheduleId: other.id,
        jadwalId: other.jadwalId,
        courseCode: other.courseCode,
        courseName: other.courseName,
        classLabel: other.classLabel || other.className || 'Kelas A',
        department: resolveDepartment(other.department, other.courseCode),
        day: normDay,
        startTime: otherTiming.startTime,
        endTime: otherTiming.endTime,
        roomId: resolvedOtherRoom.id,
        roomName: resolvedOtherRoom.code,
        lecturerNames: otherLecturers.length > 0 ? otherLecturers : [getDisplayLecturers(other)],
        studentCount: other.studentCount,
        categories,
        categoryLabels: categories.map((c) => CATEGORY_LABELS[c]),
        reasons,
        opponent: other,
      });
    }
  }

  const uniqueOpponents = conflicts.map((c) => c.opponent);
  const singleOpponent = uniqueOpponents.length === 1 ? uniqueOpponents[0] : null;

  return {
    isValid: !hasCapacityIssue && conflicts.length === 0,
    hasCapacityIssue,
    capacityMessage,
    conflicts,
    uniqueOpponents,
    singleOpponent,
  };
}

export function evaluateSwapPair(
  itemA: ScheduleItem,
  itemB: ScheduleItem,
  allSchedule: ScheduleItem[],
  rooms: Room[],
  overrideASks?: number
): SwapEvaluation {
  const timingA = extractStartAndEnd(itemA);
  const timingB = extractStartAndEnd(itemB);
  const roomA = resolveRoomForScheduleItem(itemA, rooms);
  const roomB = resolveRoomForScheduleItem(itemB, rooms);

  const durA = overrideASks ? overrideASks * 50 : Math.max(50, timingA.endMin - timingA.startMin);
  const durB = Math.max(50, timingB.endMin - timingB.startMin);

  const aEndNew = minutesToTimeStr(timingB.startMin + durA);
  const bEndNew = minutesToTimeStr(timingA.startMin + durB);

  const syntheticB: ScheduleItem = {
    ...itemB,
    day: normalizeDayTitle(itemA.day),
    timeLabel: `${timingA.startTime} - ${bEndNew}`,
    time: `${timingA.startTime} - ${bEndNew}`,
    roomId: roomA.id,
    dbRuangId: roomA.room ? Number(roomA.room.id) || itemA.dbRuangId : itemA.dbRuangId,
    roomName: roomA.code,
    capacity: roomA.capacity,
  };

  const syntheticA: ScheduleItem = {
    ...itemA,
    sks: overrideASks || itemA.sks,
    day: normalizeDayTitle(itemB.day),
    timeLabel: `${timingB.startTime} - ${aEndNew}`,
    time: `${timingB.startTime} - ${aEndNew}`,
    roomId: roomB.id,
    dbRuangId: roomB.room ? Number(roomB.room.id) || itemB.dbRuangId : itemB.dbRuangId,
    roomName: roomB.code,
    capacity: roomB.capacity,
  };

  const remaining = allSchedule.filter((s) => s.id !== itemA.id && s.id !== itemB.id);

  const evalA = evaluateManualMove(
    itemA,
    {
      day: itemB.day,
      startTime: timingB.startTime,
      endTime: aEndNew,
      room: roomB.room,
      roomId: roomB.id,
      roomCode: roomB.code,
      roomName: roomB.name,
      roomCapacity: roomB.capacity,
    },
    [...remaining, syntheticB],
    rooms,
    new Set([itemA.id])
  );

  const evalB = evaluateManualMove(
    itemB,
    {
      day: itemA.day,
      startTime: timingA.startTime,
      endTime: bEndNew,
      room: roomA.room,
      roomId: roomA.id,
      roomCode: roomA.code,
      roomName: roomA.name,
      roomCapacity: roomA.capacity,
    },
    [...remaining, syntheticA],
    rooms,
    new Set([itemB.id])
  );

  const blockingReasons: string[] = [];
  if (evalA.hasCapacityIssue && evalA.capacityMessage) {
    blockingReasons.push(evalA.capacityMessage);
  }
  for (const c of evalA.conflicts) {
    blockingReasons.push(
      `${itemA.courseName} di posisi baru masih bentrok dengan ${c.courseName} (${c.classLabel}) — ${c.categoryLabels.join(', ')}.`
    );
  }
  if (evalB.hasCapacityIssue && evalB.capacityMessage) {
    blockingReasons.push(
      `${itemB.courseName} (${itemB.studentCount} mhs) tidak muat di ruang lama ${roomA.code} (kapasitas ${roomA.capacity}).`
    );
  }
  for (const c of evalB.conflicts) {
    blockingReasons.push(
      `Jika dipindah ke jadwal lama Anda, ${itemB.courseName} akan bentrok dengan ${c.courseName} (${c.classLabel}) — ${c.categoryLabels.join(', ')}.`
    );
  }

  return {
    isSafe: evalA.isValid && evalB.isValid,
    blockingReasons: Array.from(new Set(blockingReasons)),
    aBefore: {
      item: itemA,
      dayLabel: normalizeDayTitle(itemA.day),
      startTime: timingA.startTime,
      endTime: timingA.endTime,
      roomCode: roomA.code,
      roomName: roomA.name,
      building: roomA.building,
      capacity: roomA.capacity,
    },
    aAfter: {
      item: itemA,
      dayLabel: normalizeDayTitle(itemB.day),
      startTime: timingB.startTime,
      endTime: aEndNew,
      roomCode: roomB.code,
      roomName: roomB.name,
      building: roomB.building,
      capacity: roomB.capacity,
    },
    bBefore: {
      item: itemB,
      dayLabel: normalizeDayTitle(itemB.day),
      startTime: timingB.startTime,
      endTime: timingB.endTime,
      roomCode: roomB.code,
      roomName: roomB.name,
      building: roomB.building,
      capacity: roomB.capacity,
    },
    bAfter: {
      item: itemB,
      dayLabel: normalizeDayTitle(itemA.day),
      startTime: timingA.startTime,
      endTime: bEndNew,
      roomCode: roomA.code,
      roomName: roomA.name,
      building: roomA.building,
      capacity: roomA.capacity,
    },
    aDuration: durA,
    bDuration: durB,
  };
}

export function getRoomAvailabilityForSlot(
  day: string,
  startTime: string,
  sks: number,
  target: ScheduleItem,
  allSchedule: ScheduleItem[],
  rooms: Room[]
): RoomAvailabilityOption[] {
  const normDay = normalizeDayTitle(day);
  const startMin = parseTimeMinutes(startTime);
  const endMin = parseTimeMinutes(calculateEndTime(startTime, sks));

  return rooms.map((room) => {
    const occupant = allSchedule.find((other) => {
      if (other.id === target.id) return false;
      if (normalizeDayTitle(other.day) !== normDay) return false;
      const ot = extractStartAndEnd(other);
      if (!timeRangesOverlap(startMin, endMin, ot.startMin, ot.endMin)) return false;
      return sameRoom(String(room.id), room.code, other, rooms);
    });

    if (occupant) {
      return {
        room,
        status: 'occupied',
        occupant,
        labelSuffix: `Dipakai: ${occupant.courseName} (${occupant.classLabel || 'A'})`,
      };
    }

    if (room.capacity < target.studentCount) {
      return {
        room,
        status: 'small_capacity',
        labelSuffix: `Kurang kursi (${target.studentCount} mhs > ${room.capacity})`,
      };
    }

    return {
      room,
      status: 'free',
      labelSuffix: 'Kosong & Siap Pakai',
    };
  });
}

export function suggestConflictFreeSlots(
  target: ScheduleItem,
  desiredDay: string,
  desiredStartTime: string,
  sks: number,
  preferredRoom: Room | null,
  allSchedule: ScheduleItem[],
  rooms: Room[],
  maxSuggestions = 4
): SafeSlotSuggestion[] {
  const suggestions: SafeSlotSuggestion[] = [];
  const seenKeys = new Set<string>();
  const normDesiredDay = normalizeDayTitle(desiredDay);

  const tryCandidate = (
    candDay: string,
    slotId: number,
    candStart: string,
    candRoom: Room,
    kind: SafeSlotSuggestion['kind']
  ) => {
    if (suggestions.length >= maxSuggestions) return;
    const candEnd = calculateEndTime(candStart, sks);
    const key = `${candDay}-${candStart}-${candRoom.id}`;
    if (seenKeys.has(key)) return;

    const evalRes = evaluateManualMove(
      target,
      {
        day: candDay,
        startTime: candStart,
        endTime: candEnd,
        room: candRoom,
      },
      allSchedule,
      rooms
    );
    if (!evalRes.isValid) return;

    seenKeys.add(key);
    suggestions.push({
      id: key,
      day: candDay,
      dayUpper: normalizeDayUpper(candDay),
      sessionIndex: slotId,
      startTime: candStart,
      endTime: candEnd,
      roomId: String(candRoom.id),
      roomCode: candRoom.code,
      roomName: candRoom.name,
      roomCapacity: candRoom.capacity,
      building: candRoom.building,
      kind,
      summaryLabel: `${candDay}, ${candStart}–${candEnd} • Ruang ${candRoom.code} (Kap. ${candRoom.capacity})`,
    });
  };

  // 1. Prioritas tertinggi: pindah ke ruang lain yang kosong di hari & jam yang sama
  const sortedRooms = [...rooms].sort((a, b) => a.capacity - b.capacity);
  const desiredSlotIdx = matchSessionIndex(desiredStartTime, 1);
  for (const r of sortedRooms) {
    if (preferredRoom && String(r.id) === String(preferredRoom.id)) continue;
    tryCandidate(normDesiredDay, desiredSlotIdx, desiredStartTime, r, 'same_time_room');
  }

  // 2. Prioritas kedua: jam kosong di hari yang sama pada ruang pilihan (atau ruang lain)
  for (const slot of CAMPUS_SESSION_SLOTS) {
    if (preferredRoom) {
      tryCandidate(normDesiredDay, slot.id, slot.startTime, preferredRoom, 'same_room_time');
    }
  }

  // 3. Prioritas ketiga: hari & sesi lain yang bebas bentrok
  for (const candDay of WEEKDAYS_TITLE) {
    for (const slot of CAMPUS_SESSION_SLOTS) {
      if (preferredRoom) {
        tryCandidate(candDay, slot.id, slot.startTime, preferredRoom, 'next_available');
      }
      for (const r of sortedRooms) {
        if (suggestions.length >= maxSuggestions) break;
        tryCandidate(candDay, slot.id, slot.startTime, r, 'next_available');
      }
      if (suggestions.length >= maxSuggestions) break;
    }
    if (suggestions.length >= maxSuggestions) break;
  }

  return suggestions;
}
