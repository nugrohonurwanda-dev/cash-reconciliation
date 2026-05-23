// src/app/api/shifts/[id]/transactions/audit/route.ts
// Baca audit trail perubahan transaksi pada sebuah shift.
// Hanya HEAD_CASHIER dan FINANCE yang bisa melihat riwayat ini.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { Role } from '@prisma/client'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { error } = await requireRole(Role.HEAD_CASHIER, Role.FINANCE)
  if (error) return error

  const shift = await prisma.shiftReport.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!shift) {
    return NextResponse.json({ error: 'Shift tidak ditemukan.' }, { status: 404 })
  }

  const logs = await prisma.transactionAuditLog.findMany({
    where: { shift_id: id },
    include: {
      changer: { select: { id: true, full_name: true, role: true } },
    },
    orderBy: { changed_at: 'asc' },
  })

  return NextResponse.json({ data: logs })
}
