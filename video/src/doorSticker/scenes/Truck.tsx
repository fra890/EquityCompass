import React from "react";
import { useCurrentFrame } from "remotion";
import { pop, prog, easeOut, lerp } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { Stage, T } from "../../components/Stage";
import { C } from "../../theme";
import { KICKER } from "../script";
import { cue, sceneSeconds } from "../timeline";

const GROUND = 640;
const BED_TOP = 446;
// boxes in the bed: [x, bottomY]
const SLOTS: [number, number][] = [
  [150, BED_TOP],
  [270, BED_TOP],
  [390, BED_TOP],
  [210, BED_TOP - 84],
  [330, BED_TOP - 84],
];
const BOX = 108;
const BOX_H = 80;
const LIMIT_ANGLE = 48; // gauge angle of the limit mark

const Box: React.FC<{ x: number; y: number; tone?: string; dashed?: boolean }> = ({ x, y, tone = C.paperDark, dashed }) => (
  <g transform={`translate(${x} ${y - BOX_H})`}>
    {dashed ? (
      <rect width={BOX} height={BOX_H} fill="none" stroke={C.ink} strokeWidth={3} strokeDasharray="8 9" />
    ) : (
      <>
        <g filter="url(#cutSoft)">
          <rect width={BOX} height={BOX_H} fill={tone} />
        </g>
        <rect x={BOX / 2 - 9} width={18} height={BOX_H} fill={C.ink} opacity={0.16} />
        <rect width={BOX} height={BOX_H} fill="none" stroke={C.ink} strokeWidth={3} />
      </>
    )}
  </g>
);

export const Truck: React.FC = () => {
  const frame = useCurrentFrame();
  const c1 = cue("truck", 1);
  const end = sceneSeconds("truck");
  const truckIn = pop(frame, 0.1);
  const sticker = pop(frame, 0.7);
  const loadStart = 1.3;
  const step = (c1 - 0.5 - loadStart) / SLOTS.length;
  const drops = SLOTS.map((_, i) => prog(frame, loadStart + i * step, loadStart + i * step + 0.45, easeOut));
  const loaded = drops.reduce((a, b) => a + (b >= 1 ? 1 : 0), 0);
  const load = drops.reduce((a, b) => a + b, 0) / SLOTS.length;
  // the extra box: hovers, then gets pulled away
  const hoverIn = prog(frame, c1 - 0.3, c1 + 0.5, easeOut);
  const away = prog(frame, c1 + 1.3, end - 0.4);
  const hovering = hoverIn > 0 && away < 1;
  const tremble = hovering ? Math.sin(frame * 1.3) * 1.6 * hoverIn * (1 - away) : 0;
  const needle = lerp(-90, LIMIT_ANGLE, load) + tremble;
  const sink = load * 16;
  const hx = lerp(270, 430, away);
  const hy = lerp(-140, BED_TOP - 84 - 84 - 46, hoverIn) - away * 120 + Math.sin(frame / 5) * 5 * (1 - away);
  return (
    <Stage kicker={KICKER} title={<>Loaded to the <Highlight at={0.9}>door sticker.</Highlight></>}>
      <line x1={20} y1={GROUND} x2={980} y2={GROUND} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />

      {/* door sticker close-up */}
      <g opacity={sticker}>
        <line x1={690} y1={470} x2={742} y2={176} stroke={C.ink} strokeWidth={3} strokeDasharray="4 9" />
        <g transform={`translate(790 96) rotate(2) scale(${0.8 + 0.2 * sticker})`}>
          <g filter="url(#cut)">
            <rect x={-180} y={-80} width={360} height={160} fill={C.white} />
          </g>
          <rect x={-180} y={-80} width={360} height={46} fill={C.highlight} />
          <rect x={-180} y={-80} width={360} height={160} fill="none" stroke={C.ink} strokeWidth={4} />
          <T x={0} y={-47} size={25} weight={800} anchor="middle" letterSpacing="0.14em">DOOR STICKER</T>
          <T x={0} y={14} size={44} weight={800} anchor="middle" head>WEIGHT LIMIT</T>
          <T x={0} y={54} size={25} weight={700} anchor="middle" fill={C.inkSoft}>do not exceed</T>
        </g>
      </g>

      {/* load gauge */}
      <g opacity={sticker} transform="translate(840 330)">
        <path d="M-100 0 A100 100 0 0 1 100 0" fill="none" stroke={C.paperDark} strokeWidth={26} />
        <path
          d={`M-100 0 A100 100 0 0 1 ${100 * Math.sin((LIMIT_ANGLE * Math.PI) / 180)} ${-100 * Math.cos((LIMIT_ANGLE * Math.PI) / 180)}`}
          fill="none"
          stroke={C.navy}
          strokeWidth={26}
          opacity={0.35}
        />
        <g transform={`rotate(${LIMIT_ANGLE})`}>
          <line x1={0} y1={-80} x2={0} y2={-122} stroke={C.ink} strokeWidth={7} />
        </g>
        <T x={104} y={-92} size={25} weight={800} head>limit</T>
        <g transform={`rotate(${needle})`}>
          <line x1={0} y1={8} x2={0} y2={-84} stroke={C.ink} strokeWidth={8} strokeLinecap="round" />
        </g>
        <circle r={13} fill={C.ink} />
        <T x={0} y={44} size={24} weight={700} anchor="middle" fill={C.inkSoft}>load</T>
      </g>

      {/* the truck */}
      <g opacity={truckIn} transform={`translate(${(1 - truckIn) * -60} ${sink})`}>
        {SLOTS.map(([x, y], i) => {
          const d = drops[i];
          return d > 0 ? (
            <g key={i} transform={`translate(0 ${(1 - d) * -420})`}>
              <Box x={x} y={y} tone={i % 2 ? C.white : C.paperDark} />
            </g>
          ) : null;
        })}
        <g filter="url(#cut)">
          <path d="M110 446 H560 V540 H110 Z" fill={C.navy} />
          <path d="M560 540 V446 L604 352 H742 L800 446 H902 Q930 446 930 478 V540 Z" fill={C.navy} />
        </g>
        <path d="M622 372 H730 L772 446 H590 Z" fill={C.navySoft} />
        <line x1={560} y1={446} x2={560} y2={540} stroke={C.ink} strokeWidth={4} />
        <rect x={676} y={462} width={30} height={20} fill={C.highlight} stroke={C.ink} strokeWidth={2} />
        <rect x={120} y={470} width={430} height={8} fill={C.ink} opacity={0.25} />
        <rect x={900} y={486} width={30} height={16} fill={C.highlight} />
        {[230, 790].map((x) => (
          <g key={x} transform={`translate(${x} ${570 - sink})`}>
            <circle r={58} fill={C.ink} />
            <circle r={24} fill={C.paperDark} />
          </g>
        ))}
      </g>

      {/* one more box: hovers, then is pulled away */}
      {hoverIn > 0 ? (
        <g opacity={1 - prog(frame, c1 + 1.7, c1 + 2.4)}>
          <g opacity={(1 - away) * 0.9}>
            <Box x={270} y={BED_TOP - 84 - 84 + sink} dashed />
          </g>
          <g transform={`translate(${hx} ${hy}) rotate(${away * 14})`}>
            <line x1={BOX / 2} y1={-BOX_H - 140} x2={BOX / 2} y2={-BOX_H} stroke={C.ink} strokeWidth={4} />
            <Box x={0} y={0} tone={C.highlight} />
            <T x={BOX / 2} y={-BOX_H / 2 + 12} size={36} weight={800} anchor="middle" head>+1</T>
          </g>
        </g>
      ) : null}
      <g opacity={pop(frame, c1 + 1.5)} transform="translate(250 96)">
        <rect x={-190} y={-36} width={380} height={58} fill={C.ink} transform="rotate(-1.5)" />
        <T x={0} y={4} size={32} weight={800} anchor="middle" head fill={C.highlight}>not one box past it</T>
      </g>
      <T x={0} y={0} size={1} opacity={0}>{loaded}</T>
    </Stage>
  );
};
