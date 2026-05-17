// src/app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Role } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";

const CreateUserSchema = z.object({
  username: z.string().min(3).max(50),
  full_name: z.string().min(1).max(100, "Nama maksimal 100 karakter"), // ← tambah
  role: z.nativeEnum(Role),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .max(128, "Password maksimal 128 karakter"), // ← tambah
});

// ─── GET /api/users ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { error } = await requireRole(Role.FINANCE);
  if (error) return error;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      full_name: true,
      role: true,
      is_active: true,
      created_at: true,
      _count: {
        select: { shifts: true },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({
    data: users.map((u) => ({
      ...u,
      has_shifts: u._count.shifts > 0,
    })),
  });
}

// ─── POST /api/users ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { error } = await requireRole(Role.FINANCE);
  if (error) return error;

  const body = await req.json();
  const parsed = CreateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({
    where: { username: parsed.data.username },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Username sudah digunakan." },
      { status: 409 },
    );
  }

  const password_hash = await bcrypt.hash(parsed.data.password, 12);

  const user = await prisma.user.create({
    data: {
      username: parsed.data.username,
      full_name: parsed.data.full_name,
      role: parsed.data.role,
      password_hash,
    },
    select: {
      id: true,
      username: true,
      full_name: true,
      role: true,
      is_active: true,
      created_at: true,
    },
  });

  return NextResponse.json({ data: user }, { status: 201 });
}
