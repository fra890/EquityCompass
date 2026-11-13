import React from "react";
import { useCurrentFrame } from "remotion";
import { pop, prog } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { Stage, T } from "../../components/Stage";
import { C } from "../../theme";
import { FIG } from "../script";

const X0 = 110;
const X1 = 890;
const Y = 380;
const STOP = 0.34; // where the handle rests (position is illustrative, not to scale)

export const PlanTender: React.FC = () => {
  const frame = useCurrentFrame();
  const slide = prog(frame, 0.5, 1.9);
  // glide in, drift a touch past, settle back on the mark
  const over = Math.sin(Math.min(1, prog(frame, 1.9, 2.6)) * Math.PI) * 0.035;
  const x = X0 + (X1 - X0) * (STOP * slide + over);
  const tag = pop(frame, 2.5);
  return (
    <Stage kicker="The plan · 1 of 5" title={<>Tender what the math required. <Highlight at={2.6}>No more.</Highlight></>}>
      <T x={X0} y={Y - 150} size={27} weight={700} fill={C.inkSoft} letterSpacing="0.12em">SHARES SOLD IN THE TENDER</T>
      <line x1={X0} y1={Y} x2={X1} y2={Y} stroke={C.paperDark} strokeWidth={30} strokeLinecap="round" />
      <line x1={X0} y1={Y} x2={x} y2={Y} stroke={C.navy} strokeWidth={30} strokeLinecap="round" />
      <T x={X0} y={Y + 74} size={28} fill={C.inkSoft}>none</T>
      <T x={X1} y={Y + 74} size={28} fill={C.inkSoft} anchor="end">everything</T>
      {/* the mark the math set */}
      <line x1={X0 + (X1 - X0) * STOP} y1={Y - 62} x2={X0 + (X1 - X0) * STOP} y2={Y + 62} stroke={C.ink} strokeWidth={4} strokeDasharray="5 9" />
      <g transform={`translate(${x} ${Y})`} filter="url(#cut)">
        <rect x={-26} y={-56} width={52} height={112} fill={C.ink} />
        <rect x={-10} y={-30} width={20} height={60} fill={C.highlight} />
      </g>
      <g opacity={tag} transform={`translate(${X0 + (X1 - X0) * STOP + 150} ${Y + 190}) rotate(-2) scale(${0.8 + 0.2 * tag})`}>
        <g filter="url(#cut)">
          <rect x={-230} y={-78} width={460} height={156} fill={C.white} />
        </g>
        <T x={0} y={-8} size={64} weight={800} anchor="middle" head>~{FIG.tender} gross</T>
        <T x={0} y={44} size={34} weight={700} anchor="middle" fill={C.navy}>nothing extra</T>
      </g>
    </Stage>
  );
};
