"use client";

import { useEffect, useState } from "react";
import { Search, Calendar as CalendarIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { endOfDay, format, startOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export type FinancePeriod = "week" | "month" | "year";

export type FinanceToolbarProps = {
  period: FinancePeriod;
  searchQuery: string;
};

function buildQuery(next: URLSearchParams) {
  const s = next.toString();
  return s ? `?${s}` : "";
}

const monthOptions = [
  { value: "1", label: "Jan" },
  { value: "2", label: "Feb" },
  { value: "3", label: "Mar" },
  { value: "4", label: "Apr" },
  { value: "5", label: "May" },
  { value: "6", label: "Jun" },
  { value: "7", label: "Jul" },
  { value: "8", label: "Aug" },
  { value: "9", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
] as const;

const ANY = "__any" as const;

function toIsoStart(d: Date) {
  return startOfDay(d).toISOString();
}

function toIsoEnd(d: Date) {
  return endOfDay(d).toISOString();
}

function coerceInt(v: string | null): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function FinanceToolbar({ period, searchQuery }: FinanceToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const year = coerceInt(searchParams.get("year"));
  const month = coerceInt(searchParams.get("month"));
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const [qDraft, setQDraft] = useState(searchQuery);
  const [rangeDraft, setRangeDraft] = useState<DateRange | undefined>(() => {
    if (!from || !to) return undefined;
    const f = new Date(from);
    const t = new Date(to);
    if (!Number.isFinite(f.getTime()) || !Number.isFinite(t.getTime())) return undefined;
    return { from: f, to: t };
  });

  useEffect(() => {
    setQDraft(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (!from || !to) {
      setRangeDraft(undefined);
      return;
    }
    const f = new Date(from);
    const t = new Date(to);
    if (!Number.isFinite(f.getTime()) || !Number.isFinite(t.getTime())) return;
    setRangeDraft({ from: f, to: t });
  }, [from, to]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const trimmed = qDraft.trim();
      const current = (searchParams.get("q") ?? "").trim();
      if (trimmed === current) return;
      const next = new URLSearchParams(searchParams.toString());
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      router.replace(`${pathname}${buildQuery(next)}`);
    }, 350);
    return () => window.clearTimeout(t);
  }, [qDraft, pathname, router, searchParams]);

  function setPeriod(nextPeriod: FinancePeriod) {
    if (nextPeriod === period) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set("preset", nextPeriod);
    next.delete("from");
    next.delete("to");
    next.delete("year");
    next.delete("month");
    router.push(`${pathname}${buildQuery(next)}`);
  }

  function setYear(nextYear: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (nextYear && nextYear !== ANY) next.set("year", nextYear);
    else next.delete("year");
    next.delete("from");
    next.delete("to");
    router.push(`${pathname}${buildQuery(next)}`);
  }

  function setMonth(nextMonth: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (nextMonth && nextMonth !== ANY) next.set("month", nextMonth);
    else next.delete("month");
    if (!next.get("year")) next.set("year", String(new Date().getFullYear()));
    next.delete("from");
    next.delete("to");
    router.push(`${pathname}${buildQuery(next)}`);
  }

  function applyRange(nextRange: DateRange | undefined) {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("year");
    next.delete("month");

    if (!nextRange?.from || !nextRange?.to) {
      next.delete("from");
      next.delete("to");
      router.push(`${pathname}${buildQuery(next)}`);
      return;
    }

    next.set("from", toIsoStart(nextRange.from));
    next.set("to", toIsoEnd(nextRange.to));
    router.push(`${pathname}${buildQuery(next)}`);
  }

  const yearOptions = (() => {
    const now = new Date();
    const current = now.getFullYear();
    const start = current - 5;
    const end = current + 1;
    const out: { value: string; label: string }[] = [{ value: ANY, label: "Any year" }];
    for (let y = end; y >= start; y -= 1) out.push({ value: String(y), label: String(y) });
    return out;
  })();

  const rangeLabel = (() => {
    if (!rangeDraft?.from && !rangeDraft?.to) return "Pick range";
    if (rangeDraft?.from && !rangeDraft?.to) return format(rangeDraft.from, "MMM d, yyyy");
    if (rangeDraft?.from && rangeDraft?.to) {
      return `${format(rangeDraft.from, "MMM d, yyyy")} – ${format(rangeDraft.to, "MMM d, yyyy")}`;
    }
    return "Pick range";
  })();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="inline-flex rounded-lg border border-border/70 bg-muted/30 p-1">
          {(
            [
              { id: "week" as const, label: "This week" },
              { id: "month" as const, label: "This month" },
              { id: "year" as const, label: "This year" },
            ] as const
          ).map(({ id, label }) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={period === id ? "default" : "ghost"}
              className="rounded-md px-3 shadow-none"
              onClick={() => setPeriod(id)}
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={year ? String(year) : ANY} onValueChange={setYear}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={month ? String(month) : ANY} onValueChange={setMonth}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any month</SelectItem>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-9 justify-start gap-2 font-normal"
              >
                <CalendarIcon className="size-4 text-muted-foreground" />
                <span className={rangeDraft?.from ? "" : "text-muted-foreground"}>
                  {rangeLabel}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-2">
                <Calendar
                  mode="range"
                  numberOfMonths={2}
                  selected={rangeDraft}
                  onSelect={setRangeDraft}
                  defaultMonth={rangeDraft?.from}
                />
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRangeDraft(undefined);
                      applyRange(undefined);
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="ml-auto"
                    disabled={!rangeDraft?.from || !rangeDraft?.to}
                    onClick={() => applyRange(rangeDraft)}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="relative w-full sm:max-w-xs sm:flex-1 sm:min-w-[200px]">
        <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
        <Input
          value={qDraft}
          onChange={(e) => setQDraft(e.target.value)}
          placeholder="Search expenses…"
          className="h-9 pl-8"
          aria-label="Search expenses"
        />
      </div>
    </div>
  );
}
