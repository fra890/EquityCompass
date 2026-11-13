import React from "react";
import { useCurrentFrame } from "remotion";
import { pop, prog, easeOut } from "../../anim";
import { Highlight } from "../../components/Highlight";
import { Stage, T } from "../../components/Stage";
import { C } from "../../theme";

const COINS = [0, 1, 2, 3, 4, 5];

export const PlanBackstop: React.FC = () => {
  const frame = useCurrentFrame();
  const caseIn = pop(frame, 0.2);
  const sheen = prog(frame, 0.9, 1.9);
  const tray = pop(frame, 1.6);
  return (
    <Stage kicker="The plan · 5 of 5" title={<>Keep the backstop <Highlight at={1.2}>untouched.</Highlight></>}>
      {/* 401(k) loan behind glass */}
      <g opacity={caseIn} transform={`translate(250 380) scale(${0.85 + 0.15 * caseIn})`}>
        <g filter="url(#cut)">
          <rect x={-200} y={-230} width={400} height={460} fill={C.paperDark} />
        </g>
        <g transform="rotate(-2)">
          <rect x={-140} y={-140} width={280} height={250} fill={C.red} />
          <T x={0} y={-52} size={56} weight={800} anchor="middle" head fill={C.white}>401(k)</T>
          <T x={0} y={8} size={56} weight={800} anchor="middle" head fill={C.white}>loan</T>
          <T x={0} y={66} size={27} weight={600} anchor="middle" fill={C.white}>not drawn</T>
        </g>
        {/* glass */}
        <rect x={-180} y={-210} width={360} height={380} fill="#FFFFFF" opacity={0.3} />
        <clipPath id="glassClip">
          <rect x={-180} y={-210} width={360} height={380} />
        </clipPath>
        <g clipPath="url(#glassClip)" opacity={0.75}>
          <polygon points={`${-420 + sheen * 760},170 ${-340 + sheen * 760},170 ${-200 + sheen * 760},-210 ${-280 + sheen * 760},-210`} fill="#FFFFFF" />
          <polygon points={`${-310 + sheen * 760},170 ${-290 + sheen * 760},170 ${-150 + sheen * 760},-210 ${-170 + sheen * 760},-210`} fill="#FFFFFF" />
        </g>
        <rect x={-180} y={-210} width={360} height={380} fill="none" stroke={C.ink} strokeWidth={7} />
        <rect x={-200} y={176} width={400} height={54} fill={C.ink} />
        <T x={0} y={213} size={28} weight={800} anchor="middle" head fill={C.highlight}>BACKSTOP ONLY</T>
      </g>

      {/* extra cash into short-term Treasuries */}
      <g opacity={tray}>
        <T x={745} y={186} size={27} weight={700} anchor="middle" fill={C.inkSoft} letterSpacing="0.12em">ANY EXTRA CASH</T>
        {COINS.map((i) => {
          const d = prog(frame, 2.0 + i * 0.3, 2.6 + i * 0.3, easeOut);
          const x = 640 + (i % 3) * 105;
          const y = 500 - Math.floor(i / 3) * 64;
          return (
            <g key={i} opacity={d > 0 ? 1 : 0} transform={`translate(${x} ${200 + (y - 200) * d})`}>
              <ellipse cx={0} cy={0} rx={46} ry={26} fill={C.highlight} stroke={C.ink} strokeWidth={4} />
              <T x={0} y={11} size={30} weight={800} anchor="middle" head>$</T>
            </g>
          );
        })}
        <g filter="url(#cut)">
          <path d="M560 520 h370 l-22 90 h-326 z" fill={C.navy} />
        </g>
        <T x={745} y={578} size={29} weight={800} anchor="middle" head fill={C.white}>short-term Treasuries</T>
      </g>
    </Stage>
  );
};
