// src/app/api/shifts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Role, ShiftPeriod } from "@prisma/client";
import {
  calculateReconciliation,
  calculateDailyAccumulation,
} from "@/lib/calculations";

// ─── GET /api/shifts/:id ──────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { error } = await requireRole(
    Role.CASHIER,
    Role.HEAD_CASHIER,
    Role.FINANCE,
  );
  if (error) return error;

  const shift = await prisma.shiftReport.findUnique({
    where: { id },
    include: {
      opener: { select: { id: true, full_name: true, username: true } },
      transaction_lines: true,
      special_logs: {
        include: {
          creator: { select: { id: true, full_name: true } },
        },
      },
      approvals: {
        include: {
          approver: { select: { id: true, full_name: true, role: true } },
        },
        orderBy: { timestamp: "asc" },
      },
    },
  });

  if (!shift) {
    return NextResponse.json(
      { error: "Shift tidak ditemukan." },
      { status: 404 },
    );
  }

  const reconciliation = calculateReconciliation(shift.transaction_lines);

  // ── Hitung daily accumulation khusus untuk SHIFT_2 ────────────────────────
  let daily_accumulation = null;

  if (shift.shift_period === ShiftPeriod.SHIFT_2) {
    const shift1 = await prisma.shiftReport.findFirst({
      where: {
        shift_date: shift.shift_date,
        shift_period: ShiftPeriod.SHIFT_1,
      },
      include: {
        transaction_lines: true,
      },
    });

    daily_accumulation = calculateDailyAccumulation(
      shift1?.transaction_lines ?? null,
      shift.transaction_lines,
    );
  }

  return NextResponse.json({
    data: {
      ...shift,
      reconciliation,
      daily_accumulation, // null kalau SHIFT_1, terisi kalau SHIFT_2
    },
  });
}
