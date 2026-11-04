import { getSaleById } from "@/lib/actions/sales";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { InvoiceDocument } from "@/components/invoice-document";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Tag } from "lucide-react";

export default async function DispenseReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sale = await getSaleById(id);
  if (!sale) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-2 pb-10">
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1">
          <Link href="/pos/dispense">
            <ArrowLeft className="size-4" />
            Back to dispensing
          </Link>
        </Button>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/pos/receipt/${id}/labels`} rel="noreferrer">
              <Tag className="size-4" />
              Labels
            </Link>
          </Button>
          <PrintButton />
        </div>
      </div>

      <InvoiceDocument sale={sale} />
    </div>
  );
}

