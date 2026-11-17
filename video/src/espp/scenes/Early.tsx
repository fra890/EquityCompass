import React from "react";
import { useCurrentFrame } from "remotion";
import { pop, prog } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { Stage, T } from "../../components/Stage";
import { C } from "../../theme";
import { D, E, ESPP } from "../model";
import { cue } from "../timeline";
import { BandLabel, GainStack, Level, SBASE } from "./GainStack";

/** Sell early: both pieces are taxed at the ordinary rate. */
export const Early: React.FC = () => {
  const frame = useCurrentFrame();
  const red = prog(frame, 0.5, 1.3);
  const l1 = pop(frame, 1.0);
  const c1 = cue("early", 1);
  const l2 = pop(frame, c1 + 0.2);
  const tag = pop(frame, c1 + 2.2);
  return (
    <Stage kicker="Sell early · disqualifying" title={<>All of it is <Highlight at={c1 + 0.6}>taxed like salary.</Highlight></>}>
      <GainStack
        bands={[
          { from: 0, to: E.paid, fill: C.paperDark },
          { from: E.paid, to: ESPP.purchasePrice, fill: C.highlight, opacity: 1 - red },
          { from: ESPP.purchasePrice, to: ESPP.salePrice, fill: C.navySoft, opacity: 1 - red },
          { from: E.paid, to: ESPP.purchasePrice, fill: C.red, opacity: red },
          { from: ESPP.purchasePrice, to: ESPP.salePrice, fill: C.red, opacity: red * 0.78 },
        ]}
      />
      <Level price={E.paid} label={D.paid} note="you paid" />
      <Level price={ESPP.purchasePrice} label={D.purchase} note="worth on purchase day" />
      <Level price={ESPP.salePrice} label={D.sale} note="you sold" />
      <BandLabel from={E.paid} to={ESPP.purchasePrice} amount={D.dqOrdinary} line1={`${D.purchase} − ${D.paid}`} line2="ordinary income" fill={C.red} opacity={l1} />
      <BandLabel from={ESPP.purchasePrice} to={ESPP.salePrice} amount={D.growth} line1={`${D.sale} − ${D.purchase}`} line2="short-term capital gain" fill={C.red} opacity={l2} />
      <g opacity={tag} transform={`translate(500 ${SBASE + 44}) scale(${0.8 + 0.2 * tag})`}>
        <rect x={-300} y={-30} width={600} height={54} fill={C.ink} transform="rotate(-0.8)" />
        <T x={0} y={7} size={29} weight={800} anchor="middle" head fill={C.highlight}>
          all {D.totalGain} at your ordinary rate
        </T>
      </g>
    </Stage>
  );
};
