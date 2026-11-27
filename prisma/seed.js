require('dotenv').config({ path: require('node:path').resolve(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { loadCsvSeedData } = require('./csvSeedMapper');

const prisma = new PrismaClient();

const OFFICIAL_ROLES_SEED = [
  {
    kode_prodi: 'TK',
    username: 'wadek1',
    email: 'Wadek1@it.unand.ac.id',
    password: 'wadek1ftiunand',
    nama: 'Dr. Eng. Rahmadi, M.T.',
    peran: 'WADEK1',
    nip: '19750312 200212 1 002',
    jabatan: 'Wakil Dekan I (Bidang Akademik)',
  },
  {
    kode_prodi: 'SI',
    username: 'kadepsi',
    email: 'kadepsi@it.unand.ac.id',
    password: 'kadepsiftiunand',
    nama: 'Ricky Akbar, M.Kom.',
    peran: 'KADEP_SI',
    nip: '19840915 200812 1 002',
    jabatan: 'Ketua Departemen Sistem Informasi',
  },
  {
    kode_prodi: 'IF',
    username: 'kadepif',
    email: 'kadepif@it.unand.ac.id',
    password: 'kadepifftiunand',
    nama: 'Dr. Ir. Wahyudi, S.T., M.T.',
    peran: 'KADEP_IF',
    nip: '19760724 200212 1 001',
    jabatan: 'Ketua Departemen Informatika',
  },
  {
    kode_prodi: 'TK',
    username: 'kadeptekkom',
    email: 'kadeptekkom@it.unand.ac.id',
    password: 'kadeptekkomftiunand',
    nama: 'Dr. Eng. Tati Erlina, M.IT.',
    peran: 'KADEP_TK',
    nip: '19790412 200604 2 001',
    jabatan: 'Ketua Departemen Teknik Komputer',
  },
  {
    kode_prodi: 'SI',
    username: 'dosen',
    email: 'dosen@it.unand.ac.id',
    password: 'dosenftiunand',
    nama: 'Dr. Eng. Rahmad, M.T.',
    peran: 'DOSEN',
    nip: '19820412 200812 1 003',
    jabatan: 'Dosen Pengampu',
  },
  {
    kode_prodi: 'SI',
    username: 'ihsan',
    email: 'ihsan@gmail.com',
    password: 'ihsan123',
    nama: 'Ihsan',
    peran: 'MAHASISWA',
    nim: '2211522001',
    tahun_masuk: 2022,
  },
];

async function main() {
  // 1. Ambil nilai konfigurasi Superadmin dari .env
  const superadminName = process.env.SUPERADMIN_NAME || 'Admin';
  const superadminEmail = process.env.SUPERADMIN_EMAIL || 'admin@it.unand.ac.id';
  const superadminNip = process.env.SUPERADMIN_NIP || '12345678';
  const superadminPassword = process.env.SUPERADMIN_PASSWORD || 'adminftiunand';

  console.log('🌱 Menjalankan Prisma Database Seeder...');
  console.log(`   Konfigurasi Superadmin dari .env:`);
  console.log(`   - Nama     : ${superadminName}`);
  console.log(`   - Email    : ${superadminEmail}`);
  console.log(`   - NIP      : ${superadminNip}`);
  console.log(`   - Password : ${superadminPassword}`);

  // 2. Upsert Program Studi (hanya 3 prodi resmi: SI, IF, TK)
  const prodis = [
    { kode_prodi: 'SI', nama_prodi: 'Sistem Informasi', nama_departemen: 'Departemen Sistem Informasi' },
    { kode_prodi: 'IF', nama_prodi: 'Informatika', nama_departemen: 'Departemen Informatika' },
    { kode_prodi: 'TK', nama_prodi: 'Teknik Komputer', nama_departemen: 'Departemen Teknik Komputer' },
  ];

  const prodiMap = {};
  for (const p of prodis) {
    const record = await prisma.programStudi.upsert({
      where: { kode_prodi: p.kode_prodi },
      update: {
        nama_prodi: p.nama_prodi,
        nama_departemen: p.nama_departemen,
      },
      create: p,
      select: { id_prodi: true, kode_prodi: true },
    });
    prodiMap[record.kode_prodi] = record.id_prodi;
  }
  console.log('  ✓ Program Studi (SI, IF, TK) berhasil diinisialisasi.');

  // 3. Hash Password Superadmin
  const superadminHash = await bcrypt.hash(superadminPassword, 10);

  // Cari apakah superadmin sudah ada (berdasarkan email, username NIP, atau peran SUPERADMIN)
  const existingSuperadmin = await prisma.pengguna.findFirst({
    where: {
      OR: [
        { email: superadminEmail },
        { username: superadminNip },
        { email: 'admin@gmail.com' }, // update dari seed lama jika ada
        { peran: 'SUPERADMIN' },
      ],
    },
  });

  let superadminUser;
  if (existingSuperadmin) {
    superadminUser = await prisma.pengguna.update({
      where: { id_pengguna: existingSuperadmin.id_pengguna },
      data: {
        id_prodi: prodiMap['SI'],
        username: superadminNip,
        email: superadminEmail,
        password_hash: superadminHash,
        nama_lengkap: superadminName,
        peran: 'SUPERADMIN',
        status_aktif: true,
      },
    });
    console.log(`  ✓ Akun Superadmin diperbarui: ${superadminUser.email} (NIP: ${superadminUser.username})`);
  } else {
    superadminUser = await prisma.pengguna.create({
      data: {
        id_prodi: prodiMap['SI'],
        username: superadminNip,
        email: superadminEmail,
        password_hash: superadminHash,
        nama_lengkap: superadminName,
        peran: 'SUPERADMIN',
        status_aktif: true,
      },
    });
    console.log(`  ✓ Akun Superadmin dibuat: ${superadminUser.email} (NIP: ${superadminUser.username})`);
  }

  // Daftarkan NIP Superadmin ke tabel Dosen agar dapat diverifikasi via NIP di sistem
  await prisma.dosen.upsert({
    where: { id_pengguna: superadminUser.id_pengguna },
    update: {
      id_prodi: prodiMap['SI'],
      nidn: superadminNip,
      jabatan_struktural: 'Administrator Sistem FTI',
      maks_sks_harian: 12,
    },
    create: {
      id_pengguna: superadminUser.id_pengguna,
      id_prodi: prodiMap['SI'],
      nidn: superadminNip,
      jabatan_struktural: 'Administrator Sistem FTI',
      maks_sks_harian: 12,
    },
  });

  // 4. Seeding Akun Resmi Lainnya (Wadek 1, Kadep SI, IF, TK, Dosen, Mahasiswa)
  const pengajuByProdi = {};
  for (const acc of OFFICIAL_ROLES_SEED) {
    const pwHash = await bcrypt.hash(acc.password, 10);
    const targetProdiId = prodiMap[acc.kode_prodi] || prodiMap['SI'];

    const user = await prisma.pengguna.upsert({
      where: { email: acc.email },
      update: {
        id_prodi: targetProdiId,
        username: acc.username,
        password_hash: pwHash,
        nama_lengkap: acc.nama,
        peran: acc.peran,
        status_aktif: true,
      },
      create: {
        id_prodi: targetProdiId,
        username: acc.username,
        email: acc.email,
        password_hash: pwHash,
        nama_lengkap: acc.nama,
        peran: acc.peran,
        status_aktif: true,
      },
    });

    if (acc.peran.startsWith('KADEP_')) {
      pengajuByProdi[acc.kode_prodi] = user.id_pengguna;
    }

    if (acc.nip) {
      await prisma.dosen.upsert({
        where: { id_pengguna: user.id_pengguna },
        update: {
          id_prodi: targetProdiId,
          nidn: acc.nip,
          jabatan_struktural: acc.jabatan,
          maks_sks_harian: 12,
        },
        create: {
          id_pengguna: user.id_pengguna,
          id_prodi: targetProdiId,
          nidn: acc.nip,
          jabatan_struktural: acc.jabatan,
          maks_sks_harian: 12,
        },
      });
    }

    if (acc.nim) {
      await prisma.mahasiswa.upsert({
        where: { id_pengguna: user.id_pengguna },
        update: {
          id_prodi: targetProdiId,
          nim: acc.nim,
          tahun_masuk: acc.tahun_masuk || 2022,
        },
        create: {
          id_pengguna: user.id_pengguna,
          id_prodi: targetProdiId,
          nim: acc.nim,
          tahun_masuk: acc.tahun_masuk || 2022,
        },
      });
    }

    console.log(`  ✓ Akun resmi disinkronkan: ${acc.email} (${acc.peran})`);
  }

  // 5. Seeding Mata Kuliah (hasil seleksi & deduplikasi dari CSV FTI Ganjil 2026)
  const { mataKuliahList, kelasList, audit } = loadCsvSeedData();
  const mkIdByKode = {};
  for (const mk of mataKuliahList) {
    const idProdi = prodiMap[mk.prodiCode] || prodiMap['SI'];
    const record = await prisma.mataKuliah.upsert({
      where: { kode_mk: mk.kode_mk },
      update: {
        id_prodi: idProdi,
        nama_mk: mk.nama_mk,
        sks: mk.sks,
        semester_paket: mk.semester_paket,
        jenis_mk: mk.jenis_mk,
        lintas_prodi: mk.lintas_prodi,
      },
      create: {
        id_prodi: idProdi,
        kode_mk: mk.kode_mk,
        nama_mk: mk.nama_mk,
        sks: mk.sks,
        semester_paket: mk.semester_paket,
        jenis_mk: mk.jenis_mk,
        lintas_prodi: mk.lintas_prodi,
      },
      select: { id_mk: true, kode_mk: true },
    });
    mkIdByKode[record.kode_mk] = record.id_mk;
  }
  console.log(`  ✓ ${mataKuliahList.length} Mata Kuliah unik berhasil diseleksi dari ${audit.totalCsvRows} baris CSV.`);

  // 6. Seeding Semester Akademik & Penawaran Kelas dari CSV
  const semesterPayload = {
    tahun_ajaran: '2026/2027',
    jenis_semester: 'Ganjil',
    tgl_mulai: new Date('2026-08-17T00:00:00Z'),
    tgl_selesai: new Date('2026-12-18T00:00:00Z'),
    kuota_minimum_kelas: 15,
  };
  let semesterRecord = await prisma.semesterAkademik.findFirst({
    where: {
      tahun_ajaran: semesterPayload.tahun_ajaran,
      jenis_semester: semesterPayload.jenis_semester,
    },
  });
  if (semesterRecord) {
    semesterRecord = await prisma.semesterAkademik.update({
      where: { id_semester: semesterRecord.id_semester },
      data: semesterPayload,
    });
  } else {
    semesterRecord = await prisma.semesterAkademik.create({ data: semesterPayload });
  }

  for (const kls of kelasList) {
    const idMk = mkIdByKode[kls.kode_mk];
    const idPengaju = pengajuByProdi[kls.pengajuProdiCode] || superadminUser.id_pengguna;
    const existingKelas = await prisma.kelas.findFirst({
      where: {
        id_semester: semesterRecord.id_semester,
        id_mk: idMk,
        kode_kelas: kls.kode_kelas,
      },
    });
    const kelasData = {
      id_semester: semesterRecord.id_semester,
      id_mk: idMk,
      id_pengaju: idPengaju,
      kode_kelas: kls.kode_kelas,
      target_angkatan: kls.target_angkatan,
      estimasi_mahasiswa: kls.estimasi_mahasiswa,
      jumlah_peserta: kls.jumlah_peserta,
      butuh_aksesibilitas: kls.butuh_aksesibilitas,
      status_kelas: kls.status_kelas,
    };
    if (existingKelas) {
      await prisma.kelas.update({
        where: { id_kelas: existingKelas.id_kelas },
        data: kelasData,
      });
    } else {
      await prisma.kelas.create({ data: kelasData });
    }
  }
  console.log(`  ✓ Semester ${semesterRecord.tahun_ajaran} (${semesterRecord.jenis_semester}) & ${kelasList.length} Kelas berhasil disinkronkan.`);

  // Bersihkan baris lama 'FTI' dari program_studi karena FTI adalah Fakultas, bukan Program Studi
  const deletedFti = await prisma.programStudi.deleteMany({ where: { kode_prodi: 'FTI' } });
  if (deletedFti.count > 0) {
    console.log('  ✓ Entri non-prodi (FTI) dihapus dari tabel program_studi.');
  }

  // 7. Seeding Master Ruang Fisik (Gedung H & Gedung G)
  const roomsSeed = [
    { kode_ruang: 'H-1.7', nama_ruang: '1.7', gedung: 'H', lantai: 1, kapasitas: 45 },
    { kode_ruang: 'H-1.8', nama_ruang: '1.8', gedung: 'H', lantai: 1, kapasitas: 45 },
    { kode_ruang: 'H-1.9', nama_ruang: '1.9', gedung: 'H', lantai: 1, kapasitas: 45 },
    { kode_ruang: 'H-1.10', nama_ruang: '1.10', gedung: 'H', lantai: 1, kapasitas: 45 },
    { kode_ruang: 'H-2.7', nama_ruang: '2.7', gedung: 'H', lantai: 2, kapasitas: 45 },
    { kode_ruang: 'H-2.8', nama_ruang: '2.8', gedung: 'H', lantai: 2, kapasitas: 45 },
    { kode_ruang: 'H-2.9', nama_ruang: '2.9', gedung: 'H', lantai: 2, kapasitas: 45 },
    { kode_ruang: 'H-2.10', nama_ruang: '2.10', gedung: 'H', lantai: 2, kapasitas: 45 },
    { kode_ruang: 'G-1.1', nama_ruang: '1.1', gedung: 'G', lantai: 1, kapasitas: 60 },
    { kode_ruang: 'G-1.2', nama_ruang: '1.2', gedung: 'G', lantai: 1, kapasitas: 70 },
    { kode_ruang: 'G-1.3', nama_ruang: '1.3', gedung: 'G', lantai: 1, kapasitas: 100 },
    { kode_ruang: 'G-2.1', nama_ruang: '2.1', gedung: 'G', lantai: 2, kapasitas: 55 },
    { kode_ruang: 'G-2.2', nama_ruang: '2.2', gedung: 'G', lantai: 2, kapasitas: 55 },
    { kode_ruang: 'G-2.3', nama_ruang: '2.3', gedung: 'G', lantai: 2, kapasitas: 60 },
    { kode_ruang: 'G-2.4', nama_ruang: '2.4', gedung: 'G', lantai: 2, kapasitas: 60 },
    { kode_ruang: 'LAB-SW-1', nama_ruang: 'Lab Software 1 (Lab Terpadu)', gedung: 'LAB', lantai: 1, kapasitas: 50 },
    { kode_ruang: 'LAB-SW-2', nama_ruang: 'Lab Software 2', gedung: 'LAB', lantai: 1, kapasitas: 50 },
    { kode_ruang: 'LAB-DASAR', nama_ruang: 'Lab Komputer Dasar FTI', gedung: 'LAB', lantai: 1, kapasitas: 60 },
    { kode_ruang: 'LAB-HW-1', nama_ruang: 'Lab Hardware & IoT', gedung: 'LAB', lantai: 3, kapasitas: 50 },
    { kode_ruang: 'LAB-JARKOM', nama_ruang: 'Lab Jaringan & Cloud', gedung: 'LAB', lantai: 3, kapasitas: 50 },
  ];

  for (const r of roomsSeed) {
    await prisma.ruang.upsert({
      where: { kode_ruang: r.kode_ruang },
      update: {
        id_prodi_pengelola: null,
        nama_ruang: r.nama_ruang,
        gedung: r.gedung,
        lantai: r.lantai,
        kapasitas: r.kapasitas,
      },
      create: {
        id_prodi_pengelola: null,
        kode_ruang: r.kode_ruang,
        nama_ruang: r.nama_ruang,
        gedung: r.gedung,
        lantai: r.lantai,
        kapasitas: r.kapasitas,
      },
    });
  }
  console.log(`  ✓ ${roomsSeed.length} Ruang fisik (Gedung H & G) berhasil disinkronkan.`);

  console.log('✅ Seeding Prisma selesai! Akun, Program Studi, Mata Kuliah, Semester, Kelas, dan Ruang siap digunakan.');
}

main()
  .catch((error) => {
    console.error('❌ Gagal menjalankan seeder Prisma:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
