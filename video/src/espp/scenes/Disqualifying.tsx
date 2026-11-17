import React from "react";
import { useCurrentFrame } from "remotion";
import { pop, prog, easeOut } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { Stage, T } from "../../components/Stage";
import { C } from "../../theme";
import { D, E } from "../model";
import { KICKER } from "../script";
import { cue } from "../timeline";
import { SplitStack } from "./SplitStack";

export const Disqualifying: React.FC = () => {
  const frame = useCurrentFrame();
  const c1 = cue("disqualifying", 1);
  const note = pop(frame, 2.6);
  return (
    <Stage kicker={KICKER} title={<>Disqualifying: <Highlight at={1.6}>the whole gap</Highlight> is ordinary.</>}>
      <SplitStack
        x={330}
        split={E.disqualifying}
        paidIn={prog(frame, 0.3, 0.9, easeOut)}
        ordinaryIn={prog(frame, 1.2, 2.2, easeOut)}
        capitalIn={prog(frame, c1, c1 + 1.0, easeOut)}
      />
      <g opacity={note} transform="translate(40 470)">
        <T x={250} y={0} size={23} weight={700} anchor="end" fill={C.inkSoft}>{D.purchase} value on the</T>
        <T x={250} y={30} size={23} weight={700} anchor="end" fill={C.inkSoft}>purchase date,</T>
        <T x={250} y={60} size={23} weight={700} anchor="end" fill={C.inkSoft}>minus {D.paid} paid</T>
      </g>
    </Stage>
  );
};
