import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Building2, Search, Check, RefreshCw, AlertCircle, Calendar, Clock, Users } from 'lucide-react';
import { Room } from '../types';

export const RoomReplacementModal: React.FC = () => {
  const {
    isRoomReplacementModalOpen,
    setIsRoomReplacementModalOpen,
    rooms,
    schedule,
    reassignRoomSchedule,
    showToast,
  } = useApp();

  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(schedule[0]?.id || '');
  const [selectedTargetRoomId, setSelectedTargetRoomId] = useState<string>('');
  const [isPermanent, setIsPermanent] = useState<boolean>(true);
  const [filterDept, setFilterDept] = useState<string>('all');
  const [capacityMin, setCapacityMin] = useState<number>(30);

  if (!isRoomReplacementModalOpen) return null;

  const currentSelectedSchedule = schedule.find(s => s.id === selectedScheduleId);

  // Filter available rooms
  const candidateRooms = rooms.filter(r => {
    if (r.status === 'Pemeliharaan Berkala') return false;
    if (r.capacity < capacityMin) return false;
    if (filterDept !== 'all') {
      if (filterDept === 'other') {
        // Ruang alternatif prodi lain (F-18)
        return r.priorityDepartment !== currentSelectedSchedule?.department;
      } else {
        return r.priorityDepartment === filterDept;
      }
    }
    return true;
  });

  const handleApply = () => {
    if (!selectedScheduleId || !selectedTargetRoomId) {
      showToast('Pilih jadwal kelas dan ruangan target pengganti terlebih dahulu.', 'warning');
      return;
    }
    reassignRoomSchedule(selectedScheduleId, selectedTargetRoomId, isPermanent);
    setIsRoomReplacementModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 rounded-lg text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Pencarian & Penetapan Ruang Pengganti</h3>
              <p className="text-xs text-slate-300">Manajemen Ruang • Sesuai PRD F-17 & F-18 (Peminjaman Ruang Alternatif Lintas Prodi)</p>
            </div>
          </div>
          <button
            onClick={() => setIsRoomReplacementModalOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Step 1: Pilih Kelas yang Membutuhkan Relokasi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pilih Kelas Terjadwal yang Ingin Dipindahkan (F-17)
            </label>
            <select
              value={selectedScheduleId}
              onChange={(e) => setSelectedScheduleId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:outline-hidden bg-white"
            >
              {schedule.map(s => (
                <option key={s.id} value={s.id}>
                  [{s.courseCode}] {s.courseName} - {s.classLabel} ({s.day}, {s.timeLabel}) — Saat ini di: {s.roomName}
                </option>
              ))}
            </select>
          </div>

          {currentSelectedSchedule && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  {currentSelectedSchedule.day}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  {currentSelectedSchedule.timeLabel}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  {currentSelectedSchedule.studentCount} Mahasiswa
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-200/60 font-semibold text-[11px]">
                {currentSelectedSchedule.department}
              </span>
            </div>
          )}

          {/* Opsi Jenis Penggantian */}
          <div className="grid grid-cols-2 gap-3">
            <label className={`p-3 rounded-xl border cursor-pointer transition-all ${
              isPermanent ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold' : 'border-slate-200 bg-white text-slate-700'
            }`}>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="replacementType"
                  checked={isPermanent}
                  onChange={() => setIsPermanent(true)}
                  className="text-blue-600"
                />
                <span className="text-xs">Permanen (Sisa Semester)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 pl-5">Perbarui jadwal permanen pada seluruh minggu ke depan.</p>
            </label>

            <label className={`p-3 rounded-xl border cursor-pointer transition-all ${
              !isPermanent ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold' : 'border-slate-200 bg-white text-slate-700'
            }`}>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="replacementType"
                  checked={!isPermanent}
                  onChange={() => setIsPermanent(false)}
                  className="text-blue-600"
                />
                <span className="text-xs">Sementara (Pertemuan Ini)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 pl-5">Hanya berlaku untuk tanggal insidental perkuliahan pengganti.</p>
            </label>
          </div>

          {/* Filter Ruang Alternatif */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-800">
                Pilih Ruangan Kosong yang Memenuhi Syarat
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="text-xs px-2.5 py-1 rounded-md border border-slate-300 bg-white focus:outline-hidden"
                >
                  <option value="all">Semua Ruang</option>
                  <option value="Sistem Informasi">Ruang SI</option>
                  <option value="Informatika">Ruang IF</option>
                  <option value="Teknik Komputer">Ruang TK</option>
                  <option value="other">⭐ Ruang Alternatif Prodi Lain (F-18)</option>
                </select>
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <span>Min:</span>
                  <input
                    type="number"
                    value={capacityMin}
                    onChange={(e) => setCapacityMin(parseInt(e.target.value) || 0)}
                    className="w-14 px-1.5 py-1 text-xs rounded border border-slate-300"
                  />
                  <span>Kursi</span>
                </div>
              </div>
            </div>

            {/* Candidate room list */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {candidateRooms.map(room => {
                const isSelected = selectedTargetRoomId === room.id;
                const isOtherProdi = room.priorityDepartment !== currentSelectedSchedule?.department;

                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedTargetRoomId(room.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{room.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600 font-medium">
                          {room.building} Lt. {room.floor}
                        </span>
                        {isOtherProdi && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-purple-100 text-purple-700 font-semibold">
                            Milik: {room.priorityDepartment}
                          </span>
                        )}
                        {room.isAccessible && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-700 font-medium">
                            Akses Difabel
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Kapasitas: <span className="font-semibold text-slate-700">{room.capacity} Kursi</span> • Fasilitas: {room.facilities.slice(0, 3).join(', ')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-slate-300" />
                      )}
                    </div>
                  </div>
                );
              })}

              {candidateRooms.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Tidak ditemukan ruangan kosong yang memenuhi batas kapasitas.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setIsRoomReplacementModalOpen(false)}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!selectedTargetRoomId}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all ${
              selectedTargetRoomId ? 'bg-blue-600 hover:bg-blue-700 shadow-sm cursor-pointer' : 'bg-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            <Check className="w-4 h-4" />
            Tetapkan Ruang Pengganti
          </button>
        </div>
      </div>
    </div>
  );
};

