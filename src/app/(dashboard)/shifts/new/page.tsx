// src/app/(dashboard)/shifts/new/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// ── Tipe konteks hari ini dari API ────────────────────────────────────────────
interface TodayContext {
  can_open_shift1: boolean;
  can_open_shift2: boolean;
  active_shift_id: string | null;
  blocked_reason: string | null;
  shift1_today: { id: string; status: string; opened_by: string } | null;
  shift2_today: { id: string; status: string; opened_by: string } | null;
}

// ── Ikon informatif ───────────────────────────────────────────────────────────
function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className ?? "w-5 h-5"}
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className ?? "w-5 h-5"}
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ── Komponen badge status shift ───────────────────────────────────────────────
function ShiftStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    OPEN: { label: "Berjalan", cls: "bg-green-100 text-green-700" },
    PENDING: { label: "Menunggu Review", cls: "bg-yellow-100 text-yellow-700" },
    PENDING_FINANCE: {
      label: "Menunggu Finance",
      cls: "bg-orange-100 text-orange-700",
    },
    CLOSED: { label: "Selesai", cls: "bg-[var(--surface-hover)] text-[var(--text-secondary)]" },
  };
  const { label, cls } = map[status] ?? {
    label: status,
    cls: "bg-[var(--surface-hover)] text-[var(--text-secondary)]",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

// ── Halaman Utama ─────────────────────────────────────────────────────────────
export default function NewShiftPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [modalAwal, setModalAwal] = useState("1000000");
  const [shiftPeriod, setShiftPeriod] = useState<"SHIFT_1" | "SHIFT_2">("SHIFT_1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // State konteks hari ini
  const [ctx, setCtx] = useState<TodayContext | null>(null);
  const [ctxLoading, setCtxLoading] = useState(true);

  // ── Ambil konteks hari ini saat halaman dimuat ────────────────────────────
  useEffect(() => {
    async function fetchContext() {
      try {
        const res = await fetch("/api/shifts/today-context");
        if (!res.ok) return;
        const data: TodayContext = await res.json();

        // Jika ada shift aktif → langsung arahkan ke shift itu
        if (data.active_shift_id) {
          router.replace(`/shifts/${data.active_shift_id}`);
          return;
        }

        // Auto-select period yang tepat berdasarkan konteks
        if (data.can_open_shift2 && !data.can_open_shift1) {
          setShiftPeriod("SHIFT_2");
        } else {
          setShiftPeriod("SHIFT_1");
        }

        setCtx(data);
      } catch {
        // Gagal fetch context, biarkan form tetap tampil (backend akan validasi)
      } finally {
        setCtxLoading(false);
      }
    }
    fetchContext();
  }, [router]);

  // ── Submit buka shift ─────────────────────────────────────────────────────
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

  // ── Loading context ───────────────────────────────────────────────────────
  if (ctxLoading) {
    return (
      <div className="max-w-md mx-auto pt-4">
        <div className="h-10 w-48 bg-[var(--border)] rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-64 bg-[var(--surface-hover)] rounded animate-pulse mb-6" />
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 space-y-4">
          <div className="h-4 w-24 bg-[var(--surface-hover)] rounded animate-pulse" />
          <div className="h-10 bg-[var(--surface-hover)] rounded-lg animate-pulse" />
          <div className="h-10 bg-[var(--surface-hover)] rounded-lg animate-pulse" />
          <div className="h-10 bg-[var(--surface-hover)] rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  // ── Diblokir: user tidak bisa buka shift ─────────────────────────────────
  const isBlocked =
    ctx !== null && !ctx.can_open_shift1 && !ctx.can_open_shift2;

  if (isBlocked) {
    return (
      <div className="max-w-md mx-auto space-y-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Buka Shift Baru</h1>
          <p className="text-[var(--muted)] text-sm mt-1">
            Status shift kamu hari ini.
          </p>
        </div>

        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 space-y-5">
          {/* Info kasir */}
          <div>
            <p className="text-sm text-[var(--muted)]">Kasir</p>
            <p className="font-medium text-[var(--foreground)] mt-0.5">
              {session?.user?.name ?? "—"}
            </p>
          </div>

          {/* Status Shift 1 hari ini */}
          {ctx?.shift1_today && (
            <div className="bg-[var(--surface-hover)] rounded-lg p-4 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--text-secondary)]">Shift 1 Hari Ini</p>
                <ShiftStatusBadge status={ctx.shift1_today.status} />
              </div>
            </div>
          )}

          {/* Status Shift 2 hari ini */}
          {ctx?.shift2_today && (
            <div className="bg-[var(--surface-hover)] rounded-lg p-4 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--text-secondary)]">Shift 2 Hari Ini</p>
                <ShiftStatusBadge status={ctx.shift2_today.status} />
              </div>
            </div>
          )}

          {/* Alasan diblokir */}
          <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <InfoIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">{ctx?.blocked_reason}</p>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="w-full py-2.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Form buka shift ───────────────────────────────────────────────────────
  const shift1Available = ctx?.can_open_shift1 ?? true;
  const shift2Available = ctx?.can_open_shift2 ?? false;
  // Jika context belum tersedia (null), tampilkan kedua pilihan (fallback)
  const shift1Disabled = ctx !== null && !shift1Available;
  const shift2Disabled = ctx !== null && !shift2Available;

  return (
    <div className="max-w-md mx-auto space-y-6 pt-4">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Buka Shift Baru</h1>
        <p className="text-[var(--muted)] text-sm mt-1">
          Isi detail shift sebelum memulai rekonsiliasi.
        </p>
      </div>

      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 space-y-5">
        {/* Kasir info */}
        <div>
          <p className="text-sm text-[var(--muted)]">Kasir</p>
          <p className="font-medium text-[var(--foreground)] mt-0.5">
            {session?.user?.name ?? "—"}
          </p>
        </div>

        {/* Ringkasan status shift hari ini */}
        {ctx && (ctx.shift1_today || ctx.shift2_today) && (
          <div className="bg-[var(--surface-hover)] rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
              Status Shift Hari Ini
            </p>
            {ctx.shift1_today ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Shift 1</span>
                <ShiftStatusBadge status={ctx.shift1_today.status} />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-tertiary)]">Shift 1</span>
                <span className="text-xs text-[var(--text-tertiary)] italic">Belum dibuka</span>
              </div>
            )}
            {ctx.shift2_today ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Shift 2</span>
                <ShiftStatusBadge status={ctx.shift2_today.status} />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-tertiary)]">Shift 2</span>
                <span className="text-xs text-[var(--text-tertiary)] italic">Belum dibuka</span>
              </div>
            )}
          </div>
        )}

        {/* Periode Shift */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            Periode Shift
          </label>
          <div className="flex gap-3">
            {(["SHIFT_1", "SHIFT_2"] as const).map((p) => {
              const isDisabled = p === "SHIFT_1" ? shift1Disabled : shift2Disabled;
              const isSelected = shiftPeriod === p;
              return (
                <button
                  key={p}
                  onClick={() => !isDisabled && setShiftPeriod(p)}
                  disabled={isDisabled}
                  title={
                    isDisabled
                      ? p === "SHIFT_1"
                        ? "Shift 1 sudah berjalan atau tidak tersedia"
                        : "Shift 2 belum bisa dibuka sebelum kasir Shift 1 mengajukan laporan"
                      : undefined
                  }
                  className={[
                    "flex-1 py-2.5 rounded-lg border text-sm font-medium transition relative",
                    isDisabled
                      ? "border-[var(--border)] bg-[var(--surface-hover)] text-[var(--border)] cursor-not-allowed"
                      : isSelected
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]",
                  ].join(" ")}
                >
                  {p === "SHIFT_1" ? "Shift 1 (Pagi)" : "Shift 2 (Siang)"}
                  {isSelected && !isDisabled && (
                    <CheckCircleIcon className="w-4 h-4 inline-block ml-1.5 -mt-0.5" />
                  )}
                  {isDisabled && (
                    <span className="block text-[10px] font-normal mt-0.5 text-[var(--border)]">
                      Tidak tersedia
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Keterangan kontekstual di bawah tombol shift */}
          {ctx?.can_open_shift2 && !ctx.can_open_shift1 && (
            <p className="text-xs text-blue-600 flex items-center gap-1.5 mt-1">
              <InfoIcon className="w-3.5 h-3.5" />
              Shift 1 sudah selesai — kamu ditetapkan untuk mengisi Shift 2.
            </p>
          )}
          {ctx?.can_open_shift1 && !ctx.can_open_shift2 && (
            <p className="text-xs text-[var(--text-tertiary)] flex items-center gap-1.5 mt-1">
              <InfoIcon className="w-3.5 h-3.5" />
              Shift 2 baru bisa dibuka setelah kasir Shift 1 mengajukan laporan.
            </p>
          )}
        </div>

        {/* Modal awal */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            Modal Awal
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-sm">
              Rp
            </span>
            <input
              type="text"
              value={formatRupiah(modalAwal)}
              onChange={(e) =>
                setModalAwal(e.target.value.replace(/\D/g, ""))
              }
              placeholder="1.000.000"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder:text-[var(--text-tertiary)]"
            />
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">Default: Rp 1.000.000</p>
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
            className="flex-1 py-2.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition"
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
