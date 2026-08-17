-- AlterTable
ALTER TABLE `Device` ADD COLUMN `macAddress` VARCHAR(17) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Device_macAddress_key` ON `Device`(`macAddress`);

