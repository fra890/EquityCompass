import React from "react";
import { useCurrentFrame } from "remotion";
import { pop, prog, easeOut } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { Stage, T } from "../../components/Stage";
import { C } from "../../theme";
import { D, E, ESPP } from "../model";
import { KICKER } from "../script";
import { cue } from "../timeline";

const X0 = 70;
const X1 = 930;
const MONTHS = 30;
const mx = (m: number) => X0 + (m / MONTHS) * (X1 - X0);

export const Clock: React.FC = () => {
  const frame = useCurrentFrame();
  const c1 = cue("clock", 1);
  const base = prog(frame, 0.2, 0.9, easeOut);
  const barA = prog(frame, 0.9, 2.3);
  const barB = prog(frame, 2.3, 3.5);
  const zones = prog(frame, c1, c1 + 0.7, easeOut);
  const q = E.qualifiesAtMonth;
  const purchase = ESPP.offeringMonths;
  return (
    <Stage kicker="The holding periods" title={<>Two clocks. <Highlight at={c1 + 0.3}>Clear both.</Highlight></>}>
      {/* zones */}
      <rect x={mx(0)} y={480} width={(mx(q) - mx(0)) * zones} height={110} fill={C.paperDark} />
      <rect x={mx(q)} y={480} width={(X1 - mx(q)) * zones} height={110} fill={C.highlight} />
      <g opacity={zones}>
        <T x={(mx(0) + mx(q)) / 2} y={548} size={38} weight={800} anchor="middle" head>disqualifying</T>
        <T x={(mx(q) + X1) / 2} y={548} size={30} weight={800} anchor="middle" head>qualifying</T>
        <line x1={mx(q)} y1={150} x2={mx(q)} y2={610} stroke={C.ink} strokeWidth={5} strokeDasharray="8 9" />
        <T x={mx(q) + 14} y={176} size={24} weight={800}>both met</T>
      </g>

      {/* timeline */}
      <line x1={X0} y1={640} x2={X0 + (X1 - X0) * base} y2={640} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
      <g opacity={base}>
        {[0, purchase].map((m, i) => (
          <g key={m}>
            <circle cx={mx(m)} cy={640} r={11} fill={C.ink} />
            <T x={mx(m) + (i ? -6 : 0)} y={686} size={24} weight={700} fill={C.inkSoft}>{i ? "purchase" : "offering"}</T>
          </g>
        ))}
        <T x={X1} y={686} size={24} weight={700} anchor="end" fill={C.inkSoft}>time →</T>
      </g>

      {/* clock A: from the offering date */}
      <g filter="url(#cutSoft)">
        <rect x={mx(0)} y={210} width={(mx(ESPP.monthsFromOffering) - mx(0)) * barA} height={90} fill={C.navy} />
      </g>
      <g opacity={barA}>
        <T x={mx(0) + 22} y={266} size={34} weight={800} head fill={C.white}>{D.yearsFromOffering} years from the offering date</T>
      </g>
      {/* clock B: from the purchase date */}
      <g filter="url(#cutSoft)">
        <rect x={mx(purchase)} y={330} width={(mx(purchase + ESPP.monthsFromPurchase) - mx(purchase)) * barB} height={90} fill={C.ink} />
      </g>
      <g opacity={barB}>
        <T x={mx(purchase) + 22} y={372} size={28} weight={800} head fill={C.paper}>{D.yearsFromPurchase} year from</T>
        <T x={mx(purchase) + 22} y={404} size={28} weight={800} head fill={C.paper}>the purchase date</T>
      </g>
      <g opacity={pop(frame, c1 + 1.4)}>
        <T x={X0} y={130} size={26} weight={700} fill={C.inkSoft}>Both must pass. The later one sets the date.</T>
      </g>
    </Stage>
  );
};
