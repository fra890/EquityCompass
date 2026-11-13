// All on-screen copy lives here.
//
// Inline markup inside a line:
//   {22%}   -> set in JetBrains Mono (every number)
//   [35%]   -> the single accent moment of that screen (blue plate)
//   [{35%}] -> both
// Each array entry is one line on screen. Max 8 words per headline.

export const copy = {
	hook: {
		first: ['Your company', 'withheld {22%}', 'on your RSUs.'],
		second: ['Your bracket', 'is [{35%}].'],
	},

	ledger: {
		tag: 'The math',
		rows: [
			{label: 'RSU vest', value: 400000},
			{label: 'Withheld at {22%}', value: 88000},
			{label: 'Owed at {35%}', value: 140000},
		],
		gap: {label: 'The gap', value: 52000},
		footnote: 'Hypothetical illustration. Federal only.',
	},

	cards: [
		{tag: 'Stock options', lines: ['ISOs exercised.', 'AMT due', 'in [April].']},
		{tag: 'Lockups', lines: ['Lockup ends.', 'Do you have', 'a [plan]?']},
		{tag: 'Concentration', lines: ['[One ticker.]', 'Most of your', 'net worth.']},
	],

	turn: {
		first: ['These are', 'timing problems.'],
		second: ['Timing can', 'be [planned].'],
	},

	title: {
		name: 'Fully Vested',
		sub: 'Equity compensation, by the numbers',
	},

	end: {
		tag: 'First episodes',
		episodes: [
			{n: '01', title: 'RSUs'},
			{n: '02', title: 'ISOs and AMT'},
			{n: '03', title: 'Lockups'},
		],
		cadence: 'New episodes weekly.',
		cta: 'Follow along.',
		credit: 'Frank Alvarez · Financial Consultant',
		disclaimer: ['Educational only. Not investment,', 'tax, or legal advice.'],
	},
} as const;

export const assets = {
	logo: 'tidemark-logo.jpg', // 1801x289. Never recoloured or stretched.
	audio: 'audio/promo.mp3', // optional
} as const;
