/*
  Warnings:

  - You are about to drop the column `isReplied` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `receivedAt` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `repliedAt` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `replyContent` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `senderName` on the `Message` table. All the data in the column will be lost.
  - Added the required column `messageId` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT,
    "content" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "isAutoReply" BOOLEAN NOT NULL DEFAULT false,
    "ruleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("content", "createdAt", "id", "senderId", "updatedAt", "userId") SELECT "content", "createdAt", "id", "senderId", "updatedAt", "userId" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE UNIQUE INDEX "Message_messageId_key" ON "Message"("messageId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
