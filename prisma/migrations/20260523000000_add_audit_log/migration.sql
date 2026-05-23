-- Migration: add transaction_audit_logs table for edit audit trail
-- Each time a cashier or head-cashier replaces transaction lines,
-- a row is written here with old + new state as JSON snapshots.

CREATE TABLE "transaction_audit_logs" (
    "id"         TEXT NOT NULL,
    "shift_id"   TEXT NOT NULL,
    "changed_by" TEXT NOT NULL,
    "sumber"     TEXT NOT NULL,
    "reason"     TEXT,
    "old_lines"  JSONB NOT NULL,
    "new_lines"  JSONB NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "transaction_audit_logs_shift_id_idx"    ON "transaction_audit_logs"("shift_id");
CREATE INDEX "transaction_audit_logs_changed_by_idx"  ON "transaction_audit_logs"("changed_by");

ALTER TABLE "transaction_audit_logs"
    ADD CONSTRAINT "transaction_audit_logs_shift_id_fkey"
        FOREIGN KEY ("shift_id")
        REFERENCES "shift_reports"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "transaction_audit_logs"
    ADD CONSTRAINT "transaction_audit_logs_changed_by_fkey"
        FOREIGN KEY ("changed_by")
        REFERENCES "users"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
