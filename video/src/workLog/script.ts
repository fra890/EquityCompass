import type { Line } from "../lib/buildTimeline";

export const SCENE_IDS = [
  "hook",
  "consolidation",
  "allocation",
  "stock",
  "taxes",
  "family",
  "closing",
  "endcard",
  "disclosure",
] as const;
export type SceneId = (typeof SCENE_IDS)[number];

/** Every figure the video shows, as given in the post. Nothing is derived. */
export const FIG = {
  accounts: "more than a dozen",
  custodians: "six",
  names: "eight",
  stocks: "about two-thirds",
  bonds: "about a quarter",
  alts: "a small slice",
  betaFrom: "1.3",
  betaTo: "1.0",
  gift: "$250,000",
  rate: "just under 5%",
};

export const HOOK_BEATS = [
  "Two tech careers.",
  "More than a dozen accounts at six custodians.",
  "Almost all stock, most of it in eight names.",
];

/** Captions, in order. [[double brackets]] highlight a phrase. */
export const SCRIPT: Record<SceneId, Line[]> = {
  hook: [
    { text: HOOK_BEATS.join(" "), hero: true, secs: 5.4 },
    { text: "The starting point for one couple I work with. Here is what the last few months actually were." },
  ],
  consolidation: [
    { text: "Moved more than a dozen accounts from six custodians [[into one]]." },
    { text: "Left one taxable account titled as it was, so a concentrated position didn't need re-registering." },
    { text: "Kept the index mutual funds in their own account. The long-short strategy doesn't take them." },
  ],
  allocation: [
    { text: "Rebuilt the portfolio: about two-thirds stocks, a quarter bonds, a small slice of alternatives." },
    { text: "Income-paying holdings went in the traditional IRAs. The most aggressive ETFs went in the Roths." },
    {
      text: `A long-short direct-indexing account took portfolio beta from about ${FIG.betaFrom} to [[about ${FIG.betaTo}]], without selling the old positions outright.`,
    },
    { text: "It runs on margin and short positions, which carry [[their own risk]]." },
  ],
  stock: [
    { text: "Sold a small slice of the concentrated stock to raise cash and book a loss." },
    { text: "Mapped the remaining lots against their [[one-year dates]]." },
    { text: "Planned to pair future gains on those lots with losses from the long-short account." },
  ],
  taxes: [
    { text: "Ran the AMT check. Nothing expected, pending the preparer's numbers." },
    { text: "Laid out a donor-advised fund and a gift of appreciated stock before the year-end cutoff." },
    { text: "Asked for an intro to their CPA, so the 1099s don't arrive as a surprise." },
  ],
  family: [
    { text: `Modeled a gift of roughly ${FIG.gift} toward a daughter's first home, [[three ways]].` },
    {
      text: `Priced the borrowing: a one-year rate ${FIG.rate}, or five years with no monthly payments while the balance grows.`,
    },
    { text: "Reran the retirement plan with the gift in it." },
  ],
  closing: [
    {
      text: "That was a few months. Most of it was transfer forms and lot lists and one long spreadsheet.",
      hero: true,
      secs: 5.2,
    },
  ],
  endcard: [],
  disclosure: [],
};

export const DISCLOSURE_TEXT =
  "Based on real client work. Names, figures, and identifying details have been changed for confidentiality.";

export const DISCLOSURE_FIRM_LINE =
  "Tidemark, LLC is an SEC-registered investment adviser. Registration does not imply a certain level of skill or training. For informational purposes only; not investment advice. Investing involves risk, including loss of principal. Past performance does not guarantee future results. Disclosures: tidemarkfp.com";

export const kicker = (n: number) => `Work log · ${n} of 5`;
