import React from "react";
import { useCurrentFrame } from "remotion";
import { pop, prog, easeOut } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { Stage, T } from "../../components/Stage";
import { C } from "../../theme";
import { FIG, KICKER } from "../script";
import { cue, sceneSeconds } from "../timeline";

const BASE = 650;
const BAR_H = 520;
const WITHHELD = 0.22; // matches FIG.withheld

const DEBTS = [
  { label: "Tax, federal + state", amount: FIG.tax },
  { label: "Borrowed from family", amount: FIG.family },
  { label: "Credit cards", amount: FIG.cards },
];

export const Squeeze: React.FC = () => {
  const frame = useCurrentFrame();
  const c1 = cue("squeeze", 1);
  const c2 = cue("squeeze", 2);
  const grow = prog(frame, 0.3, 1.5, easeOut);
  const band = prog(frame, 2.0, 2.7, easeOut);
  const jar = pop(frame, c2);
  const clock = pop(frame, c2 + 1.0);
  const drain = prog(frame, c2 + 1.0, sceneSeconds("squeeze"), (t) => t);
  const h = BAR_H * grow;
  return (
    <Stage kicker={KICKER} title={<>Paid in stock. <Highlight at={c2 + 0.2}>Short on cash.</Highlight></>}>
      <line x1={30} y1={BASE} x2={970} y2={BASE} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />

      {/* RSU income bar */}
      <g filter="url(#cut)">
        <rect x={50} y={BASE - h} width={190} height={h} fill={C.navy} />
      </g>
      <rect x={50} y={BASE - h} width={190} height={h * WITHHELD * band} fill={C.highlight} />
      <g opacity={grow}>
        <T x={145} y={BASE - BAR_H * 0.42} size={62} weight={800} anchor="middle" head fill={C.white}>~{FIG.rsuIncome}</T>
        <T x={145} y={BASE - BAR_H * 0.42 + 40} size={27} anchor="middle" fill={C.white}>RSU income</T>
        <T x={145} y={BASE - BAR_H * 0.42 + 74} size={27} anchor="middle" fill={C.white}>this year</T>
      </g>
      <g opacity={band}>
        <T x={145} y={BASE - BAR_H + 52} size={44} weight={800} anchor="middle" head>{FIG.withheld}</T>
        <T x={145} y={BASE - BAR_H + 88} size={26} weight={700} anchor="middle">withheld</T>
      </g>

      {/* obligations */}
      {DEBTS.map((d, i) => {
        const p = pop(frame, c1 + 0.2 + i * 0.75);
        return (
          <g key={i} opacity={Math.min(1, p * 1.5)} transform={`translate(${470 + i * 8} ${250 + i * 142}) rotate(${[-2, 1.5, -1][i]}) scale(${0.7 + 0.3 * p})`}>
            <g filter="url(#cut)">
              <rect x={-180} y={-62} width={360} height={124} fill={C.red} />
            </g>
            <T x={-156} y={-18} size={27} weight={600} fill={C.white}>{d.label}</T>
            <T x={-156} y={40} size={58} weight={800} head fill={C.white}>~{d.amount}</T>
          </g>
        );
      })}
      <g opacity={pop(frame, c1)}>
        <T x={296} y={150} size={27} weight={700} fill={C.red} letterSpacing="0.12em">HE OWES</T>
      </g>

      {/* nearly empty cash jar */}
      <g opacity={jar} transform={`translate(830 ${BASE}) scale(${0.8 + 0.2 * jar})`}>
        <rect x={-62} y={-262} width={124} height={24} fill={C.ink} />
        <path d="M-78 -238 h156 v212 q0 26 -26 26 h-104 q-26 0 -26 -26 z" fill={C.white} stroke={C.ink} strokeWidth={5} />
        <path d="M-75 -22 h150 q0 20 -24 20 h-102 q-24 0 -24 -20 z" fill={C.highlight} />
        <line x1={-75} y1={-22} x2={75} y2={-22} stroke={C.ink} strokeWidth={3} />
        <T x={0} y={-150} size={34} weight={800} anchor="middle" head>cash</T>
        <T x={0} y={-112} size={24} anchor="middle" fill={C.inkSoft}>very little</T>
      </g>

      {/* tender window countdown */}
      <g opacity={clock} transform={`translate(800 140) rotate(2) scale(${0.8 + 0.2 * clock})`}>
        <g filter="url(#cutSoft)">
          <rect x={-150} y={-74} width={300} height={148} fill={C.white} />
        </g>
        <circle cx={-98} cy={-18} r={30} fill="none" stroke={C.ink} strokeWidth={5} />
        <line x1={-98} y1={-18} x2={-98 + 21 * Math.sin(drain * 9)} y2={-18 - 21 * Math.cos(drain * 9)} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
        <T x={-54} y={-26} size={21} weight={700} fill={C.inkSoft}>TENDER WINDOW</T>
        <T x={-54} y={8} size={28} weight={800} head>closes in days</T>
        <rect x={-128} y={36} width={256} height={14} fill={C.paperDark} />
        <rect x={-128} y={36} width={256 * (0.32 - 0.2 * drain)} height={14} fill={C.ink} />
      </g>
    </Stage>
  );
};
