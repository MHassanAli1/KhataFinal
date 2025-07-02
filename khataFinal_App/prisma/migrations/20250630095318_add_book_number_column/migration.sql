/*
  Warnings:

  - Added the required column `bookNumber` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ticketNumber` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userID" INTEGER NOT NULL,
    "ZoneName" TEXT NOT NULL,
    "KhdaName" TEXT NOT NULL,
    "KulAmdan" BIGINT NOT NULL,
    "bookNumber" TEXT NOT NULL,
    "ticketNumber" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "KulAkhrajat" BIGINT NOT NULL,
    "SaafiAmdan" BIGINT NOT NULL,
    "Exercise" BIGINT NOT NULL,
    "KulMaizan" BIGINT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "Synced" BOOLEAN NOT NULL DEFAULT false,
    "SyncedAt" DATETIME,
    CONSTRAINT "Transaction_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("Exercise", "KhdaName", "KulAkhrajat", "KulAmdan", "KulMaizan", "SaafiAmdan", "Synced", "SyncedAt", "ZoneName", "createdAt", "date", "id", "updatedAt", "userID") SELECT "Exercise", "KhdaName", "KulAkhrajat", "KulAmdan", "KulMaizan", "SaafiAmdan", "Synced", "SyncedAt", "ZoneName", "createdAt", "date", "id", "updatedAt", "userID" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
