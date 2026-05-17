// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Role } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";

const UpdateUserSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  is_active: z.boolean().optional(),
  password: z.string().min(8).max(128).optional(),
});

// ─── PATCH /api/users/:id ─────────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { session, error } = await requireRole(Role.FINANCE);
  if (error) return error;

  const body = await req.json();
  const parsed = UpdateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Guard: Finance tidak bisa reset password Finance lain
  if (parsed.data.password) {
    const target = await prisma.user.findUnique({ where: { id } });
    if (target?.role === Role.FINANCE && target.id !== session!.user.id) {
      return NextResponse.json(
        { error: "Finance tidak dapat mereset password Finance lain." },
        { status: 403 },
      );
    }
  }

  // Proteksi: jika nonaktifkan Finance, pastikan masih ada Finance lain yang aktif
  if (parsed.data.is_active === false) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (user?.role === Role.FINANCE) {
      const financeCount = await prisma.user.count({
        where: {
          role: Role.FINANCE,
          is_active: true,
          id: { not: id },
        },
      });

      if (financeCount === 0) {
        return NextResponse.json(
          {
            error:
              "Tidak dapat menonaktifkan satu-satunya user Finance aktif. Tambahkan Finance lain terlebih dahulu.",
          },
          { status: 422 },
        );
      }
    }
  }

  const updateData: {
    full_name?: string;
    is_active?: boolean;
    password_hash?: string;
  } = {};
  if (parsed.data.full_name !== undefined)
    updateData.full_name = parsed.data.full_name;
  if (parsed.data.is_active !== undefined)
    updateData.is_active = parsed.data.is_active;
  if (parsed.data.password) {
    updateData.password_hash = await bcrypt.hash(parsed.data.password, 12);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      username: true,
      full_name: true,
      role: true,
      is_active: true,
    },
  });

  return NextResponse.json({ data: user });
}

// ─── DELETE /api/users/:id ───────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { session, error } = await requireRole(Role.FINANCE); // ← tambah session
  if (error) return error;

  // Guard #1: tidak boleh hapus akun sendiri
  if (id === session!.user.id) {
    return NextResponse.json(
      { error: "Tidak dapat menghapus akun sendiri." },
      { status: 403 },
    );
  }

  const shiftCount = await prisma.shiftReport.count({
    where: { opened_by: id },
  });

  if (shiftCount > 0) {
    return NextResponse.json(
      {
        error:
          "User tidak dapat dihapus karena memiliki riwayat shift. Gunakan nonaktifkan.",
      },
      { status: 422 },
    );
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ message: "User berhasil dihapus." });
}
