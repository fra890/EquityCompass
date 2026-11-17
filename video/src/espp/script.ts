import type { Line } from "../lib/buildTimeline";
import { D, E } from "./model";

export const SCENE_IDS = [
  "hook",
  "how",
  "clock",
  "disqualifying",
  "qualifying",
  "compare",
  "catch",
  "principle",
  "endcard",
  "disclosure",
] as const;
export type SceneId = (typeof SCENE_IDS)[number];

const term = E.disqualifying.longTerm
  ? "Long-term here, because the shares were held over a year."
  : "Short-term here, because the shares were held under a year.";

/** Captions, in order. [[double brackets]] highlight a phrase. Numbers come from model.ts. */
export const SCRIPT: Record<SceneId, Line[]> = {
  hook: [
    { text: "Your ESPP discount gets taxed one of two ways. The sale date picks which.", hero: true, secs: 4.4 },
    { text: "A [[hypothetical]] example. Tax rules simplified." },
  ],
  how: [
    { text: "An ESPP buys company stock from your paycheck, at a discount." },
    { text: `Hypothetical: the stock is ${D.offering} when the offering starts, and ${D.purchase} on the purchase date.` },
    { text: `With a lookback, you pay ${D.discount} off the lower price: [[${D.paid} a share]].` },
    { text: "No tax at purchase. The tax shows up when you sell." },
  ],
  clock: [
    {
      text: `Two clocks start running: ${D.yearsFromOffering} years from the offering date, and ${D.yearsFromPurchase} year from the purchase date.`,
    },
    { text: "Sell after both, and it is a [[qualifying disposition]]. Sell before either, and it is disqualifying." },
  ],
  disqualifying: [
    {
      text: `Disqualifying sale at ${D.sale}: the ${D.dqOrdinary} gap between the purchase-date value and what you paid is [[ordinary income]].`,
    },
    { text: `The other ${D.dqCapital} is capital gain. ${term}` },
  ],
  qualifying: [
    {
      text: `Qualifying sale at ${D.sale}: ordinary income is the lesser of the offering-date discount or your actual gain. Here, [[${D.qOrdinary}]].`,
    },
    { text: `The other ${D.qCapital} is long-term capital gain.` },
  ],
  compare: [{ text: `Same ${D.totalGain} gain per share. ${D.dqOrdinary} of ordinary income becomes ${D.qOrdinary}.` }],
  catch: [
    { text: "Waiting has a cost. The stock can fall while you hold, and you hold more of your employer's stock." },
    { text: `Sell a disqualifying lot at a loss, and that ${D.dqOrdinary} is still ordinary income.` },
    { text: "Check the 1099-B. It often leaves the ordinary income out of your cost basis, so it gets taxed twice." },
  ],
  principle: [
    { text: "The discount is the easy part. The sale date decides how it's taxed.", hero: true, secs: 4.6 },
  ],
  endcard: [],
  disclosure: [],
};

export const DISCLOSURE_TEXT =
  "Hypothetical example for illustration only. Tax rules are simplified and describe a Section 423 qualified ESPP; your plan and situation may differ. Not investment, tax, or legal advice.";

// Firm line from Tidemark's short-form marketing disclosure. Set to "" to
// show only the text above (confirm with the CCO first).
export const DISCLOSURE_FIRM_LINE =
  "Tidemark, LLC is an SEC-registered investment adviser. Registration does not imply a certain level of skill or training. Investing involves risk, including loss of principal.";

export const KICKER = "Hypothetical example · per share";
