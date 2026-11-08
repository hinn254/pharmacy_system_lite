const STATIC_SEGMENTS = new Set([
  "admin", "analytics", "batches", "billing", "callback", "cashier", "clients",
  "consultations", "dashboard", "deleted-batches", "dispense", "doctor", "drugs",
  "finance", "insurers", "insurance", "inventory", "invoices", "labels", "login",
  "patients", "pos", "prescription", "print", "receipt", "register", "sales",
  "settings", "suppliers", "users", "payables",
]);

const PARAM_BY_PARENT: Record<string, string> = {
  patients: "patientId",
  consultations: "caseId",
  receipt: "saleId",
  invoices: "invoiceId",
};

/** Returns a path template only. Query strings, fragments, and record IDs are discarded. */
export function normalizeAnalyticsRoute(input: string): string {
  let pathname = "/";
  try {
    pathname = new URL(input, "https://analytics.invalid").pathname;
  } catch {
    pathname = input.split(/[?#]/, 1)[0] || "/";
  }

  const parts = pathname.split("/").filter(Boolean);
  const safe = parts.map((part, index) => {
    if (STATIC_SEGMENTS.has(part)) return part;
    const parent = parts[index - 1] ?? "";
    return `[${PARAM_BY_PARENT[parent] ?? "id"}]`;
  });
  return safe.length ? `/${safe.join("/")}` : "/";
}

export function routeAccess(path: string): "public" | "authenticated" {
  return path === "/" || path === "/login" || path === "/register"
    ? "public"
    : "authenticated";
}
