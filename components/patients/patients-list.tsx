"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SerializedPatient } from "./types";

function formatDob(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function patientMatchesQuery(p: SerializedPatient, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [
    p.fullName,
    p.phone ?? "",
    p.email ?? "",
    p.notes ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

export function PatientsList({
  patients,
}: {
  patients: SerializedPatient[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => patients.filter((p) => patientMatchesQuery(p, query)),
    [patients, query],
  );

  if (patients.length === 0) {
    return <p className="text-muted-foreground text-sm">No patients yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search
          className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Search name, phone, email, notes…"
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filter patients"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No patients match &ldquo;{query.trim()}&rdquo;.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Phone</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell w-[110px]">DOB</TableHead>
                <TableHead className="w-[72px] text-right">Rx</TableHead>
                <TableHead className="w-[100px] text-right">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <div>{p.fullName}</div>
                    <div className="text-muted-foreground mt-0.5 text-xs sm:hidden">
                      {[p.phone, p.email].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {p.phone?.trim() || "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-[200px] truncate text-muted-foreground">
                    {p.email?.trim() || "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {formatDob(p.dob)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.prescriptions.length}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild type="button" variant="outline" size="sm">
                      <Link href={`/patients/${p.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-muted-foreground text-xs">
        Showing {filtered.length} of {patients.length} patient
        {patients.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
