/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  // darkMode: 'class' — toggle dengan menambah class 'dark' di <html>
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // CSS variable tokens — bisa dipakai sebagai bg-background, text-foreground, dll
        background:  'var(--background)',
        surface:     'var(--surface)',
        foreground:  'var(--foreground)',
        muted:       'var(--muted)',
        border:      'var(--border)',
        primary:     'var(--primary)',
        'surface-hover':   'var(--surface-hover)',
        'surface-accent':  'var(--surface-accent)',
        'text-secondary':  'var(--text-secondary)',
        'text-tertiary':   'var(--text-tertiary)',
      },
      borderRadius: {
        theme: 'var(--radius)',
      },
    },
  },
  plugins: [],
}
