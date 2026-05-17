// src/app/api/shifts/[id]/action/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Role } from "@prisma/client";
import { calculateReconciliation } from "@/lib/calculations";
import { z } from "zod";

const ActionSchema = z.object({
  action: z.enum(["SUBMIT", "APPROVE", "REJECT", "CLOSE"]),
  catatan: z.string().max(500).optional(),
  variance_note: z.string().max(500).optional(),
});

// ─── POST /api/shifts/:id/action ──────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { session, error } = await requireRole(
    Role.CASHIER,
    Role.HEAD_CASHIER,
    Role.FINANCE,
  );
  if (error) return error;

  const body = await req.json();
  const parsed = ActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Data yang dikirim tidak lengkap atau tidak sesuai. Muat ulang halaman dan coba lagi.",
      },
      { status: 400 },
    );
  }

  // Destructure semua di satu tempat — tidak ada redeclaration di bawah
  const { action, catatan, variance_note } = parsed.data;

  const shift = await prisma.shiftReport.findUnique({
    where: { id },
    include: { transaction_lines: true },
  });

  if (!shift) {
    return NextResponse.json(
      { error: "Shift tidak ditemukan." },
      { status: 404 },
    );
  }

  // ── SUBMIT (Cashier atau Head Cashier) ────────────────────────────────────
  if (action === "SUBMIT") {
    if (
      session!.user.role !== Role.CASHIER &&
      session!.user.role !== Role.HEAD_CASHIER
    ) {
      return NextResponse.json(
        { error: "Hanya Cashier atau Head Cashier yang bisa submit." },
        { status: 403 },
      );
    }
    if (shift.opened_by !== session!.user.id) {
      return NextResponse.json(
        { error: "Kamu bukan pemilik shift ini." },
        { status: 403 },
      );
    }
    if (shift.status !== "OPEN") {
      return NextResponse.json(
        { error: `Shift berstatus ${shift.status}, tidak bisa di-submit.` },
        { status: 422 },
      );
    }

    const hasESB = shift.transaction_lines.some((l) => l.sumber === "ESB");
    const hasFisik = shift.transaction_lines.some((l) => l.sumber === "FISIK");
    if (!hasESB || !hasFisik) {
      return NextResponse.json(
        { error: "Data ESB dan Data Fisik wajib diisi sebelum submit." },
        { status: 422 },
      );
    }

    // Validasi variance — pakai variance_note dari request, bukan dari DB
    // Ini mencegah race condition antara saveVarianceNote dan submitShift
    const recon = calculateReconciliation(shift.transaction_lines);
    if (recon.is_variance_exceeded && !variance_note?.trim()) {
      return NextResponse.json(
        {
          error: `Selisih minus melebihi Rp 50.000 (${recon.total_selisih.toFixed(0)}). Wajib isi keterangan selisih terlebih dahulu.`,
          code: "VARIANCE_NOTE_REQUIRED",
        },
        { status: 422 },
      );
    }

    // Simpan variance_note dan update status dalam satu transaksi
    const updated = await prisma.$transaction(async (tx) => {
      const upd = await tx.shiftReport.update({
        where: { id },
        data: {
          status: "PENDING",
          variance_note: variance_note?.trim() ?? null,
        },
      });
      await tx.approval.create({
        data: {
          shift_id: id,
          approver_id: session!.user.id,
          action: "APPROVE",
          catatan: "Kasir submit laporan",
          timestamp: new Date(),
        },
      });
      return upd;
    });

    return NextResponse.json({
      data: updated,
      message: "Laporan berhasil di-submit.",
    });
  }

  // ── APPROVE (Head Cashier) ─────────────────────────────────────────────────
  if (action === "APPROVE") {
    if (session!.user.role !== Role.HEAD_CASHIER) {
      return NextResponse.json(
        { error: "Hanya Head Cashier yang bisa approve." },
        { status: 403 },
      );
    }
    if (shift.opened_by === session!.user.id) {
      return NextResponse.json(
        { error: "Kamu tidak bisa approve shift milikmu sendiri." },
        { status: 403 },
      );
    }
    if (shift.status !== "PENDING") {
      return NextResponse.json(
        { error: `Shift berstatus ${shift.status}, tidak bisa di-approve.` },
        { status: 422 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const upd = await tx.shiftReport.update({
        where: { id },
        data: { status: "PENDING_FINANCE" },
      });
      await tx.approval.create({
        data: {
          shift_id: id,
          approver_id: session!.user.id,
          action: "APPROVE",
          catatan: catatan ?? null,
          timestamp: new Date(),
        },
      });
      return upd;
    });

    return NextResponse.json({
      data: updated,
      message: "Laporan berhasil di-approve.",
    });
  }

  // ── REJECT (Head Cashier) ──────────────────────────────────────────────────
  if (action === "REJECT") {
    if (session!.user.role !== Role.HEAD_CASHIER) {
      return NextResponse.json(
        { error: "Hanya Head Cashier yang bisa reject." },
        { status: 403 },
      );
    }
    if (shift.opened_by === session!.user.id) {
      return NextResponse.json(
        { error: "Kamu tidak bisa reject shift milikmu sendiri." },
        { status: 403 },
      );
    }
    if (shift.status !== "PENDING") {
      return NextResponse.json(
        { error: `Shift berstatus ${shift.status}, tidak bisa di-reject.` },
        { status: 422 },
      );
    }
    if (!catatan || catatan.trim().length === 0) {
      return NextResponse.json(
        { error: "Alasan reject wajib diisi." },
        { status: 422 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const upd = await tx.shiftReport.update({
        where: { id },
        data: { status: "OPEN" },
      });
      await tx.approval.create({
        data: {
          shift_id: id,
          approver_id: session!.user.id,
          action: "REJECT",
          catatan,
          timestamp: new Date(),
        },
      });
      return upd;
    });

    return NextResponse.json({
      data: updated,
      message: "Laporan ditolak, kasir dapat melakukan edit ulang.",
    });
  }

  // ── CLOSE (Finance) ────────────────────────────────────────────────────────
  if (action === "CLOSE") {
    if (session!.user.role !== Role.FINANCE) {
      return NextResponse.json(
        { error: "Hanya Finance yang bisa menutup laporan." },
        { status: 403 },
      );
    }
    if (shift.status !== "PENDING_FINANCE") {
      return NextResponse.json(
        { error: `Shift berstatus ${shift.status}, tidak bisa di-close.` },
        { status: 422 },
      );
    }

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const upd = await tx.shiftReport.update({
        where: { id },
        data: { status: "CLOSED", closed_at: now },
      });
      await tx.approval.create({
        data: {
          shift_id: id,
          approver_id: session!.user.id,
          action: "CLOSE",
          catatan: catatan ?? null,
          timestamp: now,
        },
      });
      return upd;
    });

    return NextResponse.json({
      data: updated,
      message: "Laporan berhasil ditutup. PDF dapat di-generate.",
    });
  }

  return NextResponse.json({ error: "Action tidak dikenal." }, { status: 400 });
}
