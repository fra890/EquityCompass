"""Assemble deliverables from rendered plates.

    python3 build.py                         # all three cuts, SpaceX
    python3 build.py --company Anduril       # re-composes segment 1 only; other segments are reused
    python3 build.py --aspects 4x5 --music path/to/licensed.wav
"""
import argparse, os, subprocess
from PIL import Image
import config as C, compose, music

DRAFT = "DRAFT - pending compliance approval"
OUTD = os.path.join(C.HERE, "deliverables")


def name(company, aspect, kind, ext="mp4"):
    return os.path.join(OUTD, "Tidemark_EquityComp_{}_{}_{} - {}.{}".format(company, aspect, kind, DRAFT, ext))


def run(*a):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *a], check=True)


def ts(x):
    ms = round(x * 1000)
    return "{:02d}:{:02d}:{:02d},{:03d}".format(ms // 3600000, ms // 60000 % 60, ms // 1000 % 60, ms % 1000)


def srt(company):
    cues = [(0.0, 3.0, C.hook_text(company))] + list(C.CAPTIONS)
    cues.append((32.2, 36.0, "{}\n{}".format(C.END["service"], C.END["name"])))
    cues.append((36.0, 40.0, C.END["tagline"] + "\nExample figures are hypothetical. Full disclosure on screen."))
    out = "".join("{}\n{} --> {}\n{}\n\n".format(i + 1, ts(a), ts(b), t) for i, (a, b, t) in enumerate(cues))
    p = name(company, "captions", "en", "srt")
    open(p, "w").write(out)
    return p


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--company", default=C.COMPANY)
    ap.add_argument("--aspects", nargs="+", default=list(C.ASPECTS))
    ap.add_argument("--music", default=os.path.join(C.OUT, "temp_music.wav"))
    a = ap.parse_args()
    os.makedirs(OUTD, exist_ok=True)
    if not os.path.exists(a.music):
        music.make(a.music)
    for asp in a.aspects:
        segs = [compose.encode_segment(asp, k, a.company) for k in (1, 2, 3, 4, 5)]
        lst = os.path.join(C.OUT, "segments", asp + "_concat.txt")
        open(lst, "w").write("".join("file '{}'\n".format(s) for s in segs))
        vid = os.path.join(C.OUT, "segments", asp + "_video.mp4")
        run("-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", vid)
        d = str(C.DURATION)
        run("-i", vid, "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", d, "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart", name(a.company, asp, "silent"))
        run("-i", vid, "-i", a.music, "-t", d, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart", name(a.company, asp, "tempmusic"))
        print("built", asp, flush=True)
    if "4x5" in a.aspects:
        compose.frame("4x5", round(1.5 * C.FPS), a.company).save(name(a.company, "4x5", "poster", "png"))
    print(srt(a.company))
