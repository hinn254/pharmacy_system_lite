import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { coerceInvoiceTemplate } from "@/lib/invoice-template";
import type { Prisma } from "@prisma/client";
import { PaymentMethod, PaymentStatus } from "@prisma/client";

type SaleInvoice = Prisma.SaleGetPayload<{
  include: {
    lines: {
      include: {
        drug: true;
        batchAllocations: { include: { batch: true } };
      };
    };
    serviceLines: true;
    payments: { include: { insuranceScheme: true } };
    discounts: true;
    patient: true;
    createdBy: { select: { name: true; email: true } };
    organization: { include: { settings: true } };
  };
}>;

function formatKes(n: unknown) {
  const v = typeof n === "number" ? n : Number(n ?? 0);
  return `KES ${Number.isFinite(v) ? v.toFixed(2) : "0.00"}`;
}

function paymentLabel(method: string) {
  switch (method) {
    case "CASH":
      return "Cash";
    case "MPESA_STK":
      return "M-Pesa (STK)";
    case "MPESA_MANUAL":
      return "M-Pesa (manual)";
    case "INSURANCE":
      return "Insurance";
    default:
      return method;
  }
}

export function InvoiceDocument({ sale }: { sale: SaleInvoice }) {
  const settings = sale.organization.settings;
  const template = coerceInvoiceTemplate(settings?.invoiceTemplate ?? null);
  const headerTitle = template?.title ?? settings?.receiptHeader ?? sale.organization.name;
  const subtitle = template?.subtitle ?? "Tax invoice / receipt";
  const footer = template?.footer ?? settings?.receiptFooter ?? "Thank you for your business";
  const showLogo = template?.showLogo ?? true;
  const accentColor = template?.accentColor ?? null;
  const titleStyle = accentColor ? ({ color: accentColor } as const) : undefined;
  const taxPct = sale.taxRateSnapshot
    ? Number(sale.taxRateSnapshot)
    : null;
  const discountAmount = sale.discountAmount ? Number(sale.discountAmount) : 0;
  const taxable = sale.taxableAmount != null ? Number(sale.taxableAmount) : Number(sale.subtotal);

  return (
    <div className="font-sans text-sm">
      <div className="border-border/80 bg-card/50 rounded-xl border p-6 shadow-sm print:border-0 print:bg-transparent print:p-0 print:shadow-none">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1
              className="truncate text-xl font-semibold tracking-tight"
              style={titleStyle}
              title={headerTitle}
            >
              {headerTitle}
            </h1>
            <p className="text-muted-foreground mt-1 text-xs">{subtitle}</p>
          </div>
          {showLogo && settings?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.logoUrl}
              alt="Logo"
              className="h-10 w-auto shrink-0 rounded bg-white p-1 object-contain"
            />
          ) : null}
        </div>

        <Separator className="my-5" />

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="space-y-1.5">
            <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Sale
            </h2>
            <div className="flex justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Invoice #</span>
              <span className="font-mono font-medium tabular-nums">
                {sale.saleNumber}
              </span>
            </div>
            <div className="flex justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Date</span>
              <span>
                {new Date(sale.createdAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
            {taxPct != null && (
              <div className="flex justify-between gap-2 text-sm">
                <span className="text-muted-foreground">VAT rate</span>
                <span className="tabular-nums">{taxPct}%</span>
              </div>
            )}
            <div className="flex justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-mono text-[11px] break-all">{sale.id}</span>
            </div>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Customer
            </h2>
            {sale.patient ? (
              <>
                <p className="font-medium">{sale.patient.fullName}</p>
                <div className="text-muted-foreground space-y-0.5 text-xs">
                  {sale.patient.phone ? <div>{sale.patient.phone}</div> : null}
                  {sale.patient.email ? <div>{sale.patient.email}</div> : null}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Walk-in</p>
            )}
          </section>
        </div>

        <div className="mt-4 rounded-lg border border-border/60 bg-muted/15 px-3 py-2 text-xs">
          <span className="text-muted-foreground">Cashier </span>
          <span className="font-medium">
            {sale.createdBy.name ?? sale.createdBy.email}
          </span>
        </div>

        <Separator className="my-5" />

        <section>
          <h2 className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wide">
            Line items
          </h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 font-mono text-[11px]">Code</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Unit</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-center">Price type</th>
                </tr>
              </thead>
              <tbody>
                {sale.lines.map((line) => (
                  <tr key={line.id} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2.5 align-top">
                      <div className="max-w-[200px] font-medium leading-snug">
                        {line.drug.genericName}
                      </div>
                      {line.drug.brandName ? (
                        <div className="text-muted-foreground text-[11px]">
                          {line.drug.brandName}
                        </div>
                      ) : null}
                    </td>
                    <td className="text-muted-foreground px-3 py-2.5 align-top font-mono text-[11px]">
                      {line.drug.internalCode}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {line.quantity}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {Number(line.unitPrice).toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                      {Number(line.lineTotal).toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {line.usedInsurancePrice ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Insurance
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Retail
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {sale.serviceLines.map((line) => (
                  <tr key={line.id} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2.5 align-top">
                      <div className="max-w-[200px] font-medium leading-snug">
                        {line.description}
                      </div>
                      <div className="text-muted-foreground text-[11px]">Service</div>
                    </td>
                    <td className="text-muted-foreground px-3 py-2.5 align-top font-mono text-[11px]">
                      —
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {line.quantity}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {Number(line.unitPrice).toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                      {Number(line.lineTotal).toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {line.usedInsurancePrice ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Insurance
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Retail
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-6 flex flex-col items-end gap-1 border-t pt-4 text-sm">
          <div className="flex w-full max-w-xs justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{formatKes(sale.subtotal)}</span>
          </div>
          {discountAmount > 0 ? (
            <>
              {sale.discounts.length > 0 ? (
                <div className="w-full max-w-xs space-y-1 pt-1">
                  {sale.discounts.map((d) => (
                    <div key={d.id} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        Discount ({d.codeSnapshot})
                      </span>
                      <span className="tabular-nums">
                        - {formatKes(d.appliedAmount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex w-full max-w-xs justify-between">
                  <span className="text-muted-foreground">Discounts</span>
                  <span className="tabular-nums">- {formatKes(discountAmount)}</span>
                </div>
              )}
              <div className="flex w-full max-w-xs justify-between pt-1">
                <span className="text-muted-foreground">Taxable amount</span>
                <span className="tabular-nums">{formatKes(taxable)}</span>
              </div>
            </>
          ) : null}
          <div className="flex w-full max-w-xs justify-between">
            <span className="text-muted-foreground">
              Tax{taxPct != null ? ` (${taxPct}%)` : ""}
            </span>
            <span className="tabular-nums">{formatKes(sale.taxAmount)}</span>
          </div>
          <div className="flex w-full max-w-xs justify-between text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatKes(sale.total)}</span>
          </div>
        </div>

        <Separator className="my-5" />

        <section>
          <h2 className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
            Payments
          </h2>
          <ul className="space-y-3">
            {sale.payments.map((p) => (
              <li
                key={p.id}
                className="bg-muted/20 rounded-lg border border-border/50 px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{paymentLabel(p.method)}</Badge>
                    {p.method === PaymentMethod.INSURANCE ? (
                      p.status === PaymentStatus.PENDING ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Awaiting settlement
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/40 text-[10px] text-emerald-700 dark:text-emerald-400"
                        >
                          Settled
                        </Badge>
                      )
                    ) : null}
                  </div>
                  <span className="font-semibold tabular-nums">
                    {formatKes(p.amount)}
                  </span>
                </div>
                <div className="text-muted-foreground mt-2 space-y-1 text-xs">
                  {p.method === "MPESA_STK" && p.mpesaPhoneNumber ? (
                    <div>
                      M-Pesa phone:{" "}
                      <span className="font-mono text-foreground">
                        {maskPhone(p.mpesaPhoneNumber)}
                      </span>
                    </div>
                  ) : null}
                  {p.method === "MPESA_MANUAL" ? (
                    <>
                      {p.mpesaManualType ? (
                        <div>Type: {p.mpesaManualType}</div>
                      ) : null}
                      {p.mpesaBusinessNumber ? (
                        <div>
                          Business no.:{" "}
                          <span className="font-mono">{p.mpesaBusinessNumber}</span>
                        </div>
                      ) : null}
                      {p.mpesaManualRef ? (
                        <div>
                          Confirmation:{" "}
                          <span className="font-mono">{p.mpesaManualRef}</span>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                  {p.method === "INSURANCE" ? (
                    <>
                      {p.insuranceScheme ? (
                        <div>
                          Scheme:{" "}
                          <span className="text-foreground font-medium">
                            {p.insuranceScheme.name}
                          </span>{" "}
                          <span className="font-mono">
                            ({p.insuranceScheme.code})
                          </span>
                        </div>
                      ) : null}
                      {p.insuranceMemberRef ? (
                        <div>
                          Member:{" "}
                          <span className="font-mono">{p.insuranceMemberRef}</span>
                        </div>
                      ) : null}
                      {p.insurancePolicyRef ? (
                        <div>
                          Policy / auth:{" "}
                          <span className="font-mono">{p.insurancePolicyRef}</span>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {sale.etimsStatus !== "NOT_APPLICABLE" && (
          <div className="text-muted-foreground mt-6 border-t pt-3 text-xs">
            eTIMS: {sale.etimsStatus}
            {sale.kraInvoiceNumber ? ` · KRA ${sale.kraInvoiceNumber}` : ""}
          </div>
        )}

        <p className="text-muted-foreground mt-8 text-center text-xs">{footer}</p>
      </div>
    </div>
  );
}

function maskPhone(msisdn: string) {
  const d = msisdn.replace(/\D/g, "");
  if (d.length < 4) return msisdn;
  return `…${d.slice(-4)}`;
}
