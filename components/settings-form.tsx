"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  updateOrganizationSettings,
  uploadOrganizationLogo,
} from "@/lib/actions/settings";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const schema = z.object({
  businessName: z.string().max(120).optional().nullable(),
  businessTagline: z.string().max(160).optional().nullable(),
  website: z.string().max(200).optional().nullable(),
  phoneNumber: z.string().max(50).optional().nullable(),
  email: z.string().max(120).optional().nullable(),
  controlledDrugCategoryIds: z.array(z.string()),
  taxRatePercent: z.coerce.number().min(0).max(100),
  receiptHeader: z.string().optional().nullable(),
  receiptFooter: z.string().optional().nullable(),
  defaultLowStockDays: z.coerce.number().int().positive().optional().nullable(),
  mpesaEnvironment: z.enum(["sandbox", "production"]),
  insuranceNotes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

export function SettingsForm({
  initial,
  categories,
}: {
  initial: {
    businessName: string | null;
    businessTagline: string | null;
    website: string | null;
    phoneNumber: string | null;
    email: string | null;
    logoUrl: string | null;
    taxRatePercent: { toString(): string };
    receiptHeader: string | null;
    receiptFooter: string | null;
    controlledDrugCategoryIds: string[];
    defaultLowStockDays: number | null;
    mpesaEnvironment: string;
    insuranceNotes: string | null;
  } | null;
  categories: { id: string; name: string; slug: string; _count: { drugs: number } }[];
}) {
  const router = useRouter();
  const [isUploadingLogo, startLogoTransition] = useTransition();
  const [selectedLogoPreview, setSelectedLogoPreview] = useState<string | null>(
    null
  );
  const [logoVersion, setLogoVersion] = useState(0);

  const currentLogoSrc = useMemo(() => {
    const src = selectedLogoPreview ?? initial?.logoUrl ?? null;
    if (!src) return null;
    if (src.startsWith("blob:")) return src;
    return `${src}?v=${logoVersion}`;
  }, [initial, selectedLogoPreview, logoVersion]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      businessName: "",
      businessTagline: "",
      website: "",
      phoneNumber: "",
      email: "",
      controlledDrugCategoryIds: [],
      taxRatePercent: 16,
      receiptHeader: "",
      receiptFooter: "",
      defaultLowStockDays: 90,
      mpesaEnvironment: "sandbox",
      insuranceNotes: "",
    },
  });

  useEffect(() => {
    if (initial) {
      form.reset({
        businessName: initial.businessName ?? "",
        businessTagline: initial.businessTagline ?? "",
        website: initial.website ?? "",
        phoneNumber: initial.phoneNumber ?? "",
        email: initial.email ?? "",
        controlledDrugCategoryIds: [...(initial.controlledDrugCategoryIds ?? [])],
        taxRatePercent: Number(initial.taxRatePercent),
        receiptHeader: initial.receiptHeader ?? "",
        receiptFooter: initial.receiptFooter ?? "",
        defaultLowStockDays: initial.defaultLowStockDays ?? null,
        mpesaEnvironment:
          initial.mpesaEnvironment === "production" ? "production" : "sandbox",
        insuranceNotes: initial.insuranceNotes ?? "",
      });
    }
  }, [initial, form]);

  async function onSubmit(values: FormValues) {
    try {
      await updateOrganizationSettings(values);
      toast.success("Settings saved");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <CardDescription>
            Upload a square image (max 2MB). It will show on receipts and PDFs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative h-28 w-28 overflow-hidden rounded-2xl ring-1 ring-foreground/10 bg-muted">
              {currentLogoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentLogoSrc}
                  alt="Business logo"
                  className="h-full w-full object-contain"
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="font-medium leading-tight">Current logo</p>
              <p className="text-muted-foreground text-xs leading-snug">
                {initial?.logoUrl ? "Uploaded" : "No logo uploaded yet"}
              </p>
            </div>
          </div>

          <form
            action={(fd) => {
              startLogoTransition(async () => {
                try {
                  const f = fd.get("logo");
                  if (f instanceof File && f.size > 0) {
                    setSelectedLogoPreview(URL.createObjectURL(f));
                  }
                  await uploadOrganizationLogo(fd);
                  toast.success("Logo updated");
                  setLogoVersion((v) => v + 1);
                  router.refresh();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed");
                }
              });
            }}
            className="space-y-3"
          >
            <div className="space-y-2">
              <Label htmlFor="logo">Upload new logo</Label>
              <Input
                id="logo"
                name="logo"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                disabled={isUploadingLogo}
              />
              <p className="text-muted-foreground text-xs">
                PNG, JPG, WebP, or SVG. Max 2MB.
              </p>
            </div>
            <Button type="submit" disabled={isUploadingLogo}>
              {isUploadingLogo ? "Uploading…" : "Upload logo"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Business profile</CardTitle>
            <CardDescription>
              Used across receipts, documents, and customer communications.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Business name</Label>
              <Input
                placeholder="e.g. Manyatta Pharmacy"
                {...form.register("businessName")}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Tagline / motto</Label>
              <Input
                placeholder="e.g. Caring for your family’s health"
                {...form.register("businessTagline")}
              />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input placeholder="https://…" {...form.register("website")} />
            </div>
            <div className="space-y-2">
              <Label>Phone number</Label>
              <Input placeholder="+254…" {...form.register("phoneNumber")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="hello@…"
                {...form.register("email")}
              />
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit">Save business profile</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform settings</CardTitle>
            <CardDescription>
              Tax, receipts, M-Pesa environment, and internal notes.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>VAT % (Kenya default 16)</Label>
              <Input
                type="number"
                step="0.01"
                {...form.register("taxRatePercent")}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Controlled drugs (DDA) categories</Label>
              <div className="max-h-52 space-y-2 overflow-y-auto rounded-md border border-border p-3">
                {categories.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No drug categories yet. Add categories under inventory before marking DDA
                    groups.
                  </p>
                ) : (
                  categories.map((c) => {
                    const selected = form.watch("controlledDrugCategoryIds").includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className="flex cursor-pointer items-start gap-3 rounded-md py-1 pr-2 hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(checked) => {
                            const cur = form.getValues("controlledDrugCategoryIds");
                            if (checked === true) {
                              form.setValue("controlledDrugCategoryIds", [
                                ...new Set([...cur, c.id]),
                              ]);
                            } else {
                              form.setValue(
                                "controlledDrugCategoryIds",
                                cur.filter((id) => id !== c.id),
                              );
                            }
                          }}
                          className="mt-0.5"
                        />
                        <span className="text-sm leading-snug">
                          <span className="font-medium">{c.name}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            ({c._count.drugs} drugs)
                          </span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                Any drug in a selected category will require a patient and an uploaded prescription
                photo before it can be sold.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Default expiry alert window (days)</Label>
              <Input type="number" {...form.register("defaultLowStockDays")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>M-Pesa (Daraja) environment</Label>
              <Select
                value={form.watch("mpesaEnvironment")}
                onValueChange={(v) =>
                  form.setValue("mpesaEnvironment", v as "sandbox" | "production")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Receipt header</Label>
              <Input {...form.register("receiptHeader")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Receipt footer</Label>
              <Textarea rows={2} {...form.register("receiptFooter")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Insurance / billing notes (internal)</Label>
              <Textarea rows={3} {...form.register("insuranceNotes")} />
            </div>
          </CardContent>
          <CardFooter className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-xs">
              Daraja consumer key, secret, and passkey belong in environment
              variables only — never in the database.
            </p>
            <Button type="submit">Save platform settings</Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
