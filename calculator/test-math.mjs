// Checks the calculator's engine against two examples worked by hand.
// Run: node calculator/test-math.mjs
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, "tidemark-equity-calculator.html"), "utf8");
const src = html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const ctx = {}; vm.createContext(ctx); vm.runInContext(src, ctx);
const E = ctx.EquityEngine;

let fail = 0;
const rows = [];
function check(label, hand, engine, tol = 1) {
  const ok = Math.abs(hand - engine) <= tol;
  if (!ok) fail++;
  rows.push([label, hand, engine, ok]);
}
function print(title) {
  console.log("\n" + title);
  console.log("  " + "Item".padEnd(52) + "Hand".padStart(14) + "Calculator".padStart(14) + "  ");
  for (const [l, h, e, ok] of rows.splice(0))
    console.log("  " + l.padEnd(52) + h.toLocaleString("en-US", { maximumFractionDigits: 2 }).padStart(14) +
      e.toLocaleString("en-US", { maximumFractionDigits: 2 }).padStart(14) + (ok ? "  ok" : "  MISMATCH"));
}
const base = { asOf: "2026-11-17", growth: 0, isPrivate: false, doubleTrigger: false, state: "CA", flat: 0,
  otherNW: 1000000, target: 10, isoPlan: {}, tranches: [], holdQD: true };

/* ---------------------------------------------------------------
   Example A: ISO exercise and AMT
   Single, California, W-2 $250,000. 5,000 fully vested ISOs, strike $20,
   share price $100. Exercise all 5,000 in 2026 and hold.
   --------------------------------------------------------------- */
{
  // Federal regular tax: taxable = 250,000 - 16,100 = 233,900
  const regular = 12400 * 0.10 + (50400 - 12400) * 0.12 + (105700 - 50400) * 0.22 +
    (201775 - 105700) * 0.24 + (233900 - 201775) * 0.32;              // 51,304.00
  // AMT: AMTI = 250,000 + 5,000 x (100 - 20) = 650,000
  const exemption = 90100 - 0.5 * (650000 - 500000);                  // 15,100
  const tmt = 0.26 * 244500 + 0.28 * (650000 - exemption - 244500);   // 172,882.00
  const amt = tmt - regular;                                          // 121,578.00
  // Federal crossover: 0.26 x (250,000 + S - 90,100) = 51,304 -> S = 37,423.08; / $80 = 467.8
  const crossFed = Math.floor((regular / 0.26 - (250000 - 90100)) / 80); // 467
  // California (2025 FTB schedule x 1.034): taxable = 250,000 - 5,900 = 244,100
  const caReg = 11456 * 0.01 + (27157 - 11456) * 0.02 + (42861 - 27157) * 0.04 + (59498 - 42861) * 0.06 +
    (75197 - 59498) * 0.08 + (244100 - 75197) * 0.093;                // 19,018.86
  const caEx = 95902 - 0.25 * (650000 - 359633);                      // 23,310.25
  const caAmt = 0.07 * (650000 - caEx) - caReg;                       // 24,849.42
  // CA crossover (inside the phase-out): 0.07 x (250,000 + S - 95,902 + 0.25 x (250,000 + S - 359,633)) = caReg
  const crossCA = Math.floor(((caReg / 0.07) - 250000 + 95902 + 0.25 * (359633 - 250000)) / 1.25 / 80); // 1,450

  const R = E.compute({ ...base, price: 100, status: "single", w2: 250000, eventDate: "2026-11-17",
    grants: [{ type: "ISO", shares: 5000, strike: 20, fmv: 20, grantDate: "2020-01-15", vestStart: "2020-01-15", vestEnd: "2024-01-15" }],
    isoPlan: { 2026: 5000 } });
  const r = R.isoRows[0], y = R.yearTax[2026];
  check("Federal regular tax", regular, y.fed.regular);
  check("AMT exemption after 50% phase-out", exemption, y.fed.exemption);
  check("Tentative minimum tax", tmt, y.fed.tmt);
  check("Federal AMT on exercising 5,000", amt, r.fedAmt);
  check("Federal AMT crossover (shares)", crossFed, r.crossFed, 0);
  check("California regular tax", caReg, y.st.regular);
  check("California AMT on exercising 5,000", caAmt, r.stAmt);
  check("California AMT crossover (shares)", crossCA, r.crossSt, 0);
  check("Combined crossover (shares)", Math.min(crossFed, crossCA), r.cross, 0);
  check("Cash to exercise 5,000", 5000 * 20, r.cost, 0);
  print("Example A: ISO exercise and AMT (single, CA, $250,000 W-2, 5,000 ISOs at $20, price $100)");
}

/* ---------------------------------------------------------------
   Example B: RSU withholding gap and a sale tranche
   Married filing jointly, California, W-2 $400,000. 6,000 RSUs vesting
   500 per quarter from Feb 2025 to Nov 2027, grant FMV $40, price $139.11.
   One tranche sells 100% of held shares on Dec 8, 2026.
   --------------------------------------------------------------- */
{
  const P = 139.11;
  const inc = 2000 * P;                                               // 278,220 of 2026 RSU income
  const whFed = 0.22 * inc, whCA = 0.1023 * inc;                      // 61,208.40 ; 28,461.91
  // Federal: taxable without RSUs = 400,000 - 32,200 = 367,800; with = 646,020
  const f0 = 24800 * 0.10 + (100800 - 24800) * 0.12 + (211400 - 100800) * 0.22 + (367800 - 211400) * 0.24; // 73,468
  const f1 = 24800 * 0.10 + (100800 - 24800) * 0.12 + (211400 - 100800) * 0.22 + (403550 - 211400) * 0.24 +
    (512450 - 403550) * 0.32 + (646020 - 512450) * 0.35;              // 163,645.50
  // California: taxable without = 388,200; with = 666,420 (both in the 9.3% bracket)
  const ca5 = 22911 * 0.01 + (54314 - 22911) * 0.02 + (85723 - 54314) * 0.04 + (118997 - 85723) * 0.06 + (150393 - 118997) * 0.08;
  const c0 = ca5 + (388200 - 150393) * 0.093, c1 = ca5 + (666420 - 150393) * 0.093;
  const gap = (f1 - f0 - whFed) + (c1 - c0 - whCA);                   // 28,969.10 + (-2,587.45) = 26,381.65

  // Tranche: each 500-share vest nets 500 x (1 - 0.22 - 0.1023) = 339 shares.
  // 2025 vests: 4 x 339 = 1,356 shares, basis $40, all held over one year -> LTCG.
  // 2026 vests: 4 x 339 = 1,356 shares, basis $139.11 -> no gain.
  const ltcg = 1356 * (P - 40);                                       // 134,393.16
  const gross = 2712 * P;                                             // 377,266.32
  const fedLt = 0.20 * ltcg;                                          // ordinary income already above $613,700
  const niit = 0.038 * ltcg;                                          // AGI is far above $250,000
  const caLt = (768219 - 666420) * 0.093 + (666420 + ltcg - 768219) * 0.103; // crosses into the 10.3% bracket
  const net = gross - fedLt - niit - caLt;                            // 332,456.24

  const R = E.compute({ ...base, price: P, status: "mfj", w2: 400000, eventDate: "2026-12-08",
    grants: [{ type: "RSU", shares: 6000, strike: 0, fmv: 40, grantDate: "2024-11-15", vestStart: "2024-11-15", vestEnd: "2027-11-15" }],
    tranches: [{ months: 0, pct: 100 }] });
  const g = R.rsuRows[0], t = R.tranches[0];
  check("2026 RSU income", inc, g.inc);
  check("Federal withheld at 22%", whFed, g.whFed);
  check("Federal tax owed on RSU income", f1 - f0, g.owedFed);
  check("California withheld at 10.23%", whCA, g.whSt);
  check("California tax owed on RSU income", c1 - c0, g.owedSt);
  check("RSU withholding gap", gap, g.gap);
  check("Tranche shares sold", 2712, t.shares, 0);
  check("Tranche gross proceeds", gross, t.gross);
  check("Tranche federal tax (20% LTCG + 3.8% NIIT)", fedLt + niit, t.fedTax);
  check("Tranche California tax", caLt, t.stTax);
  check("Tranche net cash", net, t.net);
  check("AMT in sale year", 0, R.yearTax[2026].fed.amt + R.yearTax[2026].st.amt);
  print("Example B: RSU withholding gap and sale tranche (MFJ, CA, $400,000 W-2, price $139.11)");
}

/* ---------------------------------------------------------------
   Import check: a small vesting-summary export, made up for this test
   --------------------------------------------------------------- */
{
  const hdr = ["Grant Name", "Employee Grant Number", "Grant Date", "Equity Award Type", "Tax Qualification", "Vest Date", "FMV at Vest", "Granted", "Vested", "Exercised/Released", "Outstanding", "Cancelled Or Expired", "Expiry Date"];
  const rows = [[], hdr,
    ["1/15/2024-$10.00-ISO-4yr", "1", 45306, "Option", "US ISO", 45672, null, 1000, 1000, 400, 600, 0, 48959],   // vests 2025-01-15, 400 already exercised
    ["1/15/2024-$10.00-ISO-4yr", "1", 45306, "Option", "US ISO", "1/15/2027", null, 1000, 0, 0, 1000, 0, 48959],
    ["1/15/2024-$10.00-RSU-2yr", "2", 45306, "RSU", "Non-Qualified", "2025-06-15", 30, 500, 500, 500, 0, 0, null],
    ["1/15/2024-$10.00-RSU-2yr", "2", 45306, "RSU", "Non-Qualified", "2027-06-15", null, 500, 0, 0, 500, 0, null],
    ["3/1/2025-$20.00-NQ-4yr", "3", "3/1/2025", "Option", "Non-Qualified", "3/1/2026", null, 300, 0, 0, 0, 300, null]]; // cancelled
  const r = E.importRows(rows), iso = r.grants.find(g => g.type === "ISO"), rsu = r.grants.find(g => g.type === "RSU");
  check("Grants imported (cancelled grant skipped)", 2, r.grants.length, 0);
  check("ISO shares = outstanding only", 1600, iso.shares, 0);
  check("ISO strike read from grant name", 10, iso.strike, 0);
  check("ISO vested and unexercised on 2026-11-17", 600, E.vestedShares(iso, "2026-11-17"), 0);
  check("Excel serial 45306 reads as 2024-01-15", 1, iso.grantDate === "2024-01-15" ? 1 : 0, 0);
  check("RSU shares = released + outstanding", 1000, rsu.shares, 0);
  const R = E.compute({ ...base, price: 50, status: "single", w2: 200000, eventDate: "2026-12-01", grants: r.grants, tranches: [{ months: 0, pct: 100 }] });
  // 500 RSUs vested 2025 at $30 FMV: net 500 x (1 - 0.22 - 0.1023) = 339 shares, sold at $50 -> LTCG 339 x 20
  check("Sale uses vest-date FMV as basis (LTCG)", 339 * 20, R.yearTax[2026].L.lt, 0.01);
  print("Import: synthetic vesting export");
}

console.log(fail ? `\n${fail} MISMATCH(ES)` : "\nAll checks match to within $1.");
process.exit(fail ? 1 : 0);
