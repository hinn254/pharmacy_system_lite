"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { InsuranceInvoiceStatus } from "@prisma/client";

import type { InsuranceInvoiceListRow } from "@/lib/actions/insurance-invoices";
import {
  createInsuranceInvoice,
  listInsuranceInvoices,
  setInsuranceInvoiceStatus,
} from "@/lib/actions/insurance-invoices";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function fmtKes(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return `KES ${n.toFixed(2)}`;
}

type InvoiceListFilter = "all" | "outstanding" | "paid";

function matchesInvoiceFilter(status: InsuranceInvoiceStatus, filter: InvoiceListFilter) {
  switch (filter) {
    case "paid":
      return status === "PAID";
    case "outstanding":
      return status !== "PAID";
    default:
      return true;
  }
}

function statusPill(s: InsuranceInvoiceStatus) {
  switch (s) {
    case "DRAFT":
      return <Badge variant="secondary">Draft</Badge>;
    case "SUBMITTED":
      return <Badge variant="outline">Submitted</Badge>;
    case "PARTIALLY_PAID":
      return (
        <Badge
          variant="outline"
          className="border-amber-500/40 text-amber-700 dark:text-amber-400"
        >
          Part-paid
        </Badge>
      );
    case "PAID":
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
        >
          Paid
        </Badge>
      );
    case "VOIDED":
      return (
        <Badge
          variant="outline"
          className="border-rose-500/40 text-rose-700 dark:text-rose-400"
        >
          Voided
        </Badge>
      );
  }
}

export function InsuranceInvoicesClient({
  initialInvoices,
  schemes,
}: {
  initialInvoices: InsuranceInvoiceListRow[];
  schemes: { id: string; name: string; code: string }[];
}) {
  const [invoices, setInvoices] = useState<InsuranceInvoiceListRow[]>(initialInvoices);
  const [pending, startTransition] = useTransition();

  const [schemeId, setSchemeId] = useState<string>(schemes[0]?.id ?? "");
  const [periodFrom, setPeriodFrom] = useState<string>("");
  const [periodTo, setPeriodTo] = useState<string>("");
  const [dueAt, setDueAt] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [listFilter, setListFilter] = useState<InvoiceListFilter>("outstanding");

  const schemeOptions = useMemo(
    () => [...schemes].sort((a, b) => a.name.localeCompare(b.name)),
    [schemes],
  );

  const invoiceCounts = useMemo(() => {
    let paid = 0;
    let outstanding = 0;
    for (const inv of invoices) {
      if (inv.status === "PAID") paid += 1;
      else outstanding += 1;
    }
    return { total: invoices.length, paid, outstanding };
  }, [invoices]);

  const filteredInvoices = useMemo(
    () => invoices.filter((r) => matchesInvoiceFilter(r.status, listFilter)),
    [invoices, listFilter],
  );

  function reload() {
    startTransition(async () => {
      try {
        const res = await listInsuranceInvoices({ limit: 200 });
        setInvoices(res);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load invoices");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle>Create invoice</CardTitle>
          <CardDescription>
            Generates an invoice by grouping pending insurance claims (unsettled insurance payments) for a scheme.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Scheme</Label>
              <Select value={schemeId} onValueChange={setSchemeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select scheme" />
                </SelectTrigger>
                <SelectContent>
                  {schemeOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due date (optional)</Label>
              <Input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Period from (optional)</Label>
              <Input
                type="datetime-local"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Period to (optional)</Label>
              <Input
                type="datetime-local"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              disabled={pending || !schemeId}
              onClick={() => {
                startTransition(async () => {
                  try {
                    const created = await createInsuranceInvoice({
                      insuranceSchemeId: schemeId,
                      periodFrom: periodFrom ? new Date(periodFrom).toISOString() : null,
                      periodTo: periodTo ? new Date(periodTo).toISOString() : null,
                      dueAt: dueAt ? new Date(dueAt).toISOString() : null,
                      notes,
                    });
                    toast.success("Invoice created");
                    setNotes("");
                    reload();
                    // Open print view in same tab (faster for ops)
                    window.location.href = `/admin/insurers/invoices/${created.id}/print`;
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed to create invoice");
                  }
                });
              }}
            >
              {pending ? "Working…" : "Create & print"}
            </Button>

            <Button type="button" variant="outline" disabled={pending} onClick={reload}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Printable insurer invoices with tracked statuses.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                <span className="text-foreground font-medium tabular-nums">
                  {invoiceCounts.total}
                </span>{" "}
                total —{" "}
                <span className="tabular-nums text-foreground">{invoiceCounts.outstanding}</span>{" "}
                not fully paid,{" "}
                <span className="tabular-nums text-emerald-700 dark:text-emerald-400">
                  {invoiceCounts.paid}
                </span>{" "}
                paid
              </p>
              <span>{pending ? "Refreshing…" : "Ready"}</span>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[220px]">
              <Label className="text-xs">Show</Label>
              <Select
                value={listFilter}
                onValueChange={(v) => setListFilter(v as InvoiceListFilter)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outstanding">
                    Not paid (draft, submitted, part-paid, voided)
                  </SelectItem>
                  <SelectItem value="paid">Paid only</SelectItem>
                  <SelectItem value="all">All invoices</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Scheme</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Claims</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[260px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      No invoices yet.
                    </TableCell>
                  </TableRow>
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      No invoices match this filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <div className="font-mono">INV #{r.invoiceNumber}</div>
                        <div className="text-muted-foreground text-xs">
                          {new Date(r.createdAt).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{r.schemeName}</div>
                        <div className="text-muted-foreground font-mono text-xs">
                          {r.schemeCode}
                        </div>
                      </TableCell>
                      <TableCell>{statusPill(r.status)}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.lineCount}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtKes(r.total)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
                            <Link href={`/admin/insurers/invoices/${r.id}/print`}>Print</Link>
                          </Button>
                          {r.status !== "SUBMITTED" && r.status !== "PAID" && r.status !== "VOIDED" ? (
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 text-[11px]"
                              disabled={pending}
                              onClick={() => {
                                startTransition(async () => {
                                  try {
                                    await setInsuranceInvoiceStatus({ id: r.id, status: "SUBMITTED" });
                                    toast.success("Marked submitted");
                                    reload();
                                  } catch (e) {
                                    toast.error(e instanceof Error ? e.message : "Failed to update");
                                  }
                                });
                              }}
                            >
                              Mark submitted
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

