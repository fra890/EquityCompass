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

export const Qualifying: React.FC = () => {
  const frame = useCurrentFrame();
  const c1 = cue("qualifying", 1);
  const note = pop(frame, 2.8);
  return (
    <Stage kicker={KICKER} title={<>Qualifying: only <Highlight at={2.2}>the lesser amount.</Highlight></>}>
      <SplitStack
        x={330}
        split={E.qualifying}
        paidIn={prog(frame, 0.3, 0.9, easeOut)}
        ordinaryIn={prog(frame, 1.6, 2.4, easeOut)}
        capitalIn={prog(frame, c1, c1 + 1.0, easeOut)}
      />
      <g opacity={note} transform="translate(40 440)">
        <T x={250} y={0} size={23} weight={700} anchor="end" fill={C.inkSoft}>lesser of:</T>
        <T x={250} y={32} size={23} weight={700} anchor="end" fill={C.ink}>{D.discount} of {D.offering} = {D.qOrdinary}</T>
        <T x={250} y={64} size={23} weight={700} anchor="end" fill={C.inkSoft}>or the {D.totalGain} gain</T>
      </g>
    </Stage>
  );
};
