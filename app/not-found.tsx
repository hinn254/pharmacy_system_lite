import Link from "next/link";
import { ArrowLeft, Pill } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f8f6] px-5 text-[#102521]">
      <section className="max-w-xl text-center">
        <Pill className="mx-auto size-9 text-[#006b5d]" aria-hidden="true" />
        <p className="mt-8 text-sm font-semibold text-[#006b5d]">404 · Page not found</p>
        <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
          This page is not in the pharmacy.
        </h1>
        <p className="mx-auto mt-5 max-w-md text-pretty text-lg leading-8 text-[#526a64]">
          The address may have changed, or the page may no longer exist.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#006b5d] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#00594e] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#006b5d]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Return to Pharmacy OS
        </Link>
      </section>
    </main>
  );
}
