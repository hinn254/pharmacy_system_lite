import NextAuth from "next-auth";
import authConfig from "./auth.config";

/** Edge-safe `auth` — no Prisma/bcrypt. Use only in middleware (or import `auth` from `@/auth` in Node). */
export const { auth } = NextAuth(authConfig);
