// src/app/api/shifts/[id]/action/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Role, ShiftStatus } from "@prisma/client";
import { z } from "zod";
import { createNotification, notifyByRole } from "@/lib/notifications";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("SUBMIT") }),
  z.object({ action: z.literal("APPROVE"), catatan: z.string().optional() }),
  z.object({
    action: z.literal("REJECT"),
    catatan: z
      .string({ required_error: "Catatan wajib diisi saat menolak." })
      .min(1, "Catatan wajib diisi saat menolak."),
  }),
  z.object({ action: z.literal("CLOSE"), catatan: z.string().optional() }),
]);

// ─── POST /api/shifts/:id/action ─────────────────────────────────────────────
// SUBMIT  → Cashier      : OPEN → PENDING
// APPROVE → Head Cashier : PENDING → PENDING_FINANCE
// REJECT  → Head Cashier : PENDING → OPEN
// CLOSE   → Finance      : PENDING_FINANCE → CLOSED
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Parse & validasi body terlebih dahulu sebelum cek role,
  // agar error "action tidak dikenali" muncul lebih informatif.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body tidak valid." }, { status: 400 });
  }

  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { action } = parsed.data;

  // ── Role guard per action ──────────────────────────────────────────────────
  const allowedRoles: Record<typeof action, Role[]> = {
    SUBMIT: [Role.CASHIER],
    APPROVE: [Role.HEAD_CASHIER],
    REJECT: [Role.HEAD_CASHIER],
    CLOSE: [Role.FINANCE],
  };

  const { session, error: authError } = await requireRole(...allowedRoles[action]);
  if (authError) return authError;

  // ── Ambil shift ────────────────────────────────────────────────────────────
  const shift = await prisma.shiftReport.findUnique({
    where: { id },
    include: {
      opener: { select: { id: true, full_name: true } },
    },
  });

  if (!shift) {
    return NextResponse.json({ error: "Shift tidak ditemukan." }, { status: 404 });
  }

  // ── SUBMIT ─────────────────────────────────────────────────────────────────
  if (action === "SUBMIT") {
    if (shift.opened_by !== session!.user.id) {
      return NextResponse.json(
        { error: "Kamu bukan pemilik shift ini." },
        { status: 403 },
      );
    }

    if (shift.status !== ShiftStatus.OPEN) {
      return NextResponse.json(
        { error: `Shift berstatus ${shift.status} dan tidak bisa disubmit.` },
        { status: 422 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.shiftReport.update({
        where: { id },
        data: { status: ShiftStatus.PENDING },
      });

      await notifyByRole(tx, {
        role: Role.HEAD_CASHIER,
        type: "SHIFT_PENDING_REVIEW",
        shift_id: id,
        message: `Laporan shift ${id} dari ${shift.opener.full_name} menunggu review.`,
      });

      return result;
    });

    return NextResponse.json({ data: updated, message: "Laporan berhasil disubmit." });
  }

  // ── APPROVE ────────────────────────────────────────────────────────────────
  if (action === "APPROVE") {
    if (shift.status !== ShiftStatus.PENDING) {
      return NextResponse.json(
        { error: `Shift berstatus ${shift.status} dan tidak bisa di-approve.` },
        { status: 422 },
      );
    }

    const { catatan } = parsed.data;
    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.shiftReport.update({
        where: { id },
        data: {
          status: ShiftStatus.PENDING_FINANCE,
          pending_finance_at: now,
        },
      });

      await tx.approval.create({
        data: {
          shift_id: id,
          approver_id: session!.user.id,
          action: "APPROVE",
          catatan: catatan ?? null,
        },
      });

      await createNotification(tx, {
        user_id: shift.opener.id,
        type: "SHIFT_APPROVED",
        shift_id: id,
        message: `Laporan shift ${id} kamu telah disetujui oleh Head Kasir.`,
      });

      return result;
    });

    return NextResponse.json({ data: updated, message: "Laporan berhasil di-approve." });
  }

  // ── REJECT ─────────────────────────────────────────────────────────────────
  if (action === "REJECT") {
    if (shift.status !== ShiftStatus.PENDING) {
      return NextResponse.json(
        { error: `Shift berstatus ${shift.status} dan tidak bisa di-reject.` },
        { status: 422 },
      );
    }

    const { catatan } = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.shiftReport.update({
        where: { id },
        data: { status: ShiftStatus.OPEN },
      });

      await tx.approval.create({
        data: {
          shift_id: id,
          approver_id: session!.user.id,
          action: "REJECT",
          catatan,
        },
      });

      await createNotification(tx, {
        user_id: shift.opener.id,
        type: "SHIFT_REJECTED",
        shift_id: id,
        message: `Laporan shift ${id} kamu ditolak oleh Head Kasir. Alasan: ${catatan}`,
      });

      return result;
    });

    return NextResponse.json({ data: updated, message: "Laporan berhasil di-reject." });
  }

  // ── CLOSE (Finance) ────────────────────────────────────────────────────────
  if (action === "CLOSE") {
    if (shift.status !== ShiftStatus.PENDING_FINANCE) {
      return NextResponse.json(
        { error: `Shift berstatus ${shift.status} dan tidak bisa ditutup. Hanya shift PENDING_FINANCE yang bisa ditutup.` },
        { status: 422 },
      );
    }

    const { catatan } = parsed.data;
    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.shiftReport.update({
        where: { id },
        data: {
          status: ShiftStatus.CLOSED,
          closed_at: now,
        },
      });

      await tx.approval.create({
        data: {
          shift_id: id,
          approver_id: session!.user.id,
          action: "CLOSE",
          catatan: catatan ?? null,
        },
      });

      await createNotification(tx, {
        user_id: shift.opener.id,
        type: "SHIFT_CLOSED",
        shift_id: id,
        message: `Laporan shift ${id} kamu telah ditutup dan diverifikasi oleh Finance.`,
      });

      return result;
    });

    return NextResponse.json({
      data: updated,
      message: "Laporan berhasil ditutup.",
    });
  }
}