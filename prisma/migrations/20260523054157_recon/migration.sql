/*
  Warnings:

  - Changed the type of `sumber` on the `transaction_audit_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "transaction_audit_logs" DROP COLUMN "sumber",
ADD COLUMN     "sumber" "TransactionSource" NOT NULL;
