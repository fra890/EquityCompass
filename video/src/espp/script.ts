import type { Line } from "../lib/buildTimeline";
import { D } from "./model";

export const SCENE_IDS = [
  "hook",
  "how",
  "clock",
  "pieces",
  "early",
  "wait",
  "differ",
  "dollars",
  "catch",
  "principle",
  "endcard",
  "disclosure",
] as const;
export type SceneId = (typeof SCENE_IDS)[number];

/** Captions, in order. [[double brackets]] highlight a phrase. Numbers come from model.ts. */
export const SCRIPT: Record<SceneId, Line[]> = {
  hook: [{ text: "Your ESPP discount gets taxed one of two ways. The sale date picks which.", hero: true, secs: 4.6 }],
  how: [
    { text: "An ESPP buys company stock from your paycheck, at a discount." },
    { text: `Hypothetical: the stock is ${D.offering} when the offering starts, and ${D.purchase} on purchase day.` },
    {
      text: `With a lookback, you pay ${D.payPct} of the lower price: ${D.basePrice} x ${D.payPct} = [[${D.paid}]]. No tax yet.`,
    },
  ],
  clock: [
    {
      text: `Two clocks start running: ${D.yearsFromOffering} years from the offering date, and ${D.yearsFromPurchase} year from the purchase date.`,
    },
    { text: "Sell after both, and it is a [[qualifying disposition]]. Sell before either, and it is disqualifying." },
  ],
  pieces: [
    { text: `Say you sell at ${D.sale}. You paid ${D.paid}, so you made ${D.sale} - ${D.paid} = ${D.totalGain} a share.` },
    { text: `That ${D.totalGain} is two pieces: a [[${D.dqOrdinary} discount]], and [[${D.growth} of growth]] after you bought.` },
  ],
  early: [
    {
      text: `Sell early. Ordinary income is the purchase-day value minus what you paid: ${D.purchase} - ${D.paid} = [[${D.dqOrdinary}]].`,
    },
    {
      text: `The rest, ${D.sale} - ${D.purchase} = ${D.growth}, is capital gain. Held under a year, so it is taxed like salary too.`,
    },
  ],
  wait: [
    {
      text: `Wait. Ordinary income is the lesser of two numbers: ${D.discount} of the starting price, ${D.qOrdinary}, or your whole gain, ${D.totalGain}.`,
    },
    { text: `So [[${D.qOrdinary}]]. The rest, ${D.totalGain} - ${D.qOrdinary} = ${D.qCapital}, is long-term capital gain.` },
  ],
  differ: [
    {
      text: "One line differs. Sell early, and the discount is measured on [[purchase day]]. Wait, and it is measured on [[the day the offering started]].",
    },
  ],
  dollars: [
    { text: `On ${D.shares} shares, assuming ${D.ordinaryRate} on ordinary income and ${D.longTermRate} on long-term gains:` },
    { text: `Sell early: about ${D.taxEarly} of tax. Wait: about ${D.taxWait}. Same shares, same sale price.` },
  ],
  catch: [
    { text: "Waiting has a cost. The stock can fall while you hold more of your employer's stock." },
    { text: "And check the 1099-B. It often leaves the ordinary income out of your cost basis." },
  ],
  principle: [
    { text: "The discount is the easy part. The sale date decides how it's taxed.", hero: true, secs: 4.6 },
  ],
  endcard: [],
  disclosure: [],
};

export const DISCLOSURE_TEXT =
  "Hypothetical example for illustration only. Tax rules are simplified and describe a Section 423 qualified ESPP. The tax rates shown are assumptions; your plan, rates, and situation will differ. Not investment, tax, or legal advice.";

// Firm line from Tidemark's short-form marketing disclosure. Set to "" to
// show only the text above (confirm with the CCO first).
export const DISCLOSURE_FIRM_LINE =
  "Tidemark, LLC is an SEC-registered investment adviser. Registration does not imply a certain level of skill or training. Investing involves risk, including loss of principal.";

export const KICKER = "Hypothetical example · per share";
