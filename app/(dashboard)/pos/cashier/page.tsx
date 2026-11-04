import { listQueuedPosOrders } from "@/lib/actions/pos-orders";
import { listInsuranceSchemes } from "@/lib/actions/insurance-schemes";
import { getOrganizationSettings } from "@/lib/actions/settings";
import { CashierPos } from "@/components/cashier-pos";

export default async function CashierPosPage() {
  const [orders, insuranceSchemes, settings] = await Promise.all([
    listQueuedPosOrders(),
    listInsuranceSchemes({ activeOnly: true }),
    getOrganizationSettings(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cashier POS</h1>
        <p className="text-muted-foreground text-sm">
          Process queued orders · payment (cash vs insurance pricing) · print receipt · auto queue
          for PharmTech
        </p>
      </div>
      <CashierPos
        initialOrders={orders}
        insuranceSchemes={insuranceSchemes}
        insuranceNotes={settings?.insuranceNotes ?? null}
      />
    </div>
  );
}

