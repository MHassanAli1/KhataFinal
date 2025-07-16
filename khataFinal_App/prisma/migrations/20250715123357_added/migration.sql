-- AlterTable
ALTER TABLE "Akhrajat" ADD COLUMN "isGari" BOOLEAN DEFAULT false;
ALTER TABLE "Akhrajat" ADD COLUMN "isOther" BOOLEAN DEFAULT false;

-- CreateTable
CREATE TABLE "GariExpense" (
    "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "quantity" INTEGER,
    "part" TEXT,
    "akhrajatId" INTEGER NOT NULL,
    CONSTRAINT "GariExpense_akhrajatId_fkey" FOREIGN KEY ("akhrajatId") REFERENCES "Akhrajat" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GariTitle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "GariExpenseTypeTitle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "GariParts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AkhrajatTitle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "isGari" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_AkhrajatTitle" ("id", "name") SELECT "id", "name" FROM "AkhrajatTitle";
DROP TABLE "AkhrajatTitle";
ALTER TABLE "new_AkhrajatTitle" RENAME TO "AkhrajatTitle";
CREATE UNIQUE INDEX "AkhrajatTitle_name_key" ON "AkhrajatTitle"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "GariTitle_name_key" ON "GariTitle"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GariExpenseTypeTitle_name_key" ON "GariExpenseTypeTitle"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GariParts_name_key" ON "GariParts"("name");
