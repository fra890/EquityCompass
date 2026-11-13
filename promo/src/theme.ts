// Design system. Strict: three brand colours, three typefaces.

// One-line format switch: 'vertical' (1080x1920) or 'wide' (1920x1080).
export const FORMAT: 'vertical' | 'wide' = 'vertical';

export const SIZES = {
	vertical: {width: 1080, height: 1920},
	wide: {width: 1920, height: 1080},
} as const;

export const FPS = 30;

export const color = {
	navy: '#1B365D',
	paper: '#F7F5F0',
	blue: '#006298',
} as const;

// Off-white at reduced strength, for labels and rules on navy.
export const paperA = (a: number) => `rgba(247, 245, 240, ${a})`;
export const navyA = (a: number) => `rgba(27, 54, 93, ${a})`;

export const font = {
	serif: "'Source Serif 4', Georgia, serif",
	sans: "'Inter', Helvetica, Arial, sans-serif",
	mono: "'JetBrains Mono', ui-monospace, monospace",
} as const;

// Scene timeline, in frames at 30fps. Total ~31s.
export const T = {
	names: {from: 0, dur: 66, each: 6},
	here: {from: 66, dur: 78},
	hook: {from: 144, dur: 84},
	ledger: {from: 228, dur: 168},
	cards: {from: 396, dur: 192, each: 64},
	turn: {from: 588, dur: 72},
	title: {from: 660, dur: 90},
	end: {from: 750, dur: 190},
	total: 940,
} as const;

// Series trailer: who it's for, why it exists, the eight chapters, the title. ~43s.
const CH = 84;
const CH_LAST = 100;
export const TR = {
	names: {from: 0, dur: 66, each: 6},
	here: {from: 66, dur: 72},
	paper: {from: 138, dur: 126},
	chapters: {from: 264, each: CH, last: CH_LAST, dur: CH * 7 + CH_LAST},
	turn: {from: 264 + CH * 7 + CH_LAST, dur: 78},
	title: {from: 342 + CH * 7 + CH_LAST, dur: 90},
	end: {from: 432 + CH * 7 + CH_LAST, dur: 170},
	total: 602 + CH * 7 + CH_LAST,
} as const;

// Teaser cut: opens the loop, withholds the explanation. ~19s.
export const TT = {
	names: {from: 0, dur: 66, each: 6},
	here: {from: 66, dur: 66},
	hook: {from: 132, dur: 92},
	gap: {from: 224, dur: 90},
	flash: {from: 314, dur: 48, each: 16},
	title: {from: 362, dur: 84},
	end: {from: 446, dur: 150},
	total: 596,
} as const;
