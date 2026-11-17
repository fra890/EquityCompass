import React from "react";
import { useCurrentFrame } from "remotion";
import { pop, prog, easeOut } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { Stage, T } from "../../components/Stage";
import { C } from "../../theme";
import { kicker } from "../script";
import { cue } from "../timeline";

const LOTS = 5;
const LW = 150;
const lx = (i: number) => 40 + i * (LW + 10);
const TL_Y = 400;
// where each remaining lot's one-year date falls on the timeline (shape only)
const DATE_X = [140, 285, 430, 575, 720];

export const Stock: React.FC = () => {
  const frame = useCurrentFrame();
  const c1 = cue("stock", 1);
  const c2 = cue("stock", 2);
  const cut = prog(frame, 1.0, 1.9);
  const tags = pop(frame, 1.8);
  const line = prog(frame, c1, c1 + 0.8, easeOut);
  return (
    <Stage kicker={kicker(3)} title={<>The concentrated stock, <Highlight at={c1 + 0.3}>lot by lot.</Highlight></>}>
      {/* the position, as lots */}
      {Array.from({ length: LOTS }, (_, i) => {
        const p = pop(frame, 0.2 + i * 0.1);
        return (
          <g key={i} opacity={p} transform={`translate(${lx(i)} 90)`}>
            <g filter="url(#cutSoft)">
              <rect width={LW} height={96} fill={C.navy} />
            </g>
            <T x={LW / 2} y={58} size={28} weight={800} anchor="middle" head fill={C.white}>lot {i + 1}</T>
          </g>
        );
      })}
      {/* the small slice that was sold */}
      <g transform={`translate(${lx(LOTS) + cut * 24} ${90 + cut * 104}) rotate(${cut * 6})`} opacity={pop(frame, 0.7)}>
        <g filter="url(#cutSoft)">
          <rect width={86} height={96} fill={C.highlight} stroke={C.ink} strokeWidth={3} />
        </g>
        <T x={43} y={58} size={26} weight={800} anchor="middle" head>sold</T>
      </g>
      <g opacity={tags}>
        <T x={956} y={330} size={23} weight={700} anchor="end" fill={C.ink}>cash raised,</T>
        <T x={956} y={358} size={23} weight={700} anchor="end" fill={C.ink}>loss booked</T>
      </g>

      {/* one-year dates */}
      <line x1={50} y1={TL_Y} x2={50 + 900 * line} y2={TL_Y} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
      <g opacity={line}>
        <T x={50} y={TL_Y + 44} size={24} weight={700} fill={C.inkSoft}>today</T>
        <T x={950} y={TL_Y + 44} size={24} weight={700} anchor="end" fill={C.inkSoft}>time →</T>
      </g>
      {DATE_X.map((x, i) => {
        const p = pop(frame, c1 + 0.5 + i * 0.22);
        return (
          <g key={i} opacity={p}>
            <line x1={lx(i) + LW / 2} y1={190} x2={x} y2={TL_Y - 62} stroke={C.ink} strokeWidth={3} strokeDasharray="4 9" />
            <g transform={`translate(${x} ${TL_Y}) scale(${0.6 + 0.4 * p})`}>
              <line x1={0} y1={0} x2={0} y2={-64} stroke={C.ink} strokeWidth={5} />
              <polygon points="0,-64 62,-48 0,-30" fill={C.highlight} stroke={C.ink} strokeWidth={3} />
              <T x={8} y={-39} size={18} weight={800}>1 yr</T>
              <circle r={10} fill={C.ink} />
            </g>
          </g>
        );
      })}

      {/* pairing future gains with losses */}
      {[0, 1, 2].map((i) => {
        const p = pop(frame, c2 + 0.3 + i * 0.5);
        const x = 190 + i * 310;
        return (
          <g key={i} opacity={p} transform={`translate(${x} 590)`}>
            <g filter="url(#cutSoft)">
              <rect x={-130} y={-50} width={124} height={100} fill={C.navy} transform={`translate(${(1 - p) * -40} 0)`} />
              <rect x={6} y={-50} width={124} height={100} fill={C.white} stroke={C.ink} strokeWidth={3} transform={`translate(${(1 - p) * 40} 0)`} />
            </g>
            <T x={-68} y={-2} size={25} weight={800} anchor="middle" head fill={C.white}>+ gain</T>
            <T x={-68} y={28} size={20} anchor="middle" fill={C.white}>on a lot</T>
            <T x={68} y={-2} size={25} weight={800} anchor="middle" head>− loss</T>
            <T x={68} y={28} size={20} anchor="middle" fill={C.inkSoft}>long-short</T>
          </g>
        );
      })}
      <g opacity={pop(frame, c2 + 0.1)}>
        <T x={500} y={506} size={25} weight={700} anchor="middle" fill={C.inkSoft} letterSpacing="0.12em">THE PLAN: PAIR THEM</T>
      </g>
    </Stage>
  );
};
