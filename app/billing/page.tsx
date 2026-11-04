import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, CreditCard, Smartphone, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { ensureSubscription } from "@/lib/billing/service";
import { BILLING_PLANS, formatKes } from "@/lib/billing/plans";
import { prisma } from "@/lib/prisma";
import { BillingCheckoutButton, CancelSubscriptionButton } from "@/components/billing-checkout-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/billing");
  const [subscription, payments, query] = await Promise.all([
    ensureSubscription(session.user.organizationId),
    prisma.billingPayment.findMany({ where: { organizationId: session.user.organizationId }, orderBy: { createdAt: "desc" }, take: 8 }),
    searchParams,
  ]);
  const renewalDate = subscription.periodEndAt ?? subscription.trialEndsAt;
  return <main className="min-h-screen bg-linear-to-b from-emerald-50/70 to-background px-4 py-8 md:px-8">
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><Link href="/dashboard" className="text-sm font-medium text-emerald-700">← Back to workspace</Link><h1 className="mt-3 text-3xl font-bold tracking-tight">Simple pricing. Your whole pharmacy.</h1><p className="mt-2 text-muted-foreground">Sales, stock, insurance, eTIMS, your client website and AI assistance in one subscription.</p></div>
        <div className="rounded-xl border bg-white px-4 py-3 text-right shadow-sm"><Badge variant="secondary">{subscription.status.replace("_", " ")}</Badge><p className="mt-1 text-xs text-muted-foreground">Access through {renewalDate.toLocaleDateString("en-KE", { dateStyle: "medium" })}</p></div>
      </div>
      {query.payment === "success" && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">Payment confirmed. Your access is active.</div>}
      {query.payment === "failed" && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-900">We could not confirm that payment. No charge has been applied to your account.</div>}
      <div className="grid gap-5 lg:grid-cols-2">
        {(["ANNUAL", "MONTHLY"] as const).map((interval) => { const plan = BILLING_PLANS[interval]; const annual = interval === "ANNUAL"; return <Card key={interval} className={annual ? "relative border-emerald-300 shadow-lg" : ""}>
          {annual && <Badge className="absolute right-4 top-4 gap-1"><Sparkles className="size-3" /> Best value</Badge>}
          <CardHeader><CardTitle>{plan.label}</CardTitle><CardDescription>{annual ? "Two months free compared with monthly billing." : "Flexible access, renewed one month at a time."}</CardDescription></CardHeader>
          <CardContent className="space-y-5"><div><span className="text-4xl font-bold">{formatKes(plan.amountMinor)}</span><span className="text-muted-foreground"> / {annual ? "year" : "month"}</span></div>
            <ul className="space-y-2 text-sm">{["Unlimited staff accounts", "POS, stock and expiry intelligence", "Insurance and eTIMS workflows", "Client-facing website and AI assistance"].map((item) => <li key={item} className="flex gap-2"><Check className="size-4 text-emerald-600" />{item}</li>)}</ul>
            {session.user.role === "ADMIN" ? <div className="grid gap-2 sm:grid-cols-2"><BillingCheckoutButton interval={interval} method="CARD"><CreditCard /> Card · auto-renew</BillingCheckoutButton><BillingCheckoutButton interval={interval} method="MPESA" variant="outline"><Smartphone /> M-Pesa · pay now</BillingCheckoutButton></div> : <p className="rounded-lg bg-muted p-3 text-sm">Ask an administrator to manage this subscription.</p>}
          </CardContent></Card>; })}
      </div>
      <p className="text-center text-sm text-muted-foreground">Card payments renew automatically. Paystack does not support recurring M-Pesa, so we’ll remind you before each M-Pesa renewal. Failed renewals receive a 7-day grace period.</p>
      {session.user.role === "ADMIN" && subscription.subscriptionCode && !subscription.cancelAtEnd && <div className="text-center"><CancelSubscriptionButton /></div>}
      {subscription.cancelAtEnd && <p className="text-center text-sm font-medium text-amber-700">Automatic renewal is off. Access remains available until the current paid period ends.</p>}
      <Card><CardHeader><CardTitle className="text-lg">Payment history</CardTitle></CardHeader><CardContent>{payments.length ? <div className="divide-y">{payments.map((p) => <div key={p.id} className="flex items-center justify-between gap-4 py-3 text-sm"><div><p className="font-medium">{p.interval === "ANNUAL" ? "Annual" : "Monthly"} subscription</p><p className="text-xs text-muted-foreground">{p.reference}</p></div><div className="text-right"><p className="font-medium">{formatKes(p.amountMinor)}</p><p className="text-xs capitalize text-muted-foreground">{p.status.toLowerCase()} · {p.createdAt.toLocaleDateString("en-KE")}</p></div></div>)}</div> : <p className="text-sm text-muted-foreground">No payments yet. Your 30-day trial starts when your account is created.</p>}</CardContent></Card>
      <div className="text-center"><Button asChild variant="ghost"><Link href="/dashboard">Return to dashboard</Link></Button></div>
    </div>
  </main>;
}
