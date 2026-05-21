// src/components/shifts/SubmitPanel.tsx
"use client";

import { Shift, SubmitTotals } from "@/types/shift";

type SubmitPanelProps = {
  shift: Shift | null;
  varianceNote: string;
  setVarianceNote: React.Dispatch<React.SetStateAction<string>>;
  totals: SubmitTotals;
  onShowConfirm: () => void;
  onBack: () => void;
  saving: boolean;
  error: string;
};

export default function SubmitPanel({
  varianceNote,
  setVarianceNote,
  totals,
  onShowConfirm,
  onBack,
  saving,
}: SubmitPanelProps) {
  const { totalEsb, totalFisik, totalSelisih, isVarianceExceeded } = totals;

  return (
    <div className="space-y-5">
      <p className="text-sm text-[var(--muted)]">
        Periksa kembali data sebelum submit laporan
      </p>

      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Total ESB",
            value: totalEsb,
            color: "text-[var(--foreground)]",
          },
          {
            label: "Total Fisik",
            value: totalFisik,
            color: "text-[var(--foreground)]",
          },
          {
            label: "Selisih",
            value: totalSelisih,
            color:
              totalSelisih < 0
                ? "text-red-600"
                : totalSelisih > 0
                  ? "text-emerald-600"
                  : "text-[var(--text-tertiary)]",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-[var(--surface-hover)] rounded-lg p-3 text-center"
          >
            <p className="text-xs text-[var(--text-tertiary)] mb-1">{item.label}</p>
            <p className={`text-sm font-bold ${item.color}`}>
              {item.value >= 0 && item.label === "Selisih" ? "+" : ""}
              Rp {item.value.toLocaleString("id-ID")}
            </p>
          </div>
        ))}
      </div>

      {isVarianceExceeded && (
        <div className="bg-red-50 border-2 border-red-400 rounded-lg px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <svg
                className="w-4 h-4 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-red-700">
                ⚠ Selisih minus melebihi Rp 50.000
              </p>
              <p className="text-xs text-red-600 mt-1">
                Selisih saat ini:{" "}
                <span className="font-semibold">
                  Rp {totalSelisih.toLocaleString("id-ID")}
                </span>
                . Kamu wajib mengisi keterangan selisih di bawah sebelum bisa
                submit.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--foreground)]">
          Keterangan Selisih
          {isVarianceExceeded ? (
            <span className="text-red-500 font-semibold ml-1">
              (wajib diisi)
            </span>
          ) : (
            <span className="text-[var(--text-tertiary)] font-normal ml-1">(opsional)</span>
          )}
        </label>
        <textarea
          value={varianceNote}
          onChange={(e) => setVarianceNote(e.target.value)}
          placeholder="Jelaskan penyebab selisih jika ada..."
          rows={3}
          className={`w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition resize-none ${
            isVarianceExceeded && !varianceNote.trim()
              ? "border-red-300 focus:ring-red-400 bg-red-50/30"
              : "border-[var(--border)] focus:ring-blue-500"
          }`}
        />
        {isVarianceExceeded && !varianceNote.trim() && (
          <p className="text-xs text-red-500">
            Keterangan selisih wajib diisi sebelum submit.
          </p>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        Setelah submit, laporan tidak dapat diedit dan akan menunggu review Head
        Cashier.
      </div>

      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm font-medium px-4 py-2.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] transition"
        >
          ← Kembali
        </button>
        <button
          onClick={onShowConfirm}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition"
        >
          Submit Laporan
        </button>
      </div>
    </div>
  );
}
