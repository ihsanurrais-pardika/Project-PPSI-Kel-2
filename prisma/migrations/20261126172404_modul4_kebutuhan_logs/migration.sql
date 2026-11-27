-- AlterTable
ALTER TABLE `kelas` ADD COLUMN `alasan_pembatalan` VARCHAR(255) NULL,
    ADD COLUMN `catatan_khusus` TEXT NULL,
    ADD COLUMN `preferensi_hari` VARCHAR(100) NULL,
    ADD COLUMN `preferensi_waktu` VARCHAR(100) NULL;

-- AlterTable
ALTER TABLE `mata_kuliah` ADD COLUMN `sks_praktik` SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN `sks_teori` SMALLINT NOT NULL DEFAULT 2;

-- CreateTable
CREATE TABLE `pengajuan_departemen` (
    `id_pengajuan` INTEGER NOT NULL AUTO_INCREMENT,
    `id_semester` SMALLINT NOT NULL,
    `id_prodi` SMALLINT NOT NULL,
    `id_pengaju` BIGINT NOT NULL,
    `status_pengajuan` VARCHAR(30) NOT NULL,
    `catatan` TEXT NULL,
    `waktu_pengajuan` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `pengajuan_departemen_id_pengaju_idx`(`id_pengaju`),
    UNIQUE INDEX `pengajuan_departemen_id_semester_id_prodi_key`(`id_semester`, `id_prodi`),
    PRIMARY KEY (`id_pengajuan`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `perubahan_kebutuhan` (
    `id_perubahan` BIGINT NOT NULL AUTO_INCREMENT,
    `id_kelas` INTEGER NULL,
    `id_mk` INTEGER NULL,
    `id_pengguna` BIGINT NOT NULL,
    `kode_prodi` VARCHAR(20) NOT NULL,
    `kode_mk` VARCHAR(20) NOT NULL,
    `kode_kelas` VARCHAR(20) NULL,
    `jenis_aksi` VARCHAR(40) NOT NULL,
    `nilai_lama` TEXT NULL,
    `nilai_baru` TEXT NULL,
    `alasan` TEXT NULL,
    `waktu_perubahan` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `perubahan_kebutuhan_kode_prodi_idx`(`kode_prodi`),
    INDEX `perubahan_kebutuhan_waktu_perubahan_idx`(`waktu_perubahan`),
    INDEX `perubahan_kebutuhan_id_kelas_idx`(`id_kelas`),
    INDEX `perubahan_kebutuhan_id_mk_idx`(`id_mk`),
    INDEX `perubahan_kebutuhan_id_pengguna_idx`(`id_pengguna`),
    PRIMARY KEY (`id_perubahan`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pengajuan_departemen` ADD CONSTRAINT `pengajuan_departemen_id_semester_fkey` FOREIGN KEY (`id_semester`) REFERENCES `semester_akademik`(`id_semester`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pengajuan_departemen` ADD CONSTRAINT `pengajuan_departemen_id_prodi_fkey` FOREIGN KEY (`id_prodi`) REFERENCES `program_studi`(`id_prodi`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pengajuan_departemen` ADD CONSTRAINT `pengajuan_departemen_id_pengaju_fkey` FOREIGN KEY (`id_pengaju`) REFERENCES `pengguna`(`id_pengguna`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `perubahan_kebutuhan` ADD CONSTRAINT `perubahan_kebutuhan_id_kelas_fkey` FOREIGN KEY (`id_kelas`) REFERENCES `kelas`(`id_kelas`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `perubahan_kebutuhan` ADD CONSTRAINT `perubahan_kebutuhan_id_mk_fkey` FOREIGN KEY (`id_mk`) REFERENCES `mata_kuliah`(`id_mk`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `perubahan_kebutuhan` ADD CONSTRAINT `perubahan_kebutuhan_id_pengguna_fkey` FOREIGN KEY (`id_pengguna`) REFERENCES `pengguna`(`id_pengguna`) ON DELETE RESTRICT ON UPDATE CASCADE;
