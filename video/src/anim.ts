import { Easing, interpolate, spring } from "remotion";
import { FPS } from "./timeline";

const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0 -> 1 between two times (seconds), eased. */
export const prog = (frame: number, fromSec: number, toSec: number, ease = Easing.inOut(Easing.cubic)) =>
  interpolate(frame, [fromSec * FPS, toSec * FPS], [0, 1], { ...CL, easing: ease });

export const easeOut = Easing.out(Easing.cubic);

/** Soft spring pop starting at `atSec`. Slight overshoot, never bouncy. */
export const pop = (frame: number, atSec: number, damping = 14) =>
  spring({ frame: frame - atSec * FPS, fps: FPS, config: { damping, mass: 0.7, stiffness: 120 } });

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Count-up value. */
export const countUp = (frame: number, fromSec: number, toSec: number, target: number) =>
  target * prog(frame, fromSec, toSec, easeOut);
