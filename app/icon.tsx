import { ImageResponse } from "next/og";
import { BrandImageMark } from "@/components/brand-image-mark";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <BrandImageMark size={64} />,
    size,
  );
}
