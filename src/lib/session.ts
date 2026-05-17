// src/lib/session.ts
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { NextResponse } from 'next/server'

/**
 * Ambil session dari server. Jika tidak ada session, return 401.
 */
export async function requireSession() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return { session: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { session, error: null }
}

/**
 * Ambil session & pastikan user punya role yang diizinkan.
 */
export async function requireRole(...allowedRoles: Role[]) {
  const { session, error } = await requireSession()
  if (error) return { session: null, error }

  if (!allowedRoles.includes(session!.user.role)) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Forbidden: akses ditolak untuk role ini' }, { status: 403 }),
    }
  }

  return { session, error: null }
}
