// src/app/api/shifts/[id]/variance-note/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Role } from "@prisma/client";
import { z } from "zod";
import { IMMUTABLE_SHIFT_STATUSES } from "@/lib/constants";

const Schema = z.object({
  variance_note: z
    .string()
    .min(1, "Keterangan selisih tidak boleh kosong")
    .max(500, "Keterangan selisih maksimal 500 karakter"),
});

// ─── PATCH /api/shifts/:id/variance-note ──────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { session, error } = await requireRole(Role.CASHIER, Role.HEAD_CASHIER);
  if (error) return error;

  const shift = await prisma.shiftReport.findUnique({ where: { id } });

  if (!shift) {
    return NextResponse.json(
      { error: "Shift tidak ditemukan." },
      { status: 404 },
    );
  }

  // Hanya pemilik shift yang boleh mengubah variance note — berlaku untuk semua role.
  if (shift.opened_by !== session!.user.id) {
    return NextResponse.json({ error: "Kamu bukan pemilik shift ini." }, { status: 403 });
  }

  if (IMMUTABLE_SHIFT_STATUSES.includes(shift.status)) {
    return NextResponse.json(
      { error: `Shift berstatus ${shift.status} dan tidak dapat diubah.` },
      { status: 422 },
    );
  }

  const body = await req.json();
  const parsed = Schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await prisma.shiftReport.update({
    where: { id },
    data: { variance_note: parsed.data.variance_note },
  });

  return NextResponse.json({
    data: updated,
    message: "Keterangan selisih berhasil disimpan.",
  });
}