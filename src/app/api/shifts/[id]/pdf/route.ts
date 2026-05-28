// src/app/api/shifts/[id]/pdf/route.ts
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { Role, ShiftPeriod } from '@prisma/client'
import {
  calculateReconciliation,
  calculateSalesBreakdown,
  calculateDailyAccumulation,
} from '@/lib/calculations'
import { spawn } from 'child_process'
import path from 'path'

function generatePDFInChildProcess(data: object): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'generate-pdf.mjs')
    const child = spawn(process.execPath, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    const chunks: Buffer[] = []
    const errChunks: Buffer[] = []

    child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => errChunks.push(chunk))

    child.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(chunks))
      else reject(new Error(`PDF generation failed (exit ${code}): ${Buffer.concat(errChunks).toString()}`))
    })

    child.on('error', reject)

    const timeout = setTimeout(() => {
      child.kill()
      reject(new Error('PDF generation timeout (30s)'))
    }, 30_000)
    child.on('close', () => clearTimeout(timeout))

    child.stdin.write(
      JSON.stringify(data, (_, v) =>
        typeof v === 'object' && v !== null && 'toFixed' in v ? v.toString() : v,
      ),
    )
    child.stdin.end()
  })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    // Finance bisa akses semua PDF; Cashier hanya milik sendiri
    const { session, error } = await requireRole(Role.FINANCE, Role.CASHIER)
    if (error) return error

    const shift = await prisma.shiftReport.findUnique({
      where: { id },
      include: {
        opener: { select: { full_name: true, username: true } },
        transaction_lines: true,
        special_logs: {
          include: { creator: { select: { full_name: true } } },
        },
        approvals: {
          include: { approver: { select: { full_name: true, role: true } } },
          orderBy: { timestamp: 'asc' },
        },
      },
    })

    if (!shift) {
      return NextResponse.json({ error: 'Shift tidak ditemukan.' }, { status: 404 })
    }
    if (shift.status !== 'CLOSED') {
      return NextResponse.json(
        { error: 'PDF hanya tersedia untuk shift yang sudah CLOSED.' },
        { status: 422 },
      )
    }

    // Cashier hanya boleh akses PDF shift miliknya sendiri
    if (
      session!.user.role === Role.CASHIER &&
      shift.opened_by !== session!.user.id
    ) {
      return NextResponse.json(
        { error: 'Kamu tidak berhak mengakses PDF shift ini.' },
        { status: 403 },
      )
    }

    const recon = calculateReconciliation(shift.transaction_lines)
    const salesBreakdown = calculateSalesBreakdown(shift.transaction_lines, shift.special_logs)

    const headCashierApproval = shift.approvals
      .filter(
        (a) =>
          a.action === 'APPROVE' &&
          a.approver.role === 'HEAD_CASHIER',
      )
      .at(-1)

    const financeApproval = shift.approvals.find((a) => a.action === 'CLOSE')

    let dailyAccumulation = null
    if (shift.shift_period === ShiftPeriod.SHIFT_2) {
      const shift1 = await prisma.shiftReport.findFirst({
        where: { shift_date: shift.shift_date, shift_period: ShiftPeriod.SHIFT_1 },
        include: { transaction_lines: true },
      })
      dailyAccumulation = calculateDailyAccumulation(
        shift1?.transaction_lines ?? null,
        shift.transaction_lines,
      )
    }

    const pdfBuffer = await generatePDFInChildProcess({
      shift,
      recon,
      salesBreakdown,
      headCashierApproval,
      financeApproval,
      dailyAccumulation,
    })

    const dateStr = new Date(shift.shift_date)
      .toISOString()
      .split('T')[0]
    const filename = `laporan-${shift.id}-${dateStr}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('[PDF Generation Error]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Gagal generate PDF.' },
      { status: 500 },
    )
  }
}