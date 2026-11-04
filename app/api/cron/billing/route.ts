import { prisma } from "@/lib/prisma";
import { refreshSubscriptionState } from "@/lib/billing/service";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authorization !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Unauthorized", { status: 401 });
  const subscriptions = await prisma.organizationSubscription.findMany({ select: { id: true } });
  await Promise.all(subscriptions.map(({ id }) => refreshSubscriptionState(id)));
  const abandoned = await prisma.billingPayment.updateMany({
    where: { status: "PENDING", createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    data: { status: "ABANDONED" },
  });
  return Response.json({ refreshed: subscriptions.length, abandoned: abandoned.count });
}
