import React from "react";
import { useCurrentFrame } from "remotion";
import { countUp, pop, prog, easeOut } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { Stage, T } from "../../components/Stage";
import { C } from "../../theme";
import { D, E } from "../model";
import { cue } from "../timeline";

const BASE = 540;
const MAXH = 300;
const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

/** The same comparison in dollars of tax, on a round number of shares. */
export const Dollars: React.FC = () => {
  const frame = useCurrentFrame();
  const c1 = cue("dollars", 1);
  const assume = pop(frame, 0.3);
  const a = prog(frame, c1, c1 + 1.2, easeOut);
  const b = prog(frame, c1 + 1.4, c1 + 2.4, easeOut);
  const diff = pop(frame, c1 + 2.8);
  const hEarly = MAXH * a;
  const hWait = MAXH * (E.taxWait / E.taxEarly) * b;
  return (
    <Stage kicker="Hypothetical · assumed tax rates" title={<>What that is <Highlight at={c1 + 0.4}>in dollars.</Highlight></>}>
      {/* assumptions, stated up front */}
      <g opacity={assume} transform={`translate(0 ${(1 - assume) * 12})`}>
        <g filter="url(#cutSoft)">
          <rect x={60} y={40} width={880} height={84} fill={C.white} />
        </g>
        <T x={500} y={93} size={30} weight={800} anchor="middle" head>
          {D.shares} shares · {D.ordinaryRate} ordinary · {D.longTermRate} long-term
        </T>
      </g>

      <line x1={90} y1={BASE} x2={910} y2={BASE} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
      {/* sell early */}
      <g filter="url(#cut)">
        <rect x={170} y={BASE - hEarly} width={220} height={hEarly} fill={C.red} />
      </g>
      <g opacity={a > 0 ? 1 : 0}>
        <T x={280} y={BASE - hEarly - 18} size={56} weight={800} anchor="middle" head style={{ fontVariantNumeric: "tabular-nums" }}>
          {money(countUp(frame, c1, c1 + 1.2, E.taxEarly))}
        </T>
        <T x={280} y={BASE + 48} size={34} weight={800} anchor="middle" head>Sell early</T>
        <T x={280} y={BASE + 86} size={23} anchor="middle" fill={C.inkSoft}>{D.totalGain} × {D.ordinaryRate}</T>
        <T x={280} y={BASE + 116} size={23} anchor="middle" fill={C.inkSoft}>× {D.shares} shares</T>
      </g>
      {/* wait */}
      <g filter="url(#cut)">
        <rect x={610} y={BASE - hWait} width={220} height={hWait} fill={C.red} />
      </g>
      <g opacity={b > 0 ? 1 : 0}>
        <T x={720} y={BASE - hWait - 18} size={56} weight={800} anchor="middle" head style={{ fontVariantNumeric: "tabular-nums" }}>
          {money(countUp(frame, c1 + 1.4, c1 + 2.4, E.taxWait))}
        </T>
        <T x={720} y={BASE + 48} size={34} weight={800} anchor="middle" head>Wait</T>
        <T x={720} y={BASE + 86} size={23} anchor="middle" fill={C.inkSoft}>{D.qOrdinary} × {D.ordinaryRate} + {D.qCapital} × {D.longTermRate}</T>
        <T x={720} y={BASE + 116} size={23} anchor="middle" fill={C.inkSoft}>× {D.shares} shares</T>
      </g>
      {/* the difference */}
      <g opacity={diff} transform={`translate(500 ${BASE - 210}) rotate(-2) scale(${0.8 + 0.2 * diff})`}>
        <g filter="url(#cut)">
          <rect x={-112} y={-62} width={224} height={124} fill={C.highlight} />
        </g>
        <T x={0} y={-4} size={48} weight={800} anchor="middle" head>{D.taxDifference}</T>
        <T x={0} y={34} size={23} weight={700} anchor="middle">less tax, here</T>
      </g>
      <T x={500} y={700} size={22} anchor="middle" fill={C.inkSoft} opacity={assume}>
        federal only · tax on the gain · rates are assumptions, not yours
      </T>
    </Stage>
  );
};
