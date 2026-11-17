"""2D overlays: hook, captions and the end card.

Kept in 2D (Pillow) so brand colours are exact, the logo is never resampled
out of proportion, and every text block can be measured against the safe area.
"""
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

import config as C

SERIF = os.path.join(C.FONTS, "LibreCaslonText-Regular.ttf")
SANS = os.path.join(C.FONTS, "Inter-Regular.otf")
SANS_M = os.path.join(C.FONTS, "Inter-Medium.otf")
SANS_SB = os.path.join(C.FONTS, "Inter-SemiBold.otf")


def F(path, px):
    return ImageFont.truetype(path, int(round(px)))


def safe_rect(aspect):
    w, h = C.ASPECTS[aspect]
    l, t, r, b = C.SAFE[aspect]
    return (int(w * l), int(h * t), int(w * (1 - r)), int(h * (1 - b)))


def wrap(draw, text, font, maxw):
    lines = []
    for para in text.split("\n"):
        cur = ""
        for word in para.split(" "):
            trial = (cur + " " + word).strip()
            if draw.textlength(trial, font=font) <= maxw or not cur:
                cur = trial
            else:
                lines.append(cur)
                cur = word
        lines.append(cur)
    return lines


def balance(draw, text, font, maxw):
    """Wrap, then narrow the measure until the line count would grow: even line lengths."""
    lines = wrap(draw, text, font, maxw)
    w = maxw
    while w > maxw * 0.45:
        trial = wrap(draw, text, font, w - 20)
        if len(trial) > len(lines):
            break
        lines, w = trial, w - 20
    return lines


def _scrim(size, top, strength=150):
    """Vertical navy-black gradient so cream type holds over any frame."""
    w, h = size
    g = Image.new("L", (1, h), 0)
    px = g.load()
    span = int(h * 0.42)
    for y in range(h):
        d = (span - y) if top else (y - (h - span))
        if d > 0:
            px[0, y] = int(strength * (d / span) ** 1.6)
    g = g.resize((w, h))
    out = Image.new("RGBA", size, (6, 12, 24, 0))
    out.putalpha(g)
    return out


def _text_block(size, lines, font, colors, y, leading, x_center, shadow=True):
    """Draw centred lines; colors may be one colour or a list of (text, colour) runs per line."""
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i, ln in enumerate(lines):
        runs = ln if isinstance(ln, list) else [(ln, colors)]
        total = sum(d.textlength(t, font=font) for t, _ in runs)
        x = x_center - total / 2
        for t, col in runs:
            d.text((x, y + i * leading), t, font=font, fill=col)
            x += d.textlength(t, font=font)
    if shadow:
        sh = Image.new("RGBA", size, (0, 0, 0, 0))
        a = layer.getchannel("A").filter(ImageFilter.GaussianBlur(size[0] / 180))
        sh.putalpha(a.point(lambda v: int(v * 0.75)))
        layer = Image.alpha_composite(sh, layer)
    return layer


HOOK_PX = {"4x5": 80, "9x16": 82, "16x9": 84}
CAP_PX = {"4x5": 56, "9x16": 58, "16x9": 60}


def hook(aspect, company=None):
    size = C.ASPECTS[aspect]
    l, t, r, b = safe_rect(aspect)
    font = F(SERIF, HOOK_PX[aspect])
    d = ImageDraw.Draw(Image.new("RGBA", size))
    text = C.hook_text(company)
    lines = balance(d, text, font, (r - l) * (0.96 if aspect != "16x9" else 0.80))
    # set the last two words ("tax gap.") in gold
    out_lines = []
    for i, ln in enumerate(lines):
        if i == len(lines) - 1 and ln.endswith("tax gap."):
            out_lines.append([(ln[:-len("tax gap.")], C.CREAM), ("tax gap.", C.GOLD)])
        else:
            out_lines.append(ln)
    leading = int(HOOK_PX[aspect] * 1.24)
    y = t + int(size[1] * (0.035 if aspect != "16x9" else 0.0))
    img = _scrim(size, top=True, strength=170)
    img = Image.alpha_composite(img, _text_block(size, out_lines, font, C.CREAM, y, leading, (l + r) / 2))
    return img


def caption(aspect, text):
    size = C.ASPECTS[aspect]
    l, t, r, b = safe_rect(aspect)
    font = F(SERIF, CAP_PX[aspect])
    d = ImageDraw.Draw(Image.new("RGBA", size))
    lines = balance(d, text, font, (r - l) * 0.94) if aspect != "16x9" else wrap(d, text, font, (r - l) * 0.94)
    leading = int(CAP_PX[aspect] * 1.28)
    y = b - leading * len(lines) - int(CAP_PX[aspect] * 0.15)
    img = _scrim(size, top=False, strength=175)
    img = Image.alpha_composite(img, _text_block(size, lines, font, C.CREAM, y, leading, (l + r) / 2))
    return img


def text_bbox(layer):
    """Bounding box of fully drawn type (ignores the faint scrim and soft shadow)."""
    return layer.getchannel("A").point(lambda v: 255 if v > 230 else 0).getbbox()


def endcard(aspect, paper=None, show_media=None):
    """Full end-card frame (RGB). paper = optional rendered linen frame for texture."""
    show_media = C.SHOW_MEDIA_LINE if show_media is None else show_media
    W, H = C.ASPECTS[aspect]
    l, t, r, b = safe_rect(aspect)
    img = Image.new("RGB", (W, H), C.CREAM)
    if paper is not None:                       # keep brand cream, borrow the linen's light and weave
        g = paper.convert("L").resize((W, H), Image.LANCZOS)
        mean = sum(g.resize((16, 16)).getdata()) / 256
        shade = g.point(lambda v: max(200, min(255, int(255 + (v - mean) * 1.6 - 4))))
        from PIL import ImageChops
        img = ImageChops.multiply(img, Image.merge("RGB", [shade] * 3))
    d = ImageDraw.Draw(img)
    cx = (l + r) // 2
    colw = min(r - l, 1560)
    u = W / 1080 if aspect != "16x9" else 1.3     # type scale unit (16:9 plays small in a phone feed)

    # measure the stack first, then centre it between the top of the safe area and the disclosure
    dpx = 26 * u if aspect != "16x9" else 44      # 16:9 plays small in a phone feed
    disc_font = F(SANS, dpx)
    disc_lines = wrap(d, C.END["disclosure"], disc_font, colw)
    disc_lead = int(dpx * 1.42)
    disc_h = disc_lead * len(disc_lines)
    disc_y = b - disc_h

    logo = Image.open(C.LOGO).convert("RGBA")
    lw = int(min(colw * 0.74, 700 * u))
    lh = round(lw * logo.height / logo.width)     # aspect ratio preserved
    logo_r = logo.resize((lw, lh), Image.LANCZOS)

    serv_font = F(SERIF, 62 * u)
    name_px = 29 * u
    name_font = F(SANS_M, name_px)
    name_lines = [C.END["name"]]
    if d.textlength(C.END["name"], font=name_font) > colw:
        a, bb = C.END["name"].split(" | ")
        name_lines = [a + " |", bb]
    tag_font = F(SANS_SB, 25 * u)
    media_font = F(SANS, 23 * u)

    gap = int(34 * u)
    stack = [("logo", lh), ("gap", int(54 * u)), ("serv", int(62 * u * 1.2)), ("gap", int(30 * u)),
             ("rule", 2), ("gap", int(30 * u)),
             ("name", int(name_px * 1.45) * len(name_lines)), ("gap", int(16 * u)), ("tag", int(25 * u * 1.4))]
    if show_media:
        stack += [("gap", gap), ("media", int(23 * u * 1.4))]
    total = sum(h for _, h in stack)
    y = t + max(0, (disc_y - int(60 * u) - t - total) // 2)
    boxes = {}
    for kind, h in stack:
        if kind == "logo":
            img.paste(logo_r, (cx - lw // 2, y), logo_r)
            boxes["logo"] = (cx - lw // 2, y, cx + lw // 2, y + lh)
        elif kind == "serv":
            d.text((cx, y), C.END["service"], font=serv_font, fill=C.NAVY, anchor="ma")
        elif kind == "rule":
            d.rectangle((cx - int(60 * u), y, cx + int(60 * u), y + 2), fill=C.GOLD)
        elif kind == "name":
            for i, ln in enumerate(name_lines):
                d.text((cx, y + i * int(name_px * 1.45)), ln, font=name_font, fill=C.NAVY, anchor="ma")
        elif kind == "tag":
            d.text((cx, y), C.END["tagline"], font=tag_font, fill=C.BLUE, anchor="ma")
        elif kind == "media":
            d.text((cx, y), C.MEDIA_LINE, font=media_font, fill=C.NAVY, anchor="ma")
        y += h
    # disclosure, bottom of the safe area
    d.rectangle((cx - colw // 2, disc_y - int(26 * u), cx + colw // 2, disc_y - int(26 * u) + 1), fill=(*C.NAVY,))
    for i, ln in enumerate(disc_lines):
        d.text((cx - colw // 2, disc_y + i * disc_lead), ln, font=disc_font, fill=(40, 58, 88))
    endcard.last = {"logo_box": boxes["logo"], "logo_src": logo.size, "disc_px": int(dpx),
                    "content_box": (cx - colw // 2, min(boxes["logo"][1], t), cx + colw // 2, disc_y + disc_h)}
    return img
