"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createSaleFromConsultation, quoteConsultationCheckout } from "@/lib/actions/consultations";
import { PaymentMethod } from "@prisma/client";

function formatKes(n: number) {
  return `KES ${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}

export function CashierCheckout({
  caseId,
  insuranceSchemes,
}: {
  caseId: string;
  insuranceSchemes: { id: string; name: string; isActive: boolean }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [quoting, setQuoting] = useState(false);

  const [applyTax, setApplyTax] = useState(true);
  const [discountCodes, setDiscountCodes] = useState("");
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [insuranceSchemeId, setInsuranceSchemeId] = useState("");
  const [insuranceMemberRef, setInsuranceMemberRef] = useState("");
  const [insurancePolicyRef, setInsurancePolicyRef] = useState("");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [mpesaManualRef, setMpesaManualRef] = useState("");
  const [mpesaBusinessNumber, setMpesaBusinessNumber] = useState("");
  const [mpesaManualType, setMpesaManualType] = useState<"PAYBILL" | "TILL">("PAYBILL");

  const [quote, setQuote] = useState<null | Awaited<ReturnType<typeof quoteConsultationCheckout>>>(null);

  useEffect(() => {
    let cancelled = false;
    setQuoting(true);
    void (async () => {
      try {
        const q = await quoteConsultationCheckout({
          caseId,
          paymentMethod: method,
          applyTax,
        });
        if (!cancelled) setQuote(q);
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Failed to quote");
          setQuote(null);
        }
      } finally {
        if (!cancelled) setQuoting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId, method, applyTax]);

  const total = quote?.total ?? 0;

  const discountCodesArray = useMemo(() => {
    return discountCodes
      .split(/[,\n]/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [discountCodes]);

  const canCheckout = useMemo(() => {
    if (!quote) return false;
    if (method === PaymentMethod.INSURANCE) return Boolean(insuranceSchemeId.trim());
    return true;
  }, [quote, method, insuranceSchemeId]);

  return (
    <div className="rounded-xl border bg-card/50 p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Checkout (Cashier)</div>
          <div className="text-xs text-muted-foreground">
            Creates a POS sale and opens the receipt.
          </div>
        </div>
        <Button
          disabled={!canCheckout || pending || quoting}
          onClick={() => {
            if (!quote) return;
            startTransition(() => {
              void (async () => {
                try {
                  const sale = await createSaleFromConsultation({
                    caseId,
                    applyTax,
                    discountCodes: discountCodesArray,
                    prescriberName: null,
                    rxNumber: null,
                    payments: [
                      {
                        method,
                        amount: total,
                        mpesaPhone: mpesaPhone || null,
                        mpesaManualType: method === PaymentMethod.MPESA_MANUAL ? mpesaManualType : null,
                        mpesaManualRef: method === PaymentMethod.MPESA_MANUAL ? mpesaManualRef || null : null,
                        mpesaBusinessNumber: method === PaymentMethod.MPESA_MANUAL ? mpesaBusinessNumber || null : null,
                        insuranceMemberRef: method === PaymentMethod.INSURANCE ? insuranceMemberRef || null : null,
                        insurancePolicyRef: method === PaymentMethod.INSURANCE ? insurancePolicyRef || null : null,
                        insuranceSchemeId: method === PaymentMethod.INSURANCE ? insuranceSchemeId || null : null,
                      },
                    ],
                  });
                  toast.success("Sale created");
                  router.push(`/pos/receipt/${sale.id}`);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Checkout failed");
                }
              })();
            });
          }}
        >
          {pending ? "Processing…" : "Create sale & open receipt"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Payment method</Label>
          <Select
            value={method}
            onValueChange={(v) => setMethod(v as PaymentMethod)}
            disabled={pending}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PaymentMethod.CASH}>Cash</SelectItem>
              <SelectItem value={PaymentMethod.MPESA_STK}>M-Pesa (STK)</SelectItem>
              <SelectItem value={PaymentMethod.MPESA_MANUAL}>M-Pesa (manual)</SelectItem>
              <SelectItem value={PaymentMethod.INSURANCE}>Insurance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>VAT</Label>
          <div className="flex items-center gap-2 rounded-md border bg-muted/10 px-3 py-2">
            <Checkbox checked={applyTax} onCheckedChange={(v) => setApplyTax(v === true)} />
            <span className="text-sm">Apply VAT to medicines</span>
          </div>
        </div>
      </div>

      {method === PaymentMethod.INSURANCE ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Insurance scheme</Label>
            <Select value={insuranceSchemeId} onValueChange={setInsuranceSchemeId} disabled={pending}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select scheme" />
              </SelectTrigger>
              <SelectContent>
                {insuranceSchemes
                  .filter((s) => s.isActive)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Member ref (optional)</Label>
            <Input value={insuranceMemberRef} onChange={(e) => setInsuranceMemberRef(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Policy ref (optional)</Label>
            <Input value={insurancePolicyRef} onChange={(e) => setInsurancePolicyRef(e.target.value)} />
          </div>
        </div>
      ) : null}

      {method === PaymentMethod.MPESA_STK ? (
        <div className="space-y-2">
          <Label>M-Pesa phone (optional)</Label>
          <Input value={mpesaPhone} onChange={(e) => setMpesaPhone(e.target.value)} placeholder="2547XXXXXXXX" />
        </div>
      ) : null}

      {method === PaymentMethod.MPESA_MANUAL ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Manual type</Label>
            <Select
              value={mpesaManualType}
              onValueChange={(v) => setMpesaManualType(v as "PAYBILL" | "TILL")}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PAYBILL">Paybill</SelectItem>
                <SelectItem value="TILL">Till</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reference (optional)</Label>
            <Input value={mpesaManualRef} onChange={(e) => setMpesaManualRef(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Business number (optional)</Label>
            <Input value={mpesaBusinessNumber} onChange={(e) => setMpesaBusinessNumber(e.target.value)} />
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>Discount codes (optional)</Label>
        <Input
          value={discountCodes}
          onChange={(e) => setDiscountCodes(e.target.value)}
          placeholder="e.g. WELCOME10, APRIL"
        />
        <div className="text-xs text-muted-foreground">
          Discounts apply to medicines only.
        </div>
      </div>

      <div className="rounded-lg border bg-muted/10 p-4 text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Consultation fee</span>
          <span className="tabular-nums">{formatKes(quote?.consultationFee ?? 0)}</span>
        </div>
        {quote?.meds?.length ? (
          <div className="pt-2 border-t space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">Medicines</div>
            <div className="space-y-1">
              {quote.meds.map((m) => (
                <div key={m.orderId} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate">{m.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.quantity} × {formatKes(m.unitPrice)}
                    </div>
                  </div>
                  <div className="tabular-nums whitespace-nowrap">{formatKes(m.lineTotal)}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Medicines subtotal</span>
          <span className="tabular-nums">{formatKes(quote?.medsSubtotal ?? 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            VAT{quote ? ` (${quote.taxRatePercent}%)` : ""}
          </span>
          <span className="tabular-nums">{formatKes(quote?.taxAmount ?? 0)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold pt-2 border-t">
          <span>Total</span>
          <span className="tabular-nums">{formatKes(total)}</span>
        </div>
        {quote?.medsCount === 0 ? (
          <div className="text-xs text-muted-foreground">
            No in-pharmacy medicines on this case — checkout will charge consultation fee only.
          </div>
        ) : null}
      </div>
    </div>
  );
}

