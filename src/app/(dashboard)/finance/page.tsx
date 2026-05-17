//src/app/(dashboard)/finance/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { STATUS_LABEL } from "@/utils/format";

// Daftar bulan untuk quick picker
const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function fmt(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
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
  const [fetchTick, setFetchTick] = useState(0); // trigger refetch manual

  // Filter tanggal
  const now = new Date();
  const [filterMode, setFilterMode] = useState<"all" | "month" | "range">(
    "all",
  );
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Summary kalkulasi dari data yang sudah di-fetch
  const closedShifts = shifts.filter((s) => s.status === "CLOSED");
  const totalModalAwal = closedShifts.reduce(
    (sum, s) => sum + parseInt(s.modal_awal ?? "0"),
    0,
  );

  useEffect(() => {
    // buildParams di dalam useEffect agar selalu baca state terbaru (hindari stale closure)
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);

    if (filterMode === "month") {
      const from = new Date(selectedYear, selectedMonth, 1);
      const to = new Date(selectedYear, selectedMonth + 1, 0);
      params.set("from", from.toISOString().split("T")[0]);
      params.set("to", to.toISOString().split("T")[0]);
    } else if (filterMode === "range") {
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
    }

    const qs = params.toString();

    setLoading(true);
    setError("");
    fetch(`/api/shifts${qs ? `?${qs}` : ""}`)
      .then((res) => {
        if (!res.ok)
          return res
            .json()
            .then((d) => Promise.reject(d.error ?? "Gagal memuat data."));
        return res.json();
      })
      .then((data) => {
        setShifts(data.data ?? []);
      })
      .catch((msg) => {
        setError(typeof msg === "string" ? msg : "Terjadi kesalahan jaringan.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [
    statusFilter,
    filterMode,
    selectedMonth,
    selectedYear,
    dateFrom,
    dateTo,
    fetchTick,
  ]);

  function fetchShifts() {
    // Increment tick → trigger useEffect yang sudah punya semua state terbaru
    setFetchTick((t) => t + 1);
  }

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

      const closedId = actionShift.id; // simpan sebelum state di-reset
      setActionShift(null);
      setCatatan("");
      fetchShifts();
      await openPDF(closedId); // ← auto-download PDF setelah shift CLOSED
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setSaving(false); // ← selalu jalan, tombol tidak akan stuck
    }
  }

  async function openPDF(shiftId: string) {
    try {
      const res = await fetch(`/api/shifts/${shiftId}/pdf`);
      if (!res.ok) {
        // Tangani error JSON maupun HTML 500
        const errData = await res.json().catch(() => null);
        const errMsg =
          errData?.error ??
          (await res.text()).slice(0, 200) ??
          "Gagal membuka PDF.";
        setError(errMsg);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-shift-${shiftId}.pdf`;
      document.body.appendChild(a); // ← Wajib untuk kompatibilitas browser
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("Gagal mengunduh laporan. Periksa koneksi atau coba lagi.");
    }
  }
  // Label periode aktif untuk summary header
  function periodLabel() {
    if (filterMode === "month") {
      return `${MONTHS[selectedMonth]} ${selectedYear}`;
    }
    if (filterMode === "range" && dateFrom && dateTo) {
      return `${new Date(dateFrom).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} — ${new Date(dateTo).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    return "Semua Periode";
  }

  // Tahun untuk dropdown (5 tahun ke belakang)
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Semua Laporan</h1>
        <p className="text-slate-500 text-sm mt-1">
          Finalisasi dan tutup laporan rekonsiliasi
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        {/* Baris 1: Status + Mode Filter */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status filter */}
          <div className="flex gap-2">
            {["PENDING_FINANCE", "CLOSED", ""].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  statusFilter === s
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {s === "" ? "Semua Status" : (STATUS_LABEL[s]?.label ?? s)}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-slate-200" />

          {/* Mode filter tanggal */}
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
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Baris 2: Input filter tanggal (kondisional) */}
        {filterMode === "month" && (
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-500 font-medium shrink-0">
              Pilih Bulan:
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}

        {filterMode === "range" && (
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm text-slate-500 font-medium shrink-0">
              Dari:
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            <label className="text-sm text-slate-500 font-medium shrink-0">
              Sampai:
            </label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
                className="text-xs text-slate-400 hover:text-slate-600 transition"
              >
                Reset
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary Card — tampil hanya kalau ada filter & ada data CLOSED */}
      {filterMode !== "all" && closedShifts.length > 0 && (
        <div className="bg-slate-900 rounded-xl p-5">
          <p className="text-slate-400 text-xs font-medium mb-4 uppercase tracking-wide">
            Rekap {periodLabel()}
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-slate-400 text-xs">Total Shift Closed</p>
              <p className="text-white text-2xl font-bold mt-1">
                {closedShifts.length}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Total Modal Awal</p>
              <p className="text-white text-2xl font-bold mt-1">
                {fmt(totalModalAwal)}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Menunggu Finance</p>
              <p className="text-amber-400 text-2xl font-bold mt-1">
                {shifts.filter((s) => s.status === "PENDING_FINANCE").length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Memuat data...
          </div>
        ) : shifts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-400 text-sm">Tidak ada laporan</p>
            {filterMode !== "all" && (
              <p className="text-slate-300 text-xs mt-1">
                Coba ubah filter periode atau status
              </p>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Tanggal
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Kasir
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Jam Buka
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Modal Awal
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((shift) => {
                const status = STATUS_LABEL[shift.status];
                const isPendingFinance = shift.status === "PENDING_FINANCE";
                const isClosed = shift.status === "CLOSED";
                return (
                  <tr
                    key={shift.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {new Date(shift.shift_date).toLocaleDateString("id-ID", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {shift.opener?.full_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(shift.opened_at).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      Rp {parseInt(shift.modal_awal).toLocaleString("id-ID")}
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
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-lg transition"
                          >
                            Close & PDF
                          </button>
                        )}
                        {isClosed && (
                          <button
                            onClick={() => openPDF(shift.id)}
                            className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-lg transition"
                          >
                            Lihat PDF
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Close */}
      {actionShift && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              Tutup & Generate Laporan
            </h2>
            <p className="text-sm text-slate-500">
              Shift:
              <span className="font-medium text-slate-700">
                {actionShift.opener?.full_name}
              </span>
              — {new Date(actionShift.shift_date).toLocaleDateString("id-ID")}
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              Setelah ditutup, laporan tidak dapat diubah dan PDF akan otomatis
              tersedia.
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Catatan (opsional)
              </label>
              <textarea
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Catatan penutupan laporan..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setActionShift(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
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
