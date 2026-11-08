import { ImageResponse } from "next/og";
import { BrandImageMark } from "@/components/brand-image-mark";

export const alt = "Pharmacy OS — connected pharmacy operations from shelf to patient";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const stages = [
  ["Stock", "Know every batch"],
  ["Sell", "Keep context at checkout"],
  ["Dispense", "Move the right medicine"],
  ["Understand", "Act on one operational truth"],
] as const;

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ background: "#0e2e28", color: "white", display: "flex", height: "100%", overflow: "hidden", position: "relative", width: "100%" }}>
      <div style={{ background: "#72ddc9", borderRadius: 999, display: "flex", height: 430, opacity: 0.08, position: "absolute", right: -120, top: -180, width: 430 }} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", width: "68%" }}>
        <div style={{ alignItems: "center", display: "flex", gap: 18 }}>
          <BrandImageMark size={68} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 31, fontWeight: 700, letterSpacing: -1 }}>Pharmacy OS</div>
            <div style={{ color: "#8fc8bd", display: "flex", fontSize: 15, letterSpacing: 2.2, marginTop: 4, textTransform: "uppercase" }}>Built for the whole pharmacy</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 56, fontWeight: 700, letterSpacing: -2.5, lineHeight: 1.03 }}>
            <div style={{ display: "flex" }}>The pharmacy,</div>
            <div style={{ display: "flex" }}>connected end to end.</div>
          </div>
          <div style={{ color: "#b9d8d1", display: "flex", flexDirection: "column", fontSize: 21, lineHeight: 1.4, marginTop: 26 }}>
            <div style={{ display: "flex" }}>POS, dispensing, batch inventory, patients,</div>
            <div style={{ display: "flex" }}>M-Pesa, insurance and finance.</div>
          </div>
        </div>
      </div>
      <div style={{ alignItems: "center", background: "#f0f7f4", display: "flex", justifyContent: "center", width: "32%" }}>
        <div style={{ display: "flex", flexDirection: "column", width: 250 }}>
          {stages.map(([stage, detail], index) => (
            <div key={stage} style={{ alignItems: "center", display: "flex", gap: 18, minHeight: 102, position: "relative" }}>
              {index < stages.length - 1 ? <div style={{ background: "#a9cec5", display: "flex", height: 68, left: 16, position: "absolute", top: 68, width: 2 }} /> : null}
              <div style={{ alignItems: "center", background: index === 3 ? "#006b5d" : "#d6ece6", borderRadius: 999, color: index === 3 ? "white" : "#006b5d", display: "flex", fontSize: 14, fontWeight: 700, height: 34, justifyContent: "center", width: 34 }}>{index + 1}</div>
              <div style={{ color: "#173a33", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 22, fontWeight: 700 }}>{stage}</div>
                <div style={{ color: "#5b756f", display: "flex", fontSize: 14, marginTop: 5 }}>{detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    size,
  );
}
