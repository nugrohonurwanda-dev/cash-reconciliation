// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { z } from "zod";

const MarkReadSchema = z.object({
  // Jika ids tidak dikirim → tandai semua sebagai sudah dibaca
  ids: z.array(z.string()).optional(),
});

// ─── GET /api/notifications ───────────────────────────────────────────────────
// Digunakan oleh NotificationBell untuk fetch daftar notif milik user yang login
export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const notifications = await prisma.notification.findMany({
    where: { user_id: session!.user.id },
    orderBy: { created_at: "desc" },
    take: 50, // Ambil 50 notif terbaru
  });

  const unread_count = notifications.filter((n) => !n.is_read).length;

  return NextResponse.json({
    data: notifications,
    unread_count,
  });
}

// ─── PATCH /api/notifications ─────────────────────────────────────────────────
// Mark notifikasi sebagai sudah dibaca.
// Body: { ids: string[] } → tandai id tertentu
// Body: {}               → tandai semua milik user
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = MarkReadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const where =
    parsed.data.ids && parsed.data.ids.length > 0
      ? {
          user_id: session!.user.id,
          id: { in: parsed.data.ids },
          is_read: false,
        }
      : {
          user_id: session!.user.id,
          is_read: false,
        };

  const result = await prisma.notification.updateMany({
    where,
    data: { is_read: true },
  });

  return NextResponse.json({
    message: `${result.count} notifikasi ditandai sudah dibaca.`,
    count: result.count,
  });
}