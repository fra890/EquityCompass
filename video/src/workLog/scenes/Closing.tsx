import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { pop } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { ArtDefs } from "../../components/Paper";
import { useLayout } from "../../components/Stage";
import { C, FONT_HEAD } from "../../theme";

const ROWS = 16;
const COLS = [150, 110, 190, 110, 130, 170];

/** Closing line over one long, slowly scrolling spreadsheet. */
export const Closing: React.FC = () => {
  const frame = useCurrentFrame();
  const L = useLayout();
  const a = pop(frame, 0.2);
  const b = pop(frame, 1.5);
  const sheet = pop(frame, 0.1);
  const scroll = frame * 1.4;
  return (
    <AbsoluteFill>
      <svg viewBox={`0 0 1080 ${L.height}`} width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <ArtDefs />
        <g opacity={sheet * 0.9} transform={`translate(70 ${L.height * 0.6}) rotate(-3)`}>
          <g filter="url(#cut)">
            <rect width={960} height={ROWS * 46} fill={C.white} />
          </g>
          <clipPath id="sheetClip">
            <rect width={960} height={ROWS * 46} />
          </clipPath>
          <g clipPath="url(#sheetClip)">
            <g transform={`translate(0 ${-(scroll % 46)})`}>
              {Array.from({ length: ROWS + 2 }, (_, r) => {
                let x = 0;
                const row = r + Math.floor(scroll / 46);
                return (
                  <g key={r} transform={`translate(0 ${r * 46})`}>
                    <line x1={0} y1={46} x2={960} y2={46} stroke={C.paperDark} strokeWidth={2} />
                    {COLS.map((w, c) => {
                      const cell = (
                        <rect
                          key={c}
                          x={x + 14}
                          y={15}
                          width={w * (0.45 + 0.45 * (((row * 7 + c * 13) % 10) / 10))}
                          height={16}
                          fill={c === 0 ? C.navy : (row + c) % 5 === 0 ? C.highlight : C.paperDark}
                        />
                      );
                      x += w + 10;
                      return cell;
                    })}
                  </g>
                );
              })}
            </g>
          </g>
        </g>
      </svg>
      <div style={{ position: "absolute", top: L.tall ? 150 : 90, left: 72, right: 72 }}>
        <div style={{ width: 150, height: 14, background: C.navy, marginBottom: 40, transform: `scaleX(${pop(frame, 0.1)})`, transformOrigin: "0 50%" }} />
        <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: L.tall ? 84 : 68, lineHeight: 1.06, letterSpacing: "-0.03em", color: C.ink }}>
          <div style={{ color: C.navy, opacity: a, transform: `translateY(${(1 - a) * 22}px)` }}>That was a few months.</div>
          <div style={{ marginTop: 26, opacity: b, transform: `translateY(${(1 - b) * 22}px)` }}>
            Most of it was transfer forms and lot lists and <Highlight at={2.6} dur={0.7}>one long spreadsheet.</Highlight>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
