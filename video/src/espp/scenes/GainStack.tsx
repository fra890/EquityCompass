import React from "react";
import { T } from "../../components/Stage";
import { C } from "../../theme";
import { ESPP } from "../model";

/** Geometry shared by the three "one share" scenes, so the stack never moves. */
export const SX = 390;
export const SW = 220;
export const SBASE = 660;
const SH = 520;
export const U = SH / ESPP.salePrice; // pixels per dollar
export const yAt = (price: number) => SBASE - price * U;

export type Band = { from: number; to: number; fill: string; reveal?: number; opacity?: number };

/** One share's sale price drawn as a stack of dollar bands, to scale. */
export const GainStack: React.FC<{ bands: Band[] }> = ({ bands }) => (
  <g filter="url(#cut)">
    {bands.map((b, i) => {
      const h = (b.to - b.from) * U * (b.reveal ?? 1);
      return <rect key={i} x={SX} y={yAt(b.from) - h} width={SW} height={Math.max(0, h)} fill={b.fill} opacity={b.opacity ?? 1} />;
    })}
  </g>
);

/** Price level on the left edge of the stack. */
export const Level: React.FC<{ price: number; label: string; note: string; opacity?: number }> = ({ price, label, note, opacity = 1 }) => (
  <g opacity={opacity}>
    <line x1={SX - 18} y1={yAt(price)} x2={SX + SW} y2={yAt(price)} stroke={C.ink} strokeWidth={4} />
    <T x={SX - 30} y={yAt(price) + 6} size={38} weight={800} anchor="end" head>{label}</T>
    <T x={SX - 30} y={yAt(price) + 36} size={23} anchor="end" fill={C.inkSoft}>{note}</T>
  </g>
);

/** Label to the right of a band. */
export const BandLabel: React.FC<{
  from: number;
  to: number;
  amount: string;
  line1: string;
  line2?: string;
  fill: string;
  opacity?: number;
}> = ({ from, to, amount, line1, line2, fill, opacity = 1 }) => {
  const y = (yAt(from) + yAt(to)) / 2;
  return (
    <g opacity={opacity}>
      <T x={SX + SW + 26} y={y - (line2 ? 12 : 2)} size={50} weight={800} head fill={fill}>{amount}</T>
      <T x={SX + SW + 26} y={y + (line2 ? 22 : 32)} size={26} weight={700} fill={fill}>{line1}</T>
      {line2 ? <T x={SX + SW + 26} y={y + 52} size={23} fill={C.inkSoft}>{line2}</T> : null}
    </g>
  );
};
