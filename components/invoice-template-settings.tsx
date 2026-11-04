"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { OrganizationSettings, Prisma } from "@prisma/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { uploadOrganizationLogo, updateOrganizationSettings } from "@/lib/actions/settings";
import { coerceInvoiceTemplate } from "@/lib/invoice-template";
import { InvoiceTemplatePreview } from "@/components/invoice-template-preview";

const schema = z.object({
  invoiceTitle: z.string().max(120).optional().nullable(),
  invoiceSubtitle: z.string().max(160).optional().nullable(),
  invoiceFooter: z.string().max(512).optional().nullable(),
  invoiceShowLogo: z.boolean().optional(),
  invoiceAccentColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/, "Use a 6-digit hex color like #2563eb")
    .optional()
    .nullable(),
});

type FormValues = z.infer<typeof schema>;

export function InvoiceTemplateSettings({
  initial,
}: {
  initial: (OrganizationSettings & { invoiceTemplate: Prisma.JsonValue | null }) | null;
}) {
  const router = useRouter();
  const initialTemplate = coerceInvoiceTemplate(initial?.invoiceTemplate);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(
    initial?.logoUrl ?? null
  );
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      invoiceTitle: "",
      invoiceSubtitle: "",
      invoiceFooter: "",
      invoiceShowLogo: true,
      invoiceAccentColor: "",
    },
  });

  useEffect(() => {
    if (!initial) return;
    const t = coerceInvoiceTemplate(initial.invoiceTemplate);
    form.reset({
      invoiceTitle: t?.title ?? "",
      invoiceSubtitle: t?.subtitle ?? "",
      invoiceFooter: t?.footer ?? "",
      invoiceShowLogo: t?.showLogo ?? true,
      invoiceAccentColor: t?.accentColor ?? "",
    });
    setLogoPreviewUrl(initial.logoUrl ?? null);
  }, [initial, form]);

  async function onSubmit(values: FormValues) {
    try {
      await updateOrganizationSettings(values);
      toast.success("Invoice template saved");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function onLogoSelected(file: File) {
    setIsUploadingLogo(true);
    const localUrl = URL.createObjectURL(file);
    setLogoPreviewUrl(localUrl);
    try {
      const fd = new FormData();
      fd.set("logo", file);
      const res = await uploadOrganizationLogo(fd);
      if (res?.logoUrl) setLogoPreviewUrl(res.logoUrl);
      toast.success("Logo updated");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to upload logo");
      setLogoPreviewUrl(initial?.logoUrl ?? null);
    } finally {
      setIsUploadingLogo(false);
      URL.revokeObjectURL(localUrl);
    }
  }

  const watched = form.watch();

  const headerTitle = useMemo(() => {
    const title = (watched.invoiceTitle ?? "").trim();
    if (title) return title;
    const receiptHeader = initial?.receiptHeader?.trim();
    if (receiptHeader) return receiptHeader;
    const business = initial?.businessName?.trim();
    if (business) return business;
    return "Invoice";
  }, [initial?.businessName, initial?.receiptHeader, watched.invoiceTitle]);

  const subtitle = useMemo(() => {
    const s = (watched.invoiceSubtitle ?? "").trim();
    return s || initialTemplate?.subtitle || "Tax invoice";
  }, [initialTemplate?.subtitle, watched.invoiceSubtitle]);

  const footer = useMemo(() => {
    const f = (watched.invoiceFooter ?? "").trim();
    if (f) return f;
    const receiptFooter = initial?.receiptFooter?.trim();
    return receiptFooter || "Thank you for your business";
  }, [initial?.receiptFooter, watched.invoiceFooter]);

  const accentColor = ((watched.invoiceAccentColor ?? "") || null) as string | null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <h2 className="text-base font-semibold">Invoice template</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Customize the invoice header/footer and preview the result.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Invoice title</Label>
            <Input
              placeholder="e.g. Nairobi Central Pharmacy"
              {...form.register("invoiceTitle")}
            />
            <p className="text-muted-foreground text-xs">
              Leave blank to fall back to receipt header / business name.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Subtitle</Label>
            <Input placeholder="e.g. Tax invoice" {...form.register("invoiceSubtitle")} />
          </div>

          <div className="space-y-2">
            <Label>Footer text</Label>
            <Textarea rows={3} {...form.register("invoiceFooter")} />
            <p className="text-muted-foreground text-xs">
              Leave blank to fall back to the receipt footer.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Accent color</Label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="#2563eb"
                className="max-w-[180px] font-mono"
                {...form.register("invoiceAccentColor")}
              />
              <div
                className="h-9 w-9 rounded-md border"
                style={{
                  background: accentColor && /^#([0-9a-fA-F]{6})$/.test(accentColor)
                    ? accentColor
                    : "transparent",
                }}
                aria-hidden
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              checked={form.watch("invoiceShowLogo") ?? true}
              onCheckedChange={(v) => form.setValue("invoiceShowLogo", v === true)}
              aria-label="Show logo on invoice"
            />
            <Label className="cursor-pointer select-none">Show logo on invoice</Label>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button type="submit">Save invoice template</Button>
          </div>
        </form>

        <div className="space-y-3">
          <div>
            <h3 className="text-base font-semibold">Logo</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Upload a logo used on invoices (and other documents).
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              disabled={isUploadingLogo}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onLogoSelected(f);
              }}
            />
            {logoPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoPreviewUrl}
                alt="Logo preview"
                className="h-10 w-auto rounded bg-white p-1 object-contain"
              />
            ) : (
              <div className="text-muted-foreground text-xs">No logo uploaded</div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Preview</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            This is a sample invoice preview (your real data will vary).
          </p>
        </div>
        <InvoiceTemplatePreview
          headerTitle={headerTitle}
          subtitle={subtitle}
          footer={footer}
          logoUrl={logoPreviewUrl}
          showLogo={form.watch("invoiceShowLogo") ?? true}
          accentColor={accentColor}
        />
      </div>
    </div>
  );
}

