// src/app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Role } from "@prisma/client";
import { calculateReconciliation } from "@/lib/calculations";

// ─── GET /api/dashboard ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(
    Role.CASHIER,
    Role.HEAD_CASHIER,
    Role.FINANCE,
  );
  if (error) return error;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const role = session!.user.role;
  const userId = session!.user.id;

  // ── Cashier Dashboard ──────────────────────────────────────────────────────
  if (role === Role.CASHIER) {
    const myShifts = await prisma.shiftReport.findMany({
      where: { opened_by: userId },
      include: { transaction_lines: true },
      orderBy: { opened_at: "desc" },
      take: 10,
    });

    const activeShift = myShifts.find((s) => s.status === "OPEN") ?? null;

    return NextResponse.json({
      role,
      active_shift: activeShift,
      recent_shifts: myShifts.map((s) => ({
        id: s.id,
        shift_date: s.shift_date,
        status: s.status,
        opened_at: s.opened_at,
        reconciliation: calculateReconciliation(s.transaction_lines),
      })),
    });
  }

  // ── Head Cashier Dashboard ─────────────────────────────────────────────────
  if (role === Role.HEAD_CASHIER) {
    const [todayShifts, pendingCount] = await prisma.$transaction([
      prisma.shiftReport.findMany({
        where: { shift_date: { gte: todayStart, lte: todayEnd } },
        include: {
          opener: { select: { id: true, full_name: true } },
          transaction_lines: true,
        },
        orderBy: { opened_at: "desc" },
      }),
      prisma.shiftReport.count({ where: { status: "PENDING" } }),
    ]);

    return NextResponse.json({
      role,
      pending_count: pendingCount,
      today_shifts: todayShifts.map((s) => ({
        id: s.id,
        shift_date: s.shift_date,
        status: s.status,
        opener: s.opener,
        opened_at: s.opened_at,
        reconciliation: calculateReconciliation(s.transaction_lines),
      })),
    });
  }

  // ── Finance Dashboard ──────────────────────────────────────────────────────
  if (role === Role.FINANCE) {
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    const dateFilter: { gte?: Date; lt?: Date } = {};
    if (fromDate) dateFilter.gte = new Date(fromDate);
    if (toDate) {
      const to = new Date(toDate);
      to.setDate(to.getDate() + 1);
      dateFilter.lt = to;
    }

    const where: { shift_date?: { gte?: Date; lt?: Date } } = {};
    if (Object.keys(dateFilter).length > 0) where.shift_date = dateFilter;

    const [shifts, pendingFinanceCount] = await prisma.$transaction([
      prisma.shiftReport.findMany({
        where,
        include: {
          opener: { select: { id: true, full_name: true } },
          transaction_lines: true,
        },
        orderBy: { shift_date: "desc" },
        take: 50,
      }),
      prisma.shiftReport.count({ where: { status: "PENDING_FINANCE" } }),
    ]);

    // Hitung total omzet cash vs bank (untuk shift CLOSED)
    const closedShifts = shifts.filter((s) => s.status === "CLOSED");
    let totalCash = 0;
    let totalBank = 0;

    for (const shift of closedShifts) {
      const recon = calculateReconciliation(shift.transaction_lines);
      for (const r of recon.per_kategori) {
        if (r.kategori === "CASH") {
          totalCash += parseFloat(r.fisik.toString());
        } else {
          totalBank += parseFloat(r.fisik.toString());
        }
      }
    }

    return NextResponse.json({
      role,
      pending_finance_count: pendingFinanceCount,
      total_omzet_cash: totalCash,
      total_omzet_bank: totalBank,
      shifts: shifts.map((s) => ({
        id: s.id,
        shift_date: s.shift_date,
        status: s.status,
        opener: s.opener,
        opened_at: s.opened_at,
        reconciliation: calculateReconciliation(s.transaction_lines),
      })),
    });
  }

  // ── Fallback — seharusnya tidak pernah tercapai karena requireRole sudah guard
  return NextResponse.json({ error: "Role tidak dikenali." }, { status: 403 });
}
