//src/app/(dashboard)/finance/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { STATUS_LABEL, SHIFT_PERIOD_LABEL } from "@/utils/format";
import { SkeletonListPage } from "@/components/ui/LoadingSkeleton";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function fmt(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

// Aging dihitung dari pending_finance_at — waktu shift masuk antrian Finance
// (disetujui Head Cashier), bukan dari waktu kasir membuka shift
function agingDays(pendingFinanceAt: string): number {
  const diff = Date.now() - new Date(pendingFinanceAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function AgingBadge({ pendingFinanceAt }: { pendingFinanceAt: string | null }) {
  if (!pendingFinanceAt) return <span className="text-xs text-[var(--text-tertiary)]">—</span>;
  const days = agingDays(pendingFinanceAt);
  if (days === 0) {
    return <span className="text-xs text-[var(--text-tertiary)]">Hari ini</span>;
  }
  const color =
    days >= 3
      ? "bg-red-100 text-red-700"
      : days >= 2
      ? "bg-amber-100 text-amber-700"
      : "bg-[var(--surface-hover)] text-[var(--text-tertiary)]";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {days}h lalu
    </span>
  );
}

export default function FinancePage() {
  const router = useRouter();
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING_FINANCE");
  const [actionShift, setActionShift] = useState<any>(null);
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Summary dari server — dihitung dari keseluruhan data, bukan hanya halaman ini
  const [summary, setSummary] = useState({
    pending_finance_count: 0,
    closed_count: 0,
    total_modal_awal_closed: 0,
  });

  const now = new Date();
  const [filterMode, setFilterMode] = useState<"all" | "month" | "range">("all");
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, filterMode, selectedMonth, selectedYear, dateFrom, dateTo]);

  const fetchShifts = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    params.set("page", String(currentPage));

    if (filterMode === "month") {
      const from = new Date(selectedYear, selectedMonth, 1);
      const to = new Date(selectedYear, selectedMonth + 1, 0);
      params.set("from", from.toISOString().split("T")[0]);
      params.set("to", to.toISOString().split("T")[0]);
    } else if (filterMode === "range") {
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
    }

    setLoading(true);
    setError("");
    fetch(`/api/shifts?${params.toString()}`)
      .then((res) => {
        if (!res.ok)
          return res.json().then((d) => Promise.reject(d.error ?? "Gagal memuat data."));
        return res.json();
      })
      .then((data) => {
        setShifts(data.data ?? []);
        setTotalPages(data.meta?.total_pages ?? 1);
        setTotalRecords(data.meta?.total ?? 0);
        if (data.summary) setSummary(data.summary);
      })
      .catch((msg) => {
        setError(typeof msg === "string" ? msg : "Terjadi kesalahan jaringan.");
      })
      .finally(() => setLoading(false));
  }, [statusFilter, filterMode, selectedMonth, selectedYear, dateFrom, dateTo, currentPage]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  async function handleClose() {
    if (!actionShift) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/shifts/${actionShift.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CLOSE", catatan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menutup laporan.");
        return;
      }
      const closedId = actionShift.id;
      setActionShift(null);
      setCatatan("");
      fetchShifts();
      await openPDF(closedId);
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  async function openPDF(shiftId: string) {
    try {
      const res = await fetch(`/api/shifts/${shiftId}/pdf`);
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        const errMsg = errData?.error ?? "Gagal membuka PDF.";
        setError(errMsg);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-shift-${shiftId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("Gagal mengunduh laporan. Periksa koneksi atau coba lagi.");
    }
  }

  function periodLabel() {
    if (filterMode === "month") return `${MONTHS[selectedMonth]} ${selectedYear}`;
    if (filterMode === "range" && dateFrom && dateTo) {
      return `${new Date(dateFrom).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} — ${new Date(dateTo).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    return "Semua Periode";
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Semua Laporan</h1>
        <p className="text-[var(--muted)] text-sm mt-1">
          Finalisasi dan tutup laporan rekonsiliasi
        </p>
      </div>

      {error && !actionShift && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {["PENDING_FINANCE", "CLOSED", ""].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  statusFilter === s
                    ? "bg-blue-600 text-white"
                    : "bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {s === "" ? "Semua Status" : (STATUS_LABEL[s]?.label ?? s)}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-[var(--border)]" />

          <div className="flex gap-2">
            {(
              [
                { key: "all", label: "Semua Tanggal" },
                { key: "month", label: "Per Bulan" },
                { key: "range", label: "Rentang Tanggal" },
              ] as { key: "all" | "month" | "range"; label: string }[]
            ).map((m) => (
              <button
                key={m.key}
                onClick={() => setFilterMode(m.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filterMode === m.key
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {filterMode === "month" && (
          <div className="flex items-center gap-3">
            <label className="text-sm text-[var(--muted)] font-medium shrink-0">Pilih Bulan:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}

        {filterMode === "range" && (
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm text-[var(--muted)] font-medium shrink-0">Dari:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            <label className="text-sm text-[var(--muted)] font-medium shrink-0">Sampai:</label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--muted)] transition"
              >
                Reset
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary Card */}
      {!loading && shifts.length > 0 && (
        <div className="bg-[var(--surface-accent)] border border-[var(--border)] rounded-xl p-5">
          <p className="text-[var(--text-tertiary)] text-xs font-medium mb-4 uppercase tracking-wide">
            Rekap {periodLabel()}
            {totalRecords > shifts.length && (
              <span className="ml-2 normal-case font-normal">
                · menampilkan {shifts.length} dari {totalRecords} laporan
              </span>
            )}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[var(--text-tertiary)] text-xs">Total Laporan</p>
              <p className="text-[var(--foreground)] text-2xl font-bold mt-1">{totalRecords}</p>
            </div>
            <div>
              <p className="text-[var(--text-tertiary)] text-xs">Menunggu Finance</p>
              <p className={`text-2xl font-bold mt-1 ${summary.pending_finance_count > 0 ? "text-amber-600 dark:text-amber-400" : "text-[var(--text-tertiary)]"}`}>
                {summary.pending_finance_count}
              </p>
            </div>
            <div>
              <p className="text-[var(--text-tertiary)] text-xs">Total Closed</p>
              <p className="text-emerald-600 text-2xl font-bold mt-1">{summary.closed_count}</p>
            </div>
            <div>
              <p className="text-[var(--text-tertiary)] text-xs">Total Modal Awal (Closed)</p>
              <p className="text-[var(--foreground)] text-xl font-bold mt-1">
                {summary.total_modal_awal_closed > 0
                  ? fmt(Number(summary.total_modal_awal_closed))
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        {loading ? (
          <SkeletonListPage rows={6} />
        ) : shifts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[var(--text-tertiary)] text-sm">Tidak ada laporan</p>
            {filterMode !== "all" && (
              <p className="text-xs mt-1 text-[var(--text-tertiary)]">
                Coba ubah filter periode atau status
              </p>
            )}
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-hover)] border-b border-[var(--border)]">
                <tr>
                  {["Tanggal", "Periode", "Kasir", "Jam Buka", "Modal Awal", "Status", "Aksi"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 font-medium uppercase tracking-wide"
                      style={{ color: "var(--text-tertiary)", fontSize: "11px" }}
                    >
                      {h}
                    </th>
                  ))}
                  {statusFilter === "PENDING_FINANCE" && (
                    <th
                      className="text-left px-4 py-3 font-medium uppercase tracking-wide"
                      style={{ color: "var(--text-tertiary)", fontSize: "11px" }}
                    >
                      Menunggu
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift) => {
                  const status = STATUS_LABEL[shift.status];
                  const isPendingFinance = shift.status === "PENDING_FINANCE";
                  const isClosed = shift.status === "CLOSED";
                  const periodInfo = SHIFT_PERIOD_LABEL[shift.shift_period];

                  return (
                    <tr
                      key={shift.id}
                      className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)] transition"
                    >
                      <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                        {new Date(shift.shift_date).toLocaleDateString("id-ID", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            periodInfo?.color ?? "bg-[var(--surface-hover)] text-[var(--muted)]"
                          }`}
                        >
                          {periodInfo?.label ?? shift.shift_period}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">
                        {shift.opener?.full_name}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">
                        {new Date(shift.opened_at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">
                        Rp {Number(shift.modal_awal).toLocaleString("id-ID")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${status?.color}`}
                        >
                          {status?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/shifts/${shift.id}`)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Detail
                          </button>
                          {isPendingFinance && (
                            <button
                              onClick={() => {
                                setActionShift(shift);
                                setCatatan("");
                                setError("");
                              }}
                              className="bg-[var(--surface-accent)] hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium px-3 py-1.5 rounded-lg transition"
                            >
                              Close & PDF
                            </button>
                          )}
                          {isClosed && (
                            <button
                              onClick={() => openPDF(shift.id)}
                              className="bg-[var(--surface-hover)] text-[var(--foreground)] text-xs font-medium px-3 py-1.5 rounded-lg transition hover:bg-[var(--border)]"
                            >
                              Lihat PDF
                            </button>
                          )}
                        </div>
                      </td>
                      {statusFilter === "PENDING_FINANCE" && (
                        <td className="px-4 py-3">
                          {isPendingFinance
                            ? <AgingBadge pendingFinanceAt={shift.pending_finance_at ?? null} />
                            : <span className="text-[var(--border)]">—</span>
                          }
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] bg-[var(--surface-hover)]">
                <p className="text-xs text-[var(--text-tertiary)]">
                  Halaman {currentPage} dari {totalPages} · {totalRecords} laporan total
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1.5 rounded text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    ← Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - currentPage) <= 1,
                    )
                    .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === "..." ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-xs text-[var(--border)]">
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => setCurrentPage(item as number)}
                          className={`w-7 h-7 rounded text-xs font-medium transition ${
                            currentPage === item
                              ? "bg-blue-600 text-white"
                              : "text-[var(--muted)] hover:bg-[var(--surface)]"
                          }`}
                        >
                          {item}
                        </button>
                      ),
                    )}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    Next →
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1.5 rounded text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Close */}
      {actionShift && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              Tutup & Generate Laporan
            </h2>
            <div className="text-sm text-[var(--muted)] space-y-1">
              <p>
                Kasir:{" "}
                <span className="font-medium text-[var(--foreground)]">
                  {actionShift.opener?.full_name}
                </span>
              </p>
              <p>
                Tanggal:{" "}
                <span className="font-medium text-[var(--foreground)]">
                  {new Date(actionShift.shift_date).toLocaleDateString("id-ID", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric",
                  })}
                </span>
              </p>
              <p>
                Periode:{" "}
                <span className="font-medium text-[var(--foreground)]">
                  {SHIFT_PERIOD_LABEL[actionShift.shift_period]?.label ?? actionShift.shift_period}
                </span>
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              Setelah ditutup, laporan tidak dapat diubah dan PDF akan otomatis tersedia.
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">
                Catatan (opsional)
              </label>
              <textarea
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Catatan penutupan laporan..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setActionShift(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-hover)] transition"
              >
                Batal
              </button>
              <button
                onClick={handleClose}
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition"
              >
                {saving ? "Memproses..." : "Tutup & Generate PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}