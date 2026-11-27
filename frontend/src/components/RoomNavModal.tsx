import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, MapPin, Compass, Navigation, Accessibility, Layers, Info, CheckCircle2 } from 'lucide-react';

export const RoomNavModal: React.FC = () => {
  const { isRoomNavModalOpen, setIsRoomNavModalOpen, selectedRoomForNav, rooms } = useApp();
  const [activeFloorTab, setActiveFloorTab] = useState<number>(selectedRoomForNav?.floor || 1);

  if (!isRoomNavModalOpen || !selectedRoomForNav) return null;

  const currentFloorRooms = rooms.filter(r => r.floor === activeFloorTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
              <Compass className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">Peta Denah & Navigasi Ruang Perkuliahan</h3>
                <span className="text-[11px] bg-blue-500/40 text-blue-100 px-2 py-0.5 rounded-full font-medium">
                  {selectedRoomForNav.building}
                </span>
              </div>
              <p className="text-xs text-blue-100">Portal Informasi Akademik FTI Unand • Sesuai PRD F-21 & UC-21</p>
            </div>
          </div>
          <button
            onClick={() => setIsRoomNavModalOpen(false)}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Target Room Highlights */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                {selectedRoomForNav.name.split(' ')[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-slate-800 text-base">{selectedRoomForNav.name}</h4>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {selectedRoomForNav.code}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                  <span>{selectedRoomForNav.building} • Lantai {selectedRoomForNav.floor}</span>
                  <span>Kapasitas: <strong className="text-slate-700">{selectedRoomForNav.capacity} Kursi</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedRoomForNav.isAccessible ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold">
                  <Accessibility className="w-4 h-4 text-emerald-600" />
                  <span>Akses Ramah Disabilitas</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-semibold">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span>Akses Tangga Gedung</span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Floor Switcher */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 mr-2">Pilih Lantai:</span>
              {[1, 2, 3].map(floorNum => (
                <button
                  key={floorNum}
                  onClick={() => setActiveFloorTab(floorNum)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeFloorTab === floorNum
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Lantai {floorNum}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-500">
              Menampilkan {currentFloorRooms.length} ruangan di Lantai {activeFloorTab}
            </span>
          </div>

          {/* Visual Interactive Floor Map Layout */}
          <div className="relative border-2 border-dashed border-slate-300 rounded-2xl p-6 bg-slate-50 min-h-[220px]">
            <div className="absolute top-3 left-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Denah Layout Spasial — Gedung FTI Lantai {activeFloorTab}
            </div>
            <div className="absolute top-3 right-4 flex items-center gap-2 text-[11px] text-slate-500">
              <span className="inline-block w-3 h-3 rounded bg-blue-600 mr-1" /> Ruangan Terpilih
              <span className="inline-block w-3 h-3 rounded bg-white border border-slate-300 ml-2 mr-1" /> Ruangan Lain
            </div>

            {/* Grid Representation of Rooms on this Floor */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
              {currentFloorRooms.map(room => {
                const isTarget = room.id === selectedRoomForNav.id;
                return (
                  <div
                    key={room.id}
                    className={`p-3.5 rounded-xl border text-center transition-all ${
                      isTarget
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-102 ring-4 ring-blue-400/30'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="font-extrabold text-xs">{room.name}</div>
                    <div className={`text-[10px] mt-1 ${isTarget ? 'text-blue-100' : 'text-slate-500'}`}>
                      {room.capacity} Kursi • {room.type}
                    </div>
                    {isTarget && (
                      <div className="mt-2 inline-flex items-center gap-1 text-[10px] bg-white text-blue-700 font-bold px-2 py-0.5 rounded-full shadow-xs">
                        <MapPin className="w-3 h-3" /> Lokasi Anda
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Core building facilities */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-100 text-center flex flex-col justify-center">
                <span className="text-[11px] font-bold text-slate-600">Lift & Tangga Utama</span>
                <span className="text-[10px] text-slate-400">Akses Vertikal</span>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-100 text-center flex flex-col justify-center">
                <span className="text-[11px] font-bold text-slate-600">Toilet & Musholla</span>
                <span className="text-[10px] text-slate-400">Fasilitas Umum</span>
              </div>
            </div>
          </div>

          {/* Turn-by-Turn Textual Direction (PRD UC-21 Step 6) */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-900 text-xs">
              <Navigation className="w-4 h-4 text-blue-600" />
              Petunjuk Rute Menuju {selectedRoomForNav.name}:
            </div>
            <ol className="text-xs text-blue-950 space-y-1.5 list-decimal pl-5 leading-relaxed">
              <li>Masuk melalui <strong>Lobi Utama Gedung FTI Unand Kampus Limau Manis</strong>.</li>
              {selectedRoomForNav.floor === 1 ? (
                <li>Berjalan lurus melalui koridor sayap barat/timur menuju pintu ruangan di sebelah kanan.</li>
              ) : (
                <li>Gunakan <strong>Tangga Utama atau Lift FTI</strong> di sisi tengah lobi untuk naik ke <strong>Lantai {selectedRoomForNav.floor}</strong>.</li>
              )}
              <li>Belok ke arah koridor utama sesuai penunjuk arah digital pintu ruangan.</li>
              <li>Ruangan <strong>{selectedRoomForNav.name}</strong> berada tepat di koridor dengan nomor pintu <strong>{selectedRoomForNav.code}</strong>.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Info className="w-4 h-4 text-slate-400" />
            Sensor IoT dan Smart Display ruangan aktif terhubung ke FTI Core Node.
          </div>
          <button
            onClick={() => setIsRoomNavModalOpen(false)}
            className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
          >
            Tutup Navigasi
          </button>
        </div>
      </div>
    </div>
  );
};

