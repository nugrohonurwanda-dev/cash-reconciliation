-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CASHIER', 'HEAD_CASHIER', 'FINANCE');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'PENDING', 'PENDING_FINANCE', 'CLOSED');

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('ESB', 'FISIK');

-- CreateEnum
CREATE TYPE "PaymentCategory" AS ENUM ('CASH', 'EDC_BRI', 'EDC_BNI', 'EDC_BCA', 'EDC_BSI', 'QRIS_BRI', 'QRIS_BNI', 'QRIS_BCA', 'QRIS_BSI', 'TRANSFER_BRI', 'TRANSFER_BNI', 'TRANSFER_BCA', 'TRANSFER_BSI', 'DEPOSIT_BANK', 'DEPOSIT_CASH');

-- CreateEnum
CREATE TYPE "SpecialLogType" AS ENUM ('VOID', 'DISCOUNT', 'OTHER_COST');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('APPROVE', 'REJECT', 'CLOSE');

-- CreateEnum
CREATE TYPE "ShiftPeriod" AS ENUM ('SHIFT_1', 'SHIFT_2');

-- CreateEnum
CREATE TYPE "NotifType" AS ENUM ('SHIFT_REJECTED', 'SHIFT_APPROVED', 'SHIFT_PENDING_REVIEW', 'SHIFT_CLOSED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_reports" (
    "id" TEXT NOT NULL,
    "shift_date" DATE NOT NULL,
    "opened_by" TEXT NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "modal_awal" DECIMAL(15,2) NOT NULL DEFAULT 1000000,
    "status" "ShiftStatus" NOT NULL DEFAULT 'OPEN',
    "shift_period" "ShiftPeriod" NOT NULL DEFAULT 'SHIFT_1',
    "variance_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_lines" (
    "id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "sumber" "TransactionSource" NOT NULL,
    "kategori" "PaymentCategory" NOT NULL,
    "nilai" DECIMAL(15,2) NOT NULL,
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "special_logs" (
    "id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "tipe" "SpecialLogType" NOT NULL,
    "nomor_bill" TEXT,
    "kategori_biaya" TEXT,
    "nominal" DECIMAL(15,2) NOT NULL,
    "keterangan" TEXT,
    "alasan" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "special_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "approver_id" TEXT NOT NULL,
    "action" "ApprovalAction" NOT NULL,
    "catatan" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotifType" NOT NULL,
    "shift_id" TEXT,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "shift_reports_opened_by_status_idx" ON "shift_reports"("opened_by", "status");

-- CreateIndex
CREATE INDEX "shift_reports_shift_date_idx" ON "shift_reports"("shift_date");

-- CreateIndex
CREATE INDEX "shift_reports_opened_by_opened_at_idx" ON "shift_reports"("opened_by", "opened_at" DESC);

-- CreateIndex
CREATE INDEX "transaction_lines_shift_id_idx" ON "transaction_lines"("shift_id");

-- CreateIndex
CREATE INDEX "special_logs_shift_id_idx" ON "special_logs"("shift_id");

-- CreateIndex
CREATE INDEX "special_logs_created_by_idx" ON "special_logs"("created_by");

-- CreateIndex
CREATE INDEX "approvals_shift_id_idx" ON "approvals"("shift_id");

-- CreateIndex
CREATE INDEX "approvals_approver_id_idx" ON "approvals"("approver_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- AddForeignKey
ALTER TABLE "shift_reports" ADD CONSTRAINT "shift_reports_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_lines" ADD CONSTRAINT "transaction_lines_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shift_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_logs" ADD CONSTRAINT "special_logs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_logs" ADD CONSTRAINT "special_logs_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shift_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shift_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
