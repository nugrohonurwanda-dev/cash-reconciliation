// src/lib/auth.ts
import "@/lib/env"; // ← trigger fail-fast env validation saat modul di-load
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import {
  checkLoginAllowed,
  recordFailedLogin,
  recordSuccessfulLogin,
} from "@/lib/rate-limit";
import { headers } from "next/headers";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Username dan password wajib diisi.");
        }

        // ── Rate limit check ──────────────────────────────────────────────
        const headerList = await headers();
        const ip =
          headerList.get("x-forwarded-for")?.split(",")[0].trim() ??
          headerList.get("x-real-ip") ??
          "unknown";

        if (!checkLoginAllowed(ip)) {
          throw new Error(
            "Terlalu banyak percobaan login. Coba lagi dalam 15 menit.",
          );
        }
        // ─────────────────────────────────────────────────────────────────

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });

        if (!user) {
          recordFailedLogin(ip);
          throw new Error("Username atau password salah.");
        }

        if (!user.is_active) {
          recordFailedLogin(ip);
          throw new Error("Akun tidak aktif. Hubungi Finance.");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password_hash,
        );
        if (!isValid) {
          recordFailedLogin(ip);
          throw new Error("Username atau password salah.");
        }

        // Login sukses — reset counter
        recordSuccessfulLogin(ip);

        return {
          id: user.id,
          name: user.full_name,
          username: user.username,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
        token.lastDbCheck = Math.floor(Date.now() / 1000);
      }

      const CHECK_INTERVAL = 60;
      const now = Math.floor(Date.now() / 1000);
      const lastChecked = (token.lastDbCheck as number) ?? 0;

      if (token.id && now - lastChecked >= CHECK_INTERVAL) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { is_active: true, role: true },
        });

        if (!dbUser || !dbUser.is_active) {
          token.id = null;
          token.username = null;
          token.role = null;
          return token;
        }

        token.role = dbUser.role;
        token.lastDbCheck = now;
      }

      return token;
    },
    async session({ session, token }) {
      if (!token.id) {
        return { ...session, user: undefined } as unknown as typeof session;
      }

      session.user.id = token.id;
      session.user.username = token.username!;
      session.user.role = token.role!;
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },

  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
};
