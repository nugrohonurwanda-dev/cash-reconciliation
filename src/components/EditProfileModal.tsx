// src/components/EditProfileModal.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type User = { id: string; name?: string | null; username: string }

export default function EditProfileModal({
  user,
  onClose,
}: {
  user: User
  onClose: () => void
}) {
  const router = useRouter()
  const [fullName, setFullName] = useState(user.name ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSave() {
    setError('')
    setSuccess('')
    if (!fullName.trim()) return setError('Nama tidak boleh kosong.')

    setSaving(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error ?? 'Gagal menyimpan.')
      setSuccess('Nama berhasil diperbarui. Halaman akan dimuat ulang.')
      setTimeout(() => { router.refresh(); onClose() }, 1500)
    } catch {
      setError('Terjadi kesalahan jaringan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--surface)] rounded-xl shadow-xl w-full max-w-sm border border-[var(--border)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--foreground)]">Edit Profil</h2>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Username</label>
            <input
              value={user.username}
              disabled
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-slate-100 dark:bg-slate-800
                text-[var(--muted)] text-sm cursor-not-allowed"
            />
            <p className="text-xs text-[var(--muted)] mt-1">Username tidak dapat diubah.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Nama Lengkap</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)]
                bg-[var(--background)] text-[var(--foreground)] text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-emerald-500">{success}</p>}
        </div>

        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)]
              text-[var(--foreground)] text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium
              hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
