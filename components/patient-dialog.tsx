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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { upsertPatient } from "@/lib/actions/patients";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const schema = z.object({
  fullName: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  dob: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  marketingConsent: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

type PatientRow = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  dob: Date | string | null;
  notes: string | null;
  marketingConsent: boolean;
};

export function PatientDialog({
  patient,
  children,
}: {
  patient?: PatientRow | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const formId = useId();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      dob: "",
      notes: "",
      marketingConsent: false,
    },
  });

  useEffect(() => {
    if (patient) {
      form.reset({
        fullName: patient.fullName,
        phone: patient.phone ?? "",
        email: patient.email ?? "",
        dob: patient.dob
          ? typeof patient.dob === "string"
            ? patient.dob.slice(0, 10)
            : patient.dob.toISOString().slice(0, 10)
          : "",
        notes: patient.notes ?? "",
        marketingConsent: patient.marketingConsent,
      });
    } else {
      form.reset({
        fullName: "",
        phone: "",
        email: "",
        dob: "",
        notes: "",
        marketingConsent: false,
      });
    }
  }, [patient, form]);

  async function onSubmit(values: FormValues) {
    try {
      await upsertPatient(
        {
          fullName: values.fullName,
          phone: values.phone || null,
          email: values.email || null,
          dob: values.dob ? new Date(values.dob) : null,
          notes: values.notes || null,
          marketingConsent: values.marketingConsent,
        },
        patient?.id,
      );
      toast.success(patient ? "Patient updated" : "Patient added");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{patient ? "Edit patient" : "New patient"}</DialogTitle>
        </DialogHeader>
        <form
          id={formId}
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col space-y-4"
        >
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input {...form.register("fullName")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input {...form.register("phone")} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" {...form.register("email")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Date of birth</Label>
            <Input type="date" {...form.register("dob")} />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea rows={3} {...form.register("notes")} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={form.watch("marketingConsent")}
              onCheckedChange={(c) =>
                form.setValue("marketingConsent", c === true)
              }
            />
            <Label>Marketing consent (SMS / promos)</Label>
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
