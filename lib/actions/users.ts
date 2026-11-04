"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { createCredentialUser, setCredentialPassword } from "@/lib/auth-users";
import { z } from "zod";

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().max(128).optional().nullable(),
  password: z.string().min(8).optional().nullable(),
  role: z.nativeEnum(UserRole),
});

export async function listUsers() {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return prisma.user.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      bannedAt: true,
      deletedAt: true,
      createdAt: true,
    },
  });
}

export async function upsertUser(input: unknown, id?: string) {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  const orgId = session.user.organizationId;
  const data = userSchema.parse(input);

  const payload = {
    email: data.email.toLowerCase(),
    name: data.name?.trim() || data.email.split("@")[0] || "Pharmacy user",
    role: data.role,
  };

  if (id) {
    const existing = await prisma.user.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) throw new Error("User not found");
    const updated = await prisma.user.update({
      where: { id },
      data: payload,
    });
    if (data.password) await setCredentialPassword(prisma, id, data.password);
    await writeAuditLog({
      organizationId: orgId,
      userId: session.user.id,
      action: "user.update",
      entityType: "User",
      entityId: id,
    });
    revalidatePath("/admin/users");
    return updated;
  }

  if (!data.password) throw new Error("Password required for new user");
  const password = data.password;
  const created = await prisma.$transaction((tx) =>
    createCredentialUser(tx, {
      ...payload,
      password,
      organizationId: orgId,
    }),
  );
  await writeAuditLog({
    organizationId: orgId,
    userId: session.user.id,
    action: "user.create",
    entityType: "User",
    entityId: created.id,
  });
  revalidatePath("/admin/users");
  return created;
}

export async function setUserBanned(userId: string, banned: boolean) {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  const orgId = session.user.organizationId;
  if (userId === session.user.id) throw new Error("Cannot ban yourself");
  await prisma.user.update({
    where: { id: userId, organizationId: orgId },
    data: { bannedAt: banned ? new Date() : null },
  });
  await writeAuditLog({
    organizationId: orgId,
    userId: session.user.id,
    action: banned ? "user.ban" : "user.unban",
    entityType: "User",
    entityId: userId,
  });
  revalidatePath("/admin/users");
}

export async function deleteUser(userId: string) {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  const orgId = session.user.organizationId;
  if (userId === session.user.id) throw new Error("Cannot delete yourself");
  await prisma.user.update({
    where: { id: userId, organizationId: orgId },
    data: { deletedAt: new Date() },
  });
  await writeAuditLog({
    organizationId: orgId,
    userId: session.user.id,
    action: "user.soft_delete",
    entityType: "User",
    entityId: userId,
  });
  revalidatePath("/admin/users");
}
