// src/components/shifts/EsbFisikForm.tsx
"use client";

import { Tab, TransactionLine } from "@/types/shift";
import { formatRupiah, parseRupiah } from "@/utils/format";

const KATEGORI_LABEL: Record<string, string> = {
  CASH: "Cash",
  EDC_DEBIT: "EDC Debit",
  EDC_KREDIT: "EDC Kredit",
  QRIS: "QRIS",
  TRANSFER: "Transfer",
};

function InputRupiah({
  value,
  onChange,
  placeholder = "0",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
        Rp
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(formatRupiah(e.target.value))}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
      />
    </div>
  );
}

type EsbFisikFormProps = {
  esbLines: TransactionLine[];
  fisikLines: TransactionLine[];
  updateEsbLine: (
    index: number,
    field: keyof TransactionLine,
    value: string,
  ) => void;
  updateFisikLine: (
    index: number,
    field: keyof TransactionLine,
    value: string,
  ) => void;
  saveTransactions: (sumber: "ESB" | "FISIK") => void;
  saving: boolean;
  activeTab: Tab;
  onBack: () => void;
};

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
  return (
    <>
      {activeTab === "esb" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Masukkan nilai dari laporan mesin kasir (sistem ESB)
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 text-slate-500 font-medium w-32">
                  Kategori
                </th>
                <th className="text-left py-2 text-slate-500 font-medium">
                  Nilai ESB
                </th>
                <th className="text-left py-2 text-slate-500 font-medium">
                  Catatan
                </th>
              </tr>
            </thead>
            <tbody>
              {esbLines.map((line, i) => (
                <tr key={line.kategori} className="border-b border-slate-50">
                  <td className="py-2 pr-4 font-medium text-slate-700">
                    {KATEGORI_LABEL[line.kategori]}
                  </td>
                  <td className="py-2 pr-4">
                    <InputRupiah
                      value={line.nilai}
                      onChange={(v) => updateEsbLine(i, "nilai", v)}
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="text"
                      value={line.catatan}
                      onChange={(e) =>
                        updateEsbLine(i, "catatan", e.target.value)
                      }
                      placeholder="Opsional"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
      )}

      {activeTab === "fisik" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Masukkan hasil hitung fisik / struk / slip setoran
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 text-slate-500 font-medium w-32">
                  Kategori
                </th>
                <th className="text-left py-2 text-slate-500 font-medium">
                  Nilai Fisik
                </th>
                <th className="text-left py-2 text-slate-500 font-medium">
                  Selisih
                </th>
              </tr>
            </thead>
            <tbody>
              {fisikLines.map((line, i) => {
                const esb = parseRupiah(esbLines[i]?.nilai || "0");
                const fisik = parseRupiah(line.nilai || "0");
                const selisih = fisik - esb;
                return (
                  <tr key={line.kategori} className="border-b border-slate-50">
                    <td className="py-2 pr-4 font-medium text-slate-700">
                      {KATEGORI_LABEL[line.kategori]}
                    </td>
                    <td className="py-2 pr-4">
                      <InputRupiah
                        value={line.nilai}
                        onChange={(v) => updateFisikLine(i, "nilai", v)}
                      />
                    </td>
                    <td className="py-2">
                      {line.nilai ? (
                        <span
                          className={`font-medium text-sm ${selisih < 0 ? "text-red-600" : selisih > 0 ? "text-emerald-600" : "text-slate-400"}`}
                        >
                          {selisih >= 0 ? "+" : ""}Rp
                          {selisih.toLocaleString("id-ID")}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex justify-between pt-2">
            <button
              onClick={onBack}
              className="text-slate-500 hover:text-slate-700 text-sm font-medium px-4 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
            >
              ← Kembali
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
      )}
    </>
  );
}
