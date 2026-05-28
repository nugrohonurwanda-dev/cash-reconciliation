// src/app/(dashboard)/shifts/[id]/page.tsx
'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { parseRupiah } from '@/utils/format'
import { useShiftDetail } from '@/hooks/useShiftDetail'
import StatusBadge from '@/components/shifts/StatusBadge'
import ShiftReadOnlyView from '@/components/shifts/ShiftReadOnlyView'
import EsbFisikForm from '@/components/shifts/EsbFisikForm'
import SpecialLogsPanel from '@/components/shifts/SpecialLogsPanel'
import SubmitPanel from '@/components/shifts/SubmitPanel'
import { SkeletonShiftDetail } from '@/components/ui/LoadingSkeleton'
import type { Tab } from '@/types/shift'

const formatModalAwal = (val: string | undefined) =>
  val ? `Rp ${parseInt(val).toLocaleString('id-ID')}` : '—'

export default function ShiftDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()

  const [activeTab, setActiveTab] = useState<Tab>('esb')

  const {
    shift, loading, saving, error, success,
    showConfirm, setShowConfirm,
    esbLines, fisikLines,
    varianceNote, setVarianceNote,
    voidDiscountLogs, setVoidDiscountLogs,
    otherCostLogs,   setOtherCostLogs,
    draftRestored, draftExpired, setDraftExpired,
    updateEsbLine, updateFisikLine,
    saveTransactions, saveSpecialLogs, submitShift,
    resetForm,
  } = useShiftDetail(id, session?.user?.id)

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <SkeletonShiftDetail />
      </div>
    )
  }

  const isClosed  = shift?.status === 'CLOSED'
  const isPending = shift?.status === 'PENDING' || shift?.status === 'PENDING_FINANCE'
  // Form input hanya boleh diakses pemilik shift, tidak peduli role
  const isOwner   = !!session?.user?.id && session.user.id === shift?.opened_by

  const tabs: { key: Tab; label: string }[] = [
    { key: 'esb',     label: '1. Data ESB' },
    { key: 'fisik',   label: '2. Data Fisik' },
    { key: 'special', label: '3. Special Logs' },
    { key: 'submit',  label: '4. Submit' },
  ]
  const tabOrder: Tab[] = ['esb', 'fisik', 'special', 'submit']

  // Totals untuk SubmitPanel (dihitung dari form state, bukan dari DB)
  const totalEsb          = esbLines.reduce((s, l) => s + parseRupiah(l.nilai || '0'), 0)
  const totalFisik        = fisikLines.reduce((s, l) => s + parseRupiah(l.nilai || '0'), 0)
  const totalSelisih      = totalFisik - totalEsb
  const isVarianceExceeded = totalSelisih < -50_000

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Detail Shift</h1>
          <p className="text-[var(--muted)] text-sm mt-1">
            {new Date(shift?.shift_date ?? '').toLocaleDateString('id-ID', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
        <StatusBadge status={shift?.status ?? ''} />
      </div>

      {/* ── Info card ──────────────────────────────────────────────────── */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        {[
          { label: 'Kasir',     value: shift?.opener?.full_name },
          { label: 'Periode',   value: shift?.shift_period === 'SHIFT_1' ? 'Shift 1 — Pagi' : 'Shift 2 — Siang' },
          { label: 'Jam Buka',  value: new Date(shift?.opened_at ?? '').toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) },
          { label: 'Modal Awal', value: formatModalAwal(shift?.modal_awal) },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-[var(--text-tertiary)]">{label}</p>
            <p className="font-medium text-[var(--foreground)] mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Banners ────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">{success}</div>
      )}
      {draftRestored && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Draft ditemukan.</span> Data input sebelumnya telah dipulihkan secara otomatis.
          </p>
          <button onClick={resetForm} className="text-xs text-amber-600 hover:text-amber-800 font-medium ml-4 shrink-0">
            Abaikan draft
          </button>
        </div>
      )}
      {draftExpired && (
        <div className="bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-[var(--text-secondary)]">
            Draft input sebelumnya sudah kedaluarsa dan telah dihapus otomatis. Silakan isi ulang data shift.
          </p>
          <button onClick={() => setDraftExpired(false)} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] font-medium ml-4 shrink-0">
            Tutup
          </button>
        </div>
      )}

      {/* ── Tab panel — hanya OPEN + pemilik shift ─────────────────────── */}
      {!isClosed && !isPending && isOwner && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">

          {/* Step indicator */}
          <div className="flex items-center border-b border-[var(--border)] px-4 py-3 gap-1 overflow-x-auto">
            {tabs.map((tab, i) => {
              const activeIdx = tabOrder.indexOf(activeTab)
              const thisIdx   = tabOrder.indexOf(tab.key)
              const isActive  = activeTab === tab.key
              const isDone    = thisIdx < activeIdx
              const isUpcoming = thisIdx > activeIdx

              return (
                <div key={tab.key} className="flex items-center min-w-0">
                  <button
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0 ${
                      isActive   ? 'bg-blue-600 text-white shadow-sm'
                      : isDone   ? 'text-emerald-700 hover:bg-emerald-50'
                      : 'text-[var(--muted)] hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isActive ? 'bg-white/20 text-white'
                      : isDone  ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-[var(--surface-hover)] text-[var(--text-tertiary)]'
                    }`}>
                      {isDone ? '✓' : i + 1}
                    </span>
                    <span className={`hidden sm:inline ${isUpcoming ? 'opacity-50' : ''}`}>
                      {tab.label.replace(/^\d+\. /, '')}
                    </span>
                  </button>
                  {i < tabs.length - 1 && (
                    <span className={`mx-1 text-xs shrink-0 ${isDone ? 'text-emerald-400' : 'text-[var(--border)]'}`}>—</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Tab content */}
          <div className="p-6">
            {(activeTab === 'esb' || activeTab === 'fisik') && (
              <EsbFisikForm
                esbLines={esbLines}
                fisikLines={fisikLines}
                updateEsbLine={updateEsbLine}
                updateFisikLine={updateFisikLine}
                saveTransactions={async (sumber) => {
                  await saveTransactions(sumber)
                  if (sumber === 'ESB')   setActiveTab('fisik')
                  else                    setActiveTab('special')
                }}
                saving={saving}
                activeTab={activeTab}
                onBack={() => setActiveTab('esb')}
              />
            )}
            {activeTab === 'special' && (
              <SpecialLogsPanel
                voidDiscountLogs={voidDiscountLogs}
                otherCostLogs={otherCostLogs}
                setVoidDiscountLogs={setVoidDiscountLogs}
                setOtherCostLogs={setOtherCostLogs}
                saveSpecialLogs={async () => {
                  await saveSpecialLogs()
                  setActiveTab('submit')
                }}
                saving={saving}
                onBack={() => setActiveTab('fisik')}
              />
            )}
            {activeTab === 'submit' && (
              <SubmitPanel
                shift={shift}
                varianceNote={varianceNote}
                setVarianceNote={setVarianceNote}
                totals={{ totalEsb, totalFisik, totalSelisih, isVarianceExceeded }}
                onShowConfirm={() => setShowConfirm(true)}
                onBack={() => setActiveTab('special')}
                saving={saving}
                error={error}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Modal konfirmasi submit ─────────────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--foreground)]">Konfirmasi Submit Laporan</h2>
                <p className="text-sm text-[var(--muted)]">Pastikan semua data sudah benar</p>
              </div>
            </div>

            <div className="bg-[var(--surface-hover)] rounded-xl p-4 space-y-2 text-sm">
              {[
                { label: 'Kasir',      value: shift?.opener?.full_name },
                { label: 'Tanggal',    value: new Date(shift?.shift_date ?? '').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) },
                { label: 'Modal Awal', value: formatModalAwal(shift?.modal_awal) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-[var(--muted)]">{label}</span>
                  <span className="font-medium text-[var(--foreground)]">{value}</span>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              Setelah submit, laporan <strong>tidak dapat diedit</strong> dan akan menunggu review Head Cashier.
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowConfirm(false)} disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition">
                Periksa Lagi
              </button>
              <button onClick={submitShift} disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition">
                {saving ? 'Memproses...' : 'Ya, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Read-only view (PENDING / CLOSED) ─────────────────────────── */}
      {(isPending || isClosed) && shift && <ShiftReadOnlyView shift={shift} />}

    </div>
  )
}