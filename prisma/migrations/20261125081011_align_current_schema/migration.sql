/*
  Warnings:

  - You are about to drop the `_schedulelecturers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_tandemlecturers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `audit_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `class_rombels` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `conflict_courses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `conflicts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `course_offerings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ga_parameters` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `lecturers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rooms` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `schedule_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `schedule_periods` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `_schedulelecturers` DROP FOREIGN KEY `_ScheduleLecturers_A_fkey`;

-- DropForeignKey
ALTER TABLE `_schedulelecturers` DROP FOREIGN KEY `_ScheduleLecturers_B_fkey`;

-- DropForeignKey
ALTER TABLE `_tandemlecturers` DROP FOREIGN KEY `_TandemLecturers_A_fkey`;

-- DropForeignKey
ALTER TABLE `_tandemlecturers` DROP FOREIGN KEY `_TandemLecturers_B_fkey`;

-- DropForeignKey
ALTER TABLE `audit_logs` DROP FOREIGN KEY `audit_logs_userId_fkey`;

-- DropForeignKey
ALTER TABLE `class_rombels` DROP FOREIGN KEY `class_rombels_courseId_fkey`;

-- DropForeignKey
ALTER TABLE `conflict_courses` DROP FOREIGN KEY `conflict_courses_conflictId_fkey`;

-- DropForeignKey
ALTER TABLE `conflict_courses` DROP FOREIGN KEY `conflict_courses_courseId_fkey`;

-- DropForeignKey
ALTER TABLE `conflicts` DROP FOREIGN KEY `conflicts_scheduleId_fkey`;

-- DropForeignKey
ALTER TABLE `course_offerings` DROP FOREIGN KEY `course_offerings_primaryLecturerId_fkey`;

-- DropForeignKey
ALTER TABLE `schedule_items` DROP FOREIGN KEY `schedule_items_classId_fkey`;

-- DropForeignKey
ALTER TABLE `schedule_items` DROP FOREIGN KEY `schedule_items_courseId_fkey`;

-- DropForeignKey
ALTER TABLE `schedule_items` DROP FOREIGN KEY `schedule_items_periodId_fkey`;

-- DropForeignKey
ALTER TABLE `schedule_items` DROP FOREIGN KEY `schedule_items_reviewedByUserId_fkey`;

-- DropForeignKey
ALTER TABLE `schedule_items` DROP FOREIGN KEY `schedule_items_roomId_fkey`;

-- DropForeignKey
ALTER TABLE `schedule_periods` DROP FOREIGN KEY `schedule_periods_reviewedByUserId_fkey`;

-- DropTable
DROP TABLE `_schedulelecturers`;

-- DropTable
DROP TABLE `_tandemlecturers`;

-- DropTable
DROP TABLE `audit_logs`;

-- DropTable
DROP TABLE `class_rombels`;

-- DropTable
DROP TABLE `conflict_courses`;

-- DropTable
DROP TABLE `conflicts`;

-- DropTable
DROP TABLE `course_offerings`;

-- DropTable
DROP TABLE `ga_parameters`;

-- DropTable
DROP TABLE `lecturers`;

-- DropTable
DROP TABLE `rooms`;

-- DropTable
DROP TABLE `schedule_items`;

-- DropTable
DROP TABLE `schedule_periods`;

-- DropTable
DROP TABLE `users`;

-- CreateTable
CREATE TABLE `program_studi` (
    `id_prodi` SMALLINT NOT NULL AUTO_INCREMENT,
    `kode_prodi` VARCHAR(20) NOT NULL,
    `nama_prodi` VARCHAR(150) NOT NULL,
    `nama_departemen` VARCHAR(150) NOT NULL,

    UNIQUE INDEX `program_studi_kode_prodi_key`(`kode_prodi`),
    PRIMARY KEY (`id_prodi`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pengguna` (
    `id_pengguna` BIGINT NOT NULL AUTO_INCREMENT,
    `id_prodi` SMALLINT NOT NULL,
    `username` VARCHAR(100) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `nama_lengkap` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `peran` VARCHAR(50) NOT NULL,
    `status_aktif` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `pengguna_username_key`(`username`),
    UNIQUE INDEX `pengguna_email_key`(`email`),
    INDEX `pengguna_id_prodi_idx`(`id_prodi`),
    PRIMARY KEY (`id_pengguna`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mahasiswa` (
    `id_mahasiswa` BIGINT NOT NULL AUTO_INCREMENT,
    `id_pengguna` BIGINT NOT NULL,
    `id_prodi` SMALLINT NOT NULL,
    `nim` VARCHAR(30) NOT NULL,
    `tahun_masuk` SMALLINT NOT NULL,

    UNIQUE INDEX `mahasiswa_id_pengguna_key`(`id_pengguna`),
    UNIQUE INDEX `mahasiswa_nim_key`(`nim`),
    INDEX `mahasiswa_id_prodi_idx`(`id_prodi`),
    PRIMARY KEY (`id_mahasiswa`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dosen` (
    `id_dosen` INTEGER NOT NULL AUTO_INCREMENT,
    `id_pengguna` BIGINT NOT NULL,
    `id_prodi` SMALLINT NOT NULL,
    `nidn` VARCHAR(30) NOT NULL,
    `jabatan_struktural` VARCHAR(100) NULL,
    `maks_sks_harian` SMALLINT NOT NULL,

    UNIQUE INDEX `dosen_id_pengguna_key`(`id_pengguna`),
    UNIQUE INDEX `dosen_nidn_key`(`nidn`),
    INDEX `dosen_id_prodi_idx`(`id_prodi`),
    PRIMARY KEY (`id_dosen`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mata_kuliah` (
    `id_mk` INTEGER NOT NULL AUTO_INCREMENT,
    `id_prodi` SMALLINT NOT NULL,
    `kode_mk` VARCHAR(20) NOT NULL,
    `nama_mk` VARCHAR(200) NOT NULL,
    `sks` SMALLINT NOT NULL,
    `semester_paket` SMALLINT NOT NULL,
    `jenis_mk` VARCHAR(50) NOT NULL,
    `lintas_prodi` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `mata_kuliah_kode_mk_key`(`kode_mk`),
    INDEX `mata_kuliah_id_prodi_idx`(`id_prodi`),
    PRIMARY KEY (`id_mk`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `semester_akademik` (
    `id_semester` SMALLINT NOT NULL AUTO_INCREMENT,
    `tahun_ajaran` VARCHAR(20) NOT NULL,
    `jenis_semester` VARCHAR(20) NOT NULL,
    `tgl_mulai` DATE NOT NULL,
    `tgl_selesai` DATE NOT NULL,
    `kuota_minimum_kelas` SMALLINT NOT NULL,

    PRIMARY KEY (`id_semester`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ruang` (
    `id_ruang` INTEGER NOT NULL AUTO_INCREMENT,
    `id_prodi_pengelola` SMALLINT NULL,
    `kode_ruang` VARCHAR(30) NOT NULL,
    `nama_ruang` VARCHAR(150) NOT NULL,
    `gedung` VARCHAR(100) NOT NULL,
    `lantai` SMALLINT NOT NULL,
    `kapasitas` SMALLINT NOT NULL,
    `jenis_ruang` VARCHAR(50) NOT NULL,
    `bisa_dipakai_bersama` BOOLEAN NOT NULL DEFAULT false,
    `aksesibel` BOOLEAN NOT NULL DEFAULT false,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `petunjuk_rute` TEXT NULL,
    `denah_url` VARCHAR(500) NULL,

    UNIQUE INDEX `ruang_kode_ruang_key`(`kode_ruang`),
    INDEX `ruang_id_prodi_pengelola_idx`(`id_prodi_pengelola`),
    PRIMARY KEY (`id_ruang`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kelas` (
    `id_kelas` INTEGER NOT NULL AUTO_INCREMENT,
    `id_semester` SMALLINT NOT NULL,
    `id_mk` INTEGER NOT NULL,
    `id_pengaju` BIGINT NOT NULL,
    `kode_kelas` VARCHAR(20) NOT NULL,
    `target_angkatan` SMALLINT NOT NULL,
    `estimasi_mahasiswa` SMALLINT NOT NULL,
    `jumlah_peserta` SMALLINT NOT NULL DEFAULT 0,
    `butuh_aksesibilitas` BOOLEAN NOT NULL DEFAULT false,
    `status_kelas` VARCHAR(30) NOT NULL,

    INDEX `kelas_id_semester_idx`(`id_semester`),
    INDEX `kelas_id_mk_idx`(`id_mk`),
    INDEX `kelas_id_pengaju_idx`(`id_pengaju`),
    PRIMARY KEY (`id_kelas`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pengampu_kelas` (
    `id_kelas` INTEGER NOT NULL,
    `id_dosen` INTEGER NOT NULL,
    `peran_pengampu` VARCHAR(50) NOT NULL,

    INDEX `pengampu_kelas_id_dosen_idx`(`id_dosen`),
    PRIMARY KEY (`id_kelas`, `id_dosen`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `preferensi_dosen` (
    `id_preferensi` BIGINT NOT NULL AUTO_INCREMENT,
    `id_dosen` INTEGER NOT NULL,
    `id_semester` SMALLINT NOT NULL,
    `hari` VARCHAR(15) NOT NULL,
    `jam_mulai_hindari` TIME(0) NOT NULL,
    `jam_selesai_hindari` TIME(0) NOT NULL,
    `tingkat` VARCHAR(30) NOT NULL,
    `alasan` VARCHAR(255) NULL,

    INDEX `preferensi_dosen_id_dosen_idx`(`id_dosen`),
    INDEX `preferensi_dosen_id_semester_idx`(`id_semester`),
    PRIMARY KEY (`id_preferensi`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jadwal_versi` (
    `id_versi` INTEGER NOT NULL AUTO_INCREMENT,
    `id_semester` SMALLINT NOT NULL,
    `nomor_versi` SMALLINT NOT NULL,
    `tahap` VARCHAR(30) NOT NULL,
    `status_versi` VARCHAR(30) NOT NULL,
    `dibuat_oleh` BIGINT NOT NULL,
    `id_wd1_penyetuju` INTEGER NULL,
    `tgl_persetujuan` TIMESTAMP(6) NULL,
    `id_penerbit` BIGINT NULL,
    `tgl_publikasi` TIMESTAMP(6) NULL,

    INDEX `jadwal_versi_dibuat_oleh_idx`(`dibuat_oleh`),
    INDEX `jadwal_versi_id_wd1_penyetuju_idx`(`id_wd1_penyetuju`),
    INDEX `jadwal_versi_id_penerbit_idx`(`id_penerbit`),
    UNIQUE INDEX `jadwal_versi_id_semester_nomor_versi_key`(`id_semester`, `nomor_versi`),
    PRIMARY KEY (`id_versi`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `konfigurasi_algoritma` (
    `id_konfigurasi` INTEGER NOT NULL AUTO_INCREMENT,
    `id_pembuat` BIGINT NOT NULL,
    `nama_konfigurasi` VARCHAR(150) NOT NULL,
    `ukuran_populasi` INTEGER NOT NULL,
    `peluang_crossover` DECIMAL(5, 4) NOT NULL,
    `peluang_mutasi` DECIMAL(5, 4) NOT NULL,
    `maks_generasi` INTEGER NOT NULL,
    `bobot_preferensi_hari` DECIMAL(8, 4) NOT NULL,
    `bobot_kondisi_pribadi` DECIMAL(8, 4) NOT NULL,
    `bobot_beban_harian` DECIMAL(8, 4) NOT NULL,
    `bobot_pemerataan` DECIMAL(8, 4) NOT NULL,

    INDEX `konfigurasi_algoritma_id_pembuat_idx`(`id_pembuat`),
    PRIMARY KEY (`id_konfigurasi`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `proses_optimasi` (
    `id_proses` INTEGER NOT NULL AUTO_INCREMENT,
    `id_konfigurasi` INTEGER NOT NULL,
    `id_versi_awal` INTEGER NOT NULL,
    `id_versi_hasil` INTEGER NULL,
    `id_pemicu` BIGINT NOT NULL,
    `algoritma` VARCHAR(50) NOT NULL,
    `waktu_mulai` TIMESTAMP(6) NOT NULL,
    `waktu_selesai` TIMESTAMP(6) NULL,
    `status_proses` VARCHAR(30) NOT NULL,
    `generasi_tercapai` INTEGER NULL,
    `penalti_sebelum` DECIMAL(14, 4) NULL,
    `penalti_sesudah` DECIMAL(14, 4) NULL,

    INDEX `proses_optimasi_id_konfigurasi_idx`(`id_konfigurasi`),
    INDEX `proses_optimasi_id_versi_awal_idx`(`id_versi_awal`),
    INDEX `proses_optimasi_id_versi_hasil_idx`(`id_versi_hasil`),
    INDEX `proses_optimasi_id_pemicu_idx`(`id_pemicu`),
    PRIMARY KEY (`id_proses`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jadwal_kuliah` (
    `id_jadwal` BIGINT NOT NULL AUTO_INCREMENT,
    `id_versi` INTEGER NOT NULL,
    `id_kelas` INTEGER NOT NULL,
    `id_ruang` INTEGER NOT NULL,
    `hari` VARCHAR(15) NOT NULL,
    `jam_mulai` TIME(0) NOT NULL,
    `jam_selesai` TIME(0) NOT NULL,

    INDEX `jadwal_kuliah_id_versi_idx`(`id_versi`),
    INDEX `jadwal_kuliah_id_kelas_idx`(`id_kelas`),
    INDEX `jadwal_kuliah_id_ruang_idx`(`id_ruang`),
    PRIMARY KEY (`id_jadwal`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pertemuan_kuliah` (
    `id_pertemuan` BIGINT NOT NULL AUTO_INCREMENT,
    `id_jadwal` BIGINT NOT NULL,
    `id_ruang_aktual` INTEGER NOT NULL,
    `id_pemohon_pengganti` BIGINT NULL,
    `pertemuan_ke` SMALLINT NOT NULL,
    `tanggal_pertemuan` DATE NOT NULL,
    `jam_mulai_aktual` TIME(0) NOT NULL,
    `jam_selesai_aktual` TIME(0) NOT NULL,
    `status_pertemuan` VARCHAR(30) NOT NULL,
    `keterangan` TEXT NULL,

    INDEX `pertemuan_kuliah_id_ruang_aktual_idx`(`id_ruang_aktual`),
    INDEX `pertemuan_kuliah_id_pemohon_pengganti_idx`(`id_pemohon_pengganti`),
    UNIQUE INDEX `pertemuan_kuliah_id_jadwal_pertemuan_ke_key`(`id_jadwal`, `pertemuan_ke`),
    PRIMARY KEY (`id_pertemuan`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `perubahan_jadwal` (
    `id_perubahan` BIGINT NOT NULL AUTO_INCREMENT,
    `id_jadwal` BIGINT NOT NULL,
    `id_pengguna` BIGINT NOT NULL,
    `hari_lama` VARCHAR(15) NOT NULL,
    `jam_mulai_lama` TIME(0) NOT NULL,
    `hari_baru` VARCHAR(15) NOT NULL,
    `jam_mulai_baru` TIME(0) NOT NULL,
    `id_ruang_lama` INTEGER NOT NULL,
    `id_ruang_baru` INTEGER NOT NULL,
    `alasan` TEXT NULL,
    `waktu_perubahan` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `perubahan_jadwal_id_jadwal_idx`(`id_jadwal`),
    INDEX `perubahan_jadwal_id_pengguna_idx`(`id_pengguna`),
    INDEX `perubahan_jadwal_id_ruang_lama_idx`(`id_ruang_lama`),
    INDEX `perubahan_jadwal_id_ruang_baru_idx`(`id_ruang_baru`),
    PRIMARY KEY (`id_perubahan`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deteksi_bentrok` (
    `id_bentrok` BIGINT NOT NULL AUTO_INCREMENT,
    `id_jadwal_1` BIGINT NOT NULL,
    `id_jadwal_2` BIGINT NOT NULL,
    `id_penindak` BIGINT NULL,
    `jenis_bentrok` VARCHAR(50) NOT NULL,
    `deskripsi` TEXT NULL,
    `status_bentrok` VARCHAR(30) NOT NULL,
    `terdeteksi_pada` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `selesai_pada` TIMESTAMP(6) NULL,

    INDEX `deteksi_bentrok_id_jadwal_1_idx`(`id_jadwal_1`),
    INDEX `deteksi_bentrok_id_jadwal_2_idx`(`id_jadwal_2`),
    INDEX `deteksi_bentrok_id_penindak_idx`(`id_penindak`),
    PRIMARY KEY (`id_bentrok`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pengguna` ADD CONSTRAINT `pengguna_id_prodi_fkey` FOREIGN KEY (`id_prodi`) REFERENCES `program_studi`(`id_prodi`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mahasiswa` ADD CONSTRAINT `mahasiswa_id_pengguna_fkey` FOREIGN KEY (`id_pengguna`) REFERENCES `pengguna`(`id_pengguna`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mahasiswa` ADD CONSTRAINT `mahasiswa_id_prodi_fkey` FOREIGN KEY (`id_prodi`) REFERENCES `program_studi`(`id_prodi`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dosen` ADD CONSTRAINT `dosen_id_pengguna_fkey` FOREIGN KEY (`id_pengguna`) REFERENCES `pengguna`(`id_pengguna`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dosen` ADD CONSTRAINT `dosen_id_prodi_fkey` FOREIGN KEY (`id_prodi`) REFERENCES `program_studi`(`id_prodi`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mata_kuliah` ADD CONSTRAINT `mata_kuliah_id_prodi_fkey` FOREIGN KEY (`id_prodi`) REFERENCES `program_studi`(`id_prodi`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ruang` ADD CONSTRAINT `ruang_id_prodi_pengelola_fkey` FOREIGN KEY (`id_prodi_pengelola`) REFERENCES `program_studi`(`id_prodi`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kelas` ADD CONSTRAINT `kelas_id_semester_fkey` FOREIGN KEY (`id_semester`) REFERENCES `semester_akademik`(`id_semester`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kelas` ADD CONSTRAINT `kelas_id_mk_fkey` FOREIGN KEY (`id_mk`) REFERENCES `mata_kuliah`(`id_mk`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kelas` ADD CONSTRAINT `kelas_id_pengaju_fkey` FOREIGN KEY (`id_pengaju`) REFERENCES `pengguna`(`id_pengguna`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pengampu_kelas` ADD CONSTRAINT `pengampu_kelas_id_kelas_fkey` FOREIGN KEY (`id_kelas`) REFERENCES `kelas`(`id_kelas`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pengampu_kelas` ADD CONSTRAINT `pengampu_kelas_id_dosen_fkey` FOREIGN KEY (`id_dosen`) REFERENCES `dosen`(`id_dosen`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `preferensi_dosen` ADD CONSTRAINT `preferensi_dosen_id_dosen_fkey` FOREIGN KEY (`id_dosen`) REFERENCES `dosen`(`id_dosen`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `preferensi_dosen` ADD CONSTRAINT `preferensi_dosen_id_semester_fkey` FOREIGN KEY (`id_semester`) REFERENCES `semester_akademik`(`id_semester`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jadwal_versi` ADD CONSTRAINT `jadwal_versi_id_semester_fkey` FOREIGN KEY (`id_semester`) REFERENCES `semester_akademik`(`id_semester`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jadwal_versi` ADD CONSTRAINT `jadwal_versi_dibuat_oleh_fkey` FOREIGN KEY (`dibuat_oleh`) REFERENCES `pengguna`(`id_pengguna`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jadwal_versi` ADD CONSTRAINT `jadwal_versi_id_wd1_penyetuju_fkey` FOREIGN KEY (`id_wd1_penyetuju`) REFERENCES `dosen`(`id_dosen`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jadwal_versi` ADD CONSTRAINT `jadwal_versi_id_penerbit_fkey` FOREIGN KEY (`id_penerbit`) REFERENCES `pengguna`(`id_pengguna`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `konfigurasi_algoritma` ADD CONSTRAINT `konfigurasi_algoritma_id_pembuat_fkey` FOREIGN KEY (`id_pembuat`) REFERENCES `pengguna`(`id_pengguna`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `proses_optimasi` ADD CONSTRAINT `proses_optimasi_id_konfigurasi_fkey` FOREIGN KEY (`id_konfigurasi`) REFERENCES `konfigurasi_algoritma`(`id_konfigurasi`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `proses_optimasi` ADD CONSTRAINT `proses_optimasi_id_versi_awal_fkey` FOREIGN KEY (`id_versi_awal`) REFERENCES `jadwal_versi`(`id_versi`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `proses_optimasi` ADD CONSTRAINT `proses_optimasi_id_versi_hasil_fkey` FOREIGN KEY (`id_versi_hasil`) REFERENCES `jadwal_versi`(`id_versi`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `proses_optimasi` ADD CONSTRAINT `proses_optimasi_id_pemicu_fkey` FOREIGN KEY (`id_pemicu`) REFERENCES `pengguna`(`id_pengguna`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jadwal_kuliah` ADD CONSTRAINT `jadwal_kuliah_id_versi_fkey` FOREIGN KEY (`id_versi`) REFERENCES `jadwal_versi`(`id_versi`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jadwal_kuliah` ADD CONSTRAINT `jadwal_kuliah_id_kelas_fkey` FOREIGN KEY (`id_kelas`) REFERENCES `kelas`(`id_kelas`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jadwal_kuliah` ADD CONSTRAINT `jadwal_kuliah_id_ruang_fkey` FOREIGN KEY (`id_ruang`) REFERENCES `ruang`(`id_ruang`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pertemuan_kuliah` ADD CONSTRAINT `pertemuan_kuliah_id_jadwal_fkey` FOREIGN KEY (`id_jadwal`) REFERENCES `jadwal_kuliah`(`id_jadwal`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pertemuan_kuliah` ADD CONSTRAINT `pertemuan_kuliah_id_ruang_aktual_fkey` FOREIGN KEY (`id_ruang_aktual`) REFERENCES `ruang`(`id_ruang`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pertemuan_kuliah` ADD CONSTRAINT `pertemuan_kuliah_id_pemohon_pengganti_fkey` FOREIGN KEY (`id_pemohon_pengganti`) REFERENCES `pengguna`(`id_pengguna`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `perubahan_jadwal` ADD CONSTRAINT `perubahan_jadwal_id_jadwal_fkey` FOREIGN KEY (`id_jadwal`) REFERENCES `jadwal_kuliah`(`id_jadwal`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `perubahan_jadwal` ADD CONSTRAINT `perubahan_jadwal_id_pengguna_fkey` FOREIGN KEY (`id_pengguna`) REFERENCES `pengguna`(`id_pengguna`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `perubahan_jadwal` ADD CONSTRAINT `perubahan_jadwal_id_ruang_lama_fkey` FOREIGN KEY (`id_ruang_lama`) REFERENCES `ruang`(`id_ruang`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `perubahan_jadwal` ADD CONSTRAINT `perubahan_jadwal_id_ruang_baru_fkey` FOREIGN KEY (`id_ruang_baru`) REFERENCES `ruang`(`id_ruang`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deteksi_bentrok` ADD CONSTRAINT `deteksi_bentrok_id_jadwal_1_fkey` FOREIGN KEY (`id_jadwal_1`) REFERENCES `jadwal_kuliah`(`id_jadwal`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deteksi_bentrok` ADD CONSTRAINT `deteksi_bentrok_id_jadwal_2_fkey` FOREIGN KEY (`id_jadwal_2`) REFERENCES `jadwal_kuliah`(`id_jadwal`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deteksi_bentrok` ADD CONSTRAINT `deteksi_bentrok_id_penindak_fkey` FOREIGN KEY (`id_penindak`) REFERENCES `pengguna`(`id_pengguna`) ON DELETE SET NULL ON UPDATE CASCADE;
