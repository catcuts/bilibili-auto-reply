-- CreateTable
CREATE TABLE "ProxyTimeRange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "daysOfWeek" TEXT NOT NULL,
    "proxyConfigId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProxyTimeRange_proxyConfigId_fkey" FOREIGN KEY ("proxyConfigId") REFERENCES "ProxyConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProxyConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "ruleScript" TEXT NOT NULL DEFAULT '',
    "enableTimeRanges" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ProxyConfig" ("createdAt", "enabled", "host", "id", "port", "ruleScript", "updatedAt") SELECT "createdAt", "enabled", "host", "id", "port", "ruleScript", "updatedAt" FROM "ProxyConfig";
DROP TABLE "ProxyConfig";
ALTER TABLE "new_ProxyConfig" RENAME TO "ProxyConfig";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
