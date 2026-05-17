#!/usr/bin/env node
// scripts/generate-pdf.mjs
//
// Script ini dijalankan sebagai child process terpisah dari Next.js.
// Tujuannya: menghindari webpack bundling yang menyebabkan dual React
// instance (error #31) saat @react-pdf/renderer dipakai di RSC route.
//
// Input  : JSON string via stdin  { shift, recon, totalVoid, ... }
// Output : PDF buffer via stdout (binary)
// Error  : exit code 1 + stderr message

import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const ce = React.createElement;

// ─── Helpers ──────────────────────────────────────────────────
const safeNum = (v) => {
  if (v == null) return 0;
  const n = typeof v === "object" && "toString" in v
    ? parseFloat(v.toString())
    : Number(v);
  return isNaN(n) ? 0 : n;
};
const fmt = (v) => `Rp ${safeNum(v).toLocaleString("id-ID")}`;
const fmtDate = (d) => {
  if (!d) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(d));
};
const fmtDateTime = (d) => {
  if (!d) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(d));
};

const KATEGORI_LABEL = { CASH: "Cash", EDC_DEBIT: "EDC Debit", EDC_KREDIT: "EDC Kredit", QRIS: "QRIS", TRANSFER: "Transfer" };
const ROLE_LABEL = { CASHIER: "Kasir", HEAD_CASHIER: "Head Kasir", FINANCE: "Finance" };
const TIPE_LABEL = { VOID: "Void", DISCOUNT: "Discount", DEPOSIT: "Deposit", OTHER_COST: "Other Cost" };

// ─── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: "#1e293b", paddingTop: 32, paddingBottom: 40, paddingHorizontal: 36 },
  headerBar: { backgroundColor: "#0f172a", borderRadius: 6, paddingVertical: 10, paddingHorizontal: 16, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerCompany: { color: "#ffffff", fontSize: 13, fontFamily: "Helvetica-Bold" },
  headerSub: { color: "#94a3b8", fontSize: 8, marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  closedBadge: { backgroundColor: "#22c55e", color: "#052e16", fontSize: 8, fontFamily: "Helvetica-Bold", paddingVertical: 3, paddingHorizontal: 10, borderRadius: 20 },
  headerGenerated: { color: "#64748b", fontSize: 7, marginTop: 4 },
  titleBar: { backgroundColor: "#1e3a5f", borderRadius: 5, paddingVertical: 8, paddingHorizontal: 14, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titleText: { color: "#ffffff", fontSize: 11, fontFamily: "Helvetica-Bold" },
  titleMeta: { color: "#bfdbfe", fontSize: 7.5, textAlign: "right" },
  infoGrid: { flexDirection: "row", gap: 6, marginBottom: 12 },
  infoCell: { flex: 1, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 5, paddingVertical: 6, paddingHorizontal: 8, backgroundColor: "#f8fafc" },
  infoKey: { fontSize: 7, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  infoVal: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  infoValAccent: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#2563eb" },
  noteBar: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", borderLeftWidth: 4, borderLeftColor: "#dc2626", borderRadius: 5, paddingVertical: 6, paddingHorizontal: 10, marginBottom: 10 },
  noteLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#991b1b", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 },
  noteText: { fontSize: 8.5, color: "#991b1b" },
  sectionTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#0f172a", textTransform: "uppercase", letterSpacing: 0.7, borderBottomWidth: 1.5, borderBottomColor: "#0f172a", paddingBottom: 3, marginTop: 14, marginBottom: 7 },
  table: { width: "100%", marginBottom: 6 },
  thead: { flexDirection: "row", backgroundColor: "#1e293b", borderRadius: 3, paddingVertical: 5, paddingHorizontal: 8 },
  th: { color: "#ffffff", fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 0.3 },
  thRight: { color: "#ffffff", fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 0.3, textAlign: "right" },
  row: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: "#f1f5f9" },
  rowEven: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 8, backgroundColor: "#f8fafc", borderBottomWidth: 0.5, borderBottomColor: "#f1f5f9" },
  rowTotal: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, backgroundColor: "#1e3a5f", borderRadius: 3, marginTop: 2 },
  td: { fontSize: 8.5, color: "#334155" },
  tdRight: { fontSize: 8.5, color: "#334155", textAlign: "right" },
  tdBold: { fontSize: 8.5, color: "#334155", fontFamily: "Helvetica-Bold" },
  tdTotalWhite: { fontSize: 8.5, color: "#ffffff", fontFamily: "Helvetica-Bold" },
  tdTotalWhiteRight: { fontSize: 8.5, color: "#ffffff", fontFamily: "Helvetica-Bold", textAlign: "right" },
  tdGreen: { fontSize: 8.5, color: "#16a34a", textAlign: "right" },
  tdRed: { fontSize: 8.5, color: "#dc2626", textAlign: "right" },
  tdMuted: { fontSize: 8.5, color: "#94a3b8", textAlign: "right" },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: 12, marginTop: 4 },
  chipBlue: { flex: 1, borderRadius: 5, paddingVertical: 7, paddingHorizontal: 10, backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe" },
  chipGreen: { flex: 1, borderRadius: 5, paddingVertical: 7, paddingHorizontal: 10, backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" },
  chipNeutral: { flex: 1, borderRadius: 5, paddingVertical: 7, paddingHorizontal: 10, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0" },
  chipLabel: { fontSize: 7, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 },
  chipValBlue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#2563eb" },
  chipValGreen: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#16a34a" },
  chipValRed: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#dc2626" },
  chipValNeutral: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#64748b" },
  logsGrid: { flexDirection: "row", gap: 6, marginBottom: 10 },
  logCard: { flex: 1, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 5, paddingVertical: 8, paddingHorizontal: 8 },
  logLabel: { fontSize: 7, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 3 },
  logValRed: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#dc2626" },
  logValAmber: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#d97706" },
  logValBlue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#2563eb" },
  logValViolet: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#7c3aed" },
  omzetBox: { backgroundColor: "#0f172a", borderRadius: 7, paddingVertical: 12, paddingHorizontal: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  omzetLabel: { fontSize: 8, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 },
  omzetVal: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  omzetSub: { fontSize: 7, color: "#475569", marginTop: 3 },
  accumSection: { backgroundColor: "#f5f3ff", borderWidth: 1, borderColor: "#ddd6fe", borderRadius: 7, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12 },
  accumTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#5b21b6", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 7 },
  signRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  signBox: { flex: 1, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 5, paddingVertical: 8, paddingHorizontal: 8 },
  signRole: { fontSize: 7.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.4, color: "#0f172a", textAlign: "center", marginBottom: 3 },
  signArea: { height: 36, borderBottomWidth: 1, borderBottomColor: "#cbd5e1", marginBottom: 4 },
  signName: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#0f172a", textAlign: "center" },
  signTime: { fontSize: 7, color: "#94a3b8", textAlign: "center" },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: "#e2e8f0", paddingTop: 6 },
  footerText: { fontSize: 7, color: "#94a3b8" },
});

// ─── Build Document ────────────────────────────────────────────
function buildPDFDocument(data) {
  const { shift, recon, totalVoid, totalDiscount, totalDeposit, totalOtherCost, totalOmzetBersih, dailyAccumulation } = data;

  const totalSelisih = safeNum(recon.total_selisih);
  const totalEsb = safeNum(recon.total_esb);
  const totalFisik = safeNum(recon.total_fisik);
  const chipSelisihValStyle = totalSelisih < 0 ? s.chipValRed : totalSelisih > 0 ? s.chipValGreen : s.chipValNeutral;
  const chipSelisihBgStyle = totalSelisih > 0 ? s.chipGreen : s.chipNeutral;

  const reconRows = recon.per_kategori.map((r, i) => {
    const sel = safeNum(r.selisih);
    const cellStyle = sel < 0 ? s.tdRed : sel > 0 ? s.tdGreen : s.tdMuted;
    return ce(View, { key: r.kategori, style: i % 2 === 0 ? s.row : s.rowEven },
      ce(Text, { style: { ...s.td, flex: 2 } }, KATEGORI_LABEL[r.kategori] ?? r.kategori),
      ce(Text, { style: { ...s.tdRight, flex: 2 } }, fmt(r.esb)),
      ce(Text, { style: { ...s.tdRight, flex: 2 } }, fmt(r.fisik)),
      ce(Text, { style: { ...cellStyle, flex: 2 } }, `${sel >= 0 ? "+" : ""}${fmt(r.selisih)}`),
    );
  });

  const specialLogRows = shift.special_logs.map((log, i) => {
    const ket = log.tipe === "VOID" || log.tipe === "DISCOUNT"
      ? `Bill: ${log.nomor_bill ?? "-"} \u2014 ${log.alasan ?? "-"}`
      : log.tipe === "DEPOSIT"
        ? `${log.nama_member ?? "-"} (${log.metode ?? "-"})`
        : `${log.kategori_biaya ?? "-"} \u2014 ${log.keterangan ?? "-"}`;
    return ce(View, { key: i, style: i % 2 === 0 ? s.row : s.rowEven },
      ce(Text, { style: { ...s.td, flex: 1.5 } }, TIPE_LABEL[log.tipe] ?? log.tipe),
      ce(Text, { style: { ...s.td, flex: 3 } }, ket),
      ce(Text, { style: { ...s.tdRight, flex: 2 } }, fmt(log.nominal)),
    );
  });

  const approvalRows = shift.approvals.map((a, i) => {
    const actionStyle = a.action === "APPROVE" ? s.tdGreen : a.action === "REJECT" ? s.tdRed : s.td;
    return ce(View, { key: i, style: i % 2 === 0 ? s.row : s.rowEven },
      ce(Text, { style: { ...s.td, flex: 2 } }, a.approver?.full_name ?? "-"),
      ce(Text, { style: { ...s.td, flex: 1.5 } }, ROLE_LABEL[a.approver?.role ?? ""] ?? a.approver?.role ?? "-"),
      ce(Text, { style: { ...actionStyle, flex: 1 } }, a.action),
      ce(Text, { style: { ...s.td, flex: 2 } }, fmtDateTime(a.timestamp)),
      ce(Text, { style: { ...s.td, flex: 2 } }, a.catatan ?? "-"),
    );
  });

  const signBoxes = shift.approvals.length > 0
    ? shift.approvals.map((a, i) => ce(View, { key: i, style: s.signBox },
        ce(Text, { style: s.signRole }, ROLE_LABEL[a.approver?.role ?? ""] ?? a.approver?.role ?? "-"),
        ce(View, { style: s.signArea }),
        ce(Text, { style: s.signName }, a.approver?.full_name ?? " "),
        ce(Text, { style: s.signTime }, fmtDateTime(a.timestamp)),
      ))
    : ["Kasir", "Head Kasir", "Control Ops", "Finance"].map((role) =>
        ce(View, { key: role, style: s.signBox },
          ce(Text, { style: s.signRole }, role),
          ce(View, { style: s.signArea }),
          ce(Text, { style: s.signName }, "  "),
        ));

  const accumRows = dailyAccumulation
    ? dailyAccumulation.combined.per_kategori
        .map((row, i) => {
          const r1 = dailyAccumulation.shift_1?.per_kategori.find((r) => r.kategori === row.kategori);
          const r2 = dailyAccumulation.shift_2?.per_kategori.find((r) => r.kategori === row.kategori);
          const v1 = safeNum(r1?.fisik);
          const v2 = safeNum(r2?.fisik);
          const vt = safeNum(row.fisik);
          if (v1 === 0 && v2 === 0 && vt === 0) return null;
          return ce(View, { key: row.kategori, style: i % 2 === 0 ? s.row : s.rowEven },
            ce(Text, { style: { ...s.td, flex: 2 } }, KATEGORI_LABEL[row.kategori] ?? row.kategori),
            ce(Text, { style: { ...s.tdRight, flex: 2 } }, v1 > 0 ? fmt(v1) : "\u2014"),
            ce(Text, { style: { ...s.tdRight, flex: 2 } }, v2 > 0 ? fmt(v2) : "\u2014"),
            ce(Text, { style: { ...s.tdBold, flex: 2, textAlign: "right" } }, vt > 0 ? fmt(vt) : "\u2014"),
          );
        })
        .filter(Boolean)
    : [];

  return ce(Document, {},
    ce(Page, { size: "A4", style: s.page },
      ce(View, { style: s.headerBar },
        ce(View, {},
          ce(Text, { style: s.headerCompany }, "Cabang Utama"),
          ce(Text, { style: s.headerSub }, "Cash Reconciliation Management System"),
        ),
        ce(View, { style: s.headerRight },
          ce(Text, { style: s.closedBadge }, "CLOSED"),
          ce(Text, { style: s.headerGenerated }, `Digenerate: ${fmtDateTime(new Date())}`),
        ),
      ),
      ce(View, { style: s.titleBar },
        ce(Text, { style: s.titleText }, "Hand Over Kasir \u2014 Rekonsiliasi Kas"),
        ce(View, {},
          ce(Text, { style: s.titleMeta }, shift.shift_period === "SHIFT_2" ? "Shift 2 (13.00\u201321.00)" : "Shift 1 (09.00\u201317.00)"),
          ce(Text, { style: s.titleMeta }, fmtDate(shift.shift_date)),
        ),
      ),
      ce(View, { style: s.infoGrid },
        ce(View, { style: { ...s.infoCell, flex: 2 } },
          ce(Text, { style: s.infoKey }, "Kasir"),
          ce(Text, { style: s.infoVal }, shift.opener?.full_name ?? "-"),
        ),
        ce(View, { style: s.infoCell },
          ce(Text, { style: s.infoKey }, "Tanggal"),
          ce(Text, { style: s.infoVal }, fmtDate(shift.shift_date)),
        ),
        ce(View, { style: s.infoCell },
          ce(Text, { style: s.infoKey }, "Jam Buka"),
          ce(Text, { style: s.infoVal }, fmtDateTime(shift.opened_at)),
        ),
        ce(View, { style: s.infoCell },
          ce(Text, { style: s.infoKey }, "Modal Awal"),
          ce(Text, { style: s.infoValAccent }, fmt(shift.modal_awal)),
        ),
      ),
      ...(shift.variance_note
        ? [ce(View, { style: s.noteBar },
            ce(Text, { style: s.noteLabel }, "Keterangan Selisih"),
            ce(Text, { style: s.noteText }, shift.variance_note),
          )]
        : []),
      ce(Text, { style: s.sectionTitle }, "Rekonsiliasi per Kategori"),
      ce(View, { style: s.table },
        ce(View, { style: s.thead },
          ce(Text, { style: { ...s.th, flex: 2 } }, "Kategori"),
          ce(Text, { style: { ...s.thRight, flex: 2 } }, "Nilai ESB (Sistem)"),
          ce(Text, { style: { ...s.thRight, flex: 2 } }, "Nilai Fisik"),
          ce(Text, { style: { ...s.thRight, flex: 2 } }, "Selisih"),
        ),
        ...reconRows,
        ce(View, { style: s.rowTotal },
          ce(Text, { style: { ...s.tdTotalWhite, flex: 2 } }, "TOTAL"),
          ce(Text, { style: { ...s.tdTotalWhiteRight, flex: 2 } }, fmt(totalEsb)),
          ce(Text, { style: { ...s.tdTotalWhiteRight, flex: 2 } }, fmt(totalFisik)),
          ce(Text, { style: { ...s.tdTotalWhiteRight, flex: 2 } }, fmt(totalSelisih)),
        ),
      ),
      ce(View, { style: s.chipRow },
        ce(View, { style: s.chipBlue },
          ce(Text, { style: s.chipLabel }, "Total ESB"),
          ce(Text, { style: s.chipValBlue }, fmt(totalEsb)),
        ),
        ce(View, { style: s.chipGreen },
          ce(Text, { style: s.chipLabel }, "Total Fisik"),
          ce(Text, { style: s.chipValGreen }, fmt(totalFisik)),
        ),
        ce(View, { style: chipSelisihBgStyle },
          ce(Text, { style: s.chipLabel }, "Selisih"),
          ce(Text, { style: chipSelisihValStyle }, `${totalSelisih >= 0 ? "+" : ""}${fmt(totalSelisih)}`),
        ),
      ),
      ...(dailyAccumulation
        ? [ce(View, { style: s.accumSection },
            ce(Text, { style: s.accumTitle }, "Rekap Akumulasi Hari Ini (Shift 1 + Shift 2)"),
            ce(View, { style: s.table },
              ce(View, { style: s.thead },
                ce(Text, { style: { ...s.th, flex: 2 } }, "Kategori"),
                ce(Text, { style: { ...s.thRight, flex: 2 } }, "Shift 1"),
                ce(Text, { style: { ...s.thRight, flex: 2 } }, "Shift 2"),
                ce(Text, { style: { ...s.thRight, flex: 2 } }, "Total"),
              ),
              ...accumRows,
              ce(View, { style: s.rowTotal },
                ce(Text, { style: { ...s.tdTotalWhite, flex: 2 } }, "Total Fisik"),
                ce(Text, { style: { ...s.tdTotalWhiteRight, flex: 2 } }, fmt(dailyAccumulation.shift_1?.total_fisik ?? 0)),
                ce(Text, { style: { ...s.tdTotalWhiteRight, flex: 2 } }, fmt(dailyAccumulation.shift_2?.total_fisik ?? 0)),
                ce(Text, { style: { ...s.tdTotalWhiteRight, flex: 2 } }, fmt(dailyAccumulation.combined.total_fisik)),
              ),
            ),
          )]
        : []),
      ce(Text, { style: s.sectionTitle }, "Ringkasan Special Logs"),
      ce(View, { style: s.logsGrid },
        ce(View, { style: s.logCard }, ce(Text, { style: s.logLabel }, "Total Void"), ce(Text, { style: s.logValRed }, fmt(totalVoid))),
        ce(View, { style: s.logCard }, ce(Text, { style: s.logLabel }, "Total Discount"), ce(Text, { style: s.logValAmber }, fmt(totalDiscount))),
        ce(View, { style: s.logCard }, ce(Text, { style: s.logLabel }, "Total Deposit"), ce(Text, { style: s.logValBlue }, fmt(totalDeposit))),
        ce(View, { style: s.logCard }, ce(Text, { style: s.logLabel }, "Total Other Cost"), ce(Text, { style: s.logValViolet }, fmt(totalOtherCost))),
      ),
      ...(shift.special_logs.length > 0
        ? [ce(View, { style: s.table },
            ce(View, { style: s.thead },
              ce(Text, { style: { ...s.th, flex: 1.5 } }, "Tipe"),
              ce(Text, { style: { ...s.th, flex: 3 } }, "Keterangan"),
              ce(Text, { style: { ...s.thRight, flex: 2 } }, "Nominal"),
            ),
            ...specialLogRows,
          )]
        : []),
      ce(View, { style: s.omzetBox },
        ce(View, {},
          ce(Text, { style: s.omzetLabel }, "Total Omzet Bersih"),
          ce(Text, { style: s.omzetVal }, fmt(totalOmzetBersih)),
          ce(Text, { style: s.omzetSub }, "Fisik \u2212 Void \u2212 Discount \u2212 Other Cost"),
        ),
        ce(View, { style: { alignItems: "flex-end" } },
          ce(Text, { style: { fontSize: 7, color: "#64748b" } }, "Shift ID"),
          ce(Text, { style: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#ffffff" } }, shift.id),
        ),
      ),
      ...(shift.approvals.length > 0
        ? [ce(View, {},
            ce(Text, { style: s.sectionTitle }, "Approval Trail"),
            ce(View, { style: s.table },
              ce(View, { style: s.thead },
                ce(Text, { style: { ...s.th, flex: 2 } }, "Nama"),
                ce(Text, { style: { ...s.th, flex: 1.5 } }, "Role"),
                ce(Text, { style: { ...s.th, flex: 1 } }, "Aksi"),
                ce(Text, { style: { ...s.th, flex: 2 } }, "Waktu"),
                ce(Text, { style: { ...s.th, flex: 2 } }, "Catatan"),
              ),
              ...approvalRows,
            ),
          )]
        : []),
      ce(Text, { style: s.sectionTitle }, "Persetujuan"),
      ce(View, { style: s.signRow }, ...signBoxes),
      ce(View, { style: s.footer, fixed: true },
        ce(Text, { style: s.footerText }, "Cash Reconciliation Management System v1.0"),
        ce(Text, { style: s.footerText }, `Digenerate: ${fmtDateTime(new Date())}`),
      ),
    ),
  );
}

// ─── Main: baca stdin, generate PDF, tulis stdout ─────────────
async function main() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;

  const data = JSON.parse(raw);
  const doc = buildPDFDocument(data);
  const buffer = await renderToBuffer(doc);

  process.stdout.write(buffer);
}

main().catch((err) => {
  process.stderr.write(`[generate-pdf] ERROR: ${err.message}\n${err.stack}\n`);
  process.exit(1);
});
