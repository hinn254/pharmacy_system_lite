type BrandImageMarkProps = { size: number; color?: string };

/** Inline SVG variant for Next.js ImageResponse routes. */
export function BrandImageMark({ size, color = "#006b5d" }: BrandImageMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="13" fill={color} />
      <path d="M14 14h10c6.63 0 12 5.37 12 12v8" stroke="white" strokeWidth="5" strokeLinecap="round" />
      <path d="M14 14v9c0 6.08 4.92 11 11 11h11" stroke="white" strokeWidth="5" strokeLinecap="round" />
      <circle cx="14" cy="14" r="3.75" fill="#72ddc9" />
      <circle cx="36" cy="34" r="3.75" fill="#72ddc9" />
      <circle cx="25" cy="25" r="3.75" fill="white" />
    </svg>
  );
}
