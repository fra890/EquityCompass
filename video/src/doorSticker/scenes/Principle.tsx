import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { pop } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { useLayout } from "../../components/Stage";
import { C, FONT_HEAD } from "../../theme";

const A = "Concentration was never the danger here.".split(" ");
const B_TAIL = "to keep it would have been.".split(" ");

export const Principle: React.FC = () => {
  const frame = useCurrentFrame();
  const L = useLayout();
  const word = (w: string, i: number, base: number) => {
    const p = pop(frame, base + i * 0.1);
    return (
      <span key={i} style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 22}px)`, marginRight: "0.26em" }}>
        {w}
      </span>
    );
  };
  const lead = pop(frame, 1.5);
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: L.tall ? "0 72px 60px" : "0 72px 20px" }}>
      <div style={{ width: 150, height: 14, background: C.navy, marginBottom: 44, transform: `scaleX(${pop(frame, 0.1)})`, transformOrigin: "0 50%" }} />
      <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: L.tall ? 96 : 82, lineHeight: 1.07, letterSpacing: "-0.03em", color: C.ink }}>
        <div style={{ color: C.navy }}>{A.map((w, i) => word(w, i, 0.3))}</div>
        <div style={{ marginTop: 30 }}>
          <span style={{ display: "inline-block", opacity: lead, transform: `translateY(${(1 - lead) * 22}px)`, marginRight: "0.26em" }}>
            <Highlight at={2.0} dur={0.6}>Borrowing at 24%</Highlight>
          </span>
          {B_TAIL.map((w, i) => word(w, i, 1.9))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
