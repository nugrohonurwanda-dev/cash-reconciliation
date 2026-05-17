-- Migration: 20260512000000_add_indexes
-- Menambahkan index untuk kolom yang sering dipakai di WHERE clause
-- Dijalankan via: npx prisma migrate deploy

-- shift_reports: composite index untuk filter kasir + status
-- Covers query: WHERE opened_by = ? AND status = ?
CREATE INDEX IF NOT EXISTS "shift_reports_opened_by_status_idx"
  ON "shift_reports"("opened_by", "status");

-- shift_reports: index tanggal untuk range query
-- Covers query: WHERE shift_date >= ? AND shift_date < ?
CREATE INDEX IF NOT EXISTS "shift_reports_shift_date_idx"
  ON "shift_reports"("shift_date");

-- shift_reports: dashboard query — kasir lihat shift terbaru
-- Covers query: WHERE opened_by = ? ORDER BY opened_at DESC
CREATE INDEX IF NOT EXISTS "shift_reports_opened_by_opened_at_idx"
  ON "shift_reports"("opened_by", "opened_at" DESC);

-- transaction_lines: FK lookup dari shift
CREATE INDEX IF NOT EXISTS "transaction_lines_shift_id_idx"
  ON "transaction_lines"("shift_id");

-- special_logs: FK lookup dari shift dan creator
CREATE INDEX IF NOT EXISTS "special_logs_shift_id_idx"
  ON "special_logs"("shift_id");

CREATE INDEX IF NOT EXISTS "special_logs_created_by_idx"
  ON "special_logs"("created_by");

-- approvals: FK lookup dari shift dan approver
CREATE INDEX IF NOT EXISTS "approvals_shift_id_idx"
  ON "approvals"("shift_id");

CREATE INDEX IF NOT EXISTS "approvals_approver_id_idx"
  ON "approvals"("approver_id");
