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

function StatCard({
  label,
  value,
  color = "text-foreground",
  sub,
}: {
  label: string;
  value: string | number;
  color?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border p-5" style={{backgroundColor:"var(--surface)",borderColor:"var(--border)"}}>
      <p className="text-sm" style={{color:"var(--muted)"}}>{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{color:"var(--text-tertiary)"}}>{sub}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = session.user.role;
  const userId = session.user.id;

  // ── CASHIER ───────────────────────────────────────────────────────────────
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
        <div>
          <h1 className="text-2xl font-bold" style={{color:"var(--foreground)"}}>Dashboard</h1>
          <p className="text-sm mt-1" style={{color:"var(--muted)"}}>
            Selamat datang,
            <span className="font-medium" style={{color:"var(--foreground)"}}>
              {session.user.name}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Shift Aktif"
            value={
              activeShift
                ? STATUS_LABEL[activeShift.status]?.label
                : "Tidak ada"
            }
            color={activeShift ? "text-emerald-600" : "text-[var(--text-tertiary)]"}
          />
          <StatCard label="Total Shift" value={totalShift} />
          <StatCard
            label="Status Terakhir"
            value={shifts[0] ? STATUS_LABEL[shifts[0].status]?.label : "-"}
            color="text-[var(--muted)]"
          />
        </div>

        {activeShift ? (
          <div className="rounded-xl border p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">
                Shift sedang berjalan
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                Dibuka
                {new Date(activeShift.opened_at).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <Link
              href={`/shifts/${activeShift.id}`}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              Lanjutkan →
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border p-6 text-center">
            <p className="text-[var(--muted)] text-sm mb-4">Belum ada shift aktif</p>
            <Link
              href="/shifts/new"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Buka Shift Baru
            </Link>
          </div>
        )}

        {/* Riwayat shift */}
        {shifts.length > 0 && (
          <div className="rounded-xl border overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Shift Terakhir
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-hover)]">
                <tr>
                  <th className="text-left px-4 py-3 text-[var(--muted)] font-medium">
                    Tanggal
                  </th>
                  <th className="text-left px-4 py-3 text-[var(--muted)] font-medium">
                    Shift
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
                {shifts.map((shift) => (
                  <tr
                    key={shift.id}
                    className="border-t border-[var(--border)] hover:bg-[var(--surface-hover)]"
                  >
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {new Date(shift.shift_date).toLocaleDateString("id-ID", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${SHIFT_PERIOD_LABEL[shift.shift_period]?.color ?? "bg-[var(--surface-hover)] text-[var(--muted)]"}`}
                      >
                        {SHIFT_PERIOD_LABEL[shift.shift_period]?.label ??
                          shift.shift_period}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_LABEL[shift.status]?.color}`}
                      >
                        {STATUS_LABEL[shift.status]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/shifts/${shift.id}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Detail →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ── HEAD CASHIER ──────────────────────────────────────────────────────────
  if (role === Role.HEAD_CASHIER) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

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
        <div>
          <h1 className="text-2xl font-bold" style={{color:"var(--foreground)"}}>Dashboard</h1>
          <p className="text-sm mt-1" style={{color:"var(--muted)"}}>
            Selamat datang,
            <span className="font-medium" style={{color:"var(--foreground)"}}>
              {session.user.name}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Menunggu Review"
            value={pendingCount}
            color={pendingCount > 0 ? "text-amber-600" : "text-[var(--text-tertiary)]"}
          />
          <StatCard label="Shift Hari Ini" value={todayShifts} />
          <StatCard
            label="Disetujui Hari Ini"
            value={approvedToday}
            color="text-emerald-600"
          />
        </div>

        {recentPending.length > 0 ? (
          <div className="rounded-xl border overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Perlu Direview
              </h2>
              <Link
                href="/review"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Lihat semua →
              </Link>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-hover)]">
                <tr>
                  <th className="text-left px-4 py-3 text-[var(--muted)] font-medium">
                    Kasir
                  </th>
                  <th className="text-left px-4 py-3 text-[var(--muted)] font-medium">
                    Shift
                  </th>
                  <th className="text-left px-4 py-3 text-[var(--muted)] font-medium">
                    Tanggal
                  </th>
                  <th className="text-left px-4 py-3 text-[var(--muted)] font-medium">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentPending.map((shift) => (
                  <tr
                    key={shift.id}
                    className="border-t border-[var(--border)] hover:bg-[var(--surface-hover)]"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                      {shift.opener.full_name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${SHIFT_PERIOD_LABEL[shift.shift_period]?.color ?? "bg-[var(--surface-hover)] text-[var(--muted)]"}`}
                      >
                        {SHIFT_PERIOD_LABEL[shift.shift_period]?.label ??
                          shift.shift_period}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {new Date(shift.shift_date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href="/review"
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border p-6 text-center">
            <p className="text-[var(--text-tertiary)] text-sm">
              Tidak ada laporan yang menunggu review
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── FINANCE ───────────────────────────────────────────────────────────────
  if (role === Role.FINANCE) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [pendingFinanceCount, closedToday, cashAggregate, bankAggregate] =
      await prisma.$transaction([
        prisma.shiftReport.count({ where: { status: "PENDING_FINANCE" } }),
        prisma.shiftReport.count({
          where: { status: "CLOSED", closed_at: { gte: todayStart } },
        }),
        // Total omzet cash — agregasi di DB, hanya CLOSED, hanya FISIK, hanya CASH
        prisma.transactionLine.aggregate({
          where: {
            sumber: "FISIK",
            kategori: "CASH",
            shift: { status: "CLOSED" },
          },
          _sum: { nilai: true },
        }),
        // Total omzet bank — agregasi di DB, hanya CLOSED, hanya FISIK,
        // exclude CASH dan DEPOSIT (bukan omzet penjualan)
        prisma.transactionLine.aggregate({
          where: {
            sumber: "FISIK",
            kategori: { notIn: ["CASH", "DEPOSIT_BANK", "DEPOSIT_CASH"] },
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
        <div>
          <h1 className="text-2xl font-bold" style={{color:"var(--foreground)"}}>Dashboard</h1>
          <p className="text-sm mt-1" style={{color:"var(--muted)"}}>
            Selamat datang
            <span className="font-medium" style={{color:"var(--foreground)"}}>
              {session.user.name}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Menunggu Finalisasi"
            value={pendingFinanceCount}
            color={
              pendingFinanceCount > 0 ? "text-amber-600" : "text-[var(--text-tertiary)]"
            }
          />
          <StatCard
            label="Ditutup Hari Ini"
            value={closedToday}
            color="text-emerald-600"
          />
          <StatCard
            label="Total Omzet Cash"
            value={formatRupiahDisplay(totalCash)}
            color="text-[var(--foreground)]"
          />
          <StatCard
            label="Total Omzet Bank"
            value={formatRupiahDisplay(totalBank)}
            color="text-blue-600"
          />
        </div>

        {recentPendingFinance.length > 0 ? (
          <div className="rounded-xl border overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Perlu Difinalisasi
              </h2>
              <Link
                href="/finance"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Lihat semua →
              </Link>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-hover)]">
                <tr>
                  <th className="text-left px-4 py-3 text-[var(--muted)] font-medium">
                    Kasir
                  </th>
                  <th className="text-left px-4 py-3 text-[var(--muted)] font-medium">
                    Shift
                  </th>
                  <th className="text-left px-4 py-3 text-[var(--muted)] font-medium">
                    Tanggal
                  </th>
                  <th className="text-left px-4 py-3 text-[var(--muted)] font-medium">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentPendingFinance.map((shift) => (
                  <tr
                    key={shift.id}
                    className="border-t border-[var(--border)] hover:bg-[var(--surface-hover)]"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                      {shift.opener.full_name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${SHIFT_PERIOD_LABEL[shift.shift_period]?.color ?? "bg-[var(--surface-hover)] text-[var(--muted)]"}`}
                      >
                        {SHIFT_PERIOD_LABEL[shift.shift_period]?.label ??
                          shift.shift_period}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {new Date(shift.shift_date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/shifts/${shift.id}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Detail →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border p-6 text-center">
            <p className="text-[var(--text-tertiary)] text-sm">
              Tidak ada laporan yang menunggu finalisasi
            </p>
          </div>
        )}
      </div>
    );
  }
}