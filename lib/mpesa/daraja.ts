/**
 * Safaricom Daraja STK Push — wire to live API in production.
 * Set SAFARICOM_* and MPESA_* env vars; never expose secrets to the client.
 */
export async function initiateStkPush(params: {
  phoneNumber: string; // 2547XXXXXXXX
  amount: number;
  accountReference: string;
  transactionDesc: string;
}): Promise<
  | { ok: true; checkoutRequestId: string; merchantRequestId: string; customerMessage: string }
  | { ok: false; error: string }
> {
  const key = process.env.SAFARICOM_CONSUMER_KEY;
  const secret = process.env.SAFARICOM_CONSUMER_SECRET;
  if (!key || !secret) {
    return {
      ok: false,
      error:
        "Daraja credentials not configured (SAFARICOM_CONSUMER_KEY / SECRET).",
    };
  }

  // Placeholder: real implementation would OAuth token + POST /mpesa/stkpush/v1/processrequest
  void params;
  return {
    ok: false,
    error:
      "STK Push not fully wired — use manual M-Pesa entry or configure Daraja callback URL and passkey.",
  };
}
