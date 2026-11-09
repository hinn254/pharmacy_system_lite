import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const authSecret = process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET;
const authBaseURL = process.env.BETTER_AUTH_URL;

if (process.env.NODE_ENV === "production" && (!authSecret || authSecret.length < 32)) {
  throw new Error("BETTER_AUTH_SECRET must be set to the same 32+ character value for every production instance.");
}

export const authInstance = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: authSecret,
  baseURL: authBaseURL,
  trustedOrigins: [
    "https://pharmacyos.co.ke",
    "https://www.pharmacyos.co.ke",
    ...(authBaseURL ? [authBaseURL] : []),
  ],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
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
