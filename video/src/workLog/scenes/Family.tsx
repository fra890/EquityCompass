import React from "react";
import { useCurrentFrame } from "remotion";
import { pop, prog, easeOut } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { Stage, T } from "../../components/Stage";
import { C } from "../../theme";
import { FIG, kicker } from "../script";
import { cue } from "../timeline";

const WAYS = [
  ["Give", "appreciated stock"],
  ["Sell,", "give cash"],
  ["Borrow against", "the portfolio"],
];

export const Family: React.FC = () => {
  const frame = useCurrentFrame();
  const c1 = cue("family", 1);
  const c2 = cue("family", 2);
  const house = pop(frame, 0.2);
  const focus = prog(frame, c1, c1 + 0.5);
  const opts = 1 - prog(frame, c2 - 0.3, c2 + 0.1);
  const plan = prog(frame, c2, c2 + 0.4);
  const draw = prog(frame, c2 + 0.3, c2 + 1.8);
  return (
    <Stage kicker={kicker(5)} title={<>Family: one gift, <Highlight at={1.2}>three ways.</Highlight></>}>
      {/* the gift */}
      <g opacity={house} transform={`translate(500 130) scale(${0.8 + 0.2 * house})`}>
        <g filter="url(#cut)">
          <polygon points="-120,-10 0,-100 120,-10" fill={C.ink} />
          <rect x={-96} y={-10} width={192} height={110} fill={C.white} />
        </g>
        <rect x={-22} y={36} width={44} height={64} fill={C.navy} />
        <T x={150} y={18} size={58} weight={800} head>~{FIG.gift}</T>
        <T x={150} y={58} size={27} fill={C.inkSoft}>toward a first home</T>
        <T x={-150} y={18} size={27} weight={700} anchor="end" fill={C.navy}>a daughter's</T>
        <T x={-150} y={52} size={27} weight={700} anchor="end" fill={C.navy}>down payment</T>
      </g>

      {/* three ways */}
      {WAYS.map((w, i) => {
        const p = pop(frame, 1.0 + i * 0.6);
        const chosen = i === 2;
        return (
          <g key={i} opacity={p * (chosen ? 1 : 1 - focus * 0.6)} transform={`translate(${40 + i * 315} ${280 + (1 - p) * 20})`}>
            <g filter="url(#cut)">
              <rect width={290} height={140} fill={chosen && focus > 0.5 ? C.navy : C.white} />
            </g>
            <rect width={290} height={12} fill={C.highlight} />
            <T x={22} y={56} size={22} weight={800} fill={chosen && focus > 0.5 ? C.highlight : C.navy}>{i + 1}</T>
            <T x={52} y={62} size={29} weight={800} head fill={chosen && focus > 0.5 ? C.white : C.ink}>{w[0]}</T>
            <T x={52} y={100} size={29} weight={800} head fill={chosen && focus > 0.5 ? C.white : C.ink}>{w[1]}</T>
          </g>
        );
      })}

      {/* pricing the borrowing version */}
      <g opacity={opts}>
        {[0, 1].map((i) => {
          const p = pop(frame, c1 + 0.5 + i * 1.6);
          return (
            <g key={i} opacity={p} transform={`translate(${40 + i * 470} ${470 + (1 - p) * 20})`}>
              <g filter="url(#cut)">
                <rect width={450} height={200} fill={C.white} />
              </g>
              <rect width={14} height={200} fill={C.navy} />
              <T x={40} y={64} size={44} weight={800} head>{i ? "5 years" : "1 year"}</T>
              {i === 0 ? (
                <>
                  <T x={40} y={118} size={34} weight={700} fill={C.navy}>rate {FIG.rate}</T>
                </>
              ) : (
                <>
                  <T x={40} y={112} size={28} weight={700} fill={C.navy}>no monthly payments</T>
                  <T x={40} y={150} size={28} weight={700} fill={C.navy}>balance grows</T>
                  {[0, 1, 2, 3, 4].map((k) => {
                    const g = pop(frame, c1 + 2.6 + k * 0.18);
                    const h = (34 + k * 16) * g;
                    return <rect key={k} x={330 + k * 22} y={176 - h} width={16} height={h} fill={C.ink} />;
                  })}
                </>
              )}
            </g>
          );
        })}
      </g>

      {/* rerun the plan with the gift in it */}
      <g opacity={plan} transform="translate(40 470)">
        <g filter="url(#cut)">
          <rect width={920} height={210} fill={C.white} />
        </g>
        <T x={30} y={48} size={25} weight={700} fill={C.inkSoft} letterSpacing="0.12em">RETIREMENT PLAN</T>
        <line x1={30} y1={180} x2={890} y2={180} stroke={C.ink} strokeWidth={3} />
        <path d="M30 150 C200 140 330 112 470 96 S760 70 890 62" fill="none" stroke={C.paperDark} strokeWidth={7} strokeDasharray="12 12" />
        <path
          d="M30 150 C200 144 330 124 470 112 S760 92 890 86"
          fill="none"
          stroke={C.navy}
          strokeWidth={8}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - draw}
          opacity={draw > 0 ? 1 : 0}
        />
        <g opacity={pop(frame, c2 + 1.4)} transform="translate(700 34)">
          <rect x={-150} y={-22} width={320} height={50} fill={C.highlight} transform="rotate(-1.5)" />
          <T x={10} y={13} size={26} weight={800} anchor="middle" head>rerun, gift included</T>
        </g>
        <T x={30} y={202} size={19} fill={C.inkSoft}>shape only, not a projection</T>
      </g>
      <g opacity={easeOut(0) + 0} />
    </Stage>
  );
};
