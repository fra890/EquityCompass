"""Storyboard: one low-res still per beat in each aspect, plus in-between frames for 4:5."""
import os, sys, json, time
from PIL import Image
import config as C, overlay as O, scene

OUT = os.path.join(C.OUT, "storyboard")
os.makedirs(OUT, exist_ok=True)
HERO = {1: 1.5, 2: 8.0, 3: 8.6, 4: 8.9, 5: 4.0}          # local seconds inside each beat
EXTRA = {2: [0.8, 3.0], 3: [0.6, 4.6], 4: [0.4, 5.2]}
SCALE = {"4x5": 0.6, "16x9": 0.4, "9x16": 0.4}


def caption_at(T):
    for a, b, txt in C.CAPTIONS:
        if a <= T < b:
            return txt
    return None


def frame(beat, t, aspect, tag, samples):
    raw = os.path.join(OUT, "raw_b{}_{}_{}.png".format(beat, aspect, tag))
    if not os.path.exists(raw) or "--force" in sys.argv:
        scene.render_frame(beat, t, aspect, raw, scale=SCALE[aspect], samples=samples)
    size = C.ASPECTS[aspect]
    img = Image.open(raw).convert("RGB").resize(size, Image.LANCZOS)
    T = C.BEATS[beat][0] + t
    if beat == 5:
        img = O.endcard(aspect, paper=img)
    else:
        if beat == 1:
            img = Image.alpha_composite(img.convert("RGBA"), O.hook(aspect)).convert("RGB")
        cap = caption_at(T)
        if cap:
            img = Image.alpha_composite(img.convert("RGBA"), O.caption(aspect, cap)).convert("RGB")
    out = os.path.join(OUT, "b{}_{}_{}.jpg".format(beat, aspect, tag))
    img.save(out, quality=88)
    return out


if __name__ == "__main__":
    t0 = time.time()
    only = [int(a) for a in sys.argv[1:] if a.isdigit()] or [1, 2, 3, 4, 5]
    for beat in only:
        for aspect in ("4x5", "16x9", "9x16"):
            frame(beat, HERO[beat], aspect, "hero", 96 if aspect == "4x5" else 64)
            if aspect == "4x5":
                for i, t in enumerate(EXTRA.get(beat, [])):
                    frame(beat, t, aspect, "x{}".format(i), 64)
            print("done beat", beat, aspect, round(time.time() - t0), "s", flush=True)
