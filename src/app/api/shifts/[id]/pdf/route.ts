// src/app/api/shifts/[id]/pdf/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Role, ShiftPeriod } from "@prisma/client";
import {
  calculateReconciliation,
  calculateDailyAccumulation,
} from "@/lib/calculations";
import { spawn } from "child_process";
import path from "path";

function generatePDFInChildProcess(data: object): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "scripts", "generate-pdf.mjs");
    const child = spawn(process.execPath, [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => errChunks.push(chunk));

    child.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        const errMsg = Buffer.concat(errChunks).toString("utf8");
        reject(new Error(`PDF generation failed (exit ${code}): ${errMsg}`));
      }
    });

    child.on("error", reject);

    child.stdin.write(
      JSON.stringify(data, (_, v) =>
        typeof v === "object" && v !== null && "toFixed" in v
          ? v.toString()
          : v,
      ),
    );
    child.stdin.end();
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { error } = await requireRole(Role.FINANCE);
    if (error) return error;

    const shift = await prisma.shiftReport.findUnique({
      where: { id },
      include: {
        opener: { select: { full_name: true, username: true } },
        transaction_lines: true,
        special_logs: {
          include: { creator: { select: { full_name: true } } },
        },
        approvals: {
          include: { approver: { select: { full_name: true, role: true } } },
          orderBy: { timestamp: "asc" },
        },
      },
    });

    if (!shift) {
      return NextResponse.json(
        { error: "Shift tidak ditemukan." },
        { status: 404 },
      );
    }
    if (shift.status !== "CLOSED") {
      return NextResponse.json(
        { error: "PDF hanya tersedia untuk shift yang sudah CLOSED." },
        { status: 422 },
      );
    }

    const recon = calculateReconciliation(shift.transaction_lines);
    let dailyAccumulation = null;
    if (shift.shift_period === ShiftPeriod.SHIFT_2) {
      const shift1 = await prisma.shiftReport.findFirst({
        where: {
          shift_date: shift.shift_date,
          shift_period: ShiftPeriod.SHIFT_1,
        },
        include: { transaction_lines: true },
      });
      dailyAccumulation = calculateDailyAccumulation(
        shift1?.transaction_lines ?? null,
        shift.transaction_lines,
      );
    }

    const safeNum = (v: any): number =>
      v == null ? 0 : parseFloat(v.toString());
    const sumNominal = (tipe: string): number =>
      shift.special_logs
        .filter((l) => l.tipe === tipe)
        .reduce((sum, l) => sum + safeNum(l.nominal), 0);

    const totalVoid = sumNominal("VOID");
    const totalDiscount = sumNominal("DISCOUNT");
    const totalDeposit = sumNominal("DEPOSIT");
    const totalOtherCost = sumNominal("OTHER_COST");
    const totalOmzetBersih =
      safeNum(recon.total_fisik) - totalVoid - totalDiscount - totalOtherCost;

    const pdfBuffer = await generatePDFInChildProcess({
      shift,
      recon,
      totalVoid,
      totalDiscount,
      totalDeposit,
      totalOtherCost,
      totalOmzetBersih,
      dailyAccumulation,
    });

    const filename = `laporan-shift-${shift.opener?.username ?? id}-${new Date(shift.shift_date).toISOString().split("T")[0]}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[PDF Generation Error]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal generate PDF." },
      { status: 500 },
    );
  }
}
