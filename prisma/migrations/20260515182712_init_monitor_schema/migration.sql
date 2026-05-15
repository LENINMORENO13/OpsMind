/*
  Warnings:

  - You are about to drop the column `url` on the `Log` table. All the data in the column will be lost.
  - Added the required column `monitorId` to the `Log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Monitor` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CriticalityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "Log" DROP COLUMN "url",
ADD COLUMN     "monitorId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Monitor" ADD COLUMN     "checkInterval" INTEGER NOT NULL DEFAULT 300,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "AIInsight" (
    "id" SERIAL NOT NULL,
    "analysis" TEXT NOT NULL,
    "suggestion" TEXT,
    "criticality" "CriticalityLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monitorId" INTEGER NOT NULL,

    CONSTRAINT "AIInsight_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Log" ADD CONSTRAINT "Log_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInsight" ADD CONSTRAINT "AIInsight_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
