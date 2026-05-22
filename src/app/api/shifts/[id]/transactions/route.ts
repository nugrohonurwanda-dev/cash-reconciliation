// src/app/api/shifts/[id]/transactions/route.ts
// Menerima semua 15 kategori PaymentCategory termasuk DEPOSIT_BANK dan DEPOSIT_CASH
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { Role, TransactionSource, PaymentCategory } from '@prisma/client'
import { z } from 'zod'
import { IMMUTABLE_SHIFT_STATUSES } from '@/lib/constants'

const TransactionLineSchema = z.object({
  sumber: z.nativeEnum(TransactionSource),
  kategori: z.nativeEnum(PaymentCategory),
  nilai: z.number().nonnegative(),
  catatan: z.string().max(200).optional(),
})

const BatchTransactionSchema = z.object({
  lines: z.array(TransactionLineSchema).min(1),
})

// ─── PUT /api/shifts/:id/transactions ─────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { session, error } = await requireRole(Role.CASHIER, Role.HEAD_CASHIER)
  if (error) return error

  const shift = await prisma.shiftReport.findUnique({ where: { id } })
  if (!shift) return NextResponse.json({ error: 'Shift tidak ditemukan.' }, { status: 404 })

  // CASHIER hanya boleh edit shift miliknya sendiri
  // HEAD_CASHIER boleh edit semua shift (untuk koreksi)
  if (session!.user.role === Role.CASHIER && shift.opened_by !== session!.user.id) {
    return NextResponse.json({ error: 'Kamu bukan pemilik shift ini.' }, { status: 403 })
  }


  if (IMMUTABLE_SHIFT_STATUSES.includes(shift.status)) {
    return NextResponse.json(
      { error: `Shift berstatus ${shift.status} dan tidak dapat diubah.` },
      { status: 422 },
    )
  }

  const body = await req.json()
  const parsed = BatchTransactionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Input tidak valid', details: parsed.error.flatten() }, { status: 400 })
  }

  const { lines } = parsed.data

  // Validasi: semua lines harus sumber yang sama (ESB atau FISIK)
  const sumberSet = new Set(lines.map((l) => l.sumber))
  if (sumberSet.size > 1) {
    return NextResponse.json(
      { error: 'Semua lines harus dari sumber yang sama (ESB atau FISIK).' },
      { status: 400 },
    )
  }

  const sumber = lines[0].sumber

  const result = await prisma.$transaction(async (tx) => {
    await tx.transactionLine.deleteMany({ where: { shift_id: id, sumber } })
    return tx.transactionLine.createMany({
      data: lines.map((l) => ({
        shift_id: id,
        sumber: l.sumber,
        kategori: l.kategori,
        nilai: l.nilai,
        catatan: l.catatan,
      })),
    })
  })

  return NextResponse.json({ data: result, message: `${result.count} baris berhasil disimpan.` })
}

// ─── GET /api/shifts/:id/transactions ─────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await requireRole(Role.CASHIER, Role.HEAD_CASHIER, Role.FINANCE)
  if (error) return error

  const lines = await prisma.transactionLine.findMany({
    where: { shift_id: id },
    orderBy: [{ sumber: 'asc' }, { kategori: 'asc' }],
  })

  return NextResponse.json({ data: lines })
}