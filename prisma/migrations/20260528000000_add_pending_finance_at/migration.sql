ALTER TABLE "shift_reports" ADD COLUMN "pending_finance_at" TIMESTAMP(3);

-- Backfill data lama dari tabel approvals
UPDATE "shift_reports" sr
SET "pending_finance_at" = (
  SELECT a."timestamp"
  FROM "approvals" a
  JOIN "users" u ON u.id = a.approver_id
  WHERE a.shift_id = sr.id
    AND a.action = 'APPROVE'
    AND u.role = 'HEAD_CASHIER'
  ORDER BY a."timestamp" DESC
  LIMIT 1
)
WHERE sr.status IN ('PENDING_FINANCE', 'CLOSED')
  AND sr."pending_finance_at" IS NULL;