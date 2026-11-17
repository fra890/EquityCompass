import React from "react";
import { useCurrentFrame } from "remotion";
import { pop, prog, easeOut, lerp } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { Stage, T } from "../../components/Stage";
import { C } from "../../theme";
import { kicker } from "../script";
import { cue } from "../timeline";

export const Taxes: React.FC = () => {
  const frame = useCurrentFrame();
  const c1 = cue("taxes", 1);
  const c2 = cue("taxes", 2);
  const row1 = pop(frame, 0.2);
  const stamp = pop(frame, 1.2, 12);
  const row2 = pop(frame, c1);
  const row3 = pop(frame, c2);
  const mail = prog(frame, c2 + 0.5, c2 + 1.6);
  return (
    <Stage kicker={kicker(4)} title={<>Taxes: <Highlight at={c2 + 0.4}>no surprises</Highlight> in April.</>}>
      {/* AMT check */}
      <g opacity={row1} transform={`translate(0 ${(1 - row1) * 16})`}>
        <g filter="url(#cut)">
          <rect x={40} y={60} width={920} height={170} fill={C.white} />
        </g>
        <rect x={40} y={60} width={16} height={170} fill={C.navy} />
        <T x={90} y={130} size={50} weight={800} head>AMT check</T>
        <T x={90} y={184} size={27} fill={C.inkSoft}>pending the preparer's numbers</T>
        <g transform={`translate(740 146) rotate(-7) scale(${stamp > 0 ? 2.2 - 1.2 * stamp : 0})`} opacity={Math.min(1, stamp * 1.5)}>
          <rect x={-170} y={-40} width={340} height={80} fill="none" stroke={C.navy} strokeWidth={6} />
          <T x={0} y={12} size={32} weight={800} anchor="middle" head fill={C.navy}>NOTHING EXPECTED</T>
        </g>
      </g>

      {/* giving before the year-end cutoff */}
      <g opacity={row2} transform={`translate(0 ${(1 - row2) * 16})`}>
        <g filter="url(#cut)">
          <rect x={40} y={262} width={920} height={190} fill={C.white} />
        </g>
        <rect x={40} y={262} width={16} height={190} fill={C.navy} />
        <line x1={90} y1={410} x2={930} y2={410} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
        <line x1={810} y1={286} x2={810} y2={428} stroke={C.ink} strokeWidth={5} strokeDasharray="8 9" />
        <T x={822} y={316} size={22} weight={800} fill={C.ink}>year-end</T>
        <T x={822} y={342} size={22} weight={800} fill={C.ink}>cutoff</T>
        {["donor-advised fund", "gift of appreciated stock"].map((t, i) => {
          const d = prog(frame, c1 + 0.5 + i * 0.7, c1 + 1.3 + i * 0.7, easeOut);
          return (
            <g key={i} opacity={d} transform={`translate(${lerp(-200, 90 + i * 350, d)} ${322 + i * 0})`}>
              <rect width={i ? 350 : 320} height={62} fill={i ? C.navy : C.highlight} transform={`translate(${i ? 10 : 0} 0)`} />
              <T x={(i ? 350 : 320) / 2 + (i ? 10 : 0)} y={41} size={27} weight={800} anchor="middle" head fill={i ? C.white : C.ink}>{t}</T>
            </g>
          );
        })}
      </g>

      {/* CPA intro */}
      <g opacity={row3} transform={`translate(0 ${(1 - row3) * 16})`}>
        <g filter="url(#cut)">
          <rect x={40} y={484} width={920} height={190} fill={C.white} />
        </g>
        <rect x={40} y={484} width={16} height={190} fill={C.navy} />
        {/* envelope of 1099s travelling to the CPA */}
        <g transform={`translate(${lerp(130, 560, mail)} ${580 - Math.sin(mail * Math.PI) * 34})`}>
          <g filter="url(#cutSoft)">
            <rect x={-70} y={-44} width={140} height={88} fill={C.paperDark} stroke={C.ink} strokeWidth={3} />
          </g>
          <polyline points="-70,-44 0,10 70,-44" fill="none" stroke={C.ink} strokeWidth={3} />
          <T x={0} y={36} size={22} weight={800} anchor="middle">1099s</T>
        </g>
        <line x1={230} y1={580} x2={640} y2={580} stroke={C.ink} strokeWidth={3} strokeDasharray="4 10" opacity={0.5} />
        <g transform="translate(800 580)">
          <rect x={-130} y={-62} width={260} height={124} fill={C.navy} />
          <T x={0} y={-4} size={50} weight={800} anchor="middle" head fill={C.white}>CPA</T>
          <T x={0} y={36} size={23} weight={600} anchor="middle" fill={C.white}>intro requested</T>
        </g>
      </g>
    </Stage>
  );
};
