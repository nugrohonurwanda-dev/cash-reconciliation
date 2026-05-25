//src/app/(dashboard)/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import Link from "next/link";
import {
  formatRupiahDisplay,
  STATUS_LABEL,
  SHIFT_PERIOD_LABEL,
} from "@/utils/format";
import { getTodayWIB } from "@/utils/date";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<Role, string> = {
  CASHIER: "Kasir",
  HEAD_CASHIER: "Head Kasir",
  FINANCE: "Finance",
};

function formatTanggalWIB() {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date());
}

// ── Greeting ──────────────────────────────────────────────────────────────────
function Greeting({ name, role }: { name: string; role: Role }) {
  const firstName = name.split(" ")[0];
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
          Selamat datang, {firstName} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          {ROLE_LABEL[role]}
        </p>
      </div>
      <div
        className="shrink-0 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
        style={{
          backgroundColor: "var(--surface-hover)",
          border: "1px solid var(--border)",
          color: "var(--text-secondary)",
        }}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {formatTanggalWIB()}
      </div>
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  accentColor = "#94a3b8",
  iconBg = "var(--surface-hover)",
  iconColor = "var(--muted)",
  valueColor = "var(--foreground)",
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accentColor?: string;
  iconBg?: string;
  iconColor?: string;
  valueColor?: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-5 relative overflow-hidden"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${accentColor}`,
      }}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm" style={{ color: "var(--muted)" }}>{label}</p>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold mt-2" style={{ color: valueColor }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-1.5" style={{ color: "var(--text-tertiary)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
function EmptyState({
  message,
  hint,
  ctaLabel,
  ctaHref,
}: {
  message: string;
  hint?: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div
      className="rounded-xl border p-8 text-center"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-3"
        style={{ backgroundColor: "var(--surface-hover)" }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
          style={{ color: "var(--text-tertiary)" }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      </div>
      <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        {message}
      </p>
      {hint && (
        <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
          {hint}
        </p>
      )}
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="inline-block mt-4 text-xs font-medium px-4 py-2 rounded-lg transition"
          style={{
            backgroundColor: "var(--surface-hover)",
            border: "1px solid var(--border)",
            color: "var(--primary)",
          }}
        >
          {ctaLabel} →
        </Link>
      )}
    </div>
  );
}

// ── Icons (inline SVG helpers) ────────────────────────────────────────────────
const IconClock = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconCalendar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const IconCheck = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconMoney = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);
const IconBank = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 6l9-4 9 4M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M3 18h18" />
  </svg>
);

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = session.user.role;
  const userId = session.user.id;
  const userName = session.user.name ?? "User";

  // ── CASHIER ─────────────────────────────────────────────────────────────────
  if (role === Role.CASHIER) {
    const shifts = await prisma.shiftReport.findMany({
      where: { opened_by: userId },
      orderBy: { opened_at: "desc" },
      take: 5,
    });

    const activeShift = shifts.find(
      (s) =>
        s.status === "OPEN" ||
        s.status === "PENDING" ||
        s.status === "PENDING_FINANCE",
    );

    const totalShift = await prisma.shiftReport.count({
      where: { opened_by: userId },
    });

    return (
      <div className="space-y-6">
        <Greeting name={userName} role={role} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Shift Aktif"
            value={activeShift ? STATUS_LABEL[activeShift.status]?.label : "Tidak ada"}
            sub={activeShift ? "Sedang berjalan" : "Buka shift untuk mulai"}
            accentColor={activeShift ? "#10b981" : "#94a3b8"}
            iconBg={activeShift ? "#d1fae5" : "var(--surface-hover)"}
            iconColor={activeShift ? "#059669" : "var(--muted)"}
            valueColor={activeShift ? "#059669" : "var(--text-tertiary)"}
            icon={<IconCheck />}
          />
          <StatCard
            label="Total Shift"
            value={totalShift}
            sub="Sepanjang waktu"
            accentColor="#3b82f6"
            iconBg="#dbeafe"
            iconColor="#2563eb"
            icon={<IconCalendar />}
          />
          <StatCard
            label="Status Terakhir"
            value={shifts[0] ? STATUS_LABEL[shifts[0].status]?.label : "-"}
            sub={shifts[0] ? new Date(shifts[0].shift_date).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : undefined}
            accentColor="#94a3b8"
            iconBg="var(--surface-hover)"
            iconColor="var(--muted)"
            icon={<IconClock />}
          />
        </div>

        {/* Active shift banner */}
        {activeShift ? (
          <div
            className="rounded-xl p-5 flex items-center justify-between"
            style={{
              backgroundColor: "#f0fdf4",
              border: "1px solid #86efac",
            }}
          >
            <div className="flex items-center gap-3">
              {/* Pulse dot */}
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <div>
                <p className="text-sm font-medium text-emerald-800">
                  Shift sedang berjalan
                </p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  Dibuka pukul{" "}
                  {new Date(activeShift.opened_at).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · {SHIFT_PERIOD_LABEL[activeShift.shift_period]?.label ?? activeShift.shift_period}
                </p>
              </div>
            </div>
            <Link
              href={`/shifts/${activeShift.id}`}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition shrink-0"
            >
              Lanjutkan →
            </Link>
          </div>
        ) : (
          <div
            className="rounded-xl border p-6 text-center"
            style={{ borderColor: "var(--border)" }}
          >
            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
              Belum ada shift aktif hari ini
            </p>
            <Link
              href="/shifts/new"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Buka Shift Baru
            </Link>
          </div>
        )}

        {/* Riwayat shift */}
        {shifts.length > 0 ? (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                Shift Terakhir
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: "var(--surface-hover)" }}>
                <tr>
                  {["Tanggal", "Shift", "Status", "Aksi"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium uppercase tracking-wide"
                      style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift) => (
                  <tr key={shift.id} className="border-t hover:bg-[var(--surface-hover)] transition-colors"
                    style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                      {new Date(shift.shift_date).toLocaleDateString("id-ID", {
                        weekday: "short", day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                        ${SHIFT_PERIOD_LABEL[shift.shift_period]?.color ?? "bg-[var(--surface-hover)] text-[var(--muted)]"}`}>
                        {SHIFT_PERIOD_LABEL[shift.shift_period]?.label ?? shift.shift_period}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold
                        ${STATUS_LABEL[shift.status]?.color}`}>
                        {STATUS_LABEL[shift.status]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/shifts/${shift.id}`}
                        className="text-sm font-medium transition-colors"
                        style={{ color: "var(--primary)" }}>
                        Detail →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            message="Belum ada riwayat shift"
            hint="Shift yang sudah dibuka akan muncul di sini"
            ctaLabel="Buka Shift Baru"
            ctaHref="/shifts/new"
          />
        )}
      </div>
    );
  }

  // ── HEAD CASHIER ─────────────────────────────────────────────────────────────
  if (role === Role.HEAD_CASHIER) {
    const todayStart = getTodayWIB();

    const [pendingCount, todayShifts, approvedToday] =
      await prisma.$transaction([
        prisma.shiftReport.count({ where: { status: "PENDING" } }),
        prisma.shiftReport.count({
          where: { shift_date: { gte: todayStart } },
        }),
        prisma.shiftReport.count({
          where: {
            status: "PENDING_FINANCE",
            approvals: {
              some: {
                action: "APPROVE",
                approver_id: userId,
                timestamp: { gte: todayStart },
              },
            },
          },
        }),
      ]);

    const recentPending = await prisma.shiftReport.findMany({
      where: { status: "PENDING" },
      include: { opener: { select: { full_name: true } } },
      orderBy: { opened_at: "desc" },
      take: 5,
    });

    return (
      <div className="space-y-6">
        <Greeting name={userName} role={role} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Menunggu Review"
            value={pendingCount}
            sub={pendingCount > 0 ? "Perlu ditindaklanjuti" : "Semua sudah direview"}
            accentColor={pendingCount > 0 ? "#f59e0b" : "#94a3b8"}
            iconBg={pendingCount > 0 ? "#fef3c7" : "var(--surface-hover)"}
            iconColor={pendingCount > 0 ? "#d97706" : "var(--muted)"}
            valueColor={pendingCount > 0 ? "#d97706" : "var(--text-tertiary)"}
            icon={<IconClock />}
          />
          <StatCard
            label="Shift Hari Ini"
            value={todayShifts}
            sub={formatTanggalWIB()}
            accentColor="#3b82f6"
            iconBg="#dbeafe"
            iconColor="#2563eb"
            icon={<IconCalendar />}
          />
          <StatCard
            label="Disetujui Hari Ini"
            value={approvedToday}
            sub={`dari ${todayShifts} shift total`}
            accentColor="#10b981"
            iconBg="#d1fae5"
            iconColor="#059669"
            valueColor="#059669"
            icon={<IconCheck />}
          />
        </div>

        {recentPending.length > 0 ? (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <div className="px-5 py-4 border-b flex items-center justify-between"
              style={{ borderColor: "var(--border)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                Perlu Direview
              </h2>
              <Link href="/review" className="text-xs font-medium transition-colors"
                style={{ color: "var(--primary)" }}>
                Lihat semua →
              </Link>
            </div>
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: "var(--surface-hover)" }}>
                <tr>
                  {["Kasir", "Shift", "Tanggal", "Aksi"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium uppercase tracking-wide"
                      style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentPending.map((shift) => (
                  <tr key={shift.id} className="border-t hover:bg-[var(--surface-hover)] transition-colors"
                    style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--foreground)" }}>
                      {shift.opener.full_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                        ${SHIFT_PERIOD_LABEL[shift.shift_period]?.color ?? "bg-[var(--surface-hover)] text-[var(--muted)]"}`}>
                        {SHIFT_PERIOD_LABEL[shift.shift_period]?.label ?? shift.shift_period}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--muted)" }}>
                      {new Date(shift.shift_date).toLocaleDateString("id-ID", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Link href="/review" className="text-sm font-medium transition-colors"
                        style={{ color: "var(--primary)" }}>
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            message="Tidak ada laporan yang menunggu review"
            hint="Semua laporan kasir sudah ditangani"
            ctaLabel="Lihat semua laporan"
            ctaHref="/review"
          />
        )}
      </div>
    );
  }

  // ── FINANCE ──────────────────────────────────────────────────────────────────
  if (role === Role.FINANCE) {
    const todayStart = getTodayWIB();

    const [pendingFinanceCount, closedToday, cashAggregate, bankAggregate] =
      await prisma.$transaction([
        prisma.shiftReport.count({ where: { status: "PENDING_FINANCE" } }),
        prisma.shiftReport.count({
          where: { status: "CLOSED", closed_at: { gte: todayStart } },
        }),
        prisma.transactionLine.aggregate({
          where: { sumber: "FISIK", kategori: "CASH", shift: { status: "CLOSED" } },
          _sum: { nilai: true },
        }),
        prisma.transactionLine.aggregate({
          where: {
            sumber: "FISIK",
            kategori: { notIn: ["CASH"] },
            shift: { status: "CLOSED" },
          },
          _sum: { nilai: true },
        }),
      ]);

    const totalCash = Number(cashAggregate._sum.nilai ?? 0);
    const totalBank = Number(bankAggregate._sum.nilai ?? 0);

    const recentPendingFinance = await prisma.shiftReport.findMany({
      where: { status: "PENDING_FINANCE" },
      include: { opener: { select: { full_name: true } } },
      orderBy: { opened_at: "desc" },
      take: 5,
    });

    return (
      <div className="space-y-6">
        <Greeting name={userName} role={role} />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Menunggu Finalisasi"
            value={pendingFinanceCount}
            sub={pendingFinanceCount > 0 ? "Perlu ditindaklanjuti" : "Semua selesai"}
            accentColor={pendingFinanceCount > 0 ? "#f59e0b" : "#94a3b8"}
            iconBg={pendingFinanceCount > 0 ? "#fef3c7" : "var(--surface-hover)"}
            iconColor={pendingFinanceCount > 0 ? "#d97706" : "var(--muted)"}
            valueColor={pendingFinanceCount > 0 ? "#d97706" : "var(--text-tertiary)"}
            icon={<IconClock />}
          />
          <StatCard
            label="Ditutup Hari Ini"
            value={closedToday}
            sub="Shift closed"
            accentColor="#10b981"
            iconBg="#d1fae5"
            iconColor="#059669"
            valueColor="#059669"
            icon={<IconCheck />}
          />
          <StatCard
            label="Total Omzet Cash"
            value={formatRupiahDisplay(totalCash)}
            sub="Semua shift closed"
            accentColor="#3b82f6"
            iconBg="#dbeafe"
            iconColor="#2563eb"
            icon={<IconMoney />}
          />
          <StatCard
            label="Total Omzet Bank"
            value={formatRupiahDisplay(totalBank)}
            sub="Semua shift closed"
            accentColor="#8b5cf6"
            iconBg="#ede9fe"
            iconColor="#7c3aed"
            icon={<IconBank />}
          />
        </div>

        {recentPendingFinance.length > 0 ? (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <div className="px-5 py-4 border-b flex items-center justify-between"
              style={{ borderColor: "var(--border)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                Perlu Difinalisasi
              </h2>
              <Link href="/finance" className="text-xs font-medium transition-colors"
                style={{ color: "var(--primary)" }}>
                Lihat semua →
              </Link>
            </div>
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: "var(--surface-hover)" }}>
                <tr>
                  {["Kasir", "Shift", "Tanggal", "Aksi"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium uppercase tracking-wide"
                      style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentPendingFinance.map((shift) => (
                  <tr key={shift.id} className="border-t hover:bg-[var(--surface-hover)] transition-colors"
                    style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--foreground)" }}>
                      {shift.opener.full_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                        ${SHIFT_PERIOD_LABEL[shift.shift_period]?.color ?? "bg-[var(--surface-hover)] text-[var(--muted)]"}`}>
                        {SHIFT_PERIOD_LABEL[shift.shift_period]?.label ?? shift.shift_period}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--muted)" }}>
                      {new Date(shift.shift_date).toLocaleDateString("id-ID", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/shifts/${shift.id}`}
                        className="text-sm font-medium transition-colors"
                        style={{ color: "var(--primary)" }}>
                        Detail →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            message="Tidak ada laporan yang menunggu finalisasi"
            hint="Semua laporan sudah diproses"
            ctaLabel="Lihat semua laporan"
            ctaHref="/finance"
          />
        )}
      </div>
    );
  }
}
