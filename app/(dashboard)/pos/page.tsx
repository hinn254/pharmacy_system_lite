import { PosCart } from "@/components/pos-cart";
import { getOrganizationSettings } from "@/lib/actions/settings";
import { listInsuranceSchemes } from "@/lib/actions/insurance-schemes";

export default async function PosPage() {
  const [settings, insuranceSchemes] = await Promise.all([
    getOrganizationSettings(),
    listInsuranceSchemes({ activeOnly: true }),
  ]);
  const tax = settings ? Number(settings.taxRatePercent) : 16;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Point of sale</h1>
        <p className="text-muted-foreground text-sm">
          FEFO stock deduction · dual pricing · M-Pesa & insurance
        </p>
      </div>
      <PosCart
        taxRatePercent={tax}
        insuranceNotes={settings?.insuranceNotes ?? null}
        insuranceSchemes={insuranceSchemes}
      />
    </div>
  );
}
