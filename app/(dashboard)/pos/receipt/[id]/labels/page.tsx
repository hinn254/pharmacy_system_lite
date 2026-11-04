import { getSaleById } from "@/lib/actions/sales";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { DispensingLabelsDocument } from "@/components/dispensing-labels-document";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function DispensingLabelsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sale = await getSaleById(id);
  if (!sale) notFound();

  return (
    <div className="mx-auto max-w-[60mm] space-y-6 px-2 pb-10 print:max-w-none">
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1">
          <Link href={`/pos/receipt/${id}`}>
            <ArrowLeft className="size-4" />
            Back to receipt
          </Link>
        </Button>
        <PrintButton label="Print labels" />
      </div>
      <DispensingLabelsDocument sale={sale} />
    </div>
  );
}
