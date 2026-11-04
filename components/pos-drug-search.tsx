"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { searchDrugsForPos } from "@/lib/actions/drugs";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DrugForPos } from "@/lib/actions/drugs";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DEBOUNCE_MS = 280;

function totalOnHand(d: DrugForPos) {
  return d.batches.reduce((s, b) => s + b.quantityOnHand, 0);
}

function nextExpiryMeta(d: DrugForPos) {
  const b = d.batches[0];
  if (!b) return null;
  const dt = new Date(b.expiryDate);
  if (Number.isNaN(dt.getTime())) return null;
  const days = Math.ceil((dt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  const label = dt.toLocaleDateString();
  return { batchNumber: b.batchNumber, label, days };
}

function categoryMatchesQuery(category: DrugForPos["categories"][number], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return (
    category.name.toLowerCase().includes(q) ||
    category.slug.toLowerCase().includes(q)
  );
}

export function PosDrugSearch({
  onAdd,
  className,
}: {
  onAdd: (drug: DrugForPos) => void;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DrugForPos[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      void (async () => {
        try {
          const r = await searchDrugsForPos(q);
          setResults(r);
          setHighlight(0);
          setOpen(r.length > 0);
        } finally {
          setLoading(false);
        }
      })();
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const pick = useCallback(
    (drug: DrugForPos | undefined) => {
      if (!drug) return;
      onAdd(drug);
      setQuery("");
      setResults([]);
      setOpen(false);
      inputRef.current?.focus();
    },
    [onAdd],
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) {
      if (e.key === "Enter" && query.trim().length >= 1) {
        e.preventDefault();
        void (async () => {
          const r = await searchDrugsForPos(query.trim());
          if (r.length === 1) pick(r[0]);
        })();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(results.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(results[highlight] ?? results[0]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          ref={inputRef}
          autoFocus
          autoComplete="off"
          placeholder="Search name, category, code, or scan barcode…"
          className="h-11 pl-9 pr-3 text-base"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {loading && (
          <span className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs">
            …
          </span>
        )}
      </div>
      {open && results.length > 0 && (
        <ul
          className="bg-popover absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border py-1 shadow-md ring-1 ring-foreground/10"
          role="listbox"
        >
          {results.map((d, i) => {
            const matchingCategories = d.categories.filter((category) =>
              categoryMatchesQuery(category, query),
            );
            return (
              <li key={d.id} role="option" aria-selected={i === highlight}>
                <button
                  type="button"
                  className={cn(
                    "hover:bg-muted/80 flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm transition-colors",
                    i === highlight && "bg-muted",
                  )}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(d)}
                >
                  <span className="font-medium leading-tight">{d.genericName}</span>
                  <span className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                    <span className="font-mono">{d.internalCode}</span>
                    {d.barcode ? (
                      <span className="font-mono">BC {d.barcode}</span>
                    ) : null}
                    {d.isDda ? (
                      <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                        DDA
                      </Badge>
                    ) : null}
                    {matchingCategories.map((category) => (
                      <Badge
                        key={category.id}
                        variant="secondary"
                        className="h-5 px-1.5 text-[10px]"
                      >
                        {category.name}
                      </Badge>
                    ))}
                    <span className="font-mono tabular-nums">
                      KES {Number(d.priceCash).toFixed(2)}
                    </span>
                    <span className="tabular-nums">Stock {totalOnHand(d)}</span>
                    {(() => {
                      const meta = nextExpiryMeta(d);
                      if (!meta) return null;
                      return (
                        <span className="font-mono tabular-nums">
                          Batch {meta.batchNumber} · Exp {meta.label}
                          {Number.isFinite(meta.days) ? ` (${meta.days}d)` : ""}
                        </span>
                      );
                    })()}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {open && query.trim().length >= 1 && !loading && results.length === 0 && (
        <div className="bg-popover text-muted-foreground absolute z-50 mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-md">
          No matches (expired stock is hidden)
        </div>
      )}
    </div>
  );
}
