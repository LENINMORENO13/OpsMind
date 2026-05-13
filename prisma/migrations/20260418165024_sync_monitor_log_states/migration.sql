/*
  Warnings:

  - The `state` column on the `Log` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('UP', 'DOWN', 'DEGRADED', 'PENDING');

-- CreateEnum
CREATE TYPE "TrendStatus" AS ENUM ('RECOVERED', 'DROP_DETECTED', 'STABLE', 'OFFLINE');

-- AlterTable
ALTER TABLE "Log" ADD COLUMN     "trend" "TrendStatus" NOT NULL DEFAULT 'STABLE',
DROP COLUMN "state",
ADD COLUMN     "state" "ServiceStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Monitor" ADD COLUMN     "lastStatus" "ServiceStatus" NOT NULL DEFAULT 'PENDING';
