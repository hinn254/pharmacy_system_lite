import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@prisma/client";

export default {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  providers: [],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.organizationId = token.organizationId as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
