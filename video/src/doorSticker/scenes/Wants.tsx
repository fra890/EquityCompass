import React from "react";
import { useCurrentFrame } from "remotion";
import { pop, prog, easeOut } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { Stage, T } from "../../components/Stage";
import { C } from "../../theme";
import { KICKER } from "../script";
import { cue } from "../timeline";

const WANTS = [
  ["Keep the", "most shares"],
  ["Pay the full", "tax bill"],
  ["Pay family", "back"],
  ["Clear the", "cards"],
  ["Keep a cash", "cushion"],
];
const BW = 176;
const BH = 190;
const TOP = 150;
const bx = (i: number) => 16 + i * 198;

export const Wants: React.FC = () => {
  const frame = useCurrentFrame();
  const c1 = cue("wants", 1);
  const rope = prog(frame, c1 - 0.3, c1 + 0.5, easeOut);
  const strain = prog(frame, c1 + 0.4, c1 + 1.2, easeOut);
  const shake = strain * Math.sin(frame * 1.7) * 2.2;
  const pull = strain * 14;
  const x1 = bx(0) + BW / 2 + pull * 0.6 + shake;
  const yb = TOP + BH;
  const sag = 150 * (1 - strain * 0.94);
  return (
    <Stage kicker={KICKER} title={<>Five wants. <Highlight at={c1 + 0.2}>Two pull back.</Highlight></>}>
      {/* ropes from 4 and 5 back to 1 */}
      {[3, 4].map((i) => {
        const x2 = bx(i) + BW / 2 + pull;
        const mid = (x1 + x2) / 2;
        const d = `M${x1} ${yb} C${x1} ${yb + sag + 40 + (i - 3) * 60} ${mid} ${yb + sag + 60 + (i - 3) * 70} ${x2} ${yb}`;
        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={C.ink}
            strokeWidth={6}
            strokeLinecap="round"
            opacity={rope}
          />
        );
      })}
      <g opacity={pop(frame, c1 + 0.9)} transform={`translate(500 ${yb + 190})`}>
        <rect x={-150} y={-36} width={300} height={56} fill={C.ink} transform="rotate(-1.5)" />
        <T x={0} y={3} size={32} weight={800} anchor="middle" head fill={C.highlight}>pull against #1</T>
      </g>

      {WANTS.map((w, i) => {
        const p = pop(frame, 0.4 + i * 0.75);
        const dx = i === 0 ? pull * 0.6 + shake : i >= 3 ? pull : 0;
        const tilt = i === 0 ? strain * 3 : i >= 3 ? -strain * 2 : 0;
        const tugging = i === 0 || i >= 3;
        return (
          <g key={i} opacity={Math.min(1, p * 1.5)} transform={`translate(${bx(i) + dx} ${TOP + (1 - p) * -40}) rotate(${tilt} ${BW / 2} ${BH})`}>
            <g filter="url(#cut)">
              <rect width={BW} height={BH} fill={i === 0 ? C.navy : C.white} />
            </g>
            <rect width={BW} height={12} fill={i === 0 ? C.highlight : tugging && strain > 0 ? C.ink : C.paperDark} />
            <T x={BW / 2} y={78} size={62} weight={800} anchor="middle" head fill={i === 0 ? C.white : C.ink}>{i + 1}</T>
            <T x={BW / 2} y={124} size={25} weight={700} anchor="middle" fill={i === 0 ? C.white : C.ink}>{w[0]}</T>
            <T x={BW / 2} y={156} size={25} weight={700} anchor="middle" fill={i === 0 ? C.white : C.ink}>{w[1]}</T>
          </g>
        );
      })}
    </Stage>
  );
};
