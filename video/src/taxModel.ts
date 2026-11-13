/**
 * Simplified federal regular tax + AMT model for the ISO explainer video.
 *
 * ILLUSTRATION ONLY. Federal only, single filer, standard deduction, no state
 * tax (California has its own AMT), no NIIT, no other preference items,
 * no credits other than the minimum tax credit. Every on-screen number is
 * derived from this file; nothing is hardcoded in the scenes.
 */

export type Bracket = { upTo: number; rate: number };

// FRANK: VERIFY — every value in this object, against Rev. Proc. 2025-32
// (2026 inflation adjustments, including the OBBBA changes).
// Cross-checked against the IRS news release on 2026-11-13: standard
// deduction, AMT exemption, AMT phase-out start and 50% phase-out rate, and
// the 32% / 35% / 37% bracket starts. NOT independently confirmed: the
// 28% AMT rate break (amtRateBreak) and the lower bracket bounds.
export const TAX_CONFIG = {
  taxYear: 2026,
  filingStatus: "single" as const,

  // --- Regular tax ---
  standardDeduction: 16_100, // FRANK: VERIFY (2026 single)
  regularBrackets: [
    // FRANK: VERIFY (2026 single, taxable income upper bounds)
    { upTo: 12_400, rate: 0.1 },
    { upTo: 50_400, rate: 0.12 },
    { upTo: 105_700, rate: 0.22 },
    { upTo: 201_775, rate: 0.24 },
    { upTo: 256_225, rate: 0.32 },
    { upTo: 640_600, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ] as Bracket[],

  // --- AMT ---
  amtExemption: 90_100, // FRANK: VERIFY (2026 single)
  amtPhaseOutStart: 500_000, // FRANK: VERIFY (2026 single, AMTI where phase-out begins)
  amtPhaseOutRate: 0.5, // FRANK: VERIFY (50 cents per $1 from 2026 under OBBBA; was 25 cents)
  amtRateLow: 0.26,
  amtRateHigh: 0.28,
  amtRateBreak: 244_500, // FRANK: VERIFY — unconfirmed (2026: 28% applies to AMT base above this)
};

// FRANK: VERIFY — hypothetical employee. All illustrative, none of it real
// company data (no 409A values, tender prices, or vest dates).
export const SCENARIO = {
  w2Income: 350_000,
  isoCount: 10_000,
  strike: 10,
  fmv: 210,
  staggerYears: 4,
  // Simplification: income, FMV and tax parameters are held flat in every
  // year of the staggered schedule.
};

export type TaxConfig = typeof TAX_CONFIG;

/** Regular federal income tax on ordinary taxable income. */
export function regularTax(wages: number, cfg: TaxConfig = TAX_CONFIG): number {
  const taxable = Math.max(0, wages - cfg.standardDeduction);
  let tax = 0;
  let lower = 0;
  for (const b of cfg.regularBrackets) {
    if (taxable <= lower) break;
    tax += (Math.min(taxable, b.upTo) - lower) * b.rate;
    lower = b.upTo;
  }
  return tax;
}

/** AMT exemption after phase-out. */
export function amtExemption(amti: number, cfg: TaxConfig = TAX_CONFIG): number {
  const reduction = Math.max(0, amti - cfg.amtPhaseOutStart) * cfg.amtPhaseOutRate;
  return Math.max(0, cfg.amtExemption - reduction);
}

/**
 * Tentative minimum tax. AMTI here = wages + ISO spread (the standard
 * deduction is not allowed for AMT; the ISO bargain element is added back).
 */
export function tentativeMinimumTax(
  wages: number,
  isoSpread: number,
  cfg: TaxConfig = TAX_CONFIG,
): number {
  const amti = wages + isoSpread;
  const base = Math.max(0, amti - amtExemption(amti, cfg));
  return (
    Math.min(base, cfg.amtRateBreak) * cfg.amtRateLow +
    Math.max(0, base - cfg.amtRateBreak) * cfg.amtRateHigh
  );
}

/** AMT owed on top of regular tax for a year with a given ISO spread. */
export function amtOwed(wages: number, isoSpread: number, cfg: TaxConfig = TAX_CONFIG): number {
  return Math.max(0, tentativeMinimumTax(wages, isoSpread, cfg) - regularTax(wages, cfg));
}

/**
 * Largest ISO spread that can be recognized this year with $0 AMT:
 * where tentative minimum tax meets regular tax. Solved by bisection
 * (TMT is monotonically increasing in the spread).
 */
export function crossoverSpread(wages: number, cfg: TaxConfig = TAX_CONFIG): number {
  const target = regularTax(wages, cfg);
  if (tentativeMinimumTax(wages, 0, cfg) >= target) return 0;
  let lo = 0;
  let hi = 10_000_000;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (tentativeMinimumTax(wages, mid, cfg) > target) hi = mid;
    else lo = mid;
  }
  return lo;
}

export type ScheduleYear = {
  year: number;
  shares: number;
  spread: number;
  regularTax: number;
  tmt: number;
  amt: number;
};

function yearRow(year: number, shares: number, s = SCENARIO, cfg = TAX_CONFIG): ScheduleYear {
  const spread = shares * (s.fmv - s.strike);
  return {
    year,
    shares,
    spread,
    regularTax: regularTax(s.w2Income, cfg),
    tmt: tentativeMinimumTax(s.w2Income, spread, cfg),
    amt: amtOwed(s.w2Income, spread, cfg),
  };
}

export function computeAll(s = SCENARIO, cfg = TAX_CONFIG) {
  const spreadPerShare = s.fmv - s.strike;
  const totalSpread = spreadPerShare * s.isoCount;
  const exerciseCost = s.strike * s.isoCount;

  const regular = regularTax(s.w2Income, cfg);
  const tmtNoExercise = tentativeMinimumTax(s.w2Income, 0, cfg);

  // (a) exercise everything this year
  const allAtOnce = yearRow(1, s.isoCount, s, cfg);

  // (b) crossover
  const xSpread = crossoverSpread(s.w2Income, cfg);
  const xShares = Math.floor(xSpread / spreadPerShare);

  // (c) staggered schedule: each year sized at that year's crossover
  const staggered: ScheduleYear[] = [];
  for (let y = 1; y <= s.staggerYears; y++) staggered.push(yearRow(y, xShares, s, cfg));
  const staggeredShares = staggered.reduce((a, r) => a + r.shares, 0);
  const staggeredSpread = staggered.reduce((a, r) => a + r.spread, 0);
  const staggeredAmt = staggered.reduce((a, r) => a + r.amt, 0);

  // Contrast: naive even split of all options over the same number of years
  const evenSplit: ScheduleYear[] = [];
  for (let y = 1; y <= s.staggerYears; y++)
    evenSplit.push(yearRow(y, s.isoCount / s.staggerYears, s, cfg));
  const evenSplitAmt = evenSplit.reduce((a, r) => a + r.amt, 0);

  // Minimum tax credit recovery after the all-at-once exercise, assuming no
  // sale and the same wages each later year: usable credit per year is the
  // amount by which regular tax exceeds tentative minimum tax.
  const creditPerYear = Math.max(0, regular - tmtNoExercise);
  const creditYears = creditPerYear > 0 ? allAtOnce.amt / creditPerYear : Infinity;

  // Curve for the crossover chart: tax vs ISO spread exercised this year
  const curveMax = xSpread * 3;
  const curve = Array.from({ length: 61 }, (_, i) => {
    const spread = (curveMax * i) / 60;
    return { spread, regular, tmt: tentativeMinimumTax(s.w2Income, spread, cfg) };
  });

  return {
    spreadPerShare,
    totalSpread,
    exerciseCost,
    regular,
    tmtNoExercise,
    allAtOnce,
    crossover: { spread: xSpread, shares: xShares, tax: regular },
    staggered,
    staggeredShares,
    staggeredSpread,
    staggeredAmt,
    evenSplit,
    evenSplitAmt,
    creditPerYear,
    creditYears,
    curve,
    curveMax,
  };
}
