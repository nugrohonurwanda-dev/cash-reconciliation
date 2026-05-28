// src/lib/constants.ts
import { ShiftStatus, PaymentCategory } from '@prisma/client'

// ─── Shift status yang tidak bisa diubah kasir ───────────────────────────────
export const IMMUTABLE_SHIFT_STATUSES: ShiftStatus[] = [
  ShiftStatus.PENDING,
  ShiftStatus.PENDING_FINANCE,
  ShiftStatus.CLOSED,
]

// ─── Threshold selisih wajib keterangan ─────────────────────────────────────
export const VARIANCE_THRESHOLD_IDR = 50_000 // Rp 50.000

// ─── Pengelompokan kategori untuk UI (grouped display) ───────────────────────
export const PAYMENT_GROUPS = {
  CASH: {
    label: 'Cash',
    categories: [PaymentCategory.CASH],
  },
  EDC: {
    label: 'EDC',
    categories: [
      PaymentCategory.EDC_BRI,
      PaymentCategory.EDC_BNI,
      PaymentCategory.EDC_BCA,
      PaymentCategory.EDC_BSI,
    ],
  },
  QRIS: {
    label: 'QRIS',
    categories: [
      PaymentCategory.QRIS_BRI,
      PaymentCategory.QRIS_BNI,
      PaymentCategory.QRIS_BCA,
      PaymentCategory.QRIS_BSI,
    ],
  },
  TRANSFER: {
    label: 'Transfer',
    categories: [
      PaymentCategory.TRANSFER_BRI,
      PaymentCategory.TRANSFER_BNI,
      PaymentCategory.TRANSFER_BCA,
    ],
  },
  DEPOSIT: {
    label: 'Member Deposit',
    categories: [
      PaymentCategory.DEPOSIT_BANK,
      PaymentCategory.DEPOSIT_CASH,
    ],
  },
} as const

// ─── Label per kategori ───────────────────────────────────────────────────────
export const CATEGORY_LABEL: Record<PaymentCategory, string> = {
  CASH:         'Cash',
  EDC_BRI:      'EDC BRI',
  EDC_BNI:      'EDC BNI',
  EDC_BCA:      'EDC BCA',
  EDC_BSI:      'EDC BSI',
  QRIS_BRI:     'QRIS BRI',
  QRIS_BNI:     'QRIS BNI',
  QRIS_BCA:     'QRIS BCA',
  QRIS_BSI:     'QRIS BSI',
  TRANSFER_BRI: 'Transfer BRI',
  TRANSFER_BNI: 'Transfer BNI',
  TRANSFER_BCA: 'Transfer BCA',
  TRANSFER_BSI: 'Transfer BSI', // Tidak ditampilkan di UI — tidak digunakan
  DEPOSIT_BANK: 'Deposit Bank',
  DEPOSIT_CASH: 'Deposit Cash',
}

// ─── Kategori yang TIDAK masuk sales / omzet ─────────────────────────────────
// Deposit (BANK & CASH) kini DIHITUNG sebagai bagian dari omzet.
// Array ini dikosongkan; tetap dipertahankan agar tidak perlu refactor sisi konsumer.
export const NON_SALES_CATEGORIES: PaymentCategory[] = []

// ─── Semua kategori yang termasuk sales ──────────────────────────────────────
export const SALES_CATEGORIES: PaymentCategory[] = Object.values(
  PaymentCategory,
).filter((c) => !NON_SALES_CATEGORIES.includes(c))

// ─── Label aksi approval ──────────────────────────────────────────────────────
export const ACTION_LABEL: Record<string, string> = {
  APPROVE: 'Approve',
  REJECT:  'Reject',
  CLOSE:   'Close',
}

// ─── Label role untuk display ─────────────────────────────────────────────────
export const ROLE_LABEL: Record<string, string> = {
  CASHIER:      'Kasir',
  HEAD_CASHIER: 'Head Kasir',
  FINANCE:      'Finance',
}

// ─── Konfigurasi badge status shift ──────────────────────────────────────────
export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  OPEN: {
    label: 'Open',
    color: 'bg-emerald-100 text-emerald-700',
  },
  PENDING: {
    label: 'Menunggu Review',
    color: 'bg-amber-100 text-amber-700',
  },
  PENDING_FINANCE: {
    label: 'Menunggu Finance',
    color: 'bg-violet-100 text-violet-700',
  },
  CLOSED: {
    label: 'Closed',
    color: 'bg-[var(--surface-hover)] text-[var(--text-secondary)]',
  },
}