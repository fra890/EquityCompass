"""Original sound bed for the teaser, synthesised and synced to the cuts.

    python3 scripts/make-teaser-audio.py   ->  public/audio/teaser.mp3

No samples, no third-party music: everything here is generated, so there is
nothing to license. Timings mirror TT in src/theme.ts (30fps). To use a
licensed track instead, replace public/audio/teaser.mp3.
"""
import math
import subprocess
import wave
from pathlib import Path

import numpy as np

SR = 48000
FPS = 30
TOTAL = 582 / FPS
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

# Timeline (frames), mirroring TT.
HERE, HOOK, GAP, FLASH, TITLE, END = 66, 132, 210, 300, 348, 432
TITLE_LAND = TITLE + 29
PANEL = END + 26

# 1. Bed: open fifth under the problem, unresolved.
bed = pad([D2, A2, D3], f2s(TITLE_LAND) + 1.2, 1.2, 1.6, bright=700)
add(bed, 0.0, 0.3)
# Tension voice from the hook to the title: a minor third on top.
add(pad([F3, A3], f2s(TITLE_LAND - HOOK) + 0.6, 1.5, 1.0, bright=800), f2s(HOOK), 0.22)

# 2. Names: one tick per cut, stepping across the stereo field.
for i in range(9):
    add(tick(1500 + i * 70), f2s(i * 6), 0.22, pan=-0.5 + i / 8)

# 3. Hard cut to "If you work here".
add(thump(50), f2s(HERE), 0.55)

# 4. Hook lines land.
add(thump(58, 0.4), f2s(HOOK + 3), 0.3)
add(thump(58, 0.4), f2s(HOOK + 34), 0.3)
add(bell(A4, 1.6), f2s(HOOK + 50), 0.07)

# 5. The gap: ticks run with the count-up, then the number rings.
count_start, count_len = GAP + 16, 28
for k in range(14):
    u = k / 13
    fr = count_start + count_len * (1 - (1 - u) ** 2) * 0.96
    add(tick(1700 + k * 40), f2s(fr), 0.12 + 0.05 * u, pan=0.2)
add(thump(46, 0.7), f2s(GAP + 22), 0.5)
add(bell(D4, 2.6), f2s(count_start + count_len), 0.16)
add(bell(A4, 2.2), f2s(count_start + count_len), 0.07, pan=0.3)

# 6. Three open loops: hard cuts.
for i in range(3):
    add(tick(1600), f2s(FLASH + i * 16), 0.24, pan=(-0.4, 0.0, 0.4)[i])
    add(thump(60, 0.3), f2s(FLASH + i * 16), 0.28)

# 7. The vesting line: a note at each vest, climbing into the resolve.
for fr, note, pan in [(5.7, D4, -0.5), (12.7, Fs4, -0.15), (21.4, A4, 0.2), (34.3, D5, 0.5)]:
    add(bell(note, 2.0), f2s(TITLE + fr), 0.11, pan=pan)
riser_n = int(f2s(30) * SR)
riser = lowpass(rng.standard_normal(riser_n), 1800) * np.linspace(0, 1, riser_n) ** 2.5
add(riser, f2s(TITLE), 0.05)

# 8. Title lands: the bed resolves to D major and stays through the end card.
res_t = f2s(TITLE_LAND)
add(thump(48, 0.9), res_t, 0.5)
add(pad([D2, A2, D3, Fs3, A3, E4], TOTAL - res_t, 0.5, 2.6, bright=1500), res_t, 1.0)
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
fade = int(1.4 * SR)
out[:, -fade:] *= np.linspace(1, 0, fade) ** 1.5

root = Path(__file__).resolve().parent.parent
wav = root / 'out' / 'teaser.wav'
wav.parent.mkdir(exist_ok=True)
with wave.open(str(wav), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((out.T * 32767).astype('<i2').tobytes())
mp3 = root / 'public' / 'audio' / 'teaser.mp3'
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(wav), '-codec:a', 'libmp3lame', '-b:a', '256k', str(mp3)], check=True)
print('wrote', mp3)
