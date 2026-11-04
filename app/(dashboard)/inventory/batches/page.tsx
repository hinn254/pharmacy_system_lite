import Link from "next/link";
import { differenceInCalendarDays, startOfDay } from "date-fns";
import { auth } from "@/auth";
import { canManageInventory } from "@/lib/authz";
import { listBatches } from "@/lib/actions/batches";
import { listDrugs } from "@/lib/actions/drugs";
import { listSuppliersAction } from "@/lib/actions/suppliers";
import { getOrganizationSettings } from "@/lib/actions/settings";
import { BatchDialog } from "@/components/batch-dialog";
import { BatchDeleteDialog } from "@/components/batch-delete-dialog";
import { SupplierQuickAdd } from "@/components/supplier-quick-add";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type BatchRow = Awaited<ReturnType<typeof listBatches>>[number];

type StockFilter = "all" | "in" | "out" | "low" | "expiring" | "expired";

const SELECT_CLASS =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-[3px] dark:bg-input/30";

function pick(sp: Record<string, string | string[] | undefined>, k: string) {
  const v = sp[k];
  return Array.isArray(v) ? v[0] : v;
}

function isLowStockRow(b: {
  quantityOnHand: number;
  drug: { reorderLevel: number | null };
}) {
  const min = b.drug.reorderLevel;
  if (min == null) return false;
  return b.quantityOnHand <= min;
}

function coerceStock(
  stockParam: string | undefined,
  lowStockLegacy: boolean,
): StockFilter {
  const v = (stockParam ?? "").trim();
  if (
    v === "in" ||
    v === "out" ||
    v === "low" ||
    v === "expiring" ||
    v === "expired"
  ) {
    return v;
  }
  if (lowStockLegacy) return "low";
  return "all";
}

function expiryFlags(
  b: BatchRow,
  today: Date,
  expiryAlertDays: number,
): { expiringSoon: boolean; expired: boolean } {
  const expDay = startOfDay(new Date(b.expiryDate));
  const daysToExpiry = differenceInCalendarDays(expDay, today);
  const expiringSoon =
    b.quantityOnHand > 0 &&
    daysToExpiry >= 0 &&
    daysToExpiry <= expiryAlertDays;
  const expired = b.quantityOnHand > 0 && daysToExpiry < 0;
  return { expiringSoon, expired };
}

function matchesStockFilter(
  b: BatchRow,
  stock: StockFilter,
  today: Date,
  expiryAlertDays: number,
): boolean {
  const low = isLowStockRow(b);
  const { expiringSoon, expired } = expiryFlags(b, today, expiryAlertDays);
  switch (stock) {
    case "all":
      return true;
    case "in":
      return b.quantityOnHand > 0;
    case "out":
      return b.quantityOnHand === 0;
    case "low":
      return low;
    case "expiring":
      return expiringSoon;
    case "expired":
      return expired;
    default:
      return true;
  }
}

function matchesTextSearch(b: BatchRow, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  const hay = [
    b.drug.genericName,
    b.drug.internalCode,
    b.batchNumber,
    b.supplier?.name ?? "",
  ]
    .join("\n")
    .toLowerCase();
  return hay.includes(needle);
}

function matchesSupplier(b: BatchRow, supplierId: string): boolean {
  if (!supplierId) return true;
  return b.supplier?.id === supplierId;
}

function matchesCategory(b: BatchRow, categoryId: string): boolean {
  if (!categoryId) return true;
  return (b.drug.categories ?? []).some((x) => x.category.id === categoryId);
}

function stockFilterLabel(stock: StockFilter, expiryAlertDays: number): string {
  switch (stock) {
    case "in":
      return "In stock only";
    case "out":
      return "Out of stock";
    case "low":
      return "Low (at or below reorder)";
    case "expiring":
      return `Expiring within ${expiryAlertDays}d`;
    case "expired":
      return "Expired (qty on hand)";
    default:
      return "All stock statuses";
  }
}

export default async function BatchesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const q = (pick(sp, "q") ?? "").trim();
  const supplierId = (pick(sp, "supplier") ?? "").trim();
  const categoryId = (pick(sp, "category") ?? "").trim();
  const stockRaw = pick(sp, "stock") ?? "";
  const lowStockLegacy =
    pick(sp, "lowStock") === "1" || pick(sp, "lowStock") === "true";
  const stock = coerceStock(stockRaw, lowStockLegacy);

  const session = await auth();
  const allowInventoryEdits =
    session?.user != null && canManageInventory(session.user.role);

  const [batchesRaw, drugs, suppliers, orgSettings] = await Promise.all([
    listBatches(),
    listDrugs(),
    listSuppliersAction(),
    getOrganizationSettings(),
  ]);

  const expiryAlertDays = orgSettings?.defaultLowStockDays ?? 90;
  const today = startOfDay(new Date());

  const categoryMap = new Map<string, string>();
  for (const b of batchesRaw) {
    for (const dc of b.drug.categories ?? []) {
      categoryMap.set(dc.category.id, dc.category.name);
    }
  }
  const categoryOptions = [...categoryMap.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const batches = batchesRaw.filter(
    (b) =>
      matchesStockFilter(b, stock, today, expiryAlertDays) &&
      matchesSupplier(b, supplierId) &&
      matchesCategory(b, categoryId) &&
      matchesTextSearch(b, q),
  );

  const drugOptions = drugs.map((d) => ({
    id: d.id,
    genericName: d.genericName,
    internalCode: d.internalCode,
  }));

  const filtersActive =
    Boolean(q) ||
    Boolean(supplierId) ||
    Boolean(categoryId) ||
    stock !== "all";

  const filterParts: string[] = [];
  if (q) filterParts.push(`search “${q}”`);
  if (supplierId) {
    const name = suppliers.find((s) => s.id === supplierId)?.name;
    filterParts.push(name ? `supplier ${name}` : "supplier filter");
  }
  if (categoryId) {
    const name = categoryMap.get(categoryId);
    filterParts.push(name ? `category ${name}` : "category filter");
  }
  if (stock !== "all") filterParts.push(stockFilterLabel(stock, expiryAlertDays));

  const filterSummary =
    filterParts.length === 0
      ? "No filters — all batches by expiry date."
      : `Filters: ${filterParts.join(" · ")}`;

  const selectStockValue = stock === "all" ? "" : stock;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Batches & stock</h1>
          <p className="text-muted-foreground text-sm">
            Batch tracking, expiry, FEFO allocation on sale
          </p>
        </div>
        {allowInventoryEdits ? (
          <div className="flex flex-wrap gap-2">
            <SupplierQuickAdd />
            <BatchDialog drugs={drugOptions} suppliers={suppliers}>
              <Button>Receive batch</Button>
            </BatchDialog>
          </div>
        ) : null}
      </div>

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/50 bg-muted/15 pb-4">
          <CardTitle className="text-base font-medium">Search &amp; filters</CardTitle>
          <CardDescription>
            Search by drug name, internal code, batch number, or supplier. Stock filters use
            your org expiry window ({expiryAlertDays} days) for &quot;expiring soon&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <form method="get" action="/inventory/batches" className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="batches-q">Search</Label>
                <Input
                  id="batches-q"
                  name="q"
                  type="search"
                  placeholder="Drug, code, batch #, supplier…"
                  defaultValue={q}
                  autoComplete="off"
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batches-stock">Stock / expiry</Label>
                <select
                  id="batches-stock"
                  name="stock"
                  defaultValue={selectStockValue}
                  className={SELECT_CLASS}
                >
                  <option value="">All batches</option>
                  <option value="in">In stock</option>
                  <option value="out">Out of stock</option>
                  <option value="low">Low (≤ reorder)</option>
                  <option value="expiring">Expiring soon</option>
                  <option value="expired">Expired (on hand)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="batches-supplier">Supplier</Label>
                <select
                  id="batches-supplier"
                  name="supplier"
                  defaultValue={supplierId}
                  className={SELECT_CLASS}
                >
                  <option value="">All suppliers</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="batches-category">Category</Label>
                <select
                  id="batches-category"
                  name="category"
                  defaultValue={categoryId}
                  className={SELECT_CLASS}
                >
                  <option value="">All categories</option>
                  {categoryOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-muted-foreground max-w-xl text-xs">{filterSummary}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" size="sm">
                  Apply filters
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/inventory/batches">Clear all</Link>
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="text-muted-foreground text-sm">
        {filtersActive ? (
          <>
            Showing <span className="text-foreground font-medium tabular-nums">{batches.length}</span> of{" "}
            <span className="tabular-nums">{batchesRaw.length}</span> batch
            {batchesRaw.length === 1 ? "" : "es"}
          </>
        ) : (
          <>
            <span className="text-foreground font-medium tabular-nums">{batchesRaw.length}</span> batch
            {batchesRaw.length === 1 ? "" : "es"} (sorted by expiry)
          </>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Drug</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Expiring</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Reorder at</TableHead>
              <TableHead>Supplier</TableHead>
              {allowInventoryEdits ? (
                <TableHead className="w-[170px]" />
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={allowInventoryEdits ? 9 : 8}
                  className="text-muted-foreground"
                >
                  {batchesRaw.length === 0
                    ? "No batches. Add drugs first, then receive stock."
                    : "No batches match your filters. Try changing search, supplier, category, or stock status."}
                </TableCell>
              </TableRow>
            ) : (
              batches.map((b) => {
                const low = isLowStockRow(b);
                const expDay = startOfDay(new Date(b.expiryDate));
                const daysToExpiry = differenceInCalendarDays(expDay, today);
                const expiringSoon =
                  b.quantityOnHand > 0 &&
                  daysToExpiry >= 0 &&
                  daysToExpiry <= expiryAlertDays;
                const expired = b.quantityOnHand > 0 && daysToExpiry < 0;
                const outOfStock = b.quantityOnHand === 0;
                const cats = (b.drug.categories ?? []).map((x) => x.category.name);
                return (
                  <TableRow
                    key={b.id}
                    className={
                      low
                        ? "border-l-4 border-l-amber-500/80 bg-amber-500/6"
                        : undefined
                    }
                  >
                    <TableCell>
                      <div className="font-medium">{b.drug.genericName}</div>
                      <div className="text-muted-foreground text-xs font-mono">
                        {b.drug.internalCode}
                      </div>
                    </TableCell>
                    <TableCell>
                      {cats.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {cats.slice(0, 3).map((c) => (
                            <Badge key={c} variant="outline" className="h-6 px-2 text-[11px]">
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
                    <TableCell className="font-mono text-sm">{b.batchNumber}</TableCell>
                    <TableCell>
                      {new Date(b.expiryDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {b.quantityOnHand <= 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : expired ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : expiringSoon ? (
                        <Badge
                          variant="secondary"
                          className="bg-amber-500/15 text-amber-950 dark:text-amber-100"
                        >
                          {daysToExpiry === 0
                            ? "Today"
                            : `In ${daysToExpiry}d`}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-2 tabular-nums">
                        <span>{b.quantityOnHand}</span>
                        {outOfStock ? (
                          <Badge variant="destructive" className="text-[10px]">
                            OS
                          </Badge>
                        ) : b.drug.reorderLevel != null ? (
                          low ? (
                            <Badge variant="destructive" className="text-[10px]">
                              Low
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-muted-foreground"
                            >
                              OK
                            </Badge>
                          )
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {b.drug.reorderLevel ?? "—"}
                    </TableCell>
                    <TableCell>{b.supplier?.name ?? "—"}</TableCell>
                    {allowInventoryEdits ? (
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <BatchDialog
                            batch={b}
                            drugs={drugOptions}
                            suppliers={suppliers}
                          >
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </BatchDialog>
                          <BatchDeleteDialog
                            batch={{
                              id: b.id,
                              drugName: b.drug.genericName,
                              batchNumber: b.batchNumber,
                            }}
                          >
                            <Button variant="destructive" size="sm">
                              Delete
                            </Button>
                          </BatchDeleteDialog>
                        </div>
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
