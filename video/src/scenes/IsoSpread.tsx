import React from "react";
import { useCurrentFrame } from "remotion";
import { pop, prog, easeOut } from "../anim";
import { Highlight } from "../components/Highlight";
import { Stage, T } from "../components/Stage";
import { D, N, S } from "../numbers";
import { C } from "../theme";

const X0 = 120;
const X1 = 800;
const Y0 = 620; // price 0
const Y1 = 90; // price max
const PMAX = S.fmv * 1.08;
const py = (price: number) => Y0 - (price / PMAX) * (Y0 - Y1);
const px = (t: number) => X0 + t * (X1 - X0);
// Illustrative growth path from strike to today's FMV (shape only, not data).
const fmvAt = (t: number) => S.strike + N.spreadPerShare * Math.pow(t, 2.3);

const PTS = Array.from({ length: 81 }, (_, i) => i / 80);
const fmvPath = PTS.map((t, i) => `${i ? "L" : "M"}${px(t).toFixed(1)} ${py(fmvAt(t)).toFixed(1)}`).join(" ");
const areaPath = `${fmvPath} L${px(1)} ${py(S.strike)} L${px(0)} ${py(S.strike)} Z`;

export const IsoSpread: React.FC = () => {
  const frame = useCurrentFrame();
  const axes = prog(frame, 0.1, 0.7, easeOut);
  const strike = prog(frame, 0.5, 1.7);
  const fmv = prog(frame, 3.4, 5.6);
  const area = prog(frame, 6.5, 7.6, easeOut);
  const strikeTag = pop(frame, 1.7);
  const fmvTag = pop(frame, 5.5);
  const brace = pop(frame, 7.2);
  const ys = py(S.strike);
  const yf = py(S.fmv);
  return (
    <Stage kicker="Hypothetical example" title={<>Strike stays put. <Highlight at={6.8}>Value doesn't.</Highlight></>}>
      {/* axes */}
      <g opacity={axes}>
        <line x1={X0} y1={Y0} x2={X1 + 20} y2={Y0} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
        <line x1={X0} y1={Y0} x2={X0} y2={Y1 - 20} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
        <T x={X0} y={Y0 + 48} size={28} fill={C.inkSoft}>grant</T>
        <T x={X1} y={Y0 + 48} size={28} fill={C.inkSoft} anchor="end">today</T>
        <T x={X0 - 14} y={Y1 - 34} size={28} fill={C.inkSoft}>price per share</T>
      </g>

      {/* spread area, revealed left to right */}
      <clipPath id="areaClip">
        <rect x={X0} y={0} width={(X1 - X0) * area} height={720} />
      </clipPath>
      <path d={areaPath} fill={C.highlight} opacity={0.9} clipPath="url(#areaClip)" />

      {/* strike line */}
      <line
        x1={X0}
        y1={ys}
        x2={X0 + (X1 - X0) * strike}
        y2={ys}
        stroke={C.navy}
        strokeWidth={7}
        strokeLinecap="round"
      />
      {/* FMV line draws itself */}
      <path
        d={fmvPath}
        fill="none"
        stroke={C.ink}
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - fmv}
        opacity={fmv > 0 ? 1 : 0}
      />

      {/* tags */}
      <g opacity={strikeTag} transform={`translate(${X1 + 22} ${ys}) scale(${0.8 + 0.2 * strikeTag})`}>
        <T x={0} y={-2} size={38} weight={800} fill={C.navy} head>{D.strike}</T>
        <T x={0} y={30} size={26} fill={C.navy}>strike</T>
      </g>
      <g opacity={fmvTag} transform={`translate(${X1 + 22} ${yf}) scale(${0.8 + 0.2 * fmvTag})`}>
        <T x={0} y={8} size={46} weight={800} head>{D.fmv}</T>
        <T x={0} y={40} size={26} fill={C.inkSoft}>fair market</T>
        <T x={0} y={70} size={26} fill={C.inkSoft}>value</T>
      </g>

      {/* the spread label */}
      <g opacity={brace} transform={`translate(${px(0.69)} ${py(62)})`}>
        <g transform={`scale(${0.7 + 0.3 * brace}) rotate(-3)`} filter="url(#cutSoft)">
          <rect x={-150} y={-44} width={300} height={124} fill={C.white} />
          <T x={0} y={0} size={40} weight={800} anchor="middle" head>the spread</T>
          <T x={0} y={50} size={32} weight={700} anchor="middle" fill={C.navy}>
            {D.spreadPerShare} per option
          </T>
        </g>
      </g>
      <g opacity={brace}>
        <line x1={px(1) - 26} y1={yf + 14} x2={px(1) - 26} y2={ys - 12} stroke={C.ink} strokeWidth={4} strokeDasharray="4 10" strokeLinecap="round" />
      </g>
    </Stage>
  );
};
