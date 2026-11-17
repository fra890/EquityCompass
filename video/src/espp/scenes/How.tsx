import React from "react";
import { useCurrentFrame } from "remotion";
import { pop, prog, easeOut } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { Stage, T } from "../../components/Stage";
import { C } from "../../theme";
import { D, E, ESPP } from "../model";
import { KICKER } from "../script";
import { cue } from "../timeline";

const X0 = 150;
const X1 = 660;
const Y0 = 640;
const PMAX = ESPP.purchasePrice * 1.25;
const py = (p: number) => Y0 - (p / PMAX) * 500;

export const How: React.FC = () => {
  const frame = useCurrentFrame();
  const c1 = cue("how", 1);
  const c2 = cue("how", 2);
  const axes = prog(frame, 0.2, 0.8, easeOut);
  const line = prog(frame, c1 + 0.2, c1 + 1.8);
  const yo = py(ESPP.offeringPrice);
  const yp = py(ESPP.purchasePrice);
  const ypaid = py(E.paid);
  const paid = pop(frame, c2 + 0.5);
  const gap = pop(frame, c2 + 1.4);
  const noTax = pop(frame, c2 + 2.4);
  return (
    <Stage kicker={KICKER} title={<>Buy at a discount. <Highlight at={c2 + 0.6}>Off the lower price.</Highlight></>}>
      <g opacity={axes}>
        <line x1={X0 - 40} y1={Y0} x2={X1 + 60} y2={Y0} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
        <T x={X0} y={Y0 + 46} size={26} weight={700} anchor="middle" fill={C.inkSoft}>offering starts</T>
        <T x={X1} y={Y0 + 46} size={26} weight={700} anchor="middle" fill={C.inkSoft}>purchase date</T>
      </g>
      {/* payroll deductions accumulate across the offering period */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const p = pop(frame, 0.5 + i * 0.3);
        return (
          <g key={i} opacity={p} transform={`translate(${X0 + 36 + i * 80} ${Y0 - 30 * p})`}>
            <ellipse rx={30} ry={17} fill={C.highlight} stroke={C.ink} strokeWidth={3} />
            <T x={0} y={8} size={22} weight={800} anchor="middle" head>$</T>
          </g>
        );
      })}
      <g opacity={pop(frame, 0.6)}>
        <T x={(X0 + X1) / 2} y={Y0 - 70} size={24} weight={700} anchor="middle" fill={C.inkSoft}>payroll deductions</T>
      </g>

      {/* stock price over the offering period */}
      <path
        d={`M${X0} ${yo} C${X0 + 170} ${yo - 10} ${X1 - 200} ${yp + 60} ${X1} ${yp}`}
        fill="none"
        stroke={C.ink}
        strokeWidth={8}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - line}
        opacity={line > 0 ? 1 : 0}
      />
      <g opacity={pop(frame, c1 + 0.2)}>
        <circle cx={X0} cy={yo} r={12} fill={C.ink} />
        <T x={X0 - 22} y={yo + 12} size={40} weight={800} anchor="end" head>{D.offering}</T>
      </g>
      <g opacity={pop(frame, c1 + 1.7)}>
        <circle cx={X1} cy={yp} r={12} fill={C.ink} />
        <T x={X1 + 44} y={yp + 4} size={44} weight={800} head>{D.purchase}</T>
        <T x={X1 + 44} y={yp + 38} size={25} fill={C.inkSoft}>market value</T>
      </g>

      {/* what you pay: the discount off the lower (offering-date) price */}
      <g opacity={paid}>
        <line x1={X0} y1={yo} x2={X1} y2={yo} stroke={C.ink} strokeWidth={3} strokeDasharray="4 10" />
        <line x1={X0} y1={ypaid} x2={X1 + 12} y2={ypaid} stroke={C.navy} strokeWidth={7} strokeLinecap="round" />
        <T x={X1 + 44} y={ypaid + 16} size={50} weight={800} head fill={C.navy}>{D.paid}</T>
        <T x={X1 + 44} y={ypaid + 50} size={25} weight={700} fill={C.navy}>you pay</T>
        <T x={X0 + 14} y={ypaid + 38} size={27} weight={800} fill={C.navy}>{D.basePrice} × {D.payPct} = {D.paid}</T>
      </g>
      {/* the built-in gap on the purchase date */}
      <g opacity={gap}>
        <rect x={X1 - 28} y={yp} width={56} height={(ypaid - yp) * gap} fill={C.highlight} opacity={0.9} />
        <line x1={X1} y1={yp} x2={X1} y2={ypaid} stroke={C.ink} strokeWidth={4} strokeDasharray="5 8" />
        <g transform={`translate(${X1 - 200} ${yp - 70}) rotate(-2)`} filter="url(#cutSoft)">
          <rect x={-120} y={-34} width={240} height={68} fill={C.white} />
          <T x={0} y={12} size={32} weight={800} anchor="middle" head>{D.dqOrdinary} gap</T>
        </g>
      </g>
      <g opacity={noTax} transform={`translate(810 ${110}) rotate(4) scale(${noTax > 0 ? 1.8 - 0.8 * noTax : 0})`}>
        <rect x={-150} y={-44} width={300} height={88} fill="none" stroke={C.navy} strokeWidth={6} />
        <T x={0} y={-2} size={30} weight={800} anchor="middle" head fill={C.navy}>NO TAX</T>
        <T x={0} y={30} size={24} weight={800} anchor="middle" head fill={C.navy}>AT PURCHASE</T>
      </g>
    </Stage>
  );
};
