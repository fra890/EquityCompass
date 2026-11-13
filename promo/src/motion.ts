import {Easing, interpolate} from 'remotion';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// The house move: ease-out, 12-18 frames, no overshoot.
export const easeOut = (frame: number, at: number, dur = 16) =>
	interpolate(frame, [at, at + dur], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});

export const linear = (frame: number, at: number, dur: number) =>
	interpolate(frame, [at, at + dur], [0, 1], clamp);

export const fadeOut = (frame: number, dur: number, len = 8) =>
	interpolate(frame, [dur - len, dur], [1, 0], clamp);
