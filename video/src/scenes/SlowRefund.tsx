import React from "react";
import { useCurrentFrame } from "remotion";
import { pop, prog, easeOut } from "../anim";
import { Highlight } from "../components/Highlight";
import { Stage, T } from "../components/Stage";
import { D, N, usdRound } from "../numbers";
import { C } from "../theme";
import { cue } from "../timeline";

const BASE = 640;
const BILL_H = 470;
const YEARS = 8;
const creditH = (N.creditPerYear / N.allAtOnce.amt) * BILL_H; // same scale as the bill
const BX0 = 330;
const BSTEP = 78;

export const SlowRefund: React.FC = () => {
  const frame = useCurrentFrame();
  const bill = prog(frame, 0.3, 1.2, easeOut);
  const label = pop(frame, 1.1);
  const c1 = cue("refund", 1);
  const c2 = cue("refund", 2);
  const brace = pop(frame, c1 + 0.2);
  const total = pop(frame, c1 + 1.2);
  const priceIn = prog(frame, c2 - 0.2, c2 + 0.4, easeOut);
  const drop = prog(frame, c2 + 0.4, c2 + 2.0);
  const dropTag = pop(frame, c2 + 1.3);
  const recovered = N.creditPerYear * YEARS;
  return (
    <Stage kicker="Hypothetical example" title={<>The credit comes back <Highlight at={2.0}>slowly.</Highlight></>}>
      <line x1={70} y1={BASE} x2={960} y2={BASE} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />

      {/* AMT paid, to scale */}
      <g filter="url(#cut)">
        <rect x={100} y={BASE - BILL_H * bill} width={150} height={BILL_H * bill} fill={C.red} />
      </g>
      <g opacity={label}>
        <T x={175} y={BASE - BILL_H - 58} size={30} weight={600} anchor="middle">AMT paid</T>
        <T x={175} y={BASE - BILL_H - 16} size={40} weight={800} anchor="middle" head>~{D.amtAll}</T>
        <T x={175} y={BASE + 44} size={27} anchor="middle" fill={C.inkSoft}>Year 1</T>
      </g>

      {/* credit recovered each later year, same scale */}
      {Array.from({ length: YEARS }, (_, i) => {
        const p = pop(frame, 2.2 + i * 0.22);
        return (
          <g key={i} opacity={p}>
            <rect x={BX0 + i * BSTEP} y={BASE - creditH * p} width={46} height={creditH * p} fill={C.navy} />
            <T x={BX0 + i * BSTEP + 23} y={BASE + 44} size={27} anchor="middle" fill={C.inkSoft}>
              {i === 0 ? "Yr 2" : i + 2}
            </T>
          </g>
        );
      })}
      <g opacity={brace}>
        <path
          d={`M${BX0} ${BASE - 34} v-12 h${(YEARS - 1) * BSTEP + 46} v12`}
          fill="none"
          stroke={C.navy}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <T x={BX0 + ((YEARS - 1) * BSTEP + 46) / 2} y={BASE - 66} size={34} weight={800} anchor="middle" head fill={C.navy}>
          credit back: ~{D.creditPerYear} a year
        </T>
      </g>
      <g opacity={total} transform={`translate(0 ${(1 - total) * 10})`}>
        <T x={BX0 + ((YEARS - 1) * BSTEP + 46) / 2} y={BASE - 112} size={27} anchor="middle" fill={C.inkSoft}>
          {YEARS} years in: ~{usdRound(recovered)} of ~{D.amtAll} recovered
        </T>
      </g>

      {/* what if the price drops */}
      <g opacity={priceIn} transform="translate(360 60)">
        <g filter="url(#cutSoft)">
          <rect x={0} y={0} width={580} height={330} fill={C.white} transform="rotate(1.2 290 165)" />
        </g>
        <T x={28} y={50} size={27} weight={700} fill={C.inkSoft}>SHARE PRICE</T>
        <path d="M30 270 C120 256 170 180 250 150" fill="none" stroke={C.ink} strokeWidth={7} strokeLinecap="round" />
        <circle cx={250} cy={150} r={11} fill={C.ink} />
        <T x={236} y={124} size={26} weight={700} anchor="middle">exercise</T>
        <path
          d="M250 150 C330 164 400 230 540 286"
          fill="none"
          stroke={C.ink}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray="14 14"
          clipPath="url(#dropClip)"
        />
        <clipPath id="dropClip">
          <rect x={240} y={90} width={310 * drop} height={220} />
        </clipPath>
        <g opacity={dropTag} transform={`translate(440 84) scale(${0.8 + 0.2 * dropTag})`}>
          <rect x={-128} y={-30} width={256} height={84} fill={C.highlight} transform="rotate(-2)" />
          <T x={0} y={4} size={28} weight={800} anchor="middle" head>what if the</T>
          <T x={0} y={38} size={28} weight={800} anchor="middle" head>price drops?</T>
        </g>
      </g>
    </Stage>
  );
};
