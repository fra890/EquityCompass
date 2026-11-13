import React from "react";
import { useCurrentFrame } from "remotion";
import { pop, prog, lerp } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { Stage, T } from "../../components/Stage";
import { C } from "../../theme";
import { FIG } from "../script";

const CX = 260;
const CY = 470;
const R = 200;
const FROM = 22; // FIG.withheld
const TO = 37; // FIG.withheldNew
const ang = (pct: number) => -90 + (pct / 50) * 180; // dial spans 0..50%
const pt = (pct: number, r: number) => {
  const a = (ang(pct) - 90) * (Math.PI / 180);
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
};

export const PlanWithholding: React.FC = () => {
  const frame = useCurrentFrame();
  const turn = prog(frame, 1.3, 2.7);
  const pct = lerp(FROM, TO, turn);
  const chipsIn = pop(frame, 0.4);
  const [ax, ay] = pt(0, R);
  const [bx, by] = pt(50, R);
  const [nx, ny] = pt(pct, R - 34);
  // ten shares vest; the ones set aside for tax go to the tray (illustrative split)
  const aside = (i: number) => (i >= 8 ? prog(frame, 0.9 + (i - 8) * 0.12, 1.5 + (i - 8) * 0.12) : i >= 6 ? prog(frame, 2.5 + (i - 6) * 0.2, 3.2 + (i - 6) * 0.2) : 0);
  return (
    <Stage kicker="The plan · 3 of 5" title={<>Withhold <Highlight at={2.6}>{FIG.withheldNew}</Highlight>, in shares, at vest.</>}>
      {/* dial */}
      <path d={`M${ax} ${ay} A${R} ${R} 0 0 1 ${bx} ${by}`} fill="none" stroke={C.paperDark} strokeWidth={40} />
      <path d={`M${ax} ${ay} A${R} ${R} 0 0 1 ${pt(pct, R)[0]} ${pt(pct, R)[1]}`} fill="none" stroke={C.navy} strokeWidth={40} />
      {[FROM, TO].map((p) => {
        const [x1, y1] = pt(p, R - 30);
        const [x2, y2] = pt(p, R + 30);
        const [lx, ly] = pt(p, R + 66);
        return (
          <g key={p}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.ink} strokeWidth={6} />
            <T x={lx} y={ly + 10} size={34} weight={800} anchor="middle" head>{p}%</T>
          </g>
        );
      })}
      <line x1={CX} y1={CY} x2={nx} y2={ny} stroke={C.ink} strokeWidth={10} strokeLinecap="round" />
      <circle cx={CX} cy={CY} r={22} fill={C.ink} />
      <T x={CX} y={CY + 104} size={84} weight={800} anchor="middle" head style={{ fontVariantNumeric: "tabular-nums" }}>
        {Math.round(pct)}%
      </T>
      <T x={CX} y={CY + 144} size={27} anchor="middle" fill={C.inkSoft}>RSU tax withholding</T>

      {/* shares at vest */}
      <T x={760} y={150} size={27} weight={700} anchor="middle" fill={C.inkSoft} letterSpacing="0.12em">SHARES AT VEST</T>
      <g filter="url(#cutSoft)">
        <rect x={570} y={500} width={380} height={130} fill={C.white} />
      </g>
      <T x={760} y={616} size={25} weight={700} anchor="middle" fill={C.navy}>withheld for tax, in shares</T>
      {Array.from({ length: 10 }, (_, i) => {
        const a = aside(i);
        const x0 = 590 + (i % 5) * 72;
        const y0 = 180 + Math.floor(i / 5) * 78;
        const x1 = 592 + (9 - i) * 88;
        const y1 = 518;
        return (
          <g key={i} opacity={chipsIn} transform={`translate(${lerp(x0, x1, a)} ${lerp(y0, y1, a)})`}>
            <g filter="url(#cutSoft)">
              <rect width={60} height={60} fill={i >= 6 ? C.highlight : C.navy} />
            </g>
          </g>
        );
      })}
      <T x={760} y={386} size={25} anchor="middle" fill={C.inkSoft}>kept</T>
      <T x={760} y={690} size={22} anchor="middle" fill={C.inkSoft}>share counts illustrative</T>
    </Stage>
  );
};
