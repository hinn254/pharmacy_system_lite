import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { coerceInvoiceTemplate } from "@/lib/invoice-template";
import type { Prisma } from "@prisma/client";
import { InsuranceInvoiceStatus } from "@prisma/client";

type InsuranceInvoiceDoc = Prisma.InsuranceInvoiceGetPayload<{
  include: {
    insuranceScheme: true;
    lines: true;
    payments: true;
    organization: { include: { settings: true } };
  };
}>;

function formatKes(n: unknown) {
  const v = typeof n === "number" ? n : Number(n ?? 0);
  return `KES ${Number.isFinite(v) ? v.toFixed(2) : "0.00"}`;
}

function statusBadge(status: InsuranceInvoiceStatus) {
  switch (status) {
    case "DRAFT":
      return <Badge variant="secondary">Draft</Badge>;
    case "SUBMITTED":
      return <Badge variant="outline">Submitted</Badge>;
    case "PARTIALLY_PAID":
      return <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">Part-paid</Badge>;
    case "PAID":
      return <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400">Paid</Badge>;
    case "VOIDED":
      return <Badge variant="outline" className="border-rose-500/40 text-rose-700 dark:text-rose-400">Voided</Badge>;
  }
}

export function InsuranceInvoiceDocument({ invoice }: { invoice: InsuranceInvoiceDoc }) {
  const settings = invoice.organization.settings;
  const template = coerceInvoiceTemplate(settings?.invoiceTemplate ?? null);
  const headerTitle = template?.title ?? settings?.receiptHeader ?? invoice.organization.name;
  const subtitle = template?.subtitle ?? "Insurance invoice";
  const footer =
    template?.footer ?? settings?.receiptFooter ?? "Thank you for partnering with us";
  const showLogo = template?.showLogo ?? true;
  const accentColor = template?.accentColor ?? null;
  const titleStyle = accentColor ? ({ color: accentColor } as const) : undefined;

  const from = invoice.periodFrom ? new Date(invoice.periodFrom) : null;
  const to = invoice.periodTo ? new Date(invoice.periodTo) : null;

  const paidTotal = invoice.payments.reduce((s, p) => s + Number(p.amount), 0);
  const balance = Number(invoice.total) - paidTotal;

  return (
    <div className="font-sans text-sm">
      <div className="border-border/80 bg-card/50 rounded-xl border p-6 shadow-sm print:border-0 print:bg-transparent print:p-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4">
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
          <div className="flex items-center gap-2">
            {showLogo && settings?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.logoUrl}
                alt="Logo"
                className="h-9 w-auto shrink-0 rounded bg-white p-1 object-contain"
              />
            ) : null}
            {statusBadge(invoice.status)}
            <Badge variant="outline" className="font-mono">
              INV #{invoice.invoiceNumber}
            </Badge>
          </div>
        </div>

        <Separator className="my-5" />

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="space-y-1.5">
            <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Billed to
            </h2>
            <div className="text-sm font-medium">
              {invoice.insuranceScheme.name}{" "}
              <span className="text-muted-foreground font-mono text-xs">
                ({invoice.insuranceScheme.code})
              </span>
            </div>
            {invoice.insuranceScheme.email ? (
              <div className="text-muted-foreground text-xs">
                {invoice.insuranceScheme.email}
              </div>
            ) : null}
            {invoice.insuranceScheme.phone ? (
              <div className="text-muted-foreground text-xs">
                {invoice.insuranceScheme.phone}
              </div>
            ) : null}
          </section>

          <section className="space-y-1.5">
            <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Period
            </h2>
            <div className="flex justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Created</span>
              <span>
                {new Date(invoice.createdAt).toLocaleDateString(undefined, {
                  dateStyle: "medium",
                })}
              </span>
            </div>
            <div className="flex justify-between gap-2 text-sm">
              <span className="text-muted-foreground">From</span>
              <span>{from ? from.toLocaleDateString() : "—"}</span>
            </div>
            <div className="flex justify-between gap-2 text-sm">
              <span className="text-muted-foreground">To</span>
              <span>{to ? to.toLocaleDateString() : "—"}</span>
            </div>
            <div className="flex justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Due</span>
              <span>
                {invoice.dueAt
                  ? new Date(invoice.dueAt).toLocaleDateString()
                  : "—"}
              </span>
            </div>
          </section>
        </div>

        {invoice.notes?.trim() ? (
          <div className="mt-4 rounded-lg border border-border/60 bg-muted/15 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Notes </span>
            <span className="font-medium">{invoice.notes}</span>
          </div>
        ) : null}

        <Separator className="my-5" />

        <section>
          <h2 className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wide">
            Claim lines
          </h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="px-3 py-2 font-medium">Sale</th>
                  <th className="px-3 py-2">Patient</th>
                  <th className="px-3 py-2">Member</th>
                  <th className="px-3 py-2">Policy/Auth</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((l) => (
                  <tr key={l.id} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2.5 align-top font-medium">
                      #{l.saleNumber}
                      <div className="text-muted-foreground text-[11px]">
                        {new Date(l.saleCreatedAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      {l.patientNameSnapshot ?? "Walk-in"}
                    </td>
                    <td className="px-3 py-2.5 align-top font-mono text-[11px]">
                      {l.memberRefSnapshot ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 align-top font-mono text-[11px]">
                      {l.policyRefSnapshot ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                      {formatKes(l.amount)}
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
            <span className="tabular-nums">{formatKes(invoice.subtotal)}</span>
          </div>
          <div className="flex w-full max-w-xs justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span className="tabular-nums">{formatKes(invoice.taxAmount)}</span>
          </div>
          <div className="flex w-full max-w-xs justify-between text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatKes(invoice.total)}</span>
          </div>
          <div className="flex w-full max-w-xs justify-between pt-2 text-xs">
            <span className="text-muted-foreground">Paid</span>
            <span className="tabular-nums">{formatKes(paidTotal)}</span>
          </div>
          <div className="flex w-full max-w-xs justify-between text-xs font-semibold">
            <span>Balance</span>
            <span className="tabular-nums">{formatKes(balance)}</span>
          </div>
        </div>

        <p className="text-muted-foreground mt-8 text-center text-xs">{footer}</p>
      </div>
    </div>
  );
}

