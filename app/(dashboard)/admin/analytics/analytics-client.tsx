"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import type { PaymentMethod } from "@prisma/client";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

import type { AdminAnalyticsReport, AnalyticsBucket } from "@/lib/actions/analytics";
import { KpiCard } from "@/components/charts/kpi-card";
import {
  ProfitLineChart,
  RevenueLineChart,
  SmallBarsChart,
  TransactionsBarChart,
} from "@/components/charts/series-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePharmacyAssistant } from "@/components/pharmacy-assistant";
import { getSuggestedQuestions } from "@/lib/ai/suggestions";

function fmtKes(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return `KES ${n.toFixed(2)}`;
}

function labelFromIso(iso: string, bucket: AnalyticsBucket) {
  const d = new Date(iso);
  if (bucket === "day") return format(d, "MMM d");
  if (bucket === "week") return format(d, "MMM d");
  if (bucket === "month") return format(d, "MMM yyyy");
  return format(d, "yyyy");
}

function setParam(params: URLSearchParams, key: string, value: string | null) {
  if (value == null || value === "" || value === "all") params.delete(key);
  else params.set(key, value);
}

export function AnalyticsClient({ report }: { report: AdminAnalyticsReport }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { ask } = usePharmacyAssistant();

  const [customRange, setCustomRange] = useState<DateRange | undefined>(() => {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (!from && !to) return undefined;
    const fromDate = from ? new Date(from) : to ? new Date(to) : undefined;
    if (!fromDate) return undefined;
    return { from: fromDate, to: to ? new Date(to) : undefined };
  });

  const bucket = report.range.bucket;
  const points = report.series.points;

  const series = useMemo(() => {
    return points.map((p) => ({
      label: labelFromIso(p.bucketStart, bucket),
      revenue: p.revenue,
      transactions: p.transactions,
      cogs: p.cogs,
      grossProfit: p.grossProfit,
      openingCost: p.openingStockValueCost,
      closingCost: p.closingStockValueCost,
      openingSelling: p.openingStockValueSelling,
      closingSelling: p.closingStockValueSelling,
    }));
  }, [bucket, points]);

  const suggested = useMemo(() => getSuggestedQuestions("analytics"), []);

  const apply = (patch: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams.toString());
    patch(next);
    router.push(`${pathname}?${next.toString()}`);
  };

  const paymentMethod = (searchParams.get("paymentMethod") ?? "all") as
    | PaymentMethod
    | "all";

  const [categoryMetric, setCategoryMetric] = useState<"revenue" | "units">("revenue");

  const topCategories = useMemo(() => {
    const rows =
      categoryMetric === "revenue"
        ? report.categories.topByRevenue
        : report.categories.topByUnits;
    return rows.map((r) => ({
      label: r.categoryName,
      value: categoryMetric === "revenue" ? r.revenue : r.units,
      revenue: r.revenue,
      units: r.units,
    }));
  }, [categoryMetric, report.categories.topByRevenue, report.categories.topByUnits]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(report.range.from), "PP")} –{" "}
            {format(new Date(report.range.to), "PP")} · Bucketed by{" "}
            <span className="font-medium">{bucket}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="h-9">
            <Link href={`/admin/analytics/print?${searchParams.toString()}`}>Print</Link>
          </Button>
          <Select
            value={searchParams.get("preset") ?? "today"}
            onValueChange={(v) =>
              apply((p) => {
                setParam(p, "preset", v);
                if (v !== "custom") {
                  p.delete("from");
                  p.delete("to");
                }
              })
            }
          >
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="week">This week</SelectItem>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="year">This year</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-9 gap-2"
                disabled={(searchParams.get("preset") ?? "today") !== "custom"}
              >
                <CalendarIcon className="size-4" />
                {customRange?.from && customRange?.to
                  ? `${format(customRange.from, "PP")} – ${format(customRange.to, "PP")}`
                  : "Pick dates"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                numberOfMonths={2}
                selected={customRange}
                onSelect={(r) => setCustomRange(r)}
              />
              <div className="flex items-center justify-between gap-2 p-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCustomRange(undefined)}
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (!customRange?.from || !customRange?.to) {
                      toast.error("Pick both a start and end date.");
                      return;
                    }
                    apply((p) => {
                      setParam(p, "preset", "custom");
                      setParam(p, "from", customRange.from!.toISOString());
                      setParam(p, "to", customRange.to!.toISOString());
                    });
                  }}
                >
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Select
            value={searchParams.get("bucket") ?? bucket}
            onValueChange={(v) => apply((p) => setParam(p, "bucket", v))}
          >
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue placeholder="Bucket" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 rounded-md border border-border/70 bg-background px-2.5 py-1.5">
            <Checkbox
              checked={(searchParams.get("includeVoided") ?? "false") === "true"}
              onCheckedChange={(v) =>
                apply((p) => setParam(p, "includeVoided", v ? "true" : null))
              }
            />
            <span className="text-xs text-muted-foreground">Include voided</span>
          </div>
        </div>
      </div>

      {/* Section A: Sales performance */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Sales performance</h2>
            <p className="text-sm text-muted-foreground">
              Revenue, transaction volume, and product mix for the selected window.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={paymentMethod}
              onValueChange={(v) => apply((p) => setParam(p, "paymentMethod", v))}
            >
              <SelectTrigger className="h-9 w-[200px]">
                <SelectValue placeholder="Payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payments</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="MPESA_STK">M-PESA STK</SelectItem>
                <SelectItem value="MPESA_MANUAL">M-PESA manual</SelectItem>
                <SelectItem value="INSURANCE">Insurance</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={searchParams.get("topN") ?? "10"}
              onValueChange={(v) => apply((p) => setParam(p, "topN", v))}
            >
              <SelectTrigger className="h-9 w-[120px]">
                <SelectValue placeholder="Top N" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Top 5</SelectItem>
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="20">Top 20</SelectItem>
                <SelectItem value="50">Top 50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard label="Revenue" value={fmtKes(report.kpis.revenue)} />
          <KpiCard label="Transactions" value={`${report.kpis.transactions}`} />
          <KpiCard
            label="Stock Usage"
            value={fmtKes(report.stock.stockValue.openingCost - report.stock.stockValue.closingCost)}
            sublabel="Opening cost value minus closing cost value"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard
            label="Paid in cash"
            value={fmtKes(report.payments.summary.cashReceived)}
            sublabel="Typically in shop till"
          />
          <KpiCard
            label="Paid via M-Pesa"
            value={fmtKes(report.payments.summary.mpesaReceived)}
            sublabel="Typically reflects in bank"
          />
          <KpiCard
            label="Insurance paid"
            value={fmtKes(report.payments.summary.insuranceReceived)}
            sublabel="Settled claims"
          />
          <Card className="border-border/60 shadow-sm ring-1 ring-border/40">
            <CardHeader className="pb-2">
              <CardDescription>Insurance pending</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                <Link
                  href="/admin/insurers?status=pending"
                  className="underline decoration-border/60 underline-offset-4 hover:decoration-foreground"
                >
                  {fmtKes(report.payments.summary.insurancePending)}
                </Link>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Click to review claims owed per insurer
              </p>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/60 shadow-sm ring-1 ring-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Revenue trend</CardTitle>
              <CardDescription>Bucketed by {bucket}</CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueLineChart data={series.map((s) => ({ label: s.label, revenue: s.revenue }))} />
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm ring-1 ring-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Transactions</CardTitle>
              <CardDescription>Completed sales count per bucket</CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionsBarChart
                data={series.map((s) => ({ label: s.label, transactions: s.transactions }))}
              />
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/60 shadow-sm ring-1 ring-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top selling (units + revenue)</CardTitle>
            <CardDescription>Best sellers for the current filters</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Drug</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.sales.topSelling.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                      No sales in this window.
                    </TableCell>
                  </TableRow>
                ) : (
                  report.sales.topSelling.map((r) => (
                    <TableRow key={r.drugId}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.units}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtKes(r.revenue)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm ring-1 ring-border/40">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Category mix</CardTitle>
                <CardDescription>Split attribution across multi-category drugs (no double counting)</CardDescription>
              </div>
              <Select
                value={categoryMetric}
                onValueChange={(v) => setCategoryMetric(v as "revenue" | "units")}
              >
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="units">Units</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <div>
              <SmallBarsChart
                data={topCategories.slice(0, 12).map((r) => ({
                  label: r.label.length > 14 ? `${r.label.slice(0, 14)}…` : r.label,
                  value: r.value,
                }))}
                color="var(--primary)"
                height={200}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Showing top {Math.min(12, topCategories.length)} categories by {categoryMetric}.
              </p>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                        No sales in this window.
                      </TableCell>
                    </TableRow>
                  ) : (
                    topCategories.slice(0, 12).map((r) => (
                      <TableRow key={r.label}>
                        <TableCell className="font-medium">{r.label}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {r.units.toFixed(1).replace(/\.0$/, "")}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtKes(r.revenue)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Section B: Profit & cash-control */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Profit & cash-control</h2>
          <p className="text-sm text-muted-foreground">
            Gross profit is computed using actual batch allocations and batch unit costs. Net
            profit requires expenses (not yet modeled), so we report gross profit for now.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard label="COGS" value={fmtKes(report.kpis.cogs)} />
          <KpiCard label="Gross profit" value={fmtKes(report.kpis.grossProfit)} />
          <KpiCard
            label="Gross margin"
            value={
              report.kpis.grossMarginPct == null
                ? "—"
                : `${report.kpis.grossMarginPct.toFixed(1)}%`
            }
          />
        </div>

        <Card className="border-border/60 shadow-sm ring-1 ring-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Revenue vs COGS vs Gross profit</CardTitle>
            <CardDescription>Trended to spot margin compression</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfitLineChart
              data={series.map((s) => ({
                label: s.label,
                revenue: s.revenue,
                cogs: s.cogs,
                grossProfit: s.grossProfit,
              }))}
            />
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/60 shadow-sm ring-1 ring-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Stock value (at cost)</CardTitle>
              <CardDescription>
                Opening is stock value at the start of the selected window; closing is at the end.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">Opening</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">
                  {fmtKes(report.stock.stockValue.openingCost)}
                </div>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">Closing</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">
                  {fmtKes(report.stock.stockValue.closingCost)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm ring-1 ring-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Stock value (at cash selling price)</CardTitle>
              <CardDescription>
                Opening is stock valued at cash prices at the start of the window; closing is at
                the end (potential sales value, not profit).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">Opening</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">
                  {fmtKes(report.stock.stockValue.openingSelling)}
                </div>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">Closing</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">
                  {fmtKes(report.stock.stockValue.closingSelling)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section C: Stock health & risk */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Stock health & risk</h2>
            <p className="text-sm text-muted-foreground">
              Low stock, expiring soon, and expiry distribution for planning purchases and
              preventing write-offs.
            </p>
          </div>
          <Select
            value={searchParams.get("expiryWithinDays") ?? `${report.stock.expiringSoon.withinDays}`}
            onValueChange={(v) => apply((p) => setParam(p, "expiryWithinDays", v))}
          >
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Expiry window" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Expiring ≤ 30 days</SelectItem>
              <SelectItem value="60">Expiring ≤ 60 days</SelectItem>
              <SelectItem value="90">Expiring ≤ 90 days</SelectItem>
              <SelectItem value="180">Expiring ≤ 180 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-border/60 shadow-sm ring-1 ring-border/40 lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Expiry distribution</CardTitle>
              <CardDescription>Number of batches by expiry window</CardDescription>
            </CardHeader>
            <CardContent>
              <SmallBarsChart
                data={report.stock.expiryBuckets.map((b) => ({
                  label: b.label.replace(" days", "d"),
                  value: b.count,
                }))}
                color="var(--muted-foreground)"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {report.stock.expiryBuckets.map((b) => (
                  <Badge key={b.label} variant="outline" className="h-7 px-2.5">
                    {b.label}: <span className="ml-1 tabular-nums">{b.count}</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm ring-1 ring-border/40 lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Low stock <span className="text-muted-foreground">({report.stock.lowStock.count})</span>
              </CardTitle>
              <CardDescription>Batches at or below reorder level</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drug</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.stock.lowStock.rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                        No low-stock batches.
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.stock.lowStock.rows.map((r) => (
                      <TableRow key={r.batchId}>
                        <TableCell className="font-medium">{r.drug}</TableCell>
                        <TableCell className="font-mono text-xs">{r.batch}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.qty}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm ring-1 ring-border/40 lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Expiring soon{" "}
                <span className="text-muted-foreground">
                  ({report.stock.expiringSoon.count})
                </span>
              </CardTitle>
              <CardDescription>
                Within {report.stock.expiringSoon.withinDays} days, with stock on hand
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drug</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.stock.expiringSoon.rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                        No expiring batches in this window.
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.stock.expiringSoon.rows.map((r) => (
                      <TableRow key={r.batchId}>
                        <TableCell className="font-medium">{r.drug}</TableCell>
                        <TableCell className="font-mono text-xs">{r.batch}</TableCell>
                        <TableCell>{format(new Date(r.expiry), "PP")}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.qty}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section D: Customer & repeat sales */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Patient & repeat sales</h2>
          <p className="text-sm text-muted-foreground">
            A quick view of returning patients (patient-linked sales only).
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard label="Unique patients" value={`${report.sales.repeat.uniquePatients}`} />
          <KpiCard label="Repeat patients" value={`${report.sales.repeat.repeatPatients}`} />
          <KpiCard
            label="Repeat rate"
            value={
              report.sales.repeat.repeatRatePct == null
                ? "—"
                : `${report.sales.repeat.repeatRatePct.toFixed(1)}%`
            }
            sublabel="Patient-linked sales with ≥2 purchases in range"
          />
        </div>
      </section>

      {/* Section E: AI insights */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">AI insights</h2>
          <p className="text-sm text-muted-foreground">
            Quick prompts + computed highlights (open the assistant for deeper analysis).
          </p>
        </div>

        <Card className="border-border/60 shadow-sm ring-1 ring-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Highlights</CardTitle>
            <CardDescription>Deterministic insights based on current filters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.insights.deterministic.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not enough data for highlights yet.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {report.insights.deterministic.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          {suggested.map((q) => (
            <Button
              key={q}
              type="button"
              variant="outline"
              className="h-8 rounded-full px-3 text-xs"
              onClick={() => ask(q)}
            >
              {q}
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}

