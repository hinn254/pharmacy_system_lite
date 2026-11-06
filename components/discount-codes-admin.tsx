"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { MoreVertical, Plus, Search, Trash2 } from "lucide-react";
import {
  deleteDiscountCode,
  listDiscountCodes,
  setDiscountCodeActive,
  upsertDiscountCode,
  type DiscountCodeListItem,
} from "@/lib/actions/discount-codes";
import { DiscountPatientSegment, DiscountScopeType, DiscountValueType } from "@prisma/client";
import { searchDrugsForPos, type DrugForPos } from "@/lib/actions/drugs";
import { searchPatients } from "@/lib/actions/patients";
import { cn } from "@/lib/utils";

type PatientHit = Awaited<ReturnType<typeof searchPatients>>[number];

function formatWindow(d: DiscountCodeListItem) {
  const parts: string[] = [];
  if (d.startsAt) parts.push(`From ${new Date(d.startsAt).toLocaleDateString()}`);
  if (d.endsAt) parts.push(`To ${new Date(d.endsAt).toLocaleDateString()}`);
  if (d.expiresAt) parts.push(`Expires ${new Date(d.expiresAt).toLocaleDateString()}`);
  return parts.join(" · ") || "No dates set";
}

function formatValue(d: DiscountCodeListItem) {
  if (d.valueType === "PERCENT") return `${Number(d.valuePercent ?? 0).toFixed(2)}%`;
  return `KES ${Number(d.valueAmount ?? 0).toFixed(2)}`;
}

function segmentLabel(s: DiscountPatientSegment) {
  switch (s) {
    case "NEW_PATIENT":
      return "New patients";
    case "RETURNING_PATIENT":
      return "Returning patients";
    default:
      return "Any patient";
  }
}

function scopeLabel(d: DiscountCodeListItem) {
  if (d.scopeType === "ALL_DRUGS") return "All drugs";
  const n = d.drugs.length;
  return n === 1 ? "1 drug" : `${n} drugs`;
}

function toDatetimeLocalValue(dt: Date | string | null | undefined) {
  if (!dt) return "";
  const d = typeof dt === "string" ? new Date(dt) : dt;
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function parseDatetimeLocal(s: string) {
  const t = s.trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

function PatientLine({ p }: { p: PatientHit }) {
  return (
    <div className="flex flex-col">
      <span className="font-medium leading-tight">{p.fullName}</span>
      <span className="text-muted-foreground text-xs">
        {p.phone ?? ""}
        {p.phone && p.email ? " · " : ""}
        {p.email ?? ""}
      </span>
    </div>
  );
}

export function DiscountCodesAdmin() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DiscountCodeListItem[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DiscountCodeListItem | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => `${r.code} ${r.name}`.toLowerCase().includes(t));
  }, [q, rows]);

  async function refresh() {
    setLoading(true);
    try {
      const r = await listDiscountCodes();
      setRows(r);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function beginEdit(r: DiscountCodeListItem) {
    setEditing(r);
    setOpen(true);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Discount codes</CardTitle>
            <CardDescription>
              Create promo codes for seasons, new patients, returning patients, and drug-specific offers.
            </CardDescription>
          </div>

          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setEditing(null);
            }}
          >
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                <Plus className="size-4" />
                New code
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DiscountCodeDialogBody
                key={editing?.id ?? "new"}
                initial={editing}
                onSaved={() => {
                  setOpen(false);
                  setEditing(null);
                  void refresh();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              className="pl-9"
              placeholder="Search code or name…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="px-3 py-2.5 font-medium">Code</th>
                  <th className="px-3 py-2.5 font-medium">Value</th>
                  <th className="px-3 py-2.5 font-medium">Eligibility</th>
                  <th className="px-3 py-2.5 font-medium">Window</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-muted-foreground px-3 py-10 text-center">
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-muted-foreground px-3 py-10 text-center">
                      No discount codes yet
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="border-b border-border/50 last:border-0">
                      <td className="px-3 py-2.5 align-top">
                        <div className="font-mono font-semibold">{r.code}</div>
                        <div className="text-muted-foreground text-xs">{r.name}</div>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <div className="font-medium tabular-nums">{formatValue(r)}</div>
                        <div className="text-muted-foreground text-xs">
                          Priority {r.priority}
                          {r.stackable ? " · Stackable" : " · Not stackable"}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline">{segmentLabel(r.patientSegment)}</Badge>
                          <Badge variant="outline">{scopeLabel(r)}</Badge>
                          {r.sessionTag ? (
                            <Badge variant="secondary">Session: {r.sessionTag}</Badge>
                          ) : null}
                          {r.patients.length > 0 ? (
                            <Badge variant="secondary">
                              {r.patients.length} patient{r.patients.length === 1 ? "" : "s"}
                            </Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-top text-xs text-muted-foreground">
                        {formatWindow(r)}
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <StatusBadge status={r.active ? "ACTIVE" : "INACTIVE"} />
                      </td>
                      <td className="px-3 py-2.5 text-right align-top">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => beginEdit(r)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                startTransition(async () => {
                                  try {
                                    await setDiscountCodeActive(r.id, !r.active);
                                    toast.success(r.active ? "Code disabled" : "Code enabled");
                                    await refresh();
                                  } catch (e) {
                                    toast.error(e instanceof Error ? e.message : "Failed");
                                  }
                                });
                              }}
                            >
                              {r.active ? "Disable" : "Enable"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                if (!confirm(`Delete ${r.code}? This cannot be undone.`)) return;
                                startTransition(async () => {
                                  try {
                                    await deleteDiscountCode(r.id);
                                    toast.success("Deleted");
                                    await refresh();
                                  } catch (e) {
                                    toast.error(e instanceof Error ? e.message : "Failed");
                                  }
                                });
                              }}
                            >
                              <Trash2 className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pending ? <div className="text-muted-foreground text-xs">Saving…</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function DiscountCodeDialogBody({
  initial,
  onSaved,
}: {
  initial: DiscountCodeListItem | null;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();

  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [active, setActive] = useState<boolean>(initial?.active ?? true);
  const [stackable, setStackable] = useState<boolean>(initial?.stackable ?? true);
  const [priority, setPriority] = useState<number>(initial?.priority ?? 0);

  const [valueType, setValueType] = useState<DiscountValueType>(
    initial?.valueType ?? "PERCENT",
  );
  const [valuePercent, setValuePercent] = useState<string>(
    initial?.valuePercent != null ? String(initial.valuePercent) : "10",
  );
  const [valueAmount, setValueAmount] = useState<string>(
    initial?.valueAmount != null ? String(initial.valueAmount) : "0",
  );

  const [scopeType, setScopeType] = useState<DiscountScopeType>(
    initial?.scopeType ?? "ALL_DRUGS",
  );
  const [drugIds, setDrugIds] = useState<string[]>(
    initial?.drugs?.map((d) => d.drugId) ?? [],
  );
  const [drugLabelsById, setDrugLabelsById] = useState<Record<string, string>>(
    () => {
      const m: Record<string, string> = {};
      for (const d of initial?.drugs ?? []) {
        m[d.drugId] = `${d.drug.genericName} (${d.drug.internalCode})`;
      }
      return m;
    },
  );

  const [patientSegment, setPatientSegment] = useState<DiscountPatientSegment>(
    initial?.patientSegment ?? "ANY",
  );
  const [sessionTag, setSessionTag] = useState<string>(initial?.sessionTag ?? "");
  const [patientIds, setPatientIds] = useState<string[]>(
    initial?.patients?.map((p) => p.patientId) ?? [],
  );
  const [patientLabelsById, setPatientLabelsById] = useState<Record<string, string>>(
    () => {
      const m: Record<string, string> = {};
      for (const p of initial?.patients ?? []) {
        m[p.patientId] = `${p.patient.fullName}${p.patient.phone ? ` · ${p.patient.phone}` : ""}`;
      }
      return m;
    },
  );

  const [startsAt, setStartsAt] = useState<string>(
    toDatetimeLocalValue(initial?.startsAt ?? null),
  );
  const [endsAt, setEndsAt] = useState<string>(
    toDatetimeLocalValue(initial?.endsAt ?? null),
  );
  const [expiresAt, setExpiresAt] = useState<string>(
    toDatetimeLocalValue(initial?.expiresAt ?? null),
  );

  const [drugQuery, setDrugQuery] = useState("");
  const [drugHits, setDrugHits] = useState<DrugForPos[]>([]);
  const [drugLoading, setDrugLoading] = useState(false);

  const [patientQuery, setPatientQuery] = useState("");
  const [patientHits, setPatientHits] = useState<PatientHit[]>([]);
  const [patientLoading, setPatientLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const t = drugQuery.trim();
    if (!t || scopeType !== "DRUGS") {
      setDrugHits([]);
      setDrugLoading(false);
      return;
    }
    setDrugLoading(true);
    const h = setTimeout(() => {
      void (async () => {
        try {
          const r = await searchDrugsForPos(t);
          setDrugHits(r);
        } finally {
          setDrugLoading(false);
        }
      })();
    }, 250);
    return () => clearTimeout(h);
  }, [drugQuery, scopeType]);

  useEffect(() => {
    const t = patientQuery.trim();
    if (!t) {
      setPatientHits([]);
      setPatientLoading(false);
      return;
    }
    setPatientLoading(true);
    const h = setTimeout(() => {
      void (async () => {
        try {
          const r = await searchPatients(t, 12);
          setPatientHits(r);
        } finally {
          setPatientLoading(false);
        }
      })();
    }, 250);
    return () => clearTimeout(h);
  }, [patientQuery]);

  function addDrug(d: DrugForPos) {
    if (drugIds.includes(d.id)) return;
    setDrugIds((prev) => [...prev, d.id]);
    setDrugLabelsById((prev) => ({
      ...prev,
      [d.id]: `${d.genericName} (${d.internalCode})`,
    }));
    setDrugQuery("");
    setDrugHits([]);
  }

  function removeDrug(id: string) {
    setDrugIds((prev) => prev.filter((x) => x !== id));
  }

  function addPatient(p: PatientHit) {
    if (patientIds.includes(p.id)) return;
    setPatientIds((prev) => [...prev, p.id]);
    setPatientLabelsById((prev) => ({
      ...prev,
      [p.id]: `${p.fullName}${p.phone ? ` · ${p.phone}` : ""}`,
    }));
    setPatientQuery("");
    setPatientHits([]);
  }

  function removePatient(id: string) {
    setPatientIds((prev) => prev.filter((x) => x !== id));
  }

  function onSave() {
    setFormError(null);
    if (code.trim().length < 2) {
      setFormError("Enter a discount code with at least 2 characters.");
      return;
    }
    if (name.trim().length < 2) {
      setFormError("Enter a discount name with at least 2 characters.");
      return;
    }
    const numericValue = Number(valueType === "PERCENT" ? valuePercent : valueAmount);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      setFormError(valueType === "PERCENT" ? "Enter a discount percentage greater than 0." : "Enter a fixed discount amount greater than 0.");
      return;
    }
    if (valueType === "PERCENT" && numericValue > 100) {
      setFormError("Discount percentage cannot be more than 100%.");
      return;
    }
    if (scopeType === "DRUGS" && drugIds.length === 0) {
      setFormError("Select at least one drug, or change the scope to All drugs.");
      return;
    }
    startTransition(async () => {
      try {
        const result = await upsertDiscountCode(
          {
            code,
            name,
            active,
            stackable,
            priority,
            valueType,
            valuePercent: valueType === "PERCENT" ? valuePercent : null,
            valueAmount: valueType === "FIXED" ? valueAmount : null,
            scopeType,
            drugIds,
            patientSegment,
            sessionTag: sessionTag.trim() || null,
            patientIds,
            startsAt: parseDatetimeLocal(startsAt),
            endsAt: parseDatetimeLocal(endsAt),
            expiresAt: parseDatetimeLocal(expiresAt),
          },
          initial?.id,
        );
        if (!result.ok) {
          setFormError(result.error);
          return;
        }
        toast.success(initial ? "Discount updated" : "Discount created");
        onSaved();
      } catch (e) {
        const message = e instanceof Error ? e.message : "Could not save the discount. Please try again.";
        setFormError(message);
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{initial ? "Edit discount code" : "New discount code"}</DialogTitle>
        <DialogDescription>
          Cashiers apply codes in POS; discounts can stack and reduce the total.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-5">
        {formError ? (
          <div role="alert" className="rounded-xl bg-destructive/8 px-3.5 py-3 text-sm leading-relaxed text-destructive ring-1 ring-destructive/20">
            {formError}
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="discount-code">Code</Label>
            <Input
              id="discount-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="VALENTINES10"
              className="font-mono"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="discount-name">Name</Label>
            <Input
              id="discount-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Valentines promo"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/10 p-1">
              <Button
                type="button"
                variant={valueType === "PERCENT" ? "default" : "ghost"}
                className="w-full justify-center"
                onClick={() => setValueType("PERCENT")}
              >
                Percent
              </Button>
              <Button
                type="button"
                variant={valueType === "FIXED" ? "default" : "ghost"}
                className="w-full justify-center"
                onClick={() => setValueType("FIXED")}
              >
                Fixed
              </Button>
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Value</Label>
            <div className="relative">
              {valueType === "FIXED" ? (
                <span className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                  KES
                </span>
              ) : null}
              <Input
                type="number"
                step="0.01"
                min={0}
                max={valueType === "PERCENT" ? 100 : undefined}
                value={valueType === "PERCENT" ? valuePercent : valueAmount}
                onChange={(e) =>
                  valueType === "PERCENT"
                    ? setValuePercent(e.target.value)
                    : setValueAmount(e.target.value)
                }
                placeholder={valueType === "PERCENT" ? "10" : "200"}
                className={cn(
                  "tabular-nums",
                  valueType === "FIXED" ? "pl-14 pr-3" : "pr-10",
                )}
              />
              {valueType === "PERCENT" ? (
                <span className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm">
                  %
                </span>
              ) : null}
            </div>
            <p className="text-muted-foreground text-xs">
              {valueType === "PERCENT"
                ? "Discount percentage (0–100)."
                : "Fixed amount off the eligible items subtotal."}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Priority</Label>
            <Input
              type="number"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value || "0", 10))}
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Checkbox checked={active} onCheckedChange={(v) => setActive(v === true)} />
            <Label className="cursor-pointer select-none" onClick={() => setActive((a) => !a)}>
              Active
            </Label>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Checkbox checked={stackable} onCheckedChange={(v) => setStackable(v === true)} />
            <Label className="cursor-pointer select-none" onClick={() => setStackable((s) => !s)}>
              Stackable
            </Label>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Starts at</Label>
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Ends at</Label>
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Expires at</Label>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Patient segment</Label>
            <div className="flex flex-wrap gap-2">
              {([
                ["ANY", "Any"],
                ["NEW_PATIENT", "New patients"],
                ["RETURNING_PATIENT", "Returning patients"],
              ] as const).map(([val, label]) => (
                <Button
                  key={val}
                  type="button"
                  variant={patientSegment === val ? "default" : "outline"}
                  onClick={() => setPatientSegment(val)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Session tag (optional)</Label>
            <Input
              value={sessionTag}
              onChange={(e) => setSessionTag(e.target.value)}
              placeholder="valentines_2026"
              className="font-mono"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Scope</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={scopeType === "ALL_DRUGS" ? "default" : "outline"}
              onClick={() => setScopeType("ALL_DRUGS")}
            >
              All drugs
            </Button>
            <Button
              type="button"
              variant={scopeType === "DRUGS" ? "default" : "outline"}
              onClick={() => setScopeType("DRUGS")}
            >
              Select drugs
            </Button>
          </div>

          {scopeType === "DRUGS" && (
            <div className="space-y-2 rounded-lg border bg-muted/10 p-3">
              <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  className="pl-9"
                  placeholder="Search drug name or code…"
                  value={drugQuery}
                  onChange={(e) => setDrugQuery(e.target.value)}
                />
                {drugLoading ? (
                  <span className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs">
                    …
                  </span>
                ) : null}
              </div>

              {drugHits.length > 0 && (
                <div className="max-h-48 overflow-auto rounded-md border bg-background">
                  {drugHits.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      className="hover:bg-muted/50 flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
                      onClick={() => addDrug(d)}
                    >
                      <span className="font-medium">{d.genericName}</span>
                      <span className="text-muted-foreground font-mono text-xs">
                        {d.internalCode}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {drugIds.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {drugIds.map((id) => (
                    <span
                      key={id}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs",
                      )}
                    >
                      <span className="truncate max-w-[260px]">
                        {drugLabelsById[id] ?? id}
                      </span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => removeDrug(id)}
                        aria-label="Remove drug"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">No drugs selected yet.</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Specific patients (optional)</Label>
          <div className="space-y-2 rounded-lg border bg-muted/10 p-3">
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
              <Input
                className="pl-9"
                placeholder="Search patients by name, phone, or email…"
                value={patientQuery}
                onChange={(e) => setPatientQuery(e.target.value)}
              />
              {patientLoading ? (
                <span className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs">
                  …
                </span>
              ) : null}
            </div>

            {patientHits.length > 0 && (
              <div className="max-h-48 overflow-auto rounded-md border bg-background">
                {patientHits.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="hover:bg-muted/50 flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
                    onClick={() => addPatient(p)}
                  >
                    <PatientLine p={p} />
                    <span className="text-muted-foreground text-xs">Add</span>
                  </button>
                ))}
              </div>
            )}

            {patientIds.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {patientIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs"
                  >
                    <span className="truncate max-w-[260px]">
                      {patientLabelsById[id] ?? id}
                    </span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => removePatient(id)}
                      aria-label="Remove patient"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                Leave empty to allow any eligible patient segment.
              </p>
            )}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending}>
          Cancel
        </Button>
        <Button type="button" disabled={pending} onClick={onSave}>
          {pending ? "Saving…" : initial ? "Save changes" : "Create code"}
        </Button>
      </DialogFooter>
    </>
  );
}
