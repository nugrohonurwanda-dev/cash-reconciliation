// src/components/shifts/DailyAccumulationCard.tsx
import { CATEGORY_LABEL } from '@/lib/constants'
import type { Shift } from '@/types/shift'

interface Props {
  data: NonNullable<Shift['daily_accumulation']>
}

const fmt = (v: string) => `Rp ${parseInt(v).toLocaleString('id-ID')}`

const selisihColor = (v: string) => {
  const n = parseInt(v)
  if (n < 0) return 'text-red-600'
  if (n > 0) return 'text-emerald-600'
  return 'text-[var(--text-tertiary)]'
}

export default function DailyAccumulationCard({ data }: Props) {
  return (
    <div className="bg-[var(--surface)] rounded-xl border border-violet-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-violet-200 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/30">
        <h3 className="text-sm font-semibold text-violet-800 dark:text-violet-300">
          Rekap Akumulasi Hari Ini
        </h3>
        <p className="text-xs text-violet-500 dark:text-violet-400 mt-0.5">
          Gabungan Shift 1 + Shift 2
        </p>
      </div>

      <div className="grid grid-cols-4 px-5 py-2 text-xs font-medium text-[var(--text-tertiary)] border-b border-[var(--border)]">
        <span>Kategori</span>
        <span className="text-right">Shift 1</span>
        <span className="text-right">Shift 2</span>
        <span className="text-right">Total</span>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {data.combined.per_kategori.map((row) => {
          const s1 = data.shift_1?.per_kategori.find((r) => r.kategori === row.kategori)
          const s2 = data.shift_2?.per_kategori.find((r) => r.kategori === row.kategori)
          const s1Val = parseInt(s1?.fisik ?? '0')
          const s2Val = parseInt(s2?.fisik ?? '0')
          const total = parseInt(row.fisik)

          if (s1Val === 0 && s2Val === 0 && total === 0) return null

          return (
            <div key={row.kategori} className="grid grid-cols-4 px-5 py-3 text-sm">
              <span className="text-[var(--text-secondary)]">
                {CATEGORY_LABEL[row.kategori as keyof typeof CATEGORY_LABEL] ?? row.kategori}
              </span>
              <span className="text-right text-[var(--muted)]">
                {s1Val > 0 ? `Rp ${s1Val.toLocaleString('id-ID')}` : '—'}
              </span>
              <span className="text-right text-[var(--muted)]">
                {s2Val > 0 ? `Rp ${s2Val.toLocaleString('id-ID')}` : '—'}
              </span>
              <span className="text-right font-medium text-[var(--foreground)]">
                {total > 0 ? `Rp ${total.toLocaleString('id-ID')}` : '—'}
              </span>
            </div>
          )
        })}
      </div>

      <div className="border-t border-[var(--border)] bg-[var(--surface-hover)] px-5 py-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--muted)]">Total ESB (gabungan)</span>
          <span className="font-medium text-[var(--foreground)]">{fmt(data.combined.total_esb)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--muted)]">Total Fisik (gabungan)</span>
          <span className="font-medium text-[var(--foreground)]">{fmt(data.combined.total_fisik)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold pt-2 border-t border-[var(--border)]">
          <span className="text-[var(--text-secondary)]">Selisih Keseluruhan</span>
          <span className={selisihColor(data.combined.total_selisih)}>
            {fmt(data.combined.total_selisih)}
          </span>
        </div>
      </div>
    </div>
  )
}