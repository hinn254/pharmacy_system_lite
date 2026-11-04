import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { eventDedupeKey, verifyPaystackSignature } from "@/lib/billing/paystack";
import { applySuccessfulCharge, markPaymentFailed, recordSubscriptionEvent } from "@/lib/billing/service";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyPaystackSignature(rawBody, request.headers.get("x-paystack-signature"))) return new Response("Invalid signature", { status: 401 });
  // Paystack event bodies vary by event type and are validated again by the handlers.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload = JSON.parse(rawBody) as { event: string; data: Record<string, any> };
  const dedupeKey = eventDedupeKey(rawBody);
  const existing = await prisma.paystackWebhookEvent.findUnique({ where: { dedupeKey } });
  if (existing?.processedAt) return Response.json({ received: true });
  await prisma.paystackWebhookEvent.upsert({ where: { dedupeKey }, create: { dedupeKey, eventType: payload.event, payload: payload as Prisma.InputJsonValue }, update: {} });
  try {
    if (payload.event === "charge.success") await applySuccessfulCharge(payload.data as never);
    else if (payload.event === "subscription.create") await recordSubscriptionEvent(payload.data);
    else if (payload.event === "invoice.payment_failed") await markPaymentFailed(payload.data);
    else if (payload.event === "subscription.not_renew" || payload.event === "subscription.disable") {
      const code = payload.data.subscription_code as string | undefined;
      if (code) await prisma.organizationSubscription.updateMany({ where: { subscriptionCode: code }, data: { cancelAtEnd: true, cancelledAt: payload.event === "subscription.disable" ? new Date() : undefined } });
    }
    await prisma.paystackWebhookEvent.update({ where: { dedupeKey }, data: { processedAt: new Date() } });
    return Response.json({ received: true });
  } catch (error) {
    await prisma.paystackWebhookEvent.update({ where: { dedupeKey }, data: { error: error instanceof Error ? error.message : "Processing failed" } });
    console.error("[paystack-webhook]", error);
    return new Response("Webhook processing failed", { status: 500 });
  }
}
