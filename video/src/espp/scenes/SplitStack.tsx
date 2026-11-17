import React from "react";
import { T } from "../../components/Stage";
import { C } from "../../theme";
import { D, E, ESPP, type Split } from "../model";

const usd = (n: number) => "$" + (Number.isInteger(n) ? n.toString() : n.toFixed(2));

/**
 * One share's sale price as a stack: what was paid, the ordinary-income
 * part (red), and the capital-gain part (navy). Heights are to scale.
 */
export const SplitStack: React.FC<{
  x: number;
  width?: number;
  base?: number;
  height?: number;
  split: Split;
  /** 0..1 reveal of each band */
  paidIn: number;
  ordinaryIn: number;
  capitalIn: number;
  labels?: boolean;
  title?: string;
  capitalLabel?: string;
  /** side for a label that does not fit inside a thin band */
  thinLabelSide?: "left" | "right";
}> = ({ x, width = 250, base = 650, height = 520, split, paidIn, ordinaryIn, capitalIn, labels = true, title, capitalLabel, thinLabelSide = "left" }) => {
  const u = height / ESPP.salePrice;
  const hp = E.paid * u;
  const ho = split.ordinary * u;
  const hc = split.capital * u;
  const lx = x + width + 26;
  return (
    <g>
      {title ? (
        <T x={x + width / 2} y={base - height - 26} size={30} weight={800} anchor="middle" head>{title}</T>
      ) : null}
      <g filter="url(#cut)">
        <rect x={x} y={base - hp * paidIn} width={width} height={hp * paidIn} fill={C.paperDark} />
        <rect x={x} y={base - hp - ho * ordinaryIn} width={width} height={ho * ordinaryIn} fill={C.red} />
        <rect x={x} y={base - hp - ho - hc * capitalIn} width={width} height={hc * capitalIn} fill={C.navy} />
      </g>
      <g opacity={paidIn}>
        <T x={x + width / 2} y={base - hp / 2 + 12} size={32} weight={800} anchor="middle" head>{D.paid} paid</T>
      </g>
      {labels ? (
        <>
          <g opacity={ordinaryIn}>
            <T x={lx} y={base - hp - ho / 2 + 2} size={46} weight={800} head fill={C.red}>{usd(split.ordinary)}</T>
            <T x={lx} y={base - hp - ho / 2 + 34} size={25} weight={700} fill={C.red}>ordinary income</T>
          </g>
          <g opacity={capitalIn}>
            <T x={lx} y={base - hp - ho - hc / 2 + 4} size={46} weight={800} head fill={C.navy}>{usd(split.capital)}</T>
            <T x={lx} y={base - hp - ho - hc / 2 + 36} size={25} weight={700} fill={C.navy}>
              {capitalLabel ?? (split.longTerm ? "long-term capital gain" : "short-term capital gain")}
            </T>
          </g>
        </>
      ) : (
        <>
          <g opacity={ordinaryIn}>
            {ho >= 50 ? (
              <T x={x + width / 2} y={base - hp - ho / 2 + 12} size={34} weight={800} anchor="middle" head fill={C.white}>
                {usd(split.ordinary)}
              </T>
            ) : (
              <T x={thinLabelSide === "left" ? x - 16 : x + width + 16} y={base - hp - ho / 2 + 11} size={32} weight={800} anchor={thinLabelSide === "left" ? "end" : "start"} head fill={C.red}>
                {usd(split.ordinary)}
              </T>
            )}
          </g>
          <g opacity={capitalIn}>
            <T x={x + width / 2} y={base - hp - ho - hc / 2 + 12} size={34} weight={800} anchor="middle" head fill={C.white}>{usd(split.capital)}</T>
          </g>
        </>
      )}
      <g opacity={capitalIn}>
        <line x1={x - 14} y1={base - height} x2={x + width + 14} y2={base - height} stroke={C.ink} strokeWidth={4} />
        {labels ? <T x={x - 24} y={base - height + 10} size={30} weight={800} anchor="end" head>sold at {D.sale}</T> : null}
      </g>
    </g>
  );
};
