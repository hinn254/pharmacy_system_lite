import { prisma } from "@/lib/prisma";

export async function isDemoOrganization(organizationId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { isDemo: true },
  });
  return organization?.isDemo === true;
}

export async function requireLiveOrganization(organizationId: string) {
  if (await isDemoOrganization(organizationId)) {
    throw new Error("This action is disabled in the demo workspace. Create your pharmacy to continue.");
  }
}
