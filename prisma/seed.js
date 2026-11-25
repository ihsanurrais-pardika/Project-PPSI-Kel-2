require('dotenv').config({ path: require('node:path').resolve(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const OFFICIAL_ROLES_SEED = [
  {
    kode_prodi: 'FTI',
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

  // 2. Upsert Program Studi
  const prodis = [
    { kode_prodi: 'FTI', nama_prodi: 'Fakultas Teknologi Informasi', nama_departemen: 'Fakultas Teknologi Informasi' },
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
  console.log('  ✓ Program Studi (FTI, SI, IF, TK) berhasil diinisialisasi.');

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
        id_prodi: prodiMap['FTI'],
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
        id_prodi: prodiMap['FTI'],
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
      id_prodi: prodiMap['FTI'],
      nidn: superadminNip,
      jabatan_struktural: 'Administrator Sistem FTI',
      maks_sks_harian: 12,
    },
    create: {
      id_pengguna: superadminUser.id_pengguna,
      id_prodi: prodiMap['FTI'],
      nidn: superadminNip,
      jabatan_struktural: 'Administrator Sistem FTI',
      maks_sks_harian: 12,
    },
  });

  // 4. Seeding Akun Resmi Lainnya (Wadek 1, Kadep SI, IF, TK, Dosen, Mahasiswa)
  for (const acc of OFFICIAL_ROLES_SEED) {
    const pwHash = await bcrypt.hash(acc.password, 10);
    const targetProdiId = prodiMap[acc.kode_prodi] || prodiMap['FTI'];

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

  console.log('✅ Seeding Prisma selesai! Seluruh akun sesuai file .env siap digunakan.');
}

main()
  .catch((error) => {
    console.error('❌ Gagal menjalankan seeder Prisma:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
