import type { Line } from "../lib/buildTimeline";

export const SCENE_IDS = [
  "hook",
  "squeeze",
  "wants",
  "coworkers",
  "planTender",
  "planLots",
  "planWithholding",
  "planDebt",
  "planBackstop",
  "truck",
  "cost",
  "principle",
  "endcard",
  "disclosure",
] as const;
export type SceneId = (typeof SCENE_IDS)[number];

/**
 * Every figure the video is allowed to show. From the case as given
 * (already changed for confidentiality); nothing is derived or added up.
 */
export const FIG = {
  rsuIncome: "$1M",
  withheld: "22%",
  withheldNew: "37%",
  tax: "$140K",
  family: "$50K",
  cards: "$10K",
  tender: "$120K",
  lotSaving: "$12K",
  cardRate: "24%",
  loanMonths: "60",
  loanPayment: "$1,000",
};

export const QUOTE_A = "Concentration gets you wealthy. Diversification keeps you wealthy.";
export const QUOTE_B = "Right now I want the first one.";

/** Captions, in order. [[double brackets]] highlight a phrase. */
export const SCRIPT: Record<SceneId, Line[]> = {
  hook: [
    { text: `${QUOTE_A} ${QUOTE_B}`, hero: true, secs: 4.8 },
    { text: "An engineer at a private defense-tech company, opening the meeting." },
  ],
  squeeze: [
    { text: `Close to ${FIG.rsuIncome} of RSU income this year. Only ${FIG.withheld} withheld for tax.` },
    { text: `He owes about ${FIG.tax} in tax, ${FIG.family} to family, and ${FIG.cards} on cards.` },
    { text: "Very little cash. A tender window closes in days. The tax bill comes in April either way." },
  ],
  wants: [
    { text: "He wanted five things: keep the most shares, pay the tax, repay family, clear the cards, keep a cushion." },
    { text: "The last two [[pull against]] the first." },
  ],
  coworkers: [
    { text: "“My coworkers are keeping everything. How are they doing that?”" },
    { text: "Most of them have something else to borrow against. [[You don't, yet.]]" },
  ],
  planTender: [{ text: `Tender only what the math required: about ${FIG.tender} gross. [[Nothing extra.]]` }],
  planLots: [
    {
      text: `Sell the recent, higher-basis lots, not the old long-term ones. About ${FIG.lotSaving} less tax in the model.`,
    },
  ],
  planWithholding: [
    {
      text: `Move RSU withholding from ${FIG.withheld} to ${FIG.withheldNew}, paid in shares at vest. That keeps more shares than selling later to cover the bill.`,
    },
  ],
  planDebt: [
    {
      text: `Swap cards at ${FIG.cardRate} for a fixed ${FIG.loanMonths}-month loan, about ${FIG.loanPayment} a month.`,
    },
  ],
  planBackstop: [
    { text: "Leave the 401(k) loan untouched as the backstop. Extra cash goes to short-term Treasuries." },
  ],
  truck: [
    { text: "Like loading a truck right up to the weight limit on the door sticker." },
    { text: "And [[not one box past it.]]" },
  ],
  cost: [{ text: "His plan, his trade-offs. A different engineer gets a different answer.", secs: 7.4 }],
  principle: [
    {
      text: "Concentration was never the danger here. Borrowing at 24% to keep it would have been.",
      hero: true,
      secs: 5.0,
    },
  ],
  endcard: [],
  disclosure: [],
};

export const COST_LINES = [
  "Five years of loan payments",
  "Two months of cash instead of six",
  "The 401(k) loan is the only backstop",
  "Private stock can fall. No promise of another tender.",
];

export const DISCLOSURE_TEXT =
  "Based on real client work. Names, figures, and identifying details have been changed for confidentiality. Not investment, tax, or legal advice.";

// Firm line from Tidemark's short-form marketing disclosure. Set to "" to
// show only the text above (confirm with the CCO first).
export const DISCLOSURE_FIRM_LINE =
  "Tidemark, LLC is an SEC-registered investment adviser. Registration does not imply a certain level of skill or training. One client's situation; outcomes depend on individual circumstances.";

export const KICKER = "From real client work · details changed";
