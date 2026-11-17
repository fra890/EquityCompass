import React from "react";
import { useCurrentFrame } from "remotion";
import { pop, prog, easeOut } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { Stage, T } from "../../components/Stage";
import { C } from "../../theme";
import { D, E } from "../model";
import { KICKER } from "../script";
import { SplitStack } from "./SplitStack";

export const Compare: React.FC = () => {
  const frame = useCurrentFrame();
  const a = prog(frame, 0.2, 1.0, easeOut);
  const b = prog(frame, 0.7, 1.5, easeOut);
  const tag = pop(frame, 1.8);
  return (
    <Stage kicker={KICKER} title={<>Same gain. <Highlight at={1.6}>Different split.</Highlight></>}>
      <SplitStack x={110} width={230} base={650} height={470} split={E.disqualifying} paidIn={a} ordinaryIn={a} capitalIn={a} labels={false} title="Disqualifying" />
      <SplitStack x={660} width={230} base={650} height={470} split={E.qualifying} paidIn={b} ordinaryIn={b} capitalIn={b} labels={false} title="Qualifying" thinLabelSide="right" />
      <g opacity={tag} transform={`translate(500 400) scale(${0.8 + 0.2 * tag})`}>
        <g filter="url(#cut)">
          <rect x={-128} y={-150} width={256} height={300} fill={C.white} />
        </g>
        <T x={0} y={-100} size={23} weight={700} anchor="middle" fill={C.inkSoft}>ordinary income</T>
        <T x={0} y={-42} size={60} weight={800} anchor="middle" head fill={C.red}>{D.dqOrdinary}</T>
        <polyline points="-16,-18 0,0 16,-18" fill="none" stroke={C.ink} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" transform="translate(0 -2)" />
        <T x={0} y={72} size={60} weight={800} anchor="middle" head fill={C.red}>{D.qOrdinary}</T>
        <T x={0} y={116} size={23} weight={700} anchor="middle" fill={C.inkSoft}>per share</T>
      </g>
    </Stage>
  );
};
