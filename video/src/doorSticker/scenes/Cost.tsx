import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { pop } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { useLayout } from "../../components/Stage";
import { C, FONT_BODY, FONT_HEAD } from "../../theme";
import { COST_LINES } from "../script";
import { sceneSeconds } from "../timeline";

/** Four plain lines, one at a time, kept on screen. */
export const Cost: React.FC = () => {
  const frame = useCurrentFrame();
  const L = useLayout();
  const step = (sceneSeconds("cost") - 2.6) / COST_LINES.length;
  return (
    <AbsoluteFill style={{ padding: `${L.tall ? 84 : 46}px 64px ${L.captionZone}px`, justifyContent: "center" }}>
      <div
        style={{
          fontFamily: FONT_BODY,
          fontWeight: 700,
          fontSize: L.tall ? 25 : 22,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: C.navy,
          marginBottom: 10,
        }}
      >
        Nothing here was free
      </div>
      <div
        style={{
          fontFamily: FONT_HEAD,
          fontWeight: 800,
          fontSize: L.tall ? 84 : 66,
          lineHeight: 1.04,
          letterSpacing: "-0.02em",
          color: C.ink,
          marginBottom: L.tall ? 50 : 26,
        }}
      >
        What it <Highlight at={0.5}>cost him.</Highlight>
      </div>
      {COST_LINES.map((line, i) => {
        const p = pop(frame, 0.9 + i * step);
        return (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 22,
              alignItems: "baseline",
              fontFamily: FONT_BODY,
              fontWeight: 600,
              fontSize: L.tall ? 47 : 40,
              lineHeight: 1.2,
              color: C.ink,
              padding: L.tall ? "20px 0" : "12px 0",
              borderTop: `3px solid ${C.ink}`,
              opacity: p,
              transform: `translateX(${(1 - p) * -24}px)`,
            }}
          >
            <span style={{ color: C.red, fontWeight: 800, fontFamily: FONT_HEAD }}>&rarr;</span>
            <span>{line}</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
