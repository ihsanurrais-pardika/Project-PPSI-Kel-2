import React, { useState, useEffect } from 'react';
import {
  Clock,
  Sliders,
  Sparkles,
  Check,
  X,
  AlertCircle,
  Building,
  Calendar,
  Layers,
  BookOpen,
} from 'lucide-react';
import {
  calculateEndTime,
  STANDARD_SESSION_STARTS,
  CAMPUS_SESSION_SLOTS,
  getSksBadgeStyle,
} from '../utils/departmentHelper';

export interface PenyesuaianSksModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCourse: any | null;
  courses: any[];
  rooms: any[];
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
    }
  ) => void;
}

export const PenyesuaianSksModal: React.FC<PenyesuaianSksModalProps> = ({
  isOpen,
  onClose,
  targetCourse,
  courses,
  rooms,
  onSave,
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [sks, setSks] = useState<number>(3);
  const [startTime, setStartTime] = useState<string>('07:30');
  const [day, setDay] = useState<string>('SENIN');
  const [sessionIndex, setSessionIndex] = useState<number>(1);
  const [roomId, setRoomId] = useState<string>('');

  useEffect(() => {
    if (targetCourse) {
      setSelectedCourseId(targetCourse.id);
      setSks(targetCourse.sks || 2);
      const rawStart = (targetCourse.timeLabel || targetCourse.time || '07:30').split(' - ')[0].trim();
      setStartTime(rawStart || '07:30');
      setDay((targetCourse.day || 'SENIN').toUpperCase());
      setSessionIndex(targetCourse.sessionIndex || 1);
      setRoomId(targetCourse.roomCode || targetCourse.roomId || '');
    } else if (courses.length > 0) {
      const first = courses[0];
      setSelectedCourseId(first.id);
      setSks(first.sks || 2);
      const rawStart = (first.timeLabel || first.time || '07:30').split(' - ')[0].trim();
      setStartTime(rawStart || '07:30');
      setDay((first.day || 'SENIN').toUpperCase());
      setSessionIndex(first.sessionIndex || 1);
      setRoomId(first.roomCode || first.roomId || '');
    }
  }, [targetCourse, courses, isOpen]);

  // Handle ketika user memilih mata kuliah lain dari dropdown
  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    const found = courses.find((c) => c.id === courseId);
    if (found) {
      setSks(found.sks || 2);
      const rawStart = (found.timeLabel || found.time || '07:30').split(' - ')[0].trim();
      setStartTime(rawStart || '07:30');
      setDay((found.day || 'SENIN').toUpperCase());
      setSessionIndex(found.sessionIndex || 1);
      setRoomId(found.roomCode || found.roomId || '');
    }
  };

  // Pilih jam mulai standar dan sinkronkan sessionIndex otomatis
  const handleSelectStartTime = (time: string, sIndex?: number) => {
    setStartTime(time);
    if (sIndex) {
      setSessionIndex(sIndex);
    } else {
      // Map waktu ke sessionIndex terdekat
      const foundSlot = CAMPUS_SESSION_SLOTS.find((s) => s.startTime === time);
      if (foundSlot) setSessionIndex(foundSlot.id);
    }
  };

  if (!isOpen) return null;

  const currentCourse = courses.find((c) => c.id === selectedCourseId) || targetCourse;
  const endTime = calculateEndTime(startTime, sks);
  const durationMinutes = sks * 50;
  const badgeStyle = getSksBadgeStyle(sks);

  const handleApply = () => {
    if (!selectedCourseId) return;
    const selectedRoom = rooms.find((r) => r.code === roomId || r.id === roomId || r.name.includes(roomId));
    onSave(selectedCourseId, {
      sks,
      day,
      sessionIndex,
      startTime,
      endTime,
      roomId: selectedRoom?.id || roomId,
      roomName: selectedRoom?.name || (currentCourse ? currentCourse.roomName : roomId),
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
              <Sliders className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Penyesuaian Jadwal & SKS Fleksibel</h2>
              <p className="text-xs text-blue-200 mt-0.5">
                Standar Kurikulum Akademik FTI UNAND • 1 SKS = 50 Menit Tatap Muka
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Isi Modal */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* 1. Pemilihan Kelas Mata Kuliah */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Pilih Mata Kuliah / Seksi
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.courseCode}] {c.courseName} - {c.classLabel} ({c.department} • {c.sks} SKS • {c.day})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Pemilihan Bobot SKS (1, 2, 3, 4 SKS) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Bobot SKS Perkuliahan
              </label>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                1 SKS = 50 Menit Tatap Muka
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[1, 2, 3, 4].map((sksOpt) => {
                const optStyle = getSksBadgeStyle(sksOpt);
                const isSelected = sks === sksOpt;
                return (
                  <button
                    key={sksOpt}
                    type="button"
                    onClick={() => setSks(sksOpt)}
                    className={`p-3 rounded-2xl border text-left transition-all relative ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-black text-slate-900">{sksOpt} SKS</span>
                      {isSelected && (
                        <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] font-semibold text-blue-700">{optStyle.minutes} Menit</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {sksOpt === 1 ? 'Praktikum/Seminar' : sksOpt === 2 ? 'Teori Standar' : sksOpt === 3 ? 'Teori + Praktik' : 'Studio/Intensif'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Jam Mulai Perkuliahan & Preset Sesi Kampus */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Jam Mulai Perkuliahan (Preset Sesi Standar Kampus)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2.5">
              {CAMPUS_SESSION_SLOTS.map((slot) => {
                const isSelected = startTime === slot.startTime;
                const slotEnd = calculateEndTime(slot.startTime, sks);
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => handleSelectStartTime(slot.startTime, slot.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/80 shadow-xs text-blue-900 font-bold'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold">{slot.name}</span>
                      <span className="font-mono text-[10px] text-blue-700">{slot.startTime}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Selesai: <span className="font-semibold text-slate-700">{slotEnd}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Kustom Jam Mulai:</span>
              <input
                type="text"
                placeholder="HH:mm (misal 07:30)"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-600 focus:outline-none w-32"
              />
              <span className="text-xs text-slate-400">WIB</span>
            </div>
          </div>

          {/* 4. Live Calculation Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Hasil Perhitungan Jam Berdasarkan SKS:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-white p-2.5 rounded-xl border border-blue-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Durasi Tatap Muka</div>
                <div className="text-base font-black text-blue-900 mt-0.5">{durationMinutes} Menit</div>
                <div className="text-[10px] text-slate-500">{sks} SKS × 50 menit</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-blue-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Rentang Waktu</div>
                <div className="text-base font-black text-emerald-700 mt-0.5 font-mono">
                  {startTime} - {endTime}
                </div>
                <div className="text-[10px] text-slate-500">Mulai s.d. Selesai</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-blue-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Alokasi Sesi Slot</div>
                <div className="text-base font-black text-indigo-700 mt-0.5">Sesi {sessionIndex}</div>
                <div className="text-[10px] text-slate-500">Slot Hari {day}</div>
              </div>
            </div>
          </div>

          {/* 5. Hari & Ruangan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Hari Perkuliahan
              </label>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
              >
                {['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Ruangan Kuliah
              </label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
              >
                <option value="">Gunakan Ruangan Default</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.code}>
                    {r.name} ({r.code}) - Kapasitas {r.capacity} ({r.building})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-xl transition-all shadow-md shadow-blue-950/20 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Simpan & Terapkan Perubahan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
