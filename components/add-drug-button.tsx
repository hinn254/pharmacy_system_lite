"use client";

import { DrugDialog } from "@/components/drug-dialog";
import { Button } from "@/components/ui/button";

export function AddDrugButton({
  categories,
}: {
  categories: { id: string; name: string; slug: string }[];
}) {
  return (
    <div className="relative z-10">
      <DrugDialog categories={categories}>
        <Button size="lg">Add drug</Button>
      </DrugDialog>
    </div>
  );
}

