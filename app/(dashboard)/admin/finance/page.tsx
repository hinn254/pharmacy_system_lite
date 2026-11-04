import { Suspense } from "react";
import { getAdminAnalyticsReport } from "@/lib/actions/analytics";
import { listExpenses, sumExpenses } from "@/lib/actions/expenses";
import { FinanceClient } from "@/components/finance-client";
import { FinanceToolbar, type FinancePeriod } from "@/components/finance-toolbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { endOfMonth, endOfYear, startOfMonth, startOfYear } from "date-fns";

function coerceFinancePeriod(v: string | undefined): FinancePeriod {
  if (v === "week" || v === "month" || v === "year") return v;
  return "month";
}

function coerceInt(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function computeFinanceRange({
  year,
  month,
  from,
  to,
}: {
  year?: number;
  month?: number;
  from?: string;
  to?: string;
}): { from?: string; to?: string } {
  if (from && to) return { from, to };

  if (year && month && month >= 1 && month <= 12) {
    const d = new Date(year, month - 1, 1);
    return { from: startOfMonth(d).toISOString(), to: endOfMonth(d).toISOString() };
  }

  if (year) {
    const d = new Date(year, 0, 1);
    return { from: startOfYear(d).toISOString(), to: endOfYear(d).toISOString() };
  }

  return {};
}

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const pick = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const financePreset = coerceFinancePeriod(pick("preset"));
  const expenseSearch = (pick("q") ?? "").trim();
  const year = coerceInt(pick("year"));
  const month = coerceInt(pick("month"));

  const rawFrom = pick("from");
  const rawTo = pick("to");
  const resolved = computeFinanceRange({ year, month, from: rawFrom, to: rawTo });
  const reportPreset = resolved.from && resolved.to ? "custom" : financePreset;

  // Reuse analytics range parsing by calling analytics report with the same from/to inputs.
  const report = await getAdminAnalyticsReport({
    preset: reportPreset,
    bucket: "month",
    from: resolved.from,
    to: resolved.to,
  });

  if (!report) {
    return (
      <div className="rounded-xl border border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground">
        This report is only available to administrators.
      </div>
    );
  }

  const from = report.range.from;
  const to = report.range.to;
  const expensesTotal = await sumExpenses({ from, to });
  const netProfit = report.kpis.grossProfit - expensesTotal;

  const expenses = await listExpenses({
    from,
    to,
    limit: 200,
    ...(expenseSearch ? { search: expenseSearch } : {}),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Finance (lightweight)</h1>
          <p className="text-muted-foreground text-sm">
            Simple P&amp;L based on revenue/COGS (from sales) minus recorded expenses.
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="h-9" aria-hidden />}>
        <FinanceToolbar period={financePreset} searchQuery={expenseSearch} />
      </Suspense>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Revenue</CardDescription>
            <CardTitle className="text-2xl tabular-nums">KES {report.kpis.revenue.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            From {new Date(from).toLocaleDateString()} to {new Date(to).toLocaleDateString()}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gross profit</CardDescription>
            <CardTitle className="text-2xl tabular-nums">KES {report.kpis.grossProfit.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Revenue – COGS
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net profit (lightweight)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">KES {netProfit.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Gross profit – expenses ({expensesTotal.toFixed(2)})
          </CardContent>
        </Card>
      </div>

      <FinanceClient
        initialExpenses={expenses}
        range={{ from, to }}
        expenseSearch={expenseSearch}
      />
    </div>
  );
}

