import Link from "next/link";
import { getDashboardStats, getProductMovementInsights } from "@/lib/actions/dashboard";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Banknote, CalendarClock, TrendingDown, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  const [stats, movement] = await Promise.all([
    getDashboardStats(),
    getProductMovementInsights(),
  ]);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Overview
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          Today&apos;s performance, stock health, and batches to watch before they expire.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card to-primary/[0.04] shadow-sm ring-1 ring-border/40 transition-shadow hover:shadow-md">
          <div className="pointer-events-none absolute -right-6 -top-6 size-28 rounded-full bg-primary/10 blur-2xl" />
          <CardHeader className="relative pb-2">
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/15">
              <Banknote className="size-5" strokeWidth={2} />
            </div>
            <CardDescription>Sales today</CardDescription>
            <CardTitle className="text-3xl tabular-nums tracking-tight">
              KES {stats?.salesTodayTotal ?? "0"}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative text-sm text-muted-foreground">
            {stats?.salesTodayCount ?? 0} completed sale
            {(stats?.salesTodayCount ?? 0) === 1 ? "" : "s"}
          </CardContent>
        </Card>

        {(stats?.lowStockCount ?? 0) > 0 ? (
          <Link
            href="/inventory/batches?lowStock=1"
            className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="relative h-full overflow-hidden border-border/60 bg-gradient-to-br from-card to-amber-500/[0.06] shadow-sm ring-1 ring-border/40 transition-shadow hover:shadow-md">
              <div className="pointer-events-none absolute -right-6 -top-6 size-28 rounded-full bg-amber-500/10 blur-2xl" />
              <CardHeader className="relative pb-2">
                <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-400">
                  <TrendingDown className="size-5" strokeWidth={2} />
                </div>
                <CardDescription>Low stock items</CardDescription>
                <CardTitle className="text-3xl tabular-nums tracking-tight">
                  {stats?.lowStockCount ?? 0}
                </CardTitle>
              </CardHeader>
              <CardContent className="relative text-sm text-muted-foreground">
                Batches at or below reorder level — tap to review
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card to-amber-500/[0.06] shadow-sm ring-1 ring-border/40 transition-shadow hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-6 size-28 rounded-full bg-amber-500/10 blur-2xl" />
            <CardHeader className="relative pb-2">
              <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-400">
                <TrendingDown className="size-5" strokeWidth={2} />
              </div>
              <CardDescription>Low stock items</CardDescription>
              <CardTitle className="text-3xl tabular-nums tracking-tight">
                {stats?.lowStockCount ?? 0}
              </CardTitle>
            </CardHeader>
            <CardContent className="relative text-sm text-muted-foreground">
              Batches at or below reorder level
            </CardContent>
          </Card>
        )}

        <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card to-sky-500/[0.06] shadow-sm ring-1 ring-border/40 transition-shadow hover:shadow-md">
          <div className="pointer-events-none absolute -right-6 -top-6 size-28 rounded-full bg-sky-500/10 blur-2xl" />
          <CardHeader className="relative pb-2">
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-sky-500/12 text-sky-700 ring-1 ring-sky-500/20 dark:text-sky-400">
              <CalendarClock className="size-5" strokeWidth={2} />
            </div>
            <CardDescription>Expiring within 90 days</CardDescription>
            <CardTitle className="text-3xl tabular-nums tracking-tight">
              {stats?.expiringSoonCount ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative text-sm text-muted-foreground">
            Earliest batches are listed below
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden border-border/60 shadow-sm ring-1 ring-border/40">
          <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-400">
                <TrendingUp className="size-4" strokeWidth={2} />
              </div>
              <div className="min-w-0 space-y-0.5">
                <CardTitle className="text-lg">
                  Fast movers ({movement?.periodDays ?? 30}d)
                </CardTitle>
                <CardDescription>
                  Highest quantity sold in the last {movement?.periodDays ?? 30} days
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0 pt-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="pl-6">Drug</TableHead>
                  <TableHead className="pr-6 text-right">Qty sold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(movement?.fastMovers ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No sales in this period yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  movement?.fastMovers.map((row) => (
                    <TableRow key={row.drugId} className="border-border/40">
                      <TableCell className="pl-6 font-medium">{row.name}</TableCell>
                      <TableCell className="pr-6 text-right tabular-nums">
                        {row.quantity}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/60 shadow-sm ring-1 ring-border/40">
          <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-border/60">
                <TrendingDown className="size-4" strokeWidth={2} />
              </div>
              <div className="min-w-0 space-y-0.5">
                <CardTitle className="text-lg">
                  Slow movers ({movement?.periodDays ?? 30}d)
                </CardTitle>
                <CardDescription>
                  Lowest turnover among drugs with at least one sale
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0 pt-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="pl-6">Drug</TableHead>
                  <TableHead className="pr-6 text-right">Qty sold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(movement?.slowMovers ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="py-10 text-center text-muted-foreground"
                    >
                      Not enough variety of sales to rank slow movers yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  movement?.slowMovers.map((row) => (
                    <TableRow key={row.drugId} className="border-border/40">
                      <TableCell className="pl-6 font-medium">{row.name}</TableCell>
                      <TableCell className="pr-6 text-right tabular-nums">
                        {row.quantity}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {(stats?.lowStockCount ?? 0) > 0 && (
        <Alert variant="destructive" className="border-destructive/40 shadow-sm">
          <AlertTriangle className="size-4" />
          <AlertTitle>Low stock</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {stats?.lowStockCount} batch{(stats?.lowStockCount ?? 0) === 1 ? "" : "es"} need
              restocking. Review inventory to avoid stockouts.
            </span>
            <Link
              href="/inventory/batches?lowStock=1"
              className="inline-flex w-fit shrink-0 items-center rounded-md border border-destructive/30 bg-background/80 px-3 py-1.5 text-sm font-medium text-destructive underline-offset-4 hover:underline"
            >
              View low-stock batches
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden border-border/60 shadow-sm ring-1 ring-border/40">
        <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
          <CardTitle className="text-lg">Expiry watch</CardTitle>
          <CardDescription>
            Batches with stock expiring in the next 90 days — FEFO picks these first
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pt-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="pl-6">Drug</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="pr-6 text-right">Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(stats?.expiringSoon ?? []).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No batches expiring in the next 90 days with stock on hand.
                  </TableCell>
                </TableRow>
              ) : (
                stats?.expiringSoon.map((row) => (
                  <TableRow key={row.id} className="border-border/40">
                    <TableCell className="pl-6 font-medium">{row.drugName}</TableCell>
                    <TableCell className="font-mono text-sm">{row.batchNumber}</TableCell>
                    <TableCell>
                      {new Date(row.expiryDate).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })}
                    </TableCell>
                    <TableCell className="pr-6 text-right tabular-nums">{row.qty}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
