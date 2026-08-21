-- Content moves from device-owned to user-owned; PlaylistItem becomes the real device<->content join.

-- 1. Add nullable userId column (idempotent — a prior partial run may have already added it)
SET @userIdExists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Content' AND COLUMN_NAME = 'userId'
);
SET @sql = IF(@userIdExists = 0, 'ALTER TABLE `Content` ADD COLUMN `userId` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Backfill userId from the owning device's userId
UPDATE `Content` c
JOIN `Device` d ON c.`deviceId` = d.`id`
SET c.`userId` = d.`userId`
WHERE c.`userId` IS NULL;

-- 3. Backfill PlaylistItem rows from the existing device<->content links.
--    Re-rank per device (1..N by prior sortOrder, tie-broken by createdAt) so duplicate legacy
--    sortOrder values on the same device don't collide with PlaylistItem's (deviceId, order) unique key.
SET @rank = 0;
SET @prevDevice = '';
INSERT INTO `PlaylistItem` (`id`, `deviceId`, `contentId`, `order`, `createdAt`, `updatedAt`)
SELECT UUID(), deviceId, contentId, rankedOrder, createdAt, updatedAt
FROM (
  SELECT
    c.`deviceId` AS deviceId,
    c.`id` AS contentId,
    c.`createdAt` AS createdAt,
    c.`updatedAt` AS updatedAt,
    @rank := IF(@prevDevice = c.`deviceId` COLLATE utf8mb4_unicode_ci, @rank + 1, 1) AS rankedOrder,
    @prevDevice := c.`deviceId` AS deviceTracker
  FROM `Content` c
  ORDER BY c.`deviceId`, c.`sortOrder`, c.`createdAt`
) ranked;

-- 4. Drop the old device relation and per-device sortOrder column
ALTER TABLE `Content` DROP FOREIGN KEY `Content_deviceId_fkey`;
DROP INDEX `Content_deviceId_sortOrder_idx` ON `Content`;
ALTER TABLE `Content` DROP COLUMN `deviceId`;
ALTER TABLE `Content` DROP COLUMN `sortOrder`;

-- 5. Enforce NOT NULL now that every row is backfilled, add the userId relation
ALTER TABLE `Content` MODIFY COLUMN `userId` VARCHAR(191) NOT NULL;
CREATE INDEX `Content_userId_idx` ON `Content`(`userId`);
ALTER TABLE `Content` ADD CONSTRAINT `Content_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
