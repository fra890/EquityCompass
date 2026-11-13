import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { pop, prog, easeOut } from "../anim";
import { Highlight } from "../components/Highlight";
import { useLayout } from "../components/Stage";
import { C, FONT_BODY, FONT_HEAD } from "../theme";

export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const L = useLayout();
  const card = pop(frame, 0.1);
  const name = pop(frame, 0.6);
  const firm = pop(frame, 0.9);
  const tag = pop(frame, 1.2);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {/* cut-paper tide shapes */}
      <svg width="100%" height="100%" viewBox={`0 0 1080 ${L.height}`} style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(0 ${(1 - prog(frame, 0, 1.2, easeOut)) * 160})`}>
          <path d={`M0 ${L.height - 250} C260 ${L.height - 330} 520 ${L.height - 170} 1080 ${L.height - 290} V${L.height} H0 Z`} fill={C.navySoft} />
          <path d={`M0 ${L.height - 150} C300 ${L.height - 230} 700 ${L.height - 80} 1080 ${L.height - 180} V${L.height} H0 Z`} fill={C.navy} />
        </g>
      </svg>
      <div
        style={{
          width: 900,
          background: C.white,
          padding: L.tall ? "70px 64px 64px" : "52px 64px 50px",
          marginBottom: L.tall ? 150 : 110,
          boxShadow: "6px 9px 0 rgba(58,47,28,0.2)",
          transform: `rotate(-1deg) scale(${0.9 + 0.1 * card})`,
          opacity: Math.min(1, card * 1.5),
        }}
      >
        <Img src={staticFile("tidemark_logo.jpg")} style={{ width: 640, display: "block", mixBlendMode: "multiply" }} />
        <div style={{ height: 6, width: 120, background: C.highlight, margin: L.tall ? "54px 0 40px" : "38px 0 28px" }} />
        <div
          style={{
            fontFamily: FONT_HEAD,
            fontWeight: 800,
            fontSize: 96,
            lineHeight: 1,
            letterSpacing: "-0.03em",
            color: C.ink,
            opacity: name,
            transform: `translateY(${(1 - name) * 18}px)`,
          }}
        >
          Frank Alvarez
        </div>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontWeight: 600,
            fontSize: 40,
            color: C.navy,
            marginTop: 22,
            opacity: firm,
            transform: `translateY(${(1 - firm) * 18}px)`,
          }}
        >
          Tidemark Financial Partners
        </div>
        <div
          style={{
            fontFamily: FONT_HEAD,
            fontWeight: 700,
            fontSize: 52,
            color: C.ink,
            marginTop: L.tall ? 44 : 30,
            opacity: tag,
            transform: `translateY(${(1 - tag) * 18}px)`,
          }}
        >
          <Highlight at={1.6}>Equity comp for engineers.</Highlight>
        </div>
      </div>
    </AbsoluteFill>
  );
};
