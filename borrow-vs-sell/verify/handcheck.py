#!/usr/bin/env python3
"""Independent hand-check of the Borrow vs. Sell engine.

Recomputes three cases from first principles (closed forms where they exist)
and writes expected.json, which smoke.cjs asserts against the live page.

Run:  python3 handcheck.py            (prints the cases, writes expected.json)
"""
import json, math, os

INF = float("inf")
ORD = {
    "single": [(12400, .10), (50400, .12), (105700, .22), (201775, .24), (256225, .32), (640600, .35), (INF, .37)],
    "mfj": [(24800, .10), (100800, .12), (211400, .22), (403550, .24), (512450, .32), (768700, .35), (INF, .37)],
}
LTCG = {"single": (49450, 545500), "mfj": (98900, 613700)}
NIIT_THR = {"single": 200000, "mfj": 250000}
CA = {"mfj": [(22158, .01), (52528, .02), (82904, .04), (115084, .06), (145448, .08), (742958, .093),
              (891542, .103), (1485906, .113), (INF, .123)]}
LOSS_LIMIT = 3000
ACQ_FED, ACQ_CA = 750000, 1000000


def brackets(x, table):
    tax, lo = 0.0, 0.0
    for hi, rate in table:
        if x <= lo:
            break
        tax += (min(x, hi) - lo) * rate
        lo = hi
    return tax


def tax_year(c, st=0.0, lt=0.0, inv_int=0.0, mort_fed=0.0, mort_ca=0.0, carry=(0.0, 0.0)):
    """Total federal + NIIT + California tax for one year. Returns (total, parts, loss_deducted, carry_out)."""
    fs = c["filing"]
    st -= carry[0]
    lt -= carry[1]
    # net short against long
    if st < 0 < lt:
        x = min(-st, lt); st += x; lt -= x
    if lt < 0 < st:
        x = min(-lt, st); lt += x; st -= x
    ded, out = 0.0, (0.0, 0.0)
    if st < 0 or lt < 0:
        use_s = min(max(0, -st), LOSS_LIMIT)
        use_l = min(max(0, -lt), LOSS_LIMIT - use_s)
        ded = use_s + use_l
        out = (max(0, -st) - use_s, max(0, -lt) - use_l)
        st = lt = 0.0
    ordinary = max(0, c["income"] - inv_int - mort_fed - ded) + st
    fed = brackets(ordinary, ORD[fs])
    z0, z15 = LTCG[fs]
    top = ordinary + lt
    fed += 0.15 * max(0, min(top, z15) - max(ordinary, z0)) + 0.20 * max(0, top - max(ordinary, z15))
    magi = c["income"] + st + lt - ded
    nii = max(0, c["inv_income"] + st + lt - ded - inv_int)
    niit = 0.038 * min(nii, max(0, magi - NIIT_THR[fs]))
    ca_base = max(0, c["income"] - inv_int - mort_ca - ded + st + lt)
    ca = brackets(ca_base, CA[fs]) + 0.01 * max(0, ca_base - 1e6)
    return fed + niit + ca, (fed, niit, ca), ded, out


def bisect(f, lo, hi, n=200):
    flo = f(lo)
    for _ in range(n):
        mid = (lo + hi) / 2
        if (f(mid) > 0) == (flo > 0):
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def ncdf(z):
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))


def run(c):
    C, N, P, G = c["cash"], c["years"], c["portfolio"], c["other_gains"]
    r = c["ret"]
    base = tax_year(c, lt=G)[0]
    res = {}

    # ---------- sell ----------
    g = (P - c["basis"]) / P
    def net(S):
        gain = S * g
        return S - (tax_year(c, st=(1 - c["lt_share"]) * gain, lt=G + c["lt_share"] * gain)[0] - base) - C
    S = bisect(net, 0, 4 * max(P, C))
    tax_today = S - C
    res["sell"] = {"S": S, "tax": tax_today, "lostGrowth": tax_today * ((1 + r) ** N - 1),
                   "total": tax_today * (1 + r) ** N, "annual": tax_today * (1 + r) ** N / N}

    # ---------- box spread ----------
    rb = c["r_box"]
    carry, save_b, rows = (0.0, 0.0), [], []
    for k in range(1, N + 1):
        loss = C * (1 + rb) ** (k - 1) * rb
        t, _, ded, carry = tax_year(c, st=-0.4 * loss, lt=G - 0.6 * loss, carry=carry)
        save_b.append(base - t)
        rows.append({"loss": loss, "ordDed": ded, "carry": sum(carry), "saving": base - t})
    face = C * (1 + rb) ** N
    interest = face - C
    res["box"] = {"interest": interest, "savings": sum(save_b), "total": interest - sum(save_b),
                  "annual": (interest - sum(save_b)) / N, "afterRate": rb * (interest - sum(save_b)) / interest,
                  "face": face, "carryEnd": sum(carry), "rows": rows}

    # ---------- PAL ----------
    rp = c["r_pal"]
    deductible = c["purpose"] == "investment" and c["itemize"]
    cf, save_p = 0.0, []
    for k in range(N):
        d = 0.0
        if deductible:
            d = min(C * rp + cf, c["inv_income"]); cf = C * rp + cf - d
        save_p.append(base - tax_year(c, lt=G, inv_int=d)[0])
    res["pal"] = {"interest": C * rp * N, "savings": sum(save_p), "total": C * rp * N - sum(save_p),
                  "annual": (C * rp * N - sum(save_p)) / N, "oop": C * rp * N}

    # ---------- mortgage (30-yr amortizing, closed-form balances) ----------
    i = c["r_mort"] / 12
    pmt = C * i / (1 - (1 + i) ** -360)
    bal = lambda months: C * (1 + i) ** months - pmt * ((1 + i) ** months - 1) / i
    closing = C * c["cc_mort"]
    ded_ok = c["purpose"] == "home" and c["itemize"]
    f_fed = min(1, ACQ_FED / C) if ded_ok else 0
    f_ca = min(1, ACQ_CA / C) if ded_ok else 0
    save_m, int_m, bals = [], [], []
    for k in range(1, N + 1):
        yi = 12 * pmt - (bal(12 * (k - 1)) - bal(12 * k))
        int_m.append(yi); bals.append(bal(12 * k))
        save_m.append(base - tax_year(c, lt=G, mort_fed=yi * f_fed, mort_ca=yi * f_ca)[0])
    res["mort"] = {"closing": closing, "interest": sum(int_m), "savings": sum(save_m),
                   "total": closing + sum(int_m) - sum(save_m), "annual": (closing + sum(int_m) - sum(save_m)) / N,
                   "oop": closing + 12 * pmt * N, "balEnd": bals[-1], "payment": pmt}

    # ---------- net worth at year N and break-even return vs selling ----------
    def end_nw(q):
        fv = lambda flows: sum(f * (1 + q) ** (N - k) for k, f in enumerate(flows, 1))
        pv = P * (1 + q) ** N
        return {
            "sell": (P - S) * (1 + q) ** N,
            "box": pv - face + fv(save_b),
            "pal": pv - C - fv([C * rp - s for s in save_p]),
            "mort": pv - bals[-1] - closing * (1 + q) ** N - fv([12 * pmt - s for s in save_m]),
        }
    nw = end_nw(r)
    res["nwEnd"] = nw
    for key in ("box", "pal", "mort"):
        f = lambda q: end_nw(q)[key] - end_nw(q)["sell"]
        res[key]["breakeven"] = bisect(f, -0.5, 0.5) if f(-0.5) * f(0.5) < 0 else None
        res[key]["advantage"] = nw[key] - nw["sell"]

    # ---------- alternative ending: sell stock at year N to repay the box / PAL ----------
    def exit_tax(q, loan, carry_in):
        V = P * (1 + q) ** N
        gN = (V - c["basis"]) / V
        X = bisect(lambda x: x - (tax_year(c, lt=G + x * gN, carry=carry_in)[0] - base) - loan, 0, 4 * max(V, loan))
        return X - loan
    loans = {"box": (face, carry), "pal": (C, (0.0, 0.0)), "mort": (bals[-1], (0.0, 0.0))}
    for key, (loan, cin) in loans.items():
        res[key]["exitTax"] = exit_tax(r, loan, cin)
        f = lambda q: end_nw(q)[key] - exit_tax(q, loan, cin) - end_nw(q)["sell"]
        res[key]["breakevenSellOut"] = bisect(f, -0.5, 0.5) if f(-0.5) * f(0.5) < 0 else None
        res[key]["advantageSellOut"] = nw[key] - res[key]["exitTax"] - nw["sell"]

    # ---------- risk ----------
    def risk(loan, share):
        b = loan / (share * P)
        mu = math.log(1 + r) - c["vol"] ** 2 / 2
        sd = c["vol"] * math.sqrt(N)
        prob = 1.0 if b >= 1 else min(1, ncdf((math.log(b) - mu * N) / sd)
                                      + math.exp(2 * mu * math.log(b) / c["vol"] ** 2) * ncdf((math.log(b) + mu * N) / sd))
        stress = []
        for d in (0.20, 0.35, 0.50):
            v = P * (1 - d)
            cure = max(0, loan - share * v)
            stress.append({"ltv": loan / v, "call": loan > share * v, "sale": min(v, cure / (1 - share)) if cure > 0 else 0})
        return {"ltv": loan / P, "callDrop": 1 - b, "prob": prob, "stress": stress}
    res["risk"] = {"box": risk(face, 1 - c["maint"]), "pal": risk(C, c["pal_advance"])}
    return res


BASE = dict(cash=500000, years=3, purpose="other", portfolio=2000000, basis=400000, lt_share=1.0, ret=0.07, vol=0.16,
            filing="mfj", income=350000, other_gains=40000, inv_income=15000, itemize=True,
            r_box=0.0522, r_pal=0.0728, r_mort=0.0711, cc_mort=0.02, maint=0.30, pal_advance=0.70)
CASES = {
    "case1_500k_3yr": dict(BASE),
    "case2_zero_outside_gains": dict(BASE, other_gains=0),
    "case3_1.5m_home_purchase": dict(BASE, cash=1500000, years=10, purpose="home", portfolio=6000000, basis=1500000),
}

if __name__ == "__main__":
    out = {}
    for name, c in CASES.items():
        out[name] = {"inputs": c, "expected": run(c)}
        e = out[name]["expected"]
        print(f"\n== {name} ==")
        print(f"  sell: stock sold {e['sell']['S']:,.0f}  tax today {e['sell']['tax']:,.0f}  total {e['sell']['total']:,.0f}")
        for k in ("box", "pal", "mort"):
            be = e[k]["breakeven"]
            if True:
                bs = e[k]["breakevenSellOut"]
                print(f"  {k:4}: sold to repay at end: tax {e[k]['exitTax']:,.0f}  break-even {'n/a' if bs is None else f'{bs:.4%}'}  vs selling now {e[k]['advantageSellOut']:,.0f}")
            print(f"  {k:4}: interest {e[k]['interest']:,.0f}  savings {e[k]['savings']:,.0f}  total {e[k]['total']:,.0f}"
                  f"  per yr {e[k]['annual']:,.0f}  break-even {'n/a' if be is None else f'{be:.4%}'}")
        print(f"  box loss rows: " + "; ".join(f"loss {w['loss']:,.0f} ord {w['ordDed']:,.0f} carry {w['carry']:,.0f} save {w['saving']:,.0f}" for w in e["box"]["rows"][:3]))
        print(f"  margin call: box -{e['risk']['box']['callDrop']:.1%}  PAL -{e['risk']['pal']['callDrop']:.1%}")

    # sanity assertions that do not depend on the page
    c1, c2 = out["case1_500k_3yr"]["expected"], out["case2_zero_outside_gains"]["expected"]
    assert abs(c1["box"]["interest"] - 500000 * (1.0522 ** 3 - 1)) < 1e-6
    assert all(w["ordDed"] == 0 and w["carry"] == 0 for w in c1["box"]["rows"]), "gains absorb the whole loss in case 1"
    assert all(abs(w["ordDed"] - 3000) < 1e-9 for w in c2["box"]["rows"]), "only $3,000/yr offsets ordinary income"
    assert abs(c2["box"]["carryEnd"] - (c2["box"]["interest"] - 9000)) < 1e-6, "rest of the loss carries forward"
    assert c2["box"]["savings"] < c1["box"]["savings"]
    assert c1["pal"]["savings"] == 0 and c1["mort"]["savings"] == 0, "no deduction when purpose is 'other'"
    c3 = out["case3_1.5m_home_purchase"]["expected"]
    assert c3["mort"]["savings"] > 0 and c3["pal"]["savings"] == 0

    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "expected.json"), "w") as fh:
        json.dump(out, fh, indent=1)
    print("\nwrote expected.json")
