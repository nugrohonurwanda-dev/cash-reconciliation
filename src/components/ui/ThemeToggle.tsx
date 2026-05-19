// src/components/ui/ThemeToggle.tsx
'use client'

import { useEffect, useState } from 'react'
import { saveTheme, getSavedTheme, type Theme } from '@/lib/theme'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    setTheme(getSavedTheme())
  }, [])

  function cycle() {
    const next: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' }
    const newTheme = next[theme]
    setTheme(newTheme)
    saveTheme(newTheme)
  }

  const icons: Record<Theme, React.ReactNode> = {
    light: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
      </svg>
    ),
    dark: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
    system: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  }

  const labels: Record<Theme, string> = { light: 'Terang', dark: 'Gelap', system: 'Sistem' }

  return (
    <button
      onClick={cycle}
      title={`Mode: ${labels[theme]}`}
      className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium
        text-slate-400 hover:text-white hover:bg-slate-800 transition-colors w-full"
    >
      {icons[theme]}
      <span>{labels[theme]}</span>
    </button>
  )
}
