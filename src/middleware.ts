// src/middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

// Role yang boleh akses per route
const ROUTE_ROLES: Record<string, Role[]> = {
  "/review": [Role.HEAD_CASHIER],
  "/finance": [Role.FINANCE],
  "/users": [Role.FINANCE],
  "/shifts": [Role.CASHIER, Role.HEAD_CASHIER, Role.FINANCE],
  "/dashboard": [Role.CASHIER, Role.HEAD_CASHIER, Role.FINANCE],
};

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role as Role | undefined;

    // Cari route yang cocok (prefix match)
    const matchedRoute = Object.keys(ROUTE_ROLES).find((route) =>
      pathname.startsWith(route),
    );

    if (matchedRoute) {
      const allowedRoles = ROUTE_ROLES[matchedRoute];
      if (!role || !allowedRoles.includes(role)) {
        // Redirect ke dashboard, bukan 403 — lebih UX-friendly
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Hanya jalankan middleware jika user sudah login
      // Kalau belum login, next-auth otomatis redirect ke /login
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  // Jalankan middleware di semua halaman kecuali login, api/auth, dan static files
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
