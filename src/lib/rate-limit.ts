// src/lib/rate-limit.ts
/**
 * In-memory brute-force protection untuk login endpoint.
 * Tanpa Redis, aman untuk single-instance / small-scale production.
 *
 * Strategi:
 * - Track per IP → max 10 gagal dalam window 15 menit
 * - Setelah 10 gagal: block sampai window expired
 * - Login sukses: reset counter
 * - Cleanup otomatis tiap 10 menit untuk cegah memory leak
 */

interface LoginAttempt {
  count: number;
  firstAttempt: number; // epoch ms
  blocked: boolean;
}

const WINDOW_MS = 15 * 60 * 1000; // 15 menit
const MAX_ATTEMPTS = 10;
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 menit

// Map<ip, LoginAttempt>
const loginAttempts = new Map<string, LoginAttempt>();

// Cleanup periodic: hapus entry yang window-nya sudah expired
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, attempt] of loginAttempts.entries()) {
    if (now - attempt.firstAttempt > WINDOW_MS) {
      loginAttempts.delete(ip);
    }
  }
}, CLEANUP_INTERVAL_MS);

// Agar tidak mencegah Node.js exit (tes / shutdown bersih)
if (cleanupTimer.unref) cleanupTimer.unref();

/**
 * Cek apakah IP sedang di-block.
 * Return true = boleh lanjut, false = block.
 */
export function checkLoginAllowed(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record) return true;

  // Window expired → reset otomatis
  if (now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.delete(ip);
    return true;
  }

  return !record.blocked;
}

/** Dipanggil saat login GAGAL. */
export function recordFailedLogin(ip: string): void {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now, blocked: false });
    return;
  }

  const newCount = record.count + 1;
  loginAttempts.set(ip, {
    ...record,
    count: newCount,
    blocked: newCount >= MAX_ATTEMPTS,
  });
}

/** Dipanggil saat login SUKSES — reset counter IP tersebut. */
export function recordSuccessfulLogin(ip: string): void {
  loginAttempts.delete(ip);
}

/** Untuk monitoring / debugging: lihat state saat ini. */
export function getLoginAttemptInfo(
  ip: string,
): { count: number; blocked: boolean; remainingMs: number } | null {
  const record = loginAttempts.get(ip);
  if (!record) return null;
  const remaining = WINDOW_MS - (Date.now() - record.firstAttempt);
  if (remaining <= 0) {
    loginAttempts.delete(ip);
    return null;
  }
  return {
    count: record.count,
    blocked: record.blocked,
    remainingMs: remaining,
  };
}
