import type { Prisma } from "@prisma/client";

export type InvoiceTemplate = {
  title: string | null;
  subtitle: string | null;
  footer: string | null;
  showLogo: boolean;
  accentColor: string | null;
};

const HEX_COLOR_RE = /^#([0-9a-fA-F]{6})$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function coerceInvoiceTemplate(
  v: Prisma.JsonValue | null | undefined
): InvoiceTemplate | null {
  if (!v || !isRecord(v)) return null;

  const title = typeof v.title === "string" ? v.title : null;
  const subtitle = typeof v.subtitle === "string" ? v.subtitle : null;
  const footer = typeof v.footer === "string" ? v.footer : null;
  const showLogo = typeof v.showLogo === "boolean" ? v.showLogo : true;
  const accentColor =
    typeof v.accentColor === "string" && HEX_COLOR_RE.test(v.accentColor)
      ? v.accentColor
      : null;

  return { title, subtitle, footer, showLogo, accentColor };
}

