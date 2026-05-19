// src/app/api/shifts/[id]/action/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { Role, NotifType } from '@prisma/client'
import { calculateReconciliation } from '@/lib/calculations'
import { createNotification, notifyByRole } from '@/lib/notifications'
import { z } from 'zod'

const ActionSchema = z.object({
  action: z.enum(['SUBMIT', 'APPROVE', 'REJECT', 'CLOSE']),
  catatan: z.string().max(500).optional(),
  variance_note: z.string().max(500).optional(),
})

// ─── POST /api/shifts/:id/action ──────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { session, error } = await requireRole(
    Role.CASHIER,
    Role.HEAD_CASHIER,
    Role.FINANCE,
  )
  if (error) return error

  const body = await req.json()
  const parsed = ActionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Data yang dikirim tidak lengkap atau tidak sesuai. Muat ulang halaman dan coba lagi.' },
      { status: 400 },
    )
  }

  const { action, catatan, variance_note } = parsed.data

  const shift = await prisma.shiftReport.findUnique({
    where: { id },
    include: {
      transaction_lines: true,
      opener: { select: { id: true, full_name: true } },
    },
  })

  if (!shift) {
    return NextResponse.json({ error: 'Shift tidak ditemukan.' }, { status: 404 })
  }

  // ── SUBMIT (Cashier saja) ─────────────────────────────────────────────────
  if (action === 'SUBMIT') {
    if (session!.user.role !== Role.CASHIER) {
      return NextResponse.json(
        { error: 'Hanya Kasir yang bisa submit shift.' },
        { status: 403 },
      )
    }
    if (shift.opened_by !== session!.user.id) {
      return NextResponse.json({ error: 'Kamu bukan pemilik shift ini.' }, { status: 403 })
    }
    if (shift.status !== 'OPEN') {
      return NextResponse.json(
        { error: `Shift berstatus ${shift.status}, tidak bisa di-submit.` },
        { status: 422 },
      )
    }

    const hasESB = shift.transaction_lines.some((l) => l.sumber === 'ESB')
    const hasFisik = shift.transaction_lines.some((l) => l.sumber === 'FISIK')
    if (!hasESB || !hasFisik) {
      return NextResponse.json(
        { error: 'Data ESB dan Data Fisik wajib diisi sebelum submit.' },
        { status: 422 },
      )
    }

    const recon = calculateReconciliation(shift.transaction_lines)
    if (recon.is_variance_exceeded && !variance_note?.trim()) {
      return NextResponse.json(
        {
          error: `Selisih minus melebihi Rp 50.000 (${recon.total_selisih.toFixed(0)}). Wajib isi keterangan selisih.`,
          code: 'VARIANCE_NOTE_REQUIRED',
        },
        { status: 422 },
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      const upd = await tx.shiftReport.update({
        where: { id },
        data: {
          status: 'PENDING',
          variance_note: variance_note?.trim() ?? null,
        },
      })
      await tx.approval.create({
        data: {
          shift_id: id,
          approver_id: session!.user.id,
          action: 'APPROVE',
          catatan: 'Kasir submit laporan',
        },
      })
      // Notifikasi ke semua Head Cashier aktif
      await notifyByRole(tx, {
        role: Role.HEAD_CASHIER,
        type: NotifType.SHIFT_PENDING_REVIEW,
        shift_id: id,
        message: `Shift ${id} dari ${shift.opener.full_name} menunggu review kamu.`,
      })
      return upd
    })

    return NextResponse.json({ data: updated, message: 'Laporan berhasil di-submit.' })
  }

  // ── APPROVE (Head Cashier) ────────────────────────────────────────────────
  if (action === 'APPROVE') {
    if (session!.user.role !== Role.HEAD_CASHIER) {
      return NextResponse.json(
        { error: 'Hanya Head Cashier yang bisa approve.' },
        { status: 403 },
      )
    }
    if (shift.opened_by === session!.user.id) {
      return NextResponse.json(
        { error: 'Kamu tidak bisa approve shift milikmu sendiri.' },
        { status: 403 },
      )
    }
    if (shift.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Shift berstatus ${shift.status}, tidak bisa di-approve.` },
        { status: 422 },
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      const upd = await tx.shiftReport.update({
        where: { id },
        data: { status: 'PENDING_FINANCE' },
      })
      await tx.approval.create({
        data: {
          shift_id: id,
          approver_id: session!.user.id,
          action: 'APPROVE',
          catatan: catatan ?? null,
        },
      })
      // Notifikasi ke kasir pemilik shift
      await createNotification(tx, {
        user_id: shift.opened_by,
        type: NotifType.SHIFT_APPROVED,
        shift_id: id,
        message: `Shift ${id} kamu telah disetujui oleh Head Kasir. Menunggu konfirmasi Finance.`,
      })
      // Notifikasi ke Finance
      await notifyByRole(tx, {
        role: Role.FINANCE,
        type: NotifType.SHIFT_PENDING_REVIEW,
        shift_id: id,
        message: `Shift ${id} dari ${shift.opener.full_name} sudah disetujui Head Kasir dan menunggu penutupan Finance.`,
      })
      return upd
    })

    return NextResponse.json({ data: updated, message: 'Laporan berhasil di-approve.' })
  }

  // ── REJECT (Head Cashier) ─────────────────────────────────────────────────
  if (action === 'REJECT') {
    if (session!.user.role !== Role.HEAD_CASHIER) {
      return NextResponse.json(
        { error: 'Hanya Head Cashier yang bisa reject.' },
        { status: 403 },
      )
    }
    if (shift.opened_by === session!.user.id) {
      return NextResponse.json(
        { error: 'Kamu tidak bisa reject shift milikmu sendiri.' },
        { status: 403 },
      )
    }
    if (shift.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Shift berstatus ${shift.status}, tidak bisa di-reject.` },
        { status: 422 },
      )
    }
    if (!catatan || catatan.trim().length === 0) {
      return NextResponse.json(
        { error: 'Alasan reject wajib diisi agar kasir mengetahui kesalahannya.' },
        { status: 422 },
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      const upd = await tx.shiftReport.update({
        where: { id },
        data: { status: 'OPEN' },
      })
      await tx.approval.create({
        data: {
          shift_id: id,
          approver_id: session!.user.id,
          action: 'REJECT',
          catatan,
        },
      })
      // Notifikasi reject ke kasir — sertakan alasan langsung di message
      await createNotification(tx, {
        user_id: shift.opened_by,
        type: NotifType.SHIFT_REJECTED,
        shift_id: id,
        message: `Shift ${id} kamu ditolak. Alasan: ${catatan.trim()}`,
      })
      return upd
    })

    return NextResponse.json({
      data: updated,
      message: 'Laporan ditolak. Kasir dapat melakukan perbaikan dan submit ulang.',
    })
  }

  // ── CLOSE (Finance) ───────────────────────────────────────────────────────
  if (action === 'CLOSE') {
    if (session!.user.role !== Role.FINANCE) {
      return NextResponse.json(
        { error: 'Hanya Finance yang bisa menutup laporan.' },
        { status: 403 },
      )
    }
    if (shift.status !== 'PENDING_FINANCE') {
      return NextResponse.json(
        { error: `Shift berstatus ${shift.status}, tidak bisa di-close.` },
        { status: 422 },
      )
    }

    const now = new Date()
    const updated = await prisma.$transaction(async (tx) => {
      const upd = await tx.shiftReport.update({
        where: { id },
        data: { status: 'CLOSED', closed_at: now },
      })
      await tx.approval.create({
        data: {
          shift_id: id,
          approver_id: session!.user.id,
          action: 'CLOSE',
          catatan: catatan ?? null,
          timestamp: now,
        },
      })
      // Notifikasi ke kasir pemilik shift
      await createNotification(tx, {
        user_id: shift.opened_by,
        type: NotifType.SHIFT_CLOSED,
        shift_id: id,
        message: `Shift ${id} kamu telah resmi ditutup oleh Finance. PDF laporan sudah tersedia.`,
      })
      return upd
    })

    return NextResponse.json({
      data: updated,
      message: 'Laporan berhasil ditutup. PDF dapat di-generate.',
    })
  }

  return NextResponse.json({ error: 'Action tidak dikenal.' }, { status: 400 })
}
