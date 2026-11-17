/**
 * ESPP disposition model for the explainer video (Section 423 qualified plan).
 * ILLUSTRATION ONLY. Splits the gain per share into ordinary income and
 * capital gain, then applies two assumed flat federal rates to show the
 * difference in dollars. Every on-screen number is derived here.
 */

// FRANK: VERIFY — hypothetical plan and prices. None of it is real company data.
export const ESPP = {
  discount: 0.15, // FRANK: VERIFY (plan discount; 15% is the statutory maximum)
  lookback: true, // purchase price uses the lower of offering-date and purchase-date price
  offeringPrice: 20, // FMV on the offering (grant) date
  purchasePrice: 30, // FMV on the purchase date
  salePrice: 50,
  offeringMonths: 6, // length of the offering period
  // FRANK: VERIFY — holding periods for a qualifying disposition
  monthsFromOffering: 24, // more than 2 years after the offering date
  monthsFromPurchase: 12, // more than 1 year after the purchase date
  disqualifyingSaleMonth: 12, // example early sale: 6 months after purchase
  qualifyingSaleMonth: 27, // example later sale

  // FRANK: VERIFY — assumptions for the tax-in-dollars scene. Flat federal
  // rates picked for a round illustration; not anyone's actual bracket.
  shares: 1_000,
  ordinaryRate: 0.35, // wages, ESPP ordinary income, short-term gains
  longTermRate: 0.15, // long-term capital gains
};

export type Split = { ordinary: number; capital: number; longTerm: boolean };

export function computeEspp(c = ESPP) {
  const basePrice = c.lookback ? Math.min(c.offeringPrice, c.purchasePrice) : c.purchasePrice;
  const paid = basePrice * (1 - c.discount);
  const totalGain = c.salePrice - paid;

  // Disqualifying: ordinary income is the spread on the purchase date,
  // whatever the later sale price. The rest is capital gain or loss.
  const dqOrdinary = c.purchasePrice - paid;
  const disqualifying: Split = {
    ordinary: dqOrdinary,
    capital: c.salePrice - c.purchasePrice,
    longTerm: c.disqualifyingSaleMonth - c.offeringMonths > c.monthsFromPurchase,
  };

  // Qualifying: ordinary income is the lesser of (a) the discount measured
  // on the offering-date price and (b) the actual gain on sale, floored at 0.
  const offeringDiscount = c.offeringPrice * c.discount;
  const qOrdinary = Math.max(0, Math.min(offeringDiscount, totalGain));
  const qualifying: Split = { ordinary: qOrdinary, capital: totalGain - qOrdinary, longTerm: true };

  // First month in which both holding periods are met
  const qualifiesAtMonth = Math.max(c.monthsFromOffering, c.offeringMonths + c.monthsFromPurchase);

  // Tax in dollars under the assumed flat rates. A short-term capital gain
  // is taxed at the ordinary rate; a long-term one at the long-term rate.
  const taxPerShare = (s: Split) =>
    s.ordinary * c.ordinaryRate + s.capital * (s.longTerm ? c.longTermRate : c.ordinaryRate);
  const taxEarly = taxPerShare(disqualifying) * c.shares;
  const taxWait = taxPerShare(qualifying) * c.shares;

  return {
    basePrice,
    paid,
    totalGain,
    offeringDiscount,
    disqualifying,
    qualifying,
    qualifiesAtMonth,
    growth: c.salePrice - c.purchasePrice,
    taxEarly,
    taxWait,
    taxDifference: taxEarly - taxWait,
  };
}

export const E = computeEspp();

const usd = (n: number) => "$" + (Number.isInteger(n) ? n.toString() : n.toFixed(2));
/** Display strings used on screen. */
export const D = {
  discount: `${Math.round(ESPP.discount * 100)}%`,
  offering: usd(ESPP.offeringPrice),
  purchase: usd(ESPP.purchasePrice),
  sale: usd(ESPP.salePrice),
  paid: usd(E.paid),
  totalGain: usd(E.totalGain),
  dqOrdinary: usd(E.disqualifying.ordinary),
  dqCapital: usd(E.disqualifying.capital),
  qOrdinary: usd(E.qualifying.ordinary),
  qCapital: usd(E.qualifying.capital),
  yearsFromOffering: (ESPP.monthsFromOffering / 12).toString(),
  yearsFromPurchase: (ESPP.monthsFromPurchase / 12).toString(),
  growth: usd(E.growth),
  shifted: usd(E.disqualifying.ordinary - E.qualifying.ordinary),
  shares: ESPP.shares.toLocaleString("en-US"),
  ordinaryRate: `${Math.round(ESPP.ordinaryRate * 100)}%`,
  longTermRate: `${Math.round(ESPP.longTermRate * 100)}%`,
  taxEarly: "$" + Math.round(E.taxEarly).toLocaleString("en-US"),
  taxWait: "$" + Math.round(E.taxWait).toLocaleString("en-US"),
  taxDifference: "$" + Math.round(E.taxDifference).toLocaleString("en-US"),
};
