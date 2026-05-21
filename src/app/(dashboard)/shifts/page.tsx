"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/utils/format";

const SHIFT_OPTIONS = [
  {
    value: "SHIFT_1",
    label: "Shift 1",
    jam: "09.00 – 17.00",
    desc: "Shift pagi",
  },
  {
    value: "SHIFT_2",
    label: "Shift 2",
    jam: "13.00 – 21.00",
    desc: "Shift siang",
  },
];

export default function BukaShiftPage() {
  const router = useRouter();
  const [modalAwal, setModalAwal] = useState("1.000.000");
  const [shiftPeriod, setShiftPeriod] = useState<"SHIFT_1" | "SHIFT_2">(
    "SHIFT_1",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const nilai = parseInt(modalAwal.replace(/\./g, ""));

    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modal_awal: nilai, shift_period: shiftPeriod }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Terjadi kesalahan.");
      return;
    }

    router.push(`/shifts/${data.data.id}`);
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Buka Shift Baru</h1>
        <p className="text-[var(--muted)] text-sm mt-1">
          Pilih periode shift dan konfirmasi modal awal
        </p>
      </div>

      {/* Card */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 space-y-5">
        {/* Info tanggal */}
        <div className="bg-[var(--surface-hover)] rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--muted)]">Tanggal</span>
            <span className="font-medium text-[var(--foreground)]">
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--muted)]">Jam Mulai</span>
            <span className="font-medium text-[var(--foreground)]">
              {new Date().toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Pilih shift */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]">
              Periode Shift
            </label>
            <div className="grid grid-cols-2 gap-3">
              {SHIFT_OPTIONS.map((opt) => {
                const active = shiftPeriod === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setShiftPeriod(opt.value as "SHIFT_1" | "SHIFT_2")
                    }
                    className={`flex flex-col items-start p-4 rounded-xl border-2 transition text-left ${
                      active
                        ? "border-blue-500 bg-blue-50"
                        : "border-[var(--border)] bg-[var(--surface)] hover:border-slate-300"
                    }`}
                  >
                    <span
                      className={`text-sm font-semibold ${active ? "text-blue-700" : "text-[var(--foreground)]"}`}
                    >
                      {opt.label}
                    </span>
                    <span
                      className={`text-xs mt-0.5 ${active ? "text-blue-500" : "text-[var(--text-tertiary)]"}`}
                    >
                      {opt.desc}
                    </span>
                    <span
                      className={`text-xs font-medium mt-2 ${active ? "text-blue-600" : "text-[var(--muted)]"}`}
                    >
                      {opt.jam}
                    </span>
                  </button>
                );
              })}
            </div>
            {shiftPeriod === "SHIFT_2" && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Shift 2 hanya bisa dibuka jika Shift 1 hari ini sudah ada dan
                kamu bukan kasir Shift 1.
              </p>
            )}
          </div>

          {/* Modal awal */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">
              Modal Awal
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-sm font-medium">
                Rp
              </span>
              <input
                type="text"
                value={modalAwal}
                onChange={(e) => setModalAwal(formatRupiah(e.target.value))}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                required
              />
            </div>
            <p className="text-xs text-[var(--text-tertiary)]">
              Default Rp 1.000.000 — ubah jika diperlukan
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-hover)] transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition"
            >
              {loading ? "Memproses..." : "Buka Shift"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
