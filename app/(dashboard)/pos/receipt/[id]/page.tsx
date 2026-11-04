import { auth } from "@/auth";
import { getSaleById } from "@/lib/actions/sales";
import { posBackLabelForRole, posHomeHrefForRole } from "@/lib/pos-home-for-role";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { InvoiceDocument } from "@/components/invoice-document";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sale = await getSaleById(id);
  if (!sale) notFound();

  const session = await auth();
  const role = session?.user?.role;
  const backHref = role ? posHomeHrefForRole(role) : "/dashboard";
  const backLabel = role ? posBackLabelForRole(role) : "Back";

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-2 pb-10">
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1">
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            {backLabel}
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <PrintButton />
        </div>
      </div>
      <InvoiceDocument sale={sale} />
    </div>
  );
}
