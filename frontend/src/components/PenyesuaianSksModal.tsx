import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Lock,
  MousePointerClick,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { Room, ScheduleItem } from '../types';
import {
  CAMPUS_SESSION_SLOTS,
  calculateEndTime,
} from '../utils/departmentHelper';
import {
  evaluateManualMove,
  evaluateSwapPair,
  extractStartAndEnd,
  getDisplayLecturers,
  getRoomAvailabilityForSlot,
  matchSessionIndex,
  normalizeDayTitle,
  normalizeDayUpper,
  resolveRoomForScheduleItem,
  SafeSlotSuggestion,
  suggestConflictFreeSlots,
  WEEKDAYS_TITLE,
} from '../utils/scheduleConflictHelper';

export interface PenyesuaianSksModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  targetCourseId: string | null;
  schedule: ScheduleItem[];
  rooms: Room[];
  pickedOpponentId?: string | null;
  isPickingFromGrid?: boolean;
  onTogglePickFromGrid?: (active: boolean) => void;
  onTargetCourseChange?: (scheduleId: string) => void;
  onPreviewOpponentChange?: (scheduleId: string | null) => void;
  onSave: (
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
  onSwap: (
    scheduleIdA: string,
    scheduleIdB: string,
    params?: { aSks?: number; reason?: string }
  ) => Promise<boolean>;
}

type EditorTab = 'move' | 'swap';

export const PenyesuaianSksModal: React.FC<PenyesuaianSksModalProps> = ({
  isOpen,
  onClose,
  isAdmin,
  targetCourseId,
  schedule,
  rooms,
  pickedOpponentId,
  isPickingFromGrid = false,
  onTogglePickFromGrid,
  onTargetCourseChange,
  onPreviewOpponentChange,
  onSave,
  onSwap,
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<EditorTab>('move');

  // Form pindah slot manual
  const [dayTitle, setDayTitle] = useState<string>('Senin');
  const [sks, setSks] = useState<number>(2);
  const [startTime, setStartTime] = useState<string>('07:30');
  const [roomId, setRoomId] = useState<string>('');
  const [showCustomTimeAndSks, setShowCustomTimeAndSks] = useState<boolean>(false);

  // Mode tukar jadwal (tab swap atau penawaran otomatis saat bentrok 1 kelas)
  const [swapOpponentId, setSwapOpponentId] = useState<string>('');
  const [swapSearch, setSwapSearch] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sinkronisasi state awal saat panel dibuka / targetCourseId berubah
  useEffect(() => {
    if (!isOpen) return;
    const initial =
      (targetCourseId && schedule.find((s) => s.id === targetCourseId)) ||
      schedule[0] ||
      null;
    if (!initial) return;

    const timing = extractStartAndEnd(initial);
    const resolvedRoom = resolveRoomForScheduleItem(initial, rooms);
    setSelectedCourseId(initial.id);
    setDayTitle(normalizeDayTitle(initial.day));
    setSks(initial.sks || 2);
    setStartTime(timing.startTime || '07:30');
    setRoomId(resolvedRoom.id);
    setSwapOpponentId('');
    setSwapSearch('');
    setReason('');
    setActiveTab('move');
    setShowCustomTimeAndSks(false);
    onPreviewOpponentChange?.(null);
  }, [isOpen, targetCourseId]);

  // Sinkronisasi saat Admin mengklik kartu kelas lain di grid kalender/tabel
  useEffect(() => {
    if (!isOpen || !pickedOpponentId) return;
    if (pickedOpponentId === selectedCourseId) return;
    setSwapOpponentId(pickedOpponentId);
    setActiveTab('swap');
    onPreviewOpponentChange?.(pickedOpponentId);
    onTogglePickFromGrid?.(false);
  }, [pickedOpponentId, isOpen, selectedCourseId]);

  // Tutup panel dengan tombol Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const currentCourse = useMemo(
    () => schedule.find((c) => c.id === selectedCourseId) || schedule[0] || null,
    [schedule, selectedCourseId]
  );

  const handleSelectCourse = (newId: string) => {
    const found = schedule.find((s) => s.id === newId);
    setSelectedCourseId(newId);
    onTargetCourseChange?.(newId);
    if (found) {
      const timing = extractStartAndEnd(found);
      const resolvedRoom = resolveRoomForScheduleItem(found, rooms);
      setDayTitle(normalizeDayTitle(found.day));
      setSks(found.sks || 2);
      setStartTime(timing.startTime || '07:30');
      setRoomId(resolvedRoom.id);
    }
    setSwapOpponentId('');
    onPreviewOpponentChange?.(null);
  };

  const endTime = useMemo(() => calculateEndTime(startTime, sks), [startTime, sks]);
  const sessionIndex = useMemo(
    () => matchSessionIndex(startTime, currentCourse?.sessionIndex || 1),
    [startTime, currentCourse]
  );

  const selectedRoomObj = useMemo(
    () =>
      rooms.find((r) => String(r.id) === String(roomId) || r.code === roomId) ||
      (currentCourse ? resolveRoomForScheduleItem(currentCourse, rooms).room : null),
    [rooms, roomId, currentCourse]
  );

  // Cek apakah posisi target berbeda dari jadwal awal kelas
  const hasPositionChanged = useMemo(() => {
    if (!currentCourse) return false;
    const origTiming = extractStartAndEnd(currentCourse);
    const origRoom = resolveRoomForScheduleItem(currentCourse, rooms);
    const origDay = normalizeDayTitle(currentCourse.day);
    return (
      origDay !== dayTitle ||
      origTiming.startTime !== startTime ||
      origTiming.endTime !== endTime ||
      String(origRoom.id) !== String(selectedRoomObj?.id ?? roomId) ||
      (currentCourse.sks || 2) !== sks
    );
  }, [currentCourse, rooms, dayTitle, startTime, endTime, selectedRoomObj, roomId, sks]);

  // Ketersediaan seluruh ruang pada Hari + Jam terpilih
  const roomAvailability = useMemo(() => {
    if (!currentCourse) return [];
    return getRoomAvailabilityForSlot(dayTitle, startTime, sks, currentCourse, schedule, rooms);
  }, [dayTitle, startTime, sks, currentCourse, schedule, rooms]);

  // Evaluasi bentrok real-time untuk mode Pindah Manual
  const moveEvaluation = useMemo(() => {
    if (!currentCourse) {
      return {
        isValid: false,
        hasCapacityIssue: false,
        capacityMessage: null,
        conflicts: [],
        uniqueOpponents: [],
        singleOpponent: null,
      };
    }
    const fallbackRoom = resolveRoomForScheduleItem(currentCourse, rooms);
    return evaluateManualMove(
      currentCourse,
      {
        day: dayTitle,
        startTime,
        endTime,
        room: selectedRoomObj,
        roomId: selectedRoomObj ? String(selectedRoomObj.id) : fallbackRoom.id,
        roomCode: selectedRoomObj ? selectedRoomObj.code : fallbackRoom.code,
        roomName: selectedRoomObj ? selectedRoomObj.name : fallbackRoom.name,
        roomCapacity: selectedRoomObj ? selectedRoomObj.capacity : fallbackRoom.capacity,
      },
      schedule,
      rooms
    );
  }, [currentCourse, dayTitle, startTime, endTime, selectedRoomObj, schedule, rooms]);

  // Saran slot bebas bentrok saat terjadi tabrakan
  const safeSuggestions = useMemo(() => {
    if (!currentCourse || moveEvaluation.isValid) return [];
    return suggestConflictFreeSlots(
      currentCourse,
      dayTitle,
      startTime,
      sks,
      selectedRoomObj,
      schedule,
      rooms,
      4
    );
  }, [currentCourse, moveEvaluation.isValid, dayTitle, startTime, sks, selectedRoomObj, schedule, rooms]);

  // Otomatis tawarkan pertukaran jika bentrok hanya 1 kelas dan kapasitas target tidak masalah
  const suggestedSwapEval = useMemo(() => {
    if (!currentCourse || !moveEvaluation.singleOpponent || moveEvaluation.hasCapacityIssue) {
      return null;
    }
    return evaluateSwapPair(
      currentCourse,
      moveEvaluation.singleOpponent,
      schedule,
      rooms,
      sks
    );
  }, [currentCourse, moveEvaluation, schedule, rooms, sks]);

  // Daftar kandidat tukar pada tab "Tukar dengan Kelas Lain"
  const { swapCandidates, safeSwapCount, totalSwapMatches } = useMemo(() => {
    if (!currentCourse || activeTab !== 'swap') {
      return { swapCandidates: [], safeSwapCount: 0, totalSwapMatches: 0 };
    }
    const q = swapSearch.trim().toLowerCase();
    const list = schedule
      .filter((item) => item.id !== currentCourse.id)
      .filter((item) => {
        if (!q) return true;
        const lec = getDisplayLecturers(item).toLowerCase();
        return (
          item.courseName.toLowerCase().includes(q) ||
          item.courseCode.toLowerCase().includes(q) ||
          (item.classLabel || '').toLowerCase().includes(q) ||
          (item.roomName || '').toLowerCase().includes(q) ||
          lec.includes(q) ||
          normalizeDayTitle(item.day).toLowerCase().includes(q)
        );
      })
      .map((cand) => ({
        item: cand,
        eval: evaluateSwapPair(currentCourse, cand, schedule, rooms, sks),
      }));

    // Urutkan yang aman ditukar terlebih dahulu agar mudah dipilih pengguna awam
    list.sort((a, b) => Number(b.eval.isSafe) - Number(a.eval.isSafe));
    const safeTotal = list.filter((x) => x.eval.isSafe).length;
    return {
      swapCandidates: list.slice(0, 40),
      safeSwapCount: safeTotal,
      totalSwapMatches: list.length,
    };
  }, [currentCourse, activeTab, swapSearch, schedule, rooms, sks]);

  const activeSwapOpponent = useMemo(
    () => schedule.find((s) => s.id === swapOpponentId) || null,
    [schedule, swapOpponentId]
  );

  const explicitSwapEval = useMemo(() => {
    if (!currentCourse || !activeSwapOpponent) return null;
    return evaluateSwapPair(currentCourse, activeSwapOpponent, schedule, rooms, sks);
  }, [currentCourse, activeSwapOpponent, schedule, rooms, sks]);

  if (!isOpen || !isAdmin || !currentCourse) return null;

  const origTiming = extractStartAndEnd(currentCourse);
  const origRoom = resolveRoomForScheduleItem(currentCourse, rooms);
  const origDay = normalizeDayTitle(currentCourse.day);
  const durationMinutes = sks * 50;

  const applySuggestion = (sug: SafeSlotSuggestion) => {
    setDayTitle(sug.day);
    setStartTime(sug.startTime);
    setRoomId(sug.roomId);
  };

  const handleConfirmMove = async () => {
    if (!moveEvaluation.isValid || !hasPositionChanged || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const ok = await onSave(currentCourse.id, {
        sks,
        day: normalizeDayUpper(dayTitle),
        sessionIndex,
        startTime,
        endTime,
        roomId: selectedRoomObj ? String(selectedRoomObj.id) : roomId,
        roomName: selectedRoomObj?.code || origRoom.code,
        reason: reason.trim() || undefined,
      });
      if (ok) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSwap = async (opponentId: string, evalResult: typeof explicitSwapEval) => {
    if (!evalResult?.isSafe || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const ok = await onSwap(currentCourse.id, opponentId, {
        aSks: sks !== currentCourse.sks ? sks : undefined,
        reason: reason.trim() || undefined,
      });
      if (ok) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSwapArrowPreview = (evalData: NonNullable<typeof explicitSwapEval>) => (
    <div className="space-y-2.5 text-xs">
      <div className="rounded-xl bg-white border border-slate-200 p-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-slate-900 truncate">
            {evalData.aBefore.item.courseName} ({evalData.aBefore.item.classLabel || 'A'})
          </span>
          <span className="text-[11px] font-semibold text-blue-700 shrink-0">Jadwal Anda</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 tabular-nums">
          <span className="line-through text-slate-400">
            {evalData.aBefore.dayLabel} {evalData.aBefore.startTime} · {evalData.aBefore.roomCode}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            {evalData.aAfter.dayLabel} {evalData.aAfter.startTime}–{evalData.aAfter.endTime} · {evalData.aAfter.roomCode}
          </span>
        </div>
      </div>

      <div className="flex justify-center">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
          <ArrowLeftRight className="w-3 h-3" />
          <span>Bertukar posisi dengan</span>
        </span>
      </div>

      <div className="rounded-xl bg-white border border-slate-200 p-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-slate-900 truncate">
            {evalData.bBefore.item.courseName} ({evalData.bBefore.item.classLabel || 'A'})
          </span>
          <span className="text-[11px] font-semibold text-amber-700 shrink-0">Jadwal Lawan</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 tabular-nums">
          <span className="line-through text-slate-400">
            {evalData.bBefore.dayLabel} {evalData.bBefore.startTime} · {evalData.bBefore.roomCode}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            {evalData.bAfter.dayLabel} {evalData.bAfter.startTime}–{evalData.bAfter.endTime} · {evalData.bAfter.roomCode}
          </span>
        </div>
      </div>

      {evalData.isSafe ? (
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Kedua kelas tetap aman dan bebas bentrok setelah ditukar.</span>
        </div>
      ) : (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>Pertukaran 2 arah tidak bisa dilakukan</span>
          </div>
          <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-rose-700">
            {evalData.blockingReasons.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Backdrop ringan agar tabel/kalender di kiri tetap terlihat; saat mode pilih di kalender, klik tembus ke kiri */}
      <div
        onClick={isPickingFromGrid ? undefined : onClose}
        className={`fixed inset-0 z-40 transition-opacity duration-200 ${
          isPickingFromGrid
            ? 'bg-slate-900/10 pointer-events-none'
            : 'bg-slate-900/25 backdrop-blur-[1px]'
        }`}
        aria-hidden="true"
      />

      {/* Banner pemandu saat memilih kelas lawan dari grid kiri */}
      {isPickingFromGrid && (
        <div className="fixed top-4 left-4 right-4 lg:right-[530px] z-50 flex items-center justify-between gap-3 bg-blue-950 text-white px-4 py-3 rounded-2xl shadow-lg border border-blue-800">
          <div className="flex items-center gap-2.5 text-xs">
            <MousePointerClick className="w-4 h-4 text-blue-300 shrink-0" />
            <span>
              <strong>Klik salah satu kartu kelas</strong> di kalender atau tabel untuk langsung menguji pertukaran dengan{' '}
              <strong>{currentCourse.courseName}</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onTogglePickFromGrid?.(false)}
            className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-bold transition-colors shrink-0"
          >
            Selesai Memilih
          </button>
        </div>
      )}

      {/* Right Slide-Over Panel */}
      <aside
        role="dialog"
        aria-modal="false"
        aria-label="Ubah atau Tukar Jadwal Admin"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-[500px] bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Header Bersih */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3 bg-white">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-slate-900 leading-tight">
              Ubah atau Tukar Jadwal
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {currentCourse.courseName} · {currentCourse.classLabel || 'Kelas A'} ({currentCourse.courseCode})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel edit jadwal"
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ringkasan Jadwal Asal (1 strip bersih, tanpa nested card) */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <select
              value={currentCourse.id}
              onChange={(e) => handleSelectCourse(e.target.value)}
              aria-label="Pilih kelas yang ingin diubah"
              className="w-full px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {schedule.map((item) => {
                const t = extractStartAndEnd(item);
                const rm = resolveRoomForScheduleItem(item, rooms);
                return (
                  <option key={item.id} value={item.id}>
                    {item.courseName} ({item.classLabel || 'A'}) — {normalizeDayTitle(item.day)} {t.startTime} · {rm.code}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 tabular-nums">
            <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
              <Calendar className="w-3.5 h-3.5 text-blue-700" />
              {origDay}, {origTiming.startTime}–{origTiming.endTime}
            </span>
            <span className="inline-flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {origRoom.code} (Kap. {origRoom.capacity})
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              {currentCourse.studentCount} Mhs
            </span>
            <span className="text-slate-500 truncate max-w-full">
              Dosen: <strong className="text-slate-700 font-semibold">{getDisplayLecturers(currentCourse)}</strong>
            </span>
          </div>
        </div>

        {/* Mode Switcher Sederhana */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-100 bg-white">
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('move');
                onTogglePickFromGrid?.(false);
                onPreviewOpponentChange?.(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'move'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pindah Hari / Ruang</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('swap');
                if (swapOpponentId) onPreviewOpponentChange?.(swapOpponentId);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'swap'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Tukar dengan Kelas Lain</span>
            </button>
          </div>
        </div>

        {/* Konten Scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {activeTab === 'move' ? (
            <>
              {/* Pilihan Hari: tombol cepat tanpa dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Hari tujuan
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {WEEKDAYS_TITLE.map((d) => {
                    const active = dayTitle === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDayTitle(d)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                          active
                            ? 'bg-[#082c78] text-white border-[#082c78] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pilihan Jam Mulai */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className="text-xs font-bold text-slate-700">
                    Jam mulai & durasi
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCustomTimeAndSks((v) => !v)}
                    className="text-[11px] font-semibold text-blue-700 hover:underline"
                  >
                    {showCustomTimeAndSks ? 'Sembunyikan jam/SKS kustom' : 'Atur jam atau SKS manual'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {CAMPUS_SESSION_SLOTS.map((slot) => {
                    const isSelected = startTime === slot.startTime;
                    const slotEnd = calculateEndTime(slot.startTime, sks);
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setStartTime(slot.startTime)}
                        className={`p-2.5 rounded-xl border text-left transition-all active:scale-[0.98] tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                          isSelected
                            ? 'bg-blue-50 border-blue-700 text-blue-950 ring-1 ring-blue-700/20'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-xs font-extrabold">{slot.startTime}</div>
                        <div className="text-[11px] text-slate-500">s.d. {slotEnd}</div>
                      </button>
                    );
                  })}
                </div>

                {showCustomTimeAndSks && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Jam mulai kustom
                      </label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value || '07:30')}
                        className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Bobot SKS ({durationMinutes} mnt)
                      </label>
                      <div className="grid grid-cols-4 gap-1">
                        {[1, 2, 3, 4].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setSks(val)}
                            className={`py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                              sks === val
                                ? 'bg-[#082c78] text-white border-[#082c78]'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <p className="mt-2 text-[11px] text-slate-500 tabular-nums">
                  Waktu dipilih:{' '}
                  <strong className="text-slate-800">
                    {dayTitle}, {startTime} – {endTime} WIB
                  </strong>{' '}
                  ({sks} SKS · {durationMinutes} menit)
                </p>
              </div>

              {/* Pilihan Ruang dengan Status Kosong / Dipakai Langsung */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label htmlFor="select-manual-room" className="text-xs font-bold text-slate-700">
                    Ruang kuliah tujuan
                  </label>
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    Butuh minimal {currentCourse.studentCount} kursi
                  </span>
                </div>
                <select
                  id="select-manual-room"
                  value={selectedRoomObj ? String(selectedRoomObj.id) : roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {roomAvailability.map(({ room, status, labelSuffix }) => (
                    <option key={room.id} value={String(room.id)}>
                      {status === 'free' ? '[Kosong] ' : status === 'occupied' ? '[Terpakai] ' : '[Kecil] '}
                      {room.code} (Kap. {room.capacity} · {room.building}) — {labelSuffix}
                    </option>
                  ))}
                </select>
              </div>

              {/* Zona Notifikasi Cek Bentrok Real-Time */}
              {!hasPositionChanged ? (
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-800">Jadwal masih sama dengan posisi awal</p>
                    <p className="mt-0.5 text-slate-500">
                      Pilih hari, jam, atau ruangan lain di atas untuk memeriksa apakah slot tersedia atau perlu ditukar.
                    </p>
                  </div>
                </div>
              ) : moveEvaluation.isValid ? (
                <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200 p-4 text-xs text-emerald-900 flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-emerald-950">Jadwal bebas bentrok dan siap disimpan</p>
                    <p className="mt-1 text-emerald-800">
                      Ruang {selectedRoomObj?.code || origRoom.code}, dosen pengampu, serta jadwal rombel mahasiswa tidak bertabrakan pada waktu ini.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-rose-50/80 border border-rose-200 p-4 space-y-3.5">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-extrabold text-rose-950">
                        Jadwal bentrok — belum bisa langsung disimpan
                      </p>
                      <p className="text-rose-800 mt-0.5">
                        Aturan mewajibkan jadwal bebas bentrok. Tukar posisi dengan kelas di bawah ini atau pilih slot kosong alternatif.
                      </p>
                    </div>
                  </div>

                  {moveEvaluation.capacityMessage && (
                    <div className="rounded-xl bg-white border border-rose-200 p-3 text-xs text-rose-800 font-semibold">
                      {moveEvaluation.capacityMessage}
                    </div>
                  )}

                  {moveEvaluation.conflicts.map((conf) => (
                    <div
                      key={conf.scheduleId}
                      className="rounded-xl bg-white border border-rose-200 p-3 space-y-1.5 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-slate-900">
                          {conf.courseName} ({conf.classLabel})
                        </span>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {conf.categoryLabels.map((lbl) => (
                            <span
                              key={lbl}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800"
                            >
                              {lbl}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-600 tabular-nums">
                        {conf.day}, {conf.startTime}–{conf.endTime} · Ruang {conf.roomName} · {conf.lecturerNames.join(', ')}
                      </div>
                      <p className="text-[11px] text-rose-700">{conf.reasons[0]}</p>
                    </div>
                  ))}

                  {/* Penawaran Tukar Jadwal Otomatis bila hanya bentrok 1 kelas */}
                  {suggestedSwapEval && moveEvaluation.singleOpponent && (
                    <div className="pt-2 border-t border-rose-200/80 space-y-2.5">
                      <p className="text-xs font-extrabold text-slate-900">
                        Mau tukar posisi dengan kelas tersebut?
                      </p>
                      {renderSwapArrowPreview(suggestedSwapEval)}
                    </div>
                  )}

                  {/* Rekomendasi Slot Kosong Terdekat */}
                  {safeSuggestions.length > 0 && (
                    <div className="pt-2 border-t border-rose-200/80 space-y-2">
                      <p className="text-xs font-bold text-slate-800">
                        Atau pakai salah satu slot kosong yang langsung aman:
                      </p>
                      <div className="space-y-1.5">
                        {safeSuggestions.map((sug) => (
                          <button
                            key={sug.id}
                            type="button"
                            onClick={() => applySuggestion(sug)}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-left flex items-center justify-between gap-2 transition-all text-xs"
                          >
                            <span className="font-semibold text-slate-800 tabular-nums">
                              {sug.summaryLabel}
                            </span>
                            <span className="text-[11px] font-bold text-blue-700 shrink-0">
                              Gunakan
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* TAB 2: TUKAR LANGSUNG DENGAN KELAS LAIN */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari nama mata kuliah, dosen, hari, atau ruang..."
                    value={swapSearch}
                    onChange={(e) => setSwapSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                {onTogglePickFromGrid && (
                  <button
                    type="button"
                    onClick={() => onTogglePickFromGrid(!isPickingFromGrid)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border inline-flex items-center justify-center gap-1.5 transition-colors shrink-0 ${
                      isPickingFromGrid
                        ? 'bg-blue-900 text-white border-blue-900'
                        : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    <MousePointerClick className="w-3.5 h-3.5" />
                    <span>{isPickingFromGrid ? 'Klik Kartu di Kiri...' : 'Pilih dari Jadwal'}</span>
                  </button>
                )}
              </div>

              {explicitSwapEval && activeSwapOpponent && (
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-slate-900">
                      Pratinjau Pertukaran Jadwal
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSwapOpponentId('');
                        onPreviewOpponentChange?.(null);
                      }}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Ganti kelas lawan
                    </button>
                  </div>
                  {renderSwapArrowPreview(explicitSwapEval)}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs font-bold text-slate-700">
                    Pilih kelas lawan tukar ({swapCandidates.length} dari {totalSwapMatches})
                  </p>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full tabular-nums">
                    {safeSwapCount} aman ditukar
                  </span>
                </div>
                <div className="space-y-1.5 max-h-[290px] overflow-y-auto pr-1">
                  {swapCandidates.map(({ item, eval: candEval }) => {
                    const isSelected = swapOpponentId === item.id;
                    const t = extractStartAndEnd(item);
                    const rm = resolveRoomForScheduleItem(item, rooms);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSwapOpponentId(item.id);
                          onPreviewOpponentChange?.(item.id);
                        }}
                        className={`w-full p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-2.5 ${
                          isSelected
                            ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-600/20'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {item.courseName} ({item.classLabel || 'A'})
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5 tabular-nums">
                            {normalizeDayTitle(item.day)} {t.startTime}–{t.endTime} · Ruang {rm.code} · {item.studentCount} Mhs
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {getDisplayLecturers(item)}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            candEval.isSafe
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {candEval.isSafe ? 'Aman Ditukar' : 'Ada Bentrok'}
                        </span>
                      </button>
                    );
                  })}
                  {swapCandidates.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                      Tidak ada kelas yang cocok dengan kata kunci pencarian.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Catatan / Alasan Perubahan Opsional */}
          <div>
            <label htmlFor="manual-change-reason" className="block text-xs font-bold text-slate-700 mb-1.5">
              Catatan perubahan (opsional)
            </label>
            <input
              id="manual-change-reason"
              type="text"
              placeholder="Misal: Penyesuaian ruang proyektor atau permintaan dosen"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Sticky Footer Aksi Utama */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Batal
          </button>

          {activeTab === 'move' ? (
            suggestedSwapEval?.isSafe && moveEvaluation.singleOpponent ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleConfirmSwap(moveEvaluation.singleOpponent!.id, suggestedSwapEval)}
                className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-[#082c78] hover:bg-blue-900 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>{isSubmitting ? 'Menukar Jadwal...' : 'Tukar Kedua Jadwal Ini'}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={!moveEvaluation.isValid || !hasPositionChanged || isSubmitting}
                onClick={handleConfirmMove}
                className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-[#082c78] hover:bg-blue-900 disabled:bg-slate-200 disabled:text-slate-700 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
              >
                {!hasPositionChanged ? (
                  <span>Pilih Perubahan Terlebih Dahulu</span>
                ) : !moveEvaluation.isValid ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Selesaikan Bentrok Dulu</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Jadwal Baru'}</span>
                  </>
                )}
              </button>
            )
          ) : (
            <button
              type="button"
              disabled={!explicitSwapEval?.isSafe || !activeSwapOpponent || isSubmitting}
              onClick={() => activeSwapOpponent && handleConfirmSwap(activeSwapOpponent.id, explicitSwapEval)}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-[#082c78] hover:bg-blue-900 disabled:bg-slate-200 disabled:text-slate-700 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>
                {!activeSwapOpponent
                  ? 'Pilih Kelas Lawan Terlebih Dahulu'
                  : !explicitSwapEval?.isSafe
                    ? 'Pertukaran Memicu Bentrok'
                    : isSubmitting
                      ? 'Menukar Jadwal...'
                      : 'Tukar Kedua Jadwal Ini'}
              </span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
