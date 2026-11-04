"use client";

import { useEffect, useId } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { batchFormSchema, type BatchFormValues } from "@/lib/validations/batch";
import { upsertBatch } from "@/lib/actions/batches";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type BatchRow = {
  id: string;
  drugId: string;
  batchNumber: string;
  expiryDate: Date;
  quantityOnHand: number;
  supplierId: string | null;
  purchaseRef: string | null;
  unitCost: { toString(): string } | null;
};

export function BatchDialog({
  batch,
  drugs,
  suppliers,
  defaultDrugId,
  children,
}: {
  batch?: BatchRow | null;
  drugs: { id: string; genericName: string; internalCode: string }[];
  suppliers: { id: string; name: string }[];
  defaultDrugId?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const formId = useId();
  const form = useForm<BatchFormValues>({
    resolver: zodResolver(batchFormSchema) as Resolver<BatchFormValues>,
    defaultValues: {
      drugId: defaultDrugId ?? "",
      batchNumber: "",
      expiryDate: new Date().toISOString().slice(0, 10),
      quantityOnHand: 0,
      supplierId: null,
      purchaseRef: "",
      unitCost: null,
    },
  });

  useEffect(() => {
    if (batch) {
      form.reset({
        drugId: batch.drugId,
        batchNumber: batch.batchNumber,
        expiryDate: new Date(batch.expiryDate).toISOString().slice(0, 10),
        quantityOnHand: batch.quantityOnHand,
        supplierId: batch.supplierId,
        purchaseRef: batch.purchaseRef ?? "",
        unitCost: batch.unitCost != null ? Number(batch.unitCost) : null,
      });
    } else {
      form.reset({
        drugId: defaultDrugId ?? drugs[0]?.id ?? "",
        batchNumber: "",
        expiryDate: new Date().toISOString().slice(0, 10),
        quantityOnHand: 0,
        supplierId: null,
        purchaseRef: "",
        unitCost: null,
      });
    }
  }, [batch, drugs, defaultDrugId, form]);

  async function onSubmit(values: BatchFormValues) {
    try {
      await upsertBatch(values, batch?.id);
      toast.success(batch ? "Batch updated" : "Batch added");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{batch ? "Edit batch" : "Receive batch (FEFO)"}</DialogTitle>
        </DialogHeader>
        <form
          id={formId}
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col space-y-4"
        >
          <div className="space-y-2">
            <Label>Drug</Label>
            <Select
              value={form.watch("drugId")}
              onValueChange={(v) => form.setValue("drugId", v)}
              disabled={!!batch}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select drug" />
              </SelectTrigger>
              <SelectContent>
                {drugs.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.genericName} ({d.internalCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Batch / lot number</Label>
              <Input {...form.register("batchNumber")} />
            </div>
            <div className="space-y-2">
              <Label>Expiry date</Label>
              <Input
                type="date"
                {...form.register("expiryDate")}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Quantity on hand</Label>
              <Input type="number" {...form.register("quantityOnHand")} />
            </div>
            <div className="space-y-2">
              <Label>Unit cost (optional)</Label>
              <Input type="number" step="0.01" {...form.register("unitCost")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Supplier</Label>
            <Select
              value={form.watch("supplierId") ?? "__none__"}
              onValueChange={(v) =>
                form.setValue("supplierId", v === "__none__" ? null : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Purchase / invoice ref</Label>
            <Input {...form.register("purchaseRef")} />
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form={formId}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
