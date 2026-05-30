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
      full_name: 'Evita',
      role: Role.FINANCE,
      password: 'Finance@123',
    },
    {
      username: 'headkasir01',
      full_name: 'Tari',
      role: Role.HEAD_CASHIER,
      password: '88888888',
    },

    {
      username: 'kasir01',
      full_name: 'Cellyna',
      role: Role.CASHIER,
      password: 'kasir01',
    },
    {
      username: 'kasir02',
      full_name: 'Inggit',
      role: Role.CASHIER,
      password: 'kasir02',
    },
    {
      username: 'kasir03',
      full_name: 'Novi',
      role: Role.CASHIER,
      password: 'kasir03',
    },
    {
      username: 'kasir04',
      full_name: 'Tanti',
      role: Role.CASHIER,
      password: 'kasir04',
    },
    {
      username: 'kasir05',
      full_name: 'Milla',
      role: Role.CASHIER,
      password: 'kasir05',
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
  console.log('  Head Kasir : headkasir01   / 88888888')
  console.log('  Kasir 1-5  : kasir01-05    / kasir01-kasir05')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
