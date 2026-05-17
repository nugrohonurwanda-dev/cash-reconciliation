# Cash Reconciliation Management System

Sistem manajemen rekonsiliasi kas harian untuk kasir, head cashier, dan finance. Dibangun dengan Next.js 15 App Router sebagai fullstack application — frontend dan backend dalam satu codebase.

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
| Halaman | Path | Keterangan |
|---|---|---|
| Login | `/login` | Autentikasi dengan username & password |
| Dashboard | `/dashboard` | Ringkasan data sesuai role yang login |

### Kasir & Head Kasir
| Halaman | Path | Keterangan |
|---|---|---|
| Daftar Shift | `/shifts` | List shift milik sendiri (Kasir) atau semua (Head Kasir) |
| Buka Shift Baru | `/shifts/new` | Form input ESB, Fisik, Special Logs, dan submit |
| Detail Shift | `/shifts/:id` | Lihat detail, rekonsiliasi, dan riwayat approval |

### Head Kasir
| Halaman | Path | Keterangan |
|---|---|---|
| Review Shift | `/review` | List shift PENDING yang menunggu approval |

### Finance
| Halaman | Path | Keterangan |
|---|---|---|
| Finance | `/finance` | List semua shift, filter tanggal, dan close laporan |
| Manajemen User | `/users` | Buat, edit, aktif/nonaktifkan user |

---

## Role & Akses

```
CASHIER       → Buka shift, input data, submit laporan
HEAD_CASHIER  → Approve atau reject laporan kasir
FINANCE       → Close laporan final, generate PDF, kelola user
```

Akses halaman dijaga di middleware (`src/middleware.ts`) dan divalidasi ulang di setiap API route.

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
cp .env.example .env
```

Edit `.env` — minimal yang harus diisi:

```env
DATABASE_URL="postgresql://cashrecon:cashrecon_secret@localhost:5432/cash_reconciliation"
NEXTAUTH_SECRET="isi_dengan_random_string_minimal_32_karakter"
NEXTAUTH_URL="http://localhost:3000"
```

Generate secret yang aman:
```bash
openssl rand -base64 32
```

### 3. Jalankan PostgreSQL via Docker

```bash
docker-compose up -d
```

Verifikasi container berjalan:
```bash
docker ps
```

### 4. Jalankan Prisma migration

```bash
npm run db:migrate
```

Atau jika hanya ingin push schema tanpa migration history:
```bash
npm run db:push
```

### 5. Seed data awal

```bash
npm run db:seed
```

Membuat 4 user default:

| Username | Role | Password |
|---|---|---|
| `finance01` | FINANCE | `Finance@123` |
| `headcashier01` | HEAD_CASHIER | `HeadCashier@123` |
| `cashier01` | CASHIER | `Cashier@123` |
| `cashier02` | CASHIER | `Cashier@123` |

### 6. Jalankan dev server

```bash
npm run dev
```

Aplikasi berjalan di `http://localhost:3000`

---

## Status Flow Shift

```
OPEN → PENDING → PENDING_FINANCE → CLOSED
```

| Status | Keterangan |
|---|---|
| `OPEN` | Kasir buka shift, sedang input data ESB & Fisik |
| `PENDING` | Kasir submit, menunggu review Head Kasir |
| `PENDING_FINANCE` | Head Kasir approve, menunggu verifikasi Finance |
| `CLOSED` | Finance close — laporan final, tidak bisa diubah |

---

## Aturan Bisnis Kritis

1. **Satu shift aktif per user** — tidak bisa buka shift baru jika masih ada yang OPEN/PENDING
2. **Shift 2 hanya bisa dibuka setelah Shift 1 CLOSED** di hari yang sama
3. **Kasir Shift 1 tidak bisa membuka Shift 2** di hari yang sama
4. **Selisih minus > Rp 50.000** → wajib isi keterangan selisih sebelum submit
5. **Shift CLOSED immutable** — dijaga di level API, bukan hanya UI
6. **Semua kalkulasi server-side** — client tidak menghitung sendiri
7. **Decimal(15,2)** — tidak ada penggunaan FLOAT untuk nominal uang
8. **ACID transaction** — operasi multi-tabel menggunakan Prisma `$transaction()`

---

## API Endpoints

### Auth
| Method | Endpoint | Keterangan |
|---|---|---|
| POST | `/api/auth/signin` | Login via NextAuth |
| POST | `/api/auth/signout` | Logout |

### Dashboard
| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/dashboard` | Data dashboard sesuai role |

### Shifts
| Method | Endpoint | Role | Keterangan |
|---|---|---|---|
| GET | `/api/shifts` | All | List shift (filter: `status`, `date`, `from`, `to`, `page`) |
| POST | `/api/shifts` | Cashier, HCashier | Buka shift baru |
| GET | `/api/shifts/:id` | All | Detail shift + rekonsiliasi |
| PUT | `/api/shifts/:id/transactions` | Cashier, HCashier | Input/update data ESB & Fisik |
| PUT | `/api/shifts/:id/special-logs` | Cashier, HCashier | Input/update special logs |
| GET | `/api/shifts/:id/special-logs` | All | Lihat special logs |
| PATCH | `/api/shifts/:id/variance-note` | Cashier, HCashier | Simpan keterangan selisih |
| POST | `/api/shifts/:id/action` | Role-based | Submit / Approve / Reject / Close |
| GET | `/api/shifts/:id/pdf` | Finance | Generate laporan PDF |

### Users (Finance only)
| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/users` | List semua user |
| POST | `/api/users` | Buat user baru |
| PATCH | `/api/users/:id` | Update nama, status aktif, atau reset password |
| DELETE | `/api/users/:id` | Hapus user (hanya jika belum punya riwayat shift) |

---

## Contoh Request Body

### POST `/api/shifts/:id/action`

```json
{ "action": "SUBMIT" }

{ "action": "APPROVE", "catatan": "Data sudah sesuai" }

{ "action": "REJECT", "catatan": "Ada selisih yang belum dijelaskan" }

{ "action": "CLOSE", "catatan": "Laporan diverifikasi" }
```

### PUT `/api/shifts/:id/transactions`

```json
{
  "lines": [
    { "sumber": "ESB", "kategori": "CASH", "nilai": 5000000 },
    { "sumber": "ESB", "kategori": "QRIS", "nilai": 1200000 },
    { "sumber": "ESB", "kategori": "EDC_DEBIT", "nilai": 800000, "catatan": "2 mesin" }
  ]
}
```

Kirim PUT terpisah untuk `sumber: "FISIK"`.

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
      "tipe": "DEPOSIT",
      "nama_member": "Budi Santoso",
      "nominal": 500000,
      "metode": "TRANSFER",
      "nomor_referensi": "TF20241101"
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
npm run dev           # Jalankan dev server
npm run build         # Build production
npm run start         # Jalankan production build

# Code quality
npm run lint          # ESLint
npm run typecheck     # TypeScript check
npm run check         # Lint + typecheck sekaligus

# Database
npm run db:migrate    # Jalankan migration baru
npm run db:push       # Push schema tanpa migration history
npm run db:seed       # Seed data awal
npm run db:studio     # Buka Prisma Studio (GUI database)
npm run db:reset      # Reset database + re-seed (hati-hati: hapus semua data)
```

---

## Struktur Project

```
src/
├── app/
│   ├── (auth)/login/         # Halaman login
│   ├── (dashboard)/          # Semua halaman setelah login
│   │   ├── dashboard/        # Dashboard per role
│   │   ├── shifts/           # Daftar, buka, dan detail shift
│   │   ├── review/           # Review shift (Head Kasir)
│   │   ├── finance/          # Finance overview
│   │   └── users/            # Manajemen user (Finance)
│   └── api/                  # REST API route handlers
├── components/
│   ├── ui/                   # Komponen UI dasar (Button, Input, dll)
│   ├── layout/               # Sidebar, layout wrapper
│   └── shifts/               # Komponen spesifik fitur shift
├── lib/
│   ├── auth.ts               # Konfigurasi NextAuth
│   ├── calculations.ts       # Logika rekonsiliasi (pure functions)
│   ├── constants.ts          # Konstanta shared
│   ├── env.ts                # Validasi environment variable
│   ├── prisma.ts             # Prisma client singleton
│   └── rate-limit.ts         # Brute-force protection login
├── types/                    # TypeScript type definitions
└── utils/                    # Format Rupiah, label constants
```