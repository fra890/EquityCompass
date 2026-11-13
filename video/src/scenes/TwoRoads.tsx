import React from "react";
import { useCurrentFrame } from "remotion";
import { pop, prog, easeOut, lerp } from "../anim";
import { SvgSwipe } from "../components/Highlight";
import { Stage, T } from "../components/Stage";
import { C } from "../theme";
import { cue, sceneSeconds } from "../timeline";

const START = { x: 500, y: 716 };
const FORK = { x: 500, y: 570 };
const END_L = { x: 215, y: 318 };
const END_R = { x: 785, y: 318 };

const road = (end: { x: number; y: number }) =>
  `M${START.x} ${START.y} L${FORK.x} ${FORK.y} C${FORK.x} 440 ${end.x} 470 ${end.x} ${end.y}`;

/** Point along a road, t in 0..1 (straight stem, then the curve). */
const pointOn = (end: { x: number; y: number }, t: number) => {
  const stem = 0.3;
  if (t <= stem) return { x: START.x, y: lerp(START.y, FORK.y, t / stem) };
  const u = (t - stem) / (1 - stem);
  const p0 = FORK, p1 = { x: FORK.x, y: 440 }, p2 = { x: end.x, y: 470 }, p3 = end;
  const b = (a: number, b_: number, c: number, d: number) =>
    (1 - u) ** 3 * a + 3 * (1 - u) ** 2 * u * b_ + 3 * (1 - u) * u * u * c + u ** 3 * d;
  return { x: b(p0.x, p1.x, p2.x, p3.x), y: b(p0.y, p1.y, p2.y, p3.y) };
};

const Figure: React.FC<{ x: number; y: number; bob: number }> = ({ x, y, bob }) => (
  <g transform={`translate(${x} ${y + bob})`} filter="url(#cutSoft)">
    <path d="M-13 0 L-9 -30 Q0 -40 9 -30 L13 0 Z" fill={C.ink} />
    <circle cx={0} cy={-46} r={11} fill={C.ink} />
  </g>
);

const Card: React.FC<{
  x: number;
  at: number;
  rot: number;
  tone: "muted" | "navy";
  title: string;
  lines: string[];
  result: string;
  swipeAt?: number;
}> = ({ x, at, rot, tone, title, lines, result, swipeAt }) => {
  const frame = useCurrentFrame();
  const p = pop(frame, at);
  const navy = tone === "navy";
  return (
    <g opacity={Math.min(1, p * 1.4)} transform={`translate(${x} 150) rotate(${rot}) scale(${0.75 + 0.25 * p})`}>
      <g filter="url(#cut)">
        <rect x={-222} y={-150} width={444} height={300} fill={navy ? C.white : C.paperDark} />
      </g>
      {swipeAt !== undefined ? <SvgSwipe x={-196} y={-112} w={232} h={46} at={swipeAt} /> : null}
      <T x={-190} y={-74} size={50} weight={800} head fill={navy ? C.ink : C.inkSoft}>{title}</T>
      {lines.map((l, i) => (
        <T key={i} x={-190} y={-14 + i * 42} size={31} weight={600} fill={navy ? C.ink : C.inkSoft}>{l}</T>
      ))}
      <rect x={-190} y={76} width={380} height={50} fill={navy ? C.navy : C.road} />
      <T x={0} y={111} size={29} weight={700} anchor="middle" fill={navy ? C.white : C.ink}>{result}</T>
    </g>
  );
};

export const TwoRoads: React.FC = () => {
  const frame = useCurrentFrame();
  const draw = prog(frame, 0.3, 2.0);
  const c1 = cue("roads", 1);
  const c2 = cue("roads", 2);
  const walk = prog(frame, cue("roads", 3), sceneSeconds("roads") - 0.2, easeOut);
  const figures = [0, 1, 2, 3, 4, 5];
  return (
    <Stage kicker="Two ways out of an ISO" title="Which road taxes you less?">
      {/* roads */}
      {[END_L, END_R].map((end, i) => (
        <g key={i}>
          <path
            d={road(end)}
            fill="none"
            stroke={i === 0 ? C.road : C.navy}
            strokeWidth={62}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - draw}
            opacity={draw > 0 ? 1 : 0}
          />
          <path
            d={road(end)}
            fill="none"
            stroke={C.paper}
            strokeWidth={5}
            strokeDasharray="20 20"
            opacity={draw > 0.98 ? 0.75 : 0}
          />
        </g>
      ))}

      <Card
        x={232}
        at={c1}
        rot={-2}
        tone="muted"
        title="Disqualified"
        lines={["Sell before the", "holding periods"]}
        result="Ordinary income rates"
      />
      <Card
        x={768}
        at={c2}
        rot={1.5}
        tone="navy"
        title="Qualified"
        lines={["2 yrs from grant +", "1 yr from exercise"]}
        result="Long-term capital gains"
        swipeAt={c2 + 0.5}
      />

      {/* everyone heads down the qualified road */}
      {figures.map((i) => {
        const t = Math.max(0, Math.min(1, walk * 1.25 - i * 0.07)) * (0.96 - i * 0.075);
        const p = pointOn(END_R, t);
        const start = pop(frame, 0.8 + i * 0.08);
        return (
          <g key={i} opacity={start}>
            <Figure
              x={p.x + (t < 0.05 ? (i - 2.5) * 34 * (1 - t / 0.05) : 0)}
              y={p.y + 6}
              bob={walk > 0 && walk < 1 ? Math.sin(frame / 2.2 + i) * 2.5 : 0}
            />
          </g>
        );
      })}
    </Stage>
  );
};
