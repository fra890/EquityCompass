import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { pop, prog, easeOut } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { ArtDefs } from "../../components/Paper";
import { T, useLayout } from "../../components/Stage";
import { C, FONT_HEAD } from "../../theme";
import { cue } from "../timeline";

const BEATS = [0.2, 1.7, 3.3];
const PER_TRAY = [3, 2, 2, 2, 2, 2]; // 13 accounts across six custodians

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const L = useLayout();
  const b = BEATS.map((t) => pop(frame, t));
  const stockBar = prog(frame, BEATS[2] + 0.2, BEATS[2] + 1.1, easeOut);
  const dim = 1 - 0.0 * prog(frame, cue("hook", 1), cue("hook", 1) + 0.4);
  const size = L.tall ? 78 : 62;
  let card = 0;
  return (
    <AbsoluteFill style={{ padding: `${L.tall ? 84 : 44}px 60px ${L.captionZone}px`, justifyContent: "space-between", opacity: dim }}>
      <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: size, lineHeight: 1.05, letterSpacing: "-0.025em", color: C.ink }}>
        <div style={{ opacity: b[0], transform: `translateY(${(1 - b[0]) * 22}px)` }}>Two tech careers.</div>
        <div style={{ opacity: b[1], transform: `translateY(${(1 - b[1]) * 22}px)`, marginTop: L.tall ? 22 : 12, color: C.navy }}>
          More than a dozen accounts at <Highlight at={BEATS[1] + 0.5}>six custodians.</Highlight>
        </div>
        <div style={{ opacity: b[2], transform: `translateY(${(1 - b[2]) * 22}px)`, marginTop: L.tall ? 22 : 12 }}>
          Almost all stock, most of it in <Highlight at={BEATS[2] + 0.6}>eight names.</Highlight>
        </div>
      </div>
      <svg viewBox="0 0 1000 300" width="100%" style={{ overflow: "visible", maxHeight: L.tall ? 300 : 210 }}>
        <ArtDefs />
        {/* six custodians, thirteen accounts */}
        {PER_TRAY.map((n, i) => {
          const x = 10 + i * 82;
          return (
            <g key={i} opacity={b[1]}>
              <rect x={x} y={250} width={70} height={10} fill={C.ink} />
              {Array.from({ length: n }, (_, k) => {
                const p = pop(frame, BEATS[1] + 0.15 + card++ * 0.07);
                return (
                  <g key={k} opacity={p} transform={`translate(${x + 6} ${250 - (k + 1) * 46 * p})`}>
                    <g filter="url(#cutSoft)">
                      <rect width={58} height={38} fill={[C.white, C.navySoft, C.paperDark][(i + k) % 3]} />
                    </g>
                    <rect width={58} height={8} fill={C.navy} />
                  </g>
                );
              })}
            </g>
          );
        })}
        <g opacity={b[1]}>
          <T x={250} y={294} size={24} weight={700} anchor="middle" fill={C.inkSoft}>six custodians</T>
        </g>
        {/* almost all stock, most of it in eight names */}
        <g opacity={b[2]}>
          <rect x={540} y={60} width={450} height={50} fill={C.paperDark} />
          <rect x={540} y={60} width={450 * 0.93 * stockBar} height={50} fill={C.navy} />
          <T x={556} y={95} size={27} weight={800} head fill={C.white}>stock</T>
          {Array.from({ length: 8 }, (_, i) => {
            const p = pop(frame, BEATS[2] + 0.5 + i * 0.07);
            return (
              <g key={i} opacity={p} transform={`translate(${540 + (i % 4) * 114} ${134 + Math.floor(i / 4) * 62}) scale(${0.6 + 0.4 * p})`}>
                <g filter="url(#cutSoft)">
                  <rect width={104} height={52} fill={i < 5 ? C.navy : C.navySoft} />
                </g>
              </g>
            );
          })}
          <T x={765} y={294} size={24} weight={700} anchor="middle" fill={C.inkSoft}>eight names</T>
        </g>
      </svg>
    </AbsoluteFill>
  );
};
