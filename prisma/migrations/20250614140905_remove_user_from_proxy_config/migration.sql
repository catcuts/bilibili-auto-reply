/*
  Warnings:

  - You are about to drop the column `userId` on the `ProxyConfig` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProxyConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "ruleScript" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ProxyConfig" ("createdAt", "enabled", "host", "id", "port", "ruleScript", "updatedAt") SELECT "createdAt", "enabled", "host", "id", "port", "ruleScript", "updatedAt" FROM "ProxyConfig";
DROP TABLE "ProxyConfig";
ALTER TABLE "new_ProxyConfig" RENAME TO "ProxyConfig";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
