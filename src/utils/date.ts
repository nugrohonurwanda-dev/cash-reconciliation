// src/utils/date.ts

/**
 * Kembalikan Date yang merepresentasikan awal hari (00:00:00 lokal)
 * dalam timezone WIB (Asia/Jakarta), terlepas dari timezone server.
 *
 * Dipakai di semua tempat yang butuh "tanggal hari ini WIB":
 *   - POST /api/shifts        (buka shift baru)
 *   - GET  /api/shifts/today-context
 *   - GET  /api/dashboard
 */
export function getTodayWIB(): Date {
  const now = new Date()
  const jakartaStr = now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  const jakartaDate = new Date(jakartaStr)
  return new Date(
    jakartaDate.getFullYear(),
    jakartaDate.getMonth(),
    jakartaDate.getDate(),
  )
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
  const end = new Date(start)
  end.setDate(end.getDate() + 1) // besok 00:00 WIB — eksklusif (<)
  return { start, end }
}
