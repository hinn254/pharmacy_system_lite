import { hashPassword } from "better-auth/crypto";
import type { Prisma, PrismaClient, UserRole } from "@prisma/client";

type AuthDatabase = PrismaClient | Prisma.TransactionClient;

export async function createCredentialUser(
  db: AuthDatabase,
  input: {
    email: string;
    password: string;
    name: string;
    phoneNumber?: string | null;
    role: UserRole;
    organizationId: string;
  },
) {
  const password = await hashPassword(input.password);
  const user = await db.user.create({
    data: {
      email: input.email.toLowerCase().trim(),
      name: input.name,
      phoneNumber: input.phoneNumber ?? null,
      role: input.role,
      organizationId: input.organizationId,
    },
  });
  await db.account.create({
    data: {
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password,
    },
  });
  return user;
}

export async function upsertCredentialUser(
  db: AuthDatabase,
  input: {
    email: string;
    password: string;
    name: string;
    phoneNumber?: string | null;
    role: UserRole;
    organizationId: string;
  },
) {
  const email = input.email.toLowerCase().trim();
  const user = await db.user.upsert({
    where: { email },
    update: {
      name: input.name,
      ...(input.phoneNumber !== undefined
        ? { phoneNumber: input.phoneNumber }
        : {}),
      role: input.role,
      organizationId: input.organizationId,
      bannedAt: null,
      deletedAt: null,
    },
    create: {
      email,
      name: input.name,
      phoneNumber: input.phoneNumber ?? null,
      role: input.role,
      organizationId: input.organizationId,
    },
  });
  const password = await hashPassword(input.password);
  await db.account.upsert({
    where: {
      providerId_accountId: { providerId: "credential", accountId: user.id },
    },
    update: { password },
    create: {
      providerId: "credential",
      accountId: user.id,
      userId: user.id,
      password,
    },
  });
  return user;
}

export async function setCredentialPassword(
  db: AuthDatabase,
  userId: string,
  password: string,
) {
  const passwordHash = await hashPassword(password);
  await db.account.updateMany({
    where: { userId, providerId: "credential" },
    data: { password: passwordHash },
  });
}
