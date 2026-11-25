-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('SUPERADMIN', 'ADMIN', 'WADEK1', 'KAPRODI_SI', 'KAPRODI_IF', 'KAPRODI_TK', 'DOSEN', 'MAHASISWA') NOT NULL DEFAULT 'MAHASISWA',
    `nipOrNim` VARCHAR(50) NOT NULL,
    `department` VARCHAR(100) NULL,
    `avatar` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_nipOrNim_key`(`nipOrNim`),
    INDEX `users_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lecturers` (
    `id` CHAR(36) NOT NULL,
    `nip` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `department` VARCHAR(100) NOT NULL,
    `expertise` VARCHAR(150) NULL,
    `maxSks` INTEGER NOT NULL DEFAULT 12,
    `currentSks` INTEGER NOT NULL DEFAULT 0,
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `lecturers_nip_key`(`nip`),
    INDEX `lecturers_department_idx`(`department`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rooms` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `building` VARCHAR(100) NOT NULL DEFAULT 'Gedung FTI',
    `floor` INTEGER NOT NULL DEFAULT 1,
    `capacity` INTEGER NOT NULL DEFAULT 40,
    `areaM2` DOUBLE NULL,
    `wing` VARCHAR(50) NULL,
    `type` ENUM('TEORI', 'TEORI_MULTIMEDIA', 'TEORI_STANDAR', 'TEORI_BESAR', 'LAB_SOFTWARE', 'LAB_HARDWARE_IOT', 'STUDIO', 'SEMINAR', 'LABORATORIUM') NOT NULL DEFAULT 'TEORI',
    `isAccessible` BOOLEAN NOT NULL DEFAULT true,
    `status` ENUM('SIAP_DIGUNAKAN', 'PEMELIHARAAN_BERKALA', 'SEDANG_DIGUNAKAN', 'TERSEDIA', 'PEMELIHARAAN') NOT NULL DEFAULT 'SIAP_DIGUNAKAN',
    `priorityDepartment` VARCHAR(100) NULL,
    `facilities` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `rooms_code_key`(`code`),
    INDEX `rooms_building_floor_idx`(`building`, `floor`),
    INDEX `rooms_status_type_idx`(`status`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course_offerings` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `sks` INTEGER NOT NULL DEFAULT 3,
    `theorySks` INTEGER NOT NULL DEFAULT 2,
    `practiceSks` INTEGER NOT NULL DEFAULT 1,
    `department` VARCHAR(100) NOT NULL,
    `semester` INTEGER NOT NULL DEFAULT 1,
    `curriculum` VARCHAR(100) NOT NULL DEFAULT 'Kurikulum OBE 2024',
    `isMandatory` BOOLEAN NOT NULL DEFAULT true,
    `totalEnrolledEst` INTEGER NOT NULL DEFAULT 0,
    `preferredDays` JSON NULL,
    `preferredTimeSlot` VARCHAR(50) NULL DEFAULT 'Sesi Pagi',
    `specialConstraints` JSON NULL,
    `recommendedRoomType` VARCHAR(100) NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'VALIDATED', 'NEED_REVISION') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `primaryLecturerId` VARCHAR(191) NOT NULL,

    INDEX `course_offerings_department_semester_idx`(`department`, `semester`),
    INDEX `course_offerings_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `class_rombels` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `capacity` INTEGER NOT NULL DEFAULT 40,
    `enrolled` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `class_rombels_courseId_name_key`(`courseId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schedule_periods` (
    `id` CHAR(36) NOT NULL,
    `academicYear` VARCHAR(20) NOT NULL,
    `semester` VARCHAR(20) NOT NULL,
    `status` ENUM('MENUNGGU_PERSETUJUAN', 'DISETUJUI', 'REVISI', 'RESMI') NOT NULL DEFAULT 'MENUNGGU_PERSETUJUAN',
    `revisionNote` TEXT NULL,
    `approvedAt` DATETIME(3) NULL,
    `publishedAt` DATETIME(3) NULL,
    `reviewedByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `schedule_periods_academicYear_semester_key`(`academicYear`, `semester`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schedule_items` (
    `id` CHAR(36) NOT NULL,
    `day` VARCHAR(20) NOT NULL,
    `sessionIndex` INTEGER NOT NULL,
    `timeLabel` VARCHAR(50) NOT NULL,
    `isTandem` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('OK', 'TANDEM', 'WARNING', 'BENTROK') NOT NULL DEFAULT 'OK',
    `reviewStatus` ENUM('MENUNGGU_REVIEW', 'DISETUJUI', 'REVISI') NOT NULL DEFAULT 'MENUNGGU_REVIEW',
    `revisionNote` TEXT NULL,
    `note` TEXT NULL,
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `periodId` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `reviewedByUserId` VARCHAR(191) NULL,

    INDEX `schedule_items_periodId_day_sessionIndex_idx`(`periodId`, `day`, `sessionIndex`),
    INDEX `schedule_items_courseId_idx`(`courseId`),
    INDEX `schedule_items_classId_idx`(`classId`),
    INDEX `schedule_items_roomId_day_sessionIndex_idx`(`roomId`, `day`, `sessionIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conflicts` (
    `id` CHAR(36) NOT NULL,
    `type` VARCHAR(100) NOT NULL,
    `severity` ENUM('HARD', 'SOFT', 'WARNING') NOT NULL DEFAULT 'HARD',
    `title` VARCHAR(200) NOT NULL,
    `details` TEXT NOT NULL,
    `recommendation` TEXT NULL,
    `isResolved` BOOLEAN NOT NULL DEFAULT false,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `scheduleId` VARCHAR(191) NULL,

    INDEX `conflicts_isResolved_severity_idx`(`isResolved`, `severity`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conflict_courses` (
    `conflictId` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`conflictId`, `courseId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` CHAR(36) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `activity` VARCHAR(200) NOT NULL,
    `description` TEXT NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `actorName` VARCHAR(150) NOT NULL,
    `actorRole` VARCHAR(50) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'success',
    `userId` VARCHAR(191) NULL,

    INDEX `audit_logs_timestamp_idx`(`timestamp`),
    INDEX `audit_logs_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ga_parameters` (
    `id` CHAR(36) NOT NULL,
    `populationSize` INTEGER NOT NULL DEFAULT 200,
    `crossoverRate` DOUBLE NOT NULL DEFAULT 0.85,
    `mutationRate` DOUBLE NOT NULL DEFAULT 0.05,
    `maxGenerations` INTEGER NOT NULL DEFAULT 250,
    `timeoutSeconds` INTEGER NOT NULL DEFAULT 30,
    `randomSeed` INTEGER NOT NULL DEFAULT 42,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ga_parameters_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_ScheduleLecturers` (
    `A` CHAR(36) NOT NULL,
    `B` CHAR(36) NOT NULL,

    UNIQUE INDEX `_ScheduleLecturers_AB_unique`(`A`, `B`),
    INDEX `_ScheduleLecturers_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_TandemLecturers` (
    `A` CHAR(36) NOT NULL,
    `B` CHAR(36) NOT NULL,

    UNIQUE INDEX `_TandemLecturers_AB_unique`(`A`, `B`),
    INDEX `_TandemLecturers_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `course_offerings` ADD CONSTRAINT `course_offerings_primaryLecturerId_fkey` FOREIGN KEY (`primaryLecturerId`) REFERENCES `lecturers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `class_rombels` ADD CONSTRAINT `class_rombels_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `course_offerings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedule_periods` ADD CONSTRAINT `schedule_periods_reviewedByUserId_fkey` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedule_items` ADD CONSTRAINT `schedule_items_periodId_fkey` FOREIGN KEY (`periodId`) REFERENCES `schedule_periods`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedule_items` ADD CONSTRAINT `schedule_items_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `course_offerings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedule_items` ADD CONSTRAINT `schedule_items_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `class_rombels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedule_items` ADD CONSTRAINT `schedule_items_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedule_items` ADD CONSTRAINT `schedule_items_reviewedByUserId_fkey` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conflicts` ADD CONSTRAINT `conflicts_scheduleId_fkey` FOREIGN KEY (`scheduleId`) REFERENCES `schedule_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conflict_courses` ADD CONSTRAINT `conflict_courses_conflictId_fkey` FOREIGN KEY (`conflictId`) REFERENCES `conflicts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conflict_courses` ADD CONSTRAINT `conflict_courses_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `course_offerings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ScheduleLecturers` ADD CONSTRAINT `_ScheduleLecturers_A_fkey` FOREIGN KEY (`A`) REFERENCES `lecturers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ScheduleLecturers` ADD CONSTRAINT `_ScheduleLecturers_B_fkey` FOREIGN KEY (`B`) REFERENCES `schedule_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_TandemLecturers` ADD CONSTRAINT `_TandemLecturers_A_fkey` FOREIGN KEY (`A`) REFERENCES `course_offerings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_TandemLecturers` ADD CONSTRAINT `_TandemLecturers_B_fkey` FOREIGN KEY (`B`) REFERENCES `lecturers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
