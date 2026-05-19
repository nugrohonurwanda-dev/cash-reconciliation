// prisma/seed.ts
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  const COST_FACTOR = 12

  // Formasi: 1 Finance, 2 Head Cashier, 5 Cashier (total 8 user)
  const users = [
    {
      username: 'finance01',
      full_name: 'Dewi Rahmawati',
      role: Role.FINANCE,
      password: 'Finance@123',
    },
    {
      username: 'headcashier01',
      full_name: 'Budi Santoso',
      role: Role.HEAD_CASHIER,
      password: 'HeadCashier@123',
    },
    {
      username: 'headcashier02',
      full_name: 'Ratna Sari',
      role: Role.HEAD_CASHIER,
      password: 'HeadCashier@123',
    },
    {
      username: 'cashier01',
      full_name: 'Andi Pratama',
      role: Role.CASHIER,
      password: 'Cashier@123',
    },
    {
      username: 'cashier02',
      full_name: 'Siti Nurhaliza',
      role: Role.CASHIER,
      password: 'Cashier@123',
    },
    {
      username: 'cashier03',
      full_name: 'Reza Firmansyah',
      role: Role.CASHIER,
      password: 'Cashier@123',
    },
    {
      username: 'cashier04',
      full_name: 'Maya Kusuma',
      role: Role.CASHIER,
      password: 'Cashier@123',
    },
    {
      username: 'cashier05',
      full_name: 'Fajar Nugroho',
      role: Role.CASHIER,
      password: 'Cashier@123',
    },
  ]

  for (const user of users) {
    const password_hash = await bcrypt.hash(user.password, COST_FACTOR)
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: {
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        password_hash,
        is_active: true,
      },
    })
    console.log(`✅ ${user.username} (${user.role}) — ${user.password}`)
  }

  console.log('\n✅ Seeding complete.')
  console.log('\nLogin credentials:')
  console.log('  Finance    : finance01       / Finance@123')
  console.log('  Head Kasir : headcashier01   / HeadCashier@123')
  console.log('  Head Kasir : headcashier02   / HeadCashier@123')
  console.log('  Kasir 1-5  : cashier01-05    / Cashier@123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
