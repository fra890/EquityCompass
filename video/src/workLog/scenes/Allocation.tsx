import React from "react";
import { useCurrentFrame } from "remotion";
import { pop, prog, easeOut, lerp } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { Stage, T } from "../../components/Stage";
import { C } from "../../theme";
import { FIG, kicker } from "../script";
import { cue } from "../timeline";

// Bar proportions follow the post's words: two-thirds, a quarter, the rest.
const PARTS = [
  { label: "stocks", note: FIG.stocks, w: 2 / 3, fill: C.navy, text: C.white },
  { label: "bonds", note: FIG.bonds, w: 1 / 4, fill: C.navySoft, text: C.ink },
  { label: "alts", note: FIG.alts, w: 1 / 12, fill: C.highlight, text: C.ink },
];
const BX = 60;
const BW = 880;
const ACCOUNTS = ["Traditional IRAs", "Roth IRAs", "Joint trust"];
const ax = (i: number) => 50 + i * 310;
// beta scale
const SX0 = 150;
const SX1 = 850;
const bx = (beta: number) => SX0 + ((beta - 0.9) / 0.5) * (SX1 - SX0);

export const Allocation: React.FC = () => {
  const frame = useCurrentFrame();
  const c1 = cue("allocation", 1);
  const c2 = cue("allocation", 2);
  const c3 = cue("allocation", 3);
  const grow = prog(frame, 0.4, 1.8, easeOut);
  const boxes = pop(frame, c1 - 0.1);
  const chips = [
    { label: ["income-paying", "holdings"], at: c1 + 0.3, col: 0, fill: C.navySoft, text: C.ink },
    { label: ["most aggressive", "ETFs"], at: c1 + 2.2, col: 1, fill: C.navy, text: C.white },
    { label: ["long-short", "direct indexing"], at: c2 + 0.2, col: 2, fill: C.highlight, text: C.ink },
  ];
  const scale = pop(frame, c2 + 1.0);
  const slide = prog(frame, c2 + 1.8, c2 + 3.6);
  const beta = lerp(Number(FIG.betaFrom), Number(FIG.betaTo), slide);
  const risk = pop(frame, c3 + 0.1);
  let acc = 0;
  return (
    <Stage kicker={kicker(2)} title={<>Allocation: rebuilt, then <Highlight at={c1 + 0.3}>placed.</Highlight></>}>
      {/* target mix */}
      {PARTS.map((p, i) => {
        const x = BX + acc * BW;
        acc += p.w;
        const w = p.w * BW * grow;
        const lp = pop(frame, 0.9 + i * 0.45);
        return (
          <g key={i}>
            <g filter="url(#cutSoft)">
              <rect x={x} y={70} width={Math.max(0, w - 6)} height={84} fill={p.fill} />
            </g>
            <g opacity={lp}>
              {i < 2 ? <T x={x + 18} y={124} size={36} weight={800} head fill={p.text}>{p.label}</T> : null}
              <T x={i === 2 ? x + p.w * BW - 6 : x + 4} y={i === 2 ? 52 : 192} size={25} weight={700} anchor={i === 2 ? "end" : "start"} fill={C.inkSoft}>
                {i === 2 ? `alternatives: ${p.note}` : p.note}
              </T>
            </g>
          </g>
        );
      })}

      {/* asset location */}
      {ACCOUNTS.map((a, i) => (
        <g key={i} opacity={boxes} transform={`translate(${ax(i)} ${250 + (1 - boxes) * 20})`}>
          <g filter="url(#cut)">
            <rect width={280} height={190} fill={C.white} />
          </g>
          <rect width={280} height={48} fill={C.ink} />
          <T x={140} y={33} size={26} weight={800} anchor="middle" head fill={C.paper}>{a}</T>
        </g>
      ))}
      {chips.map((ch, i) => {
        const d = prog(frame, ch.at, ch.at + 0.6, easeOut);
        return (
          <g key={i} opacity={d > 0 ? 1 : 0} transform={`translate(${ax(ch.col) + 140} ${lerp(210, 366, d)}) rotate(${(1 - d) * -6})`}>
            <g filter="url(#cutSoft)">
              <rect x={-118} y={-50} width={236} height={100} fill={ch.fill} />
            </g>
            <T x={0} y={-6} size={27} weight={800} anchor="middle" head fill={ch.text}>{ch.label[0]}</T>
            <T x={0} y={28} size={27} weight={800} anchor="middle" head fill={ch.text}>{ch.label[1]}</T>
          </g>
        );
      })}

      {/* portfolio beta */}
      <g opacity={scale}>
        <T x={SX0} y={520} size={25} weight={700} fill={C.inkSoft} letterSpacing="0.12em">PORTFOLIO BETA</T>
        <line x1={SX0} y1={580} x2={SX1} y2={580} stroke={C.paperDark} strokeWidth={22} strokeLinecap="round" />
        <line x1={bx(Number(FIG.betaTo))} y1={580} x2={bx(beta)} y2={580} stroke={C.navy} strokeWidth={22} opacity={0.35} />
        {[FIG.betaTo, FIG.betaFrom].map((v) => (
          <g key={v}>
            <line x1={bx(Number(v))} y1={556} x2={bx(Number(v))} y2={604} stroke={C.ink} strokeWidth={5} />
            <T x={bx(Number(v))} y={646} size={30} weight={800} anchor="middle" head>~{v}</T>
          </g>
        ))}
        <g transform={`translate(${bx(beta)} 580)`} filter="url(#cutSoft)">
          <polygon points="0,-46 22,-12 -22,-12" fill={C.ink} />
          <circle r={17} fill={C.highlight} stroke={C.ink} strokeWidth={5} />
        </g>
      </g>
      <g opacity={risk} transform={`translate(500 ${700}) scale(${0.8 + 0.2 * risk})`}>
        <rect x={-330} y={-32} width={660} height={54} fill={C.ink} transform="rotate(-0.8)" />
        <T x={0} y={5} size={28} weight={800} anchor="middle" head fill={C.highlight}>margin + short positions: their own risk</T>
      </g>
    </Stage>
  );
};
