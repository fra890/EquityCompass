import React from "react";
import { useCurrentFrame } from "remotion";
import { pop, prog, easeOut } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { Stage } from "../../components/Stage";
import { C } from "../../theme";
import { D, E, ESPP } from "../model";
import { cue } from "../timeline";
import { BandLabel, GainStack, Level } from "./GainStack";

/** One share sold: what was paid, then the gain in its two pieces. */
export const Pieces: React.FC = () => {
  const frame = useCurrentFrame();
  const c1 = cue("pieces", 1);
  const paid = prog(frame, 0.3, 0.9, easeOut);
  const whole = prog(frame, 1.0, 1.9, easeOut);
  const split = prog(frame, c1 + 0.2, c1 + 0.9);
  const lbl1 = pop(frame, c1 + 0.5);
  const lbl2 = pop(frame, c1 + 1.6);
  return (
    <Stage kicker="One share · hypothetical" title={<>A {D.totalGain} gain, <Highlight at={c1 + 0.3}>in two pieces.</Highlight></>}>
      <GainStack
        bands={[
          { from: 0, to: E.paid, fill: C.paperDark, reveal: paid },
          // the whole gain first, then it separates into discount + growth
          { from: E.paid, to: ESPP.salePrice, fill: C.navySoft, reveal: whole, opacity: 1 - split },
          { from: E.paid, to: ESPP.purchasePrice, fill: C.highlight, opacity: split },
          { from: ESPP.purchasePrice, to: ESPP.salePrice, fill: C.navySoft, opacity: split },
        ]}
      />
      <Level price={E.paid} label={D.paid} note="you paid" opacity={paid} />
      <Level price={ESPP.salePrice} label={D.sale} note="you sold" opacity={whole} />
      <Level price={ESPP.purchasePrice} label={D.purchase} note="worth on purchase day" opacity={split} />
      <BandLabel from={E.paid} to={ESPP.salePrice} amount={D.totalGain} line1="your gain" fill={C.ink} opacity={whole * (1 - split)} />
      <BandLabel from={E.paid} to={ESPP.purchasePrice} amount={D.dqOrdinary} line1="the discount" line2={`${D.purchase} worth, ${D.paid} paid`} fill={C.ink} opacity={lbl1} />
      <BandLabel from={ESPP.purchasePrice} to={ESPP.salePrice} amount={D.growth} line1="the growth" line2="the stock rising after" fill={C.navy} opacity={lbl2} />
    </Stage>
  );
};
