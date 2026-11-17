/**
 * ESPP disposition model for the explainer video (Section 423 qualified plan).
 * ILLUSTRATION ONLY. Per-share figures, federal income-tax character only:
 * it splits the gain into ordinary income and capital gain and does not
 * apply any tax rate. Every on-screen number is derived here.
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

  return { basePrice, paid, totalGain, offeringDiscount, disqualifying, qualifying, qualifiesAtMonth };
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
};
