// src/app/api/users/me/change-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { z } from "zod";
import bcrypt from "bcryptjs";

const Schema = z.object({
  current_password: z.string().min(1).max(128),
  new_password: z
    .string()
    .min(8, "Password baru minimal 8 karakter")
    .max(128),
});

// ─── POST /api/users/me/change-password ──────────────────────────────────────
// Digunakan oleh ChangePasswordModal di Sidebar
export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const parsed = Schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
  });

  if (!user) {
    return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
  }

  const isValid = await bcrypt.compare(
    parsed.data.current_password,
    user.password_hash,
  );

  if (!isValid) {
    return NextResponse.json(
      { error: "Password lama tidak sesuai." },
      { status: 400 },
    );
  }

  if (parsed.data.current_password === parsed.data.new_password) {
    return NextResponse.json(
      { error: "Password baru tidak boleh sama dengan password lama." },
      { status: 400 },
    );
  }

  const password_hash = await bcrypt.hash(parsed.data.new_password, 12);

  await prisma.user.update({
    where: { id: session!.user.id },
    data: { password_hash },
  });

  return NextResponse.json({ message: "Password berhasil diubah." });
}