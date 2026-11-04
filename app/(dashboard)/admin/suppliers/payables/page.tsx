import { listSuppliersAction } from "@/lib/actions/suppliers";
import { listSupplierBills } from "@/lib/actions/supplier-payables";
import { SupplierPayablesClient } from "@/components/supplier-payables-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function SupplierPayablesPage() {
  const suppliers = await listSuppliersAction();
  const bills = await listSupplierBills({ limit: 300 });

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button asChild variant="ghost" className="h-8 px-2">
          <Link href="/admin/suppliers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to suppliers
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">Supplier payables</h1>
        <p className="text-muted-foreground text-sm">
          Record supplier bills and payments. The system automatically shows what’s owed vs already paid.
        </p>
      </div>

      {suppliers.length === 0 ? (
        <Card>
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle>No suppliers found</CardTitle>
            <CardDescription>Add a supplier first.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Go to <span className="font-medium text-foreground">Admin → Suppliers</span> and create one.
          </CardContent>
        </Card>
      ) : (
        <SupplierPayablesClient
          initialBills={bills}
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        />
      )}
    </div>
  );
}

