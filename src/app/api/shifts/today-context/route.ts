// src/app/api/shifts/today-context/route.ts
//
// GET /api/shifts/today-context
// Hanya untuk CASHIER.
// Mengembalikan snapshot kondisi shift hari ini agar frontend
// bisa menentukan shift mana yang boleh/tidak boleh dibuka oleh
// user yang sedang login — tanpa harus melakukan banyak request.
//
// Response shape:
// {
//   my_shift_today    : ShiftReport | null   — shift milik user hari ini (jika ada)
//   shift1_today      : { id, status, opened_by } | null
//   shift2_today      : { id, status, opened_by } | null
//   can_open_shift1   : boolean
//   can_open_shift2   : boolean
//   active_shift_id   : string | null        — jika user punya shift aktif, isi id-nya
//   blocked_reason    : string | null        — pesan mengapa user tidak bisa buka shift
// }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Role, ShiftPeriod, ShiftStatus } from "@prisma/client";

export async function GET() {
  const { session, error } = await requireRole(Role.CASHIER);
  if (error) return error;

  const userId = session!.user.id;

  // ── Hitung tanggal hari ini dalam WIB ──────────────────────────────────────
  const now = new Date();
  const jakartaStr = now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
  const jakartaDate = new Date(jakartaStr);
  const todayDate = new Date(
    jakartaDate.getFullYear(),
    jakartaDate.getMonth(),
    jakartaDate.getDate(),
  );

  // ── Ambil data yang dibutuhkan secara paralel ──────────────────────────────
  const [myShiftToday, shift1Today, shift2Today] = await Promise.all([
    // Shift milik user ini hari ini (bisa lebih dari 1 secara teoritis, ambil terbaru)
    prisma.shiftReport.findFirst({
      where: { opened_by: userId, shift_date: todayDate },
      orderBy: { opened_at: "desc" },
    }),

    // Shift 1 hari ini — siapapun yang buka
    prisma.shiftReport.findFirst({
      where: { shift_date: todayDate, shift_period: ShiftPeriod.SHIFT_1 },
      select: { id: true, status: true, opened_by: true },
    }),

    // Shift 2 hari ini — siapapun yang buka
    prisma.shiftReport.findFirst({
      where: { shift_date: todayDate, shift_period: ShiftPeriod.SHIFT_2 },
      select: { id: true, status: true, opened_by: true },
    }),
  ]);

  // ── Evaluasi hak buka shift ────────────────────────────────────────────────
  let canOpenShift1 = false;
  let canOpenShift2 = false;
  let blockedReason: string | null = null;
  let activeShiftId: string | null = null;

  if (myShiftToday) {
    // PENDING_FINANCE tidak termasuk "aktif" — shift sudah di-approve HC,
    // kasir sudah selesai tugasnya dan handover kas sudah terjadi.
    const isActive: ShiftStatus[] = [
      ShiftStatus.OPEN,
      ShiftStatus.PENDING,
    ];

    if (isActive.includes(myShiftToday.status as ShiftStatus)) {
      // Masih ada shift aktif → arahkan ke shift itu, jangan buka baru
      activeShiftId = myShiftToday.id;
      blockedReason = "Kamu masih memiliki shift aktif hari ini.";
    } else {
      // Shift sudah selesai (CLOSED / REJECTED) — user sudah selesai tugasnya hari ini
      blockedReason =
        "Kamu sudah menyelesaikan shift hari ini. " +
        "Hanya satu shift per kasir diizinkan dalam satu hari.";
    }
  } else {
    // ── User belum punya shift hari ini ──────────────────────────────────────

    if (!shift1Today) {
      // Shift 1 sama sekali belum dibuka → hanya bisa buka Shift 1
      canOpenShift1 = true;
    } else if (
      shift1Today.status !== ShiftStatus.CLOSED &&
      shift1Today.status !== ShiftStatus.PENDING_FINANCE
    ) {
      // Shift 1 masih OPEN atau PENDING (belum di-approve HC)
      // → Shift 2 belum bisa dibuka
      blockedReason =
        "Shift 1 hari ini belum disetujui Head Cashier. " +
        "Shift 2 bisa dibuka setelah Shift 1 di-approve oleh Head Cashier.";
    } else {
      // Shift 1 sudah di-approve HC (PENDING_FINANCE) atau sudah CLOSED sepenuhnya
      if (shift1Today.opened_by === userId) {
        // User INI yang mengerjakan Shift 1 → dilarang kerjakan Shift 2
        blockedReason =
          "Kamu adalah kasir Shift 1 hari ini dan tidak diizinkan membuka Shift 2. " +
          "Shift 2 harus diisi oleh kasir yang berbeda.";
      } else if (shift2Today) {
        // Shift 2 sudah ada (dibuka orang lain)
        blockedReason = "Shift 2 hari ini sudah dibuka oleh kasir lain.";
      } else {
        // Shift 2 belum ada dan user ini bukan kasir Shift 1 → boleh buka Shift 2
        canOpenShift2 = true;
      }
    }
  }

  return NextResponse.json({
    my_shift_today: myShiftToday,
    shift1_today: shift1Today,
    shift2_today: shift2Today,
    can_open_shift1: canOpenShift1,
    can_open_shift2: canOpenShift2,
    active_shift_id: activeShiftId,
    blocked_reason: blockedReason,
  });
}
