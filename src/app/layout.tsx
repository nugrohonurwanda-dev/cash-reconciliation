import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Cash Reconciliation System",
  description: "Sistem Rekonsiliasi Kas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-slate-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
