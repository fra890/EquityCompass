"""Builds the one-page storyboard sheet (self-contained HTML, images embedded)."""
import base64, io, os, html
from PIL import Image
import config as C, storyboard as SB

D = SB.OUT
def img(name, w):
    im = Image.open(os.path.join(D, name + ".jpg"))
    im = im.resize((w, round(w * im.height / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, "JPEG", quality=80)
    return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()

def safe(asp):
    l, t, r, b = C.SAFE[asp]
    return "inset:{}% {}% {}% {}%".format(t * 100, r * 100, b * 100, l * 100)

def fig(name, asp, w, cap, cls=""):
    return ('<figure class="fr {cls}"><div class="frame"><img src="{src}" alt="{alt}" loading="lazy">'
            '<i class="safe" style="{s}"></i></div><figcaption>{cap}</figcaption></figure>').format(
        cls=cls, src=img(name, w), alt=html.escape(cap), s=safe(asp), cap=html.escape(cap))

L = C.LABELS
BEATS = [
 dict(n=1, title="Hook", shot="Macro product shot. One frosted glass block on a linen blueprint sheet, walnut desk, window light across the wall.",
      cam="85 mm, slow dolly-in of about 20 cm over 3 s. Shallow focus on the front edge of the block.",
      text=[("Hook, on screen from frame 1", C.hook_text())],
      labels=[], light="Golden hour. Low warm sun through window mullions.",
      note="The company name is one variable (COMPANY in config.py). Changing it re-renders this beat only.", extra=[]),
 dict(n=2, title="The withholding gap, to scale", shot="Same set. The block is cut in exact proportion: 63 / 15 / 22. The 22% slice slides 26 cm to the right; the 15% slice lights red from inside.",
      cam="85 mm, slow lateral drift right to left. Labels sit on one plane in front of the glass, so they stay sharp.",
      text=[("Caption, 3.6 to 12.0 s", C.CAPTIONS[0][2])],
      labels=[("+0.2 s", L["vest"]), ("+3.0 s", L["withheld"]), ("+5.0 s", L["owed"].replace("\n", " "))],
      light="Golden hour, sun slightly lower.",
      note="Slice widths are computed from the rates in config.py, so the picture cannot disagree with the numbers.",
      extra=[("b2_4x5_x0", "3.8 s: block labeled"), ("b2_4x5_x1", "6.0 s: 22% slice has moved off")]),
 dict(n=3, title="Every item has a date", shot="Brass calendar rail with engraved ticks. Two lockup gates rise; their glass panes lift when the release date passes. Two ISO lots, each with two dial timers. The grant clock is already running; the exercise clock starts only when the lot is exercised. An unnumbered AMT gauge rises with each exercise.",
      cam="Starts as a macro on the bare rail, then pulls back 5 m over 4.5 s to the full rail. Slow drift after.",
      text=[("Caption, 12.6 to 22.0 s", C.CAPTIONS[1][2])],
      labels=[("x2", L["gate"] + " / " + L["gate_sub"]), ("", L["lot"]), ("", L["timer_ex"]), ("", L["timer_gr"]), ("", L["amt"])],
      light="Sun nearly gone, sky cooling.",
      note="No dates, prices or amounts appear in this beat. The gauge has tick marks but no scale.",
      extra=[("b3_4x5_x0", "12.6 s: macro on the rail"), ("b3_4x5_x1", "16.6 s: pulled back, before any exercise")]),
 dict(n=4, title="Deciding before the date", shot="Five brass marks start out of order on the rail and slide into sequence inside a glass channel. Water (IOR 1.33, real refraction) rises past each engraved mark; each label turns gold as the tide line passes it. Behind, one tall glass tower lowers while six more rise into an even, lit skyline.",
      cam="85 mm from slightly above, slow arc left to right. Skyline is seen above the water and refracted through it.",
      text=[("Caption, 22.6 to 32.0 s", C.CAPTIONS[2][2])],
      labels=[("", "  →  ".join("{} {}".format(i + 1, s) for i, s in enumerate(L["steps"])))],
      light="Blue hour. Towers lit warm from inside.",
      note="The skyline is a picture of spreading one holding across several. It carries no number and no claim about results.",
      extra=[("b4_4x5_x0", "22.4 s: marks out of order, one tower"), ("b4_4x5_x1", "27.2 s: tide at mark 3")]),
 dict(n=5, title="End card", shot="Cream linen paper. Logo, service line, name, tagline, disclosure. Logo and type are composited in 2D so the brand colours are exact and the logo keeps its ratio.",
      cam="Static, with a 5% push-in on the paper texture.",
      text=[("Service", C.END["service"]), ("Name", C.END["name"]), ("Tagline", C.END["tagline"]),
            ("Media line (OFF)", C.MEDIA_LINE + "  — hidden until compliance approves; SHOW_MEDIA_LINE in config.py"),
            ("Disclosure", C.END["disclosure"])],
      labels=[], light="Soft neutral daylight.", note="Held for 8 s so the disclosure can be read in full.", extra=[]),
]

rows = []
for b in BEATS:
    a, z = C.BEATS[b["n"]]
    txt = "".join('<div class="os"><span class="k">{}</span><span class="v">{}</span></div>'.format(html.escape(k), html.escape(v)) for k, v in b["text"])
    lab = ""
    if b["labels"]:
        lab = '<h4>Labels in the scene</h4><ul class="lab">' + "".join(
            "<li>{}{}</li>".format('<span class="tm">{}</span> '.format(html.escape(t)) if t else "", html.escape(v)) for t, v in b["labels"]) + "</ul>"
    ex = "".join(fig(n, "4x5", 300, c, "sm") for n, c in b["extra"])
    alts = fig("b{}_16x9_hero".format(b["n"]), "16x9", 560, "16:9") + fig("b{}_9x16_hero".format(b["n"]), "9x16", 300, "9:16", "tall")
    rows.append('''
<section class="beat">
  <header><span class="tc">{a:04.1f} – {z:04.1f} s</span><h2>Beat {n}. {title}</h2></header>
  <div class="grid">
    {hero}
    <div class="spec">
      <h4>Shot</h4><p>{shot}</p>
      <h4>Camera</h4><p>{cam}</p>
      <h4>Light</h4><p>{light}</p>
      <h4>On-screen text</h4>{txt}
      {lab}
      <p class="note">{note}</p>
    </div>
  </div>
  <div class="strip">{ex}{alts}</div>
</section>'''.format(a=a, z=z, n=b["n"], title=b["title"], hero=fig("b{}_4x5_hero".format(b["n"]), "4x5", 620, "4:5 main cut, {:.1f} s".format(a + SB.HERO[b["n"]]), "hero"),
        shot=html.escape(b["shot"]), cam=html.escape(b["cam"]), light=html.escape(b["light"]), txt=txt, lab=lab, note=html.escape(b["note"]), ex=ex, alts=alts))

qa = open(os.path.join(D, "qa.txt")).read().strip().splitlines()
npass = sum(1 for l in qa if l.startswith("PASS")); nfail = sum(1 for l in qa if l.startswith("FAIL"))

page = open(os.path.join(C.HERE, "sheet_template.html")).read()
page = page.replace("{{BEATS}}", "".join(rows)).replace("{{NPASS}}", str(npass)).replace("{{NFAIL}}", str(nfail))
open(os.path.join(D, "storyboard.html"), "w").write(page)
print("sheet", round(len(page) / 1e6, 2), "MB")
