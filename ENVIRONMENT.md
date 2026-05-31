# Panduan Environment Management

## Overview

Proyek ini menggunakan **`APP_ENV`** (bukan `NODE_ENV`) untuk membedakan
tiga environment: `development`, `staging`, dan `production`.

Next.js hanya mengenal `NODE_ENV=development` dan `NODE_ENV=production`.
`APP_ENV` adalah lapisan tambahan kita untuk kontrol yang lebih granular.

```
development  →  local dev, validasi longgar, bebas test
staging      →  server test, validasi ketat, database terpisah, bebas test terus-menerus
production   →  server live, validasi ketat, data nyata
```

---

## File .env per Environment

| File               | Digunakan untuk      | Commit ke git? |
| ------------------ | -------------------- | -------------- |
| `.env.example`     | Template / referensi | ✅ Ya          |
| `.env.development` | Local dev            | ❌ Tidak       |
| `.env.staging`     | Server staging       | ❌ Tidak       |
| `.env.production`  | Server production    | ❌ Tidak       |

### Setup pertama kali

```bash
# Development (local)
cp .env.example .env.development
# Edit DATABASE_URL, NEXTAUTH_SECRET, APP_ENV="development"

# Staging (di server staging)
cp .env.example .env.staging
# Edit semua nilai, APP_ENV="staging"

# Production (di server production)
cp .env.example .env.production
# Edit semua nilai, APP_ENV="production"
```

---

## Cara Menjalankan

### Development (local)

```bash
npm run dev                    # Pakai .env.development
npm run dev:staging            # Simulasi staging di local (pakai .env.staging)
```

### Staging (server staging)

```bash
npm run build:staging          # Build dengan env staging
npm run start:staging          # Jalankan dengan env staging
```

### Production (server live)

```bash
npm run build:production       # Build dengan env production
npm run start:production       # Jalankan dengan env production
```

---

## Database per Environment

Setiap environment punya database sendiri agar tidak saling mengotori data.

| Environment | Database name contoh          |
| ----------- | ----------------------------- |
| Development | `cash_reconciliation_dev`     |
| Staging     | `cash_reconciliation_staging` |
| Production  | `cash_reconciliation_prod`    |

### Migration database

```bash
# Development (migrate dev — bisa rollback)
npm run db:migrate

# Staging (migrate deploy — satu arah, aman untuk CI/CD)
npm run db:migrate:staging
```

---

## Helper di Kode

Gunakan helper dari `src/lib/env.ts` — jangan pakai `process.env.NODE_ENV` langsung.

```typescript
import { isDev, isStaging, isProd, isProdLike } from "@/lib/env";

// Contoh penggunaan:
if (isDev()) {
  console.log("info debug — hanya muncul di development");
}

// isProdLike() = staging ATAU production
// Gunakan ini untuk: cookie secure, validasi ketat, dll
const cookieOptions = {
  secure: isProdLike(), // true di staging dan production
};

// Kalau butuh beda staging vs production
if (isStaging()) {
  // Boleh log lebih banyak untuk debugging di staging
}
```

---

## Perilaku per Environment

| Fitur                    | Development  | Staging          | Production       |
| ------------------------ | ------------ | ---------------- | ---------------- |
| Validasi env vars        | ❌ Skip      | ✅ Ketat         | ✅ Ketat         |
| Cookie `secure`          | ❌ (HTTP OK) | ✅ (perlu HTTPS) | ✅ (perlu HTTPS) |
| Database                 | `_dev`       | `_staging`       | `_prod`          |
| Bebas test terus-menerus | ✅           | ✅               | ❌               |
| Data nyata               | ❌           | ❌               | ✅               |

---

## Tips

- **Staging adalah tempat uji semua fitur baru** sebelum ke production.
  Tidak ada batasan pengujian di staging — bebas dicoba berulang kali.
- **Jangan pernah test langsung di production** untuk fitur yang belum teruji di staging.
- Staging idealnya pakai data dummy yang mirip production, bukan data asli.
- Kalau ada fitur baru: dev → staging (test sampai yakin) → production.
