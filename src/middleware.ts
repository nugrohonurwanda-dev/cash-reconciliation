// src/middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'

/**
 * RBAC route guard
 *
 * Akses per role:
 *   CASHIER      → /dashboard, /shifts (lihat & input shift sendiri)
 *   HEAD_CASHIER → /dashboard, /review (review & approve shift)
 *   FINANCE      → /dashboard, /finance, /users
 *
 * HEAD_CASHIER tidak punya akses /shifts — mereka tidak buka shift.
 * FINANCE tidak punya akses /shifts — mereka hanya lihat di /finance.
 */

const ROUTE_ROLES: Record<string, Role[]> = {
  '/dashboard': [Role.CASHIER, Role.HEAD_CASHIER, Role.FINANCE],
  '/shifts':    [Role.CASHIER],
  '/review':    [Role.HEAD_CASHIER],
  '/finance':   [Role.FINANCE],
  '/users':     [Role.FINANCE],
  '/settings':  [Role.CASHIER, Role.HEAD_CASHIER, Role.FINANCE],
}

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const role = req.nextauth.token?.role as Role | undefined

    const matchedRoute = Object.keys(ROUTE_ROLES).find((route) =>
      pathname.startsWith(route),
    )

    if (matchedRoute) {
      const allowedRoles = ROUTE_ROLES[matchedRoute]
      if (!role || !allowedRoles.includes(role)) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
)

export const config = {
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico).*) '],
}
