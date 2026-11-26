/*
  Warnings:

  - You are about to drop the column `aksesibel` on the `ruang` table. All the data in the column will be lost.
  - You are about to drop the column `bisa_dipakai_bersama` on the `ruang` table. All the data in the column will be lost.
  - You are about to drop the column `denah_url` on the `ruang` table. All the data in the column will be lost.
  - You are about to drop the column `jenis_ruang` on the `ruang` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `ruang` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `ruang` table. All the data in the column will be lost.
  - You are about to drop the column `petunjuk_rute` on the `ruang` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `ruang` DROP COLUMN `aksesibel`,
    DROP COLUMN `bisa_dipakai_bersama`,
    DROP COLUMN `denah_url`,
    DROP COLUMN `jenis_ruang`,
    DROP COLUMN `latitude`,
    DROP COLUMN `longitude`,
    DROP COLUMN `petunjuk_rute`;
