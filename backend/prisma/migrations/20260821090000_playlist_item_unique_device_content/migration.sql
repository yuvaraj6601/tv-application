-- Prevent the same content from being attached to the same device more than once.

-- Dedupe any pre-existing (deviceId, contentId) duplicates first, keeping the earliest row.
DELETE p1 FROM `PlaylistItem` p1
INNER JOIN `PlaylistItem` p2
  ON p1.`deviceId` = p2.`deviceId`
  AND p1.`contentId` = p2.`contentId`
  AND p1.`createdAt` > p2.`createdAt`;

CREATE UNIQUE INDEX `PlaylistItem_deviceId_contentId_key` ON `PlaylistItem`(`deviceId`, `contentId`);
