"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function KpiCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <Card className="border-border/60 shadow-sm ring-1 ring-border/40">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
        {sublabel ? (
          <p className="text-xs text-muted-foreground">{sublabel}</p>
        ) : null}
      </CardHeader>
    </Card>
  );
}

