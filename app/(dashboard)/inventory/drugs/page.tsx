import { auth } from "@/auth";
import { canManageInventory } from "@/lib/authz";
import { listDrugs } from "@/lib/actions/drugs";
import { listDrugCategories } from "@/lib/actions/drug-categories";
import { DrugCategoriesManager } from "@/components/drug-categories-manager";
import { AddDrugButton } from "@/components/add-drug-button";
import {
  DrugsInventoryClient,
  type DrugCatalogRow,
} from "@/components/drugs-inventory-client";
import { Button } from "@/components/ui/button";

function toCatalogRows(
  drugs: Awaited<ReturnType<typeof listDrugs>>,
): DrugCatalogRow[] {
  return drugs.map((d) => {
    const buyingPrice = (
      d as unknown as { buyingPrice?: { toString(): string } | null }
    ).buyingPrice;
    const qty = d.batches.reduce((s, b) => s + b.quantityOnHand, 0);
    const drug: DrugCatalogRow["drug"] = {
      id: d.id,
      internalCode: d.internalCode,
      barcode: d.barcode,
      genericName: d.genericName,
      brandName: d.brandName,
      dosageForm: d.dosageForm,
      strengthValue: d.strengthValue,
      strengthUnit: d.strengthUnit,
      routeOfAdmin: d.routeOfAdmin,
      packDescription: d.packDescription,
      unitsPerPack: d.unitsPerPack,
      therapeuticCategory: d.therapeuticCategory,
      atcCode: d.atcCode,
      prescriptionClass: d.prescriptionClass,
      controlledSchedule: d.controlledSchedule,
      manufacturer: d.manufacturer,
      mahDistributor: d.mahDistributor,
      countryOfOrigin: d.countryOfOrigin,
      storageConditions: d.storageConditions,
      patientDirections: d.patientDirections,
      priceCash: d.priceCash.toString(),
      priceInsurance: d.priceInsurance.toString(),
      buyingPrice: buyingPrice?.toString() ?? null,
      costLast: d.costLast?.toString() ?? null,
      reorderLevel: d.reorderLevel,
      maxStock: d.maxStock,
      status: d.status,
      categories: d.categories,
    };
    return {
      drug,
      qty,
      batchCount: d.batches.length,
    };
  });
}

export default async function DrugsPage() {
  const session = await auth();
  const allowInventoryEdits =
    session?.user != null && canManageInventory(session.user.role);

  const [drugs, categories] = await Promise.all([listDrugs(), listDrugCategories()]);
  const rows = toCatalogRows(drugs);
  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Drugs</h1>
          <p className="text-muted-foreground text-sm">
            Pharmaceutical product master — dual pricing and regulatory fields
          </p>
        </div>
        {allowInventoryEdits ? (
          <div className="flex flex-wrap items-center gap-2">
            <DrugCategoriesManager categories={categories}>
              <Button variant="outline">Manage categories</Button>
            </DrugCategoriesManager>
            <AddDrugButton categories={categoryOptions} />
          </div>
        ) : null}
      </div>

      <DrugsInventoryClient
        rows={rows}
        categories={categoryOptions}
        allowInventoryEdits={allowInventoryEdits}
      />
    </div>
  );
}
