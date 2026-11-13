import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { countUp, pop, prog, easeOut } from "../anim";
import { Highlight } from "../components/Highlight";
import { useLayout } from "../components/Stage";
import { N, usd } from "../numbers";
import { C, FONT_BODY, FONT_HEAD } from "../theme";
import { cue, sceneSeconds } from "../timeline";

/** Generic cut-paper rocket (no brand marks). */
const Rocket: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size * 2} viewBox="0 0 100 200" style={{ overflow: "visible" }}>
    <g style={{ filter: "drop-shadow(3px 5px 3px rgba(58,47,28,0.3))" }}>
      <polygon points="50,150 30,196 50,180 70,196" fill={C.highlight} />
      <polygon points="18,150 4,172 30,160" fill={C.ink} />
      <polygon points="82,150 96,172 70,160" fill={C.ink} />
      <path d="M50 4 C74 34 78 80 76 152 L24 152 C22 80 26 34 50 4 Z" fill={C.navy} />
      <path d="M50 4 C61 18 68 34 71 52 L29 52 C32 34 39 18 50 4 Z" fill={C.ink} />
      <circle cx="50" cy="86" r="12" fill={C.paper} />
    </g>
  </svg>
);

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const L = useLayout();
  const c1 = cue("hook", 1);
  const value = countUp(frame, c1, c1 + 1.6, N.totalSpread);
  const line1 = pop(frame, 0.1);
  const line2 = pop(frame, 1.9);
  const numIn = pop(frame, c1 - 0.1);
  const rise = prog(frame, 0, sceneSeconds("hook"), easeOut);
  const big = L.tall ? 96 : 80;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: L.tall ? 90 : 56,
          left: 64,
          right: 64,
          bottom: L.captionZone,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            fontFamily: FONT_HEAD,
            fontWeight: 800,
            fontSize: big,
            lineHeight: 1.02,
            letterSpacing: "-0.025em",
            color: C.ink,
            maxWidth: 800,
          }}
        >
          <div style={{ opacity: line1, transform: `translateY(${(1 - line1) * 26}px)` }}>
            They held SpaceX options for years.
          </div>
          <div
            style={{
              marginTop: L.tall ? 26 : 16,
              opacity: line2,
              transform: `translateY(${(1 - line2) * 26}px)`,
              color: C.navy,
            }}
          >
            Then <Highlight at={2.4}>IPO talk</Highlight> started.
          </div>
        </div>

        <div style={{ opacity: numIn, transform: `scale(${0.92 + 0.08 * numIn})`, transformOrigin: "0 100%" }}>
          <div
            style={{
              fontFamily: FONT_BODY,
              fontWeight: 700,
              fontSize: L.tall ? 28 : 24,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: C.navy,
            }}
          >
            Hypothetical · gain on paper
          </div>
          <div
            style={{
              fontFamily: FONT_HEAD,
              fontWeight: 800,
              fontSize: L.tall ? 168 : 140,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              color: C.ink,
              fontVariantNumeric: "tabular-nums",
              marginBottom: L.tall ? 30 : 12,
            }}
          >
            {usd(value)}
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: L.tall ? 70 : 64,
          top: (L.tall ? 560 : 400) - rise * (L.tall ? 330 : 250),
          transform: "rotate(14deg)",
        }}
      >
        <Rocket size={L.tall ? 150 : 104} />
      </div>
    </AbsoluteFill>
  );
};
