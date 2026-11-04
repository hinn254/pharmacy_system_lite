"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InsuranceScheme } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { upsertInsuranceScheme } from "@/lib/actions/insurance-schemes";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

export function InsurersClient({ initial }: { initial: InsuranceScheme[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InsuranceScheme | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  function startCreate() {
    setEditing(null);
    setName("");
    setCode("");
    setEmail("");
    setPhone("");
    setNotes("");
    setIsActive(true);
    setOpen(true);
  }

  function startEdit(s: InsuranceScheme) {
    setEditing(s);
    setName(s.name);
    setCode(s.code);
    setEmail(s.email ?? "");
    setPhone(s.phone ?? "");
    setNotes(s.notes ?? "");
    setIsActive(s.isActive);
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await upsertInsuranceScheme(
        {
          name,
          code,
          email: email || null,
          phone: phone || null,
          notes: notes || null,
          isActive,
        },
        editing?.id,
      );
      toast.success(editing ? "Scheme updated" : "Scheme added");
      setOpen(false);
      setRows((prev) => {
        if (editing) {
          return prev.map((r) => (r.id === saved.id ? saved : r));
        }
        return [saved, ...prev];
      });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" onClick={startCreate}>
          Add insurance
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24 text-right">Edit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-muted-foreground py-10 text-center"
              >
                No insurance schemes yet. Add your payers (NHIF, private
                insurers, etc.).
              </TableCell>
            </TableRow>
          ) : (
            rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="font-mono text-sm">{s.code}</TableCell>
                <TableCell className="max-w-[200px] truncate text-sm">
                  {s.email ?? "—"}
                </TableCell>
                <TableCell className="text-sm">{s.phone ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={s.isActive ? "ACTIVE" : "INACTIVE"} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => startEdit(s)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit insurance scheme" : "New insurance scheme"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. NHIF"
              />
            </div>
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                disabled={!!editing}
                className="font-mono"
                placeholder="e.g. NHIF"
              />
              {editing ? (
                <p className="text-muted-foreground text-xs">
                  Code cannot be changed after creation.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="claims@…"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Billing contacts, portal links…"
              />
            </div>
            <div className="flex items-center gap-3 rounded-md border px-3 py-2">
              <Checkbox
                id="ins-active"
                checked={isActive}
                onCheckedChange={(v) => setIsActive(v === true)}
              />
              <div>
                <Label htmlFor="ins-active" className="text-sm font-medium">
                  Active
                </Label>
                <div className="text-muted-foreground text-xs">
                  Inactive schemes are hidden at POS
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
