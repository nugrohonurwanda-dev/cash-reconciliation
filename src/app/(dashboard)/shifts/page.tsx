// src/app/(dashboard)/shifts/page.tsx
// Redirect ke /shifts/new — halaman daftar shift tidak diperlukan untuk cashier.
// Head Cashier dan Finance menggunakan /review dan /finance untuk melihat daftar shift.
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function ShiftsIndexPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;
    // Cashier -> langsung ke form buka shift; role lain -> ke dashboard
    if (session?.user?.role === "CASHIER") {
      router.replace("/shifts/new");
    } else {
      router.replace("/dashboard");
    }
  }, [session, status, router]);

  return (
    <div className="flex items-center justify-center h-40">
      <p className="text-[var(--muted)] text-sm">Mengalihkan...</p>
    </div>
  );
}
