import { listInsuranceSchemes } from "@/lib/actions/insurance-schemes";
import { listInsuranceClaims } from "@/lib/actions/insurance-claims";
import { InsurersClient } from "@/components/insurers-client";
import { InsuranceClaimsClient } from "@/components/insurance-claims-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AdminInsurersPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = (await searchParams) ?? {};
  const pick = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const schemes = await listInsuranceSchemes({ activeOnly: false });

  const status = pick("status");
  const initialStatus = status === "paid" ? "paid" : status === "all" ? "all" : "pending";
  const initialSchemeId = pick("schemeId") ?? "all";
  const claims = await listInsuranceClaims({
    status: initialStatus,
    insuranceSchemeId: initialSchemeId === "all" ? undefined : initialSchemeId,
    limit: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Insurance</h1>
          <p className="text-muted-foreground text-sm">
            Onboard payers, track pending vs paid claims, and generate printable invoices.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/insurers/invoices">Insurance invoices</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle>Schemes</CardTitle>
          <CardDescription>
            Unique code per scheme · inactive schemes are hidden in checkout
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <InsurersClient initial={schemes} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle>Claims</CardTitle>
          <CardDescription>
            Track paid vs pending insurance claims per scheme. Pending claims represent money owed
            to your pharmacy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <InsuranceClaimsClient
            initialClaims={claims}
            initialStatus={initialStatus}
            initialSchemeId={initialSchemeId}
            canSettleInsurance
          />
        </CardContent>
      </Card>
    </div>
  );
}
