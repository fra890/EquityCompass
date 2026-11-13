import React from "react";
import { useCurrentFrame } from "remotion";
import { pop, prog, easeOut } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { Stage, T } from "../../components/Stage";
import { C } from "../../theme";
import { KICKER } from "../script";
import { cue } from "../timeline";

const COLS = [180, 500, 820];
const PLAT_Y = 250;
const GROUND = 610;

const Person: React.FC<{ fill: string }> = ({ fill }) => (
  <g filter="url(#cutSoft)">
    <path d="M-30 0 L-21 -72 Q0 -94 21 -72 L30 0 Z" fill={fill} />
    <circle cx={0} cy={-112} r={26} fill={fill} />
  </g>
);

export const Coworkers: React.FC = () => {
  const frame = useCurrentFrame();
  const c1 = cue("coworkers", 1);
  const wobble = Math.sin(frame / 6) * 2.5 * prog(frame, c1 + 0.6, c1 + 1.2);
  return (
    <Stage kicker={KICKER} title={<>How are they <Highlight at={0.6}>keeping everything?</Highlight></>}>
      <line x1={30} y1={GROUND} x2={970} y2={GROUND} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
      {COLS.map((x, i) => {
        const stand = pop(frame, 0.3 + i * 0.25);
        const reveal = prog(frame, c1 + i * 0.35, c1 + 0.6 + i * 0.35, easeOut);
        const me = i === 2;
        return (
          <g key={i} transform={`translate(${x} ${me ? wobble : 0})`}>
            {/* what is underneath */}
            {i === 0 ? (
              <g opacity={reveal}>
                <rect x={-8} y={PLAT_Y + 26} width={16} height={110} fill={C.ink} />
                <g filter="url(#cut)">
                  <polygon points={`-120,${GROUND - 150} 0,${GROUND - 250} 120,${GROUND - 150}`} fill={C.ink} />
                  <rect x={-96} y={GROUND - 150} width={192} height={150} fill={C.white} />
                </g>
                <rect x={-22} y={GROUND - 84} width={44} height={84} fill={C.navy} />
                <rect x={42} y={GROUND - 112} width={34} height={34} fill={C.navySoft} />
                <rect x={-76} y={GROUND - 112} width={34} height={34} fill={C.navySoft} />
              </g>
            ) : null}
            {i === 1 ? (
              <g opacity={reveal}>
                {[0, 1, 2, 3].map((k) => {
                  const h = (GROUND - PLAT_Y - 26) * [0.45, 0.62, 0.8, 1][k];
                  return (
                    <g key={k} filter="url(#cutSoft)">
                      <rect x={-104 + k * 54} y={GROUND - h * reveal} width={46} height={h * reveal} fill={k === 3 ? C.navy : C.navySoft} />
                    </g>
                  );
                })}
              </g>
            ) : null}
            {me ? (
              <g opacity={reveal}>
                <rect x={-104} y={PLAT_Y + 44} width={208} height={GROUND - PLAT_Y - 60} fill="none" stroke={C.ink} strokeWidth={4} strokeDasharray="10 12" />
                <T x={0} y={PLAT_Y + 190} size={32} weight={800} anchor="middle" head>nothing</T>
                <T x={0} y={PLAT_Y + 228} size={32} weight={800} anchor="middle" head>yet</T>
              </g>
            ) : null}

            {/* cover that drops away */}
            <g opacity={1 - reveal} transform={`translate(0 ${reveal * 60})`}>
              <rect x={-112} y={PLAT_Y + 26} width={224} height={GROUND - PLAT_Y - 26} fill={C.paperDark} />
              <T x={0} y={PLAT_Y + 210} size={90} weight={800} anchor="middle" head fill={C.road}>?</T>
            </g>

            {/* platform + person */}
            <g opacity={stand} transform={`translate(0 ${(1 - stand) * -30})`}>
              <g filter="url(#cut)">
                <rect x={-124} y={PLAT_Y} width={248} height={26} fill={C.ink} />
              </g>
              <g transform={`translate(0 ${PLAT_Y})`}>
                <Person fill={me ? C.highlight : C.navy} />
              </g>
              <T x={0} y={PLAT_Y - 158} size={27} weight={700} anchor="middle" fill={me ? C.ink : C.inkSoft}>
                {me ? "him" : "coworker"}
              </T>
            </g>

            <g opacity={reveal}>
              <T x={0} y={GROUND + 48} size={29} weight={700} anchor="middle" fill={me ? C.ink : C.navy}>
                {["a house", "a bigger portfolio", "empty air"][i]}
              </T>
            </g>
          </g>
        );
      })}
    </Stage>
  );
};
