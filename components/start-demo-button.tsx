import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";

const demoLoginHref = `/api/auth/clear?redirectTo=${encodeURIComponent("/login?demo=ADMIN&callbackUrl=/dashboard")}`;

export function StartDemoButton() {
  return (
    <Link
      href={demoLoginHref}
      prefetch={false}
      className="inline-flex h-13 items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-semibold text-[#173a33] ring-1 ring-[#173a33]/15 transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-[#eaf3f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006b5d] focus-visible:ring-offset-2"
    >
      <Play className="size-4 fill-current" aria-hidden="true" />
      See the sample pharmacy
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  );
}
