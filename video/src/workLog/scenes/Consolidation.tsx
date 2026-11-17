import React from "react";
import { useCurrentFrame } from "remotion";
import { pop, prog, lerp } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { Stage, T } from "../../components/Stage";
import { C } from "../../theme";
import { kicker } from "../script";
import { cue } from "../timeline";

const PER_TRAY = [3, 2, 2, 2, 2, 2];
const CW = 78;
const CH = 54;
const TITLED = 4; // the taxable account left titled as it was
const FUNDS = 12; // the index mutual funds account

// source position of each account card
const SRC: { x: number; y: number }[] = [];
PER_TRAY.forEach((n, i) => {
  for (let k = 0; k < n; k++) SRC.push({ x: 34 + i * 160 + (k % 2) * 46, y: 196 - (Math.floor(k / 2) + 1) * 62 - (k % 2) * 8 });
});
const slot = (i: number) => ({ x: 150 + (i % 6) * 92, y: 452 + Math.floor(i / 6) * 70 });

export const Consolidation: React.FC = () => {
  const frame = useCurrentFrame();
  const c1 = cue("consolidation", 1);
  const c2 = cue("consolidation", 2);
  const tray = pop(frame, 0.3);
  const titled = pop(frame, c1 + 0.2);
  const funds = prog(frame, c2 + 0.2, c2 + 1.0);
  const fundsTag = pop(frame, c2 + 0.9);
  return (
    <Stage kicker={kicker(1)} title={<>Consolidation: six custodians <Highlight at={2.0}>into one.</Highlight></>}>
      {/* the six old custodians */}
      {PER_TRAY.map((_, i) => {
        const emptied = prog(frame, 1.2 + i * 0.25, 1.9 + i * 0.25);
        return (
          <g key={i} opacity={1 - emptied * 0.65}>
            <rect x={24 + i * 160} y={200} width={148} height={12} fill={C.ink} />
            <T x={98 + i * 160} y={244} size={22} weight={700} anchor="middle" fill={C.inkSoft}>custodian {i + 1}</T>
          </g>
        );
      })}

      {/* the one new custodian */}
      <g opacity={tray}>
        <g filter="url(#cut)">
          <rect x={120} y={420} width={760} height={190} fill={C.white} />
        </g>
        <rect x={120} y={610} width={760} height={50} fill={C.navy} />
        <T x={500} y={645} size={28} weight={800} anchor="middle" head fill={C.white}>one custodian</T>
        <g opacity={funds}>
          <line x1={728} y1={432} x2={728} y2={598} stroke={C.ink} strokeWidth={4} strokeDasharray="6 9" />
        </g>
      </g>

      {SRC.map((s, i) => {
        const tray_ = PER_TRAY.findIndex((_, t) => i < PER_TRAY.slice(0, t + 1).reduce((a, b) => a + b, 0));
        const move = prog(frame, 0.9 + tray_ * 0.25 + (i % 3) * 0.08, 1.8 + tray_ * 0.25 + (i % 3) * 0.08);
        const d = slot(i === FUNDS ? 11 : i > TITLED ? i - 0 : i);
        let x = lerp(s.x, d.x, move);
        let y = lerp(s.y, d.y, move) - Math.sin(move * Math.PI) * 60;
        if (i === FUNDS) {
          x = lerp(x, 766, funds);
          y = lerp(y, 484, funds);
        }
        const isTitled = i === TITLED;
        const isFunds = i === FUNDS;
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <g filter="url(#cutSoft)">
              <rect width={CW} height={CH} fill={isTitled ? lerpFill(titled) : isFunds && funds > 0.5 ? C.highlight : [C.white, C.navySoft, C.paperDark][i % 3]} stroke={C.ink} strokeWidth={2} />
            </g>
            <rect width={CW} height={10} fill={isTitled && titled > 0.5 ? C.highlight : C.navy} />
          </g>
        );
      })}

      {/* tags */}
      <g opacity={titled} transform={`translate(${slot(TITLED).x + CW / 2} ${slot(TITLED).y - 60}) scale(${0.8 + 0.2 * titled})`}>
        <rect x={-150} y={-30} width={300} height={50} fill={C.ink} transform="rotate(-1.5)" />
        <T x={0} y={5} size={27} weight={800} anchor="middle" head fill={C.highlight}>titled as it was</T>
        <line x1={0} y1={20} x2={0} y2={56} stroke={C.ink} strokeWidth={4} />
      </g>
      <g opacity={fundsTag} transform={`translate(806 ${388}) scale(${0.8 + 0.2 * fundsTag})`}>
        <rect x={-150} y={-30} width={300} height={50} fill={C.highlight} transform="rotate(1.5)" />
        <T x={0} y={5} size={26} weight={800} anchor="middle" head>index mutual funds</T>
      </g>
    </Stage>
  );
};

const lerpFill = (t: number) => (t > 0.5 ? C.navy : C.navySoft);
