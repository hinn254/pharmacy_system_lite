"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { initiateStkPush } from "@/lib/mpesa/daraja";
import { normalizeKenyaMsisdn } from "@/lib/phone";
import { Prisma } from "@prisma/client";

export async function requestStkForSale(params: {
  saleId: string;
  phoneNumber: string;
  amount: number;
}) {
  const session = await auth();
  if (!session?.user?.organizationId) throw new Error("Unauthorized");

  const sale = await prisma.sale.findFirst({
    where: {
      id: params.saleId,
      organizationId: session.user.organizationId,
    },
  });
  if (!sale) throw new Error("Sale not found");

  const phone = normalizeKenyaMsisdn(params.phoneNumber);
  if (!phone) {
    return { ok: false as const, error: "Invalid phone number. Use 07… or 254…" };
  }

  const result = await initiateStkPush({
    phoneNumber: phone,
    amount: params.amount,
    accountReference: `SALE-${sale.saleNumber}`,
    transactionDesc: "Pharmacy POS",
  });

  if (!result.ok) {
    await prisma.mpesaTransaction.create({
      data: {
        organizationId: session.user.organizationId,
        amount: new Prisma.Decimal(params.amount),
        phoneNumber: phone,
        status: "FAILED",
        resultDesc: result.error,
        initiatedById: session.user.id,
      },
    });
    return result;
  }

  await prisma.mpesaTransaction.create({
    data: {
      organizationId: session.user.organizationId,
      checkoutRequestId: result.checkoutRequestId,
      merchantRequestId: result.merchantRequestId,
      amount: new Prisma.Decimal(params.amount),
      phoneNumber: phone,
      status: "PENDING",
      saleId: sale.id,
      initiatedById: session.user.id,
    },
  });

  return result;
}
