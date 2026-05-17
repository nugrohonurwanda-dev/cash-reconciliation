// src/lib/env.ts
/**
 * Centralized environment validation — fail-fast strategy.
 *
 * Di-import di src/lib/auth.ts dan src/lib/prisma.ts agar validasi
 * dijalankan saat modul pertama kali di-load, bukan saat request datang.
 *
 * - Development: hanya warn, tidak throw (tidak blocking local dev)
 * - Production: throw Error langsung agar server crash dengan pesan jelas
 */

// Placeholder/default values yang dilarang di production
const FORBIDDEN_VALUES = new Set([
  "ganti_dengan_random_string_panjang_minimal_32_karakter",
  "changeme",
  "secret",
  "your-secret",
  "your_secret",
  "replace_me",
  "change_me",
  "",
]);

function assertEnv(
  key: string,
  opts: { minLength?: number; forbiddenValues?: Set<string> } = {},
): string {
  const value = process.env[key];

  if (value === undefined || value.trim() === "") {
    throw new Error(
      `[env] Missing required environment variable: ${key}\n` +
        `Pastikan file .env sudah diset dengan benar sebelum menjalankan production build.`,
    );
  }

  const trimmed = value.trim();

  const forbidden = opts.forbiddenValues ?? FORBIDDEN_VALUES;
  if (forbidden.has(trimmed)) {
    throw new Error(
      `[env] Environment variable ${key} masih menggunakan nilai placeholder/default: "${trimmed}"\n` +
        `Ganti dengan nilai yang aman sebelum deploy ke production.`,
    );
  }

  if (opts.minLength !== undefined && trimmed.length < opts.minLength) {
    throw new Error(
      `[env] Environment variable ${key} terlalu pendek ` +
        `(minimum ${opts.minLength} karakter, saat ini ${trimmed.length} karakter).`,
    );
  }

  return trimmed;
}

function assertUrl(key: string): string {
  const value = assertEnv(key);
  try {
    new URL(value);
  } catch {
    throw new Error(
      `[env] Environment variable ${key} bukan URL yang valid: "${value}"`,
    );
  }
  return value;
}

function validateEnv(): void {
  // Di development: skip validasi ketat agar tidak blocking local dev
  if (process.env.NODE_ENV !== "production") return;

  assertEnv("DATABASE_URL", { minLength: 20 });
  assertEnv("NEXTAUTH_SECRET", { minLength: 32 });
  assertUrl("NEXTAUTH_URL");
}

// Jalankan saat modul ini pertama kali di-import
validateEnv();

/**
 * Typed env object — gunakan ini daripada process.env langsung
 * di tempat yang butuh type safety.
 */
export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "",
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "",
  NODE_ENV: process.env.NODE_ENV ?? "development",
} as const;
