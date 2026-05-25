// src/utils/date.ts

// WIB = UTC+7
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000

/**
 * Kembalikan Date yang merepresentasikan awal hari (00:00:00 UTC)
 * dari tanggal hari ini versi WIB (Asia/Jakarta).
 *
 * KENAPA PAKAI Date.UTC():
 *   PostgreSQL @db.Date menyimpan tanggal dalam UTC.
 *   Kalau pakai `new Date(year, month, date)` (local constructor),
 *   server WIB (+07) akan menghasilkan tengah malam WIB = 17:00 UTC hari sebelumnya,
 *   sehingga PostgreSQL menyimpan tanggal KEMARIN — itulah bug yang diperbaiki di sini.
 *
 *   Solusi: geser waktu UTC ke WIB (+7 jam), ambil komponen tanggal UTC-nya
 *   (yang kini merepresentasikan tanggal WIB), lalu buat Date UTC midnight.
 *   Hasilnya: 2026-05-25T00:00:00.000Z → PostgreSQL simpan DATE '2026-05-25'. ✓
 *
 * Dipakai di semua tempat yang butuh "tanggal hari ini WIB":
 *   - POST /api/shifts        (buka shift baru)
 *   - GET  /api/shifts/today-context
 *   - GET  /api/dashboard
 */
export function getTodayWIB(): Date {
  const now = new Date()
  // Geser ke WIB dengan aritmatika UTC — tidak bergantung pada locale/ICU
  const nowInWIB = new Date(now.getTime() + WIB_OFFSET_MS)
  // Ambil komponen tanggal pakai metode UTC (sudah merepresentasikan WIB)
  return new Date(Date.UTC(
    nowInWIB.getUTCFullYear(),
    nowInWIB.getUTCMonth(),
    nowInWIB.getUTCDate(),
  ))
}

/**
 * Kembalikan { start, end } untuk filter "hari ini WIB" di Prisma.
 *
 * Contoh pakai:
 *   const { start, end } = getTodayRangeWIB()
 *   where: { shift_date: { gte: start, lt: end } }
 */
export function getTodayRangeWIB(): { start: Date; end: Date } {
  const start = getTodayWIB()
  // Tambah 1 hari via UTC untuk menghindari DST edge case
  const end = new Date(Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate() + 1,
  ))
  return { start, end }
}
