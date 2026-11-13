import React from "react";
import { useCurrentFrame } from "remotion";
import { pop, prog, easeOut } from "../anim";
import { Highlight } from "../components/Highlight";
import { Stage, T } from "../components/Stage";
import { D, N, S } from "../numbers";
import { C } from "../theme";
import { cue, FPS } from "../timeline";

// ---- Part A: crossover chart (tax vs ISO spread exercised this year) ----
const X0 = 120;
const X1 = 900;
const Y0 = 600;
const Y1 = 110;
const tMin = N.tmtNoExercise * 0.8;
const tMax = N.curve[N.curve.length - 1].tmt * 1.04;
const cx = (spread: number) => X0 + (spread / N.curveMax) * (X1 - X0);
const cy = (tax: number) => Y0 - ((tax - tMin) / (tMax - tMin)) * (Y0 - Y1);
const tmtPath = N.curve.map((p, i) => `${i ? "L" : "M"}${cx(p.spread).toFixed(1)} ${cy(p.tmt).toFixed(1)}`).join(" ");
const XX = cx(N.crossover.spread);
const XY = cy(N.regular);
const amtWedge =
  `M${XX} ${XY} ` +
  N.curve.filter((p) => p.spread > N.crossover.spread).map((p) => `L${cx(p.spread).toFixed(1)} ${cy(p.tmt).toFixed(1)}`).join(" ") +
  ` L${X1} ${XY} Z`;

// ---- Part B: staggered exercises ----
const BASE = 590;
const BAR_W = 130;
const BAR_H = 250;
const barX = (i: number) => 150 + i * (700 / (S.staggerYears - 1)) - BAR_W / 2 + 0;

export const Intersection: React.FC = () => {
  const frame = useCurrentFrame();
  const axes = prog(frame, 0.2, 0.8, easeOut);
  const reg = prog(frame, 0.8, 2.2);
  const c1 = cue("intersection", 1);
  const c2 = cue("intersection", 2);
  const c3 = cue("intersection", 3);
  const c4 = cue("intersection", 4);
  const tmt = prog(frame, c1, c1 + 2.7);
  const dot = pop(frame, c1 + 3.4);
  const pulse = 0.5 + 0.5 * Math.sin(frame / 7);
  const wedge = prog(frame, c1 + 4.2, c1 + 5.0, easeOut);
  const info = pop(frame, c2 + 0.3);
  const aOut = 1 - prog(frame, c3 - 0.4, c3);
  const bIn = prog(frame, c3 - 0.1, c3 + 0.4, easeOut);
  const lineB = prog(frame, c3 + 0.1, c3 + 1.1);
  const sum = pop(frame, c3 + 1.9);
  const past = pop(frame, c4 + 0.3);
  return (
    <Stage
      kicker="Hypothetical example"
      title={frame < (c3 - 0.2) * FPS ? <>Find the <Highlight at={c1 + 3.4}>crossover.</Highlight></> : <>Size each year <Highlight at={c3 + 0.6}>to the line.</Highlight></>}
    >
      {/* ================= Part A ================= */}
      <g opacity={aOut} transform={`translate(0 ${(1 - aOut) * -20})`}>
        <g opacity={axes}>
          <line x1={X0} y1={Y0} x2={X1 + 20} y2={Y0} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
          <line x1={X0} y1={Y0} x2={X0} y2={Y1 - 30} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
          <T x={X0 - 14} y={Y1 - 46} size={28} fill={C.inkSoft}>tax for the year</T>
          <T x={X1 + 20} y={Y0 + 50} size={28} fill={C.inkSoft} anchor="end">ISO spread exercised this year →</T>
          <T x={X0} y={Y0 + 50} size={28} fill={C.inkSoft}>$0</T>
        </g>

        {/* AMT owed past the crossover */}
        <clipPath id="wedgeClip">
          <rect x={XX} y={0} width={(X1 - XX) * wedge} height={720} />
        </clipPath>
        <path d={amtWedge} fill="url(#hatchRed)" clipPath="url(#wedgeClip)" />
        <g opacity={wedge}>
          <T x={X1 - 6} y={XY - 30} size={30} weight={800} anchor="end" head fill={C.red}>AMT owed</T>
        </g>

        {/* regular tax: flat */}
        <line x1={X0} y1={XY} x2={X0 + (X1 - X0) * reg} y2={XY} stroke={C.navy} strokeWidth={8} strokeLinecap="round" />
        <g opacity={prog(frame, 2.0, 2.4)}>
          <T x={X0 + 18} y={XY - 20} size={30} weight={700} fill={C.navy}>regular tax</T>
        </g>

        {/* tentative minimum tax: rises with the spread */}
        <path
          d={tmtPath}
          fill="none"
          stroke={C.ink}
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - tmt}
          opacity={tmt > 0 ? 1 : 0}
        />
        <g opacity={prog(frame, c1 + 2.5, c1 + 2.9)}>
          <T x={X1 - 150} y={cy(N.curve[N.curve.length - 1].tmt) + 2} size={30} weight={700} anchor="end">
            tentative minimum tax
          </T>
        </g>

        {/* the glowing crossover */}
        <g opacity={dot}>
          <circle cx={XX} cy={XY} r={46 + pulse * 16} fill={C.highlight} filter="url(#glow)" opacity={0.95} />
          <circle cx={XX} cy={XY} r={30 + pulse * 6} fill={C.highlight} opacity={0.55} />
          <circle cx={XX} cy={XY} r={15 * dot} fill={C.ink} stroke={C.paper} strokeWidth={4} />
          <line x1={XX} y1={XY + 24} x2={XX} y2={Y0} stroke={C.ink} strokeWidth={3} strokeDasharray="4 9" strokeLinecap="round" />
          <g transform={`translate(${XX - 14} ${XY - 62}) rotate(-3)`}>
            <rect x={-118} y={-40} width={236} height={58} fill={C.ink} />
            <T x={0} y={3} size={38} weight={800} anchor="middle" head fill={C.highlight}>crossover</T>
          </g>
        </g>

        {/* computed crossover values */}
        <g opacity={info} transform={`translate(${XX + 250} ${Y0 - 92}) scale(${0.8 + 0.2 * info}) rotate(1.5)`}>
          <g filter="url(#cut)">
            <rect x={-205} y={-70} width={410} height={140} fill={C.white} />
          </g>
          <T x={0} y={-16} size={40} weight={800} anchor="middle" head>~{D.crossoverSpread} of spread</T>
          <T x={0} y={34} size={30} weight={600} anchor="middle" fill={C.navy}>
            ~{D.crossoverShares} options · ~$0 AMT
          </T>
        </g>
      </g>

      {/* ================= Part B ================= */}
      <g opacity={bIn}>
        <line x1={60} y1={BASE} x2={940} y2={BASE} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
        {N.staggered.map((row, i) => {
          const p = pop(frame, c3 + 0.3 + i * 0.3, 12);
          const h = BAR_H * p;
          const x = barX(i);
          return (
            <g key={i} opacity={Math.min(1, p * 2)}>
              <g filter="url(#cut)">
                <rect x={x} y={BASE - h} width={BAR_W} height={h} fill={C.navy} />
              </g>
              <T x={x + BAR_W / 2} y={BASE - BAR_H / 2 - 4} size={40} weight={800} anchor="middle" head fill={C.white}>
                ~{D.crossoverShares}
              </T>
              <T x={x + BAR_W / 2} y={BASE - BAR_H / 2 + 30} size={25} anchor="middle" fill={C.white}>options</T>
              <T x={x + BAR_W / 2} y={BASE + 44} size={30} weight={700} anchor="middle">Year {row.year}</T>
              <T x={x + BAR_W / 2} y={BASE + 82} size={26} anchor="middle" fill={C.inkSoft}>
                AMT ~${Math.round(row.amt).toLocaleString("en-US")}
              </T>
            </g>
          );
        })}
        {/* the crossover line each bar is sized to */}
        <line
          x1={60}
          y1={BASE - BAR_H - 10}
          x2={60 + 880 * lineB}
          y2={BASE - BAR_H - 10}
          stroke={C.ink}
          strokeWidth={5}
          strokeDasharray="16 12"
        />
        <g opacity={prog(frame, c3 + 1.0, c3 + 1.4)} transform={`translate(72 ${BASE - BAR_H - 42})`}>
          <rect x={-8} y={-34} width={244} height={48} fill={C.highlight} transform="rotate(-1.5)" />
          <T x={4} y={0} size={30} weight={800} head>crossover line</T>
        </g>

        {/* honest scale: how far this gets */}
        <g opacity={sum} transform={`translate(500 ${150 + (1 - sum) * 14})`}>
          <g filter="url(#cut)">
            <rect x={-410} y={-66} width={820} height={132} fill={C.white} transform="rotate(-0.8)" />
          </g>
          <T x={0} y={-12} size={38} weight={800} anchor="middle" head>
            {D.years} years: ~{D.staggeredShares} of {D.isoCount} options
          </T>
          <T x={0} y={34} size={29} weight={600} anchor="middle" fill={C.navy}>
            total AMT ~{D.staggeredAmt} · slower, and the cash stays put
          </T>
        </g>

        {/* going past the line is a choice */}
        <g opacity={past} transform={`translate(${barX(S.staggerYears - 1) + BAR_W / 2} ${BASE - BAR_H - 10})`}>
          <rect x={-BAR_W / 2} y={-46 * past} width={BAR_W} height={46 * past} fill="url(#hatchRed)" stroke={C.red} strokeWidth={3} />
          <T x={-BAR_W / 2 - 16} y={-14} size={27} weight={800} anchor="end" head fill={C.red}>past the line = AMT</T>
        </g>
      </g>
    </Stage>
  );
};
