import React from "react";
import { useCurrentFrame } from "remotion";
import { pop, prog } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { Stage, T } from "../../components/Stage";
import { C } from "../../theme";
import { FIG } from "../script";

const LOTS = [
  { label: "Oldest RSU lot", note: "long-term", recent: false },
  { label: "Older RSU lot", note: "long-term", recent: false },
  { label: "Older RSU lot", note: "long-term", recent: false },
  { label: "Recent RSU lot", note: "higher basis", recent: true },
  { label: "Recent ESPP lot", note: "higher basis", recent: true },
];
const W = 410;
const H = 84;
const BASE = 640;

export const PlanLots: React.FC = () => {
  const frame = useCurrentFrame();
  const tag = pop(frame, 3.0);
  return (
    <Stage kicker="The plan · 2 of 5" title={<>Sell the <Highlight at={1.6}>newest lots</Highlight>, not the oldest.</>}>
      <T x={60 + W / 2} y={150} size={27} weight={700} anchor="middle" fill={C.inkSoft} letterSpacing="0.12em">KEPT</T>
      <T x={530 + W / 2} y={150} size={27} weight={700} anchor="middle" fill={C.inkSoft} letterSpacing="0.12em">SOLD IN THE TENDER</T>
      <rect x={530} y={176} width={W} height={2 * (H + 10)} fill="none" stroke={C.ink} strokeWidth={3} strokeDasharray="8 10" />
      {LOTS.map((lot, i) => {
        const p = pop(frame, 0.2 + i * 0.14);
        const out = lot.recent ? prog(frame, 1.5 + (i - 3) * 0.35, 2.4 + (i - 3) * 0.35) : 0;
        const y = BASE - (i + 1) * (H + 10);
        const yOut = 176 + (4 - i) * (H + 10) + 5;
        return (
          <g key={i} opacity={p} transform={`translate(${60 + out * 470} ${y + (yOut - y) * out}) rotate(${out > 0 && out < 1 ? -3 * Math.sin(out * Math.PI) : 0})`}>
            <g filter="url(#cut)">
              <rect width={W} height={H} fill={lot.recent ? C.highlight : C.navy} />
            </g>
            <T x={20} y={52} size={28} weight={800} head fill={lot.recent ? C.ink : C.white}>{lot.label}</T>
            <T x={W - 20} y={51} size={22} weight={600} anchor="end" fill={lot.recent ? C.ink : C.white}>{lot.note}</T>
          </g>
        );
      })}
      <g opacity={tag} transform={`translate(${530 + W / 2} 500) rotate(2) scale(${0.8 + 0.2 * tag})`}>
        <g filter="url(#cut)">
          <rect x={-200} y={-74} width={400} height={148} fill={C.white} />
        </g>
        <T x={0} y={-6} size={50} weight={800} anchor="middle" head>~{FIG.lotSaving} less tax</T>
        <T x={0} y={40} size={29} weight={600} anchor="middle" fill={C.navy}>in the model</T>
      </g>
    </Stage>
  );
};
