"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { SupplierBillStatus, SupplierPaymentMethod } from "@prisma/client";

import type { SupplierBillRow } from "@/lib/actions/supplier-payables";
import { createSupplierBill, listSupplierBills, paySupplierBill } from "@/lib/actions/supplier-payables";

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

type StatusFilter = "ALL" | SupplierBillStatus;

function statusPill(s: SupplierBillStatus, overdue: boolean) {
  if (s === "PAID") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
      >
        Paid
      </Badge>
    );
  }
  if (s === "PARTIALLY_PAID") {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/40 text-amber-700 dark:text-amber-400"
      >
        Part-paid
      </Badge>
    );
  }
  if (overdue) return <Badge variant="secondary">Overdue</Badge>;
  return <Badge variant="outline">Unpaid</Badge>;
}

export function SupplierPayablesClient({
  initialBills,
  suppliers,
}: {
  initialBills: SupplierBillRow[];
  suppliers: { id: string; name: string }[];
}) {
  const [bills, setBills] = useState<SupplierBillRow[]>(initialBills);
  const [pending, startTransition] = useTransition();

  const [supplierId, setSupplierId] = useState<string>("all");
  const [status, setStatus] = useState<StatusFilter>("ALL");

  const [newSupplierId, setNewSupplierId] = useState<string>(suppliers[0]?.id ?? "");
  const [billNumber, setBillNumber] = useState("");
  const [billDate, setBillDate] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [taxAmount, setTaxAmount] = useState("");

  const supplierOptions = useMemo(
    () => [...suppliers].sort((a, b) => a.name.localeCompare(b.name)),
    [suppliers],
  );

  const totals = useMemo(() => {
    let balance = 0;
    let overdue = 0;
    for (const b of bills) {
      balance += b.balance;
      if (b.isOverdue) overdue += b.balance;
    }
    return { balance, overdue };
  }, [bills]);

  function reload(next?: { supplierId?: string; status?: StatusFilter }) {
    const nextSupplierId = next?.supplierId ?? supplierId;
    const nextStatus = next?.status ?? status;
    startTransition(async () => {
      try {
        const res = await listSupplierBills({
          supplierId: nextSupplierId === "all" ? undefined : nextSupplierId,
          status: nextStatus === "ALL" ? "ALL" : nextStatus,
          limit: 300,
        });
        setBills(res);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load bills");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle>Record supplier bill</CardTitle>
          <CardDescription>
            Track what you owe suppliers. Payments you record will automatically reduce the outstanding balance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={newSupplierId} onValueChange={setNewSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {supplierOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bill / invoice number (optional)</Label>
              <Input value={billNumber} onChange={(e) => setBillNumber(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Bill date (optional)</Label>
              <Input type="datetime-local" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Due date (optional)</Label>
              <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Subtotal</Label>
              <Input inputMode="decimal" value={subtotal} onChange={(e) => setSubtotal(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Tax (optional)</Label>
              <Input inputMode="decimal" value={taxAmount} onChange={(e) => setTaxAmount(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={pending || !newSupplierId}
              onClick={() => {
                startTransition(async () => {
                  try {
                    const sub = Number(subtotal || 0);
                    const tax = Number(taxAmount || 0);
                    if (!Number.isFinite(sub) || sub < 0.01) {
                      throw new Error("Enter a valid subtotal amount.");
                    }
                    await createSupplierBill({
                      supplierId: newSupplierId,
                      billNumber,
                      billDate: billDate ? new Date(billDate).toISOString() : null,
                      dueAt: dueAt ? new Date(dueAt).toISOString() : null,
                      subtotal: sub,
                      taxAmount: Number.isFinite(tax) ? tax : 0,
                    });
                    toast.success("Bill recorded");
                    setBillNumber("");
                    setBillDate("");
                    setDueAt("");
                    setSubtotal("");
                    setTaxAmount("");
                    reload();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed to record bill");
                  }
                });
              }}
            >
              Record bill
            </Button>

            <Button type="button" variant="outline" disabled={pending} onClick={() => reload()}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle>Payables</CardTitle>
          <CardDescription>
            Outstanding balance: <span className="font-medium">{fmtKes(totals.balance)}</span>
            {totals.overdue > 0 ? (
              <>
                {" "}· Overdue: <span className="font-medium">{fmtKes(totals.overdue)}</span>
              </>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select
                value={supplierId}
                onValueChange={(v) => {
                  setSupplierId(v);
                  reload({ supplierId: v });
                }}
              >
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder="All suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All suppliers</SelectItem>
                  {supplierOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => {
                  const next = v as StatusFilter;
                  setStatus(next);
                  reload({ status: next });
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                  <SelectItem value="PARTIALLY_PAID">Part-paid</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto text-xs text-muted-foreground">
              {pending ? "Refreshing…" : `${bills.length} bill(s)`}
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Bill</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="w-[220px] text-right">Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">
                      No bills found.
                    </TableCell>
                  </TableRow>
                ) : (
                  bills.map((b) => (
                    <PayableRow
                      key={b.id}
                      row={b}
                      disabled={pending}
                      onPaid={() => reload()}
                    />
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

function PayableRow({
  row,
  disabled,
  onPaid,
}: {
  row: SupplierBillRow;
  disabled: boolean;
  onPaid: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<SupplierPaymentMethod>("OTHER");
  const [pending, startTransition] = useTransition();

  const canPay = row.balance > 0.009;

  return (
    <TableRow>
      <TableCell className="font-medium">{row.supplierName}</TableCell>
      <TableCell>
        <div className="font-mono text-xs">{row.billNumber ?? row.id}</div>
        <div className="text-muted-foreground text-xs">
          {new Date(row.billDate).toLocaleDateString()}
          {row.dueAt ? ` · due ${new Date(row.dueAt).toLocaleDateString()}` : ""}
        </div>
      </TableCell>
      <TableCell>{statusPill(row.status, row.isOverdue)}</TableCell>
      <TableCell className="text-right tabular-nums">{fmtKes(row.total)}</TableCell>
      <TableCell className="text-right tabular-nums">{fmtKes(row.paid)}</TableCell>
      <TableCell className="text-right tabular-nums font-medium">{fmtKes(row.balance)}</TableCell>
      <TableCell className="text-right">
        {canPay ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Input
              className="h-8 w-[110px]"
              inputMode="decimal"
              placeholder={row.balance.toFixed(2)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={disabled || pending}
            />
            <Select value={method} onValueChange={(v) => setMethod(v as SupplierPaymentMethod)}>
              <SelectTrigger className="h-8 w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="MPESA">M-Pesa</SelectItem>
                <SelectItem value="BANK">Bank</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              className="h-8 text-[11px]"
              disabled={disabled || pending}
              onClick={() => {
                startTransition(async () => {
                  try {
                    const v = Number(amount || 0);
                    if (!Number.isFinite(v) || v <= 0) {
                      throw new Error("Enter a valid payment amount.");
                    }
                    await paySupplierBill({
                      supplierBillId: row.id,
                      amount: v,
                      method,
                    });
                    toast.success("Payment recorded");
                    setAmount("");
                    onPaid();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed to record payment");
                  }
                });
              }}
            >
              Pay
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}

