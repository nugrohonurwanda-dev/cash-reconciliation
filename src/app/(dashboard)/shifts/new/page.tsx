// src/app/(dashboard)/shifts/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function NewShiftPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [modalAwal, setModalAwal] = useState("1000000");
  const [shiftPeriod, setShiftPeriod] = useState<"SHIFT_1" | "SHIFT_2">("SHIFT_1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleBukaShift() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modal_awal: parseInt(modalAwal.replace(/\D/g, ""), 10) || 1_000_000,
          shift_period: shiftPeriod,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal membuka shift.");
        return;
      }
      // Redirect ke halaman detail shift yang baru dibuat
      router.push(`/shifts/${data.data.id}`);
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  const formatRupiah = (val: string) => {
    const num = val.replace(/\D/g, "");
    return num ? parseInt(num).toLocaleString("id-ID") : "";
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pt-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Buka Shift Baru</h1>
        <p className="text-slate-500 text-sm mt-1">
          Isi detail shift sebelum memulai rekonsiliasi.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        {/* Kasir info */}
        <div>
          <p className="text-sm text-slate-500">Kasir</p>
          <p className="font-medium text-slate-900 mt-0.5">
            {session?.user?.name ?? "—"}
          </p>
        </div>

        {/* Shift period */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">
            Periode Shift
          </label>
          <div className="flex gap-3">
            {(["SHIFT_1", "SHIFT_2"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setShiftPeriod(p)}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition ${
                  shiftPeriod === p
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {p === "SHIFT_1" ? "Shift 1" : "Shift 2"}
              </button>
            ))}
          </div>
        </div>

        {/* Modal awal */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">
            Modal Awal
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              Rp
            </span>
            <input
              type="text"
              value={formatRupiah(modalAwal)}
              onChange={(e) => setModalAwal(e.target.value.replace(/\D/g, ""))}
              placeholder="1.000.000"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          <p className="text-xs text-slate-400">Default: Rp 1.000.000</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={() => router.back()}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            Batal
          </button>
          <button
            onClick={handleBukaShift}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? "Membuka..." : "Buka Shift"}
          </button>
        </div>
      </div>
    </div>
  );
}