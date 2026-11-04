"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPosOrderFromCart } from "@/lib/actions/pos-orders";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Trash2, Banknote, Smartphone, FileText, Shield, Pencil } from "lucide-react";
import {
  MpesaManualType,
  PaymentMethod as PM,
  type Drug,
  type InsuranceScheme,
  type PaymentMethod,
} from "@prisma/client";
import { normalizeKenyaMsisdn } from "@/lib/phone";
import type { DrugForPos } from "@/lib/actions/drugs";
import { PosDrugSearch } from "@/components/pos-drug-search";
import { PosPatientSearch } from "@/components/pos-patient-search";
import { cn } from "@/lib/utils";
import { quoteDiscountsForPos } from "@/lib/actions/discounts";
import { listActiveDiscountCodesForPos } from "@/lib/actions/discount-codes";
import {
  isPdfPrescription,
  PRESCRIPTION_FILE_ACCEPT,
  validatePrescriptionFile,
} from "@/lib/uploads/prescription-file";

type CartLine = {
  drugId: string;
  quantity: number;
  /** Total units available across batches when the line was last updated. */
  stockQty: number;
  drug: Pick<
    Drug,
    "genericName" | "internalCode" | "priceCash" | "priceInsurance" | "patientDirections"
  > & { isDda: boolean };
};

type PaymentMode = "CASH" | "MPESA_STK" | "MPESA_MANUAL" | "INSURANCE";

function modeToPrismaMethod(mode: PaymentMode): PaymentMethod {
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

export function PosCart({
  taxRatePercent,
  insuranceNotes,
  insuranceSchemes,
}: {
  taxRatePercent: number;
  insuranceNotes: string | null;
  insuranceSchemes: InsuranceScheme[];
}) {
  const router = useRouter();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");
  const [vatEnabled, setVatEnabled] = useState(true);
  const [discountCodes, setDiscountCodes] = useState<string[]>([]);
  const [discountCodeDraft, setDiscountCodeDraft] = useState("");
  const [discountPickerOpen, setDiscountPickerOpen] = useState(false);
  const [activeDiscounts, setActiveDiscounts] = useState<
    Awaited<ReturnType<typeof listActiveDiscountCodesForPos>>
  >([]);
  const [activeDiscountsLoading, setActiveDiscountsLoading] = useState(false);
  const [discountQuote, setDiscountQuote] = useState<null | Awaited<ReturnType<typeof quoteDiscountsForPos>>>(
    null,
  );
  const [insuranceSchemeId, setInsuranceSchemeId] = useState<string>("");
  const [insuranceMemberRef, setInsuranceMemberRef] = useState("");
  const [insurancePolicyRef, setInsurancePolicyRef] = useState("");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [mpesaManualType, setMpesaManualType] = useState<MpesaManualType>(
    MpesaManualType.PAYBILL,
  );
  const [mpesaManualRef, setMpesaManualRef] = useState("");
  const [mpesaBusinessNumber, setMpesaBusinessNumber] = useState("");
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientLabel, setPatientLabel] = useState<string | null>(null);
  const [directionsByDrugId, setDirectionsByDrugId] = useState<Record<string, string>>(
    {},
  );
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [prescriptionFileName, setPrescriptionFileName] = useState<string | null>(null);
  const [prescriptionPreviewUrl, setPrescriptionPreviewUrl] = useState<string | null>(null);
  const [directionsEditorOpen, setDirectionsEditorOpen] = useState(false);
  const [directionsEditorDrugId, setDirectionsEditorDrugId] = useState<string | null>(
    null,
  );
  const [directionsDraft, setDirectionsDraft] = useState("");
  /** While editing qty, allow empty string in the input; cart line keeps last valid qty until blur/commit. */
  const [qtyDraftByDrugId, setQtyDraftByDrugId] = useState<Record<string, string>>(
    {},
  );
  const [pending, startTransition] = useTransition();

  const useInsurancePrice = paymentMode === "INSURANCE";

  useEffect(() => {
    setActiveDiscountsLoading(true);
    void (async () => {
      try {
        const r = await listActiveDiscountCodesForPos();
        setActiveDiscounts(r);
      } finally {
        setActiveDiscountsLoading(false);
      }
    })();
  }, []);

  function clearQtyDraft(drugId: string) {
    setQtyDraftByDrugId((prev) => {
      if (!(drugId in prev)) return prev;
      const next = { ...prev };
      delete next[drugId];
      return next;
    });
  }

  function stockFromDrug(d: DrugForPos) {
    return d.batches.reduce((s, b) => s + b.quantityOnHand, 0);
  }

  function addDrug(d: DrugForPos) {
    const stockQty = stockFromDrug(d);
    if (stockQty < 1) {
      toast.error("Out of stock");
      return;
    }
    const existing = lines.find((l) => l.drugId === d.id);
    if (existing) {
      if (existing.quantity >= stockQty) {
        toast.error(`Only ${stockQty} available`);
        return;
      }
      setQtyDraftByDrugId((prev) => {
        if (!(d.id in prev)) return prev;
        const next = { ...prev };
        delete next[d.id];
        return next;
      });
      setLines(
        lines.map((l) =>
          l.drugId === d.id
            ? {
                ...l,
                quantity: Math.min(l.quantity + 1, stockQty),
                stockQty,
              }
            : l,
        ),
      );
    } else {
      setLines([
        ...lines,
        {
          drugId: d.id,
          quantity: 1,
          stockQty,
          drug: {
            genericName: d.genericName,
            internalCode: d.internalCode,
            priceCash: d.priceCash,
            priceInsurance: d.priceInsurance,
            patientDirections: d.patientDirections,
            isDda: d.isDda,
          },
        },
      ]);
    }
    toast.success(`Added ${d.genericName}`);
  }

  const hasDda = useMemo(() => lines.some((l) => l.drug.isDda), [lines]);

  const paymentDetailsComplete = useMemo(() => {
    switch (paymentMode) {
      case "CASH":
        return true;
      case "INSURANCE":
        return Boolean(insuranceSchemeId && insuranceMemberRef.trim());
      case "MPESA_STK":
        return Boolean(normalizeKenyaMsisdn(mpesaPhone));
      case "MPESA_MANUAL":
        return Boolean(mpesaManualRef.trim() && mpesaBusinessNumber.trim());
      default:
        return true;
    }
  }, [
    paymentMode,
    insuranceSchemeId,
    insuranceMemberRef,
    mpesaPhone,
    mpesaManualRef,
    mpesaBusinessNumber,
  ]);

  const subtotal = useMemo(() => {
    return lines.reduce((acc, l) => {
      const unit = useInsurancePrice
        ? Number(l.drug.priceInsurance)
        : Number(l.drug.priceCash);
      return acc + unit * l.quantity;
    }, 0);
  }, [lines, useInsurancePrice]);

  const effectiveTaxRatePercent = vatEnabled ? taxRatePercent : 0;
  const tax = subtotal * (effectiveTaxRatePercent / 100);
  const total = subtotal + tax;

  useEffect(() => {
    if (lines.length === 0 || discountCodes.length === 0) {
      setDiscountQuote(null);
      return;
    }
    const resolvedLines = resolveCartLinesFromDrafts();
    setDiscountQuote(null);
    const t = setTimeout(() => {
      void (async () => {
        try {
          const q = await quoteDiscountsForPos({
            patientId,
            taxRatePercent: effectiveTaxRatePercent,
            lines: resolvedLines.map((l) => ({
              drugId: l.drugId,
              quantity: l.quantity,
              useInsurancePrice,
            })),
            codes: discountCodes,
          });
          setDiscountQuote(q);
        } catch {
          setDiscountQuote(null);
        }
      })();
    }, 220);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, discountCodes, patientId, taxRatePercent, useInsurancePrice, vatEnabled]);

  const displaySubtotal = discountQuote?.subtotalBeforeDiscount ?? subtotal;
  const displayDiscounts = discountQuote?.discountAmount ?? 0;
  const displayTax = discountQuote?.taxAmount ?? tax;
  const displayTotal = discountQuote?.total ?? total;

  const showDiscountsSection = discountCodes.length > 0 || activeDiscounts.length > 0;

  function formatDiscountValue(d: (typeof activeDiscounts)[number]) {
    if (d.valueType === "PERCENT") return `${Number(d.valuePercent ?? 0).toFixed(2)}% off`;
    return `KES ${Number(d.valueAmount ?? 0).toFixed(2)} off`;
  }

  function discountMeta(d: (typeof activeDiscounts)[number]) {
    const parts: string[] = [];
    if (d.patientSegment === "NEW_PATIENT") parts.push("New patients");
    else if (d.patientSegment === "RETURNING_PATIENT") parts.push("Returning patients");
    else parts.push("Any patient");
    parts.push(d.scopeType === "ALL_DRUGS" ? "All drugs" : "Selected drugs");
    if (d.sessionTag) parts.push(`Session: ${d.sessionTag}`);
    return parts.join(" · ");
  }

  const filteredActiveDiscounts = useMemo(() => {
    const t = discountCodeDraft.trim().toUpperCase();
    if (!t) return activeDiscounts;
    return activeDiscounts.filter((d) => {
      const hay = `${d.code} ${d.name} ${d.sessionTag ?? ""}`.toUpperCase();
      return hay.includes(t);
    });
  }, [activeDiscounts, discountCodeDraft]);

  function removeLine(drugId: string) {
    clearQtyDraft(drugId);
    setDirectionsByDrugId((prev) => {
      if (!(drugId in prev)) return prev;
      const next = { ...prev };
      delete next[drugId];
      return next;
    });
    setLines(lines.filter((l) => l.drugId !== drugId));
  }

  function setQty(drugId: string, qty: number) {
    if (!Number.isFinite(qty) || qty < 1) return;
    setLines(
      lines.map((l) => {
        if (l.drugId !== drugId) return l;
        const max = l.stockQty;
        const clamped = Math.min(qty, max);
        if (qty > max) {
          toast.error(`Only ${max} available`);
        }
        return { ...l, quantity: Math.max(1, clamped) };
      }),
    );
  }

  /** Merge open qty drafts into line quantities (empty/invalid draft → 1). */
  function resolveCartLinesFromDrafts(): CartLine[] {
    return lines.map((l) => {
      const d = qtyDraftByDrugId[l.drugId];
      if (d === undefined) return l;
      const t = d.trim();
      const n = parseInt(t, 10);
      let q = t === "" || Number.isNaN(n) || n < 1 ? 1 : n;
      q = Math.min(q, l.stockQty);
      return { ...l, quantity: q };
    });
  }

  async function uploadPrescriptionDocument(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/uploads/prescription", {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error || "Prescription upload failed");
    }
    const data = (await res.json()) as { url?: string };
    if (!data.url) throw new Error("Upload did not return a URL");
    return data.url;
  }

  function checkout() {
    if (lines.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    if (hasDda) {
      if (!patientId) {
        toast.error("Select a patient before selling controlled (DDA) medicines.");
        return;
      }
      if (!prescriptionFile) {
        toast.error("Upload a prescription document for controlled (DDA) medicines.");
        return;
      }
    }

    const resolvedLines = resolveCartLinesFromDrafts();
    setLines(resolvedLines);
    setQtyDraftByDrugId({});

    if (!paymentDetailsComplete) {
      if (paymentMode === "INSURANCE") {
        if (!insuranceSchemeId) toast.error("Select an insurance scheme");
        else if (!insuranceMemberRef.trim()) {
          toast.error("Enter member or beneficiary ID for insurance");
        }
      } else if (paymentMode === "MPESA_STK") {
        toast.error("Enter a valid M-Pesa number (e.g. 07… or 2547…)");
      } else if (paymentMode === "MPESA_MANUAL") {
        if (!mpesaBusinessNumber.trim()) {
          toast.error("Enter the Paybill or Till number used");
        } else if (!mpesaManualRef.trim()) {
          toast.error("Enter the M-Pesa confirmation code from the SMS");
        }
      }
      return;
    }

    const method = modeToPrismaMethod(paymentMode);

    startTransition(async () => {
      let prescriptionPhotoUrl: string | null = null;
      if (prescriptionFile) {
        prescriptionPhotoUrl = await uploadPrescriptionDocument(prescriptionFile);
      }

      const paymentQueueSnapshot =
        method === PM.CASH
          ? null
          : method === PM.INSURANCE
            ? {
                insuranceMemberRef: insuranceMemberRef.trim(),
                insurancePolicyRef: insurancePolicyRef.trim() || null,
              }
            : method === PM.MPESA_STK
              ? { mpesaPhone }
              : {
                  mpesaManualType,
                  mpesaManualRef: mpesaManualRef.trim(),
                  mpesaBusinessNumber: mpesaBusinessNumber.trim(),
                };

      const payload = {
        patientId,
        applyTax: vatEnabled,
        discountCodes,
        lines: resolvedLines.map((l) => ({
          drugId: l.drugId,
          quantity: l.quantity,
          useInsurancePrice,
          instructions: directionsByDrugId[l.drugId]?.trim()
            ? directionsByDrugId[l.drugId]!.trim()
            : null,
        })),
        prescriptionPhotoUrl,
        selectedPaymentMethod: method,
        selectedInsuranceSchemeId: method === PM.INSURANCE ? insuranceSchemeId : null,
        paymentQueueSnapshot,
      };

      try {
        await createPosOrderFromCart(payload);
        toast.success("Ready for cashier");

        setLines([]);
        setDirectionsByDrugId({});
        setDiscountCodes([]);
        setDiscountCodeDraft("");
        setDiscountQuote(null);
        setPatientId(null);
        setPatientLabel(null);
        setInsuranceSchemeId("");
        setInsuranceMemberRef("");
        setInsurancePolicyRef("");
        setMpesaPhone("");
        setMpesaManualType(MpesaManualType.PAYBILL);
        setMpesaManualRef("");
        setMpesaBusinessNumber("");
        setPrescriptionFile(null);
        setPrescriptionFileName(null);
        if (prescriptionPreviewUrl) URL.revokeObjectURL(prescriptionPreviewUrl);
        setPrescriptionPreviewUrl(null);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Checkout failed");
      }
    });
  }

  const modeButtons: {
    mode: PaymentMode;
    label: string;
    icon: typeof Banknote;
    desc: string;
  }[] = [
    {
      mode: "CASH",
      label: "Cash",
      icon: Banknote,
      desc: "Retail price",
    },
    {
      mode: "MPESA_STK",
      label: "M-Pesa prompt",
      icon: Smartphone,
      desc: "STK Push",
    },
    {
      mode: "MPESA_MANUAL",
      label: "M-Pesa manual",
      icon: FileText,
      desc: "Confirmation code",
    },
    {
      mode: "INSURANCE",
      label: "Insurance",
      icon: Shield,
      desc: "Scheme pricing",
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Dialog
        open={directionsEditorOpen}
        onOpenChange={(v) => {
          if (!v) {
            setDirectionsEditorOpen(false);
            setDirectionsEditorDrugId(null);
            setDirectionsDraft("");
            return;
          }
          setDirectionsEditorOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Directions (sig)</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Directions for this item</Label>
            <Textarea
              value={directionsDraft}
              onChange={(e) => setDirectionsDraft(e.target.value)}
              placeholder="Type directions to print on the label…"
              rows={4}
            />
            <p className="text-muted-foreground text-xs">
              This overrides the drug&apos;s default directions for this sale.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDirectionsEditorOpen(false);
                setDirectionsEditorDrugId(null);
                setDirectionsDraft("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                const drugId = directionsEditorDrugId;
                if (!drugId) return;
                const trimmed = directionsDraft.trim();
                setDirectionsByDrugId((prev) => {
                  const next = { ...prev };
                  if (!trimmed) {
                    delete next[drugId];
                  } else {
                    next[drugId] = trimmed;
                  }
                  return next;
                });
                setDirectionsEditorOpen(false);
                setDirectionsEditorDrugId(null);
                setDirectionsDraft("");
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="min-h-0 lg:min-h-128">
        <CardHeader>
          <CardTitle>Add items</CardTitle>
          <CardDescription>
            Type to search — use arrows and Enter to add quickly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PosDrugSearch onAdd={addDrug} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="w-24">Qty</TableHead>
                <TableHead className="text-right">Unit</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground py-8 text-center"
                  >
                    Cart is empty — search above to add products
                  </TableCell>
                </TableRow>
              ) : (
                lines.map((l) => {
                  const unit = useInsurancePrice
                    ? Number(l.drug.priceInsurance)
                    : Number(l.drug.priceCash);
                  const hasOverride =
                    directionsByDrugId[l.drugId]?.trim().length ? true : false;
                  return (
                    <TableRow key={l.drugId}>
                      <TableCell>
                        <div className="font-medium">{l.drug.genericName}</div>
                        <div className="text-muted-foreground font-mono text-xs">
                          {l.drug.internalCode}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant={hasOverride ? "secondary" : "ghost"}
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setDirectionsEditorDrugId(l.drugId);
                                setDirectionsDraft(
                                  directionsByDrugId[l.drugId] ??
                                    l.drug.patientDirections ??
                                    "",
                                );
                                setDirectionsEditorOpen(true);
                              }}
                              aria-label="Edit directions"
                              title="Edit directions"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Input
                              type="text"
                              inputMode="numeric"
                              autoComplete="off"
                              className="h-8 tabular-nums"
                              value={
                                qtyDraftByDrugId[l.drugId] !== undefined
                                  ? qtyDraftByDrugId[l.drugId]!
                                  : String(l.quantity)
                              }
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v !== "" && !/^\d+$/.test(v)) return;
                                setQtyDraftByDrugId((prev) => ({
                                  ...prev,
                                  [l.drugId]: v,
                                }));
                                if (v === "") return;
                                const n = parseInt(v, 10);
                                if (!Number.isNaN(n) && n >= 1) {
                                  setQty(l.drugId, n);
                                  if (n > l.stockQty) {
                                    setQtyDraftByDrugId((prev) => ({
                                      ...prev,
                                      [l.drugId]: String(l.stockQty),
                                    }));
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                const t = e.target.value.trim();
                                const n = parseInt(t, 10);
                                const q =
                                  t === "" || Number.isNaN(n) || n < 1 ? 1 : n;
                                setQty(l.drugId, q);
                                clearQtyDraft(l.drugId);
                              }}
                            />
                          </div>
                          <p className="text-muted-foreground text-[10px] leading-none tabular-nums">
                            Available {l.stockQty}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {unit.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(l.drugId)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cart & checkout</CardTitle>
          <CardDescription>
            One payment for this sale · retail price unless insurance is selected
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PosPatientSearch
            selectedId={patientId}
            selectedLabel={patientLabel}
            onSelect={(id, label) => {
              setPatientId(id);
              setPatientLabel(label);
            }}
          />

          {hasDda ? (
            <Alert>
              <AlertTitle className="text-sm">Controlled (DDA) medicines in cart</AlertTitle>
              <AlertDescription className="text-xs">
                Select a patient and upload a prescription document (JPG, PNG, WebP, or PDF) before sending this order to the cashier.
              </AlertDescription>
            </Alert>
          ) : null}

          {patientId ? (
            <p className="text-muted-foreground text-xs">
              A prescription will be saved for this patient automatically (prescriber:
              {" "}
              <span className="font-medium text-foreground">Prescription</span>, Rx
              number auto-generated).
            </p>
          ) : null}

          <div className="space-y-2">
            <Label>Payment</Label>
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
                  <span className="text-sm font-medium leading-none">
                    {label}
                  </span>
                  <span className="text-muted-foreground text-xs">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {paymentMode === "MPESA_STK" ? (
            <div className="space-y-2">
              <Label htmlFor="pos-mpesa-phone">Customer M-Pesa number</Label>
              <Input
                id="pos-mpesa-phone"
                placeholder="07XX XXX XXX or 2547…"
                className="h-10 text-base"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                autoComplete="tel"
                aria-required
              />
              <p className="text-muted-foreground text-xs">
                Required for STK push — same number the prompt will be sent to.
              </p>
            </div>
          ) : null}

          {paymentMode === "MPESA_MANUAL" ? (
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <p className="text-sm font-medium">M-Pesa paid manually</p>
              <p className="text-muted-foreground text-xs">
                Required for Paybill/Till or bank-linked M-Pesa payments — cashier will match
                against the SMS receipt.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={mpesaManualType}
                    onValueChange={(v) => setMpesaManualType(v as MpesaManualType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={MpesaManualType.PAYBILL}>Paybill</SelectItem>
                      <SelectItem value={MpesaManualType.TILL}>Till</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Paybill / Till number</Label>
                  <Input
                    placeholder="Business number"
                    value={mpesaBusinessNumber}
                    onChange={(e) => setMpesaBusinessNumber(e.target.value)}
                    aria-required
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
                  aria-required
                />
              </div>
            </div>
          ) : null}

          {paymentMode === "INSURANCE" ? (
            <div className="space-y-3">
              {insuranceNotes ? (
                <Alert>
                  <AlertTitle className="text-sm">Insurance notes</AlertTitle>
                  <AlertDescription className="text-xs whitespace-pre-wrap">
                    {insuranceNotes}
                  </AlertDescription>
                </Alert>
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
                  aria-required
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

          <div className="space-y-2">
            <Label>
              Prescription document {hasDda ? "(required for DDA)" : "(optional)"}
            </Label>
            <Input
              type="file"
              accept={PRESCRIPTION_FILE_ACCEPT}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f) {
                  const validationError = validatePrescriptionFile(f);
                  if (validationError) {
                    toast.error(validationError);
                    e.target.value = "";
                    setPrescriptionFile(null);
                    setPrescriptionFileName(null);
                    setPrescriptionPreviewUrl((prev) => {
                      if (prev) URL.revokeObjectURL(prev);
                      return null;
                    });
                    return;
                  }
                }
                setPrescriptionFile(f);
                setPrescriptionFileName(f ? f.name : null);
                setPrescriptionPreviewUrl((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return f ? URL.createObjectURL(f) : null;
                });
              }}
            />
            {prescriptionPreviewUrl && prescriptionFile && !isPdfPrescription(prescriptionFile) ? (
              <div className="overflow-hidden rounded-md border bg-muted/10 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={prescriptionPreviewUrl}
                  alt="Prescription document preview"
                  className="max-h-56 w-full rounded object-contain"
                />
              </div>
            ) : null}
            {prescriptionFile && isPdfPrescription(prescriptionFile) ? (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                <FileText className="size-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">PDF ready to upload</p>
                  <p className="text-xs text-muted-foreground">{prescriptionFile.name}</p>
                </div>
              </div>
            ) : null}
            {prescriptionFileName ? (
              <p className="text-muted-foreground text-xs">Selected: {prescriptionFileName}</p>
            ) : (
              <p className="text-muted-foreground text-xs">
                {hasDda
                  ? "Required — upload a JPG, JPEG, PNG, WebP, or PDF (max 8MB)."
                  : "Optional — attach a JPG, JPEG, PNG, WebP, or PDF (max 8MB)."}
              </p>
            )}
          </div>

          {showDiscountsSection ? (
            <div className="space-y-2 rounded-lg border bg-muted/10 p-3">
              <Label>Discounts</Label>
              <div className="relative">
                <div className="flex gap-2">
                  <Input
                    placeholder={
                      activeDiscountsLoading
                        ? "Loading discounts…"
                        : activeDiscounts.length > 0
                          ? "Enter discount code or pick one…"
                          : "Enter discount code…"
                    }
                    className="font-mono"
                    value={discountCodeDraft}
                    onChange={(e) => {
                      setDiscountCodeDraft(e.target.value);
                      if (activeDiscounts.length > 0) setDiscountPickerOpen(true);
                    }}
                    onFocus={() => {
                      if (activeDiscounts.length > 0) setDiscountPickerOpen(true);
                    }}
                    onBlur={() => {
                      // Small delay so click can register
                      setTimeout(() => setDiscountPickerOpen(false), 120);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      const c = discountCodeDraft.trim().toUpperCase();
                      if (!c) return;
                      setDiscountCodes((prev) =>
                        prev.includes(c) ? prev : [...prev, c],
                      );
                      setDiscountCodeDraft("");
                      setDiscountPickerOpen(false);
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const c = discountCodeDraft.trim().toUpperCase();
                      if (!c) return;
                      setDiscountCodes((prev) =>
                        prev.includes(c) ? prev : [...prev, c],
                      );
                      setDiscountCodeDraft("");
                      setDiscountPickerOpen(false);
                    }}
                  >
                    Apply
                  </Button>
                </div>

                {discountPickerOpen && activeDiscounts.length > 0 && (
                  <div className="bg-popover absolute z-50 mt-1 w-full rounded-md border border-border p-1 shadow-md ring-1 ring-foreground/10">
                    <div className="text-muted-foreground px-2 py-1 text-[11px]">
                      Pick a code (click to apply)
                    </div>
                    <div className="max-h-56 overflow-auto">
                      {filteredActiveDiscounts.length === 0 ? (
                        <div className="text-muted-foreground px-2 py-3 text-sm">
                          No matching discounts
                        </div>
                      ) : (
                        filteredActiveDiscounts.map((d) => (
                          <button
                            key={d.code}
                            type="button"
                            className="hover:bg-muted/60 flex w-full flex-col gap-0.5 rounded-sm px-2 py-2 text-left text-sm transition-colors"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              const c = d.code.toUpperCase();
                              setDiscountCodes((prev) =>
                                prev.includes(c) ? prev : [...prev, c],
                              );
                              setDiscountCodeDraft("");
                              setDiscountPickerOpen(false);
                            }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-mono font-semibold">{d.code}</span>
                              <span className="text-xs tabular-nums">
                                {formatDiscountValue(d)}
                              </span>
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {d.name} · {discountMeta(d)}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {discountCodes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {discountCodes.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs"
                    >
                      <span className="font-mono">{c}</span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setDiscountCodes((prev) => prev.filter((x) => x !== c));
                        }}
                        aria-label="Remove discount"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Add a code to reduce the total. Some discounts require selecting a customer.
                </p>
              )}

              {discountQuote?.rejected?.length ? (
                <div className="text-muted-foreground text-xs">
                  {discountQuote.rejected.map((r) => (
                    <div key={r.code}>
                      <span className="font-mono">{r.code}</span>: {r.reason}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">KES {displaySubtotal.toFixed(2)}</span>
            </div>
            {displayDiscounts > 0 ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discounts</span>
                <span className="tabular-nums">- KES {displayDiscounts.toFixed(2)}</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <Checkbox
                  checked={vatEnabled}
                  onCheckedChange={(v) => setVatEnabled(v === true)}
                  aria-label="Toggle VAT"
                />
                <span>
                  VAT ({taxRatePercent}%){!vatEnabled ? " (off)" : ""}
                </span>
              </span>
              <span className="tabular-nums">KES {displayTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">KES {displayTotal.toFixed(2)}</span>
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={
              pending ||
              lines.length === 0 ||
              !paymentDetailsComplete ||
              (hasDda && (!patientId || !prescriptionFile))
            }
            onClick={checkout}
          >
            {pending ? "Processing…" : "Send to cashier"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
