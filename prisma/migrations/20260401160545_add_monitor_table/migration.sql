/*
  Warnings:

  - You are about to drop the column `message` on the `Log` table. All the data in the column will be lost.
  - Added the required column `responseTime` to the `Log` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Log" DROP COLUMN "message",
ADD COLUMN     "error" TEXT,
ADD COLUMN     "responseTime" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "history" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "history_url_key" ON "history"("url");
