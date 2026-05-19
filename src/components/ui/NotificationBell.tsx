// src/components/ui/NotificationBell.tsx
// Komponen bell di sidebar — SSE untuk real-time, fallback polling DB
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { formatDateTimeID } from '@/utils/format'

type Notif = {
  id: string
  type: string
  shift_id: string | null
  message: string
  is_read: boolean
  created_at: string
}

export default function NotificationBell() {
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // ── Fetch from DB ───────────────────────────────────────────────────────────
  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      setNotifs(data.data)
      setUnread(data.unread_count)
    } catch {}
  }, [])

  // ── SSE connection ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchNotifs()

    const es = new EventSource('/api/notifications/stream')

    es.onmessage = (e) => {
      if (!e.data || e.data.startsWith(':')) return
      try {
        const newItems: Notif[] = JSON.parse(e.data)
        if (newItems.length > 0) {
          setNotifs((prev) => {
            const ids = new Set(prev.map((n) => n.id))
            const fresh = newItems.filter((n) => !ids.has(n.id))
            return [...fresh, ...prev].slice(0, 50)
          })
          setUnread((prev) => prev + newItems.filter((n) => !n.is_read).length)
        }
      } catch {}
    }

    es.onerror = () => {
      // SSE error — fallback ke interval polling
      es.close()
    }

    // Fallback polling setiap 30 detik jika SSE gagal
    const poll = setInterval(fetchNotifs, 30_000)

    return () => {
      es.close()
      clearInterval(poll)
    }
  }, [fetchNotifs])

  // ── Click outside close ─────────────────────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ── Mark as read ────────────────────────────────────────────────────────────
  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnread(0)
  }

  async function markRead(id: string) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    })
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    )
    setUnread((prev) => Math.max(0, prev - 1))
  }

  const typeColor: Record<string, string> = {
    SHIFT_REJECTED:       'bg-red-500',
    SHIFT_APPROVED:       'bg-emerald-500',
    SHIFT_PENDING_REVIEW: 'bg-amber-500',
    SHIFT_CLOSED:         'bg-slate-500',
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium
          text-slate-400 hover:text-white hover:bg-slate-800 transition-colors w-full"
      >
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span>Notifikasi</span>
        {unread > 0 && (
          <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-[var(--surface)] border border-[var(--border)]
          rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <span className="font-semibold text-sm text-[var(--foreground)]">Notifikasi</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-500 hover:text-blue-600 font-medium"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                Belum ada notifikasi
              </div>
            ) : (
              notifs.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left px-4 py-3 border-b border-[var(--border)] last:border-0
                    hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors
                    ${!n.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${typeColor[n.type] ?? 'bg-slate-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--foreground)] leading-snug">{n.message}</p>
                      <p className="text-xs text-[var(--muted)] mt-1">
                        {formatDateTimeID(n.created_at)}
                      </p>
                    </div>
                    {!n.is_read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
