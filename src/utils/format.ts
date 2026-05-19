// src/utils/format.ts
// Central formatter dan label constants — murni move, tidak ada perubahan logic

/**
 * Format angka (number) ke string Rupiah dengan prefix "Rp".
 * Digunakan untuk display: StatCard, total, dsb.
 * Contoh: 1500000 → "Rp 1.500.000"
 */
export function formatRupiahDisplay(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format string input ke format ribuan tanpa prefix.
 * Digunakan untuk input field Rupiah.
 * Contoh: "1500000" → "1.500.000"
 */
export function formatRupiah(value: string): string {
  const num = value.replace(/\D/g, "");
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Generate kode shift readable: SHF-YYYYMMDD-S1-001 atau SHF-YYYYMMDD-S2-001
 * Contoh: SHF-20260519-S1-003
 */
export function generateShiftId(
  date: Date,
  shiftPeriod: "SHIFT_1" | "SHIFT_2",
  sequence: number,
): string {
  const d = date.toISOString().split("T")[0].replace(/-/g, "");
  const period = shiftPeriod === "SHIFT_1" ? "S1" : "S2";
  const seq = String(sequence).padStart(3, "0");
  return `SHF-${d}-${period}-${seq}`;
}

/**
 * Format Date ke string tanggal + waktu Bahasa Indonesia.
 * Contoh: "19 Mei 2026, 14:30"
 */
export function formatDateTimeID(date: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(date));
}

/**
 * Parse string Rupiah (dengan titik) ke number.
 * Contoh: "1.500.000" → 1500000
 */
export function parseRupiah(value: string): number {
  return parseInt(value.replace(/\./g, "")) || 0;
}

export const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Open", color: "bg-emerald-100 text-emerald-700" },
  PENDING: { label: "Menunggu Review", color: "bg-amber-100 text-amber-700" },
  PENDING_FINANCE: {
    label: "Menunggu Finance",
    color: "bg-violet-100 text-violet-700",
  },
  CLOSED: { label: "Closed", color: "bg-slate-100 text-slate-600" },
};

export const SHIFT_PERIOD_LABEL: Record<
  string,
  { label: string; color: string }
> = {
  SHIFT_1: { label: "Shift 1", color: "bg-blue-100 text-blue-700" },
  SHIFT_2: { label: "Shift 2", color: "bg-violet-100 text-violet-700" },
};
