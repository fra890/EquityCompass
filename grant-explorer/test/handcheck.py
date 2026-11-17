"""Independent hand-check of Grant Explorer numbers. Usage: python3 handcheck.py <Vesting Summary.xlsx> [out.json]
Prints a grant summary, reconciles every grant, and computes 3 reference numbers the page must match."""
import sys, json, re, collections, openpyxl
wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
rows = [r for r in wb["Vesting Details"].iter_rows(values_only=True) if r[0] and r[0] != "Grant Name"]
price = [r for r in wb["Quote History"].iter_rows(values_only=True) if isinstance(r[2], (int, float))][-1][2]
n = lambda v: v or 0
G = collections.OrderedDict()
for r in rows:
    name, num, gd, typ, tq, vd, fmv, gr, ve, ex, out, ca, exp = r[:13]
    split = str(num).lower().endswith("split")
    kind = "RSU" if typ == "RSU" else ("ISO" if "ISO" in tq and not split else "NQ")
    dead = n(ca) > 0 and n(ve) == 0 and n(out) == 0
    g = G.setdefault(str(num), dict(name=name, kind=kind, strike=float(re.search(r"\$([\d.]+)", name).group(1)), granted=0, vested=0, exer=0, unv=0, canc=0, rows=[]))
    g["granted"] += n(gr); g["vested"] += n(ve); g["exer"] += n(ex)
    g["canc"] += n(gr) if dead else 0; g["unv"] += 0 if dead else n(gr) - n(ve)
    g["rows"].append(dict(vd=vd, gr=n(gr), ve=n(ve), ex=n(ex), dead=dead))
print(f"{'#':>5} {'type':4} {'strike':>8} {'granted':>8} {'vested':>7} {'exer':>6} {'unvest':>7} {'canc':>6}  ok  grant")
for num, g in G.items():
    ok = g["granted"] == g["vested"] + g["unv"] + g["canc"]
    assert ok, num
    print(f"..{num.replace('Split','')[-3:]}{'S' if 'Split' in num else ' '} {g['kind']:4} {g['strike']:8.3f} {g['granted']:8} {g['vested']:7} {g['exer']:6} {g['unv']:7} {g['canc']:6}  {'OK' if ok else 'XX'}  {g['name']}")
T = {k: sum(g[k] for g in G.values()) for k in ("granted", "vested", "unv", "canc")}
assert T["granted"] == T["vested"] + T["unv"] + T["canc"]
print("TOTAL", T, "| latest price", price)

# 1) unvested RSU value at current price
unv_rsu = sum(g["unv"] for g in G.values() if g["kind"] == "RSU")
check1 = unv_rsu * price
# 2) 2027 RSU income (drift 0%)
sh27 = sum(r["gr"] - r["ve"] for g in G.values() if g["kind"] == "RSU" for r in g["rows"] if not r["dead"] and r["vd"].year == 2027)
check2 = sh27 * price
# 3) max ISO shares in 2027 with $0 AMT — MFJ, $250K W-2, 2026 figures (Rev. Proc. 2025-32)
STD, EX, PH, B28 = 32200, 140200, 1_000_000, 244500
BR = [(24800, .10), (100800, .12), (211400, .22), (403550, .24), (512450, .32), (768700, .35), (float("inf"), .37)]
def reg(ti):
    t, lo = 0, 0
    for hi, rt in BR:
        if ti <= lo: break
        t += (min(ti, hi) - lo) * rt; lo = hi
    return t
ord_inc = 250000 + check2
regular = reg(ord_inc - STD)
lots = sorted(((r["vd"], i, r["gr"] - r["ex"], g["strike"]) for i, (num, g) in enumerate(G.items()) if g["kind"] == "ISO"
               for r in g["rows"] if not r["dead"] and r["vd"].year <= 2027 and g["strike"] < price))
per_share = [price - k for (_, _, q, k) in lots for _ in range(q)]
best, spread = 0, 0.0
for i, s in enumerate(per_share, 1):
    spread += s
    amti = ord_inc + spread
    base = max(0, amti - max(0, EX - .5 * max(0, amti - PH)))
    tmt = .26 * base if base <= B28 else .26 * B28 + .28 * (base - B28)
    if tmt - regular < 0.5: best = i
    else: break
res = dict(price=price, unvested_rsu_shares=unv_rsu, unvested_rsu_value=check1, rsu_shares_2027=sh27, rsu_income_2027=check2,
           iso_available_2027=len(per_share), zero_amt_shares_2027=best, regular_tax_2027=regular, grants=len(G), totals=T)
print(json.dumps(res, indent=1))
if len(sys.argv) > 2: json.dump(res, open(sys.argv[2], "w"))
