import { computeAll, SCENARIO } from "./taxModel";

/** Computed once; every scene and caption reads from here. */
export const N = computeAll();
export const S = SCENARIO;

const sig = (n: number, digits: number) => {
  if (n === 0) return 0;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(n))) - (digits - 1));
  return Math.round(n / mag) * mag;
};

export const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
/** Rounded to 2 significant figures: 567,476 -> $570,000 */
export const usdRound = (n: number, digits = 2) => usd(sig(n, digits));
/** $2,000,000 -> "$2 million"; 1,250,000 -> "$1.25 million" */
export const usdMillions = (n: number) => {
  const m = n / 1_000_000;
  return "$" + (Number.isInteger(m) ? m.toString() : m.toFixed(2).replace(/0+$/, "")) + " million";
};
export const num = (n: number) => Math.round(n).toLocaleString("en-US");
export const numRound = (n: number, digits = 2) => num(sig(n, digits));

/** Display strings used on screen (all rounded). */
export const D = {
  isoCount: num(S.isoCount),
  strike: usd(S.strike),
  fmv: usd(S.fmv),
  spreadPerShare: usd(N.spreadPerShare),
  totalSpread: usdMillions(N.totalSpread),
  amtAll: usdRound(N.allAtOnce.amt),
  crossoverSpread: usdRound(N.crossover.spread),
  crossoverShares: numRound(N.crossover.shares),
  staggeredAmt: usdRound(N.staggeredAmt),
  staggeredShares: numRound(N.staggeredShares, 2),
  creditPerYear: usdRound(N.creditPerYear),
  creditYears: numRound(N.creditYears, 2),
  years: S.staggerYears.toString(),
};
