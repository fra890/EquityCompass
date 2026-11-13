"""Original sound bed for the series trailer, synthesised and synced to the cuts.

    python3 scripts/make-trailer-audio.py   ->  public/audio/trailer.mp3

No samples, no third-party music: everything here is generated, so there is
nothing to license. Timings mirror TR in src/theme.ts (30fps). To use a
licensed track instead, replace public/audio/trailer.mp3.
"""
import math
import subprocess
import wave
from pathlib import Path

import numpy as np

SR = 48000
FPS = 30
TOTAL = 1290 / FPS
N = int(SR * (TOTAL + 0.05))
rng = np.random.default_rng(7)
L = np.zeros(N)
R = np.zeros(N)


def f2s(frame):
    return frame / FPS


def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    L[i : i + len(sig)] += sig * math.cos((pan + 1) * math.pi / 4)
    R[i : i + len(sig)] += sig * math.sin((pan + 1) * math.pi / 4)


def env(n, attack, release):
    e = np.ones(n)
    a = max(1, int(attack * SR))
    r = max(1, int(release * SR))
    e[:a] = np.linspace(0, 1, a) ** 2
    e[-r:] *= np.linspace(1, 0, r) ** 2
    return e


def lowpass(x, cutoff):
    a = math.exp(-2 * math.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def tick(freq=1900.0):
    # A soft ledger tick: a few ms of filtered noise and a short sine blip.
    n = int(0.06 * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * math.pi * freq * t) * np.exp(-t * 90)
    click = lowpass(rng.standard_normal(n), 5000) * np.exp(-t * 400)
    return body * 0.6 + click * 0.5


def thump(freq=52.0, dur=0.55):
    n = int(dur * SR)
    t = np.arange(n) / SR
    sweep = freq * (1 + 0.9 * np.exp(-t * 28))
    return np.sin(2 * math.pi * np.cumsum(sweep) / SR) * np.exp(-t * 7.5)


def bell(freq, dur=2.4):
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for mult, amp, decay in [(1, 1.0, 2.2), (2.0, 0.35, 3.5), (3.01, 0.18, 5.0), (4.2, 0.08, 7.0)]:
        out += amp * np.sin(2 * math.pi * freq * mult * t) * np.exp(-t * decay)
    return out * env(n, 0.004, 0.3)


def pad(freqs, dur, attack, release, bright=900):
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f in freqs:
        for det in (-0.35, 0.0, 0.35):
            ff = f * (1 + det / 100)
            ph = rng.uniform(0, 2 * math.pi)
            out += np.sin(2 * math.pi * ff * t + ph) + 0.28 * np.sin(2 * math.pi * 2 * ff * t + ph * 1.7)
    out = lowpass(out, bright)
    slow = 1 + 0.06 * np.sin(2 * math.pi * 0.11 * t)
    return out / (len(freqs) * 3) * env(n, attack, release) * slow


D2, A2, D3, F3, A3, D4, E4, Fs3, Fs4, A4, D5 = 73.42, 110.0, 146.83, 174.61, 220.0, 293.66, 329.63, 185.0, 369.99, 440.0, 587.33

def pluck(freq, dur=0.5):
    # A muted pulse: the clock under the chapters.
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * math.pi * freq * t) + 0.3 * np.sin(2 * math.pi * 2 * freq * t)
    return s * np.exp(-t * 11) * env(n, 0.003, 0.05)


B1, E2, Fs2, G1, G2, B2, Cs3, A1, B3, Cs4, B4, E5, Fs5 = 61.74, 82.41, 92.5, 49.0, 98.0, 123.47, 138.59, 55.0, 246.94, 277.18, 493.88, 659.25, 739.99

# Timeline (frames), mirroring TR.
HERE, PAPER, CH0, CH, CH_LAST = 66, 138, 264, 84, 100
TURN = CH0 + CH * 7 + CH_LAST
TITLE = TURN + 78
END = TITLE + 90
TITLE_LAND = TITLE + 29
PANEL = END + 26

# 1. Opening: an open fifth, unresolved, under the names and the premise.
add(pad([D2, A2, D3], f2s(CH0) + 1.0, 1.2, 1.4, bright=700), 0.0, 0.3)
add(pad([F3, A3], f2s(CH0 - PAPER) + 0.6, 1.5, 1.0, bright=800), f2s(PAPER), 0.2)

# 2. Names: one tick per cut, stepping across the stereo field.
for i in range(9):
    add(tick(1500 + i * 70), f2s(i * 6), 0.22, pan=-0.5 + i / 8)

# 3. Hard cut to "If you work here".
add(thump(50), f2s(HERE), 0.55)

# 4. On paper: ticks run with the count-up; the number rings; "the manual" lands.
for k in range(22):
    u = k / 21
    add(tick(1650 + k * 30), f2s(PAPER + 8 + 46 * (1 - (1 - u) ** 2) * 0.97), 0.1 + 0.05 * u, pan=0.15)
add(bell(D4, 2.6), f2s(PAPER + 54), 0.15)
add(bell(A4, 2.2), f2s(PAPER + 54), 0.06, pan=0.3)
add(thump(52, 0.6), f2s(PAPER + 62), 0.4)

# 5. Chapters: the harmony moves every two chapters, a pulse keeps time, and
#    each chapter adds one note of a climbing line.
chords = [
    [D2, A2, D3, Fs3],
    [B1, Fs2, B2, D3],
    [G1, G2, B2, D3],
    [A1, E2, A2, Cs3],
]
roots = [D3, B2, G2, A2]
climb = [D4, E4, Fs4, A4, B4, D5, E5, Fs5]
for c in range(4):
    start = CH0 + c * 2 * CH
    length = 2 * CH if c < 3 else CH + CH_LAST
    add(pad(chords[c], f2s(length) + 0.9, 0.5, 0.9, bright=1100), f2s(start), 0.62)
for i in range(8):
    start = CH0 + i * CH
    dur = CH_LAST if i == 7 else CH
    add(thump(54, 0.45), f2s(start), 0.36)
    add(tick(1600), f2s(start), 0.14, pan=-0.3)
    add(bell(climb[i], 2.2), f2s(start + 6), 0.085, pan=-0.45 + i * 0.13)
    if i < 7:
        # The pulse drops out for the last, quieter chapter.
        for k in range(dur // 14):
            add(pluck(roots[i // 2] * (2 if k % 2 else 1), 0.4), f2s(start + k * 14), 0.11 if k % 2 else 0.16, pan=0.15 if k % 2 else -0.15)

# 6. Turn: hold on the dominant, thin out.
add(pad([A1, E2, A2, E4], f2s(TITLE_LAND - TURN) + 1.0, 0.6, 1.2, bright=900), f2s(TURN), 0.42)
add(thump(52, 0.5), f2s(TURN + 2), 0.32)
add(thump(52, 0.5), f2s(TURN + 28), 0.32)
add(bell(Cs4, 2.0), f2s(TURN + 44), 0.06)

# 7. The vesting line: a note at each vest, climbing into the resolve.
for fr, note, pan in [(5.7, D4, -0.5), (12.7, Fs4, -0.15), (21.4, A4, 0.2), (34.3, D5, 0.5)]:
    add(bell(note, 2.0), f2s(TITLE + fr), 0.11, pan=pan)
riser_n = int(f2s(30) * SR)
riser = lowpass(rng.standard_normal(riser_n), 1800) * np.linspace(0, 1, riser_n) ** 2.5
add(riser, f2s(TITLE), 0.05)

# 8. Title lands: home to D major, held through the end card.
res_t = f2s(TITLE_LAND)
add(thump(48, 0.9), res_t, 0.5)
add(pad([D2, A2, D3, Fs3, A3, E4], TOTAL - res_t, 0.5, 3.0, bright=1500), res_t, 1.0)
add(bell(Fs4, 3.0), res_t + 0.02, 0.06, pan=-0.2)

# 9. End-card panel rises.
add(thump(44, 0.8), f2s(PANEL), 0.32)
add(bell(D5, 3.2), f2s(PANEL + 14), 0.05, pan=0.25)

# Room: a short, dark, diffuse tail.
ir_n = int(1.6 * SR)
tt = np.arange(ir_n) / SR
mix = np.stack([L, R])
wet = []
for ch in range(2):
    ir = lowpass(rng.standard_normal(ir_n), 2600) * np.exp(-tt * 3.4)
    size = 1 << (N + ir_n).bit_length()
    y = np.fft.irfft(np.fft.rfft(mix[ch], size) * np.fft.rfft(ir, size), size)[:N]
    wet.append(y / (np.abs(y).max() + 1e-9))
out = mix / np.abs(mix).max() * 0.8 + np.stack(wet) * 0.2

# Master: normalise, gentle soft clip, final fade.
out = np.tanh(out / np.abs(out).max() * 1.15) / np.tanh(1.15) * 0.89
fade = int(2.0 * SR)
out[:, -fade:] *= np.linspace(1, 0, fade) ** 1.5

root = Path(__file__).resolve().parent.parent
wav = root / 'out' / 'trailer.wav'
wav.parent.mkdir(exist_ok=True)
with wave.open(str(wav), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((out.T * 32767).astype('<i2').tobytes())
mp3 = root / 'public' / 'audio' / 'trailer.mp3'
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(wav), '-codec:a', 'libmp3lame', '-b:a', '256k', str(mp3)], check=True)
print('wrote', mp3)
