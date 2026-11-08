import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#006b5d",
        borderRadius: 14,
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          border: "6px solid white",
          borderRadius: 999,
          display: "flex",
          height: 36,
          transform: "rotate(-38deg)",
          width: 18,
        }}
      />
    </div>,
    size,
  );
}
