import { listInsuranceSchemes } from "@/lib/actions/insurance-schemes";
import { listInsuranceInvoices } from "@/lib/actions/insurance-invoices";
import { InsuranceInvoicesClient } from "@/components/insurance-invoices-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function InsuranceInvoicesPage() {
  const schemes = await listInsuranceSchemes({ activeOnly: false });
  const invoices = await listInsuranceInvoices({ limit: 200 });

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button asChild variant="ghost" className="h-8 px-2">
          <Link href="/admin/insurers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to insurers
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">Insurance invoices</h1>
        <p className="text-muted-foreground text-sm">
          Generate printable invoices by grouping pending claims per insurance scheme.
        </p>
      </div>

      {schemes.length === 0 ? (
        <Card>
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle>No schemes found</CardTitle>
            <CardDescription>Add at least one insurance scheme first.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Go to <span className="font-medium text-foreground">Admin → Insurance</span> and create a scheme.
          </CardContent>
        </Card>
      ) : (
        <InsuranceInvoicesClient
          initialInvoices={invoices}
          schemes={schemes.map((s) => ({ id: s.id, name: s.name, code: s.code }))}
        />
      )}
    </div>
  );
}

