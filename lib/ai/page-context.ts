/** Maps dashboard routes to assistant context for prompts and suggested questions. */
export type PageContext =
  | "general"
  | "pos"
  | "drugs"
  | "inventory"
  | "sales"
  | "analytics"
  | "patients";

export function pageContextFromPathname(pathname: string): PageContext {
  if (pathname.startsWith("/pos")) return "pos";
  if (pathname.startsWith("/inventory/drugs")) return "drugs";
  if (pathname.startsWith("/inventory/batches")) return "inventory";
  if (pathname.startsWith("/admin/sales")) return "sales";
  if (pathname.startsWith("/admin/analytics")) return "analytics";
  if (pathname.startsWith("/patients")) return "patients";
  if (pathname.startsWith("/dashboard")) return "general";
  return "general";
}
