"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Supplier } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import { upsertSupplier } from "@/lib/actions/suppliers";
import { toast } from "sonner";
import { Building2, Mail, MapPin, Pencil, Phone } from "lucide-react";

function supplierInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function SuppliersClient({ initial }: { initial: Supplier[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [saving, setSaving] = useState(false);

  function startCreate() {
    setEditing(null);
    setName("");
    setAddress("");
    setPhone("");
    setEmail("");
    setSpeciality("");
    setOpen(true);
  }

  function startEdit(s: Supplier) {
    setEditing(s);
    setName(s.name);
    setAddress(s.address ?? "");
    setPhone(s.phone ?? "");
    setEmail(s.email ?? "");
    setSpeciality(s.speciality ?? "");
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await upsertSupplier(
        {
          name,
          address: address || null,
          phone: phone || null,
          email: email || null,
          speciality: speciality || null,
        },
        editing?.id,
      );
      toast.success(editing ? "Supplier updated" : "Supplier added");
      setOpen(false);
      setRows((prev) => {
        if (editing) {
          return prev.map((r) => (r.id === saved.id ? saved : r)).sort((a, b) =>
            a.name.localeCompare(b.name),
          );
        }
        return [...prev, saved].sort((a, b) => a.name.localeCompare(b.name));
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Building2 className="text-foreground/70 size-4 shrink-0" aria-hidden />
          <span>
            <span className="text-foreground font-medium">{rows.length}</span>
            {rows.length === 1 ? " supplier" : " suppliers"}
          </span>
        </div>
        <Button type="button" onClick={startCreate} className="shrink-0">
          Add supplier
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/80 bg-card/40 shadow-sm ring-1 ring-black/3 dark:ring-white/6">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="h-11 w-[min(28%,320px)] min-w-[200px] pl-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Supplier
              </TableHead>
              <TableHead className="h-11 hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                Speciality
              </TableHead>
              <TableHead className="h-11 hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
                Address
              </TableHead>
              <TableHead className="h-11 hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">
                Contact
              </TableHead>
              <TableHead className="h-11 w-14 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="sr-only">Edit</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground px-4 py-14 text-center text-sm leading-relaxed"
                >
                  No suppliers yet. Add distributors and wholesalers you order
                  from.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((s) => (
                <TableRow
                  key={s.id}
                  className="border-border/50 transition-colors hover:bg-muted/40"
                >
                  <TableCell className="py-3 pl-4 align-middle">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="bg-primary/12 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums ring-1 ring-primary/20"
                        aria-hidden
                      >
                        {supplierInitials(s.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium leading-tight">
                          {s.name}
                        </p>
                        <p className="text-muted-foreground mt-0.5 truncate text-xs md:hidden">
                          {s.speciality ?? "—"}
                        </p>
                        <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs sm:hidden">
                          {s.email ? (
                            <span className="inline-flex min-w-0 items-center gap-1">
                              <Mail className="size-3 shrink-0 opacity-70" />
                              <span className="truncate">{s.email}</span>
                            </span>
                          ) : null}
                          {s.phone ? (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="size-3 shrink-0 opacity-70" />
                              {s.phone}
                            </span>
                          ) : null}
                          {!s.email && !s.phone ? (
                            <span className="opacity-70">No contact</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden max-w-[200px] py-3 align-middle text-sm md:table-cell">
                    <span className="line-clamp-2">{s.speciality ?? "—"}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden max-w-[240px] py-3 align-middle text-sm lg:table-cell">
                    {s.address ? (
                      <span className="inline-flex items-start gap-2">
                        <MapPin className="text-foreground/50 mt-0.5 size-3.5 shrink-0" />
                        <span className="line-clamp-2 leading-snug">
                          {s.address}
                        </span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="hidden py-3 align-middle sm:table-cell">
                    <div className="flex min-w-0 flex-col gap-1.5 text-sm">
                      {s.email ? (
                        <a
                          href={`mailto:${s.email}`}
                          className="text-primary hover:underline inline-flex min-w-0 items-center gap-2 font-normal"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Mail className="text-muted-foreground size-3.5 shrink-0" />
                          <span className="truncate">{s.email}</span>
                        </a>
                      ) : (
                        <span className="text-muted-foreground inline-flex items-center gap-2">
                          <Mail className="size-3.5 shrink-0 opacity-40" />
                          —
                        </span>
                      )}
                      {s.phone ? (
                        <a
                          href={`tel:${s.phone.replace(/\s/g, "")}`}
                          className="text-foreground/90 hover:text-primary inline-flex items-center gap-2 font-normal"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="text-muted-foreground size-3.5 shrink-0" />
                          {s.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground inline-flex items-center gap-2">
                          <Phone className="size-3.5 shrink-0 opacity-40" />
                          —
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 pr-4 text-right align-middle">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground size-9 rounded-lg"
                      onClick={() => startEdit(s)}
                      aria-label={`Edit ${s.name}`}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit supplier" : "New supplier"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. KEMSA Supplies"
              />
            </div>
            <div className="space-y-2">
              <Label>Speciality</Label>
              <Input
                value={speciality}
                onChange={(e) => setSpeciality(e.target.value)}
                placeholder="e.g. cold chain, generics, devices"
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, city…"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="orders@…"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+254…"
              />
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
