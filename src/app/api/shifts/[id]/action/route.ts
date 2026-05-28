// src/app/api/shifts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Role, ShiftPeriod, ShiftStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { generateShiftId } from "@/utils/format";
import { getTodayWIB } from "@/utils/date";

const OpenShiftSchema = z.object({
  modal_awal: z.number().positive().default(1_000_000),
  shift_period: z.nativeEnum(ShiftPeriod).default(ShiftPeriod.SHIFT_1),
});

// ─── GET /api/shifts ──────────────────────────────────────────────────────────
// CASHIER: lihat shift milik sendiri
// HEAD_CASHIER: lihat semua shift (untuk review)
// FINANCE: lihat semua shift (untuk finalisasi & penutupan)
export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(
    Role.CASHIER,
    Role.HEAD_CASHIER,
    Role.FINANCE,
  );
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;

  const where: Prisma.ShiftReportWhereInput = {};

  // Cashier hanya lihat shift milik sendiri
  // Head Cashier dan Finance lihat semua
  if (session!.user.role === Role.CASHIER) {
    where.opened_by = session!.user.id;
  }

  if (status) {
    if (!Object.values(ShiftStatus).includes(status as ShiftStatus)) {
      return NextResponse.json(
        {
          error: `Status tidak valid. Nilai yang diizinkan: ${Object.values(ShiftStatus).join(", ")}.`,
        },
        { status: 400 },
      );
    }
    where.status = status as ShiftStatus;
  }

  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    where.shift_date = { gte: start, lt: end };
  } else if (from || to) {
    const dateFilter: { gte?: Date; lt?: Date } = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setDate(toDate.getDate() + 1);
      dateFilter.lt = toDate;
    }
    where.shift_date = dateFilter;
  }

  const [total, shifts, summaryAgg] = await prisma.$transaction([
    prisma.shiftReport.count({ where }),
    prisma.shiftReport.findMany({
      where,
      include: {
        opener: { select: { id: true, full_name: true, username: true } },
      },
      orderBy: { opened_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    // Aggregate untuk summary card — dihitung dari keseluruhan filter, bukan hanya halaman ini
    prisma.shiftReport.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
      _sum: { modal_awal: true },
    }),
  ]);

  // Susun summary dari groupBy result
  const summaryByStatus = Object.fromEntries(
    summaryAgg.map((s) => [
      s.status,
      { count: s._count._all, total_modal_awal: s._sum.modal_awal ?? 0 },
    ]),
  );

  const summary = {
    pending_finance_count: summaryByStatus["PENDING_FINANCE"]?.count ?? 0,
    closed_count: summaryByStatus["CLOSED"]?.count ?? 0,
    total_modal_awal_closed: summaryByStatus["CLOSED"]?.total_modal_awal ?? 0,
  };

  return NextResponse.json({
    data: shifts,
    meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
    summary,
  });
}

// ─── POST /api/shifts ─────────────────────────────────────────────────────────
// Hanya CASHIER yang bisa buka shift — HEAD_CASHIER hanya review
export async function POST(req: NextRequest) {
  const { session, error } = await requireRole(Role.CASHIER);
  if (error) return error;

  const body = await req.json();
  const parsed = OpenShiftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { modal_awal, shift_period } = parsed.data;

  const now = new Date();
  const todayDate = getTodayWIB();

  const activeShift = await prisma.shiftReport.findFirst({
    where: {
      opened_by: session!.user.id,
      status: { in: [ShiftStatus.OPEN, ShiftStatus.PENDING] },
      shift_date: todayDate,
    },
  });
  if (activeShift) {
    return NextResponse.json(
      {
        error:
          "Kamu masih memiliki shift aktif hari ini. Selesaikan shift sebelumnya terlebih dahulu.",
      },
      { status: 409 },
    );
  }

  if (shift_period === ShiftPeriod.SHIFT_2) {
    const shift1Today = await prisma.shiftReport.findFirst({
      where: { shift_date: todayDate, shift_period: ShiftPeriod.SHIFT_1 },
    });

    if (!shift1Today) {
      return NextResponse.json(
        {
          error:
            "Shift 1 hari ini belum dibuka. Shift 2 hanya bisa dibuka setelah Shift 1 ada.",
        },
        { status: 422 },
      );
    }

    const shift1Ready =
      shift1Today.status === ShiftStatus.PENDING ||
      shift1Today.status === ShiftStatus.PENDING_FINANCE ||
      shift1Today.status === ShiftStatus.CLOSED;

    if (!shift1Ready) {
      return NextResponse.json(
        {
          error:
            "Shift 1 hari ini masih berjalan. " +
            "Shift 2 bisa dibuka setelah kasir Shift 1 menyelesaikan dan mengajukan laporannya.",
        },
        { status: 422 },
      );
    }

    if (shift1Today.opened_by === session!.user.id) {
      return NextResponse.json(
        {
          error:
            "Kamu tidak bisa membuka Shift 2 karena kamu adalah kasir Shift 1 hari ini.",
        },
        { status: 403 },
      );
    }

    const shift2Today = await prisma.shiftReport.findFirst({
      where: { shift_date: todayDate, shift_period: ShiftPeriod.SHIFT_2 },
    });
    if (shift2Today) {
      return NextResponse.json(
        { error: "Shift 2 hari ini sudah dibuka oleh kasir lain." },
        { status: 409 },
      );
    }
  }

  const shift = await prisma.$transaction(
    async (tx) => {
      const existingCount = await tx.shiftReport.count({
        where: { shift_date: todayDate, shift_period },
      });
      const seq = existingCount + 1;
      const shiftId = generateShiftId(todayDate, shift_period, seq);

      return tx.shiftReport.create({
        data: {
          id: shiftId,
          shift_date: todayDate,
          opened_by: session!.user.id,
          opened_at: now,
          modal_awal,
          shift_period,
          status: "OPEN",
        },
        include: {
          opener: { select: { id: true, full_name: true, username: true } },
        },
      });
    },
    { isolationLevel: "Serializable" },
  );

  return NextResponse.json({ data: shift }, { status: 201 });
}