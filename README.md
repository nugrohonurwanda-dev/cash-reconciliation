# Cash Reconciliation Management System — Backend

## Stack
- **Next.js 15** (App Router) + TypeScript
- **PostgreSQL** via Docker
- **Prisma ORM**
- **NextAuth.js** (JWT, HttpOnly cookie, 8 jam)
- **Zod** (validasi input)
- **bcryptjs** (hash password, cost factor 12)

---

## Quick Start

### 1. Clone & install dependencies

```bash
npm install
```

### 2. Setup environment

```bash
cp .env.example .env
# Edit .env — ganti NEXTAUTH_SECRET dengan string random panjang
```

Generate secret yang aman:
```bash
openssl rand -base64 32
```

### 3. Jalankan PostgreSQL via Docker

```bash
docker-compose up -d
```

Cek container berjalan:
```bash
docker ps
```

### 4. Jalankan Prisma migration

```bash
npm run db:migrate
# Masukkan nama migration, misal: "init"
```

Atau kalau hanya mau push schema tanpa migration history:
```bash
npm run db:push
```

### 5. Seed data awal

```bash
npm run db:seed
```

Akan membuat 4 user default:
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

Server berjalan di `http://localhost:3000`

---

## API Endpoints

### Auth
| Method | Endpoint | Keterangan |
|---|---|---|
| POST | `/api/auth/signin` | Login via NextAuth |
| POST | `/api/auth/signout` | Logout |

### Shifts
| Method | Endpoint | Role | Keterangan |
|---|---|---|---|
| GET | `/api/shifts` | All | List shift (filter: `status`, `date`, `page`) |
| POST | `/api/shifts` | Cashier, HCashier | Buka shift baru |
| GET | `/api/shifts/:id` | All | Detail shift + rekonsiliasi |
| PUT | `/api/shifts/:id/transactions` | Cashier, HCashier | Input/update ESB & Fisik |
| GET | `/api/shifts/:id/transactions` | All | Lihat transaction lines |
| PUT | `/api/shifts/:id/special-logs` | Cashier, HCashier | Input/update special logs |
| GET | `/api/shifts/:id/special-logs` | All | Lihat special logs |
| PATCH | `/api/shifts/:id/variance-note` | Cashier, HCashier | Simpan keterangan selisih |
| POST | `/api/shifts/:id/action` | Role-based | Submit / Approve / Reject / Close |
| GET | `/api/shifts/:id/pdf` | Finance | Generate laporan PDF |

### Dashboard
| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/dashboard` | Data dashboard sesuai role |

### Users (Finance only)
| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/users` | List semua user |
| POST | `/api/users` | Buat user baru |
| PATCH | `/api/users/:id` | Update user / aktif-nonaktifkan |

---

## Action Body: POST `/api/shifts/:id/action`

```json
// Cashier: submit
{ "action": "SUBMIT" }

// Head Cashier: approve
{ "action": "APPROVE", "catatan": "Data sudah sesuai" }

// Head Cashier: reject (catatan WAJIB)
{ "action": "REJECT", "catatan": "Ada selisih yang belum dijelaskan" }

// Finance: close
{ "action": "CLOSE", "catatan": "Laporan diverifikasi" }
```

---

## Input Transaction Lines: PUT `/api/shifts/:id/transactions`

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

---

## Input Special Logs: PUT `/api/shifts/:id/special-logs`

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

## Status Flow

```
OPEN → PENDING → PENDING_FINANCE → CLOSED
```

- `OPEN`: Kasir buka shift, sedang input data
- `PENDING`: Kasir submit, menunggu Head Cashier
- `PENDING_FINANCE`: Head Cashier approve, menunggu Finance
- `CLOSED`: Finance close, laporan final — tidak bisa diubah apapun

---

## Aturan Bisnis Kritis

1. **Satu shift aktif per user** — tidak bisa buka shift baru kalau masih ada yang OPEN/PENDING
2. **Shift CLOSED immutable** — dijaga di level API, bukan hanya UI
3. **Selisih minus > Rp 50.000** → wajib isi `variance_note` sebelum submit
4. **Semua kalkulasi server-side** — client tidak boleh menghitung sendiri
5. **Decimal(15,2)** — tidak ada FLOAT untuk nominal
6. **ACID transaction** — operasi multi-tabel pakai Prisma `$transaction()`

---

## Useful Commands

```bash
# Lihat database via Prisma Studio
npm run db:studio

# Reset database (hati-hati — hapus semua data)
npm run db:reset

# Generate Prisma client setelah ubah schema
npx prisma generate
```
