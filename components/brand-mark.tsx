import { cn } from "@/lib/utils";

type BrandMarkProps = { className?: string; title?: string };

/** A connected path from stock, through care, to the business. */
export function BrandMark({ className, title }: BrandMarkProps) {
  return (
    <svg viewBox="0 0 48 48" role={title ? "img" : undefined} aria-hidden={title ? undefined : true} className={cn("shrink-0", className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      {title ? <title>{title}</title> : null}
      <rect width="48" height="48" rx="13" fill="currentColor" />
      <path d="M14 14h10c6.63 0 12 5.37 12 12v8" stroke="white" strokeWidth="5" strokeLinecap="round" />
      <path d="M14 14v9c0 6.08 4.92 11 11 11h11" stroke="white" strokeWidth="5" strokeLinecap="round" />
      <circle cx="14" cy="14" r="3.75" fill="#72ddc9" />
      <circle cx="36" cy="34" r="3.75" fill="#72ddc9" />
      <circle cx="25" cy="25" r="3.75" fill="white" />
    </svg>
  );
}
