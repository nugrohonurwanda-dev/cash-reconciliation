-- CreateEnum
CREATE TYPE "ShiftPeriod" AS ENUM ('SHIFT_1', 'SHIFT_2');

-- AlterTable
ALTER TABLE "shift_reports" ADD COLUMN "shift_period" "ShiftPeriod" NOT NULL DEFAULT 'SHIFT_1';