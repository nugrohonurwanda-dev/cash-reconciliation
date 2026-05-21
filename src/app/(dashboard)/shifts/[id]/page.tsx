// src/app/(dashboard)/shifts/[id]/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatRupiah, parseRupiah } from "@/utils/format";
import EsbFisikForm, { KATEGORI_LIST } from "@/components/shifts/EsbFisikForm";
import SpecialLogsPanel from "@/components/shifts/SpecialLogsPanel";
import SubmitPanel from "@/components/shifts/SubmitPanel";
import type {
  Tab,
  TransactionLine,
  SpecialLog,
  Shift,
  DailyAccumulation,
  KategoriSummary,
  ShiftTotals,
} from "@/types/shift";

// ─── Suppress unused-import warnings for types only used implicitly ──────────
// (KategoriSummary, ShiftTotals, DailyAccumulation are used via Shift type)
void (0 as unknown as KategoriSummary);
void (0 as unknown as ShiftTotals);
void (0 as unknown as DailyAccumulation);

// ─────────────────────────────────────────────────────────────
// Small local components (unchanged from original)
// ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    OPEN: { label: "Open", color: "bg-emerald-100 text-emerald-700" },
    PENDING: { label: "Menunggu Review", color: "bg-amber-100 text-amber-700" },
    PENDING_FINANCE: {
      label: "Menunggu Finance",
      color: "bg-violet-100 text-violet-700",
    },
    CLOSED: { label: "Closed", color: "bg-slate-100 text-slate-600" },
  };
  const c = config[status] ?? {
    label: status,
    color: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${c.color}`}
    >
      {c.label}
    </span>
  );
}

const KATEGORI_LABEL_RO: Record<string, string> = {
  CASH: "Cash",
  EDC_BRI: "EDC BRI",
  EDC_BNI: "EDC BNI",
  EDC_BCA: "EDC BCA",
  EDC_BSI: "EDC BSI",
  QRIS_BRI: "QRIS BRI",
  QRIS_BNI: "QRIS BNI",
  QRIS_BCA: "QRIS BCA",
  QRIS_BSI: "QRIS BSI",
  TRANSFER_BRI: "Transfer BRI",
  TRANSFER_BNI: "Transfer BNI",
  TRANSFER_BCA: "Transfer BCA",
  TRANSFER_BSI: "Transfer BSI",
  DEPOSIT_BANK: "Deposit Bank",
  DEPOSIT_CASH: "Deposit Cash",
};

const ACTION_LABEL: Record<string, string> = {
  APPROVE: "Approve",
  REJECT: "Reject",
  CLOSE: "Close",
};

const ROLE_LABEL: Record<string, string> = {
  CASHIER: "Kasir",
  HEAD_CASHIER: "Head Kasir",
  FINANCE: "Finance",
};

function DailyAccumulationCard({
  data,
}: {
  data: NonNullable<Shift["daily_accumulation"]>;
}) {
  const fmt = (v: string) => `Rp ${parseInt(v).toLocaleString("id-ID")}`;

  const selisihColor = (v: string) => {
    const n = parseInt(v);
    if (n < 0) return "text-red-600";
    if (n > 0) return "text-emerald-600";
    return "text-slate-400";
  };

  const LABEL: Record<string, string> = {
    CASH: "Cash",
    EDC_BRI: "EDC BRI",
    EDC_BNI: "EDC BNI",
    EDC_BCA: "EDC BCA",
    EDC_BSI: "EDC BSI",
    QRIS_BRI: "QRIS BRI",
    QRIS_BNI: "QRIS BNI",
    QRIS_BCA: "QRIS BCA",
    QRIS_BSI: "QRIS BSI",
    TRANSFER_BRI: "Transfer BRI",
    TRANSFER_BNI: "Transfer BNI",
    TRANSFER_BCA: "Transfer BCA",
    TRANSFER_BSI: "Transfer BSI",
    DEPOSIT_BANK: "Deposit Bank",
    DEPOSIT_CASH: "Deposit Cash",
  };

  return (
    <div className="bg-white rounded-xl border border-violet-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-violet-100 bg-violet-50">
        <h3 className="text-sm font-semibold text-violet-800">
          Rekap Akumulasi Hari Ini
        </h3>
        <p className="text-xs text-violet-500 mt-0.5">
          Gabungan Shift 1 + Shift 2
        </p>
      </div>

      <div className="grid grid-cols-4 px-5 py-2 text-xs font-medium text-slate-400 border-b border-slate-100">
        <span>Kategori</span>
        <span className="text-right">Shift 1</span>
        <span className="text-right">Shift 2</span>
        <span className="text-right">Total</span>
      </div>

      <div className="divide-y divide-slate-100">
        {data.combined.per_kategori.map((row) => {
          const s1 = data.shift_1?.per_kategori.find(
            (r) => r.kategori === row.kategori,
          );
          const s2 = data.shift_2?.per_kategori.find(
            (r) => r.kategori === row.kategori,
          );
          const s1Val = parseInt(s1?.fisik ?? "0");
          const s2Val = parseInt(s2?.fisik ?? "0");
          const total = parseInt(row.fisik);

          if (s1Val === 0 && s2Val === 0 && total === 0) return null;

          return (
            <div
              key={row.kategori}
              className="grid grid-cols-4 px-5 py-3 text-sm"
            >
              <span className="text-slate-600">{LABEL[row.kategori]}</span>
              <span className="text-right text-slate-500">
                {s1Val > 0 ? `Rp ${s1Val.toLocaleString("id-ID")}` : "—"}
              </span>
              <span className="text-right text-slate-500">
                {s2Val > 0 ? `Rp ${s2Val.toLocaleString("id-ID")}` : "—"}
              </span>
              <span className="text-right font-medium text-slate-800">
                {total > 0 ? `Rp ${total.toLocaleString("id-ID")}` : "—"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Total ESB (gabungan)</span>
          <span className="font-medium text-slate-800">
            {fmt(data.combined.total_esb)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Total Fisik (gabungan)</span>
          <span className="font-medium text-slate-800">
            {fmt(data.combined.total_fisik)}
          </span>
        </div>
        <div className="flex justify-between text-sm font-semibold pt-2 border-t border-slate-200">
          <span className="text-slate-700">Selisih Keseluruhan</span>
          <span className={selisihColor(data.combined.total_selisih)}>
            {fmt(data.combined.total_selisih)}
          </span>
        </div>
      </div>
    </div>
  );
}

function ReadOnlyView({ shift }: { shift: Shift }) {
  const router = useRouter();

  const categories = KATEGORI_LIST;
  const lines = shift.transaction_lines ?? [];

  const recon = categories.map((k) => {
    const esb = lines
      .filter((l: any) => l.sumber === "ESB" && l.kategori === k)
      .reduce((sum: number, l: any) => sum + parseFloat(l.nilai), 0);
    const fisik = lines
      .filter((l: any) => l.sumber === "FISIK" && l.kategori === k)
      .reduce((sum: number, l: any) => sum + parseFloat(l.nilai), 0);
    return { kategori: k, esb, fisik, selisih: fisik - esb };
  });

  const totalEsb = recon.reduce((sum, r) => sum + r.esb, 0);
  const totalFisik = recon.reduce((sum, r) => sum + r.fisik, 0);
  const totalSelisih = totalFisik - totalEsb;

  const specialLogs = shift.special_logs ?? [];
  const totalVoid = specialLogs
    .filter((l: any) => l.tipe === "VOID")
    .reduce((sum: number, l: any) => sum + parseFloat(l.nominal), 0);
  const totalDiscount = specialLogs
    .filter((l: any) => l.tipe === "DISCOUNT")
    .reduce((sum: number, l: any) => sum + parseFloat(l.nominal), 0);
  const totalDeposit = specialLogs
    .filter((l: any) => l.tipe === "DEPOSIT")
    .reduce((sum: number, l: any) => sum + parseFloat(l.nominal), 0);
  const totalOtherCost = specialLogs
    .filter((l: any) => l.tipe === "OTHER_COST")
    .reduce((sum: number, l: any) => sum + parseFloat(l.nominal), 0);
  const totalOmzetBersih =
    totalFisik - totalVoid - totalDiscount - totalOtherCost;

  const fmt = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

  return (
    <div className="space-y-5">
      {shift.variance_note && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-red-600 mb-1">
            ⚠ Keterangan Selisih
          </p>
          <p className="text-sm text-red-700">{shift.variance_note}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">
            Rekonsiliasi per Kategori
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">
                Kategori
              </th>
              <th className="text-right px-4 py-3 text-slate-500 font-medium">
                Nilai ESB
              </th>
              <th className="text-right px-4 py-3 text-slate-500 font-medium">
                Nilai Fisik
              </th>
              <th className="text-right px-4 py-3 text-slate-500 font-medium">
                Selisih
              </th>
            </tr>
          </thead>
          <tbody>
            {recon.map((r, i) => (
              <tr
                key={r.kategori}
                className={`border-t border-slate-100 ${i % 2 === 1 ? "bg-slate-50/50" : ""}`}
              >
                <td className="px-4 py-3 font-medium text-slate-700">
                  {KATEGORI_LABEL_RO[r.kategori]}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {fmt(r.esb)}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {fmt(r.fisik)}
                </td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${r.selisih < 0 ? "text-red-600" : r.selisih > 0 ? "text-emerald-600" : "text-slate-400"}`}
                >
                  {r.selisih >= 0 ? "+" : ""}
                  {fmt(r.selisih)}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-slate-200 bg-blue-50">
              <td className="px-4 py-3 font-bold text-slate-900">TOTAL</td>
              <td className="px-4 py-3 text-right font-bold text-slate-900">
                {fmt(totalEsb)}
              </td>
              <td className="px-4 py-3 text-right font-bold text-slate-900">
                {fmt(totalFisik)}
              </td>
              <td
                className={`px-4 py-3 text-right font-bold ${totalSelisih < 0 ? "text-red-600" : totalSelisih > 0 ? "text-emerald-600" : "text-slate-400"}`}
              >
                {totalSelisih >= 0 ? "+" : ""}
                {fmt(totalSelisih)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Void", value: totalVoid, color: "text-red-600" },
          {
            label: "Total Discount",
            value: totalDiscount,
            color: "text-amber-600",
          },
          {
            label: "Total Deposit",
            value: totalDeposit,
            color: "text-blue-600",
          },
          {
            label: "Total Other Cost",
            value: totalOtherCost,
            color: "text-violet-600",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-xl border border-slate-200 p-4"
          >
            <p className="text-xs text-slate-400">{item.label}</p>
            <p className={`text-lg font-bold mt-1 ${item.color}`}>
              {fmt(item.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-xl p-5 flex items-center justify-between">
        <p className="text-slate-400 text-sm">Total Omzet Bersih</p>
        <p className="text-white text-2xl font-bold">{fmt(totalOmzetBersih)}</p>
      </div>

      {shift.daily_accumulation && (
        <div className="space-y-2">
          {shift.daily_accumulation.shift_1 === null && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-2">
              <span className="text-amber-500 mt-0.5 shrink-0">⚠</span>
              <p className="text-xs text-amber-700">
                <span className="font-semibold">Data Shift 1 belum final.</span>{" "}
                Angka akumulasi di bawah bisa berubah selama Shift 1 belum
                ditutup.
              </p>
            </div>
          )}
          <DailyAccumulationCard data={shift.daily_accumulation} />
        </div>
      )}

      {specialLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">
              Special Logs
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Tipe
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Detail
                </th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">
                  Nominal
                </th>
              </tr>
            </thead>
            <tbody>
              {specialLogs.map((log: any) => (
                <tr key={log.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                        log.tipe === "VOID"
                          ? "bg-red-100 text-red-700"
                          : log.tipe === "DISCOUNT"
                            ? "bg-amber-100 text-amber-700"
                            : log.tipe === "DEPOSIT"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-violet-100 text-violet-700"
                      }`}
                    >
                      {log.tipe}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {log.tipe === "VOID" || log.tipe === "DISCOUNT"
                      ? `Bill: ${log.nomor_bill ?? "-"} — ${log.alasan ?? "-"}`
                      : log.tipe === "DEPOSIT"
                        ? `${log.nama_member ?? "-"} (${log.metode ?? "-"})`
                        : `${log.kategori_biaya ?? "-"} — ${log.keterangan ?? "-"}`}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {fmt(parseFloat(log.nominal))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(shift.approvals?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">
              Approval Trail
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Nama
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Role
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Aksi
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Waktu
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Catatan
                </th>
              </tr>
            </thead>
            <tbody>
              {(shift.approvals ?? []).map((a: any) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {a.approver?.full_name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {ROLE_LABEL[a.approver?.role] ?? a.approver?.role}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                        a.action === "APPROVE"
                          ? "bg-emerald-100 text-emerald-700"
                          : a.action === "REJECT"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {ACTION_LABEL[a.action] ?? a.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(a.timestamp).toLocaleString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {a.catatan ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        <button
          onClick={() => router.back()}
          className="text-slate-500 hover:text-slate-700 text-sm font-medium px-4 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
        >
          ← Kembali
        </button>
      </div>
    </div>
  );
}

const formatModalAwal = (val: string | undefined) =>
  val ? `Rp ${parseInt(val).toLocaleString("id-ID")}` : "—";

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────

export default function ShiftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();

  const [activeTab, setActiveTab] = useState<Tab>("esb");
  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const emptyLines = useCallback(
    () => KATEGORI_LIST.map((k) => ({ kategori: k, nilai: "", catatan: "" })),
    [],
  );

  const [esbLines, setEsbLines] = useState<TransactionLine[]>(emptyLines());
  const [fisikLines, setFisikLines] = useState<TransactionLine[]>(emptyLines());
  const [varianceNote, setVarianceNote] = useState("");
  const [voidDiscountLogs, setVoidDiscountLogs] = useState<SpecialLog[]>([]);
  const [depositLogs, setDepositLogs] = useState<SpecialLog[]>([]);
  const [otherCostLogs, setOtherCostLogs] = useState<SpecialLog[]>([]);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftExpired, setDraftExpired] = useState(false);

  const DRAFT_TTL_MS = 8 * 60 * 60 * 1000;
  const draftKey = session?.user?.id
    ? `shift_draft_${session.user.id}_${id}`
    : `shift_draft_${id}`;

  const draftTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchShift = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/shifts/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal memuat data shift.");
        setShift(null);
      } else {
        setShift(data.data);
        setVarianceNote(data.data.variance_note ?? "");

        const tl = data.data.transaction_lines ?? [];
        const toLines = (sumber: "ESB" | "FISIK") =>
          KATEGORI_LIST.map((k) => {
            const found = tl.find(
              (l: any) => l.sumber === sumber && l.kategori === k,
            );
            return {
              kategori: k,
              nilai: found
                ? formatRupiah(String(Math.round(parseFloat(found.nilai))))
                : "",
              catatan: found?.catatan ?? "",
            };
          });
        setEsbLines(toLines("ESB"));
        setFisikLines(toLines("FISIK"));

        if (data.data.status === "OPEN") {
          try {
            const raw = localStorage.getItem(draftKey);
            if (raw) {
              const draft = JSON.parse(raw);
              if (draft.expiresAt && Date.now() > draft.expiresAt) {
                localStorage.removeItem(draftKey);
                setDraftExpired(true);
              } else {
                setDraftRestored(true);
                if (draft.esbLines) setEsbLines(draft.esbLines);
                if (draft.fisikLines) setFisikLines(draft.fisikLines);
                if (draft.varianceNote !== undefined)
                  setVarianceNote(draft.varianceNote);
                if (draft.voidDiscountLogs)
                  setVoidDiscountLogs(draft.voidDiscountLogs);
                if (draft.depositLogs) setDepositLogs(draft.depositLogs);
                if (draft.otherCostLogs) setOtherCostLogs(draft.otherCostLogs);
              }
            }
          } catch {
            // silent fail
          }
        } else {
          try {
            localStorage.removeItem(draftKey);
          } catch {
            // silent
          }
        }
      }
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }, [id, draftKey]);

  useEffect(() => {
    fetchShift();
  }, [fetchShift]);

  useEffect(() => {
    if (!shift || shift.status !== "OPEN") return;

    const saveDraft = () => {
      try {
        const draft = {
          esbLines,
          fisikLines,
          varianceNote,
          voidDiscountLogs,
          depositLogs,
          otherCostLogs,
          savedAt: new Date().toISOString(),
          expiresAt: Date.now() + DRAFT_TTL_MS,
        };
        localStorage.setItem(draftKey, JSON.stringify(draft));
      } catch {
        // silent fail
      }
    };

    draftTimerRef.current = setInterval(saveDraft, 30000);
    return () => {
      if (draftTimerRef.current) clearInterval(draftTimerRef.current);
    };
  }, [
    shift,
    esbLines,
    fisikLines,
    varianceNote,
    voidDiscountLogs,
    depositLogs,
    otherCostLogs,
    draftKey,
    DRAFT_TTL_MS,
  ]);

  function clearDraft() {
    try {
      localStorage.removeItem(`shift_draft_${id}`);
      localStorage.removeItem(draftKey);
    } catch {
      // silent
    }
  }

  function updateEsbLine(
    key: string,
    field: keyof TransactionLine,
    value: string,
  ) {
    setEsbLines((prev) =>
      prev.map((l) => (l.kategori === key ? { ...l, [field]: value } : l)),
    );
  }

  function updateFisikLine(
    key: string,
    field: keyof TransactionLine,
    value: string,
  ) {
    setFisikLines((prev) =>
      prev.map((l) => (l.kategori === key ? { ...l, [field]: value } : l)),
    );
  }

  async function saveTransactions(sumber: "ESB" | "FISIK") {
    setSaving(true);
    setError("");

    const lines = sumber === "ESB" ? esbLines : fisikLines;
    const filtered = lines.filter((l) => l.nilai !== "" && l.nilai !== "0");

    if (filtered.length === 0) {
      setError(
        `Minimal satu kategori ${sumber === "ESB" ? "ESB (nilai sistem)" : "Fisik (uang tunai)"} harus diisi sebelum disimpan.`,
      );
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/shifts/${id}/transactions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: filtered.map((l) => ({
            sumber,
            kategori: l.kategori,
            nilai: parseRupiah(l.nilai),
            catatan: l.catatan || undefined,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error ??
            `Gagal menyimpan data ${sumber === "ESB" ? "ESB" : "Fisik"}. Coba lagi.`,
        );
        return;
      }

      setSuccess(`Data ${sumber} berhasil disimpan.`);
      setTimeout(() => setSuccess(""), 3000);
      if (sumber === "ESB") setActiveTab("fisik");
      else setActiveTab("special");
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSpecialLogs() {
    setSaving(true);
    setError("");

    const logs: any[] = [
      ...voidDiscountLogs
        .filter((l) => l.nominal)
        .map((l) => ({
          tipe: l.tipe,
          nomor_bill: l.nomor_bill,
          nominal: parseRupiah(l.nominal),
          alasan: l.alasan,
        })),
      ...depositLogs
        .filter((l) => l.nominal)
        .map((l) => ({
          tipe: "DEPOSIT",
          nama_member: l.nama_member,
          nominal: parseRupiah(l.nominal),
          metode: l.metode || "CASH",
          nomor_referensi: l.nomor_referensi,
        })),
      ...otherCostLogs
        .filter((l) => l.nominal)
        .map((l) => ({
          tipe: "OTHER_COST",
          kategori_biaya: l.kategori_biaya || "LAIN_LAIN",
          nominal: parseRupiah(l.nominal),
          keterangan: l.keterangan,
        })),
    ];

    try {
      const res = await fetch(`/api/shifts/${id}/special-logs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logs }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan special logs. Coba lagi.");
        return;
      }

      setSuccess("Special logs berhasil disimpan.");
      setTimeout(() => setSuccess(""), 3000);
      setActiveTab("submit");
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  async function saveVarianceNote(): Promise<boolean> {
    if (!varianceNote.trim()) return true;
    try {
      const res = await fetch(`/api/shifts/${id}/variance-note`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variance_note: varianceNote }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function submitShift() {
    if (saving) return;
    setSaving(true);
    setError("");

    try {
      const checkRes = await fetch(`/api/shifts/${id}`);
      const checkData = await checkRes.json();
      if (checkData.data?.status !== "OPEN") {
        setError("Shift ini sudah tidak berstatus OPEN. Muat ulang halaman.");
        setShowConfirm(false);
        return;
      }

      const noteSaved = await saveVarianceNote();
      if (!noteSaved && varianceNote.trim()) {
        console.warn(
          "variance_note gagal disimpan terpisah, akan disimpan via action body",
        );
      }

      const res = await fetch(`/api/shifts/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT",
          variance_note: varianceNote.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error ??
            "Gagal mengirim laporan. Coba lagi atau muat ulang halaman.",
        );
        setShowConfirm(false);
        return;
      }

      clearDraft();
      router.push("/dashboard");
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
      setShowConfirm(false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 text-sm">Memuat data shift...</div>
      </div>
    );
  }

  const isClosed = shift?.status === "CLOSED";
  const isPending =
    shift?.status === "PENDING" || shift?.status === "PENDING_FINANCE";

  const tabs: { key: Tab; label: string }[] = [
    { key: "esb", label: "1. Data ESB" },
    { key: "fisik", label: "2. Data Fisik" },
    { key: "special", label: "3. Special Logs" },
    { key: "submit", label: "4. Submit" },
  ];

  // Hitung totals untuk SubmitPanel
  const totalEsb = esbLines.reduce(
    (sum, l) => sum + parseRupiah(l.nilai || "0"),
    0,
  );
  const totalFisik = fisikLines.reduce(
    (sum, l) => sum + parseRupiah(l.nilai || "0"),
    0,
  );
  const totalSelisih = totalFisik - totalEsb;
  const isVarianceExceeded = totalSelisih < -50000;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Detail Shift</h1>
          <p className="text-slate-500 text-sm mt-1">
            {new Date(shift?.shift_date ?? "").toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <StatusBadge status={shift?.status ?? ""} />
      </div>

      {/* Info card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-slate-400">Kasir</p>
          <p className="font-medium text-slate-900 mt-0.5">
            {shift?.opener?.full_name}
          </p>
        </div>
        <div>
          <p className="text-slate-400">Jam Buka</p>
          <p className="font-medium text-slate-900 mt-0.5">
            {new Date(shift?.opened_at ?? "").toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div>
          <p className="text-slate-400">Modal Awal</p>
          <p className="font-medium text-slate-900 mt-0.5">
            {formatModalAwal(shift?.modal_awal)}
          </p>
        </div>
      </div>

      {/* Banners */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {draftRestored && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Draft ditemukan.</span> Data input
            sebelumnya telah dipulihkan secara otomatis.
          </p>
          <button
            onClick={() => {
              clearDraft();
              setEsbLines(emptyLines());
              setFisikLines(emptyLines());
              setVarianceNote("");
              setVoidDiscountLogs([]);
              setDepositLogs([]);
              setOtherCostLogs([]);
              setDraftRestored(false);
            }}
            className="text-xs text-amber-600 hover:text-amber-800 font-medium ml-4 shrink-0"
          >
            Abaikan draft
          </button>
        </div>
      )}

      {draftExpired && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Draft input sebelumnya sudah kedaluarsa dan telah dihapus otomatis.
            Silakan isi ulang data shift.
          </p>
          <button
            onClick={() => setDraftExpired(false)}
            className="text-xs text-slate-400 hover:text-slate-600 font-medium ml-4 shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Tab panel — hanya saat OPEN */}
      {!isClosed && !isPending && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Tab nav */}
          <div className="flex border-b border-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* ── Tab ESB ── */}
            {activeTab === "esb" && (
              <EsbFisikForm
                esbLines={esbLines}
                fisikLines={fisikLines}
                updateEsbLine={updateEsbLine}
                updateFisikLine={updateFisikLine}
                saveTransactions={saveTransactions}
                saving={saving}
                activeTab={activeTab}
                onBack={() => setActiveTab("esb")}
              />
            )}

            {/* ── Tab Fisik ── */}
            {activeTab === "fisik" && (
              <EsbFisikForm
                esbLines={esbLines}
                fisikLines={fisikLines}
                updateEsbLine={updateEsbLine}
                updateFisikLine={updateFisikLine}
                saveTransactions={saveTransactions}
                saving={saving}
                activeTab={activeTab}
                onBack={() => setActiveTab("esb")}
              />
            )}

            {/* ── Tab Special Logs ── */}
            {activeTab === "special" && (
              <SpecialLogsPanel
                voidDiscountLogs={voidDiscountLogs}
                depositLogs={depositLogs}
                otherCostLogs={otherCostLogs}
                setVoidDiscountLogs={setVoidDiscountLogs}
                setDepositLogs={setDepositLogs}
                setOtherCostLogs={setOtherCostLogs}
                saveSpecialLogs={saveSpecialLogs}
                saving={saving}
                onBack={() => setActiveTab("fisik")}
              />
            )}

            {/* ── Tab Submit ── */}
            {activeTab === "submit" && (
              <SubmitPanel
                shift={shift}
                varianceNote={varianceNote}
                setVarianceNote={setVarianceNote}
                totals={{
                  totalEsb,
                  totalFisik,
                  totalSelisih,
                  isVarianceExceeded,
                }}
                onShowConfirm={() => setShowConfirm(true)}
                onBack={() => setActiveTab("special")}
                saving={saving}
                error={error}
              />
            )}
          </div>
        </div>
      )}

      {/* Modal konfirmasi submit */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                <svg
                  className="w-5 h-5 text-amber-600"
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
                <h2 className="text-base font-bold text-slate-900">
                  Konfirmasi Submit Laporan
                </h2>
                <p className="text-sm text-slate-500">
                  Pastikan semua data sudah benar
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Kasir</span>
                <span className="font-medium text-slate-900">
                  {shift?.opener?.full_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tanggal</span>
                <span className="font-medium text-slate-900">
                  {new Date(shift?.shift_date ?? "").toLocaleDateString(
                    "id-ID",
                    { day: "numeric", month: "long", year: "numeric" },
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Modal Awal</span>
                <span className="font-medium text-slate-900">
                  {formatModalAwal(shift?.modal_awal)}
                </span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              Setelah submit, laporan <strong>tidak dapat diedit</strong> dan
              akan menunggu review Head Cashier.
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                Periksa Lagi
              </button>
              <button
                onClick={submitShift}
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition"
              >
                {saving ? "Memproses..." : "Ya, Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Read-only view (PENDING / CLOSED) */}
      {(isPending || isClosed) && shift && <ReadOnlyView shift={shift} />}
    </div>
  );
}