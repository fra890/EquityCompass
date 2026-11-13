import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { pop } from "../anim";
import { Highlight } from "../components/Highlight";
import { useLayout } from "../components/Stage";
import { C, FONT_HEAD } from "../theme";

const WORDS_A = "The best tax outcome on paper".split(" ");
const WORDS_B = "can be the most expensive one".split(" ");

export const Principle: React.FC = () => {
  const frame = useCurrentFrame();
  const L = useLayout();
  const word = (w: string, i: number, base: number) => {
    const p = pop(frame, base + i * 0.11);
    return (
      <span key={i} style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 22}px)`, marginRight: "0.26em" }}>
        {w}
      </span>
    );
  };
  const last = pop(frame, 0.4 + 1.2 + WORDS_B.length * 0.11);
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: L.tall ? "0 72px 60px" : "0 72px 20px" }}>
      <div style={{ width: 150, height: 14, background: C.navy, marginBottom: 44, transform: `scaleX(${pop(frame, 0.1)})`, transformOrigin: "0 50%" }} />
      <div
        style={{
          fontFamily: FONT_HEAD,
          fontWeight: 800,
          fontSize: L.tall ? 104 : 92,
          lineHeight: 1.06,
          letterSpacing: "-0.03em",
          color: C.ink,
        }}
      >
        <div style={{ color: C.navy }}>{WORDS_A.map((w, i) => word(w, i, 0.3))}</div>
        <div style={{ marginTop: 28 }}>
          {WORDS_B.map((w, i) => word(w, i, 1.5))}
          <span style={{ display: "inline-block", opacity: last, transform: `translateY(${(1 - last) * 22}px)` }}>
            <Highlight at={2.7} dur={0.6}>in cash.</Highlight>
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
