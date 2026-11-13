import React from "react";
import { useCurrentFrame } from "remotion";
import { pop, prog, easeOut } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { Stage, T } from "../../components/Stage";
import { C } from "../../theme";
import { FIG } from "../script";

export const PlanDebt: React.FC = () => {
  const frame = useCurrentFrame();
  const oldIn = pop(frame, 0.2);
  const swap = prog(frame, 1.5, 2.3);
  const newIn = pop(frame, 1.9);
  const arrow = prog(frame, 1.3, 1.9, easeOut);
  return (
    <Stage kicker="The plan · 4 of 5" title={<>Trade {FIG.cardRate} for a <Highlight at={2.2}>fixed payment.</Highlight></>}>
      {/* old: cards */}
      <g
        opacity={oldIn * (1 - swap * 0.55)}
        transform={`translate(${250 - swap * 30} ${360 + swap * 40}) rotate(${-4 - swap * 9}) scale(${(0.8 + 0.2 * oldIn) * (1 - swap * 0.14)})`}
      >
        <g filter="url(#cut)">
          <rect x={-200} y={-150} width={400} height={300} fill={C.red} />
        </g>
        <T x={-168} y={-88} size={30} weight={700} fill={C.white}>Credit cards</T>
        <T x={-168} y={48} size={150} weight={800} head fill={C.white}>{FIG.cardRate}</T>
        <T x={-168} y={104} size={28} fill={C.white}>and it compounds</T>
        <line x1={-200 * swap} y1={-150 * swap} x2={200 * swap} y2={150 * swap} stroke={C.ink} strokeWidth={10} strokeLinecap="round" opacity={swap} />
      </g>

      {/* swap arrow */}
      <g opacity={arrow} transform="translate(500 360)">
        <line x1={-34} y1={0} x2={-34 + 68 * arrow} y2={0} stroke={C.ink} strokeWidth={9} strokeLinecap="round" />
        <polyline points="14,-22 38,0 14,22" fill="none" stroke={C.ink} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* new: fixed loan. Still a debt, so still red, but bounded. */}
      <g opacity={Math.min(1, newIn * 1.5)} transform={`translate(752 360) rotate(2) scale(${0.75 + 0.25 * newIn})`}>
        <g filter="url(#cut)">
          <rect x={-215} y={-170} width={430} height={340} fill={C.white} />
        </g>
        <rect x={-215} y={-170} width={430} height={66} fill={C.red} />
        <T x={-186} y={-126} size={30} weight={700} fill={C.white}>Personal loan</T>
        <T x={-186} y={-36} size={62} weight={800} head>Fixed rate</T>
        <T x={-186} y={30} size={62} weight={800} head>{FIG.loanMonths} months</T>
        <line x1={-186} y1={62} x2={186} y2={62} stroke={C.ink} strokeWidth={3} strokeDasharray="3 9" strokeLinecap="round" />
        <T x={-186} y={124} size={46} weight={800} head fill={C.red}>~{FIG.loanPayment} a month</T>
      </g>
    </Stage>
  );
};
