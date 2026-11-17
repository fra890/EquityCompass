import React from "react";
import { useCurrentFrame } from "remotion";
import { pop, prog, lerp } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { Stage, T } from "../../components/Stage";
import { C } from "../../theme";
import { D, E, ESPP } from "../model";
import { cue } from "../timeline";
import { BandLabel, GainStack, Level, SBASE, SW, SX, yAt } from "./GainStack";

/** Wait out both clocks: the salary-taxed slice shrinks; the rest goes long-term. */
export const Wait: React.FC = () => {
  const frame = useCurrentFrame();
  const c1 = cue("wait", 1);
  const move = prog(frame, 1.0, 2.6);
  // top of the red (ordinary) slice slides down from the purchase-day value
  const redTop = lerp(ESPP.purchasePrice, E.paid + E.qualifying.ordinary, move);
  const l1 = pop(frame, 2.4);
  const l2 = pop(frame, c1 + 0.2);
  const arrow = prog(frame, 1.0, 2.6);
  const tag = pop(frame, c1 + 1.2);
  return (
    <Stage kicker="Wait · qualifying" title={<>Most of it moves to <Highlight at={c1 + 0.3}>the lower rate.</Highlight></>}>
      <GainStack
        bands={[
          { from: 0, to: E.paid, fill: C.paperDark },
          { from: E.paid, to: redTop, fill: C.red },
          // above the red slice: short-term red fading into long-term navy
          { from: redTop, to: ESPP.salePrice, fill: C.red, opacity: 0.78 * (1 - move) },
          { from: redTop, to: ESPP.salePrice, fill: C.navy, opacity: move },
        ]}
      />
      <Level price={E.paid} label={D.paid} note="you paid" />
      <Level price={ESPP.salePrice} label={D.sale} note="you sold" />
      {/* where the line used to be, and how far it moved */}
      <g opacity={arrow}>
        <line x1={SX - 18} y1={yAt(ESPP.purchasePrice)} x2={SX + SW} y2={yAt(ESPP.purchasePrice)} stroke={C.white} strokeWidth={3} strokeDasharray="8 8" />
        <line x1={SX - 60} y1={yAt(ESPP.purchasePrice)} x2={SX - 60} y2={yAt(redTop) - 14} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
        <polyline
          points={`${SX - 76},${yAt(redTop) - 26} ${SX - 60},${yAt(redTop) - 8} ${SX - 44},${yAt(redTop) - 26}`}
          fill="none"
          stroke={C.ink}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <T x={SX - 84} y={yAt(ESPP.purchasePrice) + 14} size={36} weight={800} anchor="end" head>{D.shifted}</T>
        <T x={SX - 84} y={yAt(ESPP.purchasePrice) + 42} size={23} anchor="end" fill={C.inkSoft}>moves to the</T>
        <T x={SX - 84} y={yAt(ESPP.purchasePrice) + 68} size={23} anchor="end" fill={C.inkSoft}>lower rate</T>
      </g>
      <BandLabel
        from={E.paid}
        to={E.paid + E.qualifying.ordinary + 5}
        amount={D.qOrdinary}
        line1="taxed like salary"
        line2={`${D.discount} of the ${D.offering} start price`}
        fill={C.red}
        opacity={l1}
      />
      <BandLabel from={ESPP.purchasePrice} to={ESPP.salePrice} amount={D.qCapital} line1="long-term gain" line2="lower rate" fill={C.navy} opacity={l2} />
      <g opacity={tag} transform={`translate(500 ${SBASE + 44}) scale(${0.8 + 0.2 * tag})`}>
        <rect x={-330} y={-30} width={660} height={54} fill={C.ink} transform="rotate(-0.8)" />
        <T x={0} y={7} size={29} weight={800} anchor="middle" head fill={C.highlight}>
          same {D.totalGain} gain, taxed differently
        </T>
      </g>
    </Stage>
  );
};
