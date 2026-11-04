import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getAdminAnalyticsReport } from "@/lib/actions/analytics";
import { sumExpenses } from "@/lib/actions/expenses";
import { PrintButton } from "@/components/print-button";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

function fmtKes(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return `KES ${n.toFixed(2)}`;
}

export default async function FinancePrintPage({
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
    preset: "custom",
    bucket: "month",
    from: pick("from"),
    to: pick("to"),
  });
  if (!report) notFound();

  const from = report.range.from;
  const to = report.range.to;
  const expensesTotal = await sumExpenses({ from, to });
  const netProfit = report.kpis.grossProfit - expensesTotal;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-2 pb-10">
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1">
          <Link href={`/admin/finance?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`}>
            <ArrowLeft className="size-4" />
            Back to finance
          </Link>
        </Button>
        <PrintButton label="Print finance report" />
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 p-6 shadow-sm print:border-0 print:bg-transparent print:p-0 print:shadow-none">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Finance report (lightweight)</h1>
          <p className="text-muted-foreground mt-1 text-xs">
            {new Date(from).toLocaleDateString()} – {new Date(to).toLocaleDateString()}
          </p>
        </div>

        <Separator className="my-5" />

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Revenue</span>
            <span className="font-medium tabular-nums">{fmtKes(report.kpis.revenue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">COGS</span>
            <span className="font-medium tabular-nums">{fmtKes(report.kpis.cogs)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gross profit</span>
            <span className="font-semibold tabular-nums">{fmtKes(report.kpis.grossProfit)}</span>
          </div>
        </div>

        <Separator className="my-5" />

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Expenses (recorded)</span>
            <span className="font-medium tabular-nums">{fmtKes(expensesTotal)}</span>
          </div>
          <div className="flex justify-between text-base">
            <span className="font-semibold">Net profit (lightweight)</span>
            <span className="font-semibold tabular-nums">{fmtKes(netProfit)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

