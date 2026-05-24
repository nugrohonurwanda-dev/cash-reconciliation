// src/app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Role } from "@prisma/client";
import { calculateReconciliation } from "@/lib/calculations";
import { getTodayRangeWIB } from "@/utils/date";

// ─── GET /api/dashboard ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(
    Role.CASHIER,
    Role.HEAD_CASHIER,
    Role.FINANCE,
  );
  if (error) return error;

  const { start: todayStart, end: todayEnd } = getTodayRangeWIB();

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
        where: { shift_date: { gte: todayStart, lt: todayEnd } },
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

    const hasDateFilter = Object.keys(dateFilter).length > 0;
    const shiftDateWhere = hasDateFilter ? { shift_date: dateFilter } : {};

    // Filter shift CLOSED sesuai tanggal — dipakai untuk agregasi omzet
    const closedShiftFilter = {
      status: "CLOSED" as const,
      ...shiftDateWhere,
    };

    const [shifts, pendingFinanceCount, cashAggregate, bankAggregate] =
      await prisma.$transaction([
        // Daftar shift untuk display — semua status, max 50
        prisma.shiftReport.findMany({
          where: shiftDateWhere,
          include: {
            opener: { select: { id: true, full_name: true } },
            transaction_lines: true,
          },
          orderBy: { shift_date: "desc" },
          take: 50,
        }),
        // Count shift menunggu penutupan Finance
        prisma.shiftReport.count({ where: { status: "PENDING_FINANCE" } }),
        // Total omzet cash — agregasi di DB, hanya CLOSED, hanya FISIK, hanya CASH
        prisma.transactionLine.aggregate({
          where: {
            sumber: "FISIK",
            kategori: "CASH",
            shift: closedShiftFilter,
          },
          _sum: { nilai: true },
        }),
        // Total omzet bank — agregasi di DB, hanya CLOSED, hanya FISIK,
        // exclude CASH dan DEPOSIT (bukan omzet penjualan)
        prisma.transactionLine.aggregate({
          where: {
            sumber: "FISIK",
            kategori: { notIn: ["CASH", "DEPOSIT_BANK", "DEPOSIT_CASH"] },
            shift: closedShiftFilter,
          },
          _sum: { nilai: true },
        }),
      ]);

    return NextResponse.json({
      role,
      pending_finance_count: pendingFinanceCount,
      total_omzet_cash: Number(cashAggregate._sum.nilai ?? 0),
      total_omzet_bank: Number(bankAggregate._sum.nilai ?? 0),
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