// src/app/api/shifts/[id]/special-logs/route.ts
// SpecialLog hanya untuk: VOID, DISCOUNT, OTHER_COST
// DEPOSIT sudah dipindah ke TransactionLine (DEPOSIT_BANK / DEPOSIT_CASH)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Role, SpecialLogType, Prisma } from "@prisma/client";
import { z } from "zod";
import { IMMUTABLE_SHIFT_STATUSES } from "@/lib/constants";

// ─── Zod schemas per tipe ─────────────────────────────────────────────────────

const VoidSchema = z.object({
  tipe: z.literal(SpecialLogType.VOID),
  nomor_bill: z.string().min(1, "Nomor bill wajib diisi"),
  nominal: z.number().positive("Nominal harus lebih dari 0"),
  alasan: z.string().min(1, "Alasan wajib diisi").max(200),
});

const DiscountSchema = z.object({
  tipe: z.literal(SpecialLogType.DISCOUNT),
  nomor_bill: z.string().min(1, "Nomor bill wajib diisi"),
  nominal: z.number().positive("Nominal harus lebih dari 0"),
  alasan: z.string().min(1, "Alasan wajib diisi").max(200),
});

const OtherCostSchema = z.object({
  tipe: z.literal(SpecialLogType.OTHER_COST),
  kategori_biaya: z.enum(["ATK", "KEBERSIHAN", "OPERASIONAL", "LAIN_LAIN"]),
  nominal: z.number().positive("Nominal harus lebih dari 0"),
  keterangan: z.string().min(1, "Keterangan wajib diisi").max(200),
});

// discriminatedUnion butuh literal per member — VOID dan DISCOUNT dipisah
const SpecialLogSchema = z.discriminatedUnion("tipe", [
  VoidSchema,
  DiscountSchema,
  OtherCostSchema,
]);

const BatchSchema = z.object({
  logs: z.array(SpecialLogSchema),
});

type ParsedLog = z.infer<typeof SpecialLogSchema>;

// ─── Exhaustive check ─────────────────────────────────────────────────────────

function assertNever(x: never): never {
  throw new Error(`Unexpected tipe: ${JSON.stringify(x)}`);
}

// ─── Mapper log → Prisma input ────────────────────────────────────────────────

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

  if (log.tipe === SpecialLogType.VOID) {
    return {
      ...base,
      nomor_bill: log.nomor_bill,
      alasan: log.alasan,
      kategori_biaya: null,
      keterangan: null,
    };
  }

  if (log.tipe === SpecialLogType.DISCOUNT) {
    return {
      ...base,
      nomor_bill: log.nomor_bill,
      alasan: log.alasan,
      kategori_biaya: null,
      keterangan: null,
    };
  }

  if (log.tipe === SpecialLogType.OTHER_COST) {
    return {
      ...base,
      nomor_bill: null,
      alasan: null,
      kategori_biaya: log.kategori_biaya,
      keterangan: log.keterangan,
    };
  }

  return assertNever(log);
}

// ─── GET ──────────────────────────────────────────────────────────────────────

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
    include: { creator: { select: { id: true, full_name: true } } },
    orderBy: { created_at: "asc" },
  });

  return NextResponse.json({ data: logs });
}

// ─── PUT (replace all) ────────────────────────────────────────────────────────

export async function PUT(
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

  if (shift.opened_by !== session!.user.id) {
    return NextResponse.json(
      { error: "Kamu bukan pemilik shift ini." },
      { status: 403 },
    );
  }

  if (IMMUTABLE_SHIFT_STATUSES.includes(shift.status)) {
    return NextResponse.json(
      { error: `Shift berstatus ${shift.status} dan tidak dapat diubah.` },
      { status: 422 },
    );
  }

  const body = await req.json();
  const parsed = BatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.specialLog.deleteMany({ where: { shift_id: id } });
    if (parsed.data.logs.length === 0) return { count: 0 };
    return tx.specialLog.createMany({
      data: parsed.data.logs.map((log) =>
        toCreateInput(log, id, session!.user.id),
      ),
    });
  });

  return NextResponse.json({
    data: result,
    message: `${result.count} log berhasil disimpan.`,
  });
}
