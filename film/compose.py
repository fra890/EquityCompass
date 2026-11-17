"""Composite 3D plates + label pass + 2D overlays into final frames, and encode per-beat segments.

Segment k runs from 0.2 s after beat k starts to 0.2 s after beat k+1 starts, so each
dissolve lives in one segment and a hook change re-encodes segment 1 only.
"""
import os, subprocess, sys
from PIL import Image
import config as C, overlay as O
from render import frame_path, label_path

FPS = C.FPS
XF = 0.2                                            # half the dissolve length
SRC = {"4x5": "9x16", "9x16": "9x16", "16x9": "16x9"}


def beat_of(T):
    for b, (a, z) in C.BEATS.items():
        if a <= T < z:
            return b
    return 5


_cache = {}


def plate(beat, aspect, i):
    """Full-size 3D frame for local frame index i of a beat, labels composited, cropped to aspect."""
    key = (beat, aspect, i)
    if key in _cache:
        return _cache[key]
    src = SRC[aspect]
    W, H = C.ASPECTS[src]
    if beat == 5:
        im = O.endcard(aspect, paper=Image.open(frame_path(5, src, 0)).convert("RGB").resize((W, H), Image.LANCZOS)
                       .crop(_crop(aspect, src)))
        _cache[key] = im
        return im
    p = frame_path(beat, src, i)
    im = Image.open(p).convert("RGB").resize((W, H), Image.LANCZOS)
    lp = label_path(beat, src, i)
    if os.path.exists(lp):
        im = Image.alpha_composite(im.convert("RGBA"), Image.open(lp).convert("RGBA")).convert("RGB")
    im = im.crop(_crop(aspect, src))
    if len(_cache) > 6:
        for k in [k for k in _cache if k[0] != 5][:3]:
            _cache.pop(k)
    _cache[key] = im
    return im


def _crop(aspect, src):
    W, H = C.ASPECTS[src]
    w, h = C.ASPECTS[aspect]
    return ((W - w) // 2, (H - h) // 2, (W + w) // 2, (H + h) // 2)


def ramp(x, a, b):
    return max(0.0, min(1.0, (x - a) / (b - a)))


_ov = {}


def overlays(aspect, company):
    key = (aspect, company)
    if key not in _ov:
        _ov[key] = (O.hook(aspect, company), [O.caption(aspect, c[2]) for c in C.CAPTIONS])
    return _ov[key]


def with_alpha(layer, a):
    if a >= 0.999:
        return layer
    out = layer.copy()
    out.putalpha(layer.getchannel("A").point(lambda v: int(v * a)))
    return out


def frame(aspect, n, company=None):
    company = company or C.COMPANY
    T = n / FPS
    b = beat_of(T)
    a = C.BEATS[b][0]
    img = plate(b, aspect, round((T - a) * FPS))
    # dissolve across each boundary
    for nb in (2, 3, 4, 5):
        s = C.BEATS[nb][0]
        if s - XF <= T < s + XF:
            pa = plate(nb - 1, aspect, round((T - C.BEATS[nb - 1][0]) * FPS))
            pb = plate(nb, aspect, round((T - s) * FPS))
            img = Image.blend(pa, pb, (T - (s - XF)) / (2 * XF))
    hook, caps = overlays(aspect, company)
    layers = []
    ha = 1.0 - ramp(T, 2.65, 3.0)
    if ha > 0:
        layers.append(with_alpha(hook, ha))
    for (c0, c1, _), cap in zip(C.CAPTIONS, caps):
        ca = min(ramp(T, c0, c0 + 0.4), 1.0 - ramp(T, c1 - 0.3, c1))
        if ca > 0:
            layers.append(with_alpha(cap, ca))
    if layers:
        img = img.convert("RGBA")
        for l in layers:
            img = Image.alpha_composite(img, l)
        img = img.convert("RGB")
    return img


def seg_range(k):
    a = 0.0 if k == 1 else C.BEATS[k][0] + XF
    z = C.DURATION if k == 5 else C.BEATS[k + 1][0] + XF
    return round(a * FPS), round(z * FPS)


def seg_path(aspect, k, company):
    tag = company if k == 1 else "all"
    return os.path.join(C.OUT, "segments", "{}_seg{}_{}.mp4".format(aspect, k, tag))


def encode_segment(aspect, k, company=None, force=False):
    company = company or C.COMPANY
    out = seg_path(aspect, k, company)
    if os.path.exists(out) and not force:
        return out
    os.makedirs(os.path.dirname(out), exist_ok=True)
    w, h = C.ASPECTS[aspect]
    n0, n1 = seg_range(k)
    ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "{}x{}".format(w, h),
                           "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-crf", "18", "-preset", "veryfast",
                           "-pix_fmt", "yuv420p", "-movflags", "+faststart", out + ".tmp.mp4"], stdin=subprocess.PIPE)
    for n in range(n0, n1):
        ff.stdin.write(frame(aspect, n, company).tobytes())
    ff.stdin.close()
    assert ff.wait() == 0
    os.replace(out + ".tmp.mp4", out)
    return out


if __name__ == "__main__":
    # quick look: python3 compose.py ASPECT FRAME out.jpg
    frame(sys.argv[1], int(sys.argv[2])).save(sys.argv[3], quality=92)
