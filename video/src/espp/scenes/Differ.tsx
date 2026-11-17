import React from "react";
import { useCurrentFrame } from "remotion";
import { pop } from "../../anim";
import { Highlight, SvgSwipe } from "../../components/Highlight";
import { Stage, T } from "../../components/Stage";
import { C } from "../../theme";
import { D } from "../model";

const COLS = [
  { x: 40, title: "Sell early", sub: "disqualifying" },
  { x: 510, title: "Wait", sub: "qualifying" },
];
const W = 450;

/** The two calculations side by side; the first line is the only real difference. */
export const Differ: React.FC = () => {
  const frame = useCurrentFrame();
  const rows = [
    {
      label: "ORDINARY INCOME",
      at: 0.5,
      cells: [
        { how: "purchase-day value − paid", math: `${D.purchase} − ${D.paid}`, result: D.dqOrdinary, fill: C.red },
        { how: `${D.discount} × starting price*`, math: `${D.discount} × ${D.offering}`, result: D.qOrdinary, fill: C.red },
      ],
    },
    {
      label: "CAPITAL GAIN",
      at: 3.4,
      cells: [
        { how: "sale − purchase-day value", math: `${D.sale} − ${D.purchase}`, result: D.growth, fill: C.navy },
        { how: "whole gain − ordinary income", math: `${D.totalGain} − ${D.qOrdinary}`, result: D.qCapital, fill: C.navy },
      ],
    },
  ];
  return (
    <Stage kicker="Where the math differs" title={<>Same sale. <Highlight at={1.4}>One line changes.</Highlight></>}>
      {COLS.map((c, i) => {
        const p = pop(frame, 0.15 + i * 0.15);
        return (
          <g key={i} opacity={p} transform={`translate(${c.x} ${(1 - p) * 16})`}>
            <g filter="url(#cut)">
              <rect y={30} width={W} height={640} fill={C.white} />
            </g>
            <rect y={30} width={W} height={84} fill={i ? C.navy : C.ink} />
            <T x={24} y={86} size={40} weight={800} head fill={C.paper}>{c.title}</T>
            <T x={W - 24} y={84} size={24} weight={700} anchor="end" fill={C.paper}>{c.sub}</T>
          </g>
        );
      })}
      {rows.map((r, ri) => {
        const p = pop(frame, r.at);
        const y = 150 + ri * 262;
        return (
          <g key={ri} opacity={p}>
            {r.cells.map((cell, ci) => {
              const x = COLS[ci].x + 24;
              return (
                <g key={ci}>
                  <T x={x} y={y + 22} size={22} weight={800} fill={C.inkSoft} letterSpacing="0.1em">{r.label}</T>
                  {ri === 0 ? <SvgSwipe x={x - 6} y={y + 40} w={W - 40} h={38} at={1.5 + ci * 0.5} /> : null}
                  <T x={x} y={y + 68} size={ci === 0 ? 27 : 28} weight={700}>{cell.how}</T>
                  <T x={x} y={y + 136} size={46} weight={800} head>{cell.math}</T>
                  <T x={x} y={y + 208} size={64} weight={800} head fill={cell.fill}>= {cell.result}</T>
                </g>
              );
            })}
            {ri === 0 ? <line x1={64} y1={y + 236} x2={936} y2={y + 236} stroke={C.ink} strokeWidth={3} strokeDasharray="4 10" /> : null}
          </g>
        );
      })}
      <g opacity={pop(frame, 4.4)}>
        <T x={510 + 24} y={650} size={20} fill={C.inkSoft}>*or the whole gain, if that is smaller</T>
        <T x={40 + 24} y={650} size={20} fill={C.inkSoft}>short-term if held a year or less</T>
      </g>
    </Stage>
  );
};
