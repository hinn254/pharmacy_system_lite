import Link from "next/link";
import { ArrowRight, Pill, ShieldCheck, ShoppingCart, Stethoscope } from "lucide-react";
import type { DemoRole } from "@/lib/demo-roles";

const roles: Array<{
  role: DemoRole;
  label: string;
  description: string;
  icon: typeof ShieldCheck;
}> = [
  { role: "ADMIN", label: "Administrator", description: "Reporting, finance, users and settings", icon: ShieldCheck },
  { role: "CASHIER", label: "Cashier", description: "Queue-based checkout and payments", icon: ShoppingCart },
  { role: "PHARM_TECH", label: "Pharmacy technologist", description: "Consultations, dispensing and stock", icon: Pill },
  { role: "DOCTOR", label: "Doctor", description: "Assigned consultations and medication orders", icon: Stethoscope },
];

export function DemoRolePicker() {
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl bg-[#173a33]/12 shadow-[0_20px_55px_rgba(22,55,48,0.08)] ring-1 ring-[#173a33]/12 sm:grid-cols-2 lg:grid-cols-4">
        {roles.map(({ role, label, description, icon: Icon }) => {
          const loginPath = `/login?demo=${role}&callbackUrl=/dashboard`;
          const href = `/api/auth/clear?redirectTo=${encodeURIComponent(loginPath)}`;
          return (
            <Link
              key={role}
              href={href}
              prefetch={false}
              className="group flex min-h-32 items-center gap-4 bg-white p-5 text-left transition-colors hover:bg-[#edf7f4] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008c78] sm:min-h-44 sm:flex-col sm:items-start sm:gap-0 sm:p-6 lg:min-h-52"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-[#dff1ec] text-[#006b5d] transition-colors group-hover:bg-[#006b5d] group-hover:text-white"><Icon className="size-5" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1 sm:mt-5 sm:flex-none">
                <span className="block text-base font-semibold text-[#173a33]">{label}</span>
                <span className="mt-1 block text-sm leading-6 text-[#617871] sm:mt-2">{description}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[#006b5d] sm:mt-auto sm:pt-5">
                <span className="hidden sm:inline">Continue to sign in</span><ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </Link>
          );
        })}
    </div>
  );
}
