import type { getSaleById } from "@/lib/actions/sales";

type SaleForLabels = NonNullable<Awaited<ReturnType<typeof getSaleById>>>;

export function DispensingLabelsDocument({ sale }: { sale: SaleForLabels }) {
  const header =
    sale.organization.settings?.receiptHeader ?? sale.organization.name;
  const dateShort = new Date(sale.createdAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });

  return (
    <div className="dispensing-labels-root font-sans text-foreground">
      <div className="print:hidden mb-4 max-w-sm text-sm leading-snug text-muted-foreground">
        <p className="font-medium text-foreground">50 × 25 mm dispensing labels</p>
        <p>
          Each line item prints on its own label. In the print dialog, turn off headers and
          footers, set margins to none if offered, and use actual size (100%).
        </p>
      </div>

      <div className="flex flex-col items-start gap-3 print:gap-0">
        {sale.lines.map((line) => {
          const strength =
            line.drug.strengthValue != null
              ? `${line.drug.strengthValue}${line.drug.strengthUnit ?? ""}`.trim()
              : "";
          const formStrength = [line.drug.dosageForm, strength].filter(Boolean).join(" ");
          const sig =
            line.directionsOverride?.trim() ||
            line.drug.patientDirections?.trim() ||
            "";

          return (
            <article
              key={line.id}
              className="dispensing-label-page box-border flex h-[25mm] w-[50mm] flex-col overflow-hidden rounded-md border border-border bg-card p-[1.25mm] text-[6.75pt] leading-snug shadow-sm print:rounded-none print:border-0 print:bg-white print:p-[0.6mm] print:shadow-none"
            >
              <header className="flex shrink-0 items-baseline justify-between gap-1 border-b border-border/70 pb-[0.35mm] print:border-border/80">
                <span className="max-w-[30mm] truncate text-[7pt] font-semibold tracking-tight">
                  {header}
                </span>
                <span className="shrink-0 font-mono text-[5.75pt] tabular-nums text-muted-foreground print:text-[5.5pt]">
                  #{sale.saleNumber}
                </span>
              </header>

              <p className="mt-[0.4mm] truncate text-[6.25pt] font-medium text-muted-foreground">
                {sale.patient?.fullName ?? "Walk-in"}
              </p>

              <p className="line-clamp-2 text-[7pt] font-semibold leading-[1.12]">
                {line.drug.genericName}
                {line.drug.brandName ? (
                  <span className="font-normal text-muted-foreground"> ({line.drug.brandName})</span>
                ) : null}
              </p>

              <p className="truncate text-[6.25pt]">
                {formStrength ? `${formStrength} · ` : null}
                <span className="tabular-nums font-semibold">Qty {line.quantity}</span>
              </p>

              <p
                className="mt-auto line-clamp-2 min-h-0 text-[6pt] leading-[1.1] text-foreground/95"
                title={sig || undefined}
              >
                {sig ? <span className="text-muted-foreground">Sig: </span> : null}
                {sig || "—"}
              </p>

              <p className="mt-[0.2mm] text-[5.25pt] text-muted-foreground print:text-[5pt]">
                {dateShort}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
