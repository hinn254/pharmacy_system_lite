import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusToneClasses: Record<string, string> = {
  ACTIVE:
    "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  OPEN: "border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  ASSIGNED:
    "border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  IN_CONSULT:
    "border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  READY_FOR_PHARMTECH:
    "border-violet-500/35 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  READY_FOR_CASHIER:
    "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  COMPLETED:
    "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  PAID: "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  CLOSED:
    "border-slate-500/35 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  INACTIVE:
    "border-slate-500/35 bg-slate-500/10 text-slate-600 dark:text-slate-400",
  DELETED:
    "border-slate-500/35 bg-slate-500/10 text-slate-600 dark:text-slate-400",
  DRAFT:
    "border-slate-500/35 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  CANCELLED:
    "border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  BANNED:
    "border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  VOIDED:
    "border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

export function formatStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export function StatusBadge({
  status,
  label,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Badge>, "variant"> & {
  status: string;
  label?: string;
}) {
  const normalizedStatus = status.trim().toUpperCase();

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 rounded-full px-2.5 text-[11px] font-semibold uppercase tracking-wide",
        statusToneClasses[normalizedStatus],
        className,
      )}
      {...props}
    >
      {label ?? formatStatusLabel(normalizedStatus)}
    </Badge>
  );
}
