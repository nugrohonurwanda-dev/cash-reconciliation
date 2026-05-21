// src/app/api/users/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { z } from "zod";

const UpdateMeSchema = z.object({
  full_name: z.string().min(1, "Nama tidak boleh kosong").max(100).trim(),
});

// ─── GET /api/users/me ────────────────────────────────────────────────────────
// Digunakan oleh Sidebar untuk menampilkan nama & username user yang login
export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: {
      id: true,
      username: true,
      full_name: true,
      role: true,
      is_active: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ data: user });
}

// ─── PATCH /api/users/me ──────────────────────────────────────────────────────
// Digunakan oleh EditProfileModal untuk update nama lengkap
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const parsed = UpdateMeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const user = await prisma.user.update({
    where: { id: session!.user.id },
    data: { full_name: parsed.data.full_name },
    select: {
      id: true,
      username: true,
      full_name: true,
      role: true,
    },
  });

  return NextResponse.json({ data: user, message: "Profil berhasil diperbarui." });
}