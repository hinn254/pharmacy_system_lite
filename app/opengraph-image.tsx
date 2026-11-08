import { ImageResponse } from "next/og";

export const alt =
  "Pharmacy OS — pharmacy management software built for Kenyan pharmacies";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        background: "#0e2e28",
        color: "white",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "space-between",
        padding: "72px 80px",
        width: "100%",
      }}
    >
      <div style={{ alignItems: "center", display: "flex", gap: 20 }}>
        <div
          style={{
            alignItems: "center",
            background: "#72ddc9",
            borderRadius: 18,
            display: "flex",
            height: 72,
            justifyContent: "center",
            width: 72,
          }}
        >
          <div
            style={{
              border: "7px solid #0e2e28",
              borderRadius: 999,
              display: "flex",
              height: 42,
              transform: "rotate(-38deg)",
              width: 21,
            }}
          />
        </div>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>
          Pharmacy OS
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div
          style={{
            display: "flex",
            fontSize: 70,
            fontWeight: 700,
            letterSpacing: -3,
            lineHeight: 1.05,
            maxWidth: 980,
          }}
        >
          Pharmacy management software built for Kenyan pharmacies.
        </div>
        <div style={{ color: "#b9d8d1", display: "flex", fontSize: 28 }}>
          POS · dispensing · batch inventory · M-Pesa · insurance · finance
        </div>
      </div>
    </div>,
    size,
  );
}
