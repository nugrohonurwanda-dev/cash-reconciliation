// src/lib/env.ts
/**
 * Centralized environment management — satu-satunya tempat membaca env vars.
 *
 * APP_ENV (bukan NODE_ENV) digunakan untuk membedakan staging vs production,
 * karena Next.js hanya mengenal NODE_ENV "development" | "production".
 *
 * Hierarchy:
 *   development → bebas, validasi longgar, boleh pakai placeholder
 *   staging     → seperti production, validasi ketat, bebas pengujian terus-menerus
 *   production  → validasi ketat + throw jika ada yang kurang
 */

type AppEnv = "development" | "staging" | "production";

// Nilai placeholder yang dilarang di staging/production
const FORBIDDEN_VALUES = new Set([
  "ganti_dengan_random_string_panjang_minimal_32_karakter",
  "GANTI_DENGAN_SECRET_STAGING_MINIMAL_32_KARAKTER",
  "GANTI_DENGAN_SECRET_PRODUCTION_MINIMAL_32_KARAKTER",
  "changeme",
  "secret",
  "your-secret",
  "your_secret",
  "replace_me",
  "change_me",
  "dev-secret-tidak-perlu-aman-untuk-local", // boleh di dev, tidak di staging/prod
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
        `Pastikan file .env sudah diset dengan benar sebelum menjalankan build ini.`,
    );
  }

  const trimmed = value.trim();
  const forbidden = opts.forbiddenValues ?? FORBIDDEN_VALUES;

  if (forbidden.has(trimmed)) {
    throw new Error(
      `[env] ${key} masih menggunakan nilai placeholder: "${trimmed}"\n` +
        `Ganti dengan nilai yang aman sebelum deploy ke staging/production.`,
    );
  }

  if (opts.minLength !== undefined && trimmed.length < opts.minLength) {
    throw new Error(
      `[env] ${key} terlalu pendek ` +
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
    throw new Error(`[env] ${key} bukan URL yang valid: "${value}"`);
  }
  return value;
}

// Deteksi APP_ENV — ini yang kita pakai, bukan NODE_ENV langsung
const APP_ENV = (process.env.APP_ENV ?? "development") as AppEnv;

function validateEnv(): void {
  // Development: skip validasi ketat, tidak blocking local dev
  if (APP_ENV === "development") return;

  // Staging & production: validasi penuh
  assertEnv("DATABASE_URL", { minLength: 20 });
  assertEnv("NEXTAUTH_SECRET", { minLength: 32 });
  assertUrl("NEXTAUTH_URL");
}

// Jalankan saat modul ini pertama kali di-import (fail-fast)
validateEnv();

/**
 * Typed env object — gunakan ini, bukan process.env langsung.
 */
export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "",
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "",
  NODE_ENV: process.env.NODE_ENV ?? "development",
  APP_ENV,
} as const;

/**
 * Helper untuk mengecek environment saat ini.
 * Gunakan ini di seluruh kode — jangan akses process.env.NODE_ENV langsung.
 *
 * @example
 * if (isDev()) console.log("debug info")
 * if (isStaging()) { ... }
 * cookieOptions.secure = isProd()
 */
export const isDev = () => APP_ENV === "development";
export const isStaging = () => APP_ENV === "staging";
export const isProd = () => APP_ENV === "production";

/**
 * Staging dan production sama-sama "production-like":
 * - Cookie secure
 * - Validasi ketat
 * - Tidak tampil debug info
 */
export const isProdLike = () => APP_ENV === "staging" || APP_ENV === "production";
