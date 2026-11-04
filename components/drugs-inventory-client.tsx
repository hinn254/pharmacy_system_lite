"use client";

import type { ComponentProps } from "react";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DrugStatus } from "@prisma/client";

import { DrugDialog } from "@/components/drug-dialog";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CatalogDrug = NonNullable<ComponentProps<typeof DrugDialog>["drug"]>;

export type DrugCatalogRow = {
  drug: CatalogDrug;
  qty: number;
  batchCount: number;
};

type CategoryOption = { id: string; name: string; slug: string };

type StockFilter = "all" | "out" | "low";

function searchHaystack(row: DrugCatalogRow): string {
  const d = row.drug;
  const cats = (d.categories ?? []).map((x) => x.category.name).join(" ");
  const strength = [d.strengthValue, d.strengthUnit].filter(Boolean).join(" ");
  return [
    d.internalCode,
    d.genericName,
    d.brandName ?? "",
    d.barcode ?? "",
    d.dosageForm,
    strength,
    d.atcCode ?? "",
    d.therapeuticCategory ?? "",
    cats,
  ]
    .join(" ")
    .toLowerCase();
}

function matchesSearch(row: DrugCatalogRow, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  const h = searchHaystack(row);
  const parts = q.split(/\s+/).filter(Boolean);
  return parts.every((p) => h.includes(p));
}

function matchesStock(row: DrugCatalogRow, stock: StockFilter): boolean {
  if (stock === "all") return true;
  const { drug: d, qty } = row;
  if (stock === "out") return qty === 0;
  const min = d.reorderLevel;
  const low =
    d.status === "ACTIVE" && min != null && qty <= min;
  return low;
}

function matchesCategory(row: DrugCatalogRow, categoryId: string): boolean {
  if (categoryId === "all") return true;
  return (row.drug.categories ?? []).some((c) => c.category.id === categoryId);
}

export function DrugsInventoryClient({
  rows,
  categories,
  allowInventoryEdits,
}: {
  rows: DrugCatalogRow[];
  categories: CategoryOption[];
  allowInventoryEdits: boolean;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | DrugStatus>("all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [stock, setStock] = useState<StockFilter>("all");

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (!matchesSearch(row, query)) return false;
      if (status !== "all" && row.drug.status !== status) return false;
      if (!matchesCategory(row, categoryId)) return false;
      if (!matchesStock(row, stock)) return false;
      return true;
    });
  }, [rows, query, status, categoryId, stock]);

  const categoryOptions = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 rounded-md border bg-muted/30 p-4 sm:grid-cols-6 lg:grid-cols-12 lg:items-end">
        <div className="min-w-0 space-y-2 sm:col-span-6 lg:col-span-5">
          <Label htmlFor="drugs-search">Search</Label>
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              id="drugs-search"
              className="pl-9"
              placeholder="Code, name, barcode, form, category…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
        <div className="min-w-0 space-y-2 sm:col-span-2 lg:col-span-2">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as "all" | DrugStatus)}
          >
            <SelectTrigger className="w-full min-w-0">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
              <SelectItem value="RECALLED">Recalled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-2 sm:col-span-2 lg:col-span-3">
          <Label>Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-full min-w-0">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categoryOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-2 sm:col-span-2 lg:col-span-2">
          <Label>Stock</Label>
          <Select value={stock} onValueChange={(v) => setStock(v as StockFilter)}>
            <SelectTrigger className="w-full min-w-0">
              <SelectValue placeholder="Stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any stock</SelectItem>
              <SelectItem value="low">Low / at reorder</SelectItem>
              <SelectItem value="out">Out of stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-muted-foreground text-sm">
        Showing {filtered.length} of {rows.length} drugs
        {rows.length > 0 && filtered.length === 0
          ? " — try clearing filters or search."
          : null}
      </p>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Generic</TableHead>
              <TableHead>Form / strength</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead className="text-right">Cash</TableHead>
              <TableHead className="text-right">Insurance</TableHead>
              <TableHead>Stock (batches)</TableHead>
              <TableHead>Status</TableHead>
              {allowInventoryEdits ? <TableHead className="w-[100px]" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={allowInventoryEdits ? 9 : 8}
                  className="text-muted-foreground"
                >
                  {allowInventoryEdits
                    ? "No drugs yet. Add your first product."
                    : "No drugs in the catalog yet."}
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={allowInventoryEdits ? 9 : 8}
                  className="text-muted-foreground"
                >
                  No drugs match your filters. Adjust search or filters above.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(({ drug: d, qty, batchCount }) => {
                const outOfStock = qty === 0;
                const isLow =
                  d.status === "ACTIVE" &&
                  d.reorderLevel != null &&
                  qty <= d.reorderLevel;
                const cats = (d.categories ?? []).map((x) => x.category.name);
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-sm">{d.internalCode}</TableCell>
                    <TableCell>{d.genericName}</TableCell>
                    <TableCell className="text-sm">
                      {d.dosageForm}
                      {d.strengthValue
                        ? ` · ${d.strengthValue}${d.strengthUnit ? ` ${d.strengthUnit}` : ""}`
                        : ""}
                    </TableCell>
                    <TableCell>
                      {cats.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {cats.slice(0, 3).map((c) => (
                            <Badge
                              key={c}
                              variant="outline"
                              className="h-6 px-2 text-[11px]"
                            >
                              {c}
                            </Badge>
                          ))}
                          {cats.length > 3 ? (
                            <Badge variant="secondary" className="h-6 px-2 text-[11px]">
                              +{cats.length - 3}
                            </Badge>
                          ) : null}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(d.priceCash).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(d.priceInsurance).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {qty}{" "}
                      <span className="text-muted-foreground">({batchCount})</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        <StatusBadge status={d.status} />
                        {outOfStock ? (
                          <Badge variant="destructive">OS</Badge>
                        ) : isLow ? (
                          <Badge variant="destructive">Low</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    {allowInventoryEdits ? (
                      <TableCell>
                        <DrugDialog drug={d} categories={categories}>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </DrugDialog>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
