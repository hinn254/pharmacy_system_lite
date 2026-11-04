"use client";

import { useEffect, useId, useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { drugFormSchema, type DrugFormValues } from "@/lib/validations/drug";
import { upsertDrug } from "@/lib/actions/drugs";
import { suggestDrugCategoriesForDrug, upsertDrugCategory } from "@/lib/actions/drug-categories";
import { DrugStatus, PrescriptionClass } from "@prisma/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type CategoryOption = { id: string; name: string; slug: string };

type DrugRow = {
  id: string;
  internalCode: string;
  barcode: string | null;
  genericName: string;
  brandName: string | null;
  dosageForm: string;
  strengthValue: string | null;
  strengthUnit: string | null;
  routeOfAdmin: string | null;
  packDescription: string | null;
  unitsPerPack: number | null;
  therapeuticCategory: string | null;
  atcCode: string | null;
  prescriptionClass: PrescriptionClass;
  controlledSchedule: string | null;
  manufacturer: string | null;
  mahDistributor: string | null;
  countryOfOrigin: string | null;
  storageConditions: string | null;
  patientDirections: string;
  priceCash: { toString(): string };
  priceInsurance: { toString(): string };
  buyingPrice: { toString(): string } | null;
  costLast: { toString(): string } | null;
  reorderLevel: number | null;
  maxStock: number | null;
  status: DrugStatus;
  categories?: { category: CategoryOption }[];
};

const emptyDefaults: DrugFormValues = {
  internalCode: "",
  barcode: "",
  genericName: "",
  brandName: "",
  dosageForm: "",
  strengthValue: "",
  strengthUnit: "",
  routeOfAdmin: "",
  packDescription: "",
  unitsPerPack: null,
  therapeuticCategory: "",
  categoryIds: [],
  atcCode: "",
  prescriptionClass: "OTC",
  controlledSchedule: "",
  manufacturer: "",
  mahDistributor: "",
  countryOfOrigin: "",
  storageConditions: "",
  patientDirections: "",
  priceCash: 0,
  priceInsurance: 0,
  buyingPrice: null,
  costLast: null,
  reorderLevel: null,
  maxStock: null,
  status: "ACTIVE",
};

function drugToForm(d: DrugRow): DrugFormValues {
  return {
    internalCode: d.internalCode,
    barcode: d.barcode ?? "",
    genericName: d.genericName,
    brandName: d.brandName ?? "",
    dosageForm: d.dosageForm,
    strengthValue: d.strengthValue ?? "",
    strengthUnit: d.strengthUnit ?? "",
    routeOfAdmin: d.routeOfAdmin ?? "",
    packDescription: d.packDescription ?? "",
    unitsPerPack: d.unitsPerPack,
    therapeuticCategory: d.therapeuticCategory ?? "",
    categoryIds: (d.categories ?? []).map((x) => x.category.id),
    atcCode: d.atcCode ?? "",
    prescriptionClass: d.prescriptionClass,
    controlledSchedule: d.controlledSchedule ?? "",
    manufacturer: d.manufacturer ?? "",
    mahDistributor: d.mahDistributor ?? "",
    countryOfOrigin: d.countryOfOrigin ?? "",
    storageConditions: d.storageConditions ?? "",
    patientDirections: d.patientDirections ?? "",
    priceCash: Number(d.priceCash),
    priceInsurance: Number(d.priceInsurance),
    buyingPrice: d.buyingPrice != null ? Number(d.buyingPrice) : null,
    costLast: d.costLast != null ? Number(d.costLast) : null,
    reorderLevel: d.reorderLevel,
    maxStock: d.maxStock,
    status: d.status,
  };
}

export function DrugDialog({
  drug,
  categories,
  children,
}: {
  drug?: DrugRow | null;
  categories?: CategoryOption[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const formId = useId();
  const [localCategories, setLocalCategories] = useState<CategoryOption[]>(
    () => categories ?? [],
  );
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    existingCategoryIds: string[];
    newCategoryNames: string[];
  } | null>(null);

  useEffect(() => {
    setLocalCategories(categories ?? []);
  }, [categories]);

  const form = useForm<DrugFormValues>({
    resolver: zodResolver(drugFormSchema) as Resolver<DrugFormValues>,
    defaultValues: emptyDefaults,
  });

  useEffect(() => {
    if (drug) form.reset(drugToForm(drug));
    else form.reset(emptyDefaults);
    setAiSuggestions(null);
  }, [drug, form]);

  async function onSubmit(values: DrugFormValues) {
    if (!drug && !values.patientDirections.trim()) {
      toast.error("Enter how the patient should take this medicine (directions for the label).");
      return;
    }
    try {
      await upsertDrug(values, drug?.id);
      toast.success(drug ? "Drug updated" : "Drug created");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && drug) form.reset(drugToForm(drug));
        if (!open && !drug) form.reset(emptyDefaults);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex max-h-[85vh] w-[calc(100vw-1.5rem)] flex-col gap-0 p-0 sm:max-w-3xl">
        <DialogHeader className="px-4 pb-4 pt-4 sm:px-6">
          <DialogTitle className="text-base sm:text-lg">{drug ? "Edit drug" : "Add drug"}</DialogTitle>
        </DialogHeader>
        <Separator />
        <form
          id={formId}
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-6 px-4 py-4 sm:px-6">
              <section className="space-y-3">
                <div className="text-sm font-medium">Basics</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Internal code *</Label>
                    <Input {...form.register("internalCode")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Barcode</Label>
                    <Input {...form.register("barcode")} />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Generic name *</Label>
                    <Input {...form.register("genericName")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Brand / trade name</Label>
                    <Input {...form.register("brandName")} />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="text-sm font-medium">Form & strength</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Dosage form *</Label>
                    <Input {...form.register("dosageForm")} placeholder="tablet, syrup…" />
                  </div>
                  <div className="space-y-2">
                    <Label>Route</Label>
                    <Input {...form.register("routeOfAdmin")} />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Strength value</Label>
                    <Input {...form.register("strengthValue")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Strength unit</Label>
                    <Input {...form.register("strengthUnit")} placeholder="mg, mg/5ml…" />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="text-sm font-medium">Packaging & classification</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Pack description</Label>
                    <Input {...form.register("packDescription")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Units per pack</Label>
                    <Input type="number" {...form.register("unitsPerPack")} />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Therapeutic category</Label>
                    <Input {...form.register("therapeuticCategory")} />
                  </div>
                  <div className="space-y-2">
                    <Label>ATC code</Label>
                    <Input {...form.register("atcCode")} />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Prescription class</Label>
                    <Select
                      value={form.watch("prescriptionClass")}
                      onValueChange={(v) =>
                        form.setValue("prescriptionClass", v as PrescriptionClass)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OTC">OTC</SelectItem>
                        <SelectItem value="RX">Prescription (Rx)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Controlled schedule</Label>
                    <Input {...form.register("controlledSchedule")} placeholder="none / class…" />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">Categories</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {form.watch("categoryIds")?.length ?? 0} selected
                    </span>
                    {drug?.id ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={aiBusy}
                        onClick={async () => {
                          setAiBusy(true);
                          try {
                            const res = await suggestDrugCategoriesForDrug(drug.id);
                            setAiSuggestions(res);
                            if (res.existingCategoryIds.length > 0) {
                              const cur = form.getValues("categoryIds") ?? [];
                              const next = Array.from(new Set([...cur, ...res.existingCategoryIds]));
                              form.setValue("categoryIds", next, { shouldDirty: true });
                            }
                            if (res.existingCategoryIds.length === 0 && res.newCategoryNames.length === 0) {
                              toast.message("No category suggestions found.");
                            } else {
                              toast.success("Suggestions ready.");
                            }
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Failed to get suggestions");
                          } finally {
                            setAiBusy(false);
                          }
                        }}
                      >
                        Suggest (AI)
                      </Button>
                    ) : null}
                  </div>
                </div>

                {localCategories.length > 0 ? (
                  <div className="rounded-md border border-border/70">
                    <ScrollArea className="h-44">
                      <div className="space-y-2 p-3">
                        {localCategories.map((c) => {
                          const selected = (form.watch("categoryIds") ?? []).includes(c.id);
                          return (
                            <div key={c.id} className="flex items-center gap-2">
                              <Checkbox
                                checked={selected}
                                onCheckedChange={(v) => {
                                  const cur = form.getValues("categoryIds") ?? [];
                                  const next = v === true
                                    ? Array.from(new Set([...cur, c.id]))
                                    : cur.filter((x) => x !== c.id);
                                  form.setValue("categoryIds", next, { shouldDirty: true });
                                }}
                              />
                              <div className="min-w-0">
                                <div className="truncate text-sm">{c.name}</div>
                                <div className="truncate font-mono text-xs text-muted-foreground">
                                  {c.slug}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No categories yet. Use “Manage categories” on the Drugs page.
                  </p>
                )}

                {aiSuggestions?.newCategoryNames?.length ? (
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                    <div className="text-sm font-medium">AI suggested new categories</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {aiSuggestions.newCategoryNames.map((name) => (
                        <Button
                          key={name}
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={aiBusy}
                          onClick={async () => {
                            setAiBusy(true);
                            try {
                              const created = await upsertDrugCategory({ name });
                              const nextCat: CategoryOption = {
                                id: created.id,
                                name: created.name,
                                slug: created.slug,
                              };
                              setLocalCategories((cur) => {
                                if (cur.some((c) => c.id === nextCat.id)) return cur;
                                return [...cur, nextCat].sort((a, b) => a.name.localeCompare(b.name));
                              });
                              const curIds = form.getValues("categoryIds") ?? [];
                              if (!curIds.includes(created.id)) {
                                form.setValue("categoryIds", [...curIds, created.id], { shouldDirty: true });
                              }
                              toast.success(`Created: ${created.name}`);
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Failed to create category");
                            } finally {
                              setAiBusy(false);
                            }
                          }}
                        >
                          Create “{name}”
                        </Button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Creating adds the category to your organization, and selects it for this drug.
                    </p>
                  </div>
                ) : null}
              </section>

              <section className="space-y-3">
                <div className="text-sm font-medium">Supplier & storage</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Manufacturer</Label>
                    <Input {...form.register("manufacturer")} />
                  </div>
                  <div className="space-y-2">
                    <Label>MAH / distributor</Label>
                    <Input {...form.register("mahDistributor")} />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Country of origin</Label>
                    <Input {...form.register("countryOfOrigin")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Storage conditions</Label>
                    <Textarea {...form.register("storageConditions")} rows={2} />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="text-sm font-medium">Label directions</div>
                <div className="space-y-2">
                  <Label>Patient directions (sig) *</Label>
                  <Textarea
                    {...form.register("patientDirections")}
                    rows={3}
                    placeholder="e.g. Take one tablet twice daily after food"
                  />
                  <p className="text-xs text-muted-foreground">
                    Shown on printed labels after sale. Required when adding a new drug.
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <div className="text-sm font-medium">Pricing (KES)</div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Cash / M-Pesa *</Label>
                    <Input type="number" inputMode="decimal" step="0.01" {...form.register("priceCash")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Insurance *</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      {...form.register("priceInsurance")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Buying price</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      {...form.register("buyingPrice")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last cost</Label>
                    <Input type="number" inputMode="decimal" step="0.01" {...form.register("costLast")} />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="text-sm font-medium">Inventory & status</div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Reorder level</Label>
                    <Input type="number" {...form.register("reorderLevel")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Max stock</Label>
                    <Input type="number" {...form.register("maxStock")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={form.watch("status")}
                      onValueChange={(v) => form.setValue("status", v as DrugStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
                        <SelectItem value="RECALLED">Recalled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>
            </div>
          </ScrollArea>
        </form>
        <Separator />
        <DialogFooter className="px-4 py-3 sm:px-6">
          <Button type="submit" form={formId} className="w-full sm:w-auto">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
