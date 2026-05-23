// src/components/shifts/SpecialLogsPanel.tsx
"use client";

import { SpecialLog } from "@/types/shift";
import { formatRupiah } from "@/utils/format";

type SpecialLogsPanelProps = {
  voidDiscountLogs: SpecialLog[];
  otherCostLogs: SpecialLog[];
  setVoidDiscountLogs: React.Dispatch<React.SetStateAction<SpecialLog[]>>;
  setOtherCostLogs: React.Dispatch<React.SetStateAction<SpecialLog[]>>;
  saveSpecialLogs: () => void;
  saving: boolean;
  onBack: () => void;
};

function InputRupiah({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-sm">
        Rp
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(formatRupiah(e.target.value))}
        placeholder="0"
        className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
      />
    </div>
  );
}

export default function SpecialLogsPanel({
  voidDiscountLogs,
  otherCostLogs,
  setVoidDiscountLogs,
  setOtherCostLogs,
  saveSpecialLogs,
  saving,
  onBack,
}: SpecialLogsPanelProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--muted)]">
        Semua bagian bersifat opsional. Input deposit member dilakukan di tab{" "}
        <strong>ESB</strong> dan <strong>Fisik</strong> pada kategori Deposit.
      </p>

      {/* Void & Discount */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">
            Void & Discount
          </h3>
          <button
            onClick={() =>
              setVoidDiscountLogs((prev) => [
                ...prev,
                {
                  tipe: "VOID",
                  nominal: "",
                  nomor_bill: "",
                  alasan: "",
                },
              ])
            }
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            + Tambah
          </button>
        </div>
        {voidDiscountLogs.length === 0 && (
          <p className="text-xs text-[var(--text-tertiary)] italic">
            Tidak ada void/discount
          </p>
        )}
        {voidDiscountLogs.map((log, i) => (
          <div
            key={i}
            className="grid grid-cols-4 gap-2 p-3 bg-[var(--surface-hover)] rounded-lg"
          >
            <select
              value={log.tipe}
              onChange={(e) =>
                setVoidDiscountLogs((prev) =>
                  prev.map((l, idx) =>
                    idx === i
                      ? {
                          ...l,
                          tipe: e.target.value as "VOID" | "DISCOUNT",
                        }
                      : l,
                  ),
                )
              }
              className="px-2 py-2 rounded-lg border border-[var(--border)] text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="VOID">Void</option>
              <option value="DISCOUNT">Discount</option>
            </select>
            <input
              placeholder="No. Bill"
              value={log.nomor_bill}
              onChange={(e) =>
                setVoidDiscountLogs((prev) =>
                  prev.map((l, idx) =>
                    idx === i ? { ...l, nomor_bill: e.target.value } : l,
                  ),
                )
              }
              className="px-2 py-2 rounded-lg border border-[var(--border)] text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <InputRupiah
              value={log.nominal}
              onChange={(v) =>
                setVoidDiscountLogs((prev) =>
                  prev.map((l, idx) => (idx === i ? { ...l, nominal: v } : l)),
                )
              }
            />
            <div className="flex gap-2">
              <input
                placeholder="Alasan"
                value={log.alasan}
                onChange={(e) =>
                  setVoidDiscountLogs((prev) =>
                    prev.map((l, idx) =>
                      idx === i ? { ...l, alasan: e.target.value } : l,
                    ),
                  )
                }
                className="flex-1 px-2 py-2 rounded-lg border border-[var(--border)] text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() =>
                  setVoidDiscountLogs((prev) =>
                    prev.filter((_, idx) => idx !== i),
                  )
                }
                className="text-red-400 hover:text-red-600 px-2"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Other Cost */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Other Cost</h3>
          <button
            onClick={() =>
              setOtherCostLogs((prev) => [
                ...prev,
                {
                  tipe: "OTHER_COST",
                  nominal: "",
                  kategori_biaya: "ATK",
                  keterangan: "",
                },
              ])
            }
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            + Tambah
          </button>
        </div>
        {otherCostLogs.length === 0 && (
          <p className="text-xs text-[var(--text-tertiary)] italic">Tidak ada biaya lain</p>
        )}
        {otherCostLogs.map((log, i) => (
          <div
            key={i}
            className="grid grid-cols-3 gap-2 p-3 bg-[var(--surface-hover)] rounded-lg"
          >
            <select
              value={log.kategori_biaya}
              onChange={(e) =>
                setOtherCostLogs((prev) =>
                  prev.map((l, idx) =>
                    idx === i ? { ...l, kategori_biaya: e.target.value } : l,
                  ),
                )
              }
              className="px-2 py-2 rounded-lg border border-[var(--border)] text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ATK">ATK</option>
              <option value="KEBERSIHAN">Kebersihan</option>
              <option value="OPERASIONAL">Operasional</option>
              <option value="LAIN_LAIN">Lain-lain</option>
            </select>
            <InputRupiah
              value={log.nominal}
              onChange={(v) =>
                setOtherCostLogs((prev) =>
                  prev.map((l, idx) => (idx === i ? { ...l, nominal: v } : l)),
                )
              }
            />
            <div className="flex gap-2">
              <input
                placeholder="Keterangan"
                value={log.keterangan}
                onChange={(e) =>
                  setOtherCostLogs((prev) =>
                    prev.map((l, idx) =>
                      idx === i ? { ...l, keterangan: e.target.value } : l,
                    ),
                  )
                }
                className="flex-1 px-2 py-2 rounded-lg border border-[var(--border)] text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() =>
                  setOtherCostLogs((prev) => prev.filter((_, idx) => idx !== i))
                }
                className="text-red-400 hover:text-red-600 px-2"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          className="text-[var(--muted)] hover:text-[var(--text-secondary)] text-sm font-medium px-4 py-2.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] transition"
        >
          ← Kembali
        </button>
        <button
          onClick={saveSpecialLogs}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition"
        >
          {saving ? "Menyimpan..." : "Simpan & Lanjut →"}
        </button>
      </div>
    </div>
  );
}