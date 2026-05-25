#!/usr/bin/env node
// scripts/generate-pdf.mjs
//
// Dijalankan sebagai child process dari /api/shifts/[id]/pdf/route.ts
// Tujuan: hindari webpack bundling issue antara Next.js RSC dan @react-pdf/renderer
//
// Input  : JSON via stdin  { shift, recon, salesBreakdown, headCashierApproval, financeApproval, dailyAccumulation }
// Output : PDF buffer via stdout (binary)
//
// Rekonsiliasi:
//   selisih per kategori = Fisik - ESB  (positif = lebih, negatif = kurang)
//   omzet_bersih = total_fisik_sales - void - discount
//   other_cost   = pengeluaran operasional, TIDAK mengurangi omzet (dicatat terpisah)
//   deposit      = MASUK omzet (DEPOSIT_BANK & DEPOSIT_CASH termasuk dalam total_fisik_sales)

import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const ce = React.createElement

// ─── Helpers ──────────────────────────────────────────────────────────────────

const safeNum = (v) => {
  if (v == null) return 0
  const n = typeof v === 'object' && 'toString' in v
    ? parseFloat(v.toString())
    : Number(v)
  return isNaN(n) ? 0 : n
}

const fmt = (v) => `Rp ${safeNum(v).toLocaleString('id-ID')}`

const fmtDate = (d) => {
  if (!d) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
  }).format(new Date(d))
}

const fmtDateTime = (d) => {
  if (!d) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
  }).format(new Date(d))
}

// ─── Constants ────────────────────────────────────────────────────────────────

const KATEGORI_LABEL = {
  CASH:         'Cash',
  EDC_BRI:      'EDC BRI',
  EDC_BNI:      'EDC BNI',
  EDC_BCA:      'EDC BCA',
  EDC_BSI:      'EDC BSI',
  QRIS_BRI:     'QRIS BRI',
  QRIS_BNI:     'QRIS BNI',
  QRIS_BCA:     'QRIS BCA',
  QRIS_BSI:     'QRIS BSI',
  TRANSFER_BRI: 'Transfer BRI',
  TRANSFER_BNI: 'Transfer BNI',
  TRANSFER_BCA: 'Transfer BCA',
  TRANSFER_BSI: 'Transfer BSI',
  DEPOSIT_BANK: 'Deposit Bank',
  DEPOSIT_CASH: 'Deposit Cash',
}

const NON_SALES  = [] // deposit kini masuk omzet
const ROLE_LABEL = { CASHIER: 'Kasir', HEAD_CASHIER: 'Head Kasir', FINANCE: 'Finance' }
const TIPE_LABEL = { VOID: 'Void', DISCOUNT: 'Discount', OTHER_COST: 'Other Cost' }

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Page
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1e293b',
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
  },

  // Header
  headerBar: {
    backgroundColor: '#0f172a',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerCompany:   { color: '#ffffff', fontSize: 13, fontFamily: 'Helvetica-Bold' },
  headerSub:       { color: '#94a3b8', fontSize: 8, marginTop: 3 },
  headerRight:     { alignItems: 'flex-end' },
  closedBadge: {
    backgroundColor: '#22c55e',
    color: '#052e16',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  headerGenerated: { color: '#64748b', fontSize: 7, marginTop: 5 },

  // Title bar
  titleBar: {
    backgroundColor: '#1e3a5f',
    borderRadius: 5,
    paddingVertical: 9,
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleText: { color: '#ffffff', fontSize: 11, fontFamily: 'Helvetica-Bold' },
  titleMeta: { color: '#bfdbfe', fontSize: 7.5, textAlign: 'right' },

  // Info grid
  infoGrid: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  infoCell: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f8fafc',
  },
  infoKey: {
    fontSize: 7,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  infoVal:       { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  infoValAccent: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#2563eb' },

  // Variance note
  noteBar: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  noteLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#991b1b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  noteText: { fontSize: 8.5, color: '#991b1b' },

  // Section headings
  sectionTitle: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f172a',
    paddingBottom: 4,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 7.5,
    color: '#64748b',
    fontFamily: 'Helvetica-Oblique',
    marginBottom: 7,
    marginTop: -5,
  },

  // Table
  table:  { width: '100%', marginBottom: 8 },
  thead:  {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 3,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  th: {
    color: '#ffffff',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.3,
  },
  thRight: {
    color: '#ffffff',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.3,
    textAlign: 'right',
  },

  // Table rows
  row: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f1f5f9',
  },
  rowEven: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 0.5,
    borderBottomColor: '#f1f5f9',
  },
  rowNonSales: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#faf5ff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e9d5ff',
  },
  rowTotal: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#1e3a5f',
    borderRadius: 3,
    marginTop: 2,
  },

  // Table cells
  td:               { fontSize: 8.5, color: '#334155' },
  tdRight:          { fontSize: 8.5, color: '#334155', textAlign: 'right' },
  tdBold:           { fontSize: 8.5, color: '#334155', fontFamily: 'Helvetica-Bold' },
  tdMuted:          { fontSize: 8.5, color: '#94a3b8', textAlign: 'right' },
  tdGreen:          { fontSize: 8.5, color: '#16a34a', textAlign: 'right' },
  tdRed:            { fontSize: 8.5, color: '#dc2626', textAlign: 'right' },
  tdTotalWhite:     { fontSize: 8.5, color: '#ffffff', fontFamily: 'Helvetica-Bold' },
  tdTotalWhiteRight:{ fontSize: 8.5, color: '#ffffff', fontFamily: 'Helvetica-Bold', textAlign: 'right' },

  // Special logs summary cards
  logsGrid: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  logCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 5,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  logLabel: {
    fontSize: 7,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  logValRed:    { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#dc2626' },
  logValAmber:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#d97706' },
  logValViolet: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#7c3aed' },

  // Other cost note
  otherCostNote: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  otherCostText: { fontSize: 7.5, color: '#9a3412', fontFamily: 'Helvetica-Oblique' },

  // Deposit info
  depositInfoBox: {
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    borderRadius: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  depositInfoText: { fontSize: 8, color: '#6b21a8', fontFamily: 'Helvetica-Oblique' },

  // Omzet bersih box
  omzetBox: {
    backgroundColor: '#0f172a',
    borderRadius: 7,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  omzetLabel: {
    fontSize: 8,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  omzetVal:   { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  omzetSub:   { fontSize: 7, color: '#475569', marginTop: 4 },
  omzetRight: { alignItems: 'flex-end' },

  // Daily accumulation section
  accumSection: {
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    borderRadius: 7,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  accumTitle: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#5b21b6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  // Signature section
  signRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  signBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  signRole: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 4,
  },
  signArea:  { height: 44, borderBottomWidth: 1, borderBottomColor: '#cbd5e1', marginBottom: 5 },
  signName:  { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#0f172a', textAlign: 'center' },
  signTime:  { fontSize: 7, color: '#94a3b8', textAlign: 'center', marginTop: 2 },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: '#94a3b8' },
})

// ─── Build rekonsiliasi rows (tanpa subtotal per grup) ────────────────────────

function buildReconRows(perKategori) {
  return perKategori.map((r, i) => {
    const isNonSales = NON_SALES.includes(r.kategori)
    const sel        = safeNum(r.selisih)
    const selStyle   = sel < 0 ? s.tdRed : sel > 0 ? s.tdGreen : s.tdMuted
    const rowStyle   = isNonSales ? s.rowNonSales : i % 2 === 0 ? s.row : s.rowEven
    const label      = (KATEGORI_LABEL[r.kategori] ?? r.kategori) + (isNonSales ? ' *' : '')

    return ce(View, { key: r.kategori, style: rowStyle },
      ce(Text, { style: { ...s.td,      flex: 2 } }, label),
      ce(Text, { style: { ...s.tdRight, flex: 2 } }, fmt(r.esb)),
      ce(Text, { style: { ...s.tdRight, flex: 2 } }, fmt(r.fisik)),
      ce(Text, { style: { ...selStyle,  flex: 2 } }, `${sel >= 0 ? '+' : ''}${fmt(r.selisih)}`),
    )
  })
}

// ─── Build Document ────────────────────────────────────────────────────────────

function buildPDFDocument(data) {
  const {
    shift,
    recon,
    salesBreakdown,
    headCashierApproval,
    financeApproval,
    dailyAccumulation,
  } = data

  // Totals
  const totalSelisih   = safeNum(recon.total_selisih)
  const totalEsb       = safeNum(recon.total_esb)
  const totalFisik     = safeNum(recon.total_fisik)
  const omzetKotor     = safeNum(salesBreakdown?.omzet_kotor    ?? 0)
  const totalVoid      = safeNum(salesBreakdown?.total_void     ?? 0)
  const totalDiscount  = safeNum(salesBreakdown?.total_discount ?? 0)
  const omzetBersih    = safeNum(salesBreakdown?.omzet_bersih   ?? 0)
  const totalOtherCost = safeNum(salesBreakdown?.total_other_cost ?? 0)
  const totalDeposit   = safeNum(salesBreakdown?.total_deposit  ?? 0)

  const periodLabel = shift.shift_period === 'SHIFT_1' ? 'Shift 1' : 'Shift 2'

  // Row builders
  const reconRows = buildReconRows(recon.per_kategori)

  const specialLogRows = (shift.special_logs ?? []).map((log, i) => {
    const ket = log.tipe === 'VOID' || log.tipe === 'DISCOUNT'
      ? `Bill: ${log.nomor_bill ?? '-'} — ${log.alasan ?? '-'}`
      : `${log.kategori_biaya ?? '-'} — ${log.keterangan ?? '-'}`
    return ce(View, { key: i, style: i % 2 === 0 ? s.row : s.rowEven },
      ce(Text, { style: { ...s.td,      flex: 1.5 } }, TIPE_LABEL[log.tipe] ?? log.tipe),
      ce(Text, { style: { ...s.td,      flex: 3   } }, ket),
      ce(Text, { style: { ...s.tdRight, flex: 2   } }, fmt(log.nominal)),
    )
  })

  const approvalRows = (shift.approvals ?? []).map((a, i) => {
    const actionStyle = a.action === 'APPROVE' ? s.tdGreen
      : a.action === 'REJECT' ? s.tdRed
      : s.td
    return ce(View, { key: i, style: i % 2 === 0 ? s.row : s.rowEven },
      ce(Text, { style: { ...s.td,          flex: 2   } }, a.approver?.full_name ?? '-'),
      ce(Text, { style: { ...s.td,          flex: 1.5 } }, ROLE_LABEL[a.approver?.role ?? ''] ?? '-'),
      ce(Text, { style: { ...actionStyle,   flex: 1, textAlign: 'center' } }, a.action),
      ce(Text, { style: { ...s.td,          flex: 2   } }, fmtDateTime(a.timestamp)),
      ce(Text, { style: { ...s.td,          flex: 2   } }, a.catatan ?? '-'),
    )
  })

  // Sign boxes: Kasir / Head Kasir / Finance
  const kasirApproval = (shift.approvals ?? []).find((a) => a.approver?.role === 'CASHIER')
  const signBoxes = [
    { role: 'Kasir',      approval: kasirApproval      },
    { role: 'Head Kasir', approval: headCashierApproval },
    { role: 'Finance',    approval: financeApproval     },
  ].map((box, i) =>
    ce(View, { key: i, style: s.signBox },
      ce(Text,  { style: s.signRole }, box.role),
      ce(View,  { style: s.signArea }),
      ce(Text,  { style: s.signName }, box.approval?.approver?.full_name ?? ''),
      ce(Text,  { style: s.signTime }, box.approval ? fmtDateTime(box.approval.timestamp) : ''),
    )
  )

  // Daily accumulation rows
  const accumRows = dailyAccumulation
    ? dailyAccumulation.combined.per_kategori
        .filter((row) => {
          const v1 = safeNum(dailyAccumulation.shift_1?.per_kategori?.find((r) => r.kategori === row.kategori)?.fisik)
          const v2 = safeNum(dailyAccumulation.shift_2?.per_kategori?.find((r) => r.kategori === row.kategori)?.fisik)
          return v1 > 0 || v2 > 0
        })
        .map((row, i) => {
          const r1       = dailyAccumulation.shift_1?.per_kategori?.find((r) => r.kategori === row.kategori)
          const r2       = dailyAccumulation.shift_2?.per_kategori?.find((r) => r.kategori === row.kategori)
          const v1       = safeNum(r1?.fisik)
          const v2       = safeNum(r2?.fisik)
          const vt       = safeNum(row.fisik)
          const isNS     = NON_SALES.includes(row.kategori)
          const label    = (KATEGORI_LABEL[row.kategori] ?? row.kategori) + (isNS ? ' *' : '')
          return ce(View, { key: row.kategori, style: i % 2 === 0 ? s.row : s.rowEven },
            ce(Text, { style: { ...s.td,     flex: 2 } }, label),
            ce(Text, { style: { ...s.tdRight, flex: 2 } }, v1 > 0 ? fmt(v1) : '—'),
            ce(Text, { style: { ...s.tdRight, flex: 2 } }, v2 > 0 ? fmt(v2) : '—'),
            ce(Text, { style: { ...s.tdBold,  flex: 2, textAlign: 'right' } }, vt > 0 ? fmt(vt) : '—'),
          )
        })
    : []

  // ── Document ─────────────────────────────────────────────────────────────────
  return ce(Document, {},
    ce(Page, { size: 'A4', style: s.page },

      // Header
      ce(View, { style: s.headerBar },
        ce(View, {},
          ce(Text, { style: s.headerCompany }, 'Cash Reconciliation Report'),
          ce(Text, { style: s.headerSub     }, 'Laporan Rekonsiliasi Kas & Verifikasi Transaksi'),
        ),
        ce(View, { style: s.headerRight },
          ce(Text, { style: s.closedBadge    }, 'CLOSED'),
          ce(Text, { style: s.headerGenerated}, `Digenerate: ${fmtDateTime(new Date())}`),
        ),
      ),

      // Title bar
      ce(View, { style: s.titleBar },
        ce(Text, { style: s.titleText }, `Laporan ${periodLabel} — ${fmtDate(shift.shift_date)}`),
        ce(Text, { style: s.titleMeta }, `ID: ${shift.id}`),
      ),

      // Info grid
      ce(View, { style: s.infoGrid },
        ce(View, { style: s.infoCell }, ce(Text, { style: s.infoKey }, 'Kasir'),    ce(Text, { style: s.infoVal       }, shift.opener?.full_name ?? '-')),
        ce(View, { style: s.infoCell }, ce(Text, { style: s.infoKey }, 'Periode'),  ce(Text, { style: s.infoVal       }, periodLabel)),
        ce(View, { style: s.infoCell }, ce(Text, { style: s.infoKey }, 'Dibuka'),   ce(Text, { style: s.infoVal       }, fmtDateTime(shift.opened_at))),
        ce(View, { style: s.infoCell }, ce(Text, { style: s.infoKey }, 'Ditutup'),  ce(Text, { style: s.infoVal       }, fmtDateTime(shift.closed_at))),
        ce(View, { style: s.infoCell }, ce(Text, { style: s.infoKey }, 'Modal Awal'), ce(Text, { style: s.infoValAccent }, fmt(shift.modal_awal))),
      ),

      // Variance note (conditional)
      ...(shift.variance_note ? [
        ce(View, { style: s.noteBar },
          ce(Text, { style: s.noteLabel }, 'Keterangan Selisih'),
          ce(Text, { style: s.noteText  }, shift.variance_note),
        ),
      ] : []),

      // Rekonsiliasi per Kategori
      ce(Text, { style: s.sectionTitle    }, 'Rekonsiliasi per Kategori'),
      ce(View, { style: s.table },
        ce(View, { style: s.thead },
          ce(Text, { style: { ...s.th,      flex: 2 } }, 'Kategori'),
          ce(Text, { style: { ...s.thRight, flex: 2 } }, 'ESB (Sistem)'),
          ce(Text, { style: { ...s.thRight, flex: 2 } }, 'Fisik'),
          ce(Text, { style: { ...s.thRight, flex: 2 } }, 'Selisih'),
        ),
        ...reconRows,
        ce(View, { style: s.rowTotal },
          ce(Text, { style: { ...s.tdTotalWhite,      flex: 2 } }, 'GRAND TOTAL'),
          ce(Text, { style: { ...s.tdTotalWhiteRight, flex: 2 } }, fmt(totalEsb)),
          ce(Text, { style: { ...s.tdTotalWhiteRight, flex: 2 } }, fmt(totalFisik)),
          ce(Text, { style: { ...s.tdTotalWhiteRight, flex: 2 } }, `${totalSelisih >= 0 ? '+' : ''}${fmt(totalSelisih)}`),
        ),
      ),

      // Akumulasi harian — hanya tampil di Shift 2
      ...(dailyAccumulation ? [
        ce(View, { style: s.accumSection },
          ce(Text, { style: s.accumTitle }, 'Rekap Akumulasi Hari Ini (Shift 1 + Shift 2)'),
          ce(View, { style: s.table },
            ce(View, { style: s.thead },
              ce(Text, { style: { ...s.th,      flex: 2 } }, 'Kategori'),
              ce(Text, { style: { ...s.thRight, flex: 2 } }, 'Shift 1 (Fisik)'),
              ce(Text, { style: { ...s.thRight, flex: 2 } }, 'Shift 2 (Fisik)'),
              ce(Text, { style: { ...s.thRight, flex: 2 } }, 'Total'),
            ),
            ...accumRows,
            ce(View, { style: s.rowTotal },
              ce(Text, { style: { ...s.tdTotalWhite,      flex: 2 } }, 'Total Fisik'),
              ce(Text, { style: { ...s.tdTotalWhiteRight, flex: 2 } }, fmt(dailyAccumulation.shift_1?.total_fisik ?? 0)),
              ce(Text, { style: { ...s.tdTotalWhiteRight, flex: 2 } }, fmt(dailyAccumulation.shift_2?.total_fisik ?? 0)),
              ce(Text, { style: { ...s.tdTotalWhiteRight, flex: 2 } }, fmt(dailyAccumulation.combined.total_fisik)),
            ),
          ),
        ),
      ] : []),

      // Special Logs — ringkasan kartu
      ce(Text, { style: s.sectionTitle }, 'Special Logs'),
      ce(View, { style: s.logsGrid },
        ce(View, { style: s.logCard }, ce(Text, { style: s.logLabel }, 'Total Void'),     ce(Text, { style: s.logValRed    }, fmt(totalVoid))),
        ce(View, { style: s.logCard }, ce(Text, { style: s.logLabel }, 'Total Discount'), ce(Text, { style: s.logValAmber  }, fmt(totalDiscount))),
        ce(View, { style: s.logCard }, ce(Text, { style: s.logLabel }, 'Other Cost'),     ce(Text, { style: s.logValViolet }, fmt(totalOtherCost))),
      ),

      // Keterangan Other Cost
      ce(View, { style: s.otherCostNote },
        ce(Text, { style: s.otherCostText },
          'Catatan: Other Cost adalah pengeluaran operasional.' +
          'Dicatat sebagai informasi terpisah dan TIDAK mengurangi omzet penjualan.',
        ),
      ),

      // Detail tabel special logs (conditional)
      ...(shift.special_logs?.length > 0 ? [
        ce(View, { style: s.table },
          ce(View, { style: s.thead },
            ce(Text, { style: { ...s.th,      flex: 1.5 } }, 'Tipe'),
            ce(Text, { style: { ...s.th,      flex: 3   } }, 'Keterangan'),
            ce(Text, { style: { ...s.thRight, flex: 2   } }, 'Nominal'),
          ),
          ...specialLogRows,
        ),
      ] : []),

      // Info deposit (conditional)
      ...(totalDeposit > 0 ? [
        ce(View, { style: s.depositInfoBox },
          ce(Text, { style: s.depositInfoText },
            `Deposit member (Bank + Cash) sebesar ${fmt(totalDeposit)} sudah dimasukkan dalam omzet — ` +
            'Jumlah ini sudah termasuk dalam perhitungan omzet bersih.',
          ),
        ),
      ] : []),

      // Omzet bersih
      ce(View, { style: s.omzetBox },
        ce(View, {},
          ce(Text, { style: s.omzetLabel }, 'Omzet Bersih (Sales)'),
          ce(Text, { style: s.omzetVal   }, fmt(omzetBersih)),
          ce(Text, { style: s.omzetSub   },
            `Omzet Kotor ${fmt(omzetKotor)}  −  Void ${fmt(totalVoid)}  −  Discount ${fmt(totalDiscount)}`,
          ),
        ),
        ce(View, { style: s.omzetRight },
          ce(Text, { style: { fontSize: 7,  color: '#64748b'                                     } }, 'Shift ID'),
          ce(Text, { style: { fontSize: 9,  color: '#ffffff', fontFamily: 'Helvetica-Bold'       } }, shift.id),
        ),
      ),

      // Approval trail (conditional)
      ...(shift.approvals?.length > 0 ? [
        ce(Text, { style: s.sectionTitle }, 'Approval Trail'),
        ce(View, { style: s.table },
          ce(View, { style: s.thead },
            ce(Text, { style: { ...s.th,  flex: 2   } }, 'Nama'),
            ce(Text, { style: { ...s.th,  flex: 1.5 } }, 'Role'),
            ce(Text, { style: { ...s.th,  flex: 1,   textAlign: 'center' } }, 'Aksi'),
            ce(Text, { style: { ...s.th,  flex: 2   } }, 'Waktu'),
            ce(Text, { style: { ...s.th,  flex: 2   } }, 'Catatan'),
          ),
          ...approvalRows,
        ),
      ] : []),

      // Tanda tangan
      ce(Text, { style: s.sectionTitle }, 'Persetujuan'),
      ce(View, { style: s.signRow }, ...signBoxes),

      // Footer (fixed — muncul di setiap halaman)
      ce(View, { style: s.footer, fixed: true },
        ce(Text, { style: s.footerText }, 'Cash Reconciliation Management System'),
        ce(Text, { style: s.footerText }, `Digenerate: ${fmtDateTime(new Date())}`),
      ),
    ),
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let raw = ''
  for await (const chunk of process.stdin) raw += chunk
  const data = JSON.parse(raw)
  const doc  = buildPDFDocument(data)
  const buffer = await renderToBuffer(doc)
  process.stdout.write(buffer)
}

main().catch((err) => {
  process.stderr.write(`[generate-pdf] ERROR: ${err.message}\n${err.stack}\n`)
  process.exit(1)
})
