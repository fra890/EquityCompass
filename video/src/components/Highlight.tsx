import React from "react";
import { useCurrentFrame } from "remotion";
import { prog, easeOut } from "../anim";
import { C } from "../theme";

/** Yellow highlighter swipe behind inline HTML text. */
export const Highlight: React.FC<{ at: number; dur?: number; children: React.ReactNode }> = ({
  at,
  dur = 0.5,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = prog(frame, at, at + dur, easeOut);
  return (
    <span
      style={{
        backgroundImage: `linear-gradient(${C.highlight}, ${C.highlight})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${p * 100}% 62%`,
        backgroundPosition: "0 78%",
        padding: "0 0.12em",
        margin: "0 -0.12em",
        boxDecorationBreak: "clone",
        WebkitBoxDecorationBreak: "clone",
      }}
    >
      {children}
    </span>
  );
};

/** Highlighter swipe as an SVG rect (place before the <text> it marks). */
export const SvgSwipe: React.FC<{ x: number; y: number; w: number; h: number; at: number; dur?: number }> = ({
  x,
  y,
  w,
  h,
  at,
  dur = 0.5,
}) => {
  const frame = useCurrentFrame();
  const p = prog(frame, at, at + dur, easeOut);
  return (
    <polygon
      points={`${x},${y + 3} ${x + w * p},${y} ${x + w * p + 6 * p},${y + h - 2} ${x - 4},${y + h}`}
      fill={C.highlight}
    />
  );
};
