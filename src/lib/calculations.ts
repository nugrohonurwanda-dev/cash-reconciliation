// src/lib/calculations.ts
/**
 * Semua kalkulasi finansial dilakukan server-side.
 * Menggunakan Prisma Decimal untuk presisi — JANGAN pakai float JS untuk uang.
 *
 * Alur rekonsiliasi:
 *   1. Kasir input data ESB (dari sistem POS) dan Fisik (hitung manual)
 *   2. Selisih = Fisik - ESB per kategori
 *   3. Jika selisih negatif dan abs > Rp 50.000 → wajib keterangan
 *
 * Definisi Sales / Omzet Bersih:
 *   omzet_bersih = total_fisik (semua kategori, TERMASUK deposit) - total_void - total_discount
 *   other_cost   = dicatat terpisah, TIDAK mengurangi omzet (pengeluaran operasional)
 *   deposit      = masuk omzet (total_fisik_sales mencakup DEPOSIT_BANK & DEPOSIT_CASH)
 */

import { Decimal } from '@prisma/client/runtime/library'
import { TransactionLine, PaymentCategory, SpecialLog, SpecialLogType } from '@prisma/client'
import { SALES_CATEGORIES, NON_SALES_CATEGORIES, VARIANCE_THRESHOLD_IDR } from '@/lib/constants'

export const VARIANCE_THRESHOLD = new Decimal(VARIANCE_THRESHOLD_IDR)

// ─── Types ────────────────────────────────────────────────────────────────────

export type CategorySummary = {
  kategori: PaymentCategory
  esb: Decimal
  fisik: Decimal
  selisih: Decimal // fisik - esb (positif = lebih, negatif = kurang)
}

export type ShiftTotals = {
  // Rekonsiliasi per kategori (semua 15 kategori)
  per_kategori: CategorySummary[]

  // Total ESB semua kategori
  total_esb: Decimal

  // Total Fisik semua kategori (termasuk deposit)
  total_fisik: Decimal

  // Total selisih = total_fisik - total_esb
  total_selisih: Decimal

  // Total Fisik hanya kategori sales (exclude deposit)
  total_fisik_sales: Decimal

  // Total ESB hanya kategori sales
  total_esb_sales: Decimal

  // Deposit terpisah (informatif, bukan sales)
  total_deposit_fisik: Decimal
  total_deposit_esb: Decimal

  // Flag: selisih minus melebihi threshold → wajib keterangan
  is_variance_exceeded: boolean
}

export type SalesBreakdown = {
  // Omzet kotor dari penjualan (fisik, exclude deposit)
  omzet_kotor: Decimal

  // Pengurangan dari omzet
  total_void: Decimal
  total_discount: Decimal

  // Omzet bersih = omzet_kotor - void - discount
  omzet_bersih: Decimal

  // Other cost: pengeluaran operasional, TIDAK mengurangi omzet
  total_other_cost: Decimal

  // Deposit: dicatat informatif; kini MASUK dalam omzet_kotor (total_fisik_sales)
  total_deposit: Decimal
}

export type DailyAccumulation = {
  shift_1: ShiftTotals | null
  shift_2: ShiftTotals | null
  combined: {
    total_esb: Decimal
    total_fisik: Decimal
    total_selisih: Decimal
    total_fisik_sales: Decimal
    per_kategori: CategorySummary[]
  }
}

// ─── Core: Rekonsiliasi ───────────────────────────────────────────────────────

/**
 * Hitung rekonsiliasi ESB vs Fisik dari transaction_lines satu shift.
 * Semua 15 kategori selalu ada di hasil, nilai 0 jika tidak ada data.
 */
export function calculateReconciliation(lines: TransactionLine[]): ShiftTotals {
  const categories = Object.values(PaymentCategory)

  const per_kategori: CategorySummary[] = categories.map((kategori) => {
    const esb = lines
      .filter((l) => l.sumber === 'ESB' && l.kategori === kategori)
      .reduce((sum, l) => sum.plus(l.nilai), new Decimal(0))

    const fisik = lines
      .filter((l) => l.sumber === 'FISIK' && l.kategori === kategori)
      .reduce((sum, l) => sum.plus(l.nilai), new Decimal(0))

    return { kategori, esb, fisik, selisih: fisik.minus(esb) }
  })

  const total_esb = per_kategori.reduce((s, r) => s.plus(r.esb), new Decimal(0))
  const total_fisik = per_kategori.reduce((s, r) => s.plus(r.fisik), new Decimal(0))
  const total_selisih = total_fisik.minus(total_esb)

  // Sales only (exclude deposit)
  const sales = per_kategori.filter((r) =>
    SALES_CATEGORIES.includes(r.kategori),
  )
  const total_fisik_sales = sales.reduce((s, r) => s.plus(r.fisik), new Decimal(0))
  const total_esb_sales = sales.reduce((s, r) => s.plus(r.esb), new Decimal(0))

  // Deposit totals
  const deposits = per_kategori.filter((r) =>
    NON_SALES_CATEGORIES.includes(r.kategori),
  )
  const total_deposit_fisik = deposits.reduce((s, r) => s.plus(r.fisik), new Decimal(0))
  const total_deposit_esb = deposits.reduce((s, r) => s.plus(r.esb), new Decimal(0))

  const is_variance_exceeded =
    total_selisih.isNegative() &&
    total_selisih.abs().greaterThan(VARIANCE_THRESHOLD)

  return {
    per_kategori,
    total_esb,
    total_fisik,
    total_selisih,
    total_fisik_sales,
    total_esb_sales,
    total_deposit_fisik,
    total_deposit_esb,
    is_variance_exceeded,
  }
}

// ─── Sales Breakdown (untuk PDF dan Finance summary) ─────────────────────────

/**
 * Hitung omzet bersih dan breakdown komponen sales dari satu shift.
 * Deposit (DEPOSIT_BANK / DEPOSIT_CASH) MASUK dalam omzet_kotor.
 *
 * other_cost TIDAK mengurangi omzet — ini adalah pengeluaran operasional
 * yang dicatat sebagai informasi terpisah (bukan deduction dari revenue).
 */
export function calculateSalesBreakdown(
  lines: TransactionLine[],
  special_logs: SpecialLog[],
): SalesBreakdown {
  const recon = calculateReconciliation(lines)

  const safeDecimal = (v: unknown): Decimal =>
    new Decimal(v == null ? 0 : String(v))

  const sumByTipe = (tipe: SpecialLogType): Decimal =>
    special_logs
      .filter((l) => l.tipe === tipe)
      .reduce((sum, l) => sum.plus(safeDecimal(l.nominal)), new Decimal(0))

  const total_void = sumByTipe(SpecialLogType.VOID)
  const total_discount = sumByTipe(SpecialLogType.DISCOUNT)
  const total_other_cost = sumByTipe(SpecialLogType.OTHER_COST)

  const omzet_kotor = recon.total_fisik_sales
  const omzet_bersih = omzet_kotor.minus(total_void).minus(total_discount)

  // Total deposit (bank + cash) dari fisik
  const total_deposit = recon.total_deposit_fisik

  return {
    omzet_kotor,
    total_void,
    total_discount,
    omzet_bersih,
    total_other_cost,
    total_deposit,
  }
}

// ─── Daily Accumulation (Shift 1 + Shift 2) ──────────────────────────────────

/**
 * Gabungkan data dua shift dalam satu hari.
 * Dipakai di PDF Shift 2 untuk tampilkan total harian.
 */
export function calculateDailyAccumulation(
  shift1Lines: TransactionLine[] | null,
  shift2Lines: TransactionLine[],
): DailyAccumulation {
  const shift_1 = shift1Lines ? calculateReconciliation(shift1Lines) : null
  const shift_2 = calculateReconciliation(shift2Lines)

  const allLines = [...(shift1Lines ?? []), ...shift2Lines]
  const categories = Object.values(PaymentCategory)

  const per_kategori: CategorySummary[] = categories.map((kategori) => {
    const esb = allLines
      .filter((l) => l.sumber === 'ESB' && l.kategori === kategori)
      .reduce((sum, l) => sum.plus(l.nilai), new Decimal(0))
    const fisik = allLines
      .filter((l) => l.sumber === 'FISIK' && l.kategori === kategori)
      .reduce((sum, l) => sum.plus(l.nilai), new Decimal(0))
    return { kategori, esb, fisik, selisih: fisik.minus(esb) }
  })

  const total_esb = per_kategori.reduce((s, r) => s.plus(r.esb), new Decimal(0))
  const total_fisik = per_kategori.reduce((s, r) => s.plus(r.fisik), new Decimal(0))
  const total_selisih = total_fisik.minus(total_esb)

  const total_fisik_sales = per_kategori
    .filter((r) => SALES_CATEGORIES.includes(r.kategori))
    .reduce((s, r) => s.plus(r.fisik), new Decimal(0))

  return {
    shift_1,
    shift_2,
    combined: { total_esb, total_fisik, total_selisih, total_fisik_sales, per_kategori },
  }
}
