import { D } from "./numbers";
import type { SceneId } from "./timeline";

/**
 * Narration / burned-in captions. `at` and `to` are seconds relative to the
 * start of the scene. Wrap a phrase in [[double brackets]] to highlight it.
 * Numbers come from the tax model via `D`, so the copy updates with the math.
 */
/** `hero: true` = the line is already set as the scene's large on-screen text, so no caption box. */
export type Line = { at: number; to: number; text: string; hero?: boolean };

export const SCRIPT: Record<SceneId, Line[]> = {
  hook: [
    { at: 0.2, to: 3.0, text: "They held SpaceX options for years. Then IPO talk started.", hero: true },
    {
      at: 3.0,
      to: 6.0,
      text: `[[Hypothetical]] example: ${D.isoCount} options, a ${D.spreadPerShare} spread on each. ${D.totalSpread} on paper.`,
    },
  ],
  iso: [
    { at: 0.2, to: 3.4, text: `An incentive stock option lets you buy shares at a fixed strike price. Here, ${D.strike}.` },
    { at: 3.4, to: 6.6, text: `Fair market value kept climbing. In this hypothetical, to ${D.fmv}.` },
    { at: 6.6, to: 10.0, text: `The gap is [[the spread]]: ${D.isoCount} x ${D.spreadPerShare}, or ${D.totalSpread}.` },
  ],
  roads: [
    { at: 0.2, to: 3.0, text: "With an IPO in view, there are two roads out of an ISO." },
    { at: 3.0, to: 6.2, text: "Disqualified: sell too soon, and the gain is taxed as ordinary income." },
    {
      at: 6.2,
      to: 9.8,
      text: "[[Qualified]]: hold 2 years from grant and 1 year from exercise. Long-term capital gains.",
    },
    { at: 9.8, to: 13.0, text: "So everyone wants to exercise everything now and start the clock." },
  ],
  trap: [
    {
      at: 0.2,
      to: 4.2,
      text: `Exercise all ${D.isoCount} at once, and the ${D.totalSpread} spread counts as income for the alternative minimum tax.`,
    },
    { at: 4.2, to: 8.0, text: `In this hypothetical: an AMT bill of [[roughly ${D.amtAll}]].` },
    { at: 8.0, to: 12.0, text: "Tax due in cash. Stock you can't sell yet." },
  ],
  refund: [
    {
      at: 0.2,
      to: 4.0,
      text: "That AMT becomes a credit. It comes back only in years when regular tax exceeds tentative minimum tax.",
    },
    { at: 4.0, to: 7.4, text: `In this example, absent a sale, that is [[roughly ${D.creditPerYear} a year]].` },
    { at: 7.4, to: 11.0, text: "And if the stock falls after exercise, you paid tax on gains that never showed up." },
  ],
  intersection: [
    { at: 0.2, to: 3.4, text: "The answer sits between all and nothing. It is an [[intersection point]]." },
    {
      at: 3.4,
      to: 7.4,
      text: "Exercise more, and tentative minimum tax rises until it meets regular tax. That is the [[crossover]].",
    },
    {
      at: 7.4,
      to: 11.4,
      text: `In this hypothetical: about ${D.crossoverSpread} of spread, roughly ${D.crossoverShares} options, with about $0 of AMT.`,
    },
    { at: 11.4, to: 15.0, text: "Spread exercises across years, each sized near that year's crossover." },
    {
      at: 15.0,
      to: 19.0,
      text: "Go past it only on purpose: with the credit recovery mapped and the [[cash set aside]].",
    },
  ],
  principle: [
    { at: 0.3, to: 6.0, text: "The best tax outcome on paper can be the most expensive one in cash." },
  ],
  endcard: [{ at: 0.3, to: 5.0, text: "Frank Alvarez. Tidemark Financial Partners. Equity comp for engineers." }],
  disclosure: [],
};

export const DISCLOSURE_TEXT =
  "Based on real client work. Names, figures, and identifying details have been changed for confidentiality. Hypothetical example for illustration only; tax figures simplified. Not investment, tax, or legal advice.";

// Firm line from Tidemark's short-form marketing disclosure. Set to "" to
// show only the text above (confirm with the CCO first).
export const DISCLOSURE_FIRM_LINE =
  "Tidemark, LLC is an SEC-registered investment adviser. Registration does not imply a certain level of skill or training. Outcomes depend on individual circumstances.";

/** Captions where the scene's hero text already carries the line. */
export const CAPTIONS_HIDDEN: Partial<Record<SceneId, boolean>> = {
  principle: true,
  endcard: true,
};

export const stripMarks = (t: string) => t.replace(/\[\[|\]\]/g, "");
