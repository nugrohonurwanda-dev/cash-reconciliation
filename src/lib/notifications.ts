// src/lib/notifications.ts
/**
 * Helper terpusat untuk membuat notifikasi.
 * Dipanggil dari action route setiap kali ada perubahan status shift.
 *
 * SSE stream di /api/notifications/stream akan polling DB setiap 15 detik.
 * Client yang offline akan mendapat notifikasi saat buka app kembali.
 */

import { prisma } from '@/lib/prisma'
import { NotifType, Role } from '@prisma/client'

// ─── Kirim notifikasi ke satu user ───────────────────────────────────────────
export async function createNotification(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  {
    user_id,
    type,
    shift_id,
    message,
  }: {
    user_id: string
    type: NotifType
    shift_id: string
    message: string
  },
) {
  return tx.notification.create({
    data: { user_id, type, shift_id, message },
  })
}

// ─── Broadcast ke semua user dengan role tertentu ────────────────────────────
export async function notifyByRole(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  {
    role,
    type,
    shift_id,
    message,
  }: {
    role: Role
    type: NotifType
    shift_id: string
    message: string
  },
) {
  const users = await tx.user.findMany({
    where: { role, is_active: true },
    select: { id: true },
  })

  if (users.length === 0) return

  await tx.notification.createMany({
    data: users.map((u) => ({
      user_id: u.id,
      type,
      shift_id,
      message,
    })),
  })
}
