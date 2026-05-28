// src/components/shifts/ShiftReadOnlyView.tsx
'use client'

import { useRouter } from 'next/navigation'
import { CATEGORY_LABEL, ACTION_LABEL, ROLE_LABEL } from '@/lib/constants'
import DailyAccumulationCard from '@/components/shifts/DailyAccumulationCard'
import type { Shift } from '@/types/shift'

// ─── 15 kategori payment — harus sama dengan PaymentCategory enum Prisma ──────
const KATEGORI_LIST = [
  'CASH',
  'EDC_BRI', 'EDC_BNI', 'EDC_BCA', 'EDC_BSI',
  'QRIS_BRI', 'QRIS_BNI', 'QRIS_BCA', 'QRIS_BSI',
  'TRANSFER_BRI', 'TRANSFER_BNI', 'TRANSFER_BCA',
  'DEPOSIT_BANK', 'DEPOSIT_CASH',
]

interface Props {
  shift: Shift
}

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

const selisihClass = (n: number) =>
  n < 0 ? 'text-red-600' : n > 0 ? 'text-emerald-600' : 'text-[var(--text-tertiary)]'

export default function ShiftReadOnlyView({ shift }: Props) {
  const router = useRouter()

  const lines = shift.transaction_lines ?? []

  const recon = KATEGORI_LIST.map((k) => {
    const esb = lines
      .filter((l: any) => l.sumber === 'ESB' && l.kategori === k)
      .reduce((sum: number, l: any) => sum + parseFloat(l.nilai), 0)
    const fisik = lines
      .filter((l: any) => l.sumber === 'FISIK' && l.kategori === k)
      .reduce((sum: number, l: any) => sum + parseFloat(l.nilai), 0)
    return { kategori: k, esb, fisik, selisih: fisik - esb }
  })

  const totalEsb   = recon.reduce((s, r) => s + r.esb, 0)
  const totalFisik = recon.reduce((s, r) => s + r.fisik, 0)
  const totalSelisih = totalFisik - totalEsb
  // Semua kategori masuk omzet — deposit kini dihitung sebagai bagian omzet
  const totalFisikSales = totalFisik

  const specialLogs    = shift.special_logs ?? []
  const totalVoid      = specialLogs.filter((l: any) => l.tipe === 'VOID').reduce((s: number, l: any) => s + parseFloat(l.nominal), 0)
  const totalDiscount  = specialLogs.filter((l: any) => l.tipe === 'DISCOUNT').reduce((s: number, l: any) => s + parseFloat(l.nominal), 0)
  const totalOtherCost = specialLogs.filter((l: any) => l.tipe === 'OTHER_COST').reduce((s: number, l: any) => s + parseFloat(l.nominal), 0)
  // other_cost TIDAK mengurangi omzet (konsisten dengan server/PDF)
  const omzetBersih = totalFisikSales - totalVoid - totalDiscount

  return (
    <div className="space-y-5">
      {/* Keterangan selisih */}
      {shift.variance_note && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-red-600 mb-1">⚠ Keterangan Selisih</p>
          <p className="text-sm text-red-700">{shift.variance_note}</p>
        </div>
      )}

      {/* Rekonsiliasi per kategori */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Rekonsiliasi per Kategori</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface-hover)]">
            <tr>
              {['Kategori', 'Nilai ESB', 'Nilai Fisik', 'Selisih'].map((h, i) => (
                <th key={h} className={`px-4 py-3 text-[var(--muted)] font-medium ${i === 0 ? 'text-left' : 'text-right'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recon.map((r, i) => (
              <tr key={r.kategori} className={`border-t border-[var(--border)] ${i % 2 === 1 ? 'bg-[var(--surface-hover)]/50' : ''}`}>
                <td className="px-4 py-3 font-medium text-[var(--text-secondary)]">
                  {CATEGORY_LABEL[r.kategori as keyof typeof CATEGORY_LABEL] ?? r.kategori}
                </td>
                <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{fmt(r.esb)}</td>
                <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{fmt(r.fisik)}</td>
                <td className={`px-4 py-3 text-right font-semibold ${selisihClass(r.selisih)}`}>
                  {r.selisih >= 0 ? '+' : ''}{fmt(r.selisih)}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-[var(--border)] bg-[var(--surface-accent)]">
              <td className="px-4 py-3 font-bold text-[var(--foreground)]">TOTAL</td>
              <td className="px-4 py-3 text-right font-bold text-[var(--foreground)]">{fmt(totalEsb)}</td>
              <td className="px-4 py-3 text-right font-bold text-[var(--foreground)]">{fmt(totalFisik)}</td>
              <td className={`px-4 py-3 text-right font-bold ${selisihClass(totalSelisih)}`}>
                {totalSelisih >= 0 ? '+' : ''}{fmt(totalSelisih)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Ringkasan void / discount / other cost */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Void',       value: totalVoid,       color: 'text-red-600' },
          { label: 'Total Discount',   value: totalDiscount,   color: 'text-amber-600' },
          { label: 'Total Other Cost', value: totalOtherCost,  color: 'text-violet-600' },
        ].map((item) => (
          <div key={item.label} className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
            <p className="text-xs text-[var(--text-tertiary)]">{item.label}</p>
            <p className={`text-lg font-bold mt-1 ${item.color}`}>{fmt(item.value)}</p>
          </div>
        ))}
      </div>

      {/* Total omzet bersih */}
      <div className="bg-[var(--surface-accent)] border border-[var(--border)] rounded-xl p-5 flex items-center justify-between">
        <p className="text-[var(--text-tertiary)] text-sm">Total Omzet Bersih</p>
        <p className="text-[var(--primary)] text-2xl font-bold">{fmt(omzetBersih)}</p>
      </div>

      {/* Akumulasi harian (Shift 2 only) */}
      {shift.daily_accumulation && (
        <div className="space-y-2">
          {shift.daily_accumulation.shift_1 === null && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-2">
              <span className="text-amber-500 mt-0.5 shrink-0">⚠</span>
              <p className="text-xs text-amber-700">
                <span className="font-semibold">Data Shift 1 belum final.</span>{' '}
                Angka akumulasi di bawah bisa berubah selama Shift 1 belum ditutup.
              </p>
            </div>
          )}
          <DailyAccumulationCard data={shift.daily_accumulation} />
        </div>
      )}

      {/* Special logs */}
      {specialLogs.length > 0 && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Special Logs</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-hover)]">
              <tr>
                {['Tipe', 'Detail', 'Nominal'].map((h, i) => (
                  <th key={h} className={`px-4 py-3 text-[var(--muted)] font-medium ${i === 2 ? 'text-right' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {specialLogs.map((log: any) => (
                <tr key={log.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                      log.tipe === 'VOID'     ? 'bg-red-100 text-red-700'
                      : log.tipe === 'DISCOUNT' ? 'bg-amber-100 text-amber-700'
                      : 'bg-violet-100 text-violet-700'
                    }`}>
                      {log.tipe}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {log.tipe === 'VOID' || log.tipe === 'DISCOUNT'
                      ? `Bill: ${log.nomor_bill ?? '-'} — ${log.alasan ?? '-'}`
                      : `${log.kategori_biaya ?? '-'} — ${log.keterangan ?? '-'}`}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-[var(--foreground)]">
                    {fmt(parseFloat(log.nominal))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Approval trail */}
      {(shift.approvals?.length ?? 0) > 0 && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Approval Trail</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-hover)]">
              <tr>
                {['Nama', 'Role', 'Aksi', 'Waktu', 'Catatan'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[var(--muted)] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(shift.approvals ?? []).map((a: any) => (
                <tr key={a.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-medium text-[var(--foreground)]">{a.approver?.full_name}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {ROLE_LABEL[a.approver?.role] ?? a.approver?.role}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                      a.action === 'APPROVE' ? 'bg-emerald-100 text-emerald-700'
                      : a.action === 'REJECT'  ? 'bg-red-100 text-red-700'
                      : 'bg-[var(--surface-hover)] text-[var(--text-secondary)]'
                    }`}>
                      {ACTION_LABEL[a.action] ?? a.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {new Date(a.timestamp).toLocaleString('id-ID', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{a.catatan ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        <button
          onClick={() => router.back()}
          className="text-[var(--muted)] hover:text-[var(--text-secondary)] text-sm font-medium px-4 py-2.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] transition"
        >
          ← Kembali
        </button>
      </div>
    </div>
  )
}