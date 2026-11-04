import { listReadyToDispensePosOrders } from "@/lib/actions/pos-orders";
import { DispenseQueue } from "@/components/dispense-queue";

export default async function DispensePage() {
  const orders = await listReadyToDispensePosOrders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dispensing</h1>
        <p className="text-muted-foreground text-sm">
          Orders finalized by cashier — confirm and hand out medicines
        </p>
      </div>
      <DispenseQueue initialOrders={orders} />
    </div>
  );
}

