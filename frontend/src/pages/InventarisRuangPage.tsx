import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Room } from '../types';
import {
  Boxes,
  Armchair,
  CheckCircle2,
  Accessibility,
  Search,
  Filter,
  Download,
  Plus,
  Tv,
  Wifi,
  Volume2,
  Projector,
  Calendar,
  Compass,
  Building2,
  X,
  Layers,
  Edit2,
  Trash2,
} from 'lucide-react';

export const InventarisRuangPage: React.FC = () => {
  const {
    rooms,
    setSelectedRoomForNav,
    setIsRoomNavModalOpen,
    showToast,
    addBackendRoom,
    updateBackendRoom,
    deleteBackendRoom,
    backendStatus,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('Semua');
  const [selectedType, setSelectedType] = useState('Semua');
  const [selectedFloor, setSelectedFloor] = useState('Semua');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // New room form state (sesuai kolom tabel ruang MySQL)
  const [newRoom, setNewRoom] = useState<Partial<Room>>({
    code: '',
    name: '',
    building: 'Gedung H',
    floor: 1,
    capacity: 45,
    type: 'Teori',
    facilities: [],
    isAccessible: true,
    status: 'Siap Digunakan',
  });

  // Filtered rooms
  const filteredRooms = rooms.filter((r) => {
    const matchesSearch =
      r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBuilding =
      selectedBuilding === 'Semua' || r.building.includes(selectedBuilding);
    const matchesType =
      selectedType === 'Semua' || r.type === selectedType;
    const matchesFloor =
      selectedFloor === 'Semua' || r.floor === Number(selectedFloor);
    return matchesSearch && matchesBuilding && matchesType && matchesFloor;
  });

  const totalPages = Math.ceil(filteredRooms.length / itemsPerPage) || 1;
  const currentRooms = filteredRooms.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleOpenNav = (room: Room) => {
    setSelectedRoomForNav(room);
    setIsRoomNavModalOpen(true);
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.code || !newRoom.name) {
      showToast('Harap lengkapi kode dan nama ruangan!', 'error');
      return;
    }
    const ok = await addBackendRoom({
      code: newRoom.code.trim(),
      name: newRoom.name.trim(),
      building: (newRoom.building || 'H').replace(/^Gedung\s+/i, ''),
      floor: Number(newRoom.floor) || 1,
      capacity: Number(newRoom.capacity) || 45,
    });
    if (ok) {
      setNewRoom({ code: '', name: '', building: 'Gedung H', floor: 1, capacity: 45, type: 'Teori', facilities: [] });
      setIsAddModalOpen(false);
    }
  };

  const handleSaveEditRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;
    const ok = await updateBackendRoom(editingRoom.id, {
      code: editingRoom.code,
      name: editingRoom.name.replace(/^Ruang\s+[A-Za-z]+\s+/i, ''),
      building: editingRoom.building.replace(/^Gedung\s+/i, ''),
      floor: Number(editingRoom.floor) || 1,
      capacity: Number(editingRoom.capacity) || 45,
    });
    if (ok) setEditingRoom(null);
  };

  const handleDeleteRoom = async (room: Room) => {
    await deleteBackendRoom(room.id);
  };

  const handleExport = () => {
    showToast('Mengunduh data inventaris dan spesifikasi ruangan FTI Unand (XLSX)...', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
            <span className="bg-blue-100 px-2 py-0.5 rounded">FTI-FAC-2025</span>
            <span>•</span>
            <span className="text-slate-500 uppercase tracking-wider">Kompilasi Sarana Terkini</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Inventaris & Spesifikasi Ruang
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manajemen data kapasitas fisik, perlengkapan multimedia, status kesiapan, dan aksesibilitas fasilitas ruang FTI Unand.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Data Ruang</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 shadow-md shadow-blue-700/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Ruang Baru</span>
          </button>
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Ruang Terdata
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-800">{rooms.length}</span>
              <span className="text-xs text-slate-500">Ruang</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {backendStatus === 'connected' ? 'Sinkron Database MySQL' : 'Mode Offline'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Kapasitas Duduk
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-800">
                {rooms.reduce((acc, r) => acc + r.capacity, 0).toLocaleString('id-ID')}
              </span>
              <span className="text-xs text-slate-500">Kursi</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Rata-rata {rooms.length ? Math.round(rooms.reduce((acc, r) => acc + r.capacity, 0) / rooms.length) : 0} kursi/ruang
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Armchair className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Ruang Gedung H
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-emerald-600">
                {rooms.filter((r) => r.building.includes('H')).length}
              </span>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                Ruang H
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Lantai 1 &amp; Lantai 2</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Ruang Gedung G
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-blue-700">
                {rooms.filter((r) => r.building.includes('G')).length}
              </span>
              <span className="text-xs text-slate-500">Ruang G</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Kapasitas Menengah &amp; Besar</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Accessibility className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode atau nama gedung..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 placeholder-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={selectedBuilding}
            onChange={(e) => {
              setSelectedBuilding(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Semua">Semua Gedung (H &amp; G)</option>
            <option value="Gedung H">Gedung H</option>
            <option value="Gedung G">Gedung G</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Semua">Semua Jenis (Teori, Lab, Studio)</option>
            <option value="Teori">Ruang Teori</option>
            <option value="Laboratorium">Laboratorium</option>
            <option value="Seminar">Ruang Seminar/Auditorium</option>
          </select>

          <select
            value={selectedFloor}
            onChange={(e) => {
              setSelectedFloor(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Semua">Semua Lantai (1-3)</option>
            <option value="1">Lantai 1</option>
            <option value="2">Lantai 2</option>
            <option value="3">Lantai 3</option>
          </select>
        </div>
      </div>

      {/* Room Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {currentRooms.map((room) => {
          const isLab = room.type === 'Laboratorium';
          const isMaintenance = room.status === 'Pemeliharaan';

          return (
            <div
              key={room.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
            >
              <div className="p-4 space-y-3">
                {/* Header Room Card */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-semibold text-blue-600 tracking-wide uppercase">
                      {room.code} • {room.wing || `Lantai ${room.floor}`}
                    </span>
                    <h3 className="text-base font-bold text-slate-800 leading-snug mt-0.5">
                      {room.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {room.building} Lantai {room.floor}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 ${
                      isMaintenance
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isMaintenance ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />
                    {isMaintenance ? 'Pemeliharaan Berkala' : 'Siap Digunakan'}
                  </span>
                </div>

                {/* Capacity and Specs Badge */}
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {isLab ? (
                      <Tv className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Armchair className="w-4 h-4 text-slate-600" />
                    )}
                    <span className="font-semibold text-slate-800">
                      {room.capacity} {isLab ? 'Workstations / PC' : 'Kursi Kuliah Lipat'}
                    </span>
                  </div>
                  <span className="text-slate-500 text-[11px]">
                    {isLab ? 'Dedicated GPU' : 'Rasio 1.4m²/mhs'}
                  </span>
                </div>

                {/* Facilities Pills */}
                <div>
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1.5">
                    Perlengkapan & Multimedia
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {room.facilities.map((fac, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                      >
                        {fac.toLowerCase().includes('ac') && <span className="text-blue-500">❄</span>}
                        {fac.toLowerCase().includes('proyektor') && <Projector className="w-3 h-3 text-indigo-500" />}
                        {fac.toLowerCase().includes('wi-fi') && <Wifi className="w-3 h-3 text-emerald-500" />}
                        {fac.toLowerCase().includes('sound') && <Volume2 className="w-3 h-3 text-amber-500" />}
                        {fac.toLowerCase().includes('tv') && <Tv className="w-3 h-3 text-purple-500" />}
                        <span>{fac}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Accessibility */}
                <div className="pt-1 flex items-center gap-2 text-xs text-slate-500">
                  <Accessibility className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">
                    {room.isAccessible
                      ? 'Ramah Disabilitas (Akses Datar / Lift Ready)'
                      : 'Akses Tangga Gedung (Timur/Barat)'}
                  </span>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleOpenNav(room)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 py-1 px-2 rounded hover:bg-blue-50 transition-colors"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Navigasi</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingRoom({ ...room })}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-blue-700 py-1 px-2 rounded hover:bg-blue-50 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => void handleDeleteRoom(room)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 py-1 px-2 rounded hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <p className="text-xs text-slate-500">
          Menampilkan{' '}
          <span className="font-semibold text-slate-700">
            {filteredRooms.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
            {Math.min(currentPage * itemsPerPage, filteredRooms.length)}
          </span>{' '}
          dari <span className="font-semibold text-slate-700">{filteredRooms.length}</span> ruang terdaftar
        </p>

        <div className="flex items-center gap-1">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-xs font-medium text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
            <button
              key={pg}
              onClick={() => setCurrentPage(pg)}
              className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                currentPage === pg
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {pg}
            </button>
          ))}
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-xs font-medium text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
          >
            ›
          </button>
        </div>
      </div>

      {/* Modal Tambah Ruang Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Tambah Ruang Perkuliahan Baru
                  </h3>
                  <p className="text-xs text-slate-500">
                    Daftarkan fasilitas fisik baru ke database SIPRAMA FTI Unand
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddRoom} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Ruang *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: G-205 / LAB-TK-03"
                    value={newRoom.code}
                    onChange={(e) => setNewRoom({ ...newRoom, code: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kapasitas Kursi (Mhs) *
                  </label>
                  <input
                    type="number"
                    required
                    min={10}
                    max={200}
                    value={newRoom.capacity}
                    onChange={(e) =>
                      setNewRoom({ ...newRoom, capacity: Number(e.target.value) })
                    }
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Ruang / Laboratorium *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ruang Teori Multimedia / Lab Robotika Terpadu"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gedung
                  </label>
                  <select
                    value={newRoom.building}
                    onChange={(e) => setNewRoom({ ...newRoom, building: e.target.value })}
                    className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Gedung H">Gedung H</option>
                    <option value="Gedung G">Gedung G</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lantai
                  </label>
                  <select
                    value={newRoom.floor}
                    onChange={(e) =>
                      setNewRoom({ ...newRoom, floor: Number(e.target.value) })
                    }
                    className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>Lantai 1</option>
                    <option value={2}>Lantai 2</option>
                    <option value={3}>Lantai 3</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 shadow-sm transition-colors"
                >
                  Simpan Ruangan Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Ruang */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Edit Ruang: {editingRoom.code}</h3>
              <button onClick={() => setEditingRoom(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEditRoom} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Ruang</label>
                  <input
                    type="text"
                    required
                    value={editingRoom.code}
                    onChange={(e) => setEditingRoom({ ...editingRoom, code: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kapasitas</label>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    required
                    value={editingRoom.capacity}
                    onChange={(e) => setEditingRoom({ ...editingRoom, capacity: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Ruang</label>
                <input
                  type="text"
                  required
                  value={editingRoom.name}
                  onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gedung</label>
                  <select
                    value={editingRoom.building}
                    onChange={(e) => setEditingRoom({ ...editingRoom, building: e.target.value })}
                    className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg"
                  >
                    <option value="Gedung H">Gedung H</option>
                    <option value="Gedung G">Gedung G</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lantai</label>
                  <select
                    value={editingRoom.floor}
                    onChange={(e) => setEditingRoom({ ...editingRoom, floor: Number(e.target.value) })}
                    className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg"
                  >
                    <option value={1}>Lantai 1</option>
                    <option value={2}>Lantai 2</option>
                    <option value={3}>Lantai 3</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setEditingRoom(null)} className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg">
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

