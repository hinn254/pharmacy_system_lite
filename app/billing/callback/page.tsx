import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { paystackRequest } from "@/lib/billing/paystack";
import { applySuccessfulCharge } from "@/lib/billing/service";
import { prisma } from "@/lib/prisma";

export default async function BillingCallback({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/billing");
  const { reference } = await searchParams;
  if (!reference) redirect("/billing?payment=missing");
  try {
    const pendingPayment = await prisma.billingPayment.findUnique({ where: { reference }, select: { organizationId: true } });
    if (!pendingPayment || pendingPayment.organizationId !== session.user.organizationId) redirect("/billing?payment=failed");
    // The verify response is normalized and validated by applySuccessfulCharge.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const charge = await paystackRequest<Record<string, any>>(`/transaction/verify/${encodeURIComponent(reference)}`);
    await applySuccessfulCharge(charge as never);
    redirect("/billing?payment=success");
  } catch (error) {
    console.error("[billing-callback]", error);
    redirect("/billing?payment=failed");
  }
}
