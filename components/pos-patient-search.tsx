"use client";

import { useEffect, useRef, useState } from "react";
import { searchPatients, upsertPatient } from "@/lib/actions/patients";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { User, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Hit = { id: string; fullName: string; phone: string | null; email: string | null };

export function PosPatientSearch({
  selectedId,
  selectedLabel,
  onSelect,
}: {
  selectedId: string | null;
  selectedLabel: string | null;
  onSelect: (id: string | null, label: string | null) => void;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      void searchPatients(q).then(setHits);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (selectedId && selectedLabel) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
        <span className="flex items-center gap-2 min-w-0">
          <User className="text-muted-foreground size-4 shrink-0" />
          <span className="truncate font-medium">{selectedLabel}</span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={() => onSelect(null, null)}
          aria-label="Clear patient"
        >
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative space-y-2">
      <Label className="text-muted-foreground">Patient (optional)</Label>
      <Input
        placeholder="Search name or phone…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          const t = q.trim();
          if (!t) return;
          e.preventDefault();
          setNewName(t);
          setNewPhone("");
          setAddOpen(true);
          setOpen(false);
        }}
        className="h-9"
      />
      {open && (
        <ul className="bg-popover absolute z-40 mt-1 max-h-56 w-full overflow-auto rounded-md border py-1 shadow-md">
          <li>
            <button
              type="button"
              className={cn(
                "mx-1 mb-1 w-[calc(100%-0.5rem)] rounded-md px-3 py-2 text-left text-sm font-medium text-white",
                "bg-emerald-600 hover:bg-emerald-700",
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setNewName(q.trim());
                setNewPhone("");
                setAddOpen(true);
                setOpen(false);
              }}
            >
              Add Patient
            </button>
          </li>
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                className={cn("hover:bg-muted/80 w-full px-3 py-2 text-left text-sm")}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(h.id, h.fullName);
                  setQ("");
                  setOpen(false);
                }}
              >
                <div className="font-medium">{h.fullName}</div>
                <div className="text-muted-foreground text-xs">
                  {[h.phone, h.email].filter(Boolean).join(" · ") || "—"}
                </div>
              </button>
            </li>
          ))}
          {q.trim().length >= 1 && hits.length === 0 ? (
            <li className="text-muted-foreground px-3 py-2 text-sm">No matches</li>
          ) : null}
        </ul>
      )}

      <Dialog
        open={addOpen}
        onOpenChange={(v) => {
          if (saving) return;
          setAddOpen(v);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add patient</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="07XX XXX XXX"
                autoComplete="tel"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving || !newName.trim()}
              onClick={async () => {
                const fullName = newName.trim();
                const phone = newPhone.trim();
                if (!fullName) return;
                setSaving(true);
                try {
                  const created = await upsertPatient({
                    fullName,
                    phone: phone || null,
                    email: null,
                    dob: null,
                    notes: null,
                    marketingConsent: false,
                  });
                  onSelect(created.id, created.fullName);
                  setQ("");
                  setHits([]);
                  setAddOpen(false);
                  toast.success("Patient added");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed to add patient");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Saving…" : "Add patient"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
