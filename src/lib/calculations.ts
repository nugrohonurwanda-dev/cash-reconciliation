// src/lib/calculations.ts
import { Decimal } from "@prisma/client/runtime/library";
import { TransactionLine, PaymentCategory } from "@prisma/client";

export const VARIANCE_THRESHOLD = new Decimal(50000); // Rp 50.000

export type ReconciliationSummary = {
  kategori: PaymentCategory;
  esb: Decimal;
  fisik: Decimal;
  selisih: Decimal;
}[];

export type ShiftTotals = {
  total_esb: Decimal;
  total_fisik: Decimal;
  total_selisih: Decimal;
  per_kategori: ReconciliationSummary;
  is_variance_exceeded: boolean;
};

/**
 * Hitung rekonsiliasi dari transaction_lines.
 * Semua kalkulasi dilakukan server-side — tidak boleh di client.
 */
export function calculateReconciliation(lines: TransactionLine[]): ShiftTotals {
  const categories = Object.values(PaymentCategory);

  const per_kategori: ReconciliationSummary = categories.map((kategori) => {
    const esb = lines
      .filter((l) => l.sumber === "ESB" && l.kategori === kategori)
      .reduce((sum, l) => sum.plus(l.nilai), new Decimal(0));

    const fisik = lines
      .filter((l) => l.sumber === "FISIK" && l.kategori === kategori)
      .reduce((sum, l) => sum.plus(l.nilai), new Decimal(0));

    const selisih = fisik.minus(esb);

    return { kategori, esb, fisik, selisih };
  });

  const total_esb = per_kategori.reduce(
    (sum, r) => sum.plus(r.esb),
    new Decimal(0),
  );
  const total_fisik = per_kategori.reduce(
    (sum, r) => sum.plus(r.fisik),
    new Decimal(0),
  );
  const total_selisih = total_fisik.minus(total_esb);

  const is_variance_exceeded =
    total_selisih.isNegative() &&
    total_selisih.abs().greaterThan(VARIANCE_THRESHOLD);

  return {
    total_esb,
    total_fisik,
    total_selisih,
    per_kategori,
    is_variance_exceeded,
  };
}

export type DailyAccumulation = {
  shift_1: ShiftTotals | null;
  shift_2: ShiftTotals | null;
  combined: {
    total_esb: Decimal;
    total_fisik: Decimal;
    total_selisih: Decimal;
    per_kategori: ReconciliationSummary;
  };
};

/**
 * Hitung akumulasi harian dari dua shift.
 * Shift 1 dan Shift 2 masing-masing dihitung independen,
 * lalu digabung untuk total hari.
 *
 * @param shift1Lines - transaction_lines dari Shift 1 (null kalau belum ada)
 * @param shift2Lines - transaction_lines dari Shift 2 (shift yang sedang dilihat)
 */
export function calculateDailyAccumulation(
  shift1Lines: TransactionLine[] | null,
  shift2Lines: TransactionLine[],
): DailyAccumulation {
  const shift1 = shift1Lines ? calculateReconciliation(shift1Lines) : null;
  const shift2 = calculateReconciliation(shift2Lines);

  // Gabungkan semua lines dari kedua shift untuk kalkulasi combined
  const allLines = [...(shift1Lines ?? []), ...shift2Lines];
  const categories = Object.values(PaymentCategory);

  const per_kategori: ReconciliationSummary = categories.map((kategori) => {
    const esb = allLines
      .filter((l) => l.sumber === "ESB" && l.kategori === kategori)
      .reduce((sum, l) => sum.plus(l.nilai), new Decimal(0));

    const fisik = allLines
      .filter((l) => l.sumber === "FISIK" && l.kategori === kategori)
      .reduce((sum, l) => sum.plus(l.nilai), new Decimal(0));

    const selisih = fisik.minus(esb);

    return { kategori, esb, fisik, selisih };
  });

  const total_esb = per_kategori.reduce(
    (sum, r) => sum.plus(r.esb),
    new Decimal(0),
  );
  const total_fisik = per_kategori.reduce(
    (sum, r) => sum.plus(r.fisik),
    new Decimal(0),
  );
  const total_selisih = total_fisik.minus(total_esb);

  return {
    shift_1: shift1,
    shift_2: shift2,
    combined: {
      total_esb,
      total_fisik,
      total_selisih,
      per_kategori,
    },
  };
}
