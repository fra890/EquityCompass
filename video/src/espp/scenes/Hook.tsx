import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { pop, prog } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { ArtDefs } from "../../components/Paper";
import { T, useLayout } from "../../components/Stage";
import { C, FONT_HEAD } from "../../theme";
import { sceneSeconds } from "../timeline";

/** Two outcomes, one slider: the sale date. */
export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const L = useLayout();
  const a = pop(frame, 0.15);
  const b = pop(frame, 1.6);
  const track = pop(frame, 2.0);
  const end = sceneSeconds("hook");
  // handle sweeps early -> late -> settles in the middle
  const s1 = prog(frame, 2.4, 3.8);
  const s2 = prog(frame, 4.6, end - 0.6);
  const pos = 0.12 + 0.76 * s1 - 0.26 * s2;
  const late = pos > 0.5;
  const x = 90 + 820 * pos;
  return (
    <AbsoluteFill style={{ padding: `${L.tall ? 90 : 50}px 64px ${L.captionZone}px`, justifyContent: "space-between" }}>
      <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: L.tall ? 92 : 74, lineHeight: 1.03, letterSpacing: "-0.03em", color: C.ink }}>
        <div style={{ opacity: a, transform: `translateY(${(1 - a) * 24}px)` }}>
          Your ESPP discount gets taxed <Highlight at={0.9}>one of two ways.</Highlight>
        </div>
        <div style={{ opacity: b, transform: `translateY(${(1 - b) * 24}px)`, marginTop: L.tall ? 28 : 16, color: C.navy }}>
          The sale date picks which.
        </div>
      </div>
      <svg viewBox="0 0 1000 300" width="100%" style={{ overflow: "visible", maxHeight: L.tall ? 300 : 220, opacity: track }}>
        <ArtDefs />
        <rect x={90} y={186} width={410} height={30} fill={C.paperDark} />
        <rect x={500} y={186} width={410} height={30} fill={C.highlight} />
        <line x1={500} y1={160} x2={500} y2={244} stroke={C.ink} strokeWidth={5} strokeDasharray="6 8" />
        <T x={90} y={268} size={26} weight={700} fill={C.inkSoft}>sell sooner</T>
        <T x={910} y={268} size={26} weight={700} fill={C.inkSoft} anchor="end">sell later</T>
        <g transform={`translate(${x} 201)`} filter="url(#cut)">
          <rect x={-22} y={-44} width={44} height={88} fill={C.ink} />
        </g>
        <g transform={`translate(${Math.max(190, Math.min(810, x))} 96) rotate(${late ? 1.5 : -1.5})`}>
          <g filter="url(#cut)">
            <rect x={-190} y={-44} width={380} height={80} fill={late ? C.navy : C.white} />
          </g>
          <T x={0} y={10} size={40} weight={800} anchor="middle" head fill={late ? C.white : C.ink}>
            {late ? "qualifying" : "disqualifying"}
          </T>
        </g>
      </svg>
    </AbsoluteFill>
  );
};
