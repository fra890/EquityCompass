import React from "react";
import { useCurrentFrame } from "remotion";
import { pop, prog } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { Stage, T } from "../../components/Stage";
import { C } from "../../theme";
import { D } from "../model";
import { cue } from "../timeline";

const Row: React.FC<{ y: number; at: number; children: React.ReactNode }> = ({ y, at, children }) => {
  const frame = useCurrentFrame();
  const p = pop(frame, at);
  return (
    <g opacity={p} transform={`translate(0 ${y + (1 - p) * 16})`}>
      <g filter="url(#cut)">
        <rect x={40} y={0} width={920} height={186} fill={C.white} />
      </g>
      <rect x={40} y={0} width={16} height={186} fill={C.navy} />
      {children}
    </g>
  );
};

export const Catch: React.FC = () => {
  const frame = useCurrentFrame();
  const c1 = cue("catch", 1);
  const c2 = cue("catch", 2);
  const fall = prog(frame, 0.8, 2.4);
  const basis = pop(frame, c2 + 1.6);
  return (
    <Stage kicker="Before you wait for it" title={<>Three things <Highlight at={0.6}>to check.</Highlight></>}>
      <Row y={50} at={0.2}>
        <T x={90} y={72} size={40} weight={800} head>Waiting has a cost</T>
        <T x={90} y={116} size={25} fill={C.inkSoft}>The price can fall while you hold.</T>
        <T x={90} y={148} size={25} fill={C.inkSoft}>More of your employer's stock.</T>
        <path d="M640 60 C700 50 730 70 780 64" fill="none" stroke={C.ink} strokeWidth={7} strokeLinecap="round" />
        <clipPath id="fallClip">
          <rect x={776} y={40} width={160 * fall} height={130} />
        </clipPath>
        <path d="M780 64 C830 70 860 120 920 146" fill="none" stroke={C.ink} strokeWidth={7} strokeLinecap="round" strokeDasharray="12 12" clipPath="url(#fallClip)" />
      </Row>

      <Row y={266} at={c1}>
        <T x={90} y={72} size={40} weight={800} head>A loss doesn't erase it</T>
        <T x={90} y={116} size={25} fill={C.inkSoft}>Disqualifying sale below what you paid:</T>
        <T x={90} y={148} size={25} fill={C.inkSoft}>the purchase-date gap is still ordinary income.</T>
        <g transform="translate(830 92) rotate(4)">
          <rect x={-84} y={-52} width={168} height={104} fill={C.red} />
          <T x={0} y={8} size={52} weight={800} anchor="middle" head fill={C.white}>{D.dqOrdinary}</T>
          <T x={0} y={38} size={20} weight={700} anchor="middle" fill={C.white}>still ordinary</T>
        </g>
      </Row>

      <Row y={482} at={c2}>
        <T x={90} y={72} size={40} weight={800} head>Fix the cost basis</T>
        <T x={90} y={116} size={25} fill={C.inkSoft}>The 1099-B often shows only what you paid.</T>
        <T x={90} y={148} size={25} fill={C.inkSoft}>Add the ordinary income, or it is taxed twice.</T>
        <g transform="translate(800 92)">
          <rect x={-120} y={-62} width={240} height={124} fill={C.paperDark} stroke={C.ink} strokeWidth={3} />
          <T x={-104} y={-30} size={20} weight={800}>1099-B</T>
          <T x={-104} y={6} size={22} fill={C.inkSoft}>basis</T>
          <T x={104} y={6} size={24} weight={800} anchor="end">{D.paid}</T>
          <g opacity={basis}>
            <rect x={-110} y={18} width={220} height={36} fill={C.highlight} />
            <T x={-104} y={44} size={22} weight={800}>+ ordinary income</T>
          </g>
        </g>
      </Row>
    </Stage>
  );
};
