import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getInsuranceInvoiceById } from "@/lib/actions/insurance-invoices";
import { PrintButton } from "@/components/print-button";
import { InsuranceInvoiceDocument } from "@/components/insurance-invoice-document";
import { Button } from "@/components/ui/button";

export default async function InsuranceInvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInsuranceInvoiceById(id);
  if (!invoice) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-2 pb-10">
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1">
          <Link href="/admin/insurers/invoices">
            <ArrowLeft className="size-4" />
            Back to invoices
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <PrintButton label="Print invoice" />
        </div>
      </div>
      <InsuranceInvoiceDocument invoice={invoice} />
    </div>
  );
}

