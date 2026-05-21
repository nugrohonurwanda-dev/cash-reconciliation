// src/app/api/notifications/stream/route.ts
//
// Server-Sent Events (SSE) endpoint untuk notifikasi real-time.
// Client (NotificationBell) membuka koneksi EventSource ke endpoint ini.
// Server melakukan DB polling setiap 15 detik dan mengirim notif baru ke client.
//
// Strategy: last-seen timestamp per koneksi
// - Client tidak perlu kirim apapun
// - Server track `since` per koneksi, query hanya notif yang lebih baru
// - Jika ada notif baru → kirim, jika tidak → kirim komentar keep-alive (:)

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POLL_INTERVAL_MS = 15_000; // 15 detik

export async function GET(req: NextRequest) {
  // Auth check — SSE tidak bisa pakai requireSession helper karena kita
  // perlu return ReadableStream, bukan NextResponse
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  let since = new Date(); // hanya notif yang dibuat SETELAH koneksi dibuka

  const stream = new ReadableStream({
    start(controller) {
      // Helper: encode SSE message
      const send = (data: string) => {
        controller.enqueue(`data: ${data}\n\n`);
      };

      // Helper: keep-alive comment (cegah timeout di proxy/browser)
      const keepAlive = () => {
        controller.enqueue(": keep-alive\n\n");
      };

      // Poll DB secara periodik
      const interval = setInterval(async () => {
        try {
          const newNotifs = await prisma.notification.findMany({
            where: {
              user_id: userId,
              created_at: { gt: since },
            },
            orderBy: { created_at: "asc" },
          });

          if (newNotifs.length > 0) {
            since = new Date(); // update cursor ke sekarang
            send(JSON.stringify(newNotifs));
          } else {
            keepAlive();
          }
        } catch {
          // Jika DB error, kirim keep-alive agar koneksi tetap terbuka
          keepAlive();
        }
      }, POLL_INTERVAL_MS);

      // Kirim keep-alive pertama segera agar client tahu koneksi berhasil
      keepAlive();

      // Cleanup saat koneksi ditutup
      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // stream mungkin sudah tertutup
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Penting untuk Vercel / proxy: matikan buffering
      "X-Accel-Buffering": "no",
    },
  });
}