import { Prisma, SubscriptionInterval, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addBillingInterval, addDays, BILLING_PLANS, GRACE_DAYS, TRIAL_DAYS } from "./plans";
import { paystackRequest } from "./paystack";

export async function ensureSubscription(organizationId: string) {
  const existing = await prisma.organizationSubscription.findUnique({ where: { organizationId } });
  if (existing) return refreshSubscriptionState(existing.id);
  const now = new Date();
  return prisma.organizationSubscription.create({
    data: { organizationId, trialStartedAt: now, trialEndsAt: addDays(now, TRIAL_DAYS) },
  });
}

export async function refreshSubscriptionState(id: string) {
  const subscription = await prisma.organizationSubscription.findUniqueOrThrow({ where: { id } });
  const now = new Date();
  let status: SubscriptionStatus = subscription.status;
  if (subscription.cancelledAt && (!subscription.periodEndAt || subscription.periodEndAt <= now)) status = "CANCELLED";
  else if (subscription.periodEndAt && subscription.periodEndAt > now) status = "ACTIVE";
  else {
    const paidOrTrialEnd = subscription.periodEndAt ?? subscription.trialEndsAt;
    const graceEnd = subscription.graceEndsAt ?? addDays(paidOrTrialEnd, GRACE_DAYS);
    if (paidOrTrialEnd > now) status = subscription.periodEndAt ? "ACTIVE" : "TRIALING";
    else if (graceEnd > now) status = subscription.status === "PAST_DUE" ? "PAST_DUE" : "GRACE";
    else status = "EXPIRED";
    if (!subscription.graceEndsAt) {
      return prisma.organizationSubscription.update({ where: { id }, data: { status, graceEndsAt: graceEnd } });
    }
  }
  if (status !== subscription.status) return prisma.organizationSubscription.update({ where: { id }, data: { status } });
  return subscription;
}

export async function ensurePaystackPlan(interval: SubscriptionInterval) {
  const config = BILLING_PLANS[interval];
  const existing = await prisma.billingPlan.findUnique({ where: { interval } });
  if (existing && existing.amountMinor === config.amountMinor) return existing.paystackCode;
  const data = await paystackRequest<{ plan_code: string }>("/plan", {
    method: "POST",
    body: JSON.stringify({ name: `Pharmacy OS ${config.label}`, interval: config.interval, amount: config.amountMinor, currency: "KES" }),
  });
  const plan = await prisma.billingPlan.upsert({
    where: { interval },
    create: { interval, amountMinor: config.amountMinor, paystackCode: data.plan_code },
    update: { amountMinor: config.amountMinor, paystackCode: data.plan_code },
  });
  return plan.paystackCode;
}

type Charge = {
  reference: string; id?: number; amount: number; currency?: string; status: string; paid_at?: string;
  channel?: string; metadata?: Record<string, unknown> | string | null;
  customer?: { customer_code?: string; email?: string };
  plan?: { plan_code?: string; interval?: string } | string | null;
};

function parseMetadata(value: Charge["metadata"]) {
  if (!value) return {} as Record<string, unknown>;
  if (typeof value === "string") { try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; } }
  return value;
}

export async function applySuccessfulCharge(charge: Charge) {
  if (charge.status !== "success") throw new Error("Transaction is not successful");
  const metadata = parseMetadata(charge.metadata);
  let payment = await prisma.billingPayment.findUnique({ where: { reference: charge.reference } });
  const organizationId = payment?.organizationId ?? (typeof metadata.organizationId === "string" ? metadata.organizationId : null);
  let subscription = organizationId
    ? await ensureSubscription(organizationId)
    : charge.customer?.customer_code
      ? await prisma.organizationSubscription.findFirst({ where: { customerCode: charge.customer.customer_code } })
      : null;
  if (!subscription) throw new Error("Could not match payment to an organization");
  const previousStatus = subscription.status;
  const interval = payment?.interval ?? (metadata.interval === "ANNUAL" ? "ANNUAL" : "MONTHLY");
  const alreadyApplied = payment?.status === "SUCCESS";
  const paidAt = charge.paid_at ? new Date(charge.paid_at) : new Date();
  const planCode = typeof charge.plan === "object" && charge.plan ? charge.plan.plan_code : typeof charge.plan === "string" ? charge.plan : undefined;
  return prisma.$transaction(async (tx) => {
    payment = await tx.billingPayment.upsert({
      where: { reference: charge.reference },
      create: { organizationId: subscription!.organizationId, subscriptionId: subscription!.id, reference: charge.reference, interval, status: "SUCCESS", amountMinor: charge.amount, currency: charge.currency ?? "KES", channel: charge.channel, transactionId: charge.id?.toString(), paidAt, metadata: metadata as Prisma.InputJsonValue },
      update: { subscriptionId: subscription!.id, status: "SUCCESS", amountMinor: charge.amount, channel: charge.channel, transactionId: charge.id?.toString(), paidAt },
    });
    if (!alreadyApplied) {
      const start = subscription!.periodEndAt && subscription!.periodEndAt > paidAt ? subscription!.periodEndAt : paidAt;
      subscription = await tx.organizationSubscription.update({
        where: { id: subscription!.id },
        data: { status: "ACTIVE", interval, amountMinor: charge.amount, periodStartAt: paidAt, periodEndAt: addBillingInterval(start, interval), graceEndsAt: null, lastPaymentAt: paidAt, customerCode: charge.customer?.customer_code, planCode, cancelAtEnd: false, cancelledAt: null },
      });
    }
    return { payment, subscription, previousStatus };
  });
}

// Paystack uses different nested payload shapes for each subscription event.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function recordSubscriptionEvent(data: Record<string, any>) {
  const code = data.subscription_code as string | undefined;
  const customerCode = data.customer?.customer_code as string | undefined;
  const organizationId = data.metadata?.organizationId as string | undefined;
  const subscription = organizationId
    ? await ensureSubscription(organizationId)
    : await prisma.organizationSubscription.findFirst({ where: { OR: [{ subscriptionCode: code }, { customerCode }] } });
  if (!subscription) return;
  await prisma.organizationSubscription.update({ where: { id: subscription.id }, data: { subscriptionCode: code, emailToken: data.email_token, customerCode, planCode: data.plan?.plan_code, cancelAtEnd: false } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function markPaymentFailed(data: Record<string, any>) {
  const code = data.subscription?.subscription_code ?? data.subscription_code;
  const customerCode = data.customer?.customer_code;
  const subscription = await prisma.organizationSubscription.findFirst({ where: { OR: [{ subscriptionCode: code }, { customerCode }] } });
  if (!subscription) return;
  const base = subscription.periodEndAt ?? new Date();
  return prisma.organizationSubscription.update({ where: { id: subscription.id }, data: { status: "PAST_DUE", graceEndsAt: addDays(base, GRACE_DAYS) } });
}
