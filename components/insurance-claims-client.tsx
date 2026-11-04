"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { PaymentStatus } from "@prisma/client";
import { toast } from "sonner";

import type { InsuranceClaimRow } from "@/lib/actions/insurance-claims";
import { listInsuranceClaims } from "@/lib/actions/insurance-claims";
import { setInsurancePaymentSettled } from "@/lib/actions/sales";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function fmtKes(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return `KES ${n.toFixed(2)}`;
}

type ClaimStatusTab = "pending" | "paid" | "all";

function statusLabel(s: ClaimStatusTab) {
  if (s === "pending") return "Pending";
  if (s === "paid") return "Paid";
  return "All";
}

type ClaimGroup = {
  schemeId: string;
  schemeName: string;
  schemeCode: string;
  pendingTotal: number;
  paidTotal: number;
  pendingCount: number;
  paidCount: number;
  rows: InsuranceClaimRow[];
};

export function InsuranceClaimsClient({
  initialClaims,
  initialStatus = "pending",
  initialSchemeId = "all",
  canSettleInsurance = true,
}: {
  initialClaims: InsuranceClaimRow[];
  initialStatus?: ClaimStatusTab;
  initialSchemeId?: string;
  canSettleInsurance?: boolean;
}) {
  const [claims, setClaims] = useState<InsuranceClaimRow[]>(initialClaims);
  const [status, setStatus] = useState<ClaimStatusTab>(initialStatus);
  const [schemeId, setSchemeId] = useState<string>(initialSchemeId);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    // Ensure counts/totals are stable across tabs by always loading "all" statuses.
    reload({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const schemes = useMemo(() => {
    const map = new Map<string, { id: string; name: string; code: string }>();
    for (const c of claims) {
      map.set(c.insuranceSchemeId, {
        id: c.insuranceSchemeId,
        name: c.insuranceSchemeName,
        code: c.insuranceSchemeCode,
      });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [claims]);

  const grouped = useMemo(() => {
    const by = new Map<string, ClaimGroup>();

    for (const c of claims) {
      const key = c.insuranceSchemeId;
      const cur =
        by.get(key) ??
        ({
          schemeId: c.insuranceSchemeId,
          schemeName: c.insuranceSchemeName,
          schemeCode: c.insuranceSchemeCode,
          pendingTotal: 0,
          paidTotal: 0,
          pendingCount: 0,
          paidCount: 0,
          rows: [],
        } satisfies ClaimGroup);

      cur.rows.push(c);
      if (c.status === PaymentStatus.PENDING) {
        cur.pendingTotal += c.amount;
        cur.pendingCount += 1;
      } else {
        cur.paidTotal += c.amount;
        cur.paidCount += 1;
      }
      by.set(key, cur);
    }

    return Array.from(by.values()).sort((a, b) => a.schemeName.localeCompare(b.schemeName));
  }, [claims]);

  const totals = useMemo(() => {
    let pendingTotal = 0;
    let paidTotal = 0;
    let pendingCount = 0;
    let paidCount = 0;
    for (const g of grouped) {
      pendingTotal += g.pendingTotal;
      paidTotal += g.paidTotal;
      pendingCount += g.pendingCount;
      paidCount += g.paidCount;
    }
    return { pendingTotal, paidTotal, pendingCount, paidCount };
  }, [grouped]);

  const hasRowsForCurrentTab = useMemo(() => {
    if (status === "all") return claims.length > 0;
    if (status === "pending") return claims.some((c) => c.status === PaymentStatus.PENDING);
    return claims.some((c) => c.status !== PaymentStatus.PENDING);
  }, [claims, status]);

  function reload(next: { status?: ClaimStatusTab; schemeId?: string }) {
    const nextSchemeId = next.schemeId ?? schemeId;
    startTransition(async () => {
      try {
        const res = await listInsuranceClaims({
          // Always load full set so tab counts don't change when toggling tabs.
          status: "all",
          insuranceSchemeId: nextSchemeId === "all" ? undefined : nextSchemeId,
          limit: 200,
        });
        setClaims(res);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load claims");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-semibold">Claims</div>
          <p className="text-muted-foreground text-xs">
            Track insurance payments: pending (owed) vs paid (settled).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={schemeId}
            onValueChange={(v) => {
              setSchemeId(v);
              reload({ schemeId: v });
            }}
          >
            <SelectTrigger className="h-9 w-[230px]">
              <SelectValue placeholder="All schemes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All schemes</SelectItem>
              {schemes.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs
        value={status}
        onValueChange={(v) => {
          const next = v as ClaimStatusTab;
          setStatus(next);
          reload({ status: next });
        }}
      >
        <TabsList>
          <TabsTrigger value="pending">
            Pending{" "}
            <span className="ml-1 tabular-nums text-xs text-muted-foreground">
              ({totals.pendingCount})
            </span>
          </TabsTrigger>
          <TabsTrigger value="paid">
            Paid{" "}
            <span className="ml-1 tabular-nums text-xs text-muted-foreground">
              ({totals.paidCount})
            </span>
          </TabsTrigger>
          <TabsTrigger value="all">
            All{" "}
            <span className="ml-1 tabular-nums text-xs text-muted-foreground">
              ({totals.pendingCount + totals.paidCount})
            </span>
          </TabsTrigger>
        </TabsList>

        {(["pending", "paid", "all"] as ClaimStatusTab[]).map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-3 pt-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="h-7 px-2.5">
                Pending: <span className="ml-1 tabular-nums">{fmtKes(totals.pendingTotal)}</span>
              </Badge>
              <Badge variant="outline" className="h-7 px-2.5">
                Paid: <span className="ml-1 tabular-nums">{fmtKes(totals.paidTotal)}</span>
              </Badge>
              <span className="ml-auto">{pending ? "Refreshing…" : statusLabel(tab)}</span>
            </div>

            {!hasRowsForCurrentTab ? (
              <p className="text-muted-foreground text-sm">No claims found.</p>
            ) : (
              grouped.map((g) => (
                <div key={g.schemeId} className="rounded-xl border border-border/60">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/20 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {g.schemeName}{" "}
                        <span className="text-muted-foreground font-mono text-xs">
                          ({g.schemeCode})
                        </span>
                      </div>
                      <div className="text-muted-foreground text-xs">
                        Pending {fmtKes(g.pendingTotal)} · Paid {fmtKes(g.paidTotal)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="secondary" className="h-7 px-2.5">
                        Pending: <span className="ml-1 tabular-nums">{g.pendingCount}</span>
                      </Badge>
                      <Badge variant="outline" className="h-7 px-2.5">
                        Paid: <span className="ml-1 tabular-nums">{g.paidCount}</span>
                      </Badge>
                    </div>
                  </div>

                  <div className="p-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sale</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>Member</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="w-[120px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(tab === "all"
                          ? g.rows
                          : g.rows.filter((c) =>
                              tab === "pending"
                                ? c.status === PaymentStatus.PENDING
                                : c.status !== PaymentStatus.PENDING,
                            )
                        ).map((c) => (
                          <TableRow key={c.paymentId}>
                            <TableCell className="font-medium">
                              <Link
                                href={`/pos/receipt/${c.saleId}`}
                                className="underline decoration-border/60 underline-offset-4 hover:decoration-foreground"
                              >
                                #{c.saleNumber}
                              </Link>
                              <div className="text-muted-foreground text-xs">
                                {new Date(c.saleCreatedAt).toLocaleString()}
                              </div>
                            </TableCell>
                            <TableCell>{c.patientName ?? "Walk-in"}</TableCell>
                            <TableCell className="text-xs">
                              <div className="font-mono">{c.memberRef ?? "—"}</div>
                              {c.policyRef ? (
                                <div className="text-muted-foreground font-mono">
                                  {c.policyRef}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              {c.status === PaymentStatus.PENDING ? (
                                <Badge variant="secondary">Pending</Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                                >
                                  Paid
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {fmtKes(c.amount)}
                            </TableCell>
                            <TableCell className="text-right">
                              {c.status === PaymentStatus.PENDING && canSettleInsurance ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-7 text-[11px]"
                                  disabled={pending}
                                  onClick={() => {
                                    startTransition(async () => {
                                      try {
                                        await setInsurancePaymentSettled(c.paymentId);
                                        toast.success("Marked as paid");
                                        reload({});
                                      } catch (e) {
                                        toast.error(
                                          e instanceof Error ? e.message : "Failed to update",
                                        );
                                      }
                                    });
                                  }}
                                >
                                  Mark paid
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

