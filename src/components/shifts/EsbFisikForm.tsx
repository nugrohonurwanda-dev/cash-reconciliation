// src/components/shifts/EsbFisikForm.tsx
"use client";

import { Tab, TransactionLine } from "@/types/shift";
import { formatRupiah, parseRupiah } from "@/utils/format";

// ─── 15 kategori sesuai PaymentCategory enum Prisma ──────────────────────────
export const KATEGORI_GROUPS = [
  {
    group: "Cash",
    items: [{ key: "CASH", label: "Cash" }],
  },
  {
    group: "EDC",
    items: [
      { key: "EDC_BRI", label: "EDC BRI" },
      { key: "EDC_BNI", label: "EDC BNI" },
      { key: "EDC_BCA", label: "EDC BCA" },
      { key: "EDC_BSI", label: "EDC BSI" },
    ],
  },
  {
    group: "QRIS",
    items: [
      { key: "QRIS_BRI", label: "QRIS BRI" },
      { key: "QRIS_BNI", label: "QRIS BNI" },
      { key: "QRIS_BCA", label: "QRIS BCA" },
      { key: "QRIS_BSI", label: "QRIS BSI" },
    ],
  },
  {
    group: "Transfer",
    items: [
      { key: "TRANSFER_BRI", label: "Transfer BRI" },
      { key: "TRANSFER_BNI", label: "Transfer BNI" },
      { key: "TRANSFER_BCA", label: "Transfer BCA" },
      { key: "TRANSFER_BSI", label: "Transfer BSI" },
    ],
  },
  {
    group: "Deposit",
    items: [
      { key: "DEPOSIT_BANK", label: "Deposit Bank *" },
      { key: "DEPOSIT_CASH", label: "Deposit Cash *" },
    ],
    note: "* Deposit bukan termasuk omzet penjualan",
  },
] as const;

// Urutan flat — harus identik dengan PaymentCategory enum di Prisma
export const KATEGORI_LIST: string[] = KATEGORI_GROUPS.flatMap((g) =>
  g.items.map((item) => item.key),
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findLine(lines: TransactionLine[], key: string): TransactionLine | undefined {
  return lines.find((l) => l.kategori === key);
}

function findIdx(lines: TransactionLine[], key: string): number {
  return lines.findIndex((l) => l.kategori === key);
}

function grandTotal(lines: TransactionLine[]): number {
  return lines.reduce((sum: number, l: TransactionLine) => sum + parseRupiah(l.nilai ?? "0"), 0);
}

function fmt(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

// ─── Input Rupiah ─────────────────────────────────────────────────────────────

function InputRupiah({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-sm select-none">
        Rp
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(formatRupiah(e.target.value))}
        disabled={disabled}
        placeholder="0"
        className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--border)] outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:bg-[var(--surface-hover)] disabled:text-[var(--text-tertiary)] text-right"
      />
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type EsbFisikFormProps = {
  esbLines: TransactionLine[];
  fisikLines: TransactionLine[];
  updateEsbLine: (index: number, field: keyof TransactionLine, value: string) => void;
  updateFisikLine: (index: number, field: keyof TransactionLine, value: string) => void;
  saveTransactions: (sumber: "ESB" | "FISIK") => void;
  saving: boolean;
  activeTab: Tab;
  onBack: () => void;
};

// ─── Tab ESB ──────────────────────────────────────────────────────────────────

function EsbTab({
  esbLines,
  updateEsbLine,
  saveTransactions,
  saving,
}: Pick<EsbFisikFormProps, "esbLines" | "updateEsbLine" | "saveTransactions" | "saving">) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted)]">
        Masukkan nilai dari laporan mesin kasir (sistem ESB).
        Nilai yang tidak ada bisa dikosongkan (dianggap Rp 0).
      </p>

      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 px-4 py-2.5 bg-[var(--surface-hover)] border-b border-[var(--border)] text-xs font-medium text-[var(--muted)]">
          <span className="col-span-4">Kategori</span>
          <span className="col-span-5 text-right pr-3">Nilai ESB (Sistem)</span>
          <span className="col-span-3">Catatan</span>
        </div>

        {KATEGORI_GROUPS.map((group) => (
          <div key={group.group}>
            {group.items.map((item) => {
              const line = findLine(esbLines, item.key);
              const idx = findIdx(esbLines, item.key);
              const nilai = line?.nilai ?? "";
              const catatan = line?.catatan ?? "";

              return (
                <div
                  key={item.key}
                  className="grid grid-cols-12 items-center px-4 py-2 border-b border-[var(--border)] hover:bg-[var(--surface-hover)]/50 transition"
                >
                  <span className="col-span-4 text-sm text-[var(--text-secondary)] pl-2">
                    {item.label}
                  </span>
                  <div className="col-span-5 pr-3">
                    <InputRupiah
                      value={nilai}
                      onChange={(v) => {
                        if (idx >= 0) updateEsbLine(idx, "nilai", v);
                      }}
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={catatan}
                      onChange={(e) => {
                        if (idx >= 0) updateEsbLine(idx, "catatan", e.target.value);
                      }}
                      placeholder="Opsional"
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-[var(--text-tertiary)]"
                    />
                  </div>
                </div>
              );
            })}

            {"note" in group && group.note && (
              <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-100">
                <p className="text-xs text-amber-600">{group.note}</p>
              </div>
            )}
          </div>
        ))}

        {/* Grand total */}
        <div className="grid grid-cols-12 items-center px-4 py-3 bg-blue-50">
          <span className="col-span-4 text-sm font-bold text-blue-900 pl-2">
            Total ESB
          </span>
          <span className="col-span-5 text-right text-sm font-bold text-blue-900 pr-3">
            {fmt(grandTotal(esbLines))}
          </span>
          <span className="col-span-3" />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={() => saveTransactions("ESB")}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition"
        >
          {saving ? "Menyimpan..." : "Simpan & Lanjut →"}
        </button>
      </div>
    </div>
  );
}

// ─── Tab Fisik ────────────────────────────────────────────────────────────────

function FisikTab({
  esbLines,
  fisikLines,
  updateFisikLine,
  saveTransactions,
  saving,
  onBack,
}: Pick<
  EsbFisikFormProps,
  "esbLines" | "fisikLines" | "updateFisikLine" | "saveTransactions" | "saving" | "onBack"
>) {
  const totalEsb = grandTotal(esbLines);
  const totalFisik = grandTotal(fisikLines);
  const totalSelisih = totalFisik - totalEsb;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted)]">
        Masukkan hasil hitung fisik — uang tunai, struk EDC, slip setoran.
        Selisih dihitung otomatis per kategori.
      </p>

      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 px-4 py-2.5 bg-[var(--surface-hover)] border-b border-[var(--border)] text-xs font-medium text-[var(--muted)]">
          <span className="col-span-4">Kategori</span>
          <span className="col-span-3 text-right pr-3">ESB (Sistem)</span>
          <span className="col-span-3 text-right pr-3">Fisik</span>
          <span className="col-span-2 text-right">Selisih</span>
        </div>

        {KATEGORI_GROUPS.map((group) => (
          <div key={group.group}>
            {group.items.map((item) => {
              const fisikLine = findLine(fisikLines, item.key);
              const esbLine = findLine(esbLines, item.key);
              const idx = findIdx(fisikLines, item.key);

              const esb = parseRupiah(esbLine?.nilai ?? "0");
              const fisikNilai = fisikLine?.nilai ?? "";
              const fisik = parseRupiah(fisikNilai);
              const selisih = fisik - esb;
              const hasInput = fisikNilai !== "" && fisikNilai !== "0";

              return (
                <div
                  key={item.key}
                  className="grid grid-cols-12 items-center px-4 py-2 border-b border-[var(--border)] hover:bg-[var(--surface-hover)]/50 transition"
                >
                  <span className="col-span-4 text-sm text-[var(--text-secondary)] pl-2">
                    {item.label}
                  </span>
                  {/* ESB read-only */}
                  <span className="col-span-3 text-right text-sm text-[var(--text-tertiary)] pr-3">
                    {esb > 0 ? fmt(esb) : <span className="text-[var(--border)]">Rp 0</span>}
                  </span>
                  {/* Input Fisik */}
                  <div className="col-span-3 pr-3">
                    <InputRupiah
                      value={fisikNilai}
                      onChange={(v) => {
                        if (idx >= 0) updateFisikLine(idx, "nilai", v);
                      }}
                    />
                  </div>
                  {/* Selisih realtime */}
                  <span
                    className={`col-span-2 text-right text-sm font-medium ${
                      !hasInput
                        ? "text-[var(--border)]"
                        : selisih < 0
                          ? "text-red-600"
                          : selisih > 0
                            ? "text-emerald-600"
                            : "text-[var(--text-tertiary)]"
                    }`}
                  >
                    {hasInput
                      ? `${selisih >= 0 ? "+" : ""}${fmt(selisih)}`
                      : "—"}
                  </span>
                </div>
              );
            })}

            {"note" in group && group.note && (
              <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-100">
                <p className="text-xs text-amber-600">{group.note}</p>
              </div>
            )}
          </div>
        ))}

        {/* Grand total */}
        <div className="grid grid-cols-12 items-center px-4 py-3 bg-blue-50">
          <span className="col-span-4 text-sm font-bold text-blue-900 pl-2">
            Total Keseluruhan
          </span>
          <span className="col-span-3 text-right text-sm font-bold text-blue-700 pr-3">
            {fmt(totalEsb)}
          </span>
          <span className="col-span-3 text-right text-sm font-bold text-blue-900 pr-3">
            {fmt(totalFisik)}
          </span>
          <span
            className={`col-span-2 text-right text-sm font-bold ${
              totalSelisih < 0
                ? "text-red-600"
                : totalSelisih > 0
                  ? "text-emerald-600"
                  : "text-blue-900"
            }`}
          >
            {`${totalSelisih >= 0 ? "+" : ""}${fmt(totalSelisih)}`}
          </span>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          className="text-[var(--muted)] hover:text-[var(--text-secondary)] text-sm font-medium px-4 py-2.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] transition"
        >
          ← Kembali ke ESB
        </button>
        <button
          onClick={() => saveTransactions("FISIK")}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition"
        >
          {saving ? "Menyimpan..." : "Simpan & Lanjut →"}
        </button>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function EsbFisikForm({
  esbLines,
  fisikLines,
  updateEsbLine,
  updateFisikLine,
  saveTransactions,
  saving,
  activeTab,
  onBack,
}: EsbFisikFormProps) {
  if (activeTab === "esb") {
    return (
      <EsbTab
        esbLines={esbLines}
        updateEsbLine={updateEsbLine}
        saveTransactions={saveTransactions}
        saving={saving}
      />
    );
  }
  if (activeTab === "fisik") {
    return (
      <FisikTab
        esbLines={esbLines}
        fisikLines={fisikLines}
        updateFisikLine={updateFisikLine}
        saveTransactions={saveTransactions}
        saving={saving}
        onBack={onBack}
      />
    );
  }
  return null;
}