"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { InsuranceScheme, PaymentMethod } from "@prisma/client";
import { PaymentMethod as PM } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Banknote, Eye, FileText, Shield, Smartphone } from "lucide-react";
import { normalizeKenyaMsisdn } from "@/lib/phone";
import { finalizePosOrderToSale } from "@/lib/actions/pos-orders";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

type OrderRow = Awaited<
  ReturnType<typeof import("@/lib/actions/pos-orders").listQueuedPosOrders>
>[number];

type PaymentMode = "CASH" | "MPESA_STK" | "MPESA_MANUAL" | "INSURANCE";

function methodToMode(method: PaymentMethod): PaymentMode {
  switch (method) {
    case PM.CASH:
      return "CASH";
    case PM.MPESA_STK:
      return "MPESA_STK";
    case PM.MPESA_MANUAL:
      return "MPESA_MANUAL";
    case PM.INSURANCE:
      return "INSURANCE";
  }
}

function modeToMethod(mode: PaymentMode): PaymentMethod {
  switch (mode) {
    case "CASH":
      return PM.CASH;
    case "MPESA_STK":
      return PM.MPESA_STK;
    case "MPESA_MANUAL":
      return PM.MPESA_MANUAL;
    case "INSURANCE":
      return PM.INSURANCE;
  }
}

function formatWaiting(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function paymentModeUsesInsurance(mode: PaymentMode) {
  return mode === "INSURANCE";
}

function estimateCheckoutTotals(order: OrderRow, useInsurancePricing: boolean) {
  const hasDiscountCodes =
    Array.isArray(order.discountCodesSnapshot) && order.discountCodesSnapshot.length > 0;
  let subtotal = 0;
  for (const line of order.lines) {
    const unit = useInsurancePricing
      ? Number(line.drug.priceInsurance)
      : Number(line.drug.priceCash);
    subtotal += unit * line.quantity;
  }
  const taxRatePct = Number(order.taxRateSnapshot);
  const taxRate = Number.isFinite(taxRatePct) ? taxRatePct / 100 : 0;
  const tax = order.vatEnabledSnapshot ? subtotal * taxRate : 0;
  const total = subtotal + tax;
  return { subtotal, tax, total, hasDiscountCodes };
}

function statusRank(status: OrderRow["status"]) {
  switch (status) {
    case "QUEUED":
      return 0;
    case "IN_PROGRESS":
      return 1;
    case "FINALIZED":
      return 2; // show lower in queue
    case "READY_TO_DISPENSE":
      return 3;
    case "DISPENSED":
      return 4;
    case "CANCELLED":
      return 5;
    default:
      return 99;
  }
}

function statusPillClass(status: OrderRow["status"]) {
  switch (status) {
    case "QUEUED":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "IN_PROGRESS":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "FINALIZED":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "READY_TO_DISPENSE":
      return "border-violet-200 bg-violet-50 text-violet-800";
    case "DISPENSED":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "CANCELLED":
      return "border-rose-200 bg-rose-50 text-rose-800";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export function CashierPos({
  initialOrders,
  insuranceSchemes,
  insuranceNotes,
}: {
  initialOrders: OrderRow[];
  insuranceSchemes: InsuranceScheme[];
  insuranceNotes: string | null;
}) {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [selectedId, setSelectedId] = useState<string | null>(initialOrders[0]?.id ?? null);
  const selected = useMemo(
    () => orders.find((o) => o.id === selectedId) ?? null,
    [orders, selectedId],
  );

  const queueOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const ra = statusRank(a.status);
      const rb = statusRank(b.status);
      if (ra !== rb) return ra - rb;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [orders]);

  const [ddaOnly, setDdaOnly] = useState(false);
  const visibleQueueOrders = useMemo(() => {
    if (!ddaOnly) return queueOrders;
    return queueOrders.filter((o) => o.hasDda);
  }, [queueOrders, ddaOnly]);

  const [paymentMode, setPaymentMode] = useState<PaymentMode>(() =>
    selected ? methodToMode(selected.selectedPaymentMethod) : "CASH",
  );
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [mpesaManualType, setMpesaManualType] = useState<"PAYBILL" | "TILL">("PAYBILL");
  const [mpesaManualRef, setMpesaManualRef] = useState("");
  const [mpesaBusinessNumber, setMpesaBusinessNumber] = useState("");
  const [insuranceSchemeId, setInsuranceSchemeId] = useState<string>("");
  const [insuranceMemberRef, setInsuranceMemberRef] = useState("");
  const [insurancePolicyRef, setInsurancePolicyRef] = useState("");

  const [pending, startTransition] = useTransition();

  // Local wait timer for active queue rows only (pause after served / handed off)
  useEffect(() => {
    const t = setInterval(() => {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.status !== "QUEUED" && o.status !== "IN_PROGRESS") return o;
          return { ...o, waitingSeconds: o.waitingSeconds + 1 };
        }),
      );
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // When selection changes, reset payment form to the order’s “suggested” method
  useEffect(() => {
    if (!selected) return;
    setPaymentMode(methodToMode(selected.selectedPaymentMethod));
    setInsuranceSchemeId(selected.selectedInsuranceSchemeId ?? "");
    const snap = selected.paymentQueueSnapshot;
    if (snap && typeof snap === "object" && !Array.isArray(snap)) {
      const s = snap as Record<string, unknown>;
      setMpesaPhone(typeof s.mpesaPhone === "string" ? s.mpesaPhone : "");
      if (s.mpesaManualType === "PAYBILL" || s.mpesaManualType === "TILL") {
        setMpesaManualType(s.mpesaManualType);
      } else {
        setMpesaManualType("PAYBILL");
      }
      setMpesaManualRef(typeof s.mpesaManualRef === "string" ? s.mpesaManualRef : "");
      setMpesaBusinessNumber(
        typeof s.mpesaBusinessNumber === "string" ? s.mpesaBusinessNumber : "",
      );
      setInsuranceMemberRef(
        typeof s.insuranceMemberRef === "string" ? s.insuranceMemberRef : "",
      );
      setInsurancePolicyRef(
        typeof s.insurancePolicyRef === "string" ? s.insurancePolicyRef : "",
      );
    } else {
      setMpesaPhone("");
      setMpesaManualType("PAYBILL");
      setMpesaManualRef("");
      setMpesaBusinessNumber("");
      setInsuranceMemberRef("");
      setInsurancePolicyRef("");
    }
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkoutPreview = useMemo(() => {
    if (!selected) return null;
    return estimateCheckoutTotals(selected, paymentModeUsesInsurance(paymentMode));
  }, [selected, paymentMode]);

  const modeButtons: {
    mode: PaymentMode;
    label: string;
    icon: typeof Banknote;
    desc: string;
  }[] = [
    { mode: "CASH", label: "Cash", icon: Banknote, desc: "Retail price" },
    { mode: "MPESA_STK", label: "M-Pesa prompt", icon: Smartphone, desc: "STK Push" },
    { mode: "MPESA_MANUAL", label: "M-Pesa manual", icon: FileText, desc: "Confirmation code" },
    { mode: "INSURANCE", label: "Insurance", icon: Shield, desc: "Scheme pricing" },
  ];

  function ensureSelected() {
    if (!selected) throw new Error("Select an order first.");
    return selected;
  }

  function canFinalize(o: OrderRow) {
    return o.status === "QUEUED" || o.status === "IN_PROGRESS";
  }

  function onFinalize() {
    const o = ensureSelected();
    startTransition(async () => {
      try {
        if (!canFinalize(o)) {
          toast.error("This order is no longer in the queue. Refresh and try again.");
          return;
        }

        const method = modeToMethod(paymentMode);

        if (method === PM.MPESA_STK) {
          const norm = normalizeKenyaMsisdn(mpesaPhone);
          if (!norm) throw new Error("Enter a valid M-Pesa number (e.g. 07… or 2547…).");
        }
        if (method === PM.MPESA_MANUAL) {
          if (!mpesaManualRef.trim()) {
            throw new Error("Enter the M-Pesa confirmation code from the SMS.");
          }
          if (!mpesaBusinessNumber.trim()) {
            throw new Error("Enter the Paybill or Till number used for this payment.");
          }
        }
        if (method === PM.INSURANCE) {
          if (!insuranceSchemeId) throw new Error("Select an insurance scheme.");
          if (!insuranceMemberRef.trim()) throw new Error("Enter member or beneficiary ID.");
        }

        const sale = await finalizePosOrderToSale({
          posOrderId: o.id,
          payments: [
            {
              method,
              amount: 1,
              mpesaPhone: method === PM.MPESA_STK ? normalizeKenyaMsisdn(mpesaPhone) : null,
              mpesaManualType: method === PM.MPESA_MANUAL ? mpesaManualType : null,
              mpesaManualRef: method === PM.MPESA_MANUAL ? mpesaManualRef.trim() : null,
              mpesaBusinessNumber:
                method === PM.MPESA_MANUAL ? mpesaBusinessNumber.trim() || null : null,
              insuranceMemberRef: method === PM.INSURANCE ? insuranceMemberRef.trim() : null,
              insurancePolicyRef: method === PM.INSURANCE ? insurancePolicyRef.trim() || null : null,
              insuranceSchemeId: method === PM.INSURANCE ? insuranceSchemeId : null,
            },
          ],
        });

        toast.success("Sale recorded, receipt ready, and order sent to PharmTech.");
        router.push(`/pos/receipt/${sale.id}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Finalize failed");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="min-h-0">
        <CardHeader>
          <CardTitle>Queue</CardTitle>
          <CardDescription>First-come, first-served</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setDdaOnly((v) => !v)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors",
                ddaOnly ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:bg-muted/50",
              )}
              title="Show only orders containing controlled (DDA) drugs"
            >
              <Badge variant={ddaOnly ? "destructive" : "outline"} className="h-5 px-1.5 text-[10px]">
                DDA
              </Badge>
              DDA only
            </button>
          </div>

          {visibleQueueOrders.length === 0 ? (
            <p className="text-muted-foreground text-sm">No queued orders.</p>
          ) : (
            <div className="space-y-2">
              {visibleQueueOrders.map((o) => {
                const isSelected = o.id === selectedId;
                const displayTotal =
                  isSelected && checkoutPreview
                    ? checkoutPreview.total
                    : Number(o.totalSnapshot);
                return (
                  <div
                    key={o.id}
                    className={cn(
                      "flex items-stretch gap-1 rounded-lg border p-2 transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:bg-muted/50",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(o.id)}
                      className="min-w-0 flex-1 rounded-md p-1 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold">
                              {o.patient?.fullName ?? "Walk-in"}
                            </div>
                            {o.hasDda ? (
                              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                                DDA
                              </Badge>
                            ) : null}
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                statusPillClass(o.status),
                              )}
                            >
                              {o.status === "IN_PROGRESS"
                                ? "In progress"
                                : o.status === "READY_TO_DISPENSE"
                                  ? "Ready to dispense"
                                  : o.status === "FINALIZED"
                                    ? "Finalized"
                                    : o.status === "QUEUED"
                                      ? "Queued"
                                      : o.status}
                            </span>
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {o.lines.length} items
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold tabular-nums">
                            KES {displayTotal.toFixed(2)}
                          </div>
                          <div className="text-muted-foreground text-xs tabular-nums">
                            Waiting {formatWaiting(o.waitingSeconds)}
                          </div>
                        </div>
                      </div>
                    </button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-9 shrink-0 self-start"
                          title="View prescription lines"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Eye className="size-4" aria-hidden />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 sm:w-96" align="end">
                        <div className="space-y-2">
                          <div className="text-sm font-semibold">Prescription</div>
                          <p className="text-muted-foreground text-xs">
                            Cash vs insurance unit prices (current catalog). Qty × unit = line.
                          </p>
                          <div className="max-h-56 space-y-2 overflow-y-auto text-xs">
                            {o.lines.map((line) => {
                              const cashU = Number(line.drug.priceCash);
                              const insU = Number(line.drug.priceInsurance);
                              return (
                                <div
                                  key={line.id}
                                  className="rounded-md border bg-muted/20 px-2 py-1.5"
                                >
                                  <div className="font-medium">{line.drug.genericName}</div>
                                  <div className="text-muted-foreground mt-0.5 tabular-nums">
                                    Qty {line.quantity}
                                  </div>
                                  <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 tabular-nums">
                                    <span className="text-muted-foreground">Cash</span>
                                    <span>
                                      {cashU.toFixed(2)} × {line.quantity} ={" "}
                                      {(cashU * line.quantity).toFixed(2)}
                                    </span>
                                    <span className="text-muted-foreground">Insurance</span>
                                    <span>
                                      {insU.toFixed(2)} × {line.quantity} ={" "}
                                      {(insU * line.quantity).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => router.refresh()} disabled={pending}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="min-h-0">
        <CardHeader>
          <CardTitle>Payment processing</CardTitle>
          <CardDescription>
            Pick an order, set payment (cash / M-Pesa use retail prices; insurance uses scheme
            prices), then finalize. The receipt opens for printing and the order goes to PharmTech
            automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selected ? (
            <p className="text-muted-foreground text-sm">Select an order from the queue.</p>
          ) : (
            <>
              {checkoutPreview ? (
                <div className="space-y-1 rounded-lg border bg-muted/10 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="tabular-nums">KES {checkoutPreview.subtotal.toFixed(2)}</span>
                  </div>
                  {selected.vatEnabledSnapshot ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">VAT</span>
                      <span className="tabular-nums">KES {checkoutPreview.tax.toFixed(2)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between border-t pt-1 font-semibold">
                    <span>Amount due</span>
                    <span className="tabular-nums">KES {checkoutPreview.total.toFixed(2)}</span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Based on{" "}
                    {paymentModeUsesInsurance(paymentMode)
                      ? "insurance (scheme) prices"
                      : "cash / retail prices"}{" "}
                    for all lines.
                  </div>
                  {checkoutPreview.hasDiscountCodes ? (
                    <p className="text-amber-800 text-xs dark:text-amber-200">
                      This order has discount codes; the final charge may be lower after those are
                      applied at finalize.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>Payment method</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {modeButtons.map(({ mode, label, icon: Icon, desc }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                        paymentMode === mode
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "hover:bg-muted/50 border-border",
                      )}
                    >
                      <Icon className="size-4 opacity-80" />
                      <span className="text-sm font-medium leading-none">{label}</span>
                      <span className="text-muted-foreground text-xs">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {paymentMode === "MPESA_STK" ? (
                <div className="space-y-2">
                  <Label>Customer M-Pesa number</Label>
                  <Input
                    placeholder="07XX XXX XXX or 2547…"
                    className="h-10 text-base"
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </div>
              ) : null}

              {paymentMode === "MPESA_MANUAL" ? (
                <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                  <p className="text-sm font-medium">M-Pesa paid manually</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={mpesaManualType}
                        onValueChange={(v) => setMpesaManualType(v as "PAYBILL" | "TILL")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PAYBILL">Paybill</SelectItem>
                          <SelectItem value="TILL">Till</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Paybill / Till number</Label>
                      <Input
                        placeholder="Business number"
                        value={mpesaBusinessNumber}
                        onChange={(e) => setMpesaBusinessNumber(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Confirmation code (SMS)</Label>
                    <Input
                      className="font-mono"
                      placeholder="e.g. QGH12ABC34"
                      value={mpesaManualRef}
                      onChange={(e) => setMpesaManualRef(e.target.value)}
                    />
                  </div>
                </div>
              ) : null}

              {paymentMode === "INSURANCE" ? (
                <div className="space-y-3">
                  {insuranceNotes ? (
                    <div className="rounded-lg border bg-muted/10 p-3">
                      <div className="text-sm font-medium">Insurance notes</div>
                      <div className="text-muted-foreground mt-1 text-xs whitespace-pre-wrap">
                        {insuranceNotes}
                      </div>
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label>Insurance scheme</Label>
                    <Select
                      value={insuranceSchemeId || undefined}
                      onValueChange={setInsuranceSchemeId}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select scheme…" />
                      </SelectTrigger>
                      <SelectContent>
                        {insuranceSchemes.length === 0 ? (
                          <div className="text-muted-foreground p-2 text-sm">
                            No schemes yet — add them under Admin → Insurance
                          </div>
                        ) : (
                          insuranceSchemes.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} ({s.code})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Member / beneficiary ID</Label>
                    <Input
                      value={insuranceMemberRef}
                      onChange={(e) => setInsuranceMemberRef(e.target.value)}
                      placeholder="Card or policy member number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Authorization / policy reference</Label>
                    <Input
                      value={insurancePolicyRef}
                      onChange={(e) => setInsurancePolicyRef(e.target.value)}
                      placeholder="Optional — pre-auth or claim ref"
                    />
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" className="flex-1" disabled={pending || !selected || !canFinalize(selected)} onClick={onFinalize}>
                  {pending ? "Processing…" : "Finalize & print receipt"}
                </Button>
              </div>
              {selected.prescriptionPhotoUrl ? (
                <a
                  className="text-sm underline"
                  href={selected.prescriptionPhotoUrl}
                  rel="noreferrer"
                >
                  View prescription document
                </a>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
