import { Separator } from "@/components/ui/separator";

export type InvoiceTemplatePreviewProps = {
  headerTitle: string;
  subtitle: string;
  footer: string;
  logoUrl?: string | null;
  showLogo: boolean;
  accentColor?: string | null;
};

function formatKes(n: number) {
  return `KES ${n.toFixed(2)}`;
}

export function InvoiceTemplatePreview({
  headerTitle,
  subtitle,
  footer,
  logoUrl,
  showLogo,
  accentColor,
}: InvoiceTemplatePreviewProps) {
  const items = [
    { name: "Amoxicillin 500mg", qty: 2, unit: 120.0 },
    { name: "Paracetamol 500mg", qty: 1, unit: 50.0 },
    { name: "Consultation fee", qty: 1, unit: 300.0 },
  ];

  const subtotal = items.reduce((s, i) => s + i.qty * i.unit, 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  const titleStyle = accentColor ? ({ color: accentColor } as const) : undefined;

  return (
    <div className="font-sans text-sm">
      <div className="border-border/80 bg-card/50 rounded-xl border p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1
              className="truncate text-xl font-semibold tracking-tight"
              style={titleStyle}
              title={headerTitle}
            >
              {headerTitle}
            </h1>
            <p className="text-muted-foreground mt-1 text-xs">{subtitle}</p>
          </div>
          {showLogo && logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Logo"
              className="h-10 w-auto shrink-0 rounded bg-white p-1 object-contain"
            />
          ) : null}
        </div>

        <Separator className="my-5" />

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="space-y-1.5">
            <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Sale
            </h2>
            <div className="flex justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Invoice #</span>
              <span className="font-mono font-medium tabular-nums">1024</span>
            </div>
            <div className="flex justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Date</span>
              <span>{new Date().toLocaleString()}</span>
            </div>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Customer
            </h2>
            <p className="font-medium">Jane Doe</p>
            <div className="text-muted-foreground space-y-0.5 text-xs">
              <div>+254 7•• ••• ••12</div>
              <div>jane@example.com</div>
            </div>
          </section>
        </div>

        <Separator className="my-5" />

        <section>
          <h2 className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wide">
            Line items
          </h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Unit</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.name} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2.5 font-medium">{i.name}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{i.qty}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {i.unit.toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                      {(i.qty * i.unit).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-6 flex flex-col items-end gap-1 border-t pt-4 text-sm">
          <div className="flex w-full max-w-xs justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{formatKes(subtotal)}</span>
          </div>
          <div className="flex w-full max-w-xs justify-between">
            <span className="text-muted-foreground">Tax (16%)</span>
            <span className="tabular-nums">{formatKes(tax)}</span>
          </div>
          <div className="flex w-full max-w-xs justify-between text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatKes(total)}</span>
          </div>
        </div>

        <p className="text-muted-foreground mt-8 text-center text-xs">{footer}</p>
      </div>
    </div>
  );
}

