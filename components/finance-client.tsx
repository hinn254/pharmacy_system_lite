"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ExpenseCategory } from "@prisma/client";

import type { ExpenseRow } from "@/lib/actions/expenses";
import { createExpense, listExpenses } from "@/lib/actions/expenses";

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

export function FinanceClient({
  initialExpenses,
  range,
  expenseSearch,
}: {
  initialExpenses: ExpenseRow[];
  range: { from: string; to: string };
  expenseSearch: string;
}) {
  const [expenses, setExpenses] = useState<ExpenseRow[]>(initialExpenses);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setExpenses(initialExpenses);
  }, [initialExpenses]);

  const [category, setCategory] = useState<ExpenseCategory>("OTHER");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [spentAt, setSpentAt] = useState("");
  const [reference, setReference] = useState("");

  const totalExpenses = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses],
  );

  function reload() {
    startTransition(async () => {
      try {
        const res = await listExpenses({
          from: range.from,
          to: range.to,
          limit: 200,
          ...(expenseSearch ? { search: expenseSearch } : {}),
        });
        setExpenses(res);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load expenses");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle>Add expense</CardTitle>
          <CardDescription>Lightweight expense capture for net profit reporting.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ExpenseCategory).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.replaceAll("_", " ").toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Rent for April" />
            </div>
            <div className="space-y-2">
              <Label>Date/time (optional)</Label>
              <Input type="datetime-local" value={spentAt} onChange={(e) => setSpentAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Reference (optional)</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Receipt / voucher no." />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  try {
                    const v = Number(amount || 0);
                    if (!description.trim()) throw new Error("Enter a description.");
                    if (!Number.isFinite(v) || v <= 0) throw new Error("Enter a valid amount.");
                    await createExpense({
                      category,
                      description,
                      amount: v,
                      spentAt: spentAt ? new Date(spentAt).toISOString() : null,
                      reference,
                    });
                    toast.success("Expense added");
                    setDescription("");
                    setAmount("");
                    setSpentAt("");
                    setReference("");
                    reload();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed to add expense");
                  }
                });
              }}
            >
              Add expense
            </Button>
            <Button type="button" variant="outline" disabled={pending} onClick={reload}>
              Refresh
            </Button>
            <Button asChild type="button" variant="outline" className="ml-auto">
              <Link
                href={`/admin/finance/print?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}${expenseSearch ? `&q=${encodeURIComponent(expenseSearch)}` : ""}`}
              >
                Print finance report
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle>Expenses</CardTitle>
          <CardDescription>
            {expenseSearch.trim() ? (
              <>
                Matching “{expenseSearch.trim()}”:{" "}
                <span className="font-medium">{fmtKes(totalExpenses)}</span>
              </>
            ) : (
              <>
                Total for selected range: <span className="font-medium">{fmtKes(totalExpenses)}</span>
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No expenses for this range.
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm">
                        {new Date(e.spentAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[11px]">
                          {e.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {e.description}
                        {e.reference ? (
                          <div className="text-xs text-muted-foreground font-mono">{e.reference}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {fmtKes(e.amount)}
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

