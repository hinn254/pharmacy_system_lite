import { ImageResponse } from "next/og";
import { BrandImageMark } from "@/components/brand-image-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <BrandImageMark size={180} />,
    size,
  );
}
