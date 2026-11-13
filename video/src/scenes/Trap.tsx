import React from "react";
import { useCurrentFrame } from "remotion";
import { countUp, pop, prog, easeOut } from "../anim";
import { Highlight } from "../components/Highlight";
import { Stage, T } from "../components/Stage";
import { D, N, usd, usdRound } from "../numbers";
import { C } from "../theme";

const amtRounded = Number(usdRound(N.allAtOnce.amt).replace(/[$,]/g, ""));

export const Trap: React.FC = () => {
  const frame = useCurrentFrame();
  const land = pop(frame, 0.4, 11);
  const lock = pop(frame, 8.4);
  const bill = prog(frame, 4.2, 5.0, easeOut);
  const amount = countUp(frame, 4.9, 6.6, amtRounded);
  const stamp = pop(frame, 8.0, 12);
  return (
    <Stage kicker="Hypothetical example" title={<>Exercise everything. <Highlight at={4.4}>Owe AMT.</Highlight></>}>
      {/* the exercised shares */}
      <g transform={`translate(245 ${370 - (1 - land) * 520}) rotate(-3)`} opacity={Math.min(1, land * 2)}>
        {[2, 1, 0].map((i) => (
          <g key={i} filter="url(#cut)" transform={`translate(${i * 12} ${i * -12}) rotate(${i * 2.2})`}>
            <rect x={-215} y={-250} width={430} height={500} fill={i === 0 ? C.white : C.paperDark} />
          </g>
        ))}
        <rect x={-215} y={-250} width={430} height={70} fill={C.navy} />
        <T x={0} y={-203} size={30} weight={700} anchor="middle" fill={C.white}>EXERCISED TODAY</T>
        <T x={0} y={-92} size={84} weight={800} anchor="middle" head>{D.isoCount}</T>
        <T x={0} y={-46} size={32} anchor="middle" fill={C.inkSoft}>ISOs, all at once</T>
        <line x1={-170} y1={-8} x2={170} y2={-8} stroke={C.ink} strokeWidth={3} strokeDasharray="3 9" strokeLinecap="round" />
        <T x={0} y={48} size={30} anchor="middle" fill={C.inkSoft}>{D.isoCount} x {D.spreadPerShare} spread</T>
        <T x={0} y={112} size={56} weight={800} anchor="middle" head fill={C.navy}>{D.totalSpread}</T>
        <T x={0} y={156} size={28} anchor="middle" fill={C.inkSoft}>counted as AMT income</T>
        {/* padlock: shares can't be sold yet */}
        <g transform={`translate(0 206) scale(${lock})`} opacity={lock}>
          <rect x={-150} y={-26} width={300} height={56} fill={C.ink} />
          <path d="M-128 -4 v-8 a9 9 0 0 1 18 0 v8" fill="none" stroke={C.highlight} strokeWidth={5} />
          <rect x={-133} y={-4} width={28} height={22} fill={C.highlight} />
          <T x={16} y={12} size={27} weight={700} anchor="middle" fill={C.paper}>can't sell yet</T>
        </g>
      </g>

      {/* the red AMT bill */}
      <g transform={`translate(${740 + (1 - bill) * 620} 360) rotate(${4 - (1 - bill) * 10})`} opacity={bill > 0 ? 1 : 0}>
        <g filter="url(#cut)">
          <polygon points="-235,-290 235,-290 235,270 196,292 157,270 118,292 78,270 39,292 0,270 -39,292 -78,270 -118,292 -157,270 -196,292 -235,270" fill={C.red} />
        </g>
        <T x={0} y={-218} size={64} weight={800} anchor="middle" head fill={C.white}>AMT BILL</T>
        <T x={0} y={-172} size={25} weight={600} anchor="middle" fill={C.white} opacity={0.9}>alternative minimum tax</T>
        <line x1={-195} y1={-140} x2={195} y2={-140} stroke={C.white} strokeWidth={3} strokeDasharray="3 9" strokeLinecap="round" />
        <T x={-195} y={-88} size={28} fill={C.white}>Gain on paper</T>
        <T x={195} y={-88} size={28} weight={700} anchor="end" fill={C.white}>{usd(N.totalSpread)}</T>
        <T x={-195} y={-40} size={28} fill={C.white}>Cash from a sale</T>
        <T x={195} y={-40} size={28} weight={700} anchor="end" fill={C.white}>$0</T>
        <line x1={-195} y1={-8} x2={195} y2={-8} stroke={C.white} strokeWidth={3} strokeDasharray="3 9" strokeLinecap="round" />
        <T x={0} y={44} size={28} weight={600} anchor="middle" fill={C.white}>AMT due, roughly</T>
        <T x={0} y={122} size={80} weight={800} anchor="middle" head fill={C.white} style={{ fontVariantNumeric: "tabular-nums" }}>
          {usd(amount)}
        </T>
        <T x={0} y={164} size={24} anchor="middle" fill={C.white} opacity={0.9}>hypothetical · federal only</T>
        {/* stamp */}
        <g transform={`translate(56 236) rotate(-7) scale(${stamp > 0 ? 2.4 - 1.4 * stamp : 0})`} opacity={Math.min(1, stamp * 1.5)}>
          <rect x={-150} y={-36} width={300} height={72} fill={C.ink} stroke={C.white} strokeWidth={4} />
          <T x={0} y={13} size={38} weight={800} anchor="middle" head fill={C.white}>DUE IN CASH</T>
        </g>
      </g>
    </Stage>
  );
};
