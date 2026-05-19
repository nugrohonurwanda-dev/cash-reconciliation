// src/app/api/shifts/[id]/pdf/route.ts
// Hanya Finance yang bisa generate PDF
// Tanda tangan Head Cashier: ambil APPROVE terakhir (bukan REJECT)
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

    // Timeout 30 detik
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
    // PDF hanya untuk Finance
    const { error } = await requireRole(Role.FINANCE)
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

    const recon = calculateReconciliation(shift.transaction_lines)
    const salesBreakdown = calculateSalesBreakdown(shift.transaction_lines, shift.special_logs)

    // Tanda tangan Head Cashier: APPROVE terakhir (bukan REJECT, bukan submit kasir)
    // Submit kasir juga tercatat sebagai APPROVE dengan catatan "Kasir submit laporan"
    // Filter: ambil APPROVE dari user dengan role HEAD_CASHIER
    const headCashierApproval = shift.approvals
      .filter(
        (a) =>
          a.action === 'APPROVE' &&
          a.approver.role === 'HEAD_CASHIER',
      )
      .at(-1) // yang paling akhir

    // Tanda tangan Finance: CLOSE
    const financeApproval = shift.approvals.find((a) => a.action === 'CLOSE')

    // Akumulasi harian untuk Shift 2
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
