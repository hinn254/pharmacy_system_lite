import Link from "next/link";
import { PaymentMethod } from "@prisma/client";
import { FileText, Tag } from "lucide-react";
import { auth } from "@/auth";
import { listSalesForAdmin } from "@/lib/actions/sales";
import { AdminInsurancePaymentsCell } from "@/components/admin-insurance-payments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatKes(value: unknown) {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return `KES ${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}

function pick(sp: Record<string, string | string[] | undefined>, k: string) {
  const v = sp[k];
  return Array.isArray(v) ? v[0] : v;
}

function coerceSaleStatus(v: string | undefined): "COMPLETED" | "VOIDED" {
  return v === "VOIDED" ? "VOIDED" : "COMPLETED";
}

function coercePaymentMethod(v: string | undefined): PaymentMethod | undefined {
  if (!v) return undefined;
  return (Object.values(PaymentMethod) as string[]).includes(v)
    ? (v as PaymentMethod)
    : undefined;
}

function paymentMethodLabel(m: PaymentMethod) {
  switch (m) {
    case "CASH":
      return "Cash";
    case "MPESA_STK":
      return "M-Pesa STK";
    case "MPESA_MANUAL":
      return "M-Pesa manual";
    case "INSURANCE":
      return "Insurance";
    default:
      return m;
  }
}

function buildFilterSummary(parts: string[]) {
  if (parts.length === 0) return "No filters — showing the most recent sales.";
  return `Filters: ${parts.join(" · ")}`;
}

export default async function AdminSalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = (pick(sp, "q") ?? "").trim();
  const dateFrom = pick(sp, "from") ?? "";
  const dateTo = pick(sp, "to") ?? "";
  const methodRaw = pick(sp, "method") ?? "";
  const pendingInsurance = pick(sp, "pendingInsurance") === "1";
  const status = coerceSaleStatus(pick(sp, "status"));

  const paymentMethod = coercePaymentMethod(methodRaw || undefined);

  const sales = await listSalesForAdmin({
    limit: 400,
    status,
    ...(q ? { search: q } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    ...(paymentMethod ? { paymentMethod } : {}),
    ...(pendingInsurance ? { insurancePendingOnly: true } : {}),
  });

  const session = await auth();
  const role = session?.user?.role ?? "CASHIER";

  const filterParts: string[] = [];
  if (q) filterParts.push(`search “${q}”`);
  if (dateFrom) filterParts.push(`from ${dateFrom}`);
  if (dateTo) filterParts.push(`to ${dateTo}`);
  if (paymentMethod) filterParts.push(paymentMethodLabel(paymentMethod));
  if (pendingInsurance) filterParts.push("pending insurance only");
  if (status === "VOIDED") filterParts.push("voided sales");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sales</h1>
          <p className="text-muted-foreground text-sm">
            Invoices with line items, payments, and receipts — use filters to narrow the list
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={role === "CASHIER" ? "/pos/cashier" : "/pos"}>Open POS</Link>
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/50 bg-muted/15 pb-4">
          <CardTitle className="text-base font-medium">Search &amp; filters</CardTitle>
          <CardDescription>
            Matches invoice number, patient name, cashier, or drug on the sale. Dates use UTC
            calendar days.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <form method="get" className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="sales-q">Search</Label>
                <Input
                  id="sales-q"
                  name="q"
                  type="search"
                  placeholder="Invoice #, patient, cashier, drug…"
                  defaultValue={q}
                  autoComplete="off"
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sales-from">From</Label>
                <Input
                  id="sales-from"
                  name="from"
                  type="date"
                  defaultValue={dateFrom}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sales-to">To</Label>
                <Input id="sales-to" name="to" type="date" defaultValue={dateTo} className="h-9" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sales-status">Sale status</Label>
                <select
                  id="sales-status"
                  name="status"
                  defaultValue={status}
                  className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-[3px] dark:bg-input/30"
                >
                  <option value="COMPLETED">Completed</option>
                  <option value="VOIDED">Voided</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sales-method">Payment method</Label>
                <select
                  id="sales-method"
                  name="method"
                  defaultValue={methodRaw}
                  className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-[3px] dark:bg-input/30"
                >
                  <option value="">Any</option>
                  {(Object.values(PaymentMethod) as PaymentMethod[]).map((m) => (
                    <option key={m} value={m}>
                      {paymentMethodLabel(m)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="pendingInsurance"
                  value="1"
                  defaultChecked={pendingInsurance}
                  className="border-input size-4 rounded accent-primary"
                />
                <span>Pending insurance only</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" size="sm">
                  Apply filters
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin/sales">Clear all</Link>
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle>Invoices</CardTitle>
          <CardDescription className="space-y-1">
            <span>
              {sales.length} result{sales.length === 1 ? "" : "s"}
              {sales.length >= 400 ? " (limit 400 — refine filters if needed)" : ""}
            </span>
            <span className="text-muted-foreground block text-xs font-normal">
              {buildFilterSummary(filterParts)}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pt-0">
          <div className="rounded-b-xl">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow className="border-border/50 bg-muted/30 hover:bg-transparent">
                  <TableHead className="w-[7.5rem] pl-6">Invoice</TableHead>
                  <TableHead className="min-w-[11rem] max-w-[14rem]">Customer &amp; cashier</TableHead>
                  <TableHead className="min-w-[12rem] max-w-[20rem]">Items</TableHead>
                  <TableHead className="w-[6.5rem]">Pay</TableHead>
                  <TableHead className="min-w-[7rem] max-w-[9rem]">Insurance</TableHead>
                  <TableHead className="w-[6rem] text-right">Total</TableHead>
                  <TableHead className="w-[5.5rem] pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-14 text-center text-muted-foreground"
                    >
                      No sales match these filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((s) => {
                    const customer = s.patient?.fullName ?? "Walk-in";
                    const cashier = s.createdBy.name ?? s.createdBy.email;
                    const contact = [s.patient?.phone, s.patient?.email].filter(Boolean).join(" · ");
                    const linesSummary = s.lines
                      .map((l) => `${l.drug.genericName} ×${l.quantity}`)
                      .join(", ");
                    const preview = s.lines
                      .slice(0, 2)
                      .map((l) => `${l.drug.genericName} ×${l.quantity}`)
                      .join(", ");
                    const more =
                      s.lines.length > 2 ? ` +${s.lines.length - 2} more` : "";
                    const paymentMethods = Array.from(new Set(s.payments.map((p) => p.method)));
                    const createdAt =
                      typeof s.createdAt === "string" ? new Date(s.createdAt) : s.createdAt;

                    return (
                      <TableRow key={s.id} className="border-border/40 align-top">
                        <TableCell className="pl-6">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold tabular-nums text-foreground">
                              #{s.saleNumber}
                            </span>
                            <time
                              className="text-muted-foreground text-xs tabular-nums"
                              dateTime={createdAt.toISOString()}
                            >
                              {createdAt.toLocaleString(undefined, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </time>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[14rem]">
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate font-medium" title={customer}>
                              {customer}
                            </span>
                            {contact ? (
                              <span
                                className="text-muted-foreground truncate text-xs"
                                title={contact}
                              >
                                {contact}
                              </span>
                            ) : null}
                            <span
                              className="text-muted-foreground truncate text-xs"
                              title={cashier}
                            >
                              <span className="text-muted-foreground/80">By </span>
                              {cashier}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[20rem] whitespace-normal">
                          <div className="flex flex-col gap-1">
                            <Badge variant="secondary" className="w-fit text-[10px] font-normal">
                              {s.lines.length} line{s.lines.length === 1 ? "" : "s"}
                            </Badge>
                            <p
                              className="text-foreground line-clamp-2 text-xs leading-relaxed"
                              title={linesSummary || undefined}
                            >
                              <span>{preview || "—"}</span>
                              {more ? (
                                <span className="text-muted-foreground">{more}</span>
                              ) : null}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <div className="flex max-w-[6.5rem] flex-col gap-1">
                            {paymentMethods.length === 0 ? (
                              <Badge variant="secondary" className="text-[10px]">
                                —
                              </Badge>
                            ) : (
                              paymentMethods.map((m) => (
                                <Badge
                                  key={m}
                                  variant="outline"
                                  className="justify-center px-1.5 py-0 text-[10px] font-normal"
                                >
                                  {paymentMethodLabel(m)}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[9rem] whitespace-normal">
                          <AdminInsurancePaymentsCell
                            payments={s.payments}
                            canSettleInsurance={role === "ADMIN"}
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatKes(s.total)}
                        </TableCell>
                        <TableCell className="pr-6">
                          <div className="flex flex-col items-end gap-1">
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 px-2 text-xs"
                            >
                              <Link href={`/pos/receipt/${s.id}`} title="View receipt">
                                <FileText className="size-3.5 shrink-0 opacity-70" />
                                Receipt
                              </Link>
                            </Button>
                            <Button
                              asChild
                              size="sm"
                              variant="ghost"
                              className="h-8 gap-1 px-2 text-xs"
                            >
                              <Link href={`/pos/receipt/${s.id}/labels`} title="Print labels">
                                <Tag className="size-3.5 shrink-0 opacity-70" />
                                Labels
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
