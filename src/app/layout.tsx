import type { Metadata } from 'next'
import './globals.css'
import Providers from './providers'
import { THEME_SCRIPT } from '@/lib/theme'

export const metadata: Metadata = {
  title: 'Cash Reconciliation System',
  description: 'Sistem Rekonsiliasi Kas',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* Inline script mencegah flash of unstyled theme saat load */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="bg-[var(--background)] text-[var(--foreground)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
