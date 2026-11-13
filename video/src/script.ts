import { D } from "./numbers";
import type { Line } from "./lib/buildTimeline";
import type { SceneId } from "./sceneIds";

export { stripMarks } from "./lib/buildTimeline";
export type { Line };

/**
 * Narration / burned-in captions, in order. Timing is worked out in
 * timeline.ts from the narration clips. Wrap a phrase in [[double brackets]]
 * to highlight it. Numbers come from the tax model via `D`.
 */
export const SCRIPT: Record<SceneId, Line[]> = {
  hook: [
    { text: "They held SpaceX options for years. Then IPO talk started.", hero: true },
    { text: `A [[hypothetical]]: ${D.isoCount} options, ${D.totalSpread} on paper.` },
  ],
  iso: [
    { text: `An ISO lets you buy shares at a fixed strike. Here, ${D.strike}.` },
    { text: `The share value climbed to a hypothetical ${D.fmv}.` },
    { text: `The gap is [[the spread]]: ${D.isoCount} x ${D.spreadPerShare}, or ${D.totalSpread}.` },
  ],
  roads: [
    { text: "With an IPO in view, there are two roads out." },
    { text: "Disqualified: sell early, pay ordinary income rates." },
    { text: "[[Qualified]]: hold 2 years from grant, 1 from exercise. Long-term capital gains." },
    { text: "So everyone wants to exercise everything now." },
  ],
  trap: [
    { text: "But exercising counts the whole spread as income for the alternative minimum tax." },
    { text: `Here, an AMT bill of [[roughly ${D.amtAll}]].` },
    { text: "Tax due in cash. Stock you can't sell yet." },
  ],
  refund: [
    { text: "The AMT returns as a credit, only when regular tax exceeds tentative minimum tax." },
    { text: `Here, [[roughly ${D.creditPerYear} a year]], absent a sale.` },
    { text: "If the stock falls, you paid tax on gains that never showed up." },
  ],
  intersection: [
    { text: "The answer sits between all and nothing: an [[intersection point]]." },
    { text: "Tentative minimum tax rises with each exercise until it meets regular tax: the [[crossover]]." },
    { text: `Here, that is roughly ${D.crossoverShares} options a year, with about $0 of AMT.` },
    { text: "Spread exercises across years, each sized near its crossover." },
    { text: "Go past it only with the credit mapped and the [[cash set aside]]." },
  ],
  principle: [{ text: "The best tax outcome on paper can be the most expensive one in cash." }],
  endcard: [], // the card itself carries the text; no narration
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

