import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";

import { getAdminAnalyticsReport } from "@/lib/actions/analytics";
import { PrintButton } from "@/components/print-button";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

function fmtKes(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return `KES ${n.toFixed(2)}`;
}

export default async function AdminAnalyticsPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const pick = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const report = await getAdminAnalyticsReport({
    preset: pick("preset"),
    bucket: pick("bucket"),
    includeVoided: pick("includeVoided"),
    paymentMethod: pick("paymentMethod"),
    insuranceSchemeId: pick("insuranceSchemeId"),
    cashierId: pick("cashierId"),
    expiryWithinDays: pick("expiryWithinDays"),
    topN: pick("topN"),
    from: pick("from"),
    to: pick("to"),
  });

  if (!report) notFound();

  const from = new Date(report.range.from);
  const to = new Date(report.range.to);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-2 pb-10">
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1">
          <Link href="/admin/analytics">
            <ArrowLeft className="size-4" />
            Back to analytics
          </Link>
        </Button>
        <PrintButton label="Print report" />
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 p-6 shadow-sm print:border-0 print:bg-transparent print:p-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Analytics report</h1>
            <p className="text-muted-foreground mt-1 text-xs">
              {format(from, "PP")} – {format(to, "PP")} · Bucket: {report.range.bucket}
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            Generated {format(new Date(), "PPp")}
          </div>
        </div>

        <Separator className="my-5" />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-muted/15 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Revenue
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{fmtKes(report.kpis.revenue)}</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>Transactions</div>
              <div className="text-right tabular-nums">{report.kpis.transactions}</div>
              <div>Avg sale</div>
              <div className="text-right tabular-nums">{fmtKes(report.kpis.avgSale)}</div>
              <div>Units sold</div>
              <div className="text-right tabular-nums">{report.kpis.unitsSold}</div>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/15 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Profit (gross)
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{fmtKes(report.kpis.grossProfit)}</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>COGS</div>
              <div className="text-right tabular-nums">{fmtKes(report.kpis.cogs)}</div>
              <div>Gross margin</div>
              <div className="text-right tabular-nums">
                {report.kpis.grossMarginPct == null ? "—" : `${report.kpis.grossMarginPct.toFixed(1)}%`}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/15 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Collections
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>Cash received</div>
              <div className="text-right tabular-nums">{fmtKes(report.payments.summary.cashReceived)}</div>
              <div>M-Pesa received</div>
              <div className="text-right tabular-nums">{fmtKes(report.payments.summary.mpesaReceived)}</div>
              <div>Insurance paid</div>
              <div className="text-right tabular-nums">{fmtKes(report.payments.summary.insuranceReceived)}</div>
              <div>Insurance pending</div>
              <div className="text-right tabular-nums">{fmtKes(report.payments.summary.insurancePending)}</div>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/15 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Stock value
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>Opening (cost)</div>
              <div className="text-right tabular-nums">{fmtKes(report.stock.stockValue.openingCost)}</div>
              <div>Closing (cost)</div>
              <div className="text-right tabular-nums">{fmtKes(report.stock.stockValue.closingCost)}</div>
              <div>Opening (selling)</div>
              <div className="text-right tabular-nums">{fmtKes(report.stock.stockValue.openingSelling)}</div>
              <div>Closing (selling)</div>
              <div className="text-right tabular-nums">{fmtKes(report.stock.stockValue.closingSelling)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

