// src/hooks/useShiftDetail.ts
//
// Custom hook yang menampung seluruh state dan logika halaman shift detail.
// Page component tinggal pakai hook ini dan fokus ke rendering saja.

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatRupiah, parseRupiah } from '@/utils/format'
import type { Shift, TransactionLine, SpecialLog } from '@/types/shift'

const KATEGORI_LIST = [
  'CASH',
  'EDC_BRI', 'EDC_BNI', 'EDC_BCA', 'EDC_BSI',
  'QRIS_BRI', 'QRIS_BNI', 'QRIS_BCA', 'QRIS_BSI',
  'TRANSFER_BRI', 'TRANSFER_BNI', 'TRANSFER_BCA',
  'DEPOSIT_BANK', 'DEPOSIT_CASH',
]

const DRAFT_TTL_MS = 8 * 60 * 60 * 1000 // 8 jam

function emptyLines(): TransactionLine[] {
  return KATEGORI_LIST.map((k) => ({ kategori: k, nilai: '', catatan: '' }))
}

export function useShiftDetail(id: string, userId?: string) {
  const router = useRouter()

  // ── Core state ──────────────────────────────────────────────────────────────
  const [shift, setShift]       = useState<Shift | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  // ── Form state ──────────────────────────────────────────────────────────────
  const [esbLines, setEsbLines]   = useState<TransactionLine[]>(emptyLines)
  const [fisikLines, setFisikLines] = useState<TransactionLine[]>(emptyLines)
  const [varianceNote, setVarianceNote] = useState('')
  const [voidDiscountLogs, setVoidDiscountLogs] = useState<SpecialLog[]>([])
  const [otherCostLogs, setOtherCostLogs]       = useState<SpecialLog[]>([])

  // ── Draft state ─────────────────────────────────────────────────────────────
  const [draftRestored, setDraftRestored] = useState(false)
  const [draftExpired, setDraftExpired]   = useState(false)

  const draftKey = userId ? `shift_draft_${userId}_${id}` : `shift_draft_${id}`
  const draftTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function clearDraft() {
    try {
      localStorage.removeItem(draftKey)
      localStorage.removeItem(`shift_draft_${id}`) // legacy key
    } catch { /* silent */ }
  }

  function resetForm() {
    clearDraft()
    setEsbLines(emptyLines())
    setFisikLines(emptyLines())
    setVarianceNote('')
    setVoidDiscountLogs([])
    setOtherCostLogs([])
    setDraftRestored(false)
  }

  // ── Fetch shift ─────────────────────────────────────────────────────────────
  const fetchShift = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/shifts/${id}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Gagal memuat data shift.')
        setShift(null)
        return
      }

      const s: Shift = data.data
      setShift(s)
      setVarianceNote(s.variance_note ?? '')

      // Populate form dari transaction_lines yang sudah ada di DB
      const tl = s.transaction_lines ?? []
      const toLines = (sumber: 'ESB' | 'FISIK'): TransactionLine[] =>
        KATEGORI_LIST.map((k) => {
          const found = tl.find((l: any) => l.sumber === sumber && l.kategori === k)
          return {
            kategori: k,
            nilai: found ? formatRupiah(String(Math.round(parseFloat(found.nilai)))) : '',
            catatan: found?.catatan ?? '',
          }
        })

      setEsbLines(toLines('ESB'))
      setFisikLines(toLines('FISIK'))

      // Restore draft hanya saat shift masih OPEN
      if (s.status === 'OPEN') {
        try {
          const raw = localStorage.getItem(draftKey)
          if (raw) {
            const draft = JSON.parse(raw)
            if (draft.expiresAt && Date.now() > draft.expiresAt) {
              localStorage.removeItem(draftKey)
              setDraftExpired(true)
            } else {
              setDraftRestored(true)
              if (draft.esbLines)         setEsbLines(draft.esbLines)
              if (draft.fisikLines)       setFisikLines(draft.fisikLines)
              if (draft.varianceNote !== undefined) setVarianceNote(draft.varianceNote)
              if (draft.voidDiscountLogs) setVoidDiscountLogs(draft.voidDiscountLogs)
              if (draft.otherCostLogs)    setOtherCostLogs(draft.otherCostLogs)
            }
          }
        } catch { /* silent */ }
      } else {
        // Shift sudah tidak OPEN — hapus draft yang mungkin masih tersisa
        try { localStorage.removeItem(draftKey) } catch { /* silent */ }
      }
    } catch {
      setError('Terjadi kesalahan jaringan.')
    } finally {
      setLoading(false)
    }
  }, [id, draftKey])

  useEffect(() => { fetchShift() }, [fetchShift])

  // ── Auto-save draft setiap 30 detik (hanya saat OPEN) ────────────────────
  useEffect(() => {
    if (!shift || shift.status !== 'OPEN') return

    const saveDraft = () => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          esbLines, fisikLines, varianceNote,
          voidDiscountLogs, otherCostLogs,
          savedAt:   new Date().toISOString(),
          expiresAt: Date.now() + DRAFT_TTL_MS,
        }))
      } catch { /* silent */ }
    }

    draftTimerRef.current = setInterval(saveDraft, 30_000)
    return () => { if (draftTimerRef.current) clearInterval(draftTimerRef.current) }
  }, [shift, esbLines, fisikLines, varianceNote, voidDiscountLogs, otherCostLogs, draftKey])

  // ── Line update helpers ──────────────────────────────────────────────────
  const updateEsbLine = (index: number, field: keyof TransactionLine, value: string) =>
    setEsbLines((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)))

  const updateFisikLine = (index: number, field: keyof TransactionLine, value: string) =>
    setFisikLines((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)))

  // ── Save transactions (ESB atau FISIK) ───────────────────────────────────
  async function saveTransactions(sumber: 'ESB' | 'FISIK') {
    setSaving(true)
    setError('')

    const lines  = sumber === 'ESB' ? esbLines : fisikLines
    const filtered = lines.filter((l) => l.nilai !== '' && l.nilai !== '0')

    if (filtered.length === 0) {
      const label = sumber === 'ESB' ? 'ESB (nilai sistem)' : 'Fisik (uang tunai)'
      setError(`Minimal satu kategori ${label} harus diisi sebelum disimpan.`)
      setSaving(false)
      return
    }

    try {
      const res = await fetch(`/api/shifts/${id}/transactions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: filtered.map((l) => ({
            sumber,
            kategori: l.kategori,
            nilai: parseRupiah(l.nilai),
            catatan: l.catatan || undefined,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? `Gagal menyimpan data ${sumber}. Coba lagi.`)
        return
      }
      setSuccess(`Data ${sumber} berhasil disimpan.`)
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  // ── Save special logs ────────────────────────────────────────────────────
  async function saveSpecialLogs() {
    setSaving(true)
    setError('')

    const logs = [
      ...voidDiscountLogs
        .filter((l) => l.nominal)
        .map((l) => ({
          tipe: l.tipe,
          nomor_bill: l.nomor_bill,
          nominal: parseRupiah(l.nominal),
          alasan: l.alasan,
        })),
      ...otherCostLogs
        .filter((l) => l.nominal)
        .map((l) => ({
          tipe: 'OTHER_COST',
          kategori_biaya: l.kategori_biaya || '',
          nominal: parseRupiah(l.nominal),
          keterangan: l.keterangan,
        })),
    ]

    try {
      const res = await fetch(`/api/shifts/${id}/special-logs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Gagal menyimpan special logs. Coba lagi.')
        return
      }
      setSuccess('Special logs berhasil disimpan.')
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  // ── Save variance note ───────────────────────────────────────────────────
  async function saveVarianceNote(): Promise<boolean> {
    if (!varianceNote.trim()) return true
    try {
      const res = await fetch(`/api/shifts/${id}/variance-note`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variance_note: varianceNote }),
      })
      return res.ok
    } catch {
      return false
    }
  }

  // ── Submit shift ─────────────────────────────────────────────────────────
  async function submitShift() {
    if (saving) return
    setSaving(true)
    setError('')

    try {
      // Cek status terkini sebelum submit — hindari double-submit
      const checkRes = await fetch(`/api/shifts/${id}`)
      const checkData = await checkRes.json()
      if (checkData.data?.status !== 'OPEN') {
        setError('Shift ini sudah tidak berstatus OPEN. Muat ulang halaman.')
        setShowConfirm(false)
        return
      }

      await saveVarianceNote()

      const res = await fetch(`/api/shifts/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SUBMIT',
          variance_note: varianceNote.trim() || undefined,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Gagal mengirim laporan. Coba lagi atau muat ulang halaman.')
        setShowConfirm(false)
        return
      }

      clearDraft()
      router.push('/dashboard')
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi.')
      setShowConfirm(false)
    } finally {
      setSaving(false)
    }
  }

  return {
    // State
    shift, loading, saving, error, success,
    showConfirm, setShowConfirm,
    esbLines, fisikLines,
    varianceNote, setVarianceNote,
    voidDiscountLogs, setVoidDiscountLogs,
    otherCostLogs, setOtherCostLogs,
    draftRestored, draftExpired, setDraftExpired,
    // Actions
    updateEsbLine, updateFisikLine,
    saveTransactions, saveSpecialLogs, submitShift,
    resetForm,
  }
}