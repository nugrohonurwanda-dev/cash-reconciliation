// src/app/api/shifts/[id]/special-logs/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Role, SpecialLogType, Prisma } from "@prisma/client";
import { z } from "zod";
import { IMMUTABLE_SHIFT_STATUSES } from "@/lib/constants";

// ───────────────────────────────────────────────────────────────────────────────
// ZOD SCHEMA
// Dibuat explicit per tipe agar TypeScript narrowing stabil
// ───────────────────────────────────────────────────────────────────────────────

const SpecialLogSchema = z.discriminatedUnion("tipe", [
  // VOID
  z.object({
    tipe: z.literal(SpecialLogType.VOID),
    nomor_bill: z.string().min(1, "Nomor bill wajib diisi"),
    nominal: z.number().positive("Nominal harus lebih dari 0"),
    alasan: z
      .string()
      .min(1, "Alasan wajib diisi")
      .max(200, "Alasan maksimal 200 karakter"),
  }),

  // DISCOUNT
  z.object({
    tipe: z.literal(SpecialLogType.DISCOUNT),
    nomor_bill: z.string().min(1, "Nomor bill wajib diisi"),
    nominal: z.number().positive("Nominal harus lebih dari 0"),
    alasan: z
      .string()
      .min(1, "Alasan wajib diisi")
      .max(200, "Alasan maksimal 200 karakter"),
  }),

  // DEPOSIT
  z.object({
    tipe: z.literal(SpecialLogType.DEPOSIT),
    nama_member: z.string().min(1, "Nama member wajib diisi"),
    nominal: z.number().positive("Nominal harus lebih dari 0"),
    metode: z.enum(["CASH", "TRANSFER"]),
    nomor_referensi: z.string().max(100).optional(),
  }),

  // OTHER COST
  z.object({
    tipe: z.literal(SpecialLogType.OTHER_COST),
    kategori_biaya: z.enum(["ATK", "KEBERSIHAN", "OPERASIONAL", "LAIN_LAIN"]),
    nominal: z.number().positive("Nominal harus lebih dari 0"),
    keterangan: z
      .string()
      .min(1, "Keterangan wajib diisi")
      .max(200, "Keterangan maksimal 200 karakter"),
  }),
]);

const BatchSpecialLogSchema = z.object({
  logs: z.array(SpecialLogSchema),
});

type ParsedLog = z.infer<typeof SpecialLogSchema>;

// ───────────────────────────────────────────────────────────────────────────────
// EXHAUSTIVE CHECK
// ───────────────────────────────────────────────────────────────────────────────

function assertNever(x: never): never {
  throw new Error(`Unexpected object: ${JSON.stringify(x)}`);
}

// ───────────────────────────────────────────────────────────────────────────────
// MAPPER
// ───────────────────────────────────────────────────────────────────────────────

function toCreateInput(
  log: ParsedLog,
  shiftId: string,
  userId: string,
): Prisma.SpecialLogCreateManyInput {
  const base = {
    shift_id: shiftId,
    tipe: log.tipe,
    nominal: log.nominal,
    created_by: userId,
  };

  // VOID / DISCOUNT
  if (
    log.tipe === SpecialLogType.VOID ||
    log.tipe === SpecialLogType.DISCOUNT
  ) {
    return {
      ...base,
      nomor_bill: log.nomor_bill,
      alasan: log.alasan,

      nama_member: null,
      metode: null,
      nomor_referensi: null,

      kategori_biaya: null,
      keterangan: null,
    };
  }

  // DEPOSIT
  if (log.tipe === SpecialLogType.DEPOSIT) {
    return {
      ...base,
      nomor_bill: null,
      alasan: null,

      nama_member: log.nama_member,
      metode: log.metode,
      nomor_referensi: log.nomor_referensi ?? null,

      kategori_biaya: null,
      keterangan: null,
    };
  }

  // OTHER_COST
  if (log.tipe === SpecialLogType.OTHER_COST) {
    return {
      ...base,
      nomor_bill: null,
      alasan: null,

      nama_member: null,
      metode: null,
      nomor_referensi: null,

      kategori_biaya: log.kategori_biaya,
      keterangan: log.keterangan,
    };
  }

  return assertNever(log);
}

// ───────────────────────────────────────────────────────────────────────────────
// GET
// ───────────────────────────────────────────────────────────────────────────────

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

  const logs = await prisma.specialLog.findMany({
    where: { shift_id: id },
    include: {
      creator: {
        select: {
          id: true,
          full_name: true,
        },
      },
    },
    orderBy: {
      created_at: "asc",
    },
  });

  return NextResponse.json({
    data: logs,
  });
}

// ───────────────────────────────────────────────────────────────────────────────
// PUT
// ───────────────────────────────────────────────────────────────────────────────

export async function PUT(
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

  const shift = await prisma.shiftReport.findUnique({
    where: { id },
  });

  if (!shift) {
    return NextResponse.json(
      { error: "Shift tidak ditemukan." },
      { status: 404 },
    );
  }

  const canEdit =
    shift.opened_by === session!.user.id || session!.user.role === Role.FINANCE;

  if (!canEdit) {
    return NextResponse.json(
      { error: "Kamu bukan pemilik shift ini." },
      { status: 403 },
    );
  }

  if (IMMUTABLE_SHIFT_STATUSES.includes(shift.status)) {
    return NextResponse.json(
      {
        error: `Shift berstatus ${shift.status} dan tidak dapat diubah.`,
      },
      { status: 422 },
    );
  }

  const body = await req.json();

  const parsed = BatchSpecialLogSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Input tidak valid",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.specialLog.deleteMany({
      where: {
        shift_id: id,
      },
    });

    if (parsed.data.logs.length === 0) {
      return { count: 0 };
    }

    const created = await tx.specialLog.createMany({
      data: parsed.data.logs.map((log) =>
        toCreateInput(log, id, session!.user.id),
      ),
    });

    return created;
  });

  return NextResponse.json({
    data: result,
    message: `${result.count} log berhasil disimpan.`,
  });
}
