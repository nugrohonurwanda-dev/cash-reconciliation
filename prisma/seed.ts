// prisma/seed.ts
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  const COST_FACTOR = 12

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

    console.log(`✅ Created user: ${user.username} (${user.role}) — password: ${user.password}`)
  }

  console.log('✅ Seeding complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
