//src/app/(dashboard)/review/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { STATUS_LABEL, SHIFT_PERIOD_LABEL } from "@/utils/format";

export default function ReviewPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [actionShift, setActionShift] = useState<any>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | null>(
    null,
  );
  const [catatan, setCatatan] = useState("");
  const [catatanTouched, setCatatanTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = statusFilter ? `?status=${statusFilter}` : "";
    try {
      const res = await fetch(`/api/shifts${params}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal memuat data.");
        return;
      }
      setShifts(data.data ?? []);
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  async function handleAction() {
    if (!actionShift || !actionType) return;
    if (actionType === "REJECT" && !catatan.trim()) {
      setError(
        "Alasan penolakan wajib diisi agar kasir tahu apa yang perlu diperbaiki.",
      );
      return;
    }

    setSaving(true);
    setError("");

    const res = await fetch(`/api/shifts/${actionShift.id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: actionType, catatan }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(
        data.error ??
          "Gagal memproses aksi. Coba lagi atau muat ulang halaman.",
      );
      return;
    }

    setActionShift(null);
    setActionType(null);
    setCatatan("");
    fetchShifts();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Review Laporan</h1>
        <p className="text-[var(--muted)] text-sm mt-1">
          Review dan approve laporan kasir
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {["PENDING", "PENDING_FINANCE", "CLOSED", ""].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === s
                ? "bg-blue-600 text-white"
                : "bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            {s === "" ? "Semua" : (STATUS_LABEL[s]?.label ?? s)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[var(--text-tertiary)] text-sm">
            Memuat data...
          </div>
        ) : shifts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[var(--text-tertiary)] text-sm">
              Tidak ada laporan yang perlu direview
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-hover)] border-b border-[var(--border)]">
              <tr>
                <th className="text-left px-4 py-3 text-[var(--muted)] font-medium">
                  Tanggal
                </th>
                <th className="text-left px-4 py-3 text-[var(--muted)] font-medium">
                  Kasir
                </th>
                <th className="text-left px-4 py-3 text-[var(--muted)] font-medium">
                  Shift
                </th>
                <th className="text-left px-4 py-3 text-[var(--muted)] font-medium">
                  Jam Buka
                </th>
                <th className="text-left px-4 py-3 text-[var(--muted)] font-medium">
                  Modal Awal
                </th>
                <th className="text-left px-4 py-3 text-[var(--muted)] font-medium">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-[var(--muted)] font-medium">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((shift) => {
                const status = STATUS_LABEL[shift.status];
                const isPending = shift.status === "PENDING";
                // Cek apakah shift ini milik HC yang sedang login
                const isOwnShift = shift.opener?.id === session?.user?.id;

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
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {shift.opener?.full_name}
                      {isOwnShift && (
                        <span className="ml-2 text-xs bg-slate-100 text-[var(--muted)] px-1.5 py-0.5 rounded font-medium">
                          Shift saya
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${SHIFT_PERIOD_LABEL[shift.shift_period]?.color ?? "bg-slate-100 text-[var(--muted)]"}`}
                      >
                        {SHIFT_PERIOD_LABEL[shift.shift_period]?.label ?? "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {new Date(shift.opened_at).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
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

                        {/* Tombol Approve/Reject hanya muncul kalau:
                            - Status PENDING
                            - Bukan shift milik sendiri */}
                        {isPending && !isOwnShift && (
                          <>
                            <button
                              onClick={() => {
                                setActionShift(shift);
                                setActionType("APPROVE");
                                setCatatan("");
                                setCatatanTouched(false);
                                setError("");
                              }}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-lg transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setActionShift(shift);
                                setActionType("REJECT");
                                setCatatan("");
                                setCatatanTouched(false);
                                setError("");
                              }}
                              className="bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium px-3 py-1.5 rounded-lg transition"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {/* Info kalau shift milik sendiri & masih PENDING */}
                        {isPending && isOwnShift && (
                          <span className="text-xs text-[var(--text-tertiary)] italic">
                            Menunggu HC lain
                          </span>
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

      {/* Modal Approve/Reject */}
      {actionShift && actionType && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${actionType === "APPROVE" ? "bg-emerald-100" : "bg-red-100"}`}
              >
                {actionType === "APPROVE" ? (
                  <svg
                    className="w-5 h-5 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--foreground)]">
                  {actionType === "APPROVE"
                    ? "Approve Laporan"
                    : "Tolak Laporan"}
                </h2>
                <p className="text-sm text-[var(--muted)]">
                  Pastikan data sudah diperiksa
                </p>
              </div>
            </div>

            {/* Ringkasan shift */}
            <div className="bg-[var(--surface-hover)] rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Kasir</span>
                <span className="font-medium text-[var(--foreground)]">
                  {actionShift.opener?.full_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Tanggal</span>
                <span className="font-medium text-[var(--foreground)]">
                  {new Date(actionShift.shift_date).toLocaleDateString(
                    "id-ID",
                    {
                      weekday: "short",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    },
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Periode</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${SHIFT_PERIOD_LABEL[actionShift.shift_period]?.color ?? "bg-slate-100 text-[var(--muted)]"}`}
                >
                  {SHIFT_PERIOD_LABEL[actionShift.shift_period]?.label ?? "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Modal Awal</span>
                <span className="font-medium text-[var(--foreground)]">
                  Rp {parseInt(actionShift.modal_awal).toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Warning khusus REJECT */}
            {actionType === "REJECT" && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
                Setelah ditolak, kasir harus{" "}
                <strong>mengisi ulang seluruh data shift</strong> dan submit
                kembali.
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Textarea catatan */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">
                {actionType === "REJECT"
                  ? "Alasan penolakan (wajib)"
                  : "Catatan (opsional)"}
              </label>
              <textarea
                value={catatan}
                onChange={(e) => {
                  setCatatan(e.target.value);
                  setCatatanTouched(true);
                }}
                onBlur={() => setCatatanTouched(true)}
                placeholder={
                  actionType === "REJECT"
                    ? "Jelaskan apa yang perlu diperbaiki oleh kasir..."
                    : "Catatan tambahan untuk kasir..."
                }
                rows={3}
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition resize-none ${
                  actionType === "REJECT" && catatanTouched && !catatan.trim()
                    ? "border-red-400 focus:ring-red-300 bg-red-50"
                    : "border-[var(--border)] focus:ring-blue-500"
                }`}
              />
              {actionType === "REJECT" && catatanTouched && !catatan.trim() && (
                <p className="text-xs text-red-600">
                  Alasan penolakan wajib diisi.
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => {
                  setActionShift(null);
                  setActionType(null);
                  setCatatanTouched(false);
                }}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-hover)] transition"
              >
                Batal
              </button>
              <button
                onClick={handleAction}
                disabled={saving}
                className={`flex-1 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition disabled:opacity-50 ${
                  actionType === "APPROVE"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {saving
                  ? "Memproses..."
                  : actionType === "APPROVE"
                    ? "Ya, Approve"
                    : "Ya, Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
