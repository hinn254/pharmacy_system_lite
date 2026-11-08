import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#006b5d",
        borderRadius: 38,
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          border: "16px solid white",
          borderRadius: 999,
          display: "flex",
          height: 104,
          transform: "rotate(-38deg)",
          width: 52,
        }}
      />
    </div>,
    size,
  );
}
