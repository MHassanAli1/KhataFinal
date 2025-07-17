-- CreateTable
CREATE TABLE "Others" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "OthersTitles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

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
    "othersId" INTEGER,
    "transactionId" INTEGER NOT NULL,
    CONSTRAINT "Akhrajat_othersId_fkey" FOREIGN KEY ("othersId") REFERENCES "Others" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Akhrajat_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Akhrajat" ("amount", "date", "description", "id", "isGari", "isOther", "title", "transactionId") SELECT "amount", "date", "description", "id", "isGari", "isOther", "title", "transactionId" FROM "Akhrajat";
DROP TABLE "Akhrajat";
ALTER TABLE "new_Akhrajat" RENAME TO "Akhrajat";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Others_title_key" ON "Others"("title");

-- CreateIndex
CREATE UNIQUE INDEX "OthersTitles_name_key" ON "OthersTitles"("name");
