// src/app/api/shifts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Role, ShiftPeriod, ShiftStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { generateShiftId } from "@/utils/format";

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

  // Tanggal hari ini dalam WIB — harus dihitung lebih dulu sebelum cek shift aktif
  const now = new Date();
  const jakartaStr = now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
  const jakartaDate = new Date(jakartaStr);
  const todayDate = new Date(
    jakartaDate.getFullYear(),
    jakartaDate.getMonth(),
    jakartaDate.getDate(),
  );

  // Cek apakah kasir ini masih punya shift aktif HARI INI
  // Filter shift_date = todayDate agar shift pending hari lalu tidak memblokir
  const activeShift = await prisma.shiftReport.findFirst({
    where: {
      opened_by: session!.user.id,
      status: { in: ["OPEN", "PENDING", "PENDING_FINANCE"] },
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

  // Validasi SHIFT_2: Shift 1 hari ini harus sudah CLOSED
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
      where: { shift_date: todayDate, shift_period: ShiftPeriod.SHIFT_2 },
    });
    if (shift2Today) {
      return NextResponse.json(
        { error: "Shift 2 hari ini sudah dibuka oleh kasir lain." },
        { status: 409 },
      );
    }
  }

  // Buat shift dalam serializable transaction untuk cegah race condition
  // pada shift ID generation (count + 1 tanpa DB-level unique constraint)
  const shift = await prisma.$transaction(
    async (tx) => {
      // Hitung urutan di dalam transaksi agar tidak ada dua request
      // yang mendapat sequence yang sama secara bersamaan
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
