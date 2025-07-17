/*
  Warnings:

  - You are about to drop the `Others` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `othersId` on the `Akhrajat` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Others_title_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Others";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Akhrajat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" BIGINT NOT NULL,
    "date" DATETIME NOT NULL,
    "isGari" BOOLEAN DEFAULT false,
    "isOther" BOOLEAN DEFAULT false,
    "othersTitlesId" INTEGER,
    "transactionId" INTEGER NOT NULL,
    CONSTRAINT "Akhrajat_othersTitlesId_fkey" FOREIGN KEY ("othersTitlesId") REFERENCES "OthersTitles" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Akhrajat_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Akhrajat" ("amount", "date", "description", "id", "isGari", "isOther", "title", "transactionId") SELECT "amount", "date", "description", "id", "isGari", "isOther", "title", "transactionId" FROM "Akhrajat";
DROP TABLE "Akhrajat";
ALTER TABLE "new_Akhrajat" RENAME TO "Akhrajat";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
