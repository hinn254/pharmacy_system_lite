import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { paystackRequest } from "@/lib/billing/paystack";
import { isDemoOrganization } from "@/lib/demo/guard";

export async function POST() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return Response.json({ error: "Only administrators can manage billing" }, { status: 403 });
  if (await isDemoOrganization(session.user.organizationId)) return Response.json({ error: "Billing changes are disabled in the demo." }, { status: 403 });
  const subscription = await prisma.organizationSubscription.findUnique({ where: { organizationId: session.user.organizationId } });
  if (!subscription?.subscriptionCode || !subscription.emailToken) return Response.json({ error: "There is no recurring card subscription to cancel" }, { status: 400 });
  await paystackRequest<unknown>("/subscription/disable", { method: "POST", body: JSON.stringify({ code: subscription.subscriptionCode, token: subscription.emailToken }) });
  await prisma.organizationSubscription.update({ where: { id: subscription.id }, data: { cancelAtEnd: true } });
  return Response.json({ ok: true });
}
