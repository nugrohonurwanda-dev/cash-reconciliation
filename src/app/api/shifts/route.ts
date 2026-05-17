// src/app/api/shifts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Role, ShiftPeriod } from "@prisma/client";
import { z } from "zod";
import { ShiftStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";

const OpenShiftSchema = z.object({
  modal_awal: z.number().positive().default(1000000),
  shift_period: z.nativeEnum(ShiftPeriod).default(ShiftPeriod.SHIFT_1),
});

// ─── GET /api/shifts ───────────────────────────────────────────────────────────
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
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 20;

  const where: Prisma.ShiftReportWhereInput = {};
  const dateFilter: Prisma.DateTimeFilter<"ShiftReport"> = {};
  const mine = searchParams.get("mine") === "true";

  if (session!.user.role === Role.CASHIER) {
    where.opened_by = session!.user.id;
  } else if (session!.user.role === Role.HEAD_CASHIER && mine) {
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
  }

  if (from || to) {
    const dateFilter: { gte?: Date; lt?: Date } = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setDate(toDate.getDate() + 1);
      dateFilter.lt = toDate;
    }
    where.shift_date = dateFilter;
  }

  const [total, shifts] = await prisma.$transaction([
    prisma.shiftReport.count({ where }),
    prisma.shiftReport.findMany({
      where,
      include: {
        opener: { select: { id: true, full_name: true, username: true } },
        transaction_lines: true,
        approvals: {
          include: {
            approver: { select: { id: true, full_name: true, role: true } },
          },
          orderBy: { timestamp: "asc" },
        },
      },
      orderBy: { opened_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    data: shifts,
    meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
  });
}

// ─── POST /api/shifts ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { session, error } = await requireRole(Role.CASHIER, Role.HEAD_CASHIER);
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

  // ── Cek shift aktif milik user ini ────────────────────────────────────────
  const activeShift = await prisma.shiftReport.findFirst({
    where: {
      opened_by: session!.user.id,
      status: { in: ["OPEN", "PENDING", "PENDING_FINANCE"] },
    },
  });

  if (activeShift) {
    return NextResponse.json(
      {
        error:
          "Kamu masih memiliki shift aktif. Selesaikan shift sebelumnya terlebih dahulu.",
      },
      { status: 409 },
    );
  }

  const now = new Date();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // ── Validasi khusus SHIFT_2 ───────────────────────────────────────────────
  if (shift_period === ShiftPeriod.SHIFT_2) {
    const shift1Today = await prisma.shiftReport.findFirst({
      where: {
        shift_date: todayDate,
        shift_period: ShiftPeriod.SHIFT_1,
      },
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

    if (shift1Today.status !== ShiftStatus.CLOSED) {
      return NextResponse.json(
        {
          error:
            "Shift 1 hari ini belum ditutup. Shift 2 hanya bisa dibuka setelah Shift 1 selesai.",
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
      where: {
        shift_date: todayDate,
        shift_period: ShiftPeriod.SHIFT_2,
      },
    });

    if (shift2Today) {
      return NextResponse.json(
        { error: "Shift 2 hari ini sudah dibuka oleh kasir lain." },
        { status: 409 },
      );
    }
  }

  // ── Buat shift ─────────────────────────────────────────────────────────────
  const shift = await prisma.shiftReport.create({
    data: {
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

  return NextResponse.json({ data: shift }, { status: 201 });
}
