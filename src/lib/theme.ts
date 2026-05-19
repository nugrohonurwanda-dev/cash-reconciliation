// src/lib/theme.ts
// Utilitas dark mode — simpan preferensi di localStorage, sync ke <html> class

export type Theme = 'light' | 'dark' | 'system'

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  if (theme === 'dark' || (theme === 'system' && prefersDark)) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export function getSavedTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  return (localStorage.getItem('theme') as Theme) ?? 'system'
}

export function saveTheme(theme: Theme) {
  localStorage.setItem('theme', theme)
  applyTheme(theme)
}

/** Script inline untuk <head> — mencegah flash saat load */
export const THEME_SCRIPT = `
(function(){
  var t = localStorage.getItem('theme') || 'system';
  var d = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (t === 'dark' || (t === 'system' && d)) document.documentElement.classList.add('dark');
})();
`
