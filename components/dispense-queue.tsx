"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { markPosOrderDispensed } from "@/lib/actions/pos-orders";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ReadyOrder = Awaited<
  ReturnType<typeof import("@/lib/actions/pos-orders").listReadyToDispensePosOrders>
>[number];

export function DispenseQueue({ initialOrders }: { initialOrders: ReadyOrder[] }) {
  const router = useRouter();
  const [orders, setOrders] = useState<ReadyOrder[]>(initialOrders);
  const [pending, startTransition] = useTransition();
  const [ddaOnly, setDdaOnly] = useState(false);

  const sorted = useMemo(() => {
    return [...orders].sort((a, b) => {
      const at =
        (a.sentToDispenseAt ? new Date(a.sentToDispenseAt).getTime() : null) ??
        new Date(a.createdAt).getTime();
      const bt =
        (b.sentToDispenseAt ? new Date(b.sentToDispenseAt).getTime() : null) ??
        new Date(b.createdAt).getTime();
      return at - bt;
    });
  }, [orders]);

  const visible = useMemo(() => {
    if (!ddaOnly) return sorted;
    return sorted.filter((o) => o.hasDda);
  }, [sorted, ddaOnly]);

  function onMarkDispensed(id: string) {
    startTransition(async () => {
      try {
        await markPosOrderDispensed(id);
        toast.success("Marked dispensed");
        setOrders((prev) => prev.filter((o) => o.id !== id));
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ready to dispense</CardTitle>
        <CardDescription>
          These orders have been paid and sent by the cashier.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setDdaOnly((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors",
              ddaOnly ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:bg-muted/50",
            )}
            title="Show only orders containing controlled (DDA) drugs"
          >
            <Badge variant={ddaOnly ? "destructive" : "outline"} className="h-5 px-1.5 text-[10px]">
              DDA
            </Badge>
            DDA only
          </button>
        </div>

        {visible.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing pending dispensing.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium">{o.patient?.fullName ?? "Walk-in"}</div>
                      {o.hasDda ? (
                        <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                          DDA
                        </Badge>
                      ) : null}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      From {o.createdBy?.name ?? "PharmTech"} · Cashier {o.pickedBy?.name ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {o.lines.slice(0, 3).map((l) => l.drug.genericName).join(", ")}
                    {o.lines.length > 3 ? ` +${o.lines.length - 3} more` : ""}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    KES {Number(o.totalSnapshot).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {o.saleId ? (
                      <div className="flex flex-col items-start gap-0.5">
                        <Button variant="link" size="sm" className="h-auto p-0" asChild>
                          <Link
                            href={`/pos/dispense/receipt/${o.saleId}`}
                            rel="noreferrer"
                            title="Opens receipt in a new tab"
                            className="underline"
                          >
                            View Receipt
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                    {o.prescriptionPhotoUrl ? (
                      <div>
                        <a
                          className="underline text-xs"
                          href={o.prescriptionPhotoUrl}
                          rel="noreferrer"
                        >
                          Rx document
                        </a>
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending}
                      onClick={() => onMarkDispensed(o.id)}
                    >
                      Mark dispensed
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
