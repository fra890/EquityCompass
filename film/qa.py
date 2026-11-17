"""Pre-delivery checks on everything that is drawn as text: math, banned words, safe area, logo ratio."""
import re, sys
from PIL import Image
import config as C, overlay as O

fails = []
def check(ok, msg):
    print(("PASS  " if ok else "FAIL  ") + msg)
    if not ok:
        fails.append(msg)

# 1. math
check(C.VEST * 22 // 100 == 22000 == C.WITHHELD, "$100,000 x 22% = $22,000")
check(C.VEST * 37 // 100 == 37000 == C.TAX_AT_BRACKET, "$100,000 x 37% = $37,000")
check(C.TAX_AT_BRACKET - C.WITHHELD == 15000 == C.GAP, "gap = $37,000 - $22,000 = $15,000")
check("$100,000" in C.LABELS["vest"] and "(example)" in C.LABELS["vest"], "vest label carries the figure and '(example)'")
check("$22,000" in C.LABELS["withheld"] and "$15,000" in C.LABELS["owed"] and "37%" in C.LABELS["owed"], "slice labels match the math")

# 2. every on-screen string: banned words
strings = [C.hook_text(c) for c in ("SpaceX", "Anduril", "Tesla")] + [c[2] for c in C.CAPTIONS]
strings += [v for k, v in C.LABELS.items() if isinstance(v, str)] + C.LABELS["steps"] + list(C.END.values()) + [C.MEDIA_LINE]
for w in C.BANNED:
    hits = [s for s in strings if re.search(r"\b" + w + r"\b", s, re.I)]
    check(not hits, "banned word '{}' absent from on-screen text".format(w))
check(not C.SHOW_MEDIA_LINE, "media line toggle is OFF")

# 3. safe area + logo, per aspect
for asp in C.ASPECTS:
    l, t, r, b = O.safe_rect(asp)
    layers = {"hook/" + c: O.hook(asp, c) for c in ("SpaceX", "Anduril", "Tesla")}
    layers.update({"caption {}".format(i + 1): O.caption(asp, c[2]) for i, c in enumerate(C.CAPTIONS)})
    for name, layer in layers.items():
        x0, y0, x1, y1 = O.text_bbox(layer)
        check(x0 >= l and y0 >= t and x1 <= r and y1 <= b, "{} {} inside safe area".format(asp, name))
    for media in (False, True):
        O.endcard(asp, show_media=media)
        m = O.endcard.last
        x0, y0, x1, y1 = m["content_box"]
        check(x0 >= l and y0 >= t and x1 <= r and y1 <= b, "{} end card (media line {}) inside safe area".format(asp, "on" if media else "off"))
        lb = m["logo_box"]
        ratio = (lb[2] - lb[0]) / (lb[3] - lb[1]); src = m["logo_src"][0] / m["logo_src"][1]
        check(abs(ratio / src - 1) < 0.01, "{} logo aspect {:.3f} vs source {:.3f}".format(asp, ratio, src))
    phone_pt = m["disc_px"] * 375 / C.ASPECTS[asp][0]
    check(phone_pt >= 8.0, "{} disclosure {}px = {:.1f}pt on a 375pt-wide phone feed".format(asp, m["disc_px"], phone_pt))
print("\n{} failure(s)".format(len(fails)))
sys.exit(1 if fails else 0)
