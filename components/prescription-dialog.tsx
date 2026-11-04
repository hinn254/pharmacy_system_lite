"use client";

import { useId } from "react";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
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
import { createPrescription } from "@/lib/actions/patients";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  patientId: z.string().min(1),
  prescriberName: z.string().optional().nullable(),
  rxNumber: z.string().optional().nullable(),
  issuedAt: z.string().optional().nullable(),
  refillDueAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(
    z.object({
      drugId: z.string().min(1),
      quantity: z.coerce.number().int().positive(),
      instructions: z.string().optional().nullable(),
    }),
  ),
});

type FormValues = z.infer<typeof schema>;

export function PrescriptionDialog({
  patientId,
  drugs,
  children,
}: {
  patientId: string;
  drugs: { id: string; genericName: string }[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const formId = useId();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      patientId,
      prescriberName: "",
      rxNumber: "",
      issuedAt: "",
      refillDueAt: "",
      notes: "",
      items: [{ drugId: drugs[0]?.id ?? "", quantity: 1, instructions: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  async function onSubmit(values: FormValues) {
    try {
      await createPrescription({
        patientId: values.patientId,
        prescriberName: values.prescriberName,
        rxNumber: values.rxNumber,
        issuedAt: values.issuedAt ? new Date(values.issuedAt) : null,
        refillDueAt: values.refillDueAt ? new Date(values.refillDueAt) : null,
        notes: values.notes,
        items: values.items,
      });
      toast.success("Prescription saved");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add prescription</DialogTitle>
        </DialogHeader>
        <form
          id={formId}
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto"
        >
          <input type="hidden" {...form.register("patientId")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Prescriber</Label>
              <Input {...form.register("prescriberName")} />
            </div>
            <div className="space-y-2">
              <Label>Rx number</Label>
              <Input {...form.register("rxNumber")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Issued</Label>
              <Input type="date" {...form.register("issuedAt")} />
            </div>
            <div className="space-y-2">
              <Label>Refill due</Label>
              <Input type="date" {...form.register("refillDueAt")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input {...form.register("notes")} />
          </div>
          <div className="space-y-2">
            <Label>Line items</Label>
            {fields.map((field, i) => (
              <div key={field.id} className="flex flex-wrap gap-2 items-end">
                <Select
                  value={form.watch(`items.${i}.drugId`)}
                  onValueChange={(v) => form.setValue(`items.${i}.drugId`, v)}
                >
                  <SelectTrigger className="flex-1 min-w-[180px]">
                    <SelectValue placeholder="Drug" />
                  </SelectTrigger>
                  <SelectContent>
                    {drugs.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.genericName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  className="w-20"
                  {...form.register(`items.${i}.quantity`)}
                />
                <Input
                  placeholder="Sig"
                  className="flex-1 min-w-[120px]"
                  {...form.register(`items.${i}.instructions`)}
                />
                {fields.length > 1 && (
                  <Button type="button" variant="ghost" onClick={() => remove(i)}>
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  drugId: drugs[0]?.id ?? "",
                  quantity: 1,
                  instructions: "",
                })
              }
            >
              Add line
            </Button>
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form={formId}>
            Save prescription
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
