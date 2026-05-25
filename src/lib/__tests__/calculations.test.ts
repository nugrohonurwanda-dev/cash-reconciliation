/**
 * Unit tests untuk src/lib/calculations.ts
 *
 * Ini adalah kode keuangan — setiap edge case harus dicakup.
 * Filosofi testing di sini:
 *   1. Happy path: input normal, hasil sesuai ekspektasi
 *   2. Edge case: nilai 0, semua kosong, hanya satu sumber data
 *   3. Business rule: threshold selisih, deposit bukan sales, other_cost bukan deduction
 *   4. Precision: Decimal arithmetic, bukan float
 *
 * @prisma/client di-mock karena generated client tidak tersedia di test environment.
 * Enum values diambil langsung dari schema.prisma (sumber kebenaran tunggal).
 */

import { describe, it, expect, vi } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'

// ─── Mock @prisma/client ──────────────────────────────────────────────────────
// vi.mock di-hoist ke atas oleh vitest, sehingga dijalankan sebelum import lainnya.
// Enum values harus sesuai dengan prisma/schema.prisma — jangan ubah sembarangan.

vi.mock('@prisma/client', () => {
  const PaymentCategory = {
    CASH: 'CASH',
    EDC_BRI: 'EDC_BRI',
    EDC_BNI: 'EDC_BNI',
    EDC_BCA: 'EDC_BCA',
    EDC_BSI: 'EDC_BSI',
    QRIS_BRI: 'QRIS_BRI',
    QRIS_BNI: 'QRIS_BNI',
    QRIS_BCA: 'QRIS_BCA',
    QRIS_BSI: 'QRIS_BSI',
    TRANSFER_BRI: 'TRANSFER_BRI',
    TRANSFER_BNI: 'TRANSFER_BNI',
    TRANSFER_BCA: 'TRANSFER_BCA',
    TRANSFER_BSI: 'TRANSFER_BSI',
    DEPOSIT_BANK: 'DEPOSIT_BANK',
    DEPOSIT_CASH: 'DEPOSIT_CASH',
  } as const

  const SpecialLogType = {
    VOID: 'VOID',
    DISCOUNT: 'DISCOUNT',
    OTHER_COST: 'OTHER_COST',
  } as const

  const ShiftStatus = {
    OPEN: 'OPEN',
    PENDING: 'PENDING',
    PENDING_FINANCE: 'PENDING_FINANCE',
    CLOSED: 'CLOSED',
  } as const

  return { PaymentCategory, SpecialLogType, ShiftStatus }
})

// Import setelah mock didaftarkan
import {
  calculateReconciliation,
  calculateSalesBreakdown,
  calculateDailyAccumulation,
  VARIANCE_THRESHOLD,
} from '@/lib/calculations'
import type { TransactionLine, SpecialLog } from '@prisma/client'
import { PaymentCategory, SpecialLogType } from '@prisma/client'

// ─── Helper Factories ─────────────────────────────────────────────────────────

type TxSource = 'ESB' | 'FISIK'

function makeLine(o: {
  sumber: TxSource
  kategori: keyof typeof PaymentCategory
  nilai: number
  catatan?: string
}): TransactionLine {
  return {
    id: 'test-id',
    shift_id: 'shift-001',
    catatan: o.catatan ?? null,
    created_at: new Date(),
    sumber: o.sumber as TransactionLine['sumber'],
    kategori: o.kategori as TransactionLine['kategori'],
    nilai: new Decimal(o.nilai),
  }
}

function makeLog(o: {
  tipe: keyof typeof SpecialLogType
  nominal: number
}): SpecialLog {
  return {
    id: 'log-id',
    shift_id: 'shift-001',
    nomor_bill: null,
    kategori_biaya: null,
    keterangan: null,
    alasan: null,
    created_by: 'user-001',
    created_at: new Date(),
    tipe: o.tipe as SpecialLog['tipe'],
    nominal: new Decimal(o.nominal),
  }
}

function getKategori(
  result: ReturnType<typeof calculateReconciliation>,
  kategori: keyof typeof PaymentCategory,
) {
  return result.per_kategori.find((r) => r.kategori === kategori)!
}

// ─── calculateReconciliation ──────────────────────────────────────────────────

describe('calculateReconciliation', () => {

  describe('input kosong', () => {
    it('mengembalikan semua nilai 0 jika tidak ada transaction lines', () => {
      const result = calculateReconciliation([])

      expect(result.total_esb.toNumber()).toBe(0)
      expect(result.total_fisik.toNumber()).toBe(0)
      expect(result.total_selisih.toNumber()).toBe(0)
      expect(result.total_fisik_sales.toNumber()).toBe(0)
      expect(result.total_esb_sales.toNumber()).toBe(0)
      expect(result.total_deposit_fisik.toNumber()).toBe(0)
      expect(result.total_deposit_esb.toNumber()).toBe(0)
      expect(result.is_variance_exceeded).toBe(false)
    })

    it('selalu mengembalikan 15 kategori meski data kosong', () => {
      const result = calculateReconciliation([])
      expect(result.per_kategori).toHaveLength(15)
    })
  })

  describe('kalkulasi selisih per kategori', () => {
    it('selisih positif jika fisik > esb', () => {
      const lines = [
        makeLine({ sumber: 'ESB',   kategori: 'CASH', nilai: 500_000 }),
        makeLine({ sumber: 'FISIK', kategori: 'CASH', nilai: 550_000 }),
      ]
      const result = calculateReconciliation(lines)
      const cash = getKategori(result, 'CASH')

      expect(cash.esb.toNumber()).toBe(500_000)
      expect(cash.fisik.toNumber()).toBe(550_000)
      expect(cash.selisih.toNumber()).toBe(50_000) // fisik - esb
    })

    it('selisih negatif jika fisik < esb', () => {
      const lines = [
        makeLine({ sumber: 'ESB',   kategori: 'CASH', nilai: 600_000 }),
        makeLine({ sumber: 'FISIK', kategori: 'CASH', nilai: 540_000 }),
      ]
      const result = calculateReconciliation(lines)
      const cash = getKategori(result, 'CASH')

      expect(cash.selisih.toNumber()).toBe(-60_000)
    })

    it('selisih nol jika esb === fisik', () => {
      const lines = [
        makeLine({ sumber: 'ESB',   kategori: 'EDC_BCA', nilai: 1_000_000 }),
        makeLine({ sumber: 'FISIK', kategori: 'EDC_BCA', nilai: 1_000_000 }),
      ]
      const result = calculateReconciliation(lines)
      const edc = getKategori(result, 'EDC_BCA')

      expect(edc.selisih.toNumber()).toBe(0)
    })

    it('kategori yang tidak ada di lines bernilai 0', () => {
      const lines = [
        makeLine({ sumber: 'FISIK', kategori: 'CASH', nilai: 100_000 }),
      ]
      const result = calculateReconciliation(lines)
      const qris = getKategori(result, 'QRIS_BRI')

      expect(qris.esb.toNumber()).toBe(0)
      expect(qris.fisik.toNumber()).toBe(0)
      expect(qris.selisih.toNumber()).toBe(0)
    })

    it('menjumlahkan total_esb dan total_fisik lintas kategori', () => {
      const lines = [
        makeLine({ sumber: 'ESB',   kategori: 'CASH',    nilai: 500_000 }),
        makeLine({ sumber: 'ESB',   kategori: 'EDC_BRI', nilai: 300_000 }),
        makeLine({ sumber: 'FISIK', kategori: 'CASH',    nilai: 510_000 }),
        makeLine({ sumber: 'FISIK', kategori: 'EDC_BRI', nilai: 290_000 }),
      ]
      const result = calculateReconciliation(lines)

      expect(result.total_esb.toNumber()).toBe(800_000)
      expect(result.total_fisik.toNumber()).toBe(800_000)
      expect(result.total_selisih.toNumber()).toBe(0)
    })

    it('total_selisih = total_fisik - total_esb (negatif)', () => {
      const lines = [
        makeLine({ sumber: 'ESB',   kategori: 'CASH', nilai: 1_000_000 }),
        makeLine({ sumber: 'FISIK', kategori: 'CASH', nilai:   900_000 }),
      ]
      const result = calculateReconciliation(lines)

      expect(result.total_selisih.toNumber()).toBe(-100_000)
    })
  })

  describe('deposit masuk sales (bukan dikecualikan)', () => {
    it('DEPOSIT_BANK masuk total_fisik_sales', () => {
      const lines = [
        makeLine({ sumber: 'FISIK', kategori: 'CASH',         nilai: 500_000 }),
        makeLine({ sumber: 'FISIK', kategori: 'DEPOSIT_BANK', nilai: 200_000 }),
        makeLine({ sumber: 'ESB',   kategori: 'CASH',         nilai: 500_000 }),
        makeLine({ sumber: 'ESB',   kategori: 'DEPOSIT_BANK', nilai: 200_000 }),
      ]
      const result = calculateReconciliation(lines)

      // Deposit kini masuk total_fisik_sales
      expect(result.total_fisik_sales.toNumber()).toBe(700_000)
      expect(result.total_esb_sales.toNumber()).toBe(700_000)
      // NON_SALES kosong → deposit tidak masuk total_deposit
      expect(result.total_deposit_fisik.toNumber()).toBe(0)
      expect(result.total_deposit_esb.toNumber()).toBe(0)
    })

    it('DEPOSIT_CASH juga masuk sales', () => {
      const lines = [
        makeLine({ sumber: 'FISIK', kategori: 'DEPOSIT_CASH', nilai: 150_000 }),
      ]
      const result = calculateReconciliation(lines)

      expect(result.total_fisik_sales.toNumber()).toBe(150_000)
      expect(result.total_deposit_fisik.toNumber()).toBe(0)
    })
  })

  describe('variance threshold — business rule kritis', () => {
    it('is_variance_exceeded = false jika selisih positif (fisik > esb)', () => {
      const lines = [
        makeLine({ sumber: 'ESB',   kategori: 'CASH', nilai: 1_000_000 }),
        makeLine({ sumber: 'FISIK', kategori: 'CASH', nilai: 1_100_000 }),
      ]
      const result = calculateReconciliation(lines)

      expect(result.is_variance_exceeded).toBe(false)
    })

    it('is_variance_exceeded = false jika selisih negatif tapi di bawah threshold', () => {
      const lines = [
        makeLine({ sumber: 'ESB',   kategori: 'CASH', nilai: 1_000_000 }),
        makeLine({ sumber: 'FISIK', kategori: 'CASH', nilai:   960_001 }), // selisih -39.999
      ]
      const result = calculateReconciliation(lines)

      expect(result.total_selisih.toNumber()).toBe(-39_999)
      expect(result.is_variance_exceeded).toBe(false)
    })

    it('is_variance_exceeded = false jika selisih negatif tepat di batas (= Rp 50.000)', () => {
      // greaterThan, bukan greaterThanOrEqual → tepat di batas = TIDAK exceeded
      const lines = [
        makeLine({ sumber: 'ESB',   kategori: 'CASH', nilai: 1_000_000 }),
        makeLine({ sumber: 'FISIK', kategori: 'CASH', nilai:   950_000 }), // tepat -50.000
      ]
      const result = calculateReconciliation(lines)

      expect(result.total_selisih.toNumber()).toBe(-50_000)
      expect(result.is_variance_exceeded).toBe(false)
    })

    it('is_variance_exceeded = true jika selisih negatif melewati threshold (> Rp 50.000)', () => {
      const lines = [
        makeLine({ sumber: 'ESB',   kategori: 'CASH', nilai: 1_000_000 }),
        makeLine({ sumber: 'FISIK', kategori: 'CASH', nilai:   949_999 }), // -50.001
      ]
      const result = calculateReconciliation(lines)

      expect(result.total_selisih.toNumber()).toBe(-50_001)
      expect(result.is_variance_exceeded).toBe(true)
    })

    it('VARIANCE_THRESHOLD adalah Rp 50.000', () => {
      expect(VARIANCE_THRESHOLD.toNumber()).toBe(50_000)
    })
  })

  describe('presisi Decimal — tidak ada floating point error', () => {
    it('0.1 + 0.2 tidak menghasilkan 0.30000000000000004', () => {
      // Di JS float biasa: 100000.50 + 200000.30 = 300000.8000000001 (drift)
      const lines = [
        makeLine({ sumber: 'ESB',   kategori: 'CASH', nilai: 100_000.50 }),
        makeLine({ sumber: 'FISIK', kategori: 'CASH', nilai: 200_000.30 }),
      ]
      const result = calculateReconciliation(lines)

      // Decimal: 200000.30 - 100000.50 = 99999.80 tepat
      expect(result.total_selisih.toFixed(2)).toBe('99999.80')
    })
  })
})

// ─── calculateSalesBreakdown ──────────────────────────────────────────────────

describe('calculateSalesBreakdown', () => {

  describe('omzet bersih', () => {
    it('omzet_kotor = total_fisik_sales (semua kategori, termasuk deposit)', () => {
      const lines = [
        makeLine({ sumber: 'FISIK', kategori: 'CASH',         nilai: 2_000_000 }),
        makeLine({ sumber: 'FISIK', kategori: 'DEPOSIT_BANK', nilai:   500_000 }),
        makeLine({ sumber: 'ESB',   kategori: 'CASH',         nilai: 2_000_000 }),
      ]
      const result = calculateSalesBreakdown(lines, [])

      // Deposit sekarang masuk omzet
      expect(result.omzet_kotor.toNumber()).toBe(2_500_000)
    })

    it('omzet_bersih = omzet_kotor - void - discount', () => {
      const lines = [
        makeLine({ sumber: 'FISIK', kategori: 'CASH', nilai: 3_000_000 }),
        makeLine({ sumber: 'ESB',   kategori: 'CASH', nilai: 3_000_000 }),
      ]
      const logs = [
        makeLog({ tipe: 'VOID',     nominal: 150_000 }),
        makeLog({ tipe: 'DISCOUNT', nominal:  50_000 }),
      ]
      const result = calculateSalesBreakdown(lines, logs)

      expect(result.omzet_kotor.toNumber()).toBe(3_000_000)
      expect(result.total_void.toNumber()).toBe(150_000)
      expect(result.total_discount.toNumber()).toBe(50_000)
      expect(result.omzet_bersih.toNumber()).toBe(2_800_000)
    })

    it('OTHER_COST tidak mengurangi omzet_bersih — hanya dicatat informatif', () => {
      // Business rule kritis: other_cost adalah pengeluaran operasional,
      // BUKAN deduction dari revenue.
      const lines = [
        makeLine({ sumber: 'FISIK', kategori: 'CASH', nilai: 1_000_000 }),
        makeLine({ sumber: 'ESB',   kategori: 'CASH', nilai: 1_000_000 }),
      ]
      const logs = [
        makeLog({ tipe: 'OTHER_COST', nominal: 200_000 }),
      ]
      const result = calculateSalesBreakdown(lines, logs)

      expect(result.omzet_bersih.toNumber()).toBe(1_000_000) // tidak berubah!
      expect(result.total_other_cost.toNumber()).toBe(200_000)
    })
  })

  describe('tanpa special logs', () => {
    it('semua komponen nol jika tidak ada logs', () => {
      const lines = [makeLine({ sumber: 'FISIK', kategori: 'CASH', nilai: 500_000 })]
      const result = calculateSalesBreakdown(lines, [])

      expect(result.total_void.toNumber()).toBe(0)
      expect(result.total_discount.toNumber()).toBe(0)
      expect(result.total_other_cost.toNumber()).toBe(0)
      expect(result.omzet_bersih.toNumber()).toBe(500_000)
    })
  })

  describe('deposit di sales breakdown', () => {
    it('omzet_kotor TERMASUK deposit, total_deposit = 0 (NON_SALES kosong)', () => {
      const lines = [
        makeLine({ sumber: 'FISIK', kategori: 'DEPOSIT_BANK', nilai: 300_000 }),
        makeLine({ sumber: 'FISIK', kategori: 'DEPOSIT_CASH', nilai: 200_000 }),
        makeLine({ sumber: 'ESB',   kategori: 'DEPOSIT_BANK', nilai: 300_000 }),
      ]
      const result = calculateSalesBreakdown(lines, [])

      // Deposit kini masuk omzet
      expect(result.omzet_kotor.toNumber()).toBe(500_000)
      expect(result.omzet_bersih.toNumber()).toBe(500_000)
      // total_deposit = 0 karena NON_SALES kosong
      expect(result.total_deposit.toNumber()).toBe(0)
    })
  })

  describe('multiple void dan discount', () => {
    it('menjumlahkan semua void dan semua discount', () => {
      const lines = [
        makeLine({ sumber: 'FISIK', kategori: 'CASH', nilai: 5_000_000 }),
        makeLine({ sumber: 'ESB',   kategori: 'CASH', nilai: 5_000_000 }),
      ]
      const logs = [
        makeLog({ tipe: 'VOID',     nominal: 100_000 }),
        makeLog({ tipe: 'VOID',     nominal:  50_000 }),
        makeLog({ tipe: 'DISCOUNT', nominal:  25_000 }),
        makeLog({ tipe: 'DISCOUNT', nominal:  75_000 }),
      ]
      const result = calculateSalesBreakdown(lines, logs)

      expect(result.total_void.toNumber()).toBe(150_000)
      expect(result.total_discount.toNumber()).toBe(100_000)
      expect(result.omzet_bersih.toNumber()).toBe(4_750_000)
    })
  })
})

// ─── calculateDailyAccumulation ──────────────────────────────────────────────

describe('calculateDailyAccumulation', () => {

  describe('shift 1 dan shift 2 digabung', () => {
    it('combined total = shift1 + shift2', () => {
      const shift1Lines = [
        makeLine({ sumber: 'FISIK', kategori: 'CASH', nilai: 1_000_000 }),
        makeLine({ sumber: 'ESB',   kategori: 'CASH', nilai: 1_000_000 }),
      ]
      const shift2Lines = [
        makeLine({ sumber: 'FISIK', kategori: 'CASH', nilai: 1_500_000 }),
        makeLine({ sumber: 'ESB',   kategori: 'CASH', nilai: 1_500_000 }),
      ]
      const result = calculateDailyAccumulation(shift1Lines, shift2Lines)

      expect(result.combined.total_fisik.toNumber()).toBe(2_500_000)
      expect(result.combined.total_esb.toNumber()).toBe(2_500_000)
      expect(result.combined.total_selisih.toNumber()).toBe(0)
    })

    it('data shift_1 dan shift_2 dihitung secara terpisah', () => {
      const shift1Lines = [
        makeLine({ sumber: 'FISIK', kategori: 'CASH', nilai: 800_000 }),
      ]
      const shift2Lines = [
        makeLine({ sumber: 'FISIK', kategori: 'CASH', nilai: 600_000 }),
      ]
      const result = calculateDailyAccumulation(shift1Lines, shift2Lines)

      expect(result.shift_1).not.toBeNull()
      expect(result.shift_2).not.toBeNull()
      expect(result.shift_1!.total_fisik.toNumber()).toBe(800_000)
      expect(result.shift_2!.total_fisik.toNumber()).toBe(600_000)
    })

    it('shift_1 null jika tidak ada data shift 1', () => {
      const shift2Lines = [
        makeLine({ sumber: 'FISIK', kategori: 'CASH', nilai: 600_000 }),
      ]
      const result = calculateDailyAccumulation(null, shift2Lines)

      expect(result.shift_1).toBeNull()
      // combined tetap hanya berisi shift 2
      expect(result.combined.total_fisik.toNumber()).toBe(600_000)
    })
  })

  describe('combined per_kategori', () => {
    it('menjumlahkan per kategori dari kedua shift', () => {
      const shift1Lines = [
        makeLine({ sumber: 'FISIK', kategori: 'EDC_BRI', nilai: 400_000 }),
        makeLine({ sumber: 'ESB',   kategori: 'EDC_BRI', nilai: 400_000 }),
      ]
      const shift2Lines = [
        makeLine({ sumber: 'FISIK', kategori: 'EDC_BRI', nilai: 600_000 }),
        makeLine({ sumber: 'ESB',   kategori: 'EDC_BRI', nilai: 580_000 }),
      ]
      const result = calculateDailyAccumulation(shift1Lines, shift2Lines)

      const edcCombined = result.combined.per_kategori.find(
        (r) => r.kategori === 'EDC_BRI',
      )!

      expect(edcCombined.fisik.toNumber()).toBe(1_000_000)
      expect(edcCombined.esb.toNumber()).toBe(980_000)
      expect(edcCombined.selisih.toNumber()).toBe(20_000)
    })

    it('combined selalu 15 kategori', () => {
      const result = calculateDailyAccumulation([], [])
      expect(result.combined.per_kategori).toHaveLength(15)
    })
  })
})