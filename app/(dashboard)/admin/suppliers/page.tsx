import { listSuppliersAction } from "@/lib/actions/suppliers";
import { SuppliersClient } from "@/components/suppliers-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight, ReceiptText, Wallet } from "lucide-react";

export default async function AdminSuppliersPage() {
  const suppliers = await listSuppliersAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Manage your vendor directory. Bills and payments live on payables.
        </p>
      </div>

      <Link
        href="/admin/suppliers/payables"
        className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/12 via-primary/5 to-transparent p-5 shadow-sm transition-[box-shadow,transform,border-color] hover:border-primary/40 hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 size-56 rounded-full bg-primary/10 blur-3xl transition-opacity group-hover:opacity-90"
        />
        <div className="relative flex gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-inner ring-4 ring-primary/15 sm:size-14">
            <Wallet className="size-6 sm:size-7" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-primary text-xs font-semibold uppercase tracking-wider">
              Accounts payable
            </p>
            <p className="text-lg font-semibold leading-tight sm:text-xl">
              Supplier payables
            </p>
            <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
              Record bills, log payments, and see balances owed at a glance.
            </p>
          </div>
        </div>
        <div className="relative flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
          <span className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-sm transition-transform group-hover:translate-x-0.5">
            Open payables
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
          <span className="text-muted-foreground hidden items-center gap-1.5 text-xs sm:flex">
            <ReceiptText className="size-3.5 shrink-0" aria-hidden />
            Bills & payments
          </span>
        </div>
      </Link>

      <Card>
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle>Directory</CardTitle>
          <CardDescription>
            Name, contacts, and speciality — editable anytime
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <SuppliersClient initial={suppliers} />
        </CardContent>
      </Card>
    </div>
  );
}
