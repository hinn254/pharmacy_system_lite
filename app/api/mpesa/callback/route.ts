import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Daraja STK callback — parse Body.stkCallback and update MpesaTransaction + Payment.
 * Stub: logs and acknowledges.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid JSON" });
  }

  const checkoutId =
    (body as { Body?: { stkCallback?: { CheckoutRequestID?: string } } })?.Body
      ?.stkCallback?.CheckoutRequestID;

  if (checkoutId) {
    await prisma.mpesaTransaction.updateMany({
      where: { checkoutRequestId: checkoutId },
      data: {
        status: "COMPLETED",
        rawCallback: body as object,
      },
    });
  }

  return NextResponse.json({
    ResultCode: 0,
    ResultDesc: "Accepted",
  });
}
