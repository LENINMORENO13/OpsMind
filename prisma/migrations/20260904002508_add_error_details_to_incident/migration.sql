/*
  Warnings:

  - You are about to drop the column `monitorId` on the `AIInsight` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[incidentId]` on the table `AIInsight` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `incidentId` to the `AIInsight` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'RESOLVED', 'IGNORED');

-- DropForeignKey
ALTER TABLE "AIInsight" DROP CONSTRAINT "AIInsight_monitorId_fkey";

-- AlterTable
ALTER TABLE "AIInsight" DROP COLUMN "monitorId",
ADD COLUMN     "incidentId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Incident" (
    "id" SERIAL NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "downtime" INTEGER,
    "errorDetails" TEXT,
    "monitorId" INTEGER NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResolutionLog" (
    "id" SERIAL NOT NULL,
    "rootCause" TEXT NOT NULL,
    "actionTaken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incidentId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "ResolutionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResolutionLog_incidentId_key" ON "ResolutionLog"("incidentId");

-- CreateIndex
CREATE UNIQUE INDEX "AIInsight_incidentId_key" ON "AIInsight"("incidentId");

-- AddForeignKey
ALTER TABLE "AIInsight" ADD CONSTRAINT "AIInsight_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResolutionLog" ADD CONSTRAINT "ResolutionLog_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResolutionLog" ADD CONSTRAINT "ResolutionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
