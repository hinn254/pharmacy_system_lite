import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export const authInstance = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  user: {
    additionalFields: {
      role: {
        type: ["CASHIER", "PHARM_TECH", "ADMIN", "DOCTOR"],
        required: true,
        input: false,
      },
      organizationId: {
        type: "string",
        required: true,
        input: false,
      },
      phoneNumber: {
        type: "string",
        required: false,
        input: false,
      },
      bannedAt: { type: "date", required: false, input: false },
      deletedAt: { type: "date", required: false, input: false },
    },
  },
});

export type AuthSession = typeof authInstance.$Infer.Session;

export async function auth() {
  const session = await authInstance.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.bannedAt || session.user.deletedAt) return null;
  return session;
}
