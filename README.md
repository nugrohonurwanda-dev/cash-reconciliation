# Cash Reconciliation Management System

Sistem manajemen rekonsiliasi kas harian untuk kasir, head kasir, dan finance. Dibangun dengan Next.js 15 App Router sebagai fullstack application — frontend dan backend dalam satu codebase.

---

## Tech Stack

### Frontend

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS v3** + **shadcn/ui** (Radix UI)
- **NextAuth.js** — session management client-side
- **@react-pdf/renderer** — generate laporan PDF

### Backend

- **Next.js Route Handlers** — REST API
- **PostgreSQL** via Docker
- **Prisma ORM** — database access + migration
- **NextAuth.js** — JWT, HttpOnly cookie, session 8 jam
- **Zod** — validasi input semua endpoint
- **bcryptjs** — hash password (cost factor 12)

---

## Halaman & Fitur

### Semua Role

| Halaman   | Path         | Keterangan                             |
| --------- | ------------ | -------------------------------------- |
| Login     | `/login`     | Autentikasi dengan username & password |
| Dashboard | `/dashboard` | Ringkasan data sesuai role yang login  |

### Kasir

| Halaman         | Path          | Keterangan                                        |
| --------------- | ------------- | ------------------------------------------------- |
| Daftar Shift    | `/shifts`     | List shift milik sendiri                          |
| Buka Shift Baru | `/shifts/new` | Form input modal awal, pilih Shift 1 atau Shift 2 |
| Detail Shift    | `/shifts/:id` | Input data ESB & Fisik, Special Logs, dan submit  |

### Head Kasir

| Halaman      | Path      | Keterangan                                       |
| ------------ | --------- | ------------------------------------------------ |
| Daftar Shift | `/shifts` | List semua shift (untuk review dan lihat detail) |
| Review Shift | `/review` | List shift `PENDING` yang menunggu approval      |

### Finance

| Halaman        | Path       | Keterangan                                      |
| -------------- | ---------- | ----------------------------------------------- |
| Finance        | `/finance` | List semua shift, filter tanggal, close laporan |
| Manajemen User | `/users`   | Buat, edit, aktif/nonaktifkan user              |

---

## Role & Akses

```
CASHIER       → Buka shift, input data ESB & Fisik, input Special Logs, submit laporan
HEAD_CASHIER  → Approve atau reject laporan kasir
FINANCE       → Close laporan final, generate PDF, kelola user
```

Akses halaman dijaga di middleware (`src/middleware.ts`) dan divalidasi ulang di setiap API route via `requireRole()`.

---

## Quick Start

### 1. Clone & install dependencies

```bash
git clone https://github.com/nugrohonurwanda-dev/cash-reconciliation.git
cd cash-reconciliation
npm install
```

### 2. Setup environment

```bash
cp .env.example .env.development
```

Edit `.env.development` — minimal yang harus diisi:

```env
DATABASE_URL="postgresql://cashrecon:cashrecon_secret@localhost:5432/cash_reconciliation_dev"
NEXTAUTH_SECRET="isi_dengan_random_string_minimal_32_karakter"
NEXTAUTH_URL="http://localhost:3000"
APP_ENV="development"
```

Generate secret yang aman:

```bash
openssl rand -base64 32
```

### 3. Jalankan PostgreSQL via Docker

```bash
docker-compose up -d
```

### 4. Jalankan Prisma migration

```bash
npm run db:migrate
```

### 5. Seed data awal

```bash
npm run db:seed
```

Membuat 4 user default:

| Username        | Role         | Password          |
| --------------- | ------------ | ----------------- |
| `finance01`     | FINANCE      | `Finance@123`     |
| `headcashier01` | HEAD_CASHIER | `HeadCashier@123` |
| `cashier01`     | CASHIER      | `Cashier@123`     |
| `cashier02`     | CASHIER      | `Cashier@123`     |

### 6. Jalankan dev server

```bash
npm run dev
```

Aplikasi berjalan di `http://localhost:3000`

---

## Environment Management

Proyek ini menggunakan tiga environment terpisah. Lihat [ENVIRONMENT.md](./ENVIRONMENT.md) untuk panduan lengkap.

| Environment | File               | Kegunaan                             |
| ----------- | ------------------ | ------------------------------------ |
| Development | `.env.development` | Local dev, validasi longgar          |
| Staging     | `.env.staging`     | Server uji, bebas test terus-menerus |
| Production  | `.env.production`  | Server live, data nyata              |

```bash
npm run dev              # development (pakai .env.development)
npm run dev:staging      # simulasi staging di local
npm run build:staging    # build untuk staging
npm run start:staging    # jalankan staging
npm run build:production # build untuk production
npm run start:production # jalankan production
```

---

## Format ID Shift

Shift ID di-generate oleh application layer (bukan auto-increment database) dengan format:

```
SHF-YYYYMMDD-S1-001
SHF-YYYYMMDD-S2-001
```

Contoh: `SHF-20260519-S1-003` → shift ke-3, periode Shift 1, tanggal 19 Mei 2026.

---

## Status Flow Shift

```
OPEN → PENDING → PENDING_FINANCE → CLOSED
```

| Status            | Keterangan                                       |
| ----------------- | ------------------------------------------------ |
| `OPEN`            | Kasir buka shift, sedang input data ESB & Fisik  |
| `PENDING`         | Kasir submit, menunggu review Head Kasir         |
| `PENDING_FINANCE` | Head Kasir approve, menunggu verifikasi Finance  |
| `CLOSED`          | Finance close — laporan final, tidak bisa diubah |

Status yang immutable (tidak bisa diubah kasir): `PENDING`, `PENDING_FINANCE`, `CLOSED`.

---

## Aturan Bisnis Kritis

1. **Satu shift aktif per kasir per hari** — tidak bisa buka shift baru jika masih ada yang `OPEN` atau `PENDING` hari ini
2. **Shift 2 hanya bisa dibuka setelah Shift 1 disubmit** — Shift 1 minimal harus `PENDING`
3. **Kasir Shift 1 tidak bisa membuka Shift 2** di hari yang sama
4. **Selisih minus > Rp 50.000** — wajib isi keterangan selisih sebelum submit
5. **Shift `CLOSED` immutable** — dijaga di level API, bukan hanya UI
6. **Edit transaksi wajib isi alasan** jika data sebelumnya sudah pernah disimpan
7. **Semua kalkulasi server-side** — client tidak menghitung sendiri
8. **`Decimal(15,2)`** — tidak ada penggunaan `FLOAT` untuk nominal uang
9. **ACID transaction** — operasi multi-tabel menggunakan Prisma `$transaction()`
10. **Race condition protection** — pembukaan shift menggunakan `isolationLevel: "Serializable"`

---

## Kategori Pembayaran

| Grup           | Kategori                                       |
| -------------- | ---------------------------------------------- |
| Cash           | `CASH`                                         |
| EDC            | `EDC_BRI`, `EDC_BNI`, `EDC_BCA`, `EDC_BSI`     |
| QRIS           | `QRIS_BRI`, `QRIS_BNI`, `QRIS_BCA`, `QRIS_BSI` |
| Transfer       | `TRANSFER_BRI`, `TRANSFER_BNI`, `TRANSFER_BCA` |
| Member Deposit | `DEPOSIT_BANK`, `DEPOSIT_CASH`                 |

Semua 15 kategori masuk sebagai `TransactionLine` (sumber `ESB` atau `FISIK`). Deposit tidak lagi dicatat di Special Logs.

---

## Special Logs

Tiga tipe kejadian luar biasa yang dicatat terpisah dari transaksi utama:

| Tipe         | Field wajib                               |
| ------------ | ----------------------------------------- |
| `VOID`       | `nomor_bill`, `nominal`, `alasan`         |
| `DISCOUNT`   | `nomor_bill`, `nominal`, `alasan`         |
| `OTHER_COST` | `kategori_biaya`, `nominal`, `keterangan` |

---

## API Endpoints

### Auth

| Method | Endpoint            | Keterangan         |
| ------ | ------------------- | ------------------ |
| POST   | `/api/auth/signin`  | Login via NextAuth |
| POST   | `/api/auth/signout` | Logout             |

### Dashboard

| Method | Endpoint         | Keterangan                 |
| ------ | ---------------- | -------------------------- |
| GET    | `/api/dashboard` | Data dashboard sesuai role |

### Shifts

| Method | Endpoint                             | Role       | Keterangan                                                                         |
| ------ | ------------------------------------ | ---------- | ---------------------------------------------------------------------------------- |
| GET    | `/api/shifts`                        | All        | List shift (filter: `status`, `date`, `from`, `to`, `page`) — paginated 20/halaman |
| POST   | `/api/shifts`                        | Cashier    | Buka shift baru                                                                    |
| GET    | `/api/shifts/:id`                    | All        | Detail shift + rekonsiliasi                                                        |
| PUT    | `/api/shifts/:id/transactions`       | Cashier    | Input/update data ESB atau FISIK (terpisah per sumber)                             |
| GET    | `/api/shifts/:id/transactions`       | All        | Lihat data transaksi shift                                                         |
| PUT    | `/api/shifts/:id/special-logs`       | Cashier    | Input/update special logs (replace semua)                                          |
| GET    | `/api/shifts/:id/special-logs`       | All        | Lihat special logs                                                                 |
| GET    | `/api/shifts/:id/transactions/audit` | All        | Riwayat edit transaksi                                                             |
| PATCH  | `/api/shifts/:id/variance-note`      | Cashier    | Simpan keterangan selisih                                                          |
| POST   | `/api/shifts/:id/action`             | Role-based | Submit / Approve / Reject / Close                                                  |
| GET    | `/api/shifts/:id/pdf`                | Finance    | Generate laporan PDF                                                               |
| GET    | `/api/shifts/today-context`          | Cashier    | Konteks shift hari ini untuk form buka shift                                       |

### Notifications

| Method | Endpoint                    | Keterangan                                   |
| ------ | --------------------------- | -------------------------------------------- |
| GET    | `/api/notifications`        | List notifikasi user                         |
| GET    | `/api/notifications/stream` | Server-Sent Events untuk notifikasi realtime |

### Users (Finance only)

| Method | Endpoint                        | Keterangan                                        |
| ------ | ------------------------------- | ------------------------------------------------- |
| GET    | `/api/users`                    | List semua user                                   |
| POST   | `/api/users`                    | Buat user baru                                    |
| PATCH  | `/api/users/:id`                | Update nama, status aktif, atau reset password    |
| DELETE | `/api/users/:id`                | Hapus user (hanya jika belum punya riwayat shift) |
| GET    | `/api/users/me`                 | Profil user yang sedang login                     |
| PATCH  | `/api/users/me/change-password` | Ganti password sendiri                            |

---

## Contoh Request Body

### POST `/api/shifts` — Buka shift baru

```json
{ "modal_awal": 1000000, "shift_period": "SHIFT_1" }
{ "modal_awal": 1000000, "shift_period": "SHIFT_2" }
```

### POST `/api/shifts/:id/action`

```json
{ "action": "SUBMIT" }
{ "action": "APPROVE", "catatan": "Data sudah sesuai" }
{ "action": "REJECT", "catatan": "Ada selisih yang belum dijelaskan" }
{ "action": "CLOSE", "catatan": "Laporan diverifikasi" }
```

### PUT `/api/shifts/:id/transactions` — Input ESB (kirim terpisah untuk FISIK)

```json
{
  "lines": [
    { "sumber": "ESB", "kategori": "CASH", "nilai": 5000000 },
    { "sumber": "ESB", "kategori": "QRIS_BRI", "nilai": 1200000 },
    {
      "sumber": "ESB",
      "kategori": "EDC_BCA",
      "nilai": 800000,
      "catatan": "2 mesin"
    }
  ],
  "reason": "Koreksi input awal"
}
```

> `reason` wajib diisi jika data sebelumnya sudah pernah disimpan (edit).

### PUT `/api/shifts/:id/special-logs`

```json
{
  "logs": [
    {
      "tipe": "VOID",
      "nomor_bill": "TRX-001",
      "nominal": 150000,
      "alasan": "Pesanan salah input"
    },
    {
      "tipe": "DISCOUNT",
      "nomor_bill": "TRX-002",
      "nominal": 50000,
      "alasan": "Diskon member"
    },
    {
      "tipe": "OTHER_COST",
      "kategori_biaya": "ATK",
      "nominal": 25000,
      "keterangan": "Beli kertas struk"
    }
  ]
}
```

---

## Scripts

```bash
# Development
npm run dev               # Jalankan dev server (pakai .env.development)
npm run dev:staging       # Simulasi staging di local
npm run build             # Build (Next.js default)
npm run build:staging     # Build untuk staging
npm run build:production  # Build untuk production
npm run start:staging     # Jalankan staging build
npm run start:production  # Jalankan production build

# Code quality
npm run lint              # ESLint
npm run typecheck         # TypeScript check
npm run check             # Lint + typecheck sekaligus

# Testing
npm run test              # Jalankan semua test (vitest)
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report

# Database
npm run db:migrate          # Migration baru (development)
npm run db:migrate:staging  # Deploy migration ke staging
npm run db:push             # Push schema tanpa migration history
npm run db:seed             # Seed data awal
npm run db:studio           # Buka Prisma Studio (GUI database)
npm run db:reset            # Reset database + re-seed (hapus semua data!)
```

---

## Struktur Project

```
cash-reconciliation/
├── .env.development         # Env local dev (tidak di-commit)
├── .env.staging             # Env staging (tidak di-commit)
├── .env.production          # Env production (tidak di-commit)
├── .env.example             # Template env (di-commit)
├── ENVIRONMENT.md           # Panduan environment management
├── docker-compose.yml       # PostgreSQL via Docker
├── prisma/
│   ├── schema.prisma        # Database schema
│   ├── migrations/          # Migration history
│   └── seed.ts              # Data awal (4 user default)
├── scripts/
│   └── generate-pdf.mjs    # Script generate PDF
└── src/
    ├── app/
    │   ├── (auth)/login/        # Halaman login
    │   ├── (dashboard)/         # Semua halaman setelah login
    │   │   ├── dashboard/       # Dashboard per role
    │   │   ├── shifts/          # Daftar, buka, dan detail shift
    │   │   ├── review/          # Review shift (Head Kasir)
    │   │   ├── finance/         # Finance overview
    │   │   └── users/           # Manajemen user (Finance)
    │   └── api/                 # REST API route handlers
    ├── components/
    │   ├── ui/                  # Komponen UI dasar (Button, Input, dll)
    │   ├── layout/              # Sidebar, layout wrapper
    │   └── shifts/              # Komponen spesifik fitur shift
    ├── hooks/
    │   └── useShiftDetail.ts    # Hook data shift detail
    ├── lib/
    │   ├── auth.ts              # Konfigurasi NextAuth
    │   ├── calculations.ts      # Logika rekonsiliasi (pure functions, tested)
    │   ├── constants.ts         # Konstanta shared (status, kategori, threshold)
    │   ├── env.ts               # Environment config + helper isDev/isStaging/isProd
    │   ├── notifications.ts     # Helper buat & kirim notifikasi
    │   ├── pdf-template.tsx     # Template PDF laporan
    │   ├── prisma.ts            # Prisma client singleton
    │   ├── rate-limit.ts        # Brute-force protection login (in-memory)
    │   └── session.ts           # requireSession / requireRole helper
    ├── middleware.ts            # RBAC route guard (page routes)
    ├── types/                   # TypeScript type definitions
    └── utils/
        ├── date.ts              # Helper tanggal WIB
        └── format.ts            # Format Rupiah, generate shift ID, label constants
```

---

## Security

- **Rate limiting login** — max 10 percobaan gagal per IP dalam 15 menit (in-memory, single instance)
- **JWT session** — HttpOnly cookie, maxAge 8 jam, `secure` aktif di staging dan production
- **RBAC** — guard di middleware (halaman) dan `requireRole()` (API)
- **Env validation** — fail-fast saat server start di staging/production jika ada variable yang kurang atau masih placeholder
- **Password hashing** — bcrypt cost factor 12
- **Security headers** — `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`
- **Audit trail** — setiap edit transaksi dicatat: siapa, kapan, dari nilai apa ke nilai apa
