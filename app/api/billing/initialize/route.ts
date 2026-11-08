import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BILLING_PLANS } from "@/lib/billing/plans";
import { ensurePaystackPlan, ensureSubscription } from "@/lib/billing/service";
import { paystackRequest } from "@/lib/billing/paystack";
import { isDemoOrganization } from "@/lib/demo/guard";
import { captureServerEvent } from "@/lib/analytics/server";

const inputSchema = z.object({ interval: z.enum(["MONTHLY", "ANNUAL"]), method: z.enum(["CARD", "MPESA"]) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return Response.json({ error: "Only administrators can manage billing" }, { status: 403 });
  if (await isDemoOrganization(session.user.organizationId)) return Response.json({ error: "Payments are disabled in the demo. Create your pharmacy to subscribe." }, { status: 403 });
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid billing option" }, { status: 400 });
  const { interval, method } = parsed.data;
  const config = BILLING_PLANS[interval];
  const subscription = await ensureSubscription(session.user.organizationId);
  const reference = `pharmacyos-${subscription.organizationId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const origin = new URL(request.url).origin;
  const plan = method === "CARD" ? await ensurePaystackPlan(interval) : undefined;
  await prisma.billingPayment.create({
    data: { organizationId: subscription.organizationId, subscriptionId: subscription.id, reference, interval, amountMinor: config.amountMinor, status: "PENDING" },
  });
  await captureServerEvent(
    { organizationId: subscription.organizationId, userId: session.user.id, userRole: session.user.role },
    "checkout_started",
    {},
  );
  try {
    const result = await paystackRequest<{ authorization_url: string; access_code: string; reference: string }>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: session.user.email,
        amount: config.amountMinor.toString(),
        currency: "KES",
        reference,
        callback_url: `${origin}/billing/callback`,
        channels: method === "CARD" ? ["card"] : ["mobile_money"],
        ...(plan ? { plan } : {}),
        metadata: JSON.stringify({ organizationId: subscription.organizationId, interval, method }),
      }),
    });
    return Response.json({ url: result.authorization_url });
  } catch (error) {
    await prisma.billingPayment.update({ where: { reference }, data: { status: "FAILED", failureReason: error instanceof Error ? error.message : "Checkout initialization failed" } });
    await captureServerEvent(
      { organizationId: subscription.organizationId, userId: session.user.id, userRole: session.user.role },
      "checkout_failed",
      { failure_category: "initialization_failed" },
    );
    return Response.json({ error: error instanceof Error ? error.message : "Could not start checkout" }, { status: 502 });
  }
}
