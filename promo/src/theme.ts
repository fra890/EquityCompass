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

// Scene timeline, in frames at 30fps. Total 28s.
export const T = {
	hook: {from: 0, dur: 96},
	ledger: {from: 96, dur: 180},
	cards: {from: 276, dur: 210, each: 70},
	turn: {from: 486, dur: 78},
	title: {from: 564, dur: 96},
	end: {from: 660, dur: 180},
	total: 840,
} as const;
