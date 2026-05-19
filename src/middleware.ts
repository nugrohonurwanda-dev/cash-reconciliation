// src/middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

/**
 * RBAC route guard — hanya untuk page routes (bukan API routes).
 *
 * API routes (/api/*) punya authorization sendiri via requireRole()
 * di masing-masing handler — tidak perlu di-guard di sini.
 *
 * Akses page per role:
 *   CASHIER      → /dashboard, /shifts (shift sendiri)
 *   HEAD_CASHIER → /dashboard, /review, /shifts (baca detail untuk review)
 *   FINANCE      → /dashboard, /finance, /users, /shifts (baca detail untuk finalisasi)
 *
 * Catatan: granularitas "siapa boleh lihat shift milik siapa" dihandle
 * di API route masing-masing (requireRole + query filter), bukan di sini.
 * Middleware hanya guard apakah role boleh mengakses path tersebut sama sekali.
 */

const ROUTE_ROLES: Record<string, Role[]> = {
  "/dashboard": [Role.CASHIER, Role.HEAD_CASHIER, Role.FINANCE],
  "/shifts": [Role.CASHIER, Role.HEAD_CASHIER, Role.FINANCE],
  "/review": [Role.HEAD_CASHIER],
  "/finance": [Role.FINANCE],
  "/users": [Role.FINANCE],
  "/settings": [Role.CASHIER, Role.HEAD_CASHIER, Role.FINANCE],
};

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;

    // API routes dihandle oleh requireRole() di masing-masing handler.
    // Jangan diblock di middleware — biarkan lewat setelah cek token dasar.
    if (pathname.startsWith("/api/")) {
      return NextResponse.next();
    }

    const role = req.nextauth.token?.role as Role | undefined;

    const matchedRoute = Object.keys(ROUTE_ROLES).find((route) =>
      pathname.startsWith(route),
    );

    if (matchedRoute) {
      const allowedRoles = ROUTE_ROLES[matchedRoute];
      if (!role || !allowedRoles.includes(role)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  // Exclude: login, next-auth callbacks, static assets, favicon
  // Include: semua routes lain — termasuk /api/* untuk validasi token dasar
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
