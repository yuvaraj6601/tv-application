-- AlterTable
ALTER TABLE `Device` ADD COLUMN `piId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Device_piId_key` ON `Device`(`piId`);
