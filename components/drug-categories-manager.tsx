"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DrugCategoryListItem } from "@/lib/actions/drug-categories";
import {
  deleteDrugCategory,
  upsertDrugCategory,
} from "@/lib/actions/drug-categories";

export function DrugCategoriesManager({
  categories,
  children,
}: {
  categories: DrugCategoryListItem[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const sorted = useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  async function onCreate() {
    const name = draftName.trim();
    if (name.length < 2) {
      toast.error("Enter a category name.");
      return;
    }
    setSaving(true);
    try {
      await upsertDrugCategory({ name });
      toast.success("Category created");
      setDraftName("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create category");
    } finally {
      setSaving(false);
    }
  }

  async function onRename(id: string) {
    const name = renameValue.trim();
    if (name.length < 2) {
      toast.error("Enter a category name.");
      return;
    }
    setSaving(true);
    try {
      await upsertDrugCategory({ name }, id);
      toast.success("Category updated");
      setRenamingId(null);
      setRenameValue("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update category");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    setSaving(true);
    try {
      await deleteDrugCategory(id);
      toast.success("Category deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete category");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Drug categories</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label>New category</Label>
                <Input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="e.g. Antihistamines"
                />
              </div>
              <Button
                type="button"
                onClick={onCreate}
                disabled={saving}
                className="sm:mb-px"
              >
                Add
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Categories are shared across your organization and can be assigned to multiple drugs.
            </p>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-right">Drugs</TableHead>
                  <TableHead className="w-[170px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      No categories yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  sorted.map((c) => {
                    const isEditing = renamingId === c.id;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          {isEditing ? (
                            <Input
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                            />
                          ) : (
                            c.name
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {c.slug}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c._count.drugs}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => onRename(c.id)}
                                  disabled={saving}
                                >
                                  Save
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setRenamingId(null);
                                    setRenameValue("");
                                  }}
                                  disabled={saving}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setRenamingId(c.id);
                                    setRenameValue(c.name);
                                  }}
                                  disabled={saving}
                                >
                                  Rename
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => onDelete(c.id)}
                                  disabled={saving}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

